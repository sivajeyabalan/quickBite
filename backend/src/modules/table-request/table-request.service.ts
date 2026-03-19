import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TableRequestStatus } from '@prisma/client';
import { RequestTableDto } from './dto/request-table.dto';

@Injectable()
export class TableRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async requestTable(userId: string, dto: RequestTableDto) {
    // Check if user already has a pending request
    const existingRequest = await this.prisma.tableRequest.findFirst({
      where: {
        userId,
        status: TableRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending table request');
    }

    return this.prisma.tableRequest.create({
      data: {
        userId,
        partySize: dto.partySize,
        notes: dto.notes,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        partySize: true,
        notes: true,
        requestedAt: true,
      },
    });
  }

  async findPendingRequests() {
    return this.prisma.tableRequest.findMany({
      where: {
        status: TableRequestStatus.PENDING,
      },
      orderBy: { requestedAt: 'asc' },
      select: {
        id: true,
        userId: true,
        status: true,
        partySize: true,
        notes: true,
        requestedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.tableRequest.findFirst({
      where: {
        userId,
        status: TableRequestStatus.PENDING,
      },
      select: {
        id: true,
        userId: true,
        status: true,
        partySize: true,
        notes: true,
        requestedAt: true,
      },
    });
  }

  async completeRequest(requestId: string) {
    const request = await this.prisma.tableRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Table request not found');
    }

    return this.prisma.tableRequest.update({
      where: { id: requestId },
      data: {
        status: TableRequestStatus.COMPLETED,
        completedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        completedAt: true,
      },
    });
  }

  async cancelRequest(requestId: string) {
    const request = await this.prisma.tableRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Table request not found');
    }

    return this.prisma.tableRequest.update({
      where: { id: requestId },
      data: {
        status: TableRequestStatus.CANCELLED,
        completedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        completedAt: true,
      },
    });
  }
}
