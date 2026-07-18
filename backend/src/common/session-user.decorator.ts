import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, SessionUser } from './request-context.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.session?.user) throw new Error('Session guard did not attach a user');
    return request.session.user;
  }
);
