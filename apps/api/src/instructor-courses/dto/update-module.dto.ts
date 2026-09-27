import { IsString, MinLength } from 'class-validator';

export class UpdateModuleDto {
  @IsString()
  @MinLength(1)
  title!: string;
}
