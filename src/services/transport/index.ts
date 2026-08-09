import createClient, { type Middleware } from 'openapi-fetch';

/** RFC 9457 Problem Details for HTTP APIs */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

/** 服务端错误的统一形态：页面与 Feature 只依赖它，不依赖底层 HTTP 客户端异常 */
export class ApiError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.title ?? `HTTP ${problem.status ?? 'error'}`);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

const normalizeError: Middleware = {
  async onResponse({ response }) {
    if (response.ok) {
      return undefined;
    }
    const text = await response.clone().text();
    let problem: ProblemDetails;
    try {
      problem = JSON.parse(text) as ProblemDetails;
    } catch {
      problem = { title: response.statusText, detail: text };
    }
    problem.status ??= response.status;
    throw new ApiError(problem);
  },
};

/**
 * 创建绑定后端 OpenAPI 类型的受控客户端。
 * Paths 来自 src/services/generated 的生成类型；错误一律归一为 ApiError（ProblemDetails）。
 */
export function createApiClient<Paths extends object>(baseUrl = '/api') {
  const client = createClient<Paths>({ baseUrl, credentials: 'same-origin' });
  client.use(normalizeError);
  return client;
}
