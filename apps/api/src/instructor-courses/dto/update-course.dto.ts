import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { COURSE_CATEGORIES } from '../course-categories';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsIn(COURSE_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
