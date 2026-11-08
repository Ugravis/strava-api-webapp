import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from '../auth-request';

function authContext(context: ExecutionContext): AuthContext {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.auth) {
    throw new Error('Auth context is missing: is the route marked as public?');
  }
  return request.auth;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => authContext(context).user,
);

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => authContext(context).session,
);
