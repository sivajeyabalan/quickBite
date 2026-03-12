import { Module } from '@nestjs/common';

import { PrismaModule } from './modules/prisma/prisma.module'
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { Roles } from './modules/auth/decorators/roles.decorators';
import { RolesGuard } from './modules/auth/guards/roles.guard';


@Module({
  imports: [PrismaModule, ConfigModule.forRoot({isGlobal : true}) , PrismaModule , AuthModule],
  
  providers: [
    {provide : APP_GUARD , useClass : JwtAuthGuard},
    {provide : APP_GUARD , useClass : RolesGuard},
  ],
})
export class AppModule {}
