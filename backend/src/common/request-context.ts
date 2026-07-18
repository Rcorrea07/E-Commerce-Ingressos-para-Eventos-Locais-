import type { Request } from 'express';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: string | null;
}

export interface AuthenticatedRequest extends Request {
  requestId: string;
  session?: { user: SessionUser; session: Record<string, unknown> };
}

export function hasRole(user: SessionUser, role: string): boolean {
  return (user.role ?? 'customer').split(',').map((value) => value.trim()).includes(role);
}

export function addRole(current: string | null | undefined, role: string): string {
  return [...new Set([...(current ?? 'customer').split(',').map((v) => v.trim()), role])]
    .filter(Boolean)
    .join(',');
}
