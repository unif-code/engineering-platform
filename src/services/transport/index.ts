import createClient, { type Middleware } from 'openapi-fetch';

export { resolveApiEnvelope } from './envelope';

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

  constructor(problem: ProblemDetails, options?: ErrorOptions) {
    super(problem.title ?? `HTTP ${problem.status ?? 'error'}`, options);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

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

const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const normalize: Middleware = {
  async onResponse({ response }) {
    if (response.ok) {
      return undefined;
    }
    throw new ApiError(toProblem(await response.clone().text(), response));
  },
  onError({ error }) {
    if (error instanceof ApiError) {
      return error;
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
  },
};

/**
 * 创建绑定后端 OpenAPI 类型的受控客户端。
 * Paths 来自 src/services/generated 的生成类型；HTTP 非 2xx、网络失败与请求中止
 * 一律归一为 ApiError（ProblemDetails），原始错误保留在 cause。
 */
export function createApiClient<Paths extends object>(baseUrl = '/api') {
  const client = createClient<Paths>({ baseUrl, credentials: 'same-origin' });
  client.use(normalize);
  return client;
}
