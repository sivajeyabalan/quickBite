# QuickBite — Stripe Payment Integration Plan

## Context
This is a NestJS + Prisma + PostgreSQL + React + Redux Toolkit + 
Socket.io project. The backend runs on port 3001. The frontend runs 
on port 5173. Socket.io gateway already exists at 
src/modules/gateway/gateway.gateway.ts with emitNewOrder() and 
emitStatusUpdate() methods already working.

Do not modify any existing working modules. Only add new code and 
extend existing files where explicitly instructed.

---

## PHASE 1 — Prisma Schema Update

### File: prisma/schema.prisma

Add this field to the Payment model:
- stripePaymentIntentId  String?  @map("stripe_payment_intent_id")

The full updated Payment model should look like this:

model Payment {
  id                    String        @id @default(uuid())
  amount                Decimal       @db.Decimal(10, 2)
  method                PaymentMethod
  status                PaymentStatus @default(PENDING)
  transactionRef        String?       @map("transaction_ref")
  stripePaymentIntentId String?       @map("stripe_payment_intent_id")
  paidAt                DateTime?     @map("paid_at")
  orderId               String        @unique @map("order_id")
  createdAt             DateTime      @default(now()) @map("created_at")
  order                 Order         @relation(fields: [orderId], references: [id])
  @@map("payments")
}

After updating the schema run:
npx prisma migrate dev --name add_stripe_payment_intent_id

---

## PHASE 2 — Environment Variables

### File: apps/backend/.env
Add these three variables:
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

### File: apps/backend/.env.example
Add these three variables with placeholder values:
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

### File: apps/frontend/.env
Add:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

### File: apps/frontend/.env.example
Add:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

---

## PHASE 3 — Install Dependencies

### Backend
Run in apps/backend/:
npm install stripe

### Frontend
Run in apps/frontend/:
npm install @stripe/stripe-js @stripe/react-stripe-js

---

## PHASE 4 — Backend: Enable Raw Body Parsing

### File: apps/backend/src/main.ts

Change the NestFactory.create call to enable rawBody.
Replace:
const app = await NestFactory.create(AppModule);

With:
const app = await NestFactory.create(AppModule, { rawBody: true });

No other changes to main.ts.

---

## PHASE 5 — Backend: StripeService

### Create file: apps/backend/src/modules/payments/stripe.service.ts

