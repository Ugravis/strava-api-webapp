import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChangePasswordDto } from '../users/dto/change-password.dto';
import { DeleteAccountDto } from '../users/dto/delete-account.dto';
import type { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import {
  CurrentSession,
  CurrentUser,
} from './decorators/current-user.decorator';
import { SessionCookie } from './session-cookie';
import type { Session } from './sessions/session.entity';
import { SensitiveThrottle } from './throttle';

/** Account operations requiring credential checks. */
@Controller('users/me')
export class AccountController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessionCookie: SessionCookie,
  ) {}

  @SensitiveThrottle()
  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: User,
    @CurrentSession() session: Session,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(user, session.id, dto);
  }

  @SensitiveThrottle()
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: User,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.deleteAccount(user, dto);
    this.sessionCookie.clear(response);
  }
}
