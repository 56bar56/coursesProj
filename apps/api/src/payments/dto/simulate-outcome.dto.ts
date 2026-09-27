import { IsIn } from 'class-validator';

export class SimulateOutcomeDto {
  @IsIn(['success', 'failure'])
  outcome!: 'success' | 'failure';
}
