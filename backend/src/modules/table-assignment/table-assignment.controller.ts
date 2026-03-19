import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current.decorators';
import { Roles } from '../auth/decorators/roles.decorators';
import { AssignTableDto } from './dto/assign-table.dto';
import { TableAssignmentService } from './table-assignment.service';

@ApiTags('Table Assignments')
@ApiBearerAuth('access-token')
@Controller('table-assignments')
export class TableAssignmentController {
  constructor(private readonly tableAssignmentService: TableAssignmentService) {}

  @ApiOperation({ summary: 'Assign a table to a customer (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Post('assign')
  assign(
    @CurrentUser() user: any,
    @Body() dto: AssignTableDto,
  ) {
    return this.tableAssignmentService.assign(dto, user.id);
  }

  @ApiOperation({ summary: 'Get all active table assignments (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Get()
  getAll() {
    return this.tableAssignmentService.findAll();
  }

  @ApiOperation({ summary: 'Get active table assignment for current user' })
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.tableAssignmentService.findActiveByUser(user.id);
  }

  @ApiOperation({ summary: 'Release current user table assignment (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch('release')
  release(@Body('userId') userId: string) {
    return this.tableAssignmentService.releaseForUser(userId);
  }
}
