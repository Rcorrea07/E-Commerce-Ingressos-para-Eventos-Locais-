import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';
import { SessionGuard } from './session.guard.js';

@Global()
@Module({ providers: [AuthService, SessionGuard, RolesGuard], exports: [AuthService, SessionGuard, RolesGuard] })
export class AuthModule {}
