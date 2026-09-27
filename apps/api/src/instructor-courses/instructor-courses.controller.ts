import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OriginCheckGuard } from '../common/guards/origin-check.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../generated/prisma/enums';
import { InstructorCoursesService } from './instructor-courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import type { AuthenticatedUser } from '../auth/types';

@Controller('instructor/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.INSTRUCTOR)
export class InstructorCoursesController {
  constructor(private readonly instructorCoursesService: InstructorCoursesService) {}

  @Post()
  @UseGuards(OriginCheckGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCourseDto) {
    return this.instructorCoursesService.createCourse(user.sub, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.listMine(user.sub);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.getOne(user.sub, id);
  }

  @Patch(':id')
  @UseGuards(OriginCheckGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.updateCourse(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(OriginCheckGuard)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.deleteCourse(user.sub, id);
  }

  @Post(':id/submit')
  @UseGuards(OriginCheckGuard)
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.submit(user.sub, id);
  }

  @Post(':id/modules')
  @UseGuards(OriginCheckGuard)
  addModule(@Param('id') id: string, @Body() dto: CreateModuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.addModule(user.sub, id, dto);
  }

  @Patch(':id/modules/:moduleId')
  @UseGuards(OriginCheckGuard)
  updateModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.instructorCoursesService.updateModule(user.sub, id, moduleId, dto);
  }

  @Delete(':id/modules/:moduleId')
  @UseGuards(OriginCheckGuard)
  removeModule(@Param('id') id: string, @Param('moduleId') moduleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorCoursesService.deleteModule(user.sub, id, moduleId);
  }

  @Post(':id/modules/:moduleId/lessons')
  @UseGuards(OriginCheckGuard)
  addLesson(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.instructorCoursesService.addLesson(user.sub, id, moduleId, dto);
  }

  @Patch(':id/modules/:moduleId/lessons/:lessonId')
  @UseGuards(OriginCheckGuard)
  updateLesson(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.instructorCoursesService.updateLesson(user.sub, id, moduleId, lessonId, dto);
  }

  @Delete(':id/modules/:moduleId/lessons/:lessonId')
  @UseGuards(OriginCheckGuard)
  removeLesson(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.instructorCoursesService.deleteLesson(user.sub, id, moduleId, lessonId);
  }
}
