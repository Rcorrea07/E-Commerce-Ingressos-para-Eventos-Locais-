import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ROLES } from '../common/roles.decorator.js';
import { hasRole, type AuthenticatedRequest } from '../common/request-context.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.session?.user || !roles.some((role) => hasRole(request.session!.user, role))) {
      throw new ForbiddenException('Você não possui permissão para executar esta ação.');
    }
    return true;
  }
}
