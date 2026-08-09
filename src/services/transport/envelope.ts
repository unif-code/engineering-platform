import type { ApiEnvelope } from '@/types/api';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getResponseEnvelopeMessage = (error: unknown): string | undefined => {
  if (!isRecord(error) || !isRecord(error.response)) {
    return undefined;
  }

  const { data } = error.response;
  return isRecord(data) && typeof data.message === 'string'
    ? data.message
    : undefined;
};

export async function resolveApiEnvelope<T>(
  response: Promise<ApiEnvelope<T>>,
): Promise<T> {
  try {
    const envelope = await response;
    if (envelope.code !== 200) {
      throw new Error(envelope.message);
    }
    return envelope.data as T;
  } catch (error) {
    const responseMessage = getResponseEnvelopeMessage(error);
    if (responseMessage !== undefined) {
      throw new Error(responseMessage, { cause: error });
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Request failed', { cause: error });
  }
}
