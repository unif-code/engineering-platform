import { defineMock } from '@umijs/max';
import { meHandler, navigationHandler } from './handlers';

const SESSION_COOKIE_NAME = 'ep_session';
const SESSION_COOKIE_VALUE = 'mock-session';
const UNAUTHENTICATED_PROBLEM = {
  detail: '当前 Session 不存在或已失效',
  requestId: 'mock-session-unauthorized',
  status: 401,
  title: 'UNAUTHORIZED',
  type: 'https://engineering-platform.example/problems/unauthorized',
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
      response.setHeader('Content-Type', 'application/problem+json');
      response.status(401).json(UNAUTHENTICATED_PROBLEM);
      return;
    }
    response.json(meHandler());
  },
  'GET /api/v1/navigation': (request, response) => {
    if (!hasSession(request.headers.cookie)) {
      response.setHeader('Content-Type', 'application/problem+json');
      response.status(401).json(UNAUTHENTICATED_PROBLEM);
      return;
    }
    response.json(navigationHandler());
  },
});
