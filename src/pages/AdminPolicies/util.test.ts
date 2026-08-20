import { describe, expect, it } from 'vitest';
import type { PolicyDraft } from '@/features/administration';
import { ApiError } from '@/services/transport';
import { getProblemStatus, mergePolicyDraftRevision } from './util';

const draft: PolicyDraft = {
  baseVersion: 1,
  content: {},
  etag: '"v2"',
  id: 'draft-1',
  namespace: 'identity',
  revision: 2,
  scope: 'PLATFORM',
  stale: false,
  status: 'DRAFT',
  updatedAt: '2026-08-18T08:00:00.000Z',
};

describe('getProblemStatus', () => {
  it('只接受 Problem 中的数值状态码', () => {
    expect(
      getProblemStatus(new ApiError({ detail: '冲突', status: 409 })),
    ).toBe(409);
    expect(getProblemStatus(new Error('普通错误'))).toBeUndefined();
    expect(getProblemStatus({ problem: null })).toBeUndefined();
    expect(getProblemStatus({ problem: { status: '409' } })).toBeUndefined();
  });
});

describe('mergePolicyDraftRevision', () => {
  it('合并同一 Draft 的新版本但拒绝错位或倒退结果', () => {
    expect(mergePolicyDraftRevision(draft, 'draft-1', '"v3"', 3)).toEqual({
      ...draft,
      etag: '"v3"',
      revision: 3,
    });
    expect(mergePolicyDraftRevision(draft, 'other', '"v3"', 3)).toBe(draft);
    expect(mergePolicyDraftRevision(draft, 'draft-1', '"v1"', 1)).toBe(draft);
    expect(
      mergePolicyDraftRevision(undefined, 'draft-1', '"v1"', 1),
    ).toBeUndefined();
  });
});
