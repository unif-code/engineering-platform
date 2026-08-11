export function formatGovernanceError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.name !== 'ApiError') {
    return error.message;
  }
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const problem =
    'problem' in error &&
    typeof error.problem === 'object' &&
    error.problem !== null
      ? error.problem
      : undefined;
  const detail =
    problem && 'detail' in problem && typeof problem.detail === 'string'
      ? problem.detail
      : error instanceof Error
        ? error.message
        : fallback;
  return 'requestId' in error && typeof error.requestId === 'string'
    ? `${detail}（requestId: ${error.requestId}）`
    : detail;
}
