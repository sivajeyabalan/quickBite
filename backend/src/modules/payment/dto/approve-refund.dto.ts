import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveRefundDto {
  @ApiPropertyOptional({
    example: 'Customer cancelled after payment',
    description: 'Optional reason for refund approval',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
