import { IsString, MinLength } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  textContent!: string;
}
