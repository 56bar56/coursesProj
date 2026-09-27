import { IsString, MinLength } from 'class-validator';

export class CreateBookingCheckoutDto {
  @IsString()
  @MinLength(1)
  bookingId!: string;
}
