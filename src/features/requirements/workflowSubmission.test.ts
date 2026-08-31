import { describe, expect, it, vi } from 'vitest';
import {
  prepareSddWorkflowSubmission,
  prepareWorkflowSubmission,
  recordSddArtifactCreated,
} from './workflowSubmission';

describe('Requirement V0.4 stable workflow submissions', () => {
  it('复用规范化后相同 payload 的 key，payload 改变后换 key', () => {
    const createKey = vi
      .fn()
      .mockReturnValueOnce('command-key-0001')
      .mockReturnValueOnce('command-key-0002');
    const first = prepareWorkflowSubmission(
      { reason: '  负责前端实现  ', reviewerId: ' account-2 ' },
      undefined,
      createKey,
    );
    const replay = prepareWorkflowSubmission(
      { reviewerId: 'account-2', reason: '负责前端实现' },
      first.identity,
      createKey,
    );
    const changed = prepareWorkflowSubmission(
      { reason: '改为后端审核', reviewerId: 'account-2' },
      replay.identity,
      createKey,
    );

    expect(first.input).toEqual({
      reason: '负责前端实现',
      reviewerId: 'account-2',
    });
    expect(replay.identity).toEqual(first.identity);
    expect(changed.identity.idempotencyKey).toBe('command-key-0002');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('递归规范化数组中的字符串并保留非字符串值', () => {
    const prepared = prepareWorkflowSubmission(
      { reviewers: [' account-1 ', 'account-2'], revisions: [1, 2] },
      undefined,
      () => 'array-command-key',
    );

    expect(prepared.input).toEqual({
      reviewers: ['account-1', 'account-2'],
      revisions: [1, 2],
    });
  });

  it('SDD 保留正文原文并为两阶段预留独立稳定 key', () => {
    const createKey = vi
      .fn()
      .mockReturnValueOnce('artifact-key-0001')
      .mockReturnValueOnce('baseline-key-0001');
    const submission = prepareSddWorkflowSubmission(
      { artifactId: null, content: '# SDD\n\n正文\n' },
      undefined,
      createKey,
    );

    expect(submission.input.content).toBe('# SDD\n\n正文\n');
    expect(submission.artifactIdempotencyKey).toBe('artifact-key-0001');
    expect(submission.baselineIdempotencyKey).toBe('baseline-key-0001');
  });

  it('Artifact 成功而 Baseline 未知时只重放第二阶段', () => {
    const createKey = vi
      .fn()
      .mockReturnValueOnce('artifact-key-0001')
      .mockReturnValueOnce('baseline-key-0001')
      .mockReturnValueOnce('artifact-key-0002')
      .mockReturnValueOnce('baseline-key-0002');
    const first = prepareSddWorkflowSubmission(
      { artifactId: null, content: '# SDD\n\n正文' },
      undefined,
      createKey,
    );
    const afterArtifact = recordSddArtifactCreated(first, {
      artifactId: '50000000-0000-0000-0000-000000000005',
      artifactVersion: 1,
      requirementRevision: 8,
    });
    const replay = prepareSddWorkflowSubmission(
      { artifactId: null, content: '# SDD\n\n正文' },
      afterArtifact,
      createKey,
    );

    expect(replay).toBe(afterArtifact);
    expect(replay.createdArtifact).toEqual({
      artifactId: '50000000-0000-0000-0000-000000000005',
      artifactVersion: 1,
      requirementRevision: 8,
    });
    expect(replay.baselineIdempotencyKey).toBe('baseline-key-0001');
    expect(createKey).toHaveBeenCalledTimes(2);

    const changed = prepareSddWorkflowSubmission(
      { artifactId: null, content: '# SDD\n\n修改后的正文' },
      replay,
      createKey,
    );
    expect(changed.createdArtifact).toBeUndefined();
    expect(changed.artifactIdempotencyKey).toBe('artifact-key-0002');
    expect(changed.baselineIdempotencyKey).toBe('baseline-key-0002');
  });
});
