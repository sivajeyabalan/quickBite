// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()   // makes PrismaService available everywhere without re-importing
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}