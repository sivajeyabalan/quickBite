import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Public } from '../auth/decorators/public.decorators';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Get all categories (public)' })
  @Get()
  @Public()
  findAll() {
    return this.categoriesService.findAll();
  }

  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @ApiOperation({ summary: 'Update a category (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a category (admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Category UUID' })
  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}