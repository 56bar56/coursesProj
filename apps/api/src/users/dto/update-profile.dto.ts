import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const SUPPORTED_LOCALES = ['en', 'he'];

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
