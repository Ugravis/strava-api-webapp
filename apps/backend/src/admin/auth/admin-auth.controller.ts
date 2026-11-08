import type {
  AdminAuthProviders,
  AdminGoogleAuthorization,
  AdminSessionResponse,
} from '@kilotrace/shared/admin';
import { Body, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LoginDto } from '../../auth/dto/login.dto';
import { requestMetadata } from '../../auth/request-metadata';
import { AdminSignInController } from '../access/admin-controller.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminGoogleCallbackDto } from './admin-google-callback.dto';

/**
 * Sign-in of the back office, called by the admin app only (secret checked
 * by the access middleware): it keeps the browser apart and sets the cookie
 * on its own host. The client IP and user agent are the ones it forwards.
 */
@AdminSignInController()
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Get('providers')
  providers(): AdminAuthProviders {
    return this.adminAuth.providers();
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  startGoogle(): Promise<AdminGoogleAuthorization> {
    return this.adminAuth.startGoogle();
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  completeGoogle(
    @Body() dto: AdminGoogleCallbackDto,
    @Req() request: Request,
  ): Promise<AdminSessionResponse> {
    return this.adminAuth.completeGoogle(dto, requestMetadata(request));
  }

  /** Follows the email sign-in of the public site: off in production for now. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<AdminSessionResponse> {
    return this.adminAuth.login(
      dto.email,
      dto.password,
      dto.rememberMe ?? false,
      requestMetadata(request),
    );
  }
}
