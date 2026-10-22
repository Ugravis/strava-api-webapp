import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Machine-readable error codes: the frontend maps them to localized messages.
 */
export enum ApiErrorCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  EmailTaken = 'EMAIL_TAKEN',
  UsernameTaken = 'USERNAME_TAKEN',
  UsernameReserved = 'USERNAME_RESERVED',
  InvalidToken = 'INVALID_TOKEN',
  InvalidPassword = 'INVALID_PASSWORD',
  ConfirmationMismatch = 'CONFIRMATION_MISMATCH',
  InvalidImage = 'INVALID_IMAGE',
  OAuthSignupExpired = 'OAUTH_SIGNUP_EXPIRED',
  ProviderDisabled = 'PROVIDER_DISABLED',
  ProviderNotConnected = 'PROVIDER_NOT_CONNECTED',
  ProviderRateLimited = 'PROVIDER_RATE_LIMITED',
  Unauthenticated = 'UNAUTHENTICATED',
  CrossOriginRejected = 'CROSS_ORIGIN_REJECTED',
  NotFound = 'NOT_FOUND',
  CannotFollowSelf = 'CANNOT_FOLLOW_SELF',
  AlreadyFollowing = 'ALREADY_FOLLOWING',
  NotFollowing = 'NOT_FOLLOWING',
  PrivateProfile = 'PRIVATE_PROFILE',
  NoFollowRequest = 'NO_FOLLOW_REQUEST',
}

const body = (code: ApiErrorCode, message: string) => ({ code, message });

export const ApiErrors = {
  badRequest: (code: ApiErrorCode, message: string) =>
    new BadRequestException(body(code, message)),
  unauthorized: (code: ApiErrorCode, message: string) =>
    new UnauthorizedException(body(code, message)),
  forbidden: (code: ApiErrorCode, message: string) =>
    new ForbiddenException(body(code, message)),
  conflict: (code: ApiErrorCode, message: string) =>
    new ConflictException(body(code, message)),
  notFound: (code: ApiErrorCode, message: string) =>
    new NotFoundException(body(code, message)),
  tooManyRequests: (code: ApiErrorCode, message: string) =>
    new HttpException(body(code, message), HttpStatus.TOO_MANY_REQUESTS),
};
