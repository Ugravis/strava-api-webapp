import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

/** Returns true when the error is a unique violation on the given column(s), e.g. `email` or `a, b`. */
export function isUniqueViolation(error: unknown, columns: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string; detail?: string };
  return (
    driverError.code === UNIQUE_VIOLATION &&
    (driverError.detail?.includes(`(${columns})`) ?? false)
  );
}
