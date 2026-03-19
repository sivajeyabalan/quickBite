import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderStatus, OrderType, Role, TableAssignmentStatus } from '@prisma/client';
import { generateOrderNumber } from './helpers/order-helper';
import { isItemOrderable } from '../menu/helpers/availability.helper';

import { kitchenGateway } from '../gateway/gateway.gateway';

const TAX_RATE = Number(process.env.TAX_RATE) || 0.10; // 10% tax — move to config in production
const ORDER_ACCEPT_SLA_MINUTES = Number(process.env.ORDER_ACCEPT_SLA_MINUTES) || 5;
const ORDER_SLA_SWEEP_MS = Number(process.env.ORDER_SLA_SWEEP_MS) || 30_000;
const ACTIVE_TABLE_BLOCKING_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

// Define valid status transitions — staff cannot skip steps
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED:  [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING:  [OrderStatus.CONFIRMED, OrderStatus.READY],
  READY:      [OrderStatus.PREPARING, OrderStatus.SERVED],
  SERVED:     [OrderStatus.READY, OrderStatus.COMPLETED],
  COMPLETED:  [OrderStatus.SERVED],
  CANCELLED:  [],
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService ,
    private readonly gateway : kitchenGateway
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;

    this.sweepTimer = setInterval(() => {
      void this.autoCancelExpiredPendingOrders();
    }, ORDER_SLA_SWEEP_MS);
  }

  onModuleDestroy() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
    }
  }

  private getAcceptByTimestamp() {
    return new Date(Date.now() + ORDER_ACCEPT_SLA_MINUTES * 60 * 1000);
  }

  private async assertTableAvailable(tableNumber: string) {
    const existing = await this.prisma.order.findFirst({
      where: {
        orderType: OrderType.FINE_DINE,
        tableNumber,
        status: { in: ACTIVE_TABLE_BLOCKING_STATUSES },
      },
      select: { id: true, orderNumber: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Table ${tableNumber} is currently occupied by order ${existing.orderNumber}`,
      );
    }
  }

  async create(dto: CreateOrderDto, userId: string) {
    const orderType = dto.orderType ?? OrderType.FINE_DINE;

    let tableNumber: string | undefined;
    let deliveryAddressId: string | undefined;
    let deliveryAddressSnapshot:
      | {
          id: string;
          label?: string | null;
          recipientName?: string | null;
          phone?: string | null;
          line1: string;
          line2?: string | null;
          city: string;
          state?: string | null;
          postalCode: string;
          landmark?: string | null;
        }
      | undefined;

    if (orderType === OrderType.FINE_DINE) {
      const activeAssignment = await this.prisma.tableAssignment.findFirst({
        where: {
          userId,
          status: TableAssignmentStatus.ACTIVE,
        },
        orderBy: { assignedAt: 'desc' },
        select: {
          tableNumber: true,
        },
      });

      if (!activeAssignment?.tableNumber) {
        throw new BadRequestException('No table assigned. Please contact host/staff.');
      }
      tableNumber = activeAssignment.tableNumber;
      await this.assertTableAvailable(activeAssignment.tableNumber);
    }

    if (orderType === OrderType.PICKUP) {
      if (dto.deliveryAddressId) {
        throw new BadRequestException('Delivery address is not allowed for pickup orders');
      }
    }

    if (orderType === OrderType.DELIVERY) {
      if (!dto.deliveryAddressId) {
        throw new BadRequestException('Delivery address is required for delivery orders');
      }

      const address = await this.prisma.address.findFirst({
        where: {
          id: dto.deliveryAddressId,
          userId,
        },
      });

      if (!address) {
        throw new BadRequestException('Selected delivery address was not found');
      }

      deliveryAddressId = address.id;
      deliveryAddressSnapshot = {
        id: address.id,
        label: address.label,
        recipientName: address.recipientName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        landmark: address.landmark,
      };
    }

    // Step 1 — Fetch all menu items in one query (not N queries in a loop)
    const menuItemIds = dto.items.map(i => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    // Step 2 — Validate every requested item exists and is available
    for (const ordered of dto.items) {
      const found = menuItems.find(m => m.id === ordered.menuItemId);

      if (!found) {
        throw new NotFoundException(
          `Menu item ${ordered.menuItemId} not found`
        );
      }

      const { available, reason } = isItemOrderable(found);
      if (!available) {
        throw new BadRequestException(`"${found.name}": ${reason}`);
      }

      // Check requested quantity does not exceed available stock
      if (found.stockQty >= 0 && ordered.quantity > found.stockQty) {
        throw new BadRequestException(
          `"${found.name}" has only ${found.stockQty} units available, requested ${ordered.quantity}`
        );
      }
    }

    // Step 3 — Calculate totals on the server, never trust client prices
    let subtotal = 0;
    const orderItemsData = dto.items.map(ordered => {
      const menuItem = menuItems.find(m => m.id === ordered.menuItemId)!;
      const unitPrice = Number(menuItem.price);
      subtotal += unitPrice * ordered.quantity;

      return {
        menuItemId:       menuItem.id,
        quantity:         ordered.quantity,
        unitPrice:        unitPrice,
        itemNameSnapshot: menuItem.name,   // price freeze snapshot
        customisations:   ordered.customisations ?? {},
      };
    });

    const tax   = Number((subtotal * TAX_RATE).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    // Step 4 — Generate order number
    const orderNumber = await generateOrderNumber(this.prisma);

    // Step 5 — Create order + all items in a single transaction
    // If any part fails, the whole thing rolls back
    const order = await this.prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          orderNumber,
          userId,
          orderType,
          tableNumber,
          deliveryAddressId,
          deliveryAddressSnapshot,
          acceptBy: this.getAcceptByTimestamp(),
          notes:       dto.notes,
          subtotal,
          tax,
          total,
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
          },
          deliveryAddress: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });

    //Gateway : emit new order

    this.gateway.emitNewOrder(order);

    return order;
  }

  async findAll(userId: string, userRole: Role, query: {
    status?: OrderStatus;
    orderType?: OrderType;
    date?: string;
  }) {
    const { status, orderType, date } = query;

    // Customers see only their own orders
    // Staff and Admin see everything
    const userFilter = userRole === Role.CUSTOMER ? { userId } : {};

    const dateFilter = date ? {
      createdAt: {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      },
    } : {};

    return this.prisma.order.findMany({
      where: {
        ...userFilter,
        ...(status && { status }),
        ...(orderType && { orderType }),
        ...dateFilter,
      },
      include: {
        orderItems: {
          include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
        },
        deliveryAddress: true,
        payment: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
        },
        deliveryAddress: true,
        payment: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Customer cannot view someone else's order
    if (userRole === Role.CUSTOMER && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    userRole: Role,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Validate the transition is allowed
    const allowedNext = STATUS_TRANSITIONS[order.status];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${dto.status}`
      );
    }

    // Only admin can cancel a confirmed order
    if (dto.status === OrderStatus.CANCELLED &&
        order.status === OrderStatus.CONFIRMED &&
        userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can cancel confirmed orders');
    }

    // SLA guard: cannot confirm after acceptance window has expired
    if (
      order.status === OrderStatus.PENDING &&
      dto.status === OrderStatus.CONFIRMED &&
      order.acceptBy &&
      new Date() > order.acceptBy
    ) {
      const cancelled = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: 'AUTO_TIMEOUT',
        },
        include: { orderItems: true },
      });

      this.gateway.emitStatusUpdate(cancelled);

      throw new BadRequestException('Order acceptance window expired; order auto-cancelled');
    }

    
    const statusUpdateData: {
      status: OrderStatus;
      acceptedAt?: Date | null;
      acceptBy?: Date | null;
    } = {
      status: dto.status,
    };

    if (dto.status === OrderStatus.CONFIRMED) {
      statusUpdateData.acceptedAt = new Date();
    }

    // Moving back to pending re-opens SLA window
    if (dto.status === OrderStatus.PENDING) {
      statusUpdateData.acceptedAt = null;
      statusUpdateData.acceptBy = this.getAcceptByTimestamp();
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: statusUpdateData,
      include: { orderItems: true },
    });

    //gateway : fire event after successful DB update

    this.gateway.emitStatusUpdate(updated)


    return updated ;
  }

  async cancel(id: string, userId: string, userRole: Role) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Customer can only cancel their own order
    if (userRole === Role.CUSTOMER && order.userId !== userId) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    if (userRole === Role.CUSTOMER && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'You can only cancel an order before it is confirmed'
      );
    }

    // Staff/admin fallback route still supports PENDING/CONFIRMED cancellations
    if (userRole !== Role.CUSTOMER) {
      const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      if (!cancellable.includes(order.status)) {
        throw new BadRequestException(
          `Cannot cancel an order that is ${order.status}`
        );
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: { orderItems: true },
    });

    this.gateway.emitStatusUpdate(updated);

    return updated;
  }

  async autoCancelExpiredPendingOrders() {
    const expiredPendingOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        acceptBy: { lte: new Date() },
      },
      include: { orderItems: true },
    });

    if (expiredPendingOrders.length === 0) return 0;

    for (const order of expiredPendingOrders) {
      const cancelled = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: 'AUTO_TIMEOUT',
        },
        include: { orderItems: true },
      });

      this.gateway.emitStatusUpdate(cancelled);
      this.logger.log(`Auto-cancelled expired pending order ${order.orderNumber}`);
    }

    return expiredPendingOrders.length;
  }
}