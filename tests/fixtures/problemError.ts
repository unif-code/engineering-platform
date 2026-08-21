export interface ProblemFixture {
  readonly detail?: string;
  readonly instance?: string;
  readonly requestId?: string;
  readonly status?: number;
  readonly title?: string;
  readonly type?: string;
  readonly [extension: string]: unknown;
}

export interface ProblemErrorFixture extends Error {
  readonly problem: Readonly<ProblemFixture>;
  readonly requestId: string | undefined;
}

export function createProblemError(
  problem: ProblemFixture,
): ProblemErrorFixture {
  const error = new Error(
    problem.detail ?? problem.title ?? 'Problem request failed',
  );
  error.name = 'ApiError';
  return Object.assign(error, {
    problem: Object.freeze({ ...problem }),
    requestId: problem.requestId,
  });
}
