import { IsString, MinLength } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @MinLength(1)
  slotId!: string;
}
