import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TableRequestService } from './table-request.service';
import { TableRequestController } from './table-request.controller';

@Module({
  imports: [PrismaModule],
  providers: [TableRequestService],
  controllers: [TableRequestController],
  exports: [TableRequestService],
})
export class TableRequestModule {}
