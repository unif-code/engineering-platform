export type SessionQueryCacheClearer = () => Promise<void> | void;

const NOOP_CLEARER: SessionQueryCacheClearer = () => undefined;

let currentClearer: SessionQueryCacheClearer = NOOP_CLEARER;

export function registerSessionQueryCacheClearer(
  clearer: SessionQueryCacheClearer,
): () => void {
  currentClearer = clearer;
  return () => {
    if (currentClearer === clearer) {
      currentClearer = NOOP_CLEARER;
    }
  };
}

export async function clearSessionQueryCache(): Promise<void> {
  await currentClearer();
}
