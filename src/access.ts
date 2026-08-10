// 前端可见性开关集中在此定义；可见性只是体验结果，授权结论一律以服务端判定为准
import type { InitialState } from './app';
import { getRouteRegistration } from './features/navigation';

export default function access(initialState?: InitialState) {
  return {
    canAccessAdmin:
      initialState?.me === null ||
      (initialState?.navigation ?? []).some(
        (item) => getRouteRegistration(item.routeKey)?.group === 'admin',
      ),
  };
}
