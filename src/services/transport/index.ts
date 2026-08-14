import createClient, { type Middleware } from 'openapi-fetch';

export { resolveApiEnvelope } from './envelope';
export { mutationHeaders } from './mutation';

/** RFC 9457 Problem Details for HTTP APIs */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

/** 服务端与传输层错误的统一形态：页面与 Feature 只依赖它，不依赖底层 HTTP 客户端异常 */
export class ApiError extends Error {
  readonly problem: ProblemDetails;
  readonly requestId: string | undefined;

  constructor(problem: ProblemDetails, options?: ErrorOptions) {
    super(problem.title ?? `HTTP ${problem.status ?? 'error'}`, options);
    this.name = 'ApiError';
    this.problem = problem;
    this.requestId =
      typeof problem.requestId === 'string' ? problem.requestId : undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

/**
 * 将 Umi/Axios rejection、network 与 abort 错误纯转换为统一 ApiError。
 * 该函数不触发 401 Session 回调，认证端点可安全复用。
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isRecord(error) && isRecord(error.response)) {
    const { data, status, statusText } = error.response;
    if (typeof status === 'number') {
      const title =
        typeof statusText === 'string' && statusText.length > 0
          ? statusText
          : `HTTP ${status}`;
      const problem: ProblemDetails = isRecord(data)
        ? {
            ...data,
            ...(typeof data.status === 'number' ? {} : { status }),
          }
        : {
            status,
            title,
            ...(typeof data === 'string' && data.length > 0
              ? { detail: data }
              : {}),
          };
      return new ApiError(problem, { cause: error });
    }
  }

  const aborted = isAbort(error);
  return new ApiError(
    {
      type: aborted ? 'about:blank#aborted' : 'about:blank#network',
      title: aborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR',
      detail: error instanceof Error ? error.message : String(error),
    },
    { cause: error },
  );
}

let unauthorizedHandler: (() => void) | undefined;

export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

/** 从 openapi-fetch 成功结果中读取业务 payload；带响应体的契约不允许静默返回 undefined。 */
export function requireApiData<T>(result: { data?: T; response: Response }): T {
  if (result.data !== undefined) {
    return result.data;
  }
  throw new ApiError({
    detail: 'OpenAPI 成功响应缺少契约声明的响应体',
    status: result.response.status,
    title: 'INVALID_API_RESPONSE',
  });
}

/** 后端并发控制约定使用强 ETag："v<positive integer>"。 */
export const entityTag = (version: number): string => `"v${version}"`;

const toProblem = (text: string, response: Response): ProblemDetails => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  const problem: ProblemDetails =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ProblemDetails)
      : { title: response.statusText || 'HTTP error', detail: text };
  problem.status ??= response.status;
  return problem;
};

const normalize: Middleware = {
  async onResponse({ request, response }) {
    if (response.ok) {
      return undefined;
    }
    if (
      response.status === 401 &&
      !new URL(request.url).pathname.includes('/api/v1/auth/')
    ) {
      try {
        unauthorizedHandler?.();
      } catch {
        // 认证失效通知不得遮蔽服务端返回的 Problem Details。
      }
    }
    throw new ApiError(toProblem(await response.clone().text(), response));
  },
  onError({ error }) {
    return normalizeApiError(error);
  },
};

/**
 * 创建绑定后端 OpenAPI 类型的受控客户端。
 * Paths 来自 src/services/generated 的生成类型；HTTP 非 2xx、网络失败与请求中止
 * 一律归一为 ApiError（ProblemDetails），原始错误保留在 cause。
 */
export function createApiClient<Paths extends object>(baseUrl = '') {
  const client = createClient<Paths>({ baseUrl, credentials: 'same-origin' });
  client.use(normalize);
  return client;
}