Content:

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
      { apiVersion: '2024-04-10' },
    );
  }

  async createPaymentIntent(
    amountInDollars: number,
    currency = 'usd',
    metadata: Record<string, string> = {},
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Creating PaymentIntent for $${amountInDollars}`);
    return this.stripe.paymentIntents.create({
      amount: Math.round(amountInDollars * 100),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
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
}

---

## PHASE 6 — Backend: Update PaymentsService

### File: apps/backend/src/modules/payments/payments.service.ts

Add these imports at the top:
import { StripeService } from './stripe.service';
import { KitchenGateway } from '../gateway/gateway.gateway';

Update the constructor to inject StripeService and KitchenGateway:
constructor(
  private readonly prisma:   PrismaService,
  private readonly stripe:   StripeService,
  private readonly gateway:  KitchenGateway,
) {}

Add this new method to the class.
Do not remove or modify any existing methods:

async createStripePaymentIntent(orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) {
    throw new NotFoundException(`Order ${orderId} not found`);
  }
  if (order.payment) {
    throw new ConflictException('Payment already exists for this order');
  }
  if (order.status === OrderStatus.CANCELLED) {
    throw new BadRequestException('Cannot pay for a cancelled order');
  }

  const intent = await this.stripe.createPaymentIntent(
    Number(order.total),
    'usd',
    { orderId: order.id, orderNumber: order.orderNumber },
  );

  await this.prisma.payment.create({
    data: {
      orderId:               order.id,
      amount:                order.total,
      method:                'CARD',
      status:                'PENDING',
      stripePaymentIntentId: intent.id,
    },
  });

  return {
    clientSecret:    intent.client_secret,
    paymentIntentId: intent.id,
    amount:          Number(order.total),
  };
}

Add this new method to the class:

async handleStripeWebhook(payload: Buffer, signature: string) {
  let event: any;

  try {
    event = this.stripe.constructWebhookEvent(payload, signature);
  } catch {
    throw new BadRequestException('Invalid webhook signature');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent  = event.data.object;
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
        orderId:     orderId,
        orderNumber: updatedOrder.orderNumber,
        amount:      intent.amount / 100,
      });

      this.gateway.emitStatusUpdate(updatedOrder);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent  = event.data.object;
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

  return { received: true };
}

---

## PHASE 7 — Backend: Update PaymentsController

### File: apps/backend/src/modules/payments/payments.controller.ts

Add these imports at the top:
import { Req, Headers, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

Add these two new endpoints to the class.
Do not remove or modify any existing endpoints:

@Post('stripe/intent')
createStripeIntent(@Body('orderId') orderId: string) {
  return this.paymentsService.createStripePaymentIntent(orderId);
}

@Post('stripe/webhook')
@Public()
stripeWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature: string,
) {
  return this.paymentsService.handleStripeWebhook(
    req.rawBody!,
    signature,
  );
}

---

## PHASE 8 — Backend: Update PaymentsModule

### File: apps/backend/src/modules/payments/payments.module.ts

Add GatewayModule to imports array.
Add StripeService to providers array.

The updated module should look like:

@Module({
  imports:     [PrismaModule, GatewayModule],
  controllers: [PaymentsController],
  providers:   [PaymentsService, StripeService],
  exports:     [PaymentsService],
})
export class PaymentsModule {}

---

## PHASE 9 — Backend: Update KitchenGateway

### File: apps/backend/src/modules/gateway/gateway.gateway.ts

Add these two new methods to the KitchenGateway class.
Do not remove or modify any existing methods:

emitPaymentConfirmed(data: {
  orderId:     string;
  orderNumber: string;
  amount:      number;
}) {
  this.logger.log(`Emitting payment:confirmed → ${data.orderNumber}`);
  this.server.emit('payment:confirmed', data);
}

emitPaymentFailed(data: {
  orderId:     string;
  orderNumber: string;
}) {
  this.logger.log(`Emitting payment:failed → ${data.orderNumber}`);
  this.server.emit('payment:failed', data);
}

---

## PHASE 10 — Frontend: StripePaymentForm Component

### Create file:
apps/frontend/src/features/orders/components/StripePaymentForm.tsx

Content:

import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import Spinner from '../../../components/ui/Spinner';

interface Props {
  orderId:   string;
  onSuccess: () => void;
}

export default function StripePaymentForm({ orderId, onSuccess }: Props) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?payment=complete`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      toast.success('Payment successful!');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white
                   font-semibold py-3 rounded-xl transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Spinner size="sm" /> : 'Pay Now'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Test card: 4242 4242 4242 4242 · Any future date · Any CVC
      </p>
    </form>
  );
}

---

## PHASE 11 — Frontend: PaymentPanel Component

### Create file:
apps/frontend/src/features/orders/components/PaymentPanel.tsx

Content:

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../api/axios';
import { Order, PaymentMethod } from '../../../types';
import StripePaymentForm from './StripePaymentForm';
import Spinner from '../../../components/ui/Spinner';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);

