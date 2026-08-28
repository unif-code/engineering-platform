# V0.1 前端外壳实施计划

> **Roadmap Reclassification（2026-08-28）**：本计划保留为 V0.1 Application Foundation 的已执行技术记录。V0.1 只承担前端、后端与 OpenAPI 应用接缝；部署、Backup/Restore、容量与 HA 已后移到 V0.14～V0.19。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在本仓（engineering-platform）交付完整外壳：`/login → /home、/admin` 的守卫路径、mock 驱动的 Session Bootstrap、features 公开入口机制与依赖方向架构测试。

**Architecture:** 路由级 `wrappers` 守卫 + Feature 数据缝：`getInitialState` 经 mock 拉 `me`/`navigation` 入 Initial State，菜单由 layout 运行时读取；取数只在 `features/*/service.ts`，未来切 generated client 零页面改动。

**Tech Stack:** Umi Max、React 19、ProComponents（ProForm/PageContainer）、React Query（本计划不使用，留业务数据）、dependency-cruiser、Vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-08-09-frontend-shell-v01-design.md`

## Global Constraints

- 工作目录：`/Users/liulijun/tongyi/unif-code/engineering-platform`（本仓 main）。
- 遵守 AGENTS.md：pages → features → services/generated 依赖方向；antd 组件写前 `npx antd info <组件>` 查 API（CLI 未装则记录跳过原因）；样式 antd-style/Tailwind。
- mock 形状与后端骨架计划逐字段一致：`me = {employeeId:"00000000", name:"V0.1 Stub"}`；`navigation = [{routeKey:"home",name:"首页",order:1},{routeKey:"admin",name:"管理后台",order:2}]`；错误一律 `application/problem+json` 形状。
- 每任务收尾跑 `pnpm lint && pnpm test`，全绿才 commit；Conventional Commits 单主题。

---

### Task 1: dependency-cruiser 依赖方向契约

**Files:**
- Create: `.dependency-cruiser.cjs`
- Modify: `package.json`（devDep + scripts + lint 链）、`AGENTS.md`（lint 描述）

**Interfaces:**
- Produces: `pnpm depcruise` 校验四条规则；`pnpm lint` 链新增该步。

- [ ] **Step 1: 安装并写规则**

Run: `pnpm add -D dependency-cruiser`

`.dependency-cruiser.cjs`：

```js
/** 依赖方向契约（见 docs/architecture/06 与 AGENTS.md）。 */
module.exports = {
  forbidden: [
    {
      name: 'pages-only-via-features',
      comment: 'pages 禁止直达 services（必须经 features）',
      severity: 'error',
      from: { path: '^src/pages' },
      to: { path: '^src/services' },
    },
    {
      name: 'features-public-entry-only',
      comment: 'feature 之间只允许经包根公开入口互访',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/([^/]+)/.+',
        pathNot: '^src/features/$1/',
      },
    },
    {
      name: 'components-no-business',
      comment: '共享组件不依赖 features 与 services',
      severity: 'error',
      from: { path: '^src/components' },
      to: { path: '^src/(features|services)' },
    },
    {
      name: 'transport-no-app-deps',
      comment: 'transport 不依赖上层',
      severity: 'error',
      from: { path: '^src/services/transport' },
      to: { path: '^src/(features|pages)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.(test|spec)\\.(ts|tsx)$|^src/\\.umi' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
```

`package.json` scripts 增加：`"depcruise": "depcruise src"`；`lint` 改为 `"npm run biome:lint && npm run tsc && npm run depcruise && npm run openapi:check && npm run baseline:check"`。AGENTS.md 的 `pnpm lint` 一行补"依赖方向"字样。

- [ ] **Step 2: 验证通过与验红**

Run: `pnpm depcruise`
Expected: no dependency violations。
再在 `src/pages/Home/index.tsx` 顶部临时加 `import '@/services/transport';`，重跑应报 `pages-only-via-features` error；**删除该行**后恢复绿。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore(arch): enforce frontend dependency direction with dependency-cruiser"
```

---

### Task 2: mock 数据面（纯函数 + umi 装配）

**Files:**
- Create: `src/features/auth/mockData.ts` 之外不放业务——mock 纯函数放 `mock/handlers.ts`，umi 装配放 `mock/api.ts`
- Create: `mock/handlers.ts`、`mock/api.ts`、`mock/handlers.test.ts`

**Interfaces:**
- Produces: `meHandler(): {employeeId:string;name:string}`；`navigationHandler(): NavigationItem[]`；`loginHandler(body:{employeeId:string;password:string;totp:string}): {ok:true} | {problem:{title:string;status:number}}`（格式合法即成功）。

- [ ] **Step 1: 写失败测试**

`mock/handlers.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { loginHandler, meHandler, navigationHandler } from './handlers';

describe('mock handlers', () => {
  it('me 形状与后端 Principal 一致', () => {
    expect(meHandler()).toEqual({ employeeId: '00000000', name: 'V0.1 Stub' });
  });

  it('navigation 形状与后端 NavigationItem 一致且有序', () => {
    expect(navigationHandler()).toEqual([
      { routeKey: 'home', name: '首页', order: 1 },
      { routeKey: 'admin', name: '管理后台', order: 2 },
    ]);
  });

  it('login 格式合法即成功，非法返回 problem 形状', () => {
    expect(
      loginHandler({ employeeId: '00000000', password: 'x'.repeat(15), totp: '123456' }),
    ).toEqual({ ok: true });
    const bad = loginHandler({ employeeId: '123', password: '', totp: '12' });
    expect('problem' in bad && bad.problem.status).toBe(422);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test mock`
Expected: FAIL（handlers 不存在）。

- [ ] **Step 3: 实现**

`mock/handlers.ts`：

```ts
// 形状与 engineering-platform-backend 的 Principal/NavigationItem 逐字段一致（camelCase）。
export interface LoginBody {
  employeeId: string;
  password: string;
  totp: string;
}

export const meHandler = () => ({ employeeId: '00000000', name: 'V0.1 Stub' });

export const navigationHandler = () => [
  { routeKey: 'home', name: '首页', order: 1 },
  { routeKey: 'admin', name: '管理后台', order: 2 },
];

export const loginHandler = (body: LoginBody) => {
  const valid =
    /^\d{8}$/.test(body.employeeId) && body.password.length >= 1 && /^\d{6}$/.test(body.totp);
  if (!valid) {
    return { problem: { title: 'Validation failed', status: 422 } };
  }
  return { ok: true as const };
};
```

`mock/api.ts`（umi mock 装配）：

```ts
import type { Request, Response } from 'express';
import { loginHandler, meHandler, navigationHandler } from './handlers';

export default {
  'GET /api/v1/me': (_: Request, res: Response) => res.json(meHandler()),
  'GET /api/v1/navigation': (_: Request, res: Response) => res.json(navigationHandler()),
  'POST /api/v1/auth/login': (req: Request, res: Response) => {
    const result = loginHandler(req.body);
    if ('problem' in result) {
      res
        .status(result.problem.status)
        .type('application/problem+json')
        .json(result.problem);
      return;
    }
    res.json(result);
  },
};
```

删除 `mock/.gitkeep`。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test mock && pnpm lint`
Expected: 3 passed；lint 绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(mock): bootstrap stub endpoints matching backend shapes"
```

---

### Task 3: features/auth 与 features/navigation 的数据缝

**Files:**
- Create: `src/features/auth/{index.ts,service.ts,type.ts}`、`src/features/navigation/{index.ts,service.ts}`、`src/features/auth/service.test.ts`、`src/features/navigation/service.test.ts`
- Delete: `src/features/.gitkeep`

**Interfaces:**
- Produces: `type CurrentUser = { employeeId: string; name: string }`；`type NavigationItem = { routeKey: string; name: string; order: number }`；`fetchMe(): Promise<CurrentUser | null>`（未登录/失败返回 null）；`login(body: {employeeId:string;password:string;totp:string}): Promise<void>`（失败抛 Error，message 取 problem.title）；`fetchNavigation(): Promise<NavigationItem[]>`（失败返回 []）。均从各自 `index.ts` 公开导出。

- [ ] **Step 1: 写失败测试**

`src/features/auth/service.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, login } from './service';

afterEach(() => vi.unstubAllGlobals());

describe('auth service', () => {
  it('fetchMe 返回用户；失败返回 null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ employeeId: '00000000', name: 'V0.1 Stub' })));
    expect(await fetchMe()).toEqual({ employeeId: '00000000', name: 'V0.1 Stub' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    expect(await fetchMe()).toBeNull();
  });

  it('login 失败抛出 problem.title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ title: 'Validation failed', status: 422 }), {
          status: 422,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );
    await expect(
      login({ employeeId: '123', password: 'x', totp: '1' }),
    ).rejects.toThrow('Validation failed');
  });
});
```

`src/features/navigation/service.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNavigation } from './service';

afterEach(() => vi.unstubAllGlobals());

describe('navigation service', () => {
  it('返回导航；失败返回空数组', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ routeKey: 'home', name: '首页', order: 1 }])),
    );
    expect(await fetchNavigation()).toEqual([{ routeKey: 'home', name: '首页', order: 1 }]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    expect(await fetchNavigation()).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/features`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

`src/features/auth/type.ts`：

```ts
export interface CurrentUser {
  employeeId: string;
  name: string;
}

export interface LoginInput {
  employeeId: string;
  password: string;
  totp: string;
}
```

`src/features/auth/service.ts`：

```ts
// 数据缝：V0.1 走 mock 的 /api/v1/*；后端 openapi.json 落地后本文件切换为
// import { api } from '@/services/generated'（后端计划 Task 10/11，由本仓 owner 执行）。
import type { CurrentUser, LoginInput } from './type';

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const resp = await fetch('/api/v1/me');
    if (!resp.ok) return null;
    return (await resp.json()) as CurrentUser;
  } catch {
    return null;
  }
}

export async function login(body: LoginInput): Promise<void> {
  const resp = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const problem = (await resp.json().catch(() => ({}))) as { title?: string };
    throw new Error(problem.title ?? `HTTP ${resp.status}`);
  }
}
```

`src/features/auth/index.ts`：

```ts
export { fetchMe, login } from './service';
export type { CurrentUser, LoginInput } from './type';
```

`src/features/navigation/service.ts`：

```ts
export interface NavigationItem {
  routeKey: string;
  name: string;
  order: number;
}

export async function fetchNavigation(): Promise<NavigationItem[]> {
  try {
    const resp = await fetch('/api/v1/navigation');
    if (!resp.ok) return [];
    return (await resp.json()) as NavigationItem[];
  } catch {
    return [];
  }
}
```

`src/features/navigation/index.ts`：

```ts
export { fetchNavigation } from './service';
export type { NavigationItem } from './service';
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test src/features && pnpm lint`
Expected: PASS；depcruise 绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(features): auth and navigation service seams over mock endpoints"
```

---

### Task 4: getInitialState 与菜单装配

**Files:**
- Modify: `src/app.ts`
- Create: `src/features/navigation/menu.ts`、`src/features/navigation/menu.test.ts`、`src/app.test.ts`
- Modify: `src/features/navigation/index.ts`（导出 buildMenuData）

**Interfaces:**
- Consumes: `fetchMe`、`fetchNavigation`（Task 3）。
- Produces: `InitialState = { me: CurrentUser | null; navigation: NavigationItem[] }`（`getInitialState` 返回值）；`buildMenuData(items: NavigationItem[]): Array<{ path: string; name: string }>`（routeKey→path：home→/home、admin→/admin，按 order 排序）。

- [ ] **Step 1: 写失败测试**

`src/features/navigation/menu.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { buildMenuData } from './menu';

describe('buildMenuData', () => {
  it('按 order 排序并映射 path', () => {
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

  it('未知 routeKey 丢弃', () => {
    expect(buildMenuData([{ routeKey: 'ghost', name: 'x', order: 1 }])).toEqual([]);
  });
});
```

`src/app.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialState } from './app';

afterEach(() => vi.unstubAllGlobals());

describe('getInitialState', () => {
  it('聚合 me 与 navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('/me')
          ? new Response(JSON.stringify({ employeeId: '00000000', name: 'V0.1 Stub' })
          : new Response(JSON.stringify([{ routeKey: 'home', name: '首页', order: 1 }]),
      ),
    );
    const state = await getInitialState();
    expect(state.me?.employeeId).toBe('00000000');
    expect(state.navigation).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/app src/features/navigation/menu`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/features/navigation/menu.ts`：

```ts
import type { NavigationItem } from './service';

const ROUTE_PATHS: Record<string, string> = { home: '/home', admin: '/admin' };

export function buildMenuData(items: NavigationItem[]): Array<{ path: string; name: string }> {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .flatMap((item) =>
      ROUTE_PATHS[item.routeKey] ? [{ path: ROUTE_PATHS[item.routeKey], name: item.name }] : [],
    );
}
```

`src/features/navigation/index.ts` 增加：`export { buildMenuData } from './menu';`

`src/app.ts` 重写：

```ts
// 运行时配置：https://umijs.org/docs/api/runtime-config
import { buildMenuData, fetchNavigation } from '@/features/navigation';
import { fetchMe } from '@/features/auth';
import type { CurrentUser } from '@/features/auth';
import type { NavigationItem } from '@/features/navigation';

export interface InitialState {
  me: CurrentUser | null;
  navigation: NavigationItem[];
}

export async function getInitialState(): Promise<InitialState> {
  const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
  return { me, navigation };
}

export const layout = ({ initialState }: { initialState?: InitialState }) => {
  return {
    logo: false,
    menu: { locale: false },
    menuDataRender: () => buildMenuData(initialState?.navigation ?? []),
  };
};
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test && pnpm lint`
Expected: 全 PASS。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(shell): bootstrap initial state and menu from navigation feature"
```

---

### Task 5: RouteGuard 与路由接线

**Files:**
- Create: `src/features/auth/RouteGuard.tsx`、`src/features/auth/RouteGuard.test.tsx`
- Modify: `src/features/auth/index.ts`（导出 RouteGuard）、`config/routes.ts`

**Interfaces:**
- Consumes: Initial State（Task 4）。
- Produces: 默认导出的守卫组件（无 me → `<Navigate to="/login" />`，有 me → `<Outlet />`）；路由 `/login` 公开、`/home`、`/admin` 挂 wrappers。

- [ ] **Step 1: 写失败测试**

`src/features/auth/RouteGuard.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ me: null as null | { employeeId: string } }));

vi.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: { me: mocks.me, navigation: [] } }),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  Outlet: () => <div data-testid="outlet" />,
}));

