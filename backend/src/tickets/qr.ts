import { createHmac, timingSafeEqual } from 'node:crypto';

export function createQrPayload(publicId: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(publicId).digest('base64url');
  return `${publicId}.${signature}`;
}

export function verifyQrPayload(payload: string, secret: string): string | null {
  const separator = payload.lastIndexOf('.');
  if (separator < 1) return null;
  const publicId = payload.slice(0, separator);
  const provided = Buffer.from(payload.slice(separator + 1));
  const expected = Buffer.from(createHmac('sha256', secret).update(publicId).digest('base64url'));
  return provided.length === expected.length && timingSafeEqual(provided, expected) ? publicId : null;
}
