import { writeLocaleCookie } from './locale-cookie';
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
import type { VerificationChallenge } from '@kilotrace/shared';
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
import { ChallengeDto, VerifyCodeDto } from './dto/verification.dto';
import { AppSettingsService } from '../system/app-settings.service';
import { GoogleOAuthService } from './google/google-oauth.service';
import { TranslationService } from '../translation/translation.service';
import { requestLocale, requestMetadata } from './request-metadata';
import { SessionCookie } from './session-cookie';
import { SensitiveThrottle } from './throttle';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly auth: AuthService,
    private readonly sessionCookie: SessionCookie,
    private readonly google: GoogleOAuthService,
    private readonly settings: AppSettingsService,
    private readonly translation: TranslationService,
  ) {}

  /** Sign-in methods available, so the frontend only shows working buttons. */
  @Public()
  @Get('providers')
  providers(): { google: boolean } {
    return { google: this.google.isEnabled };
  }

  /** Sends the code that creates the account: the same answer whether the address is taken or not. */
  @Public()
  @SensitiveThrottle()
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<VerificationChallenge> {
    await this.assertEmailSignIn();
    return this.auth.register(dto, requestLocale(request));
  }

  @Public()
  @SensitiveThrottle()
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  async verifySignup(
    @Body() dto: VerifyCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    await this.assertEmailSignIn();
    const { user, session } = await this.auth.verifySignup(
      dto,
      requestMetadata(request),
    );
    this.sessionCookie.write(response, session);
    writeLocaleCookie(response, user.locale, this.config.secureCookies);
    return toUserResponse(user);
  }

  /** Another code for a sign-up or a password reset, at most every 30 seconds. */
  @Public()
  @SensitiveThrottle()
  @Post('verification/resend')
  @HttpCode(HttpStatus.OK)
  async resendCode(@Body() dto: ChallengeDto): Promise<VerificationChallenge> {
    await this.assertEmailSignIn();
    return this.auth.resendCode(dto.challengeId);
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
    await this.assertEmailSignIn();
    try {
      const { user, session } = await this.auth.login(
        dto,
        requestMetadata(request),
      );
      this.sessionCookie.write(response, session);
      writeLocaleCookie(response, user.locale, this.config.secureCookies);
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
  async suspension(@Req() request: Request): Promise<SuspensionNotice> {
    const notice = suspensionCookie.read(request);
    if (!notice) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No suspension notice');
    }
    if (!notice.reason) return notice;
    // In the language of the page, the team writing in the one of the back office.
    const locale = requestLocale(request);
    const [translation] =
      (await this.translation.translate([notice.reason], locale)) ?? [];
    return translation && translation.detectedSource !== locale
      ? { ...notice, reason: translation.text, originalReason: notice.reason }
      : notice;
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
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<VerificationChallenge> {
    await this.assertEmailSignIn();
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @SensitiveThrottle()
  @Post('password/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordReset(
    @Body() dto: VerifyCodeDto,
  ): Promise<{ token: string }> {
    await this.assertEmailSignIn();
    return this.auth.verifyPasswordReset(dto);
  }

  @Public()
  @SensitiveThrottle()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.assertEmailSignIn();
    return this.auth.resetPassword(dto.token, dto.password);
  }

  /** Email and password accounts of the public site, turned off from the back office. */
  private async assertEmailSignIn(): Promise<void> {
    if (!(await this.settings.get('emailSignInEnabled'))) {
      throw ApiErrors.forbidden(
        ApiErrorCode.EmailSignInDisabled,
        'Email sign-in is disabled',
      );
    }
  }
}
