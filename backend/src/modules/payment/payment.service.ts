import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    // Step 1 — Verify order exists
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    // Step 2 — Cannot pay for a cancelled order
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot process payment for a cancelled order');
    }

    // Step 3 — Prevent duplicate payment
    if (order.payment) {
      throw new ConflictException('Payment already exists for this order');
    }

    // Step 4 — Amount comes from order, never from client
    const payment = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId:        dto.orderId,
          amount:         order.total,        // from DB, not client
          method:         dto.method,
          status:         PaymentStatus.PAID,
          transactionRef: dto.transactionRef,
          paidAt:         new Date(),
        },
      });

      // Mark order as CONFIRMED after payment if still PENDING
      if (order.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: dto.orderId },
          data:  { status: OrderStatus.CONFIRMED },
        });
      }

      return newPayment;
    });

    return payment;
  }

  async findByOrder(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id:          true,
            orderNumber: true,
            total:       true,
            status:      true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`No payment found for order ${orderId}`);
    }

    return payment;
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        order: {
          select: {
            id:          true,
            orderNumber: true,
            tableNumber: true,
            total:       true,
            status:      true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}