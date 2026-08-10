export function mutationHeaders(options?: {
  etag?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Idempotency-Key': crypto.randomUUID(),
  };

  if (options?.etag !== undefined) {
    headers['If-Match'] = options.etag;
  }

  return headers;
}
