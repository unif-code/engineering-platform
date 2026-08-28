import { describe, expect, it } from 'vitest';
import { mutationHeaders } from './index';

describe('mutationHeaders', () => {
  it('每次生成新的 Idempotency-Key', () => {
    const a = mutationHeaders()['Idempotency-Key'];
    const b = mutationHeaders()['Idempotency-Key'];

    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it('携带 If-Match', () => {
    expect(mutationHeaders({ etag: '"3"' })['If-Match']).toBe('"3"');
  });

  it('调用方可复用预先生成的稳定 Idempotency-Key', () => {
    expect(
      mutationHeaders({ idempotencyKey: 'requirement-submit-0001' }),
    ).toEqual({
      'Idempotency-Key': 'requirement-submit-0001',
    });
  });

  it('显式 Idempotency-Key 可与 If-Match 同时使用', () => {
    expect(
      mutationHeaders({
        etag: '"v7"',
        idempotencyKey: 'requirement-submit-0002',
      }),
    ).toEqual({
      'Idempotency-Key': 'requirement-submit-0002',
      'If-Match': '"v7"',
    });
  });
});
