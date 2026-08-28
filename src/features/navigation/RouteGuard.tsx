import { Navigate, Outlet, useLocation, useModel } from '@umijs/max';
import { Result } from 'antd';
import { AccessDeniedResult } from '@/components/AccessDeniedResult';
import { buildLoginPath } from './redirect';
import { findRouteRegistration } from './registry';

export function RouteGuard() {
  const { error, initialState } = useModel('@@initialState');
  const location = useLocation();

  if (error) {
    return (
      <Result
        status="500"
        subTitle="无法确认当前登录状态，请稍后重试"
        title="Session 初始化失败"
      />
    );
  }

  if (!initialState?.principal) {
    return <Navigate replace to={buildLoginPath(location)} />;
  }

  const match = findRouteRegistration(location.pathname);
  if (!match) {
    return <AccessDeniedResult />;
  }

  if (
    match.routeKey === 'access-denied' ||
    match.registration.kind === 'redirect'
  ) {
    return <Outlet />;
  }

  const requiredRouteKey = match.registration.menu
    ? match.routeKey
    : match.registration.parent;
  if (
    requiredRouteKey !== null &&
    initialState.navigation.some(
      ({ routeKey }) => routeKey === requiredRouteKey,
    )
  ) {
    return <Outlet />;
  }

  return <AccessDeniedResult />;
}

export default RouteGuard;
