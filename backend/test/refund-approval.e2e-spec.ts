import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { StripeService } from '../src/modules/payment/stripe.service';

describe('Refund approval endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stripeMock = {
    createPaymentIntent: jest.fn(),
    constructWebhookEvent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    createRefund: jest.fn(),
  };

  const randomSuffix = Date.now();
  const customerEmail = `refund.customer.${randomSuffix}@quickbite.test`;
  const staffEmail = `refund.staff.${randomSuffix}@quickbite.test`;
  const password = 'StrongPass123!';

  let customerToken = '';
  let staffToken = '';
  let customerId = '';
  let staffId = '';
  let orderId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StripeService)
      .useValue(stripeMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    stripeMock.createRefund.mockResolvedValue({ id: 're_test_123' });

    const customerRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: customerEmail,
        password,
        name: 'Refund Customer',
      })
      .expect(201);

    customerToken = customerRegister.body?.data?.access_token;
    customerId = customerRegister.body?.data?.user?.id;

    const staffRegister = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: staffEmail,
        password,
        name: 'Refund Staff',
      })
      .expect(201);

    staffId = staffRegister.body?.data?.user?.id;

    await prisma.user.update({
      where: { id: staffId },
      data: { role: Role.STAFF },
    });

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: staffEmail,
        password,
      })
      .expect(200);

    staffToken = staffLogin.body?.data?.access_token;

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: `QB-REF-${randomSuffix}`,
        status: 'CANCELLED',
        orderType: 'PICKUP',
        subtotal: 50,
        tax: 5,
        total: 55,
        userId: customerId,
        notes: 'Refund e2e test order',
      },
    });

    orderId = createdOrder.id;

    await prisma.payment.create({
      data: {
        orderId,
        amount: 55,
        method: PaymentMethod.CARD,
        status: PaymentStatus.REFUND_PENDING,
        stripePaymentIntentId: 'pi_test_123',
        refundReason: 'ORDER_CANCELLED_BY_CUSTOMER',
      },
    });
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [customerEmail, staffEmail],
        },
      },
    });

    await app.close();
  });

  it('blocks customer from approving refund (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/payments/orders/${orderId}/refund/approve`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Trying as customer' })
      .expect(403);
  });

  it('allows staff to approve refund and persists REFUNDED status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/payments/orders/${orderId}/refund/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Staff approved refund' })
      .expect(200);

    expect(response.body?.refunded).toBe(true);
    expect(response.body?.payment?.status).toBe(PaymentStatus.REFUNDED);

    expect(stripeMock.createRefund).toHaveBeenCalledWith(
      'pi_test_123',
      expect.stringContaining('refund:'),
      undefined,
      'requested_by_customer',
    );

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment?.status).toBe(PaymentStatus.REFUNDED);
    expect(payment?.refundRef).toBe('re_test_123');
  });

  it('is idempotent: second approval call does not create another refund', async () => {
    const secondResponse = await request(app.getHttpServer())
      .patch(`/payments/orders/${orderId}/refund/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Retry approval' })
      .expect(200);

    expect(secondResponse.body?.alreadyRefunded).toBe(true);
    expect(secondResponse.body?.payment?.status).toBe(PaymentStatus.REFUNDED);
    expect(stripeMock.createRefund).toHaveBeenCalledTimes(1);

    const paymentAfterSecondCall = await prisma.payment.findUnique({ where: { orderId } });
    expect(paymentAfterSecondCall?.status).toBe(PaymentStatus.REFUNDED);
    expect(paymentAfterSecondCall?.refundRef).toBe('re_test_123');
  });
});
