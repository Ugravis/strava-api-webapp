import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AccountSuspendedException,
  type SuspensionNotice,
  suspensionCookie,
  writeSuspensionNotice,
} from './account-suspension';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import authConfig, { type AuthConfig } from '../config/auth.config';
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
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
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
    this.assertEmailSignIn();
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
    this.assertEmailSignIn();
    try {
      const { user, session } = await this.auth.login(
        dto,
        requestMetadata(request),
      );
      this.sessionCookie.write(response, session);
      return toUserResponse(user);
    } catch (error) {
      if (error instanceof AccountSuspendedException) {
        writeSuspensionNotice(response, error, this.config.secureCookies);
      }
      throw error;
    }
  }

  /** Why the latest sign-in was refused, while its short-lived cookie lasts. */
  @Public()
  @Get('suspension')
  suspension(@Req() request: Request): SuspensionNotice {
    const notice = suspensionCookie.read(request);
    if (!notice) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No suspension notice');
    }
    return notice;
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
    this.assertEmailSignIn();
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @SensitiveThrottle()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    this.assertEmailSignIn();
    return this.auth.resetPassword(dto.token, dto.password);
  }

  /** Email and password accounts can be turned off while their flows are unfinished. */
  private assertEmailSignIn(): void {
    if (!this.config.emailSignInEnabled) {
      throw ApiErrors.forbidden(
        ApiErrorCode.EmailSignInDisabled,
        'Email sign-in is disabled',
      );
    }
  }
}
