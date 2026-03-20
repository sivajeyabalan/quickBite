import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatHistoryTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'Do you have spicy burgers?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

export class ChatAssistantRequestDto {
  @ApiProperty({ example: 'I want to order something cheesy' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ type: [ChatHistoryTurnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryTurnDto)
  history?: ChatHistoryTurnDto[];

  @ApiPropertyOptional({ enum: ['menu'], example: 'menu' })
  @IsOptional()
  @IsIn(['menu'])
  pageContext?: 'menu';
}

