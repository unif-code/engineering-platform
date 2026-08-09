import { defineMock } from '@umijs/max';
import { loginHandler, meHandler, navigationHandler } from './handlers';

export default defineMock({
  'GET /api/v1/me': (_request, response) => response.json(meHandler()),
  'GET /api/v1/navigation': (_request, response) =>
    response.json(navigationHandler()),
  'POST /api/v1/auth/login': (request, response) => {
    const result = loginHandler(request.body);
    if (result.data === null) {
      response.status(result.code).json(result);
      return;
    }
    response.json(result);
  },
});
