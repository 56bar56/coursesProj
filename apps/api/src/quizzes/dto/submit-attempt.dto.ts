import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class AnswerDto {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsInt()
  selectedOptionIndex?: number;

  @IsOptional()
  @IsString()
  numericAnswer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpentSec?: number;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers!: AnswerDto[];
}
