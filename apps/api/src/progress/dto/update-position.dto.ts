import { IsInt, Min } from 'class-validator';

export class UpdatePositionDto {
  @IsInt()
  @Min(0)
  positionSec!: number;
}
