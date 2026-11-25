import { applyDecorators } from '@nestjs/common';
import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import {
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  passwordLength,
} from '@kilotrace/shared';
import { NormalizeIdentifier, TrimToNull } from '../../common/transformers';

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

/** A new password: its length in characters, the blocklist being checked by the service. */
export const PasswordField = (): PropertyDecorator =>
  applyDecorators(
    IsString(),
    ValidateBy({
      name: 'passwordLength',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          passwordLength(value) >= PASSWORD_MIN_LENGTH &&
          passwordLength(value) <= PASSWORD_MAX_LENGTH,
        defaultMessage: () =>
          `password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters long`,
      },
    }),
  );

/** A password typed to sign in or confirm: only its upper bound, so an old one still works. */
export const CurrentPasswordField = (): PropertyDecorator =>
  applyDecorators(IsString(), MaxLength(PASSWORD_MAX_LENGTH));

/** Trimmed and lowercased, see `normalizeEmail`. */
export const EmailField = (): PropertyDecorator =>
  applyDecorators(
    NormalizeIdentifier(),
    IsEmail(),
    MaxLength(EMAIL_MAX_LENGTH),
  );
