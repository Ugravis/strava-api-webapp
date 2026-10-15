import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { StravaModule } from '../strava/strava.module';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthController } from './google/google-auth.controller';
import { GoogleAuthService } from './google/google-auth.service';
import { GoogleOAuthService } from './google/google-oauth.service';
import { OAuthAccount } from './google/oauth-account.entity';
import { OAuthAccountsService } from './google/oauth-accounts.service';
import { SessionGuard } from './guards/session.guard';
import { PasswordHasher } from './password-hasher.service';
import { SessionCookie } from './session-cookie';
import { Session } from './sessions/session.entity';
import { SessionsService } from './sessions/sessions.service';
import { UserToken } from './tokens/user-token.entity';
import { UserTokensService } from './tokens/user-tokens.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, UserToken, OAuthAccount]),
    UsersModule,
    MailModule,
    StravaModule,
  ],
  controllers: [AuthController, GoogleAuthController, AccountController],
  providers: [
    AuthService,
    SessionsService,
    UserTokensService,
    PasswordHasher,
    SessionCookie,
    GoogleOAuthService,
    GoogleAuthService,
    OAuthAccountsService,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AuthService, SessionsService, SessionCookie],
})
export class AuthModule {}
