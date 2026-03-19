import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersService } from './order.service';
import { OrderController } from './order.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { PaymentsModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, GatewayModule, PaymentsModule],
  controllers: [OrderController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}