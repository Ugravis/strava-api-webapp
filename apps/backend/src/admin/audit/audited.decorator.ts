import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'adminAudited';

export interface AuditedOptions {
  /** Dotted name of the action, e.g. `roles.grant`. */
  action: string;
  /** Entity acted upon, its id read from a route parameter. */
  target?: { type: string; param: string };
  /**
   * Destructive action: the body must carry a `reason`, typed in the
   * confirmation of the back office.
   */
  destructive?: boolean;
  /**
   * Route parameters, then body properties, copied into the entry, e.g. the
   * fields of a moderation.
   */
  details?: readonly string[];
  /** Recorded already masked, shown to the super-admins only. */
  hidden?: boolean;
}

/**
 * Records every call of a back-office route in the audit log. Required on
 * the routes that change state: the roles guard refuses them otherwise.
 */
export const Audited = (options: AuditedOptions): MethodDecorator =>
  SetMetadata(AUDITED_KEY, options);
