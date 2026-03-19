import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current.decorators';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('User Addresses')
@ApiBearerAuth('access-token')
@Controller('users/addresses')
export class UserAddressesController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List current user addresses' })
  @Get()
  findMyAddresses(@CurrentUser() user: any) {
    return this.usersService.findAddressesByUser(user.id);
  }

  @ApiOperation({ summary: 'Create a new address for current user' })
  @Post()
  createAddress(
    @CurrentUser() user: any,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  @ApiOperation({ summary: 'Update an address owned by current user' })
  @ApiParam({ name: 'id', type: String })
  @Patch(':id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @ApiOperation({ summary: 'Set a current user address as default' })
  @ApiParam({ name: 'id', type: String })
  @Patch(':id/default')
  setDefaultAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, id);
  }

  @ApiOperation({ summary: 'Delete an address owned by current user' })
  @ApiParam({ name: 'id', type: String })
  @Delete(':id')
  removeAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }
}