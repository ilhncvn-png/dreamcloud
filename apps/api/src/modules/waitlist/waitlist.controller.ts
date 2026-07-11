import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { WaitlistService } from './waitlist.service';

class JoinWaitlistDto {
  @IsEmail()
  email: string;
}

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join early access waitlist' })
  async join(@Body() dto: JoinWaitlistDto) {
    await this.svc.join(dto.email);
    return { data: { message: 'Successfully joined the early access list.' } };
  }
}
