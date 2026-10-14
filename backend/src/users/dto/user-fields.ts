import { applyDecorators } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';
import { NormalizeIdentifier, Trim } from '../../common/transformers';
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../username.util';
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

export const DisplayNameField = (): PropertyDecorator =>
  applyDecorators(
    Trim(),
    IsString(),
    Length(DISPLAY_NAME_MIN_LENGTH, DISPLAY_NAME_MAX_LENGTH),
  );

export const PasswordField = (): PropertyDecorator =>
  applyDecorators(IsString(), Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH));
