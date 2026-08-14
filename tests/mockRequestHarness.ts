export interface MockRequest {
  body?: unknown;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface MockResponse {
  body?: unknown;
  ended: boolean;
  headers: Headers;
  statusCode: number;
  end: () => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  status: (statusCode: number) => MockResponse;
}

export type MockRouteHandler = (
  request: MockRequest,
  response: MockResponse,
) => Promise<void> | void;

export type MockRoutes = Record<string, unknown>;

interface MockRouteMatch {
  key: string;
  params: Record<string, string>;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function routeFor(
  routes: MockRoutes,
  method: string,
  path: string,
): MockRouteMatch {
  const exact = `${method} ${path}`;
  if (typeof routes[exact] === 'function') {
    return { key: exact, params: {} };
  }

  for (const key of Object.keys(routes)) {
    const firstSpace = key.indexOf(' ');
    const routeMethod = key.slice(0, firstSpace);
    const routePath = key.slice(firstSpace + 1);
    if (routeMethod !== method || !routePath.includes(':')) {
      continue;
    }

    const parameterNames: string[] = [];
    const pattern = routePath
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          parameterNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return escapeRegExp(segment);
      })
      .join('/');
    const match = path.match(new RegExp(`^${pattern}$`));
    if (match) {
      return {
        key,
        params: Object.fromEntries(
          parameterNames.map((name, index) => [
            name,
            decodeURIComponent(match[index + 1] ?? ''),
          ]),
        ),
      };
    }
  }

  throw new Error(`Missing mock route: ${exact}`);
}

export function createMockRequester(getRoutes: () => MockRoutes) {
  return async function requestThroughMock(
    path: string,
    options: {
      data?: unknown;
      headers?: Record<string, string>;
      method?: string;
      params?: Record<string, unknown>;
    } = {},
  ) {
    const routes = getRoutes();
    const method = options.method ?? 'GET';
    const route = routeFor(routes, method, path);
    const response: MockResponse = {
      ended: false,
      headers: new Headers(),
      statusCode: 200,
      end() {
        this.ended = true;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      setHeader(name, value) {
        this.headers.set(name, value);
        return this;
      },
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
    };
    const query = Object.fromEntries(
      Object.entries(options.params ?? {}).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, String(value)]],
      ),
    );

    await (routes[route.key] as MockRouteHandler)(
      {
        body: options.data,
        headers: options.headers ?? {},
        params: route.params,
        query,
      },
      response,
    );

    if (response.statusCode >= 400) {
      throw {
        response: {
          data: response.body,
          status: response.statusCode,
          statusText: String(response.statusCode),
        },
      };
    }
    return response.ended ? undefined : response.body;
  };
}

/** 将 Umi mock route 暴露为 fetch，供 generated OpenAPI client 的页面级测试复用。 */
export function createMockFetch(getRoutes: () => MockRoutes) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(request.url, 'http://mock.local');
    const route = routeFor(getRoutes(), request.method, url.pathname);
    const response: MockResponse = {
      ended: false,
      headers: new Headers(),
      statusCode: 200,
      end() {
        this.ended = true;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      setHeader(name, value) {
        this.headers.set(name, value);
        return this;
      },
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
    };
    const text = await request.clone().text();
    const body = text.length > 0 ? JSON.parse(text) : undefined;
    const routes = getRoutes();
    await (routes[route.key] as MockRouteHandler)(
      {
        body,
        headers: Object.fromEntries(request.headers.entries()),
        params: route.params,
        query: Object.fromEntries(url.searchParams.entries()),
      },
      response,
    );

    return new Response(
      response.statusCode === 204 || response.ended
        ? null
        : JSON.stringify(response.body),
      {
        headers: response.headers,
        status: response.statusCode,
      },
    );
  };
}

interface RequesterOptions {
  data?: unknown;
  headers?: Record<string, string>;
  method: string;
  params?: Record<string, string>;
}

/**
 * 把既有页面测试中的 request spy 适配为 fetch。
 * 这样测试仍可延迟、覆盖或检查请求，同时生产代码只经过 generated client。
 */
export function createRequesterFetch(
  requester: (path: string, options: RequesterOptions) => Promise<unknown>,
) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request ? input : new Request(String(input), init);
    const url = new URL(request.url, 'http://mock.local');
    const text = await request.clone().text();
    const headers = Object.fromEntries(
      [...request.headers.entries()].flatMap(([name, value]) => {
        if (name.toLowerCase() === 'idempotency-key') {
          return [['Idempotency-Key', value]];
        }
        if (name.toLowerCase() === 'if-match') {
          return [['If-Match', value]];
        }
        return [];
      }),
    );
    const options: RequesterOptions = {
      ...(text ? { data: JSON.parse(text) } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      method: request.method,
      ...(url.search ? { params: Object.fromEntries(url.searchParams) } : {}),
    };

    try {
      const body = await requester(url.pathname, options);
      if (body === undefined) {
        return new Response(null, { status: 204 });
      }
      const revision =
        typeof body === 'object' && body !== null
          ? ((body as { revision?: unknown; version?: unknown }).revision ??
            (body as { version?: unknown }).version)
          : undefined;
      return new Response(JSON.stringify(body), {
        headers: {
          'Content-Type': 'application/json',
          ...(typeof revision === 'number' ? { ETag: `"v${revision}"` } : {}),
        },
        status: 200,
      });
    } catch (error) {
      const failure = error as {
        response?: { data?: unknown; status?: number };
      };
      if (typeof failure.response?.status === 'number') {
        return new Response(JSON.stringify(failure.response.data), {
          headers: { 'Content-Type': 'application/problem+json' },
          status: failure.response.status,
        });
      }
      throw error;
    }
  };
}
