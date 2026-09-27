import { IsString, MinLength } from 'class-validator';

export class RejectCourseDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
