import { Module } from '@nestjs/common';

import { PrismaModule } from './modules/prisma/prisma.module'
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

import { RolesGuard } from './modules/auth/guards/roles.guard';
import { CategoriesModule } from './modules/categories/categories.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/order/order.module';
import { PaymentsModule } from './modules/payment/payment.module';
@Module({
  imports: [PrismaModule, ConfigModule.forRoot({isGlobal : true}) , PrismaModule , AuthModule , CategoriesModule, MenuModule ,OrdersModule , PaymentsModule],
  
  providers: [
    {provide : APP_GUARD , useClass : JwtAuthGuard},
    {provide : APP_GUARD , useClass : RolesGuard},
  ],
})
export class AppModule {}
