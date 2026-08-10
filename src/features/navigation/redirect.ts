const DEFAULT_POST_LOGIN_PATH = '/home';
const AUTH_PATHS = new Set(['/bootstrap', '/login']);
const LOCAL_ORIGIN = 'https://engineering-platform.local';

interface LocationSnapshot {
  hash?: string;
  pathname: string;
  search?: string;
}

const isAuthPath = (pathname: string): boolean =>
  AUTH_PATHS.has(pathname === '/' ? pathname : pathname.replace(/\/+$/, ''));

export function resolvePostLoginPath(candidate: string | null): string {
  if (
    !candidate?.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\')
  ) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  try {
    const url = new URL(candidate, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN || isAuthPath(url.pathname)) {
      return DEFAULT_POST_LOGIN_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }
}

export function buildLoginPath(location: LocationSnapshot): string {
  const currentPath = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
  const redirect = resolvePostLoginPath(currentPath);

  return redirect === DEFAULT_POST_LOGIN_PATH && isAuthPath(location.pathname)
    ? '/login'
    : `/login?redirect=${encodeURIComponent(redirect)}`;
}
