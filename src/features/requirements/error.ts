const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function formatRequirementError(
  error: unknown,
  fallback: string,
): string {
  if (!isRecord(error)) {
    return fallback;
  }
  const problem = isRecord(error.problem) ? error.problem : undefined;
  const detail =
    problem && typeof problem.detail === 'string'
      ? problem.detail.trim()
      : undefined;
  const message =
    detail ||
    (typeof error.message === 'string' ? error.message.trim() : undefined) ||
    fallback;
  const requestId =
    typeof error.requestId === 'string' ? error.requestId.trim() : undefined;
  return requestId ? `${message}（requestId: ${requestId}）` : message;
}
