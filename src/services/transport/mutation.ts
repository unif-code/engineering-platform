export type MutationHeaders = Record<string, string> & {
  'Idempotency-Key': string;
  'If-Match'?: string;
};

interface MutationHeaderOptions {
  etag?: string;
  idempotencyKey?: string;
}

export function mutationHeaders(
  options: MutationHeaderOptions & {
    etag: string;
  },
): Required<MutationHeaders>;
export function mutationHeaders(
  options?: MutationHeaderOptions,
): MutationHeaders;
export function mutationHeaders(
  options?: MutationHeaderOptions,
): MutationHeaders {
  const headers: MutationHeaders = {
    'Idempotency-Key': options?.idempotencyKey ?? crypto.randomUUID(),
  };

  if (options?.etag !== undefined) {
    headers['If-Match'] = options.etag;
  }

  return headers;
}
