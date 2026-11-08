import type { Request } from 'express';
import type { SessionMetadata } from './sessions/sessions.service';

export function requestMetadata(request: Request): SessionMetadata {
  return {
    userAgent: request.get('user-agent') ?? undefined,
    ipAddress: request.ip ?? undefined,
  };
}
