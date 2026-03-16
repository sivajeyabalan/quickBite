import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { StripeService } from './stripe.service';
import { kitchenGateway } from '../gateway/gateway.gateway';

@Injectable()
export class PaymentsService {
  private static readonly STRIPE_MIN_USD = 0.5;
  private static readonly STRIPE_MIN_INR = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly gateway: kitchenGateway,
  ) {}

  private validateStripeMinimum(amount: number, currency: 'usd' | 'inr') {
    if (currency === 'usd' && amount < PaymentsService.STRIPE_MIN_USD) {
      throw new BadRequestException(
        `Minimum card payment amount is $${PaymentsService.STRIPE_MIN_USD.toFixed(2)}.`,
      );
    }

    if (currency === 'inr' && amount < PaymentsService.STRIPE_MIN_INR) {
      throw new BadRequestException(
        `Minimum UPI payment amount is ₹${PaymentsService.STRIPE_MIN_INR}. Add more items or choose Cash/Card.`,
      );
    }
  }

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

  async createStripePaymentIntent(
    orderId: string,
    method?: 'CARD' | 'QR',
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.payment) {
      if (order.payment.status === PaymentStatus.PAID) {
        throw new ConflictException('Payment already completed for this order');
      }

      if (
        order.payment.status === PaymentStatus.PENDING
        && order.payment.stripePaymentIntentId
      ) {
        const existingIntent = await this.stripe.retrievePaymentIntent(
          order.payment.stripePaymentIntentId,
        );

        if (existingIntent.status === 'succeeded') {
          await this.prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: order.payment.paidAt ?? new Date(),
              transactionRef: existingIntent.id,
            },
          });

          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CONFIRMED },
          });

          throw new ConflictException('Payment already completed for this order');
        }

        if (existingIntent.status === 'canceled') {
          const resumeMethod = method ?? (order.payment.method === 'QR' ? 'QR' : 'CARD');
          const currency = resumeMethod === 'QR' ? 'inr' : 'usd';
          const orderAmount = Number(order.total);

          this.validateStripeMinimum(orderAmount, currency);

          const newIntent = await this.stripe.createPaymentIntent(
            orderAmount,
            currency,
            { orderId: order.id, orderNumber: order.orderNumber },
          );

          await this.prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              method: resumeMethod,
              stripePaymentIntentId: newIntent.id,
              status: PaymentStatus.PENDING,
            },
          });

          return {
            clientSecret:       newIntent.client_secret,
            paymentIntentId:    newIntent.id,
            amount:             Number(order.total),
            paymentMethodTypes: newIntent.payment_method_types,
          };
        }

        if (!existingIntent.client_secret) {
          throw new BadRequestException('Payment session could not be resumed');
        }

        return {
          clientSecret:       existingIntent.client_secret,
          paymentIntentId:    existingIntent.id,
          amount:             Number(order.total),
          paymentMethodTypes: existingIntent.payment_method_types,
        };
      }

      throw new ConflictException('Payment already exists for this order');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    // Use automatic_payment_methods (required by Payment Element).
    // For QR/UPI use INR — Stripe will surface UPI automatically for INR.
    const currency = method === 'QR' ? 'inr' : 'usd';
    const orderAmount = Number(order.total);

    this.validateStripeMinimum(orderAmount, currency);

    const intent = await this.stripe.createPaymentIntent(
      orderAmount,
      currency,
      { orderId: order.id, orderNumber: order.orderNumber },
    );

    await this.prisma.payment.create({
      data: {
        orderId:               order.id,
        amount:                order.total,
        method:                method === 'QR' ? 'QR' : 'CARD',
        status:                'PENDING',
        stripePaymentIntentId: intent.id,
      },
    });

    return {
      clientSecret:       intent.client_secret,
      paymentIntentId:    intent.id,
      amount:             Number(order.total),
      paymentMethodTypes: intent.payment_method_types,
    };
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    let event: any;

    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;

      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: {
            status:         'PAID',
            paidAt:         new Date(),
            transactionRef: intent.id,
          },
        });

        const updatedOrder = await this.prisma.order.update({
          where:   { id: orderId },
          data:    { status: 'CONFIRMED' },
          include: { orderItems: true },
        });

        this.gateway.emitPaymentConfirmed({
          orderId,
          orderNumber: updatedOrder.orderNumber,
          amount: intent.amount / 100,
        });

        this.gateway.emitStatusUpdate(updatedOrder);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;

      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data:  { status: 'FAILED' },
      });

      if (orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        if (order) {
          this.gateway.emitPaymentFailed({
            orderId,
            orderNumber: order.orderNumber,
          });
        }
      }
    }

    if (event.type === 'payment_intent.processing') {
      const intent = event.data.object;
      const orderId = intent.metadata?.orderId;

      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data:  { status: 'PENDING' },
        });

        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });

        if (order) {
          this.gateway.emitPaymentProcessing({
            orderId,
            orderNumber: order.orderNumber,
            message: 'UPI payment is being processed by your bank',
          });
        }
      }
    }

    return { received: true };
  }

  async syncStripePaymentStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!order.payment?.stripePaymentIntentId) {
      return { status: order.payment?.status ?? PaymentStatus.PENDING };
    }

    const intent = await this.stripe.retrievePaymentIntent(
      order.payment.stripePaymentIntentId,
    );

    if (intent.status === 'succeeded') {
      if (order.payment.status !== PaymentStatus.PAID) {
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: order.payment.paidAt ?? new Date(),
            transactionRef: intent.id,
          },
        });

        const updatedOrder = await this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CONFIRMED,
          },
          include: {
            orderItems: true,
          },
        });

        this.gateway.emitPaymentConfirmed({
          orderId,
          orderNumber: updatedOrder.orderNumber,
          amount: intent.amount / 100,
        });
        this.gateway.emitStatusUpdate(updatedOrder);
      }

      return { status: PaymentStatus.PAID };
    }

    if (intent.status === 'processing') {
      if (order.payment.status !== PaymentStatus.PENDING) {
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.PENDING },
        });
      }
      return { status: PaymentStatus.PENDING };
    }

    if (intent.status === 'canceled' || intent.status === 'requires_payment_method') {
      if (order.payment.status !== PaymentStatus.FAILED) {
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
      return { status: PaymentStatus.FAILED };
    }

    return { status: order.payment.status };
  }
}