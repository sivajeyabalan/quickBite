import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Mains', description: 'Unique category name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Hearty main courses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2, minimum: 0, description: 'Display sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}