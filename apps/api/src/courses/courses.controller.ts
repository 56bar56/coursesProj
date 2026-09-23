import { Controller, Get, Param, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ListCoursesQueryDto } from './dto/list-courses.query.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query() query: ListCoursesQueryDto) {
    return this.coursesService.list(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }
}
