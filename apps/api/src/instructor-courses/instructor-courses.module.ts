import { Module } from '@nestjs/common';
import { InstructorCoursesService } from './instructor-courses.service';
import { InstructorCoursesController } from './instructor-courses.controller';

@Module({
  controllers: [InstructorCoursesController],
  providers: [InstructorCoursesService],
})
export class InstructorCoursesModule {}
