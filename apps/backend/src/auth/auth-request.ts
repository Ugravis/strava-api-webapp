import type { Request } from 'express';
import type { User } from '../users/user.entity';
import type { Session } from './sessions/session.entity';

export interface AuthContext {
  user: User;
  session: Session;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}
