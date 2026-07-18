import { describe, expect, it } from 'vitest';
import { decryptPii, encryptPii, isValidCpf, maskCpf, normalizeCpf } from './pii.js';

describe('PII helpers', () => {
  it('validates and normalizes CPF', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(maskCpf('52998224725')).toBe('***.***.***-25');
  });

  it('encrypts and decrypts values', () => {
    const key = 'a'.repeat(64);
    const encrypted = encryptPii('52998224725', key);
    expect(encrypted).not.toContain('52998224725');
    expect(decryptPii(encrypted, key)).toBe('52998224725');
  });
});
