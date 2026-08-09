import { Navigate, Outlet, useModel } from '@umijs/max';

const RouteGuard: React.FC = () => {
  const { initialState } = useModel('@@initialState');

  if (!initialState?.me) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default RouteGuard;
