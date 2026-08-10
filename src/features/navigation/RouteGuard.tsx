import { Navigate, Outlet, useLocation, useModel } from '@umijs/max';
import { Result } from 'antd';
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
    return <Result status="403" subTitle="无权访问此页面" title="403" />;
  }

  if (
    match.registration.kind === 'redirect' ||
    match.registration.prototype ||
    initialState.navigation.some(({ routeKey }) => routeKey === match.routeKey)
  ) {
    return <Outlet />;
  }

  return <Result status="403" subTitle="无权访问此页面" title="403" />;
}

export default RouteGuard;
