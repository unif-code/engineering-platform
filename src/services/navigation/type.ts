export interface NavigationItem {
  /** V0.1 兼容字段；可见名称仍由服务端投影决定。 */
  name: string;
  /** V0.1 兼容字段；V0.2 排序以 sort 为准。 */
  order: number;
  routeKey: string;
  sort: number;
  /** 服务端拥有的不透明元数据；前端不得据此推断路由。 */
  meta: Record<string, unknown>;
}
