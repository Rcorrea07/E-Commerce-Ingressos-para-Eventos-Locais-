import { describe, expect, it } from 'vitest';
import { createQrPayload, verifyQrPayload } from './qr.js';

describe('QR signatures', () => {
  it('round-trips a signed ticket id', () => {
    const payload = createQrPayload('TKT-example', 'a-secret-long-enough');
    expect(verifyQrPayload(payload, 'a-secret-long-enough')).toBe('TKT-example');
    expect(verifyQrPayload(`${payload}x`, 'a-secret-long-enough')).toBeNull();
  });
});
