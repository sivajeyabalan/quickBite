import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { GatewayModule } from '../gateway/gateway.module';
import { StripeService } from './stripe.service';


@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}