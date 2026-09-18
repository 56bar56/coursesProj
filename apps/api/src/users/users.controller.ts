import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findPublicById(user.sub);
  }

  @Patch('me')
  @UseGuards(OriginCheckGuard)
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch(':id/roles')
  @UseGuards(OriginCheckGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateRoles(@Param('id') id: string, @Body() dto: UpdateRolesDto) {
    return this.usersService.updateRoles(id, dto.roles);
  }
}
