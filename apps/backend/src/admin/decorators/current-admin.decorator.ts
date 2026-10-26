import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminRequest } from '../admin-request';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (!request.adminAuth) {
      throw new Error('Admin context is missing: is the route an admin one?');
    }
    return request.adminAuth.admin;
  },
);