export default function PaymentPanel({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [clientSecret,   setClientSecret]   = useState<string | null>(null);

  const cashMutation = useMutation({
    mutationFn: (method: PaymentMethod) =>
      api.post('/payments', { orderId: order.id, method }),
    onSuccess: () => {
      toast.success('Payment recorded!');
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Payment failed');
    },
  });

  const intentMutation = useMutation({
    mutationFn: () =>
      api.post('/payments/stripe/intent', { orderId: order.id }),
    onSuccess: (res) => {
      setClientSecret(
        res.data.clientSecret ?? res.data.data?.clientSecret,
      );
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || 'Failed to initialise payment',
      );
    },
  });

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['order', order.id] });
    setClientSecret(null);
  };

  if (order.payment && order.payment.status === 'PAID') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">
          Payment
        </h2>
        <div className="bg-green-50 border border-green-200
                        rounded-xl p-4 space-y-2">
          <p className="text-green-700 font-semibold">
            Payment Confirmed
          </p>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-bold">
                ${Number(order.payment.amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Method</span>
              <span>{order.payment.method}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-green-600 font-medium">
                {order.payment.status}
              </span>
            </div>
            {order.payment.paidAt && (
              <div className="flex justify-between">
                <span>Paid at</span>
                <span>
                  {new Date(order.payment.paidAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border
                      border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-2">Payment</h2>
        <p className="text-sm text-red-500">
          This order was cancelled. No payment required.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border
                    border-gray-100 p-6">
      <h2 className="font-semibold text-gray-700 mb-1">Payment</h2>
      <p className="text-sm text-gray-400 mb-5">
        Total due:{' '}
        <span className="text-orange-500 font-bold text-base">
          ${Number(order.total).toFixed(2)}
        </span>
      </p>

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            orderId={order.id}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { value: 'CASH', label: 'Cash',   icon: '💵' },
              { value: 'CARD', label: 'Card',   icon: '💳' },
              { value: 'QR',   label: 'QR/UPI', icon: '📱' },
            ].map(m => (
              <button
                key={m.value}
                onClick={() =>
                  setSelectedMethod(m.value as PaymentMethod)
                }
                className={`flex flex-col items-center gap-1.5 py-3
                            rounded-xl border-2 text-xs font-medium
                            transition
                  ${selectedMethod === m.value
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600'
                  }`}
              >
                <span className="text-2xl">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>

          <button
            disabled={
              cashMutation.isPending || intentMutation.isPending
            }
            onClick={() => {
              if (selectedMethod === 'CARD') {
                intentMutation.mutate();
              } else {
                cashMutation.mutate(selectedMethod);
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600
                       text-white font-semibold py-3 rounded-xl
                       transition disabled:opacity-50"
          >
            {cashMutation.isPending || intentMutation.isPending
              ? <Spinner size="sm" />
              : `Pay $${Number(order.total).toFixed(2)} 
                 with ${selectedMethod}`
            }
          </button>
        </>
      )}
    </div>
  );
}

---

## PHASE 12 — Frontend: Update OrderTrackingPage

### File:
apps/frontend/src/features/orders/OrderTrackingPage.tsx

### Change 1 — Add this import at the top:
import { useSearchParams } from 'react-router-dom';
import PaymentPanel from './components/PaymentPanel';

### Change 2 — Add useSearchParams to the component:
const [searchParams] = useSearchParams();

### Change 3 — Add this useEffect after the existing
WebSocket useEffect:

useEffect(() => {
  const paymentReturn = searchParams.get('payment');
  if (paymentReturn === 'complete') {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    window.history.replaceState({}, '', `/orders/${id}`);
  }
}, [searchParams, id, queryClient]);

### Change 4 — Add payment:confirmed and payment:failed
listeners inside the existing WebSocket useEffect.
The existing useEffect already handles order:statusUpdated.
Add these two listeners inside the same useEffect:

socket.on('payment:confirmed', (data: {
  orderId: string;
  orderNumber: string;
  amount: number;
}) => {
  if (data.orderId === id) {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    toast.success(
      `Payment of $${data.amount.toFixed(2)} confirmed!`
    );
  }
});

socket.on('payment:failed', (data: { orderId: string }) => {
  if (data.orderId === id) {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    toast.error('Payment failed. Please try again.');
  }
});

Also add these to the cleanup return:
socket.off('payment:confirmed');
socket.off('payment:failed');

### Change 5 — Update the useQuery refetchInterval:
Replace the existing refetchInterval value with:

refetchInterval: (data) => {
  if (!data) return 3000;
  const isPending =
    data.payment?.status === 'PENDING' ||
    (!data.payment && data.status !== 'CANCELLED');
  return isPending ? 3000 : false;
},

### Change 6 — Add PaymentPanel to the JSX return.
Add this block after the existing order items section
and before the closing div.
Only show it when order is not PENDING:

{order.status !== 'PENDING' && (
  <PaymentPanel order={order} />
)}

---

## PHASE 13 — Verification Checklist

After all changes are made verify the following:

Backend:
- npx prisma migrate dev runs without errors
- npm run build passes with no TypeScript errors
- POST /api/payments/stripe/intent returns clientSecret
- POST /api/payments/stripe/webhook returns { received: true }
- Webhook endpoint has @Public() decorator so it bypasses JWT guard

Frontend:
- npm run build passes with no TypeScript errors
- VITE_STRIPE_PUBLISHABLE_KEY is loaded correctly
- PaymentPanel renders on /orders/:id when status is not PENDING
- Stripe card form appears when CARD method is selected
- Payment confirmed receipt renders after successful payment

---

## PHASE 14 — Local Webhook Testing

Run this in a separate terminal to forward Stripe events
to your local server:

stripe listen --forward-to localhost:3001/api/payments/stripe/webhook

Copy the webhook secret printed by the CLI and set it as
STRIPE_WEBHOOK_SECRET in your .env file.

Test cards to use:
Success:     4242 4242 4242 4242
Decline:     4000 0000 0000 0002
3D Secure:   4000 0025 0000 3155
Expiry:      Any future date
CVC:         Any 3 digits

---

## Important Constraints for the Agent

1. Do not modify the existing Auth, Menu, Orders, or 
   KDS modules beyond what is explicitly stated above.

2. Do not change any existing working endpoints.

3. Do not change the Prisma schema except adding 
   stripePaymentIntentId to the Payment model.

4. Do not install any packages other than stripe on 
   the backend and @stripe/stripe-js and 
   @stripe/react-stripe-js on the frontend.

5. Preserve all existing TypeScript types. Add new 
   types only where explicitly required.

6. The webhook endpoint must use @Public() decorator 
   to bypass JWT authentication. Stripe has no JWT token.

7. The webhook endpoint must receive the raw request 
   body as Buffer not parsed JSON. This is required 
   for Stripe signature verification.


## PHASE 15 — Google Pay and UPI via Stripe Payment Element

### Context
Google Pay and UPI are already enabled in the Stripe dashboard.
Stripe's Payment Element automatically shows Google Pay and UPI
as payment options when they are available for the customer's
device, browser, and location. No separate SDK or component is
needed. The existing StripePaymentForm already uses PaymentElement
which handles this automatically.

The only changes needed are:
1. Pass the correct payment method configuration when creating
   the PaymentIntent on the backend
2. Update the PaymentElement options on the frontend to enable
   wallet buttons
3. Wire the QR/UPI method selection to trigger the Stripe flow
   instead of the direct cash recording flow

---

### PHASE 15A — Backend: Update createStripePaymentIntent

### File:
apps/backend/src/modules/payments/payments.service.ts

### Change — Update the createPaymentIntent call inside
createStripePaymentIntent method.

Replace:
const intent = await this.stripe.createPaymentIntent(
  Number(order.total),
  'usd',
  { orderId: order.id, orderNumber: order.orderNumber },
);

With:
const intent = await this.stripe.createPaymentIntent(
  Number(order.total),
  'usd',
  { orderId: order.id, orderNumber: order.orderNumber },
  ['card', 'google_pay', 'upi'],
);

---

### PHASE 15B — Backend: Update StripeService

### File:
apps/backend/src/modules/payments/stripe.service.ts

### Change — Update createPaymentIntent method signature
to accept an optional paymentMethodTypes parameter.

Replace the entire createPaymentIntent method with:

async createPaymentIntent(
  amountInDollars: number,
  currency = 'usd',
  metadata: Record<string, string> = {},
  paymentMethodTypes?: string[],
): Promise<Stripe.PaymentIntent> {
  this.logger.log(
    `Creating PaymentIntent for $${amountInDollars}`
  );

  const params: Stripe.PaymentIntentCreateParams = {
    amount:   Math.round(amountInDollars * 100),
    currency,
    metadata,
  };

  if (paymentMethodTypes && paymentMethodTypes.length > 0) {
    // Explicit method types — used when you want to control
    // exactly which payment methods appear
    params.payment_method_types = paymentMethodTypes;
  } else {
    // automatic_payment_methods lets Stripe decide based on
    // customer location, device, and dashboard settings
    params.automatic_payment_methods = { enabled: true };
  }

  return this.stripe.paymentIntents.create(params);
}

---

### PHASE 15C — Backend: Update createStripePaymentIntent
to return paymentMethodTypes

### File:
apps/backend/src/modules/payments/payments.service.ts

### Change — Update the return statement of
createStripePaymentIntent to include paymentMethodTypes.

Replace:
return {
  clientSecret:    intent.client_secret,
  paymentIntentId: intent.id,
  amount:          Number(order.total),
};

With:
return {
  clientSecret:      intent.client_secret,
  paymentIntentId:   intent.id,
  amount:            Number(order.total),
  paymentMethodTypes: intent.payment_method_types,
};

---

### PHASE 15D — Frontend: Update PaymentPanel to trigger
Stripe flow for QR and UPI methods

### File:
apps/frontend/src/features/orders/components/PaymentPanel.tsx

### Change 1 — Update intentMutation to pass the selected
method to the backend.

Replace:
const intentMutation = useMutation({
  mutationFn: () =>
    api.post('/payments/stripe/intent', { orderId: order.id }),

With:
const intentMutation = useMutation({
  mutationFn: (method: 'CARD' | 'QR') =>
    api.post('/payments/stripe/intent', {
      orderId: order.id,
      method,
    }),

### Change 2 — Update the Pay button onClick handler
to trigger Stripe for both CARD and QR methods.

Replace:
onClick={() => {
  if (selectedMethod === 'CARD') {
    intentMutation.mutate();
  } else {
    cashMutation.mutate(selectedMethod);
  }
}}

With:
onClick={() => {
  if (selectedMethod === 'CARD' || selectedMethod === 'QR') {
    intentMutation.mutate(selectedMethod);
  } else {
    cashMutation.mutate(selectedMethod);
  }
}}

### Change 3 — Update the button label to reflect UPI
for QR method.

Replace:
`Pay $${Number(order.total).toFixed(2)} with ${selectedMethod}`

With:
`Pay $${Number(order.total).toFixed(2)} via ${
  selectedMethod === 'QR' ? 'UPI / Google Pay' : selectedMethod
}`

---

### PHASE 15E — Backend: Update createStripePaymentIntent
to accept method parameter from request body

### File:
apps/backend/src/modules/payments/payments.service.ts

### Change — Update the createStripePaymentIntent method
signature to accept an optional method parameter and use it
to decide which payment method types to request from Stripe.

Replace the method signature line:
async createStripePaymentIntent(orderId: string) {

With:
async createStripePaymentIntent(
  orderId: string,
  method?: 'CARD' | 'QR',
) {

Add this block just before the this.stripe.createPaymentIntent call:

const paymentMethodTypes = method === 'QR'
  ? ['card', 'upi']        // UPI and Google Pay for QR/UPI flow
  : ['card', 'google_pay']; // Card and Google Pay for card flow

Update the createPaymentIntent call to pass paymentMethodTypes:
const intent = await this.stripe.createPaymentIntent(
  Number(order.total),
  'usd',
  { orderId: order.id, orderNumber: order.orderNumber },
  paymentMethodTypes,
);

---

### PHASE 15F — Backend: Update PaymentsController
to pass method to service

### File:
apps/backend/src/modules/payments/payments.controller.ts

### Change — Update the createStripeIntent endpoint to
accept and forward the method field from the request body.

Replace:
@Post('stripe/intent')
createStripeIntent(@Body('orderId') orderId: string) {
  return this.paymentsService.createStripePaymentIntent(orderId);
}

With:
@Post('stripe/intent')
createStripeIntent(
  @Body('orderId') orderId: string,
  @Body('method') method?: 'CARD' | 'QR',
) {
  return this.paymentsService.createStripePaymentIntent(
    orderId,
    method,
  );
}

---

### PHASE 15G — Frontend: Update StripePaymentForm
to show wallet buttons above the card form

### File:
apps/frontend/src/features/orders/components/StripePaymentForm.tsx

### Change — Update the PaymentElement options to enable
wallet display and pass layout configuration.

Replace:
<PaymentElement />

With:
<PaymentElement
  options={{
    layout: {
      type: 'tabs',
      defaultCollapsed: false,
    },
    wallets: {
      googlePay: 'always',
      applePay:  'auto',
    },
    fields: {
      billingDetails: {
        address: {
          country:    'never',
          postalCode: 'never',
        },
      },
    },
  }}
/>

### Explanation of options:
- layout tabs — shows each payment method as a tab so
  the customer can switch between Card, Google Pay, UPI
- wallets.googlePay always — shows Google Pay button even
  if the browser supports it but the customer has not
  explicitly enabled it
- wallets.applePay auto — shows Apple Pay only when the
  device and browser support it
- billingDetails.address never — skips address fields
  since this is a restaurant app with no shipping

---

### PHASE 15H — Frontend: Update PaymentPanel to show
correct description for each method

### File:
apps/frontend/src/features/orders/components/PaymentPanel.tsx

### Change — Update the payment method buttons array to
reflect that QR triggers the Stripe UPI and Google Pay flow.

Replace the methods array:
{ value: 'CASH', label: 'Cash',   icon: '💵' },
{ value: 'CARD', label: 'Card',   icon: '💳' },
{ value: 'QR',   label: 'QR/UPI', icon: '📱' },

With:
{ value: 'CASH', label: 'Cash',             icon: '💵' },
{ value: 'CARD', label: 'Card / Google Pay', icon: '💳' },
{ value: 'QR',   label: 'UPI / GPay',        icon: '📱' },

---

### PHASE 15I — Handle UPI specific webhook event

Stripe sends a different event for UPI payments because
UPI is an asynchronous payment method. The customer
initiates payment but the bank confirmation can arrive
seconds or minutes later.

### File:
apps/backend/src/modules/payments/payments.service.ts

### Change — Add UPI async handling inside
handleStripeWebhook method.

Add this block after the payment_intent.payment_failed
block and before the return statement:

if (event.type === 'payment_intent.processing') {
  const intent  = event.data.object;
  const orderId = intent.metadata?.orderId;

  if (orderId) {
    // UPI payment is processing — bank has received request
    // but has not confirmed yet. Update status to show
    // customer that payment is being processed.
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data:  { status: 'PENDING' },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (order) {
      // Notify frontend that UPI processing has started
      this.server.emit('payment:processing', {
        orderId,
        orderNumber: order.orderNumber,
        message:     'UPI payment is being processed by your bank',
      });
    }
  }
}

### Note on this.server — the gateway server is not directly
accessible in the service. Use gateway.emitPaymentProcessing
instead. Add this method to KitchenGateway first:

### File:
apps/backend/src/modules/gateway/gateway.gateway.ts

### Add this method to KitchenGateway class:
emitPaymentProcessing(data: {
  orderId:     string;
  orderNumber: string;
  message:     string;
}) {
  this.logger.log(
    `Emitting payment:processing → ${data.orderNumber}`
  );
  this.server.emit('payment:processing', data);
}

### Then in payments.service.ts replace this.server.emit with:
this.gateway.emitPaymentProcessing({
  orderId,
  orderNumber: order.orderNumber,
  message: 'UPI payment is being processed by your bank',
});

---

### PHASE 15J — Frontend: Handle payment:processing event

### File:
apps/frontend/src/features/orders/OrderTrackingPage.tsx

### Change — Add payment:processing listener inside the
existing WebSocket useEffect alongside the other listeners.

Add this listener:
socket.on('payment:processing', (data: {
  orderId: string;
  message: string;
}) => {
  if (data.orderId === id) {
    toast.loading(data.message, {
      id:       'upi-processing',
      duration: 30000,
    });
  }
});

Add this to the existing payment:confirmed listener
to dismiss the loading toast when payment completes:

toast.dismiss('upi-processing');

The updated payment:confirmed listener should be:
socket.on('payment:confirmed', (data: {
  orderId:     string;
  orderNumber: string;
  amount:      number;
}) => {
  if (data.orderId === id) {
    toast.dismiss('upi-processing');
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    toast.success(
      `Payment of $${data.amount.toFixed(2)} confirmed!`
    );
  }
});

Add payment:processing to the cleanup return:
socket.off('payment:processing');

---

### PHASE 15K — Verification for Google Pay and UPI

After all Phase 15 changes verify the following:

Backend:
- npm run build passes with no TypeScript errors
- POST /api/payments/stripe/intent with method: CARD
  returns clientSecret with payment_method_types
  containing card and google_pay
- POST /api/payments/stripe/intent with method: QR
  returns clientSecret with payment_method_types
  containing card and upi
- Webhook handles payment_intent.processing event
  for async UPI payments

Frontend:
- Selecting CARD shows Stripe form with Card tab
  and Google Pay button
- Selecting QR/UPI shows Stripe form with UPI tab
  and Google Pay button
- Google Pay button appears when browser supports it
  (Chrome on Android or desktop Chrome with saved card)
- UPI tab appears and accepts VPA address input
  (e.g. customer@upi)
- Payment confirmed receipt shows after successful payment
- Loading toast appears during UPI processing
- Loading toast dismisses when payment confirmed arrives

Test values for UPI in Stripe test mode:
UPI success VPA:  success@razorpay
UPI failure VPA:  failure@razorpay

---

### How Google Pay and UPI work via Stripe Payment Element

Google Pay:
The PaymentElement detects if the browser supports Google Pay
(Chrome on Android, Chrome desktop with saved payment method).
If supported, a Google Pay button appears automatically above
the card form. The customer taps it, authenticates with their
Google account biometric or PIN, and payment completes without
entering card details. Your backend code is identical — Stripe
handles the Google Pay token exchange transparently.

UPI:
When the customer selects the UPI tab in the Payment Element
they enter their UPI VPA address (virtualpaymentsaddress@bank).
Stripe sends a collect request to their UPI app. The customer
opens their UPI app (GPay, PhonePe, Paytm), sees the collect
request, and approves it. This is an asynchronous flow — the
bank confirmation can take between 2 seconds and 2 minutes.
This is why Phase 15I adds a payment_intent.processing webhook
handler — Stripe fires this event immediately when UPI collect
is sent, before the bank confirms. The frontend shows a
processing toast so the customer knows to check their UPI app.
The payment_intent.succeeded event fires when the bank confirms.

### Important Constraints for Phase 15

1. Do not remove the CASH payment method — it uses the
   existing direct payment recording endpoint not Stripe.

2. Do not modify the existing Stripe webhook endpoint path
   or its @Public() decorator.

3. The PaymentElement options in Phase 15G are additive —
   do not remove any existing props on the element.

4. UPI is only available for INR currency. If your Stripe
   account is set to USD you must either switch the currency
   to INR for UPI payments or create a separate PaymentIntent
   with currency: 'inr' for the QR flow. Update the
   createPaymentIntent call accordingly:

   For QR/UPI method use currency: 'inr'
   For CARD method use currency: 'usd' or your default

5. Google Pay amount must match the PaymentIntent amount
   exactly. Do not allow the customer to change quantity
   after the Stripe form has loaded.