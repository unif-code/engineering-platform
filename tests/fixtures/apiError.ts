import { ApiError, type ProblemDetails } from '@/services/transport';

export function createApiErrorFixture(problem: ProblemDetails): ApiError {
  return new ApiError(problem);
}
