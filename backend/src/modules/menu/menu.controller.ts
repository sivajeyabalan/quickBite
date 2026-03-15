import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Public } from '../auth/decorators/public.decorators';

@ApiTags('Menu')
@ApiBearerAuth('access-token')
@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: 'Get all menu items — filterable by category, search, availability (public)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category UUID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiQuery({ name: 'available', required: false, enum: ['true', 'false'], description: 'Filter by availability' })
  @Get()
  @Public()
  findAll(@Query() query: { category?: string; search?: string; available?: string }) {
    return this.menuService.findAll(query);
  }

  @ApiOperation({ summary: 'Get ALL items including soft-deleted with order counts (admin only)' })
  @Get('admin-list')
  @Roles('ADMIN')
  findAllAdmin() {
    return this.menuService.findAllAdmin();
  }

  @ApiOperation({ summary: 'Get a single menu item by ID (public)' })
  @ApiParam({ name: 'id', type: String, description: 'Menu item UUID' })
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new menu item (admin only)' })
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateMenuItemDto) {
    return this.menuService.create(dto);
  }

  @ApiOperation({ summary: 'Update a menu item (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Menu item UUID' })
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto);
  }

  @ApiOperation({ summary: 'Toggle availability of a menu item (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Menu item UUID' })
  @Patch(':id/toggle-availability')
  @Roles('ADMIN')
  toggleAvailability(@Param('id') id: string) {
    return this.menuService.toggleAvailability(id);
  }

  @ApiOperation({ summary: 'Smart-delete: hard-delete if no order refs, soft-delete otherwise (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Menu item UUID' })
  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.menuService.delete(id);
  }
}