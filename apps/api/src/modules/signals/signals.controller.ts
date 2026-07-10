import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignalsResponseDto } from './dto/signals-response.dto';
import { SignalsService } from './signals.service';

@ApiTags('signals')
@Controller('signals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get('today')
  @ApiOperation({ summary: 'Dream signals for the last 24 hours' })
  @ApiOkResponse({ type: SignalsResponseDto })
  getToday(): Promise<SignalsResponseDto> {
    return this.signalsService.getSignals('24h');
  }

  @Get('week')
  @ApiOperation({ summary: 'Dream signals for the last 7 days' })
  @ApiOkResponse({ type: SignalsResponseDto })
  getWeek(): Promise<SignalsResponseDto> {
    return this.signalsService.getSignals('7d');
  }

  @Get('month')
  @ApiOperation({ summary: 'Dream signals for the last 30 days' })
  @ApiOkResponse({ type: SignalsResponseDto })
  getMonth(): Promise<SignalsResponseDto> {
    return this.signalsService.getSignals('30d');
  }
}
