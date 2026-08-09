import { describe, expect, it } from 'vitest';
import { buildMenuData } from './menu';

describe('buildMenuData', () => {
  it('按 order 升序排序并把已知 routeKey 映射为 path', () => {
    expect(
      buildMenuData([
        { routeKey: 'admin', name: '管理后台', order: 2 },
        { routeKey: 'home', name: '首页', order: 1 },
      ]),
    ).toEqual([
      { path: '/home', name: '首页' },
      { path: '/admin', name: '管理后台' },
    ]);
  });

  it('丢弃未知 routeKey', () => {
    expect(
      buildMenuData([
        { routeKey: 'ghost', name: '未知菜单', order: 1 },
        { routeKey: 'constructor', name: '原型属性', order: 2 },
      ]),
    ).toEqual([]);
  });

  it('不改变输入数组', () => {
    const items = [
      { routeKey: 'admin', name: '管理后台', order: 2 },
      { routeKey: 'home', name: '首页', order: 1 },
    ];

    buildMenuData(items);

    expect(items).toEqual([
      { routeKey: 'admin', name: '管理后台', order: 2 },
      { routeKey: 'home', name: '首页', order: 1 },
    ]);
  });
});
