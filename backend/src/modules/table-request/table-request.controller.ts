import { Body, Controller, Get, Post, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current.decorators';
import { Roles } from '../auth/decorators/roles.decorators';
import { TableRequestService } from './table-request.service';
import { RequestTableDto } from './dto/request-table.dto';

@ApiTags('Table Requests')
@ApiBearerAuth('access-token')
@Controller('table-requests')
export class TableRequestController {
  constructor(private readonly tableRequestService: TableRequestService) {}

  @ApiOperation({ summary: 'Customer requests a table (fine-dine)' })
  @Post()
  requestTable(@CurrentUser() user: any, @Body() dto: RequestTableDto) {
    return this.tableRequestService.requestTable(user.id, dto);
  }

  @ApiOperation({ summary: 'Get current user\'s pending table request' })
  @Get('me')
  my(@CurrentUser() user: any) {
    return this.tableRequestService.findByUserId(user.id);
  }

  @ApiOperation({ summary: 'Get all pending table requests (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Get('pending')
  getAllPending() {
    return this.tableRequestService.findPendingRequests();
  }

  @ApiOperation({ summary: 'Complete a table request after assigning table (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch(':id/complete')
  complete(@Param('id') requestId: string) {
    return this.tableRequestService.completeRequest(requestId);
  }

  @ApiOperation({ summary: 'Cancel a table request (staff/admin)' })
  @Roles(Role.STAFF, Role.ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id') requestId: string) {
    return this.tableRequestService.cancelRequest(requestId);
  }
}
