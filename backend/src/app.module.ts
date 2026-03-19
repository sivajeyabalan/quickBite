import { Module } from '@nestjs/common';

import { PrismaModule } from './modules/prisma/prisma.module'
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CategoriesModule } from './modules/categories/categories.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/order/order.module';
import { PaymentsModule } from './modules/payment/payment.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { UsersModule } from './modules/users/users.module';
import { TableAssignmentModule } from './modules/table-assignment/table-assignment.module';
import { TableRequestModule } from './modules/table-request/table-request.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    GatewayModule,
    TableAssignmentModule,
    TableRequestModule,
  ],
  
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {provide : APP_GUARD , useClass : JwtAuthGuard},
    {provide : APP_GUARD , useClass : RolesGuard},
  ],
})
export class AppModule {}
