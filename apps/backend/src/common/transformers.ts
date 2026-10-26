import { Transform } from 'class-transformer';

/** Trims and lowercases string inputs (emails, usernames). */
export const NormalizeIdentifier = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** Trims strings and turns an empty one into null, to clear an optional field. */
export const TrimToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );

export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
