import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './request-context.js';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<AuthenticatedRequest>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const body = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
    const statusCodes: Record<number, string> = {
      400: 'VALIDATION_ERROR', 401: 'AUTHENTICATION_REQUIRED', 403: 'FORBIDDEN', 404: 'NOT_FOUND',
      409: 'CONFLICT', 410: 'GONE', 413: 'PAYLOAD_TOO_LARGE', 422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED', 503: 'SERVICE_UNAVAILABLE'
    };
    const code = typeof body.code === 'string' ? body.code : statusCodes[status] ?? 'INTERNAL_ERROR';
    const detail = typeof body.detail === 'string'
      ? body.detail
      : Array.isArray(body.message) ? body.message.join('; ')
      : typeof body.message === 'string' ? body.message
      : status === 500 ? 'Ocorreu um erro interno.' : 'A requisição não pôde ser processada.';

    response.status(status).type('application/problem+json').json({
      type: `https://api.ingressos.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title: code.replaceAll('_', ' '),
      status,
      code,
      detail,
      instance: request.originalUrl,
      requestId: request.requestId,
      ...(body.errors ? { errors: body.errors } : {}),
      ...(body.activeCheckoutId ? { activeCheckoutId: body.activeCheckoutId } : {})
    });
  }
}
