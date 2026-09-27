import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { AdminService } from './admin.service';
import { RejectCourseDto } from './dto/reject-course.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('courses/pending')
  listPendingCourses() {
    return this.adminService.listPendingCourses();
  }

  @Patch('courses/:id/approve')
  @UseGuards(OriginCheckGuard)
  approve(@Param('id') id: string) {
    return this.adminService.approve(id);
  }

  @Patch('courses/:id/reject')
  @UseGuards(OriginCheckGuard)
  reject(@Param('id') id: string, @Body() dto: RejectCourseDto) {
    return this.adminService.reject(id, dto.reason);
  }

  @Patch('reviews/:id/hide')
  @UseGuards(OriginCheckGuard)
  hideReview(@Param('id') id: string) {
    return this.adminService.hideReview(id);
  }
}
