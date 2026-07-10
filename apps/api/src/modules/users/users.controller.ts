import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

class UploadAvatarDto {
  @IsString()
  @IsNotEmpty()
  base64: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own full profile' })
  @ApiOkResponse()
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyProfile(user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile' })
  @ApiOkResponse()
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload avatar as base64-encoded JSON body' })
  @ApiOkResponse()
  async uploadAvatar(@CurrentUser() user: JwtPayload, @Body() dto: UploadAvatarDto) {
    return this.usersService.uploadAvatar(user.sub, dto);
  }

  @Get('avatars/:filename')
  @Public()
  @ApiOperation({ summary: 'Serve uploaded avatar image' })
  async getAvatar(@Param('filename') filename: string, @Res() res: FastifyReply) {
    const { buffer, mimeType } = await this.usersService.serveAvatar(filename);
    return res.header('Content-Type', mimeType).send(buffer);
  }
}
