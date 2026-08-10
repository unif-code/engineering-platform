import { defineMock } from '@umijs/max';
import { meHandler, navigationHandler } from './handlers';

const SESSION_COOKIE_NAME = 'ep_session';
const SESSION_COOKIE_VALUE = 'mock-session';
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
});
