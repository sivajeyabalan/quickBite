import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TableAssignmentController } from './table-assignment.controller';
import { TableAssignmentService } from './table-assignment.service';

@Module({
  imports: [PrismaModule],
  controllers: [TableAssignmentController],
  providers: [TableAssignmentService],
  exports: [TableAssignmentService],
})
export class TableAssignmentModule {}
