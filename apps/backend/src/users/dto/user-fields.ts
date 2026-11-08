import { applyDecorators } from '@nestjs/common';
import { Equals, IsOptional, IsString, Length, Matches } from 'class-validator';
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@kilotrace/shared';
import { NormalizeIdentifier, TrimToNull } from '../../common/transformers';
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './validation.constants';

/** Reusable validation rules, shared by every DTO exposing these fields. */
export const UsernameField = (): PropertyDecorator =>
  applyDecorators(
    NormalizeIdentifier(),
    IsString(),
    Length(USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH),
    Matches(USERNAME_PATTERN, {
      message:
        'username may only contain lowercase letters, digits and underscores',
    }),
  );

/** Optional: null (or an empty string) clears the display name. */
export const OptionalDisplayNameField = (): PropertyDecorator =>
  applyDecorators(
    TrimToNull(),
    IsOptional(),
    IsString(),
    Length(DISPLAY_NAME_MIN_LENGTH, DISPLAY_NAME_MAX_LENGTH),
  );

/** Explicit consent to the terms of use, required at sign-up. */
export const AcceptTermsField = (): PropertyDecorator =>
  applyDecorators(
    Equals(true, { message: 'the terms of use must be accepted' }),
  );

export const PasswordField = (): PropertyDecorator =>
  applyDecorators(IsString(), Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH));
