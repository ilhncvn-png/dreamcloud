import { ApiProperty } from '@nestjs/swagger';

export type TrendDirection = 'new' | 'rising' | 'stable' | 'falling';

export class SignalItemDto {
  @ApiProperty() name: string;
  @ApiProperty() count: number;
  @ApiProperty() trend: TrendDirection;
  @ApiProperty() trendPct: number;
}

export class SignalsResponseDto {
  @ApiProperty() period: '24h' | '7d' | '30d';
  @ApiProperty() periodLabel: string;
  @ApiProperty() dreamCount: number;
  @ApiProperty() generatedAt: string;
  @ApiProperty({ type: [SignalItemDto] }) themes: SignalItemDto[];
  @ApiProperty({ type: [SignalItemDto] }) emotions: SignalItemDto[];
  @ApiProperty({ type: [SignalItemDto] }) symbols: SignalItemDto[];
  @ApiProperty({ type: [SignalItemDto] }) locations: SignalItemDto[];
  @ApiProperty({ type: [SignalItemDto] }) archetypes: SignalItemDto[];
}
