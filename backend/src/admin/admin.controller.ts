import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/roles.decorator.js';
import { PrismaService } from '../database/prisma.service.js';

@Roles('admin')
@ApiTags('Admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}
  @ApiOperation({ summary: 'Listar usuários da plataforma' })
  @Get('users')
  async users(@Query('page') rawPage = '1', @Query('pageSize') rawPageSize = '20') {
    const page = Math.max(1, Number(rawPage) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(rawPageSize) || 20));
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({ select: { id: true, name: true, email: true, emailVerified: true, role: true, banned: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
    ]);
    return { data: users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }
}
