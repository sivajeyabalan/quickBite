import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly addressSelect = {
    id: true,
    label: true,
    recipientName: true,
    phone: true,
    line1: true,
    line2: true,
    city: true,
    state: true,
    postalCode: true,
    landmark: true,
    isDefault: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async findAddressesByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      select: this.addressSelect,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.address.count({ where: { userId } });
      const makeDefault = dto.isDefault || existingCount === 0;

      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: dto.label,
          recipientName: dto.recipientName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          landmark: dto.landmark,
          isDefault: makeDefault,
        },
        select: this.addressSelect,
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have access to this address');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          label: dto.label,
          recipientName: dto.recipientName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          landmark: dto.landmark,
          isDefault: dto.isDefault,
        },
        select: this.addressSelect,
      });
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have access to this address');
    }

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return this.prisma.address.findUnique({
      where: { id: addressId },
      select: this.addressSelect,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have access to this address');
    }

    const wasDefault = address.isDefault;

    await this.prisma.address.delete({ where: { id: addressId } });

    if (wasDefault) {
      const firstRemaining = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstRemaining) {
        await this.prisma.address.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { deleted: true };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
