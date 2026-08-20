import type { PolicyDraft } from '@/features/administration';

export function getProblemStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('problem' in error)) {
    return undefined;
  }
  const { problem } = error;
  return typeof problem === 'object' &&
    problem !== null &&
    'status' in problem &&
    typeof problem.status === 'number'
    ? problem.status
    : undefined;
}

export function mergePolicyDraftRevision(
  current: PolicyDraft | undefined,
  draftId: string,
  etag: string,
  revision: number,
): PolicyDraft | undefined {
  if (current?.id !== draftId || revision < current.revision) {
    return current;
  }
  return { ...current, etag, revision };
}
