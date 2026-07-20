import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { cpfHash, decryptPii, encryptPii, maskCpf, normalizeCpf } from '../security/pii.js';
import type { UpdateProfileDto } from './profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService<Env, true>) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      roles: user.role.split(','),
      profileComplete: Boolean(user.profile),
      profile: user.profile ? {
        phone: user.profile.phone,
        cpf: maskCpf(decryptPii(user.profile.cpfEncrypted, this.config.get('PII_ENCRYPTION_KEY', { infer: true }))),
        postalCode: user.profile.postalCode,
        street: user.profile.street,
        number: user.profile.number,
        complement: user.profile.complement,
        district: user.profile.district,
        city: user.profile.city,
        state: user.profile.state
      } : null
    };
  }

  async update(userId: string, input: UpdateProfileDto) {
    const cpf = normalizeCpf(input.cpf);
    const cpfDigest = cpfHash(cpf, this.config.get('PII_HASH_KEY', { infer: true }));
    const existing = await this.prisma.userProfile.findUnique({ where: { cpfHash: cpfDigest } });
    if (existing && existing.userId !== userId) throw new ConflictException('Este CPF já está associado a outra conta.');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
      this.prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          phone: input.phone,
          cpfEncrypted: encryptPii(cpf, this.config.get('PII_ENCRYPTION_KEY', { infer: true })),
          cpfHash: cpfDigest,
          postalCode: input.postalCode,
          street: input.street,
          number: input.number,
          complement: input.complement,
          district: input.district,
          city: input.city,
          state: input.state
        },
        update: {
          phone: input.phone,
          cpfEncrypted: encryptPii(cpf, this.config.get('PII_ENCRYPTION_KEY', { infer: true })),
          cpfHash: cpfDigest,
          postalCode: input.postalCode,
          street: input.street,
          number: input.number,
          complement: input.complement,
          district: input.district,
          city: input.city,
          state: input.state
        }
      })
    ]);
    return this.get(userId);
  }
}
