import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { OrderStatus, Role } from '@prisma/client';
import { generateOrderNumber } from './helpers/order-helper';

const TAX_RATE = Number(process.env.TAX_RATE) || 0.10; // 10% tax — move to config in production

// Define valid status transitions — staff cannot skip steps
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED:  [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING:  [OrderStatus.READY],
  READY:      [OrderStatus.SERVED],
  SERVED:     [OrderStatus.COMPLETED],
  COMPLETED:  [],
  CANCELLED:  [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, userId: string) {
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

      if (!found.isAvailable) {
        throw new BadRequestException(
          `"${found.name}" is currently unavailable`
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
          tableNumber: dto.tableNumber,
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
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return order;
  }

  async findAll(userId: string, userRole: Role, query: {
    status?: OrderStatus;
    date?: string;
  }) {
    const { status, date } = query;

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
        ...dateFilter,
      },
      include: {
        orderItems: true,
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

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { orderItems: true },
    });
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

    // Can only cancel if PENDING or CONFIRMED
    const cancellable: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel an order that is ${order.status}`
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }
}