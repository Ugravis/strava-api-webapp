import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audited';

export interface AuditedOptions {
  /** Dotted name of the action, e.g. `admin-users.update-role`. */
  action: string;
  /** Entity acted upon, its id read from a route parameter. */
  target?: { type: string; param: string };
  /** Destructive action: the body must carry a `reason`. */
  requireReason?: boolean;
}

/**
 * Records every call of a back-office route in the audit log. Required on
 * the routes that change state: the guard refuses them otherwise.
 */
export const Audited = (options: AuditedOptions): MethodDecorator =>
  SetMetadata(AUDITED_KEY, options);
