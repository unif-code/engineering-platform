import type { components } from '@/services/generated';

type GeneratedNavigationItem = components['schemas']['NavigationItemDto'];

export interface NavigationItem extends Omit<GeneratedNavigationItem, 'meta'> {
  /** 应用层兼容字段；值严格来自 V0.2 order。 */
  sort: number;
  /** 服务端拥有的不透明元数据；前端不得据此推断路由。 */
  meta: Record<string, unknown>;
}
