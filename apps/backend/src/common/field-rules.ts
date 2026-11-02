import { BadRequestException } from '@nestjs/common';
import { checkRules, type FieldRules } from '@kilotrace/shared/rules';
import { ApiErrorCode } from './api-error';

/**
 * Refuses `values` breaking the shared rules of their row, as the forms of the
 * back office do: a 400 `INVALID_FIELD` naming the field, its message in French,
 * shown under that field. `partial` checks a patch, `row` the stored values the
 * rules hang on.
 */
export function assertRules<T>(
  rules: FieldRules<T>,
  values: Partial<T>,
  options?: { partial?: boolean; row?: Partial<T> },
) {
  const error = checkRules(rules, values, options);
  if (error)
    throw new BadRequestException({
      code: ApiErrorCode.InvalidField,
      field: error.field,
      message: error.message,
    });
}
