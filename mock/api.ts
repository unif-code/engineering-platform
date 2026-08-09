import { defineMock } from '@umijs/max';
import { loginHandler, meHandler, navigationHandler } from './handlers';

const SESSION_COOKIE_NAME = 'engineering-platform-session';
const SESSION_COOKIE_VALUE = 'authenticated';
const UNAUTHENTICATED_ENVELOPE = {
  code: 401,
  data: null,
  message: 'Unauthenticated',
};

const hasSession = (cookieHeader?: string) =>
  cookieHeader
    ?.split(';')
    .some(
      (cookie) =>
        cookie.trim() === `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`,
    ) ?? false;

export default defineMock({
  'GET /api/v1/me': (request, response) => {
    if (!hasSession(request.headers.cookie)) {
      response.status(401).json(UNAUTHENTICATED_ENVELOPE);
      return;
    }
    response.json(meHandler());
  },
  'GET /api/v1/navigation': (request, response) => {
    if (!hasSession(request.headers.cookie)) {
      response.status(401).json(UNAUTHENTICATED_ENVELOPE);
      return;
    }
    response.json(navigationHandler());
  },
  'POST /api/v1/auth/login': (request, response) => {
    const result = loginHandler(request.body);
    if (result.data === null) {
      response.status(result.code).json(result);
      return;
    }
    response.cookie(SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
    response.json(result);
  },
});
