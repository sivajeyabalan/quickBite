import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger('StripeService');

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      { apiVersion: '2024-04-10' as Stripe.LatestApiVersion },
    );
  }

  async createPaymentIntent(
    amountInDollars: number,
    currency = 'usd',
    metadata: Record<string, string> = {},
    paymentMethodTypes?: string[],
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(
      `Creating PaymentIntent for $${amountInDollars}`,
    );

    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amountInDollars * 100),
      currency,
      metadata,
    };

    if (paymentMethodTypes && paymentMethodTypes.length > 0) {
      params.payment_method_types = paymentMethodTypes as any;
    } else {
      params.automatic_payment_methods = { enabled: true };
    }

    return this.stripe.paymentIntents.create(params);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    )!;
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}