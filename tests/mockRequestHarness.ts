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
