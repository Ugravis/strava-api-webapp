import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toUserResponse, type UserResponse } from '../users/dto/user-response';
import type { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/token.dto';
import { GoogleOAuthService } from './google/google-oauth.service';
import { requestMetadata } from './request-metadata';
import { SessionCookie } from './session-cookie';
import { SensitiveThrottle } from './throttle';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessionCookie: SessionCookie,
    private readonly google: GoogleOAuthService,
  ) {}

  /** Sign-in methods available, so the frontend only shows working buttons. */
  @Public()
  @Get('providers')
  providers(): { google: boolean } {
    return { google: this.google.isEnabled };
  }

  @Public()
  @SensitiveThrottle()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const { user, session } = await this.auth.register(
      dto,
      requestMetadata(request),
    );
    this.sessionCookie.write(response, session);
    return toUserResponse(user);
  }

  @Public()
  @SensitiveThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const { user, session } = await this.auth.login(
      dto,
      requestMetadata(request),
    );
    this.sessionCookie.write(response, session);
    return toUserResponse(user);
  }

  /** Public so that a stale cookie can always be cleared. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = this.sessionCookie.read(request);
    if (token) {
      await this.auth.logout(token);
    }
    this.sessionCookie.clear(response);
  }

  @Get('me')
  me(@CurrentUser() user: User): UserResponse {
    return toUserResponse(user);
  }

  @Public()
  @SensitiveThrottle()
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @SensitiveThrottle()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}
