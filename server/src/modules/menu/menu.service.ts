import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

interface MenuQuery {
  category?: string;
  search?: string;
  available?: string;
}

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: MenuQuery) {
    const { category, search, available } = query;

    return this.prisma.menuItem.findMany({
      where: {
        // Only filter by availability if explicitly passed
        ...(available !== undefined && { isAvailable: available === 'true' }),

        // Filter by category name if provided
        ...(category && {
          category: { name: { equals: category, mode: 'insensitive' } },
        }),

        // Search in name OR description — case insensitive
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });

    if (!item) {
      throw new NotFoundException(`Menu item with id ${id} not found`);
    }

    return item;
  }

  async create(dto: CreateMenuItemDto) {
    // Verify category exists before creating item
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${dto.categoryId} not found`);
    }

    return this.prisma.menuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
        prepTimeMins: dto.prepTimeMins ?? 10,
        customisationOptions: dto.customisationOptions,
        categoryId: dto.categoryId,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateMenuDto) {
    await this.findOne(id); // throws 404 if not found

    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id); // throws 404 if not found

    // Never hard delete — order history references this item
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: false },
    });
  }

  async toggleAvailability(id: string) {
    const item = await this.findOne(id);
    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }
}