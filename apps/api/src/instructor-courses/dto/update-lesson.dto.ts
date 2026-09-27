import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  textContent?: string;
}
