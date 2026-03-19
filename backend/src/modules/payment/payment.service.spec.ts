import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { kitchenGateway } from '../gateway/gateway.gateway';

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
  },
  payment: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockStripe = {
  createRefund: jest.fn(),
};

const mockGateway = {
  emitPaymentRefundPending: jest.fn(),
  emitPaymentRefunded: jest.fn(),
};

describe('PaymentsService - refund flows', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: kitchenGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('markRefundPendingOnCancel', () => {
    it('marks PAID card payment as REFUND_PENDING', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'QB-1001',
        payment: {
          id: 'pay-1',
          method: PaymentMethod.CARD,
          status: PaymentStatus.PAID,
          amount: 25.5,
        },
      });

      mockPrisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.REFUND_PENDING,
      });

      const result = await service.markRefundPendingOnCancel('order-1', 'ORDER_CANCELLED_BY_CUSTOMER');

      expect(result).toEqual({ status: 'REFUND_PENDING' });
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: {
          status: PaymentStatus.REFUND_PENDING,
          refundReason: 'ORDER_CANCELLED_BY_CUSTOMER',
          refundAmount: 25.5,
        },
      });
      expect(mockGateway.emitPaymentRefundPending).toHaveBeenCalledTimes(1);
    });

    it('returns ALREADY_REFUND_PENDING if already pending', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'QB-1001',
        payment: {
          id: 'pay-1',
          method: PaymentMethod.CARD,
          status: PaymentStatus.REFUND_PENDING,
          amount: 25.5,
        },
      });

      const result = await service.markRefundPendingOnCancel('order-1');

      expect(result).toEqual({ status: 'ALREADY_REFUND_PENDING' });
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('processes refund for REFUND_PENDING card payment', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-2',
        orderNumber: 'QB-1002',
        payment: {
          id: 'pay-2',
          method: PaymentMethod.CARD,
          status: PaymentStatus.REFUND_PENDING,
          amount: 40,
          stripePaymentIntentId: 'pi_123',
          refundReason: 'ORDER_CANCELLED_BY_CUSTOMER',
        },
      });

      mockStripe.createRefund.mockResolvedValue({ id: 're_123' });
      mockPrisma.payment.update.mockResolvedValue({
        id: 'pay-2',
        status: PaymentStatus.REFUNDED,
      });
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-2',
        status: PaymentStatus.REFUNDED,
        refundRef: 're_123',
      });

      const result = await service.approveRefund('order-2', 'Approved by staff');

      expect(mockStripe.createRefund).toHaveBeenCalledWith(
        'pi_123',
        'refund:pay-2',
        undefined,
        'requested_by_customer',
      );
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-2' },
          data: expect.objectContaining({
            status: PaymentStatus.REFUNDED,
            refundRef: 're_123',
            refundReason: 'Approved by staff',
          }),
        }),
      );
      expect(result).toEqual({
        refunded: true,
        payment: {
          id: 'pay-2',
          status: PaymentStatus.REFUNDED,
          refundRef: 're_123',
        },
      });
      expect(mockGateway.emitPaymentRefunded).toHaveBeenCalledTimes(1);
    });

    it('throws for non REFUND_PENDING payments', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-3',
        orderNumber: 'QB-1003',
        payment: {
          id: 'pay-3',
          method: PaymentMethod.CARD,
          status: PaymentStatus.PAID,
          stripePaymentIntentId: 'pi_456',
        },
      });

      await expect(service.approveRefund('order-3')).rejects.toThrow(BadRequestException);
      expect(mockStripe.createRefund).not.toHaveBeenCalled();
    });

    it('throws when order is missing', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.approveRefund('missing-order')).rejects.toThrow(NotFoundException);
    });
  });

  describe('edge case: PAID -> rollback -> cancel -> refund pending -> approve', () => {
    it('supports full sequence safely', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({
          id: 'order-edge',
          orderNumber: 'QB-EDGE',
          status: OrderStatus.CANCELLED,
          payment: {
            id: 'pay-edge',
            method: PaymentMethod.CARD,
            status: PaymentStatus.PAID,
            amount: 60,
            stripePaymentIntentId: 'pi_edge',
            refundReason: null,
          },
        })
        .mockResolvedValueOnce({
          id: 'order-edge',
          orderNumber: 'QB-EDGE',
          status: OrderStatus.CANCELLED,
          payment: {
            id: 'pay-edge',
            method: PaymentMethod.CARD,
            status: PaymentStatus.REFUND_PENDING,
            amount: 60,
            stripePaymentIntentId: 'pi_edge',
            refundReason: 'ORDER_CANCELLED_BY_CUSTOMER',
          },
        });

      mockPrisma.payment.update
        .mockResolvedValueOnce({ id: 'pay-edge', status: PaymentStatus.REFUND_PENDING })
        .mockResolvedValueOnce({ id: 'pay-edge', status: PaymentStatus.REFUNDED });

      mockStripe.createRefund.mockResolvedValue({ id: 're_edge' });
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-edge',
        status: PaymentStatus.REFUNDED,
        refundRef: 're_edge',
      });

      const pendingResult = await service.markRefundPendingOnCancel(
        'order-edge',
        'ORDER_CANCELLED_BY_CUSTOMER',
      );
      const approveResult = await service.approveRefund('order-edge');

      expect(pendingResult).toEqual({ status: 'REFUND_PENDING' });
      expect(approveResult).toEqual({
        refunded: true,
        payment: {
          id: 'pay-edge',
          status: PaymentStatus.REFUNDED,
          refundRef: 're_edge',
        },
      });
    });
  });
});
