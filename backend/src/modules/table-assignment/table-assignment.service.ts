import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTableDto } from './dto/assign-table.dto';
import { TableAssignmentStatus } from '@prisma/client';

@Injectable()
export class TableAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(dto: AssignTableDto, assignedById: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    const normalizedTable = dto.tableNumber.trim().toUpperCase();
    if (!normalizedTable) {
      throw new BadRequestException('Table number is required');
    }

    await this.prisma.$transaction(async tx => {
      await tx.tableAssignment.updateMany({
        where: {
          OR: [
            { userId: dto.userId, status: TableAssignmentStatus.ACTIVE },
            { tableNumber: normalizedTable, status: TableAssignmentStatus.ACTIVE },
          ],
        },
        data: {
          status: TableAssignmentStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      await tx.tableAssignment.create({
        data: {
          userId: dto.userId,
          assignedById,
          tableNumber: normalizedTable,
          status: TableAssignmentStatus.ACTIVE,
        },
      });
    });

    return this.findActiveByUser(dto.userId);
  }

  async findActiveByUser(userId: string) {
    return this.prisma.tableAssignment.findFirst({
      where: {
        userId,
        status: TableAssignmentStatus.ACTIVE,
      },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        tableNumber: true,
        status: true,
        assignedAt: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.tableAssignment.findMany({
      where: {
        status: TableAssignmentStatus.ACTIVE,
      },
      orderBy: { assignedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        tableNumber: true,
        status: true,
        assignedAt: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async releaseForUser(userId: string) {
    const released = await this.prisma.tableAssignment.updateMany({
      where: {
        userId,
        status: TableAssignmentStatus.ACTIVE,
      },
      data: {
        status: TableAssignmentStatus.RELEASED,
        releasedAt: new Date(),
      },
    });

    if (!released.count) {
      throw new NotFoundException('No active table assignment found');
    }

    return { released: released.count };
  }
}
