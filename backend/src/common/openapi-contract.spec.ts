import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('OpenAPI application contract', () => {
  const document = JSON.parse(readFileSync(resolve('../docs/openapi.json'), 'utf8')) as any;
  const operations = Object.entries(document.paths).flatMap(([path, pathItem]: [string, any]) =>
    Object.entries(pathItem)
      .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .map(([method, operation]: [string, any]) => ({ path, method, operation }))
  );

  it('documents summary and a typed success response for every operation', () => {
    expect(operations.length).toBeGreaterThanOrEqual(49);
    for (const { path, method, operation } of operations) {
      expect(operation.summary, `${method.toUpperCase()} ${path}`).toBeTruthy();
      const success = Object.entries(operation.responses).find(([status]) => status.startsWith('2'))?.[1] as any;
      expect(success?.content?.['application/json']?.schema, `${method.toUpperCase()} ${path}`).toBeTruthy();
    }
  });

  it('marks every protected operation with cookie authentication', () => {
    for (const { path, method, operation } of operations) {
      const publicOperation = path.startsWith('/health') || path.startsWith('/api/v1/events') || (path === '/api/v1/categories' && method === 'get');
      expect(Boolean(operation.security), `${method.toUpperCase()} ${path}`).toBe(!publicOperation);
    }
  });

  it('does not publish sensitive persistence fields', () => {
    const schemas = JSON.stringify(document.components.schemas);
    for (const field of ['tokenHash', 'dedupKey', 'customerSnapshot', 'cpfEncrypted', 'cpfHash']) expect(schemas).not.toContain(field);
  });
});
