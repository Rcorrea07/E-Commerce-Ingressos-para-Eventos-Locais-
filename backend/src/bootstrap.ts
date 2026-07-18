import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  const auth = app.get(AuthService).auth;
  const authHandler = toNodeHandler(auth);
  app.use(requestIdMiddleware);
  app.use(authRateLimit);
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => req.originalUrl.startsWith('/api/auth/') ? authHandler(req, res) : next());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true, allowedHeaders: ['content-type', 'authorization', 'idempotency-key', 'x-request-id'] });
  app.enableShutdownHooks();

  const document = createOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    explorer: true,
    swaggerOptions: {
      withCredentials: true,
      urls: [
        { url: '/docs-json', name: 'Application API' },
        { url: '/api/auth/open-api/generate-schema', name: 'Authentication API' }
      ]
    }
  });
  return app;
}

const authAttempts = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const policy = req.originalUrl.includes('/api/auth/sign-in/')
    ? { limit: 10, ttl: 60_000 }
    : req.originalUrl.includes('/api/auth/sign-up/') || req.originalUrl.includes('/api/auth/forget-password')
      ? { limit: 5, ttl: 60_000 }
      : undefined;
  if (!policy) return next();
  const now = Date.now();
  const key = `${req.ip ?? req.socket.remoteAddress}:${req.path}`;
  const current = authAttempts.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + policy.ttl } : current;
  bucket.count += 1;
  authAttempts.set(key, bucket);
  if (authAttempts.size > 10_000) {
    for (const [candidate, value] of authAttempts) if (value.resetAt <= now) authAttempts.delete(candidate);
  }
  res.setHeader('RateLimit-Limit', policy.limit);
  res.setHeader('RateLimit-Remaining', Math.max(0, policy.limit - bucket.count));
  if (bucket.count <= policy.limit) return next();
  res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
  return res.status(429).type('application/problem+json').json({
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    title: 'Muitas tentativas',
    detail: 'Aguarde antes de tentar novamente.',
    requestId: res.getHeader('x-request-id')
  });
}

export function createOpenApiDocument(app: Parameters<typeof SwaggerModule.createDocument>[0]): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Ingressos Locais API')
    .setDescription('API transacional de eventos, reservas, pedidos e validação de ingressos.')
    .setVersion('1.0.0')
    .addCookieAuth('better-auth.session_token')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'Idempotency-Key' }, 'idempotency-key')
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
