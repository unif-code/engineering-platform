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
});