import RouteGuard from './RouteGuard';

describe('RouteGuard', () => {
  it('未登录重定向 /login', () => {
    mocks.me = null;
    render(<RouteGuard />);
    expect(screen.getByTestId('navigate')).toHaveTextContent('/login');
  });

  it('已登录渲染子路由', () => {
    mocks.me = { employeeId: '00000000' };
    render(<RouteGuard />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test RouteGuard`
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 实现**

`src/features/auth/RouteGuard.tsx`：

```tsx
import { Navigate, Outlet, useModel } from '@umijs/max';

const RouteGuard: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  if (!initialState?.me) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default RouteGuard;
```

`src/features/auth/index.ts` 增加：`export { default as RouteGuard } from './RouteGuard';`

`config/routes.ts` 重写：

```ts
export default [
  { path: '/login', component: './Login', layout: false },
  {
    path: '/',
    wrappers: ['@/features/auth/RouteGuard'],
    routes: [
      { path: '/', redirect: '/home' },
      { name: '首页', path: '/home', component: './Home' },
      { name: '管理后台', path: '/admin', component: './Admin' },
    ],
  },
];
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: 全 PASS；构建产物含 `p__Login`（下一任务创建页面后再验，本步构建若因 Login 缺失失败，先创建占位再回补——见 Task 6 说明，可与 Task 6 同批执行）。

- [ ] **Step 5: Commit（与 Task 6 合并提交亦可）**

```bash
git add -A && git commit -m "feat(auth): route guard and protected route wiring"
```

---

### Task 6: 登录页

**Files:**
- Create: `src/pages/Login/index.tsx`、`src/pages/Login/index.test.tsx`

**Interfaces:**
- Consumes: `login`（Task 3）、Initial State 的 `setInitialState`、`fetchMe`。
- Produces: `/login` 页面：员工编号（8 位数字）、密码、TOTP（6 位数字）三字段 ProForm；提交成功后刷新 Initial State 并跳 `/home`。

- [ ] **Step 1: 写失败测试**

`src/pages/Login/index.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setInitialState: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  useModel: () => ({ initialState: undefined, setInitialState: mocks.setInitialState }),
  history: { push: mocks.push },
}));

import LoginPage from './index';

describe('LoginPage', () => {
  it('渲染三个字段与提交按钮', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('TOTP 动态码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登\s*录/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test src/pages/Login`
Expected: FAIL（页面不存在）。

- [ ] **Step 3: 实现**

写组件前按 AGENTS.md 规则查 `npx antd info Form` 与 ProForm 文档（CLI 不可用则在提交信息注明凭 pro-components 现版本类型实现）。

`src/pages/Login/index.tsx`：

```tsx
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { fetchMe, login } from '@/features/auth';
import type { LoginInput } from '@/features/auth';
import { fetchNavigation } from '@/features/navigation';

const LoginPage: React.FC = () => {
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: LoginInput) => {
    await login(values); // 失败抛错，LoginForm 自动提示
    const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
    await setInitialState({ me, navigation });
    history.push('/home');
    return true;
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm
        title="内部研发平台"
        subTitle="V0.1 骨架：登录为技术性 stub，V0.2 接入真实认证"
        onFinish={onFinish}
      >
        <ProFormText
          name="employeeId"
          label="员工编号"
          rules={[
            { required: true, message: '请输入员工编号' },
            { pattern: /^\d{8}$/, message: '员工编号为 8 位数字' },
          ]}
        />
        <ProFormText.Password
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
        <ProFormText
          name="totp"
          label="TOTP 动态码"
          rules={[
            { required: true, message: '请输入动态码' },
            { pattern: /^\d{6}$/, message: '动态码为 6 位数字' },
          ]}
        />
      </LoginForm>
    </div>
  );
};

export default LoginPage;
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: 全 PASS；产物含 `p__Login`。

- [ ] **Step 5: 手动 Smoke**

Run: `pnpm dev`，浏览器访问 `/home` 应重定向 `/login`；填 `00000000` / 任意密码 / `123456` 登录后进入 `/home`，菜单显示"首页/管理后台"；访问 `/admin` 正常。结束 dev。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(login): mock-driven login page completing the shell path"
```

---

### Task 7: 收尾核验（验收标准对照）

**Files:** 无新增。

- [ ] **Step 1: 逐条核对 spec 验收标准**

1. 守卫路径 ✓（Task 5/6 测试与 Smoke）；2. mock 形状 ✓（Task 2 测试）；3. depcruise 验红 ✓（Task 1）；4. 全量门绿：`pnpm lint && pnpm test && pnpm build`；5. 切换缝就绪（service.ts 注释标明切换点，实际切换待后端 Task 8 后执行其 Task 10/11）。

- [ ] **Step 2: 汇报**

向用户汇报外壳完成情况与遗留（generated 切换待后端构件）。
