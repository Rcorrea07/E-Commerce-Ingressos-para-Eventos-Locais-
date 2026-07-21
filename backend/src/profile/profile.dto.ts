import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isValidCpf } from '../security/pii.js';

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().regex(/^\+?\d{10,13}$/),
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  postalCode: z.string().regex(/^\d{8}$/),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(100).optional(),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase())
});

export class UpdateProfileDto extends createZodDto(profileSchema) {}

const profileResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  roles: z.array(z.string()),
  profileComplete: z.boolean(),
  profile: z.object({
    phone: z.string(),
    cpf: z.string(),
    postalCode: z.string(),
    street: z.string(),
    number: z.string(),
    complement: z.string().nullable(),
    district: z.string(),
    city: z.string(),
    state: z.string()
  }).nullable()
});

export class ProfileResponseDto extends createZodDto(profileResponseSchema) {}
