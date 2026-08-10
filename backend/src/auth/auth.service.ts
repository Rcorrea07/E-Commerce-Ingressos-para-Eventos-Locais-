import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI } from 'better-auth/plugins';
import nodemailer from 'nodemailer';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuthService {
  readonly auth;

  constructor(prisma: PrismaService, config: ConfigService<Env, true>) {
    const frontendUrl = config.get('FRONTEND_URL', { infer: true });
    const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
    const transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      ...(config.get('SMTP_USER', { infer: true }) && config.get('SMTP_PASSWORD', { infer: true }) ? {
        auth: {
          user: config.get('SMTP_USER', { infer: true }),
          pass: config.get('SMTP_PASSWORD', { infer: true })
        }
      } : {})
    });
    const from = config.get('SMTP_FROM', { infer: true });

    this.auth = betterAuth({
      appName: 'Ingressos Locais',
      baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
      basePath: '/api/auth',
      secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
      trustedOrigins: [frontendUrl],
      database: prismaAdapter(prisma, { provider: 'mysql' }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
          await transporter.sendMail({ from, to: user.email, subject: 'Recuperação de senha', text: `Redefina sua senha: ${url}` });
        }
      },
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          const target = new URL(url);
          target.searchParams.set('callbackURL', `${frontendUrl}/conta/verificada`);
          await transporter.sendMail({ from, to: user.email, subject: 'Confirme seu e-mail', text: `Confirme seu e-mail: ${target}` });
        }
      },
      advanced: {
        database: { generateId: 'uuid' },
        useSecureCookies: isProduction,
        ...(isProduction ? {
          defaultCookieAttributes: {
            httpOnly: true,
            secure: true,
            sameSite: 'none' as const,
            partitioned: true
          }
        } : {})
      },
      plugins: [
        admin({ defaultRole: 'customer', adminRoles: ['admin'] }),
        openAPI({ disableDefaultReference: false })
      ]
    });
  }
}
