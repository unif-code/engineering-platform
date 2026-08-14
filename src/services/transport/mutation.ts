export type MutationHeaders = Record<string, string> & {
  'Idempotency-Key': string;
  'If-Match'?: string;
};

export function mutationHeaders(options: {
  etag: string;
}): Required<MutationHeaders>;
export function mutationHeaders(options?: {
  etag?: undefined;
}): MutationHeaders;
export function mutationHeaders(options?: { etag?: string }): MutationHeaders {
  const headers: MutationHeaders = {
    'Idempotency-Key': crypto.randomUUID(),
  };

  if (options?.etag !== undefined) {
    headers['If-Match'] = options.etag;
  }

  return headers;
}
