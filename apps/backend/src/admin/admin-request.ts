import type { Request } from 'express';
import type { AdminSession } from './sessions/admin-session.entity';
import type { AdminUser } from './users/admin-user.entity';

export interface AdminContext {
  admin: AdminUser;
  session: AdminSession;
}

export interface AdminRequest extends Request {
  adminAuth?: AdminContext;
}
