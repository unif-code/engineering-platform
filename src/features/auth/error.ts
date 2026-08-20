import { ApiError } from '@/services/transport';

const AUTHENTICATION_TITLE_MESSAGES: Record<string, string> = {
  'Authentication challenge exhausted': '动态码验证次数过多，请重新登录',
  'Authentication temporarily unavailable': '登录尝试过于频繁，请稍后重试',
};

const withRequestId = (message: string, requestId: string | undefined) => {
  const normalizedRequestId = requestId?.trim();
  return normalizedRequestId
    ? `${message}（请求编号：${normalizedRequestId}）`
    : message;
};

export function getAuthErrorMessage(
  error: unknown,
  fallback: string,
  titleMessages: Record<string, string> = {},
): string {
  if (error instanceof ApiError) {
    const title = error.problem.title;
    const detail = error.problem.detail?.trim();
    const message =
      (title === undefined ? undefined : titleMessages[title]) ??
      (detail || undefined) ??
      (title === undefined
        ? undefined
        : AUTHENTICATION_TITLE_MESSAGES[title]) ??
      fallback;
    return withRequestId(message, error.requestId);
  }

  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}
