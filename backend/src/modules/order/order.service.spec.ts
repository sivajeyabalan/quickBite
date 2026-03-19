import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { kitchenGateway } from '../gateway/gateway.gateway';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';

// ── Mock PrismaService ────────────────────────────────
const mockPrisma = {
  menuItem: {
    findMany: jest.fn(),
  },
  tableAssignment: {
    findFirst: jest.fn(),
  },
  order: {
    count:  jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    update:     jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGateway = {
  emitNewOrder:    jest.fn(),
  emitStatusUpdate: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService,   useValue: mockPrisma   },
        { provide: kitchenGateway,  useValue: mockGateway  },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    mockPrisma.tableAssignment.findFirst.mockResolvedValue({ tableNumber: 'T1' });
    mockPrisma.order.findFirst.mockResolvedValue(null);
  });

  // ── Test 1 ────────────────────────────────────────
  describe('create', () => {
    it('should throw NotFoundException for invalid menuItemId', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([]);

      await expect(
        service.create(
          {
            items: [{ menuItemId: 'fake-id', quantity: 1 }],
          },
          'user-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unavailable item', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Burger', price: '10.00', isAvailable: false },
      ]);

      await expect(
        service.create(
          { items: [{ menuItemId: 'item-1', quantity: 1 }] },
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Test 2 ────────────────────────────────────────
  describe('updateStatus', () => {
    it('should throw BadRequestException for invalid transition', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id:     'order-1',
        status: OrderStatus.PENDING,
      });

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.READY }, // skip steps
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid PENDING → CONFIRMED transition', async () => {
      const mockOrder = {
        id: 'order-1', status: OrderStatus.PENDING, orderItems: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder, status: OrderStatus.CONFIRMED,
      });

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMED },
        Role.ADMIN,
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockGateway.emitStatusUpdate).toHaveBeenCalledTimes(1);
    });

    it('should allow valid backward PREPARING → CONFIRMED transition', async () => {
      const mockOrder = {
        id: 'order-1', status: OrderStatus.PREPARING, orderItems: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder, status: OrderStatus.CONFIRMED,
      });

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.CONFIRMED },
        Role.ADMIN,
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockGateway.emitStatusUpdate).toHaveBeenCalledTimes(1);
    });

    it('should reset SLA window when moving CONFIRMED → PENDING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
        orderItems: [],
      });

      await service.updateStatus(
        'order-1',
        { status: OrderStatus.PENDING },
        Role.ADMIN,
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.PENDING,
            acceptedAt: null,
          }),
        }),
      );
    });

    it('should auto-cancel if confirming after SLA acceptBy window', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
        acceptBy: new Date(Date.now() - 60_000),
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CANCELLED,
        orderItems: [],
      });

      await expect(
        service.updateStatus(
          'order-1',
          { status: OrderStatus.CONFIRMED },
          Role.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
            cancelReason: 'AUTO_TIMEOUT',
          }),
        }),
      );
      expect(mockGateway.emitStatusUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ── Test 3 ────────────────────────────────────────
  describe('cancel', () => {
    it('should allow customer to cancel a pending order and emit status update', async () => {
      const updatedOrder = {
        id: 'order-1',
        status: OrderStatus.CANCELLED,
        userId: 'user-1',
        orderItems: [],
      };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
        userId: 'user-1',
      });
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.cancel('order-1', 'user-1', Role.CUSTOMER);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockGateway.emitStatusUpdate).toHaveBeenCalledWith(updatedOrder);
    });

    it('should throw BadRequestException when customer cancels confirmed order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.CONFIRMED,
        userId: 'user-1',
      });

      await expect(
        service.cancel('order-1', 'user-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling PREPARING order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id:     'order-1',
        status: OrderStatus.PREPARING,
        userId: 'user-1',
      });

      await expect(
        service.cancel('order-1', 'user-1', Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('autoCancelExpiredPendingOrders', () => {
    it('should cancel all expired pending orders with AUTO_TIMEOUT reason', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          orderNumber: 'QB-1001',
          status: OrderStatus.PENDING,
          orderItems: [],
        },
        {
          id: 'order-2',
          orderNumber: 'QB-1002',
          status: OrderStatus.PENDING,
          orderItems: [],
        },
      ]);

      mockPrisma.order.update
        .mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.CANCELLED, orderItems: [] })
        .mockResolvedValueOnce({ id: 'order-2', status: OrderStatus.CANCELLED, orderItems: [] });

      const result = await service.autoCancelExpiredPendingOrders();

      expect(result).toBe(2);
      expect(mockPrisma.order.update).toHaveBeenCalledTimes(2);
      expect(mockGateway.emitStatusUpdate).toHaveBeenCalledTimes(2);
    });
  });
});