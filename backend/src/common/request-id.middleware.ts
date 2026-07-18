import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './request-context.js';

export function requestIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  req.requestId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
