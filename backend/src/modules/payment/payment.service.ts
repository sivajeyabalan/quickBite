import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { StripeService } from './stripe.service';
import { kitchenGateway } from '../gateway/gateway.gateway';

@Injectable()
export class PaymentsService {
  private static readonly STRIPE_MIN_USD = 0.5;
  private static readonly DELIVERY_ALLOWED_METHODS: PaymentMethod[] = [
    PaymentMethod.CARD,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly gateway: kitchenGateway,
  ) {}

  private validateStripeMinimum(amount: number) {
    if (amount < PaymentsService.STRIPE_MIN_USD) {
      throw new BadRequestException(
        `Minimum card payment amount is $${PaymentsService.STRIPE_MIN_USD.toFixed(2)}.`,
      );
    }
  }

  private validateDeliveryMethod(orderType: OrderType, method: PaymentMethod) {
    if (
      orderType === OrderType.DELIVERY
      && !PaymentsService.DELIVERY_ALLOWED_METHODS.includes(method)
    ) {
      throw new BadRequestException('For delivery orders, only Card is allowed');
    }
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
    if (value === null || value === undefined) return 0;
    return Number(value);
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

    this.validateDeliveryMethod(order.orderType, dto.method);

    if (dto.method === PaymentMethod.CASH) {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: dto.orderId,
          amount: order.total,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
          transactionRef: dto.transactionRef,
        },
      });

      this.gateway.emitCashPaymentSelected({
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        message: 'Customer selected CASH. Collect payment at counter/table.',
      });

      return payment;
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

  async markRefundPendingOnCancel(orderId: string, reason = 'ORDER_CANCELLED') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!order.payment) {
      return { status: 'NO_PAYMENT' as const };
    }

    if (order.payment.method !== PaymentMethod.CARD) {
      return { status: 'NOT_CARD_PAYMENT' as const };
    }

    if (order.payment.status === PaymentStatus.REFUNDED) {
      return { status: 'ALREADY_REFUNDED' as const };
    }

    if (order.payment.status === PaymentStatus.REFUND_PENDING) {
      return { status: 'ALREADY_REFUND_PENDING' as const };
    }

    if (order.payment.status !== PaymentStatus.PAID) {
      return { status: 'NOT_PAID' as const };
    }

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.REFUND_PENDING,
        refundReason: reason,
        refundAmount: order.payment.amount,
      },
    });

    this.gateway.emitPaymentRefundPending({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: this.toNumber(order.payment.amount),
      message: 'Refund awaiting staff approval',
    });

    return { status: 'REFUND_PENDING' as const };
  }

  async approveRefund(orderId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!order.payment) {
      throw new NotFoundException('No payment found for this order');
    }

    if (order.payment.method !== PaymentMethod.CARD) {
      throw new BadRequestException('Refund approval is only supported for card payments');
    }

    if (order.payment.status === PaymentStatus.REFUNDED) {
      return {
        alreadyRefunded: true,
        payment: order.payment,
      };
    }

    if (order.payment.status !== PaymentStatus.REFUND_PENDING) {
      throw new BadRequestException('Payment is not in REFUND_PENDING state');
    }

    if (!order.payment.stripePaymentIntentId) {
      throw new BadRequestException('Stripe payment reference missing for refund');
    }

    const refund = await this.stripe.createRefund(
      order.payment.stripePaymentIntentId,
      `refund:${order.payment.id}`,
      undefined,
      'requested_by_customer',
    );

    await this.prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundRef: refund.id,
        refundReason: reason ?? order.payment.refundReason ?? 'ORDER_CANCELLED',
        refundAmount: order.payment.amount,
        refundedAt: new Date(),
      },
    });

    this.gateway.emitPaymentRefunded({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: this.toNumber(order.payment.amount),
      refundRef: refund.id,
    });

    const updatedPayment = await this.prisma.payment.findUnique({
      where: { id: order.payment.id },
    });

    return {
      refunded: true,
      payment: updatedPayment,
    };
  }

  async createStripePaymentIntent(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    this.validateDeliveryMethod(order.orderType, PaymentMethod.CARD);

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
          const orderAmount = Number(order.total);

          this.validateStripeMinimum(orderAmount);

          const newIntent = await this.stripe.createPaymentIntent(
            orderAmount,
            'usd',
            { orderId: order.id, orderNumber: order.orderNumber },
            ['card'],
          );

          await this.prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              method: PaymentMethod.CARD,
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

    const orderAmount = Number(order.total);

    this.validateStripeMinimum(orderAmount);

    const intent = await this.stripe.createPaymentIntent(
      orderAmount,
      'usd',
      { orderId: order.id, orderNumber: order.orderNumber },
      ['card'],
    );

    await this.prisma.payment.create({
      data: {
        orderId:               order.id,
        amount:                order.total,
        method:                PaymentMethod.CARD,
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
          where: {
            stripePaymentIntentId: intent.id,
            status: {
              in: [PaymentStatus.PENDING, PaymentStatus.FAILED],
            },
          },
          data: {
            status:         'PAID',
            paidAt:         new Date(),
            transactionRef: intent.id,
          },
        });

        const currentOrder = await this.prisma.order.findUnique({
          where: { id: orderId },
        });

        if (currentOrder) {
          if (currentOrder.status === OrderStatus.PENDING) {
            const updatedOrder = await this.prisma.order.update({
              where:   { id: orderId },
              data:    { status: 'CONFIRMED' },
              include: { orderItems: true },
            });

            this.gateway.emitStatusUpdate(updatedOrder);
            this.gateway.emitPaymentConfirmed({
              orderId,
              orderNumber: updatedOrder.orderNumber,
              amount: intent.amount / 100,
            });
          } else {
            this.gateway.emitPaymentConfirmed({
              orderId,
              orderNumber: currentOrder.orderNumber,
              amount: intent.amount / 100,
            });
          }
        }
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
            message: 'Card payment is being processed',
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
      if (
        order.payment.status !== PaymentStatus.PAID
        && order.payment.status !== PaymentStatus.REFUND_PENDING
        && order.payment.status !== PaymentStatus.REFUNDED
      ) {
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: PaymentStatus.PAID,
            paidAt: order.payment.paidAt ?? new Date(),
            transactionRef: intent.id,
          },
        });

        if (order.status === OrderStatus.PENDING) {
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
        } else {
          this.gateway.emitPaymentConfirmed({
            orderId,
            orderNumber: order.orderNumber,
            amount: intent.amount / 100,
          });
        }
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