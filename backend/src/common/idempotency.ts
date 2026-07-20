import { ProblemException } from './problem.exception.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertIdempotencyKey(key: string | undefined): asserts key is string {
  if (!key) throw new ProblemException('IDEMPOTENCY_KEY_REQUIRED', 'O header Idempotency-Key é obrigatório.', 422);
  if (!UUID.test(key)) throw new ProblemException('IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key deve ser um UUID.', 422);
}
