# 内部研发平台原型视觉重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留 V0.1 登录、Session、Initial State、路由守卫与数据边界的前提下，用 Ant Design token、ProLayout 和 ProComponents 将原型覆盖的全部用户端/管理端页面重建为可导航、可切主题、具备视觉交互的桌面 UI 骨架。

**Architecture:** Umi Max 继续拥有路由和 ProLayout；`features/theme` 负责 `system | light | dark` 状态，通过 Umi 官方 AntD runtime setter 更新唯一应用级 ConfigProvider，并把同一 `resolvedTheme` 投影到 ProComponents 公开 `ProProvider.dark`；`features/navigation` 以静态 Route Registry 解释后端 `routeKey`。页面 UI、静态 fixtures、局部 adapter 与交互 state 就近放在 `src/pages/<Page>/`；不把静态数据伪装为 API，也不复制原型业务状态机。

**Tech Stack:** Umi Max 4.6、React 19、Ant Design 6、ProComponents 3、Ant Design X 2、antd-style 4、Vitest + Testing Library、dependency-cruiser。

**Spec:** `docs/superpowers/specs/2026-08-09-prototype-ui-reconstruction-design.md`

## Global Constraints

- 仅修改前端仓 `engineering-platform`；不得修改 `engineering-platform-backend`、`engineering-platform-gitops` 或其他仓库。
- 用户已明确批准在 `main` 直接执行，不建立隔离 worktree；所有实现与审查子 Agent 使用 `gpt-5.6-sol`、`max`，按任务串行写入并在任务间完成规格审查和代码质量审查。
- 修改代码前完整读取共享 `umi`、`ant-design`、`antd` Skill；若本地缺失，运行 `npx skills add unif-design/skills --skill umi --skill ant-design --skill antd`，但不提交安装产生的个人 Skill 缓存文件。
- 每个任务遵循 `superpowers:test-driven-development`：先写可观察行为测试并确认 RED，再写最小实现确认 GREEN；不得先写生产代码后补测试。
- 原型只作为视觉、布局与信息密度参考；登录、Session、Initial State、路由守卫、信封解包和 `pages → features → services` 是唯一逻辑事实源。
- 视觉参考的绝对路径为 `/Users/liulijun/Downloads/untitled/project/研发协作平台.dc.html`；只读取该原型，不修改其文件，也不照搬其中的业务逻辑或示例数据。
- 产品名固定为“内部研发平台”；Brand Orange 为 `#EB6E00`，白字主要操作色为 `#C25700`；禁止页面硬编码主题色、`!important` 暗色补丁、emoji/Unicode 菜单图标。
- 主题固定为 `system | light | dark`，storage key 固定为 `engineering-platform.theme.v1`；首次跟随系统，仅手动 light/dark 模式持久化，恢复 system 时删除 override；禁止持久化 token、主题色或 ProLayout settings。
- 不向用户渲染 Ant Design Pro `SettingDrawer`，不把主题复制到 `initialState.settings`；`ThemeProvider` 同时驱动 Umi AntD theme 和 `ProProvider.dark`，是唯一主题状态源。
- 继续使用 Umi ProLayout；展开侧栏 208px、折叠约 64px、顶栏 52px、页面 padding 20px 24px；桌面支持下限 1280px，不实现移动端布局。
- 页面组件优先 ProComponents，其次 Ant Design；只有至少两个页面复用的展示 primitive 才提升到 `src/components/`；页面私有组件平铺，样式写 `index.style.ts`，fixture 写 `constant.ts`。
- API client 不在本计划新增；页面不得直达 `services`，不得使用 `useRequest`，不得接入 OpenAPI generated client。
- ProTable 必须使用就近静态 `request` adapter，返回 `{ data, success, total }`；adapter 不发网络请求、不修改 fixture，并显式配置 `scroll.x`。
- Modal、Drawer、Tab、Segmented、筛选和按钮反馈可操作；所有提交类动作只提示 `静态原型操作：<动作>，未保存任何业务数据。`，随后关闭浮层，不修改持久示例数据。
- Artifact 与 Audit 的只读详情统一使用公共 `DetailDrawer`，组件内部只组合 Ant Design `Drawer` 与 `ProDescriptions`；Diff 直接使用 Ant Design `Drawer`，不得把只读详情误做成 `DrawerForm`。
- 不引入图表库；KPI、Progress、CSS mini chart 和文本 Legend 满足本轮展示。
- 每个任务完成后至少运行 focused tests、`pnpm lint`、`pnpm test`；涉及路由、Umi config 或页面 chunk 时再运行 `pnpm build`，全绿后使用单主题 Conventional Commit。

---

### Task 1: system/light/dark 主题运行时与首屏预解析

**Files:**
- Create: `config/themePreflight.ts`
- Create: `src/constants/theme.ts`
- Create: `src/types/theme.d.ts`
- Create: `src/features/theme/type.ts`
- Create: `src/features/theme/model.ts`
- Create: `src/features/theme/config.ts`
- Create: `src/features/theme/ThemeProvider.tsx`
- Create: `src/features/theme/ThemeSelector.tsx`
- Create: `src/features/theme/index.ts`
- Create: `src/features/theme/model.test.ts`
- Create: `src/features/theme/preflight.test.ts`
- Create: `src/features/theme/ThemeProvider.test.tsx`
- Modify: `config/config.ts`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`

**Interfaces:**
- Produces: `ThemeMode = 'system' | 'light' | 'dark'`、`ResolvedTheme = 'light' | 'dark'`。
- Produces: `getInitialThemeSnapshot(): ThemeSnapshot`、`persistThemeMode(mode): void`、`createAntdThemeConfig(theme): ConfigProviderProps['theme']`。
- Produces: `ThemeProvider`、`usePlatformTheme(): ThemeContextValue`、`ThemeSelector`；后续壳层和登录页只经 `@/features/theme` 使用。
- Consumes: Umi 官方 `antd.configProvider`、runtime `antd` 和 `useAntdConfigSetter`；参考 [Umi AntD runtime configuration](https://umijs.org/en-US/docs/max/antd/)。

- [ ] **Step 1: 查询并锁定当前组件 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info ConfigProvider --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info App --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Dropdown --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh token
```

Expected: 四条命令 exit 0；记录 `ConfigProvider.theme.algorithm`、Dropdown `menu` 和 App 上下文的当前签名，不使用旧版 `overlay`。

- [ ] **Step 2: 写主题纯模型与 preflight 的失败测试**

`src/features/theme/model.test.ts` 至少写出以下表驱动断言：

```ts
it.each([
  { stored: null, prefersDark: false, expected: { mode: 'system', resolvedTheme: 'light' } },
  { stored: null, prefersDark: true, expected: { mode: 'system', resolvedTheme: 'dark' } },
  { stored: 'light', prefersDark: true, expected: { mode: 'light', resolvedTheme: 'light' } },
  { stored: 'dark', prefersDark: false, expected: { mode: 'dark', resolvedTheme: 'dark' } },
  { stored: 'invalid', prefersDark: true, expected: { mode: 'system', resolvedTheme: 'dark' } },
])('解析 $stored 与系统偏好', ({ stored, prefersDark, expected }) => {
  expect(createThemeSnapshot(stored, prefersDark)).toEqual(expected);
});
```

另写用例验证 `localStorage.getItem/setItem/removeItem` 抛错时不向上抛出；light/dark 调用 `setItem`，system 调用 `removeItem`。`preflight.test.ts` 在 happy-dom 执行 `themePreflightScript`，断言 `window.__ENGINEERING_PLATFORM_THEME__`、`document.documentElement.style.colorScheme` 和背景色精确同步。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/features/theme/model.test.ts src/features/theme/preflight.test.ts
```

Expected: FAIL，原因是 theme model/preflight 模块尚不存在。

- [ ] **Step 4: 实现纯模型、全局类型和首屏脚本**

`src/features/theme/type.ts` 的接口必须为：

```ts
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeSnapshot {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
}

export interface ThemeContextValue extends ThemeSnapshot {
  setMode: (mode: ThemeMode) => void;
}
```

`src/constants/theme.ts` 固定：

```ts
export const THEME_STORAGE_KEY = 'engineering-platform.theme.v1';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
export const BRAND_ORANGE = '#EB6E00';
export const ACTION_ORANGE = '#C25700';
export const LIGHT_LAYOUT_BACKGROUND = '#F5F5F5';
export const LIGHT_CONTAINER_BACKGROUND = '#FFFFFF';
export const DARK_LAYOUT_BACKGROUND = '#121212';
export const DARK_CONTAINER_BACKGROUND = '#1F1F1F';
```

`model.ts` 实现并导出以下精确函数：

```ts
export function createThemeSnapshot(
  stored: string | null,
  prefersDark: boolean,
): ThemeSnapshot;
export function getInitialThemeSnapshot(): ThemeSnapshot;
export function persistThemeMode(mode: ThemeMode): void;
export function syncDocumentTheme(theme: ResolvedTheme): void;
```

storage 只接受 `light`/`dark`；`window`、`matchMedia` 或 storage 不可用时返回 system/light。`config/themePreflight.ts` 从 `src/constants/theme.ts` 导入同一 key/背景常量并导出同步 IIFE 字符串 `themePreflightScript`，禁止复制第二份 magic string。

- [ ] **Step 5: 写 ThemeProvider/ThemeSelector 的失败测试**

用可触发 `change` 的 `matchMedia` stub 渲染 Provider + probe，覆盖：system 随系统变化、手动 light 忽略系统变化、切回 system 删除 key 并立即解析当前系统、卸载移除 listener。ThemeSelector 测试通过按钮可访问名“主题设置”打开菜单，分别点击“跟随系统 / 浅色 / 深色”，并断言当前选中项。

- [ ] **Step 6: 启用 Umi ConfigProvider 并实现动态主题**

`config/config.ts` 修改为：

```ts
antd: {
  configProvider: {},
  appConfig: {},
},
headScripts: [{ content: themePreflightScript }],
```

然后运行 `pnpm setup` 生成 `useAntdConfigSetter` 类型。`createAntdThemeConfig` 使用：

```ts
{
  algorithm: [resolvedTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm],
  token: {
    colorPrimary: ACTION_ORANGE,
    colorBgLayout: resolvedTheme === 'dark' ? '#121212' : '#F5F5F5',
    colorBgContainer: resolvedTheme === 'dark' ? '#1F1F1F' : '#FFFFFF',
    borderRadius: 8,
  },
}
```

`ThemeProvider` 首次 state 读取 bootstrap snapshot，后续调用 `useAntdConfigSetter()` 将完整 `algorithm: [oneAlgorithm]` 与 token 写回；同时更新 document `colorScheme/backgroundColor`。在 `src/app.ts` 用精确 runtime 接口初始化主题：

```ts
export const antd: RuntimeAntdConfig = (memo) => ({
  ...memo,
  theme: createAntdThemeConfig(
    getInitialThemeSnapshot().resolvedTheme,
  ),
});
```

再通过 `rootContainer` 只包 Theme context，不额外创建第二个 ConfigProvider。

- [ ] **Step 7: 运行 focused 和全量门禁**

Run:

```bash
pnpm exec vitest run src/features/theme src/app.test.ts
pnpm lint
pnpm test
pnpm build
```

Expected: theme tests 全绿；既有 Initial State/layout tests 不退化；Webpack compiled successfully。

- [ ] **Step 8: Commit**

```bash
git add config/config.ts config/themePreflight.ts src/app.ts src/app.test.ts src/constants/theme.ts src/types/theme.d.ts src/features/theme
git commit -m "feat(theme): add persistent system-aware color mode"
```

---

### Task 2: Route Registry、分组菜单与品牌化 ProLayout

**Files:**
- Create: `src/constants/route.ts`
- Create: `src/features/navigation/registry.tsx`
- Create: `src/features/navigation/registry.test.tsx`
- Modify: `src/features/navigation/menu.ts`
- Modify: `src/features/navigation/menu.test.ts`
- Modify: `src/features/navigation/index.ts`
- Modify: `src/access.ts`
- Create: `src/access.test.ts`
- Create: `src/components/BrandMark/index.tsx`
- Create: `src/components/BrandMark/index.style.ts`
- Create: `src/components/BrandMark/index.test.tsx`
- Create: `src/features/shell/HeaderActions.tsx`
- Create: `src/features/shell/HeaderTitle.tsx`
- Create: `src/features/shell/MenuBrand.tsx`
- Create: `src/features/shell/index.ts`
- Create: `src/features/shell/index.test.tsx`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`
- Modify: `config/defaultSettings.ts`
- Modify: `src/features/theme/ThemeProvider.tsx`
- Modify: `src/features/theme/ThemeProvider.test.tsx`

**Interfaces:**
- Produces: `APP_PATHS`、`RouteKey`、`ROUTE_REGISTRY`、`isRouteKey(value)`、`getRouteRegistration(value)`。
- Produces: `buildMenuData(items): MenuDataItem[]`，输出“用户端”“管理端”两个 group；未知 key 双重防御过滤。
- Produces: `canAccessAdmin`，只由后端 `navigation` 中已知管理端 routeKey 派生；普通用户不显示管理分组且后续路由 access 拒绝 `/admin/*`。
- Produces: `BrandMark`（登录和侧栏共用）、`HeaderActions`、`HeaderTitle`、`MenuBrand`。
- Consumes: Task 1 的 `ThemeSelector` 与 `ResolvedTheme`，不另建主题状态；仅将 `ResolvedTheme` 投影为 ProComponents `ProProvider.dark`。

- [ ] **Step 1: 查询壳层用到的当前 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info AutoComplete --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Avatar --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Badge --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Tooltip --format json
```

并查当前安装类型：

```bash
rg -n "actionsRender|avatarProps|menuHeaderRender|headerContentRender|siderWidth" node_modules/@ant-design/pro-components -g '*.d.ts'
rg -n "ProConfigProvider|ProProvider" node_modules/@ant-design/pro-components/es/provider -g '*.d.ts' -g '*.js'
```

Expected: 只采用当前类型存在的 ProLayout prop；不使用已无效的 `rightContentRender`。

- [ ] **Step 2: 写 Registry、菜单和壳层失败测试**

Registry 精确覆盖：

```ts
const expectedRoutes = {
  home: ['/home', 'user'],
  tasks: ['/tasks', 'user'],
  workspaces: ['/workspaces', 'user'],
  messages: ['/messages', 'user'],
  teamBoard: ['/team-board', 'user'],
  audit: ['/audit', 'user'],
  admin: ['/admin', 'admin'],
  adminWorkspaces: ['/admin/workspaces', 'admin'],
  adminSkills: ['/admin/skills', 'admin'],
  adminModels: ['/admin/models', 'admin'],
  adminRoles: ['/admin/roles', 'admin'],
  adminUsers: ['/admin/users', 'admin'],
  adminMenus: ['/admin/menus', 'admin'],
} as const;
```

测试每项有 `@ant-design/icons` ReactNode；混乱 order 仍组内排序且不改变输入；`ghost`、`constructor` 被过滤；`/tasks/archived` 与 `/tasks/:taskId` 不在 Registry。`src/access.test.ts` 断言只有用户端 key 时 `canAccessAdmin=false`，任一已知管理端 key 时为 true，伪造未知 key 不能授权。壳层测试渲染 HeaderActions，断言搜索入口、主题入口、消息入口和用户 Avatar；BrandMark 在展开/折叠状态都有“内部研发平台”可访问名。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/features/navigation/registry.test.tsx src/features/navigation/menu.test.ts src/access.test.ts src/features/shell src/components/BrandMark
```

Expected: FAIL，原因是 Registry、BrandMark 和 shell 模块不存在，旧菜单也没有分组/icon。

- [ ] **Step 4: 实现 Route Registry 与分组菜单**

`RouteRegistration` 固定为：

```ts
export type NavigationGroupKey = 'user' | 'admin';

export interface RouteRegistration {
  path: string;
  group: NavigationGroupKey;
  icon: React.ReactNode;
}
```

图标映射固定使用 `HomeOutlined`、`UnorderedListOutlined`、`AppstoreOutlined`、`BellOutlined`、`BarChartOutlined`、`AuditOutlined`、`ControlOutlined`、`ClusterOutlined`、`ReadOutlined`、`RobotOutlined`、`SafetyCertificateOutlined`、`TeamOutlined`、`MenuOutlined`。`buildMenuData` 先过滤、复制、排序，再输出：

```ts
[
  { key: 'group-user', name: '用户端', type: 'group', children: userItems },
  { key: 'group-admin', name: '管理端', type: 'group', children: adminItems },
]
```

空 group 不输出；`admin` 作为“管理概览”首个管理子项。

`src/access.ts` 使用同一 Registry 判定：

```ts
export default function access(initialState?: InitialState) {
  return {
    canAccessAdmin: (initialState?.navigation ?? []).some(
      (item) => getRouteRegistration(item.routeKey)?.group === 'admin',
    ),
  };
}
```

前端 access 只是页面可见性与纵深防御；不得新增独立 role 常量，也不得替代后端 API 授权。

- [ ] **Step 5: 实现 BrandMark 和 ProLayout header 接缝**

`BrandMark` props 固定为：

```ts
export interface BrandMarkProps {
  collapsed?: boolean;
  size?: 'small' | 'default';
  className?: string;
}
```

`HeaderActions` props 固定为 `user?: { name: string } | null`，不得让 shell 组件读取 auth service。Brand 方块使用 token/style，内部为字母 `IP`，不是 emoji。`HeaderActions` 使用 AutoComplete 静态展示“搜索任务、工作区、Artifact”，并组合 ThemeSelector、消息 Button、Avatar；搜索和消息点击只显示静态提示。

`layout` 返回值必须含：

```ts
{
  layout: 'mix',
  navTheme: undefined,
  logo: false,
  title: false,
  siderWidth: 208,
  fixedHeader: true,
  fixSiderbar: true,
  menu: { locale: false, type: 'group', collapsedWidth: 64 },
  menuHeaderRender: (_, __, props) => <MenuBrand collapsed={props?.collapsed} />,
  headerTitleRender: false,
  headerContentRender: () => <HeaderTitle />,
  actionsRender: () => [<HeaderActions key="platform-actions" user={initialState?.me} />],
  menuDataRender: () => buildMenuData(initialState?.navigation ?? []),
}
```

用 ProLayout token 把 header height 设为 52、PageContainer padding 设为 20/24。`defaultSettings` 改为橙色、`layout: 'mix'`、固定 header/sider，并删除固定 `navTheme: 'light'`。runtime 显式返回 `navTheme: undefined` 以覆盖 Umi 生成层的静态默认值；`ThemeProvider` 从公开 `ProProvider` 读取父值后只更新 `dark` 字段，不额外创建 `ConfigProvider`。ProLayout 因而继承同一 resolved theme/algorithm/token，layout 配置不建立第二套 light/dark 状态，也不渲染 `SettingDrawer`。测试要用 `ProProvider` probe 验证 system/light/dark 切换时 `dark` 同步；Task 17 必须用浏览器验证侧栏和 Portal 同步变色。

- [ ] **Step 6: 运行 focused、架构与全量门禁**

Run:

```bash
pnpm exec vitest run src/features/navigation/registry.test.tsx src/features/navigation/menu.test.ts src/access.test.ts src/features/shell src/components/BrandMark src/app.test.ts
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: Registry/menu/shell 全绿；20-edge dependency contract 继续通过；Webpack compiled successfully。

- [ ] **Step 7: Commit**

```bash
git add config/defaultSettings.ts src/access.ts src/access.test.ts src/app.ts src/app.test.ts src/constants/route.ts src/components/BrandMark src/features/navigation src/features/shell src/features/theme/ThemeProvider.tsx src/features/theme/ThemeProvider.test.tsx
git commit -m "feat(shell): add branded navigation and route registry"
```

---

### Task 3: 登录页视觉重构且认证逻辑零漂移

**Files:**
- Modify: `src/pages/Login/index.tsx`
- Create: `src/pages/Login/index.style.ts`
- Create: `src/pages/Login/constant.ts`
- Modify: `src/pages/Login/index.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `ThemeSelector`，Task 2 的 `BrandMark`。
- Preserves: `submit(values): Promise<boolean>` 的顺序 `login → Promise.all(fetchMe, fetchNavigation) → setInitialState → React commit → history.push('/home')`。
- Produces: 双栏登录视觉，不新增账户初始化、密码重置、TOTP 绑定或第二套认证状态。

- [ ] **Step 1: 查询 LoginForm 与表单 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Form --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Input --format json
rg -n "interface LoginFormProps|type LoginFormProps|onFinish" node_modules/@ant-design/pro-components -g '*.d.ts'
```

Expected: 确认当前 `LoginForm<T>` 的 `onFinish` 签名；不改变已验证的提交契约。

- [ ] **Step 2: 扩展既有测试形成 RED**

保留现有所有登录行为测试，再新增可观察视觉断言：

```ts
expect(screen.getByRole('heading', { name: '从需求到交付，一套可追溯的研发工作台' })).toBeInTheDocument();
expect(screen.getByText('Requirement')).toBeInTheDocument();
expect(screen.getByText('Artifact')).toBeInTheDocument();
expect(screen.getByText('Agent Attempt')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '主题设置' })).toBeInTheDocument();
```

另断言页面仍只有“员工编号 / 密码 / TOTP 动态码”三个字段，不出现“重置密码”“首次初始化”“绑定 TOTP”。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/Login/index.test.tsx`

Expected: 新 Hero/主题断言 FAIL；既有认证测试仍通过。

- [ ] **Step 4: 实现双栏登录页**

`constant.ts` 固定展示链路：

```ts
export const DELIVERY_STAGES = [
  'Requirement',
  'Artifact',
  'Agent Attempt',
  'Merge Request',
] as const;
```

页面结构必须为：

```tsx
<main className={styles.page}>
  <section className={styles.hero} aria-labelledby="login-hero-title">
    <BrandMark />
    <p className={styles.eyebrow}>ENGINEERING DELIVERY PLATFORM</p>
    <h1 id="login-hero-title">从需求到交付，一套可追溯的研发工作台</h1>
    <div className={styles.deliveryStages}>{/* DELIVERY_STAGES pills */}</div>
    <small>内部研发平台 · V0.1</small>
  </section>
  <section className={styles.formPane} aria-label="登录表单">
    <div className={styles.themeAction}><ThemeSelector /></div>
    <div className={styles.formCard}>
      <LoginForm<LoginInput> onFinish={submit} title="欢迎回来" subTitle="使用平台账号继续">
        {/* 保留原三个 ProFormText 与原 rules */}
      </LoginForm>
    </div>
  </section>
</main>
```

`index.style.ts` 使用 `createStyles` 和 token；桌面为 Hero + 460px 表单区，表单卡圆角约 14px。Dark 颜色只取 token；不写 `[data-dark]`、`!important` 或内联 hex。

- [ ] **Step 5: 运行登录回归和全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/Login/index.test.tsx
pnpm lint
pnpm test
pnpm build
```

Expected: 原字段校验、错误原文、fail-closed、Initial State React commit 竞态测试全部通过；新视觉断言通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Login
git commit -m "feat(login): align authentication page with platform visuals"
```

---

### Task 4: 共享展示 primitive、工作台与管理概览

**Files:**
- Create: `src/types/presentation.ts`
- Create: `src/components/MetricCard/index.tsx`
- Create: `src/components/MetricCard/index.style.ts`
- Create: `src/components/MetricCard/index.test.tsx`
- Create: `src/components/SemanticTag/index.tsx`
- Create: `src/components/SemanticTag/index.style.ts`
- Create: `src/components/SemanticTag/index.test.tsx`
- Modify: `src/pages/Home/index.tsx`
- Create: `src/pages/Home/type.ts`
- Create: `src/pages/Home/constant.ts`
- Create: `src/pages/Home/index.style.ts`
- Modify: `src/pages/Home/index.test.tsx`
- Modify: `src/pages/Admin/index.tsx`
- Create: `src/pages/Admin/type.ts`
- Create: `src/pages/Admin/constant.ts`
- Create: `src/pages/Admin/index.style.ts`
- Modify: `src/pages/Admin/index.test.tsx`

**Interfaces:**
- Produces: `SemanticTone`、`MetricCard`、`SemanticTag`，只表达视觉语义，不认识业务状态枚举。
- Produces: `/home` 工作台与 `/admin` 管理概览完整静态骨架。
- Consumes: 现有 PageContainer；不请求网络、不新增 Feature/service。

- [ ] **Step 1: 查询卡片、列表、统计组件 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info List --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Progress --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Tag --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Statistic --format json
rg -n "StatisticCard|ProCard" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写 primitive 与页面失败测试**

`SemanticTone` 精确为：

```ts
export type SemanticTone =
  | 'neutral'
  | 'brand'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple';
```

测试 `MetricCard` 渲染 title/value/description；`SemanticTag` 同时有文字与 tone，不把颜色作为唯一状态。Home 测试断言“工作台、待审批、我的任务、运行中 Agent、最近 MR、平台公告”和 4 个 KPI；Admin 测试断言“管理后台概览、系统状态、近期风险”和 6 个管理入口。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/components/MetricCard src/components/SemanticTag src/pages/Home src/pages/Admin
```

Expected: 新 primitive 不存在，Home/Admin 仍为旧单段骨架文案，测试 FAIL。

- [ ] **Step 4: 实现共享 primitive**

Props 固定为：

```ts
export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: React.ReactNode;
  tone?: SemanticTone;
  extra?: React.ReactNode;
}

export interface SemanticTagProps {
  label: string;
  tone: SemanticTone;
  icon?: React.ReactNode;
  monospace?: boolean;
}
```

MetricCard 基于 `StatisticCard`，SemanticTag 基于 `Tag`；tone 到 token/color 的映射只在组件内，页面仍负责把具体状态映射成 tone。

- [ ] **Step 5: 实现 Home 工作台 fixtures 和布局**

`Home/constant.ts` 至少包含以下精确中性数据：

```ts
export const WORKBENCH_METRICS = [
  { title: '待处理 Gate', value: 3, description: '2 个 Requirement · 1 个 Release' },
  { title: '我的进行中任务', value: 8, description: '其中 2 个接近计划边界' },
  { title: '运行中 Agent Attempt', value: 4, description: 'Sandbox 资源健康' },
  { title: '本周已合并 MR', value: 12, description: '全部具备 Trace Evidence' },
] as const;
```

另定义两条审批、三条任务、两条 Agent、两条 MR 和两条公告。页面用四列 KPI + 左右两栏 `ProCard`；1280px 时 KPI 降为两列。每个列表有文字状态 Tag 和可访问 Button/Link，不把整行 div 伪装为按钮。

- [ ] **Step 6: 实现 Admin 概览 fixtures 和布局**

管理入口固定为“工作区管理 / 技能管理 / 模型管理 / 角色管理 / 用户管理 / 菜单管理”，分别链接 Task 2 的 `APP_PATHS`。概览包含 4 个平台 KPI、两条近期风险、PostgreSQL/NATS/Object Storage/Secret Store 四项系统状态；不复制原型角色切换和真实启停逻辑。

- [ ] **Step 7: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/components/MetricCard src/components/SemanticTag src/pages/Home src/pages/Admin
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: 页面 landmark 和 primitive 测试全绿；dependency contract、全量测试与 build 全绿。

- [ ] **Step 8: Commit**

```bash
git add src/types/presentation.ts src/components/MetricCard src/components/SemanticTag src/pages/Home src/pages/Admin
git commit -m "feat(workbench): build platform and admin overviews"
```

---

### Task 5: 任务列表与归档视觉骨架

**Files:**
- Create: `src/hooks/useStaticPrototypeAction.ts`
- Create: `src/hooks/useStaticPrototypeAction.test.tsx`
- Create: `src/components/FilterToolbar/index.tsx`
- Create: `src/components/FilterToolbar/index.style.ts`
- Create: `src/components/FilterToolbar/index.test.tsx`
- Create: `src/pages/Tasks/index.tsx`
- Create: `src/pages/Tasks/Archived.tsx`
- Create: `src/pages/Tasks/TaskList.tsx`
- Create: `src/pages/Tasks/TaskBoard.tsx`
- Create: `src/pages/Tasks/CreateTaskModal.tsx`
- Create: `src/pages/Tasks/AssignTaskSteps.tsx`
- Create: `src/pages/Tasks/type.ts`
- Create: `src/pages/Tasks/constant.ts`
- Create: `src/pages/Tasks/util.ts`
- Create: `src/pages/Tasks/util.test.ts`
- Create: `src/pages/Tasks/index.style.ts`
- Create: `src/pages/Tasks/index.test.tsx`

**Interfaces:**
- Produces: `TaskListPage({ mode: 'active' | 'archived' })`；`Archived.tsx` 只传 `mode="archived"`。
- Produces: `queryTaskRows: NonNullable<ProTableProps<TaskRow>['request']>`，纯本地、不可变。
- Produces: `useStaticPrototypeAction(): (action: string) => void`，统一 message 文案。
- Consumes: MetricCard、SemanticTag、FilterToolbar；不接 service。

- [ ] **Step 1: 查询 Tasks 所需 API 和当前 ProComponents 类型**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Modal --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Segmented --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Steps --format json
rg -n "ProTableProps|ModalFormProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

Expected: 锁定 Modal/Segmented/Steps 以及 ProTable/ModalForm/StepsForm 当前签名。

- [ ] **Step 2: 写 adapter、共享交互与页面失败测试**

`TaskRow` 固定字段：

```ts
export interface TaskRow {
  id: string;
  title: string;
  workspace: string;
  stage: 'Clarification' | 'Spec' | 'Plan' | 'Implementation' | 'Review';
  status: 'pending' | 'running' | 'blocked' | 'completed';
  owner: string;
  updatedAt: string;
}
```

共享接口固定为：

```ts
export interface FilterToolbarProps {
  ariaLabel: string;
  filters?: React.ReactNode;
  search?: React.ReactNode;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
}

```

`util.test.ts` 覆盖 keyword + status 组合筛选、updatedAt ascend/descend、分页、无匹配、fixture 冻结后不变、返回新数组以及 global fetch 0 次调用。页面测试覆盖：表格默认可见；点击“看板”只显示阶段列；切回后原 rows 仍在；创建 Modal 合法提交只提示并关闭、行数不变；“分配任务”StepsForm 必须先选成员再确认仓库，最终只提示且 owner 不变；归档页显示“只读”且无创建入口。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/hooks/useStaticPrototypeAction.test.tsx src/components/FilterToolbar src/pages/Tasks
```

Expected: FAIL，原因是模块尚不存在。

- [ ] **Step 4: 实现静态 action 和 FilterToolbar**

Hook 固定实现语义：

```ts
const showStaticAction = (action: string) => {
  message.info(`静态原型操作：${action}，未保存任何业务数据。`);
};
```

FilterToolbar 在 1280px 下允许换行；不重写 ProTable、Modal、Steps 或表单控件。

- [ ] **Step 5: 实现 Tasks ProTable、本地 request 与看板**

fixtures 至少包含 `REQ-2026-0142`、`REQ-2026-0138`、`REQ-2026-0129`，覆盖 running/blocked/completed 和不同 stage。`queryTaskRows` 的结果必须为：

```ts
return {
  data: filtered.slice(offset, offset + pageSize),
  success: true,
  total: filtered.length,
};
```

ProTable 明确 `request={queryTaskRows}`、`rowKey="id"`、`scroll={{ x: 1100 }}`。Segmented 在 table/board 间切换并保留搜索与 status UI state。CreateTaskModal 使用 `ModalForm`，包含标题、Workspace、目标仓库、说明四项；提交只 message + close。AssignTaskSteps 使用 `StepsForm` 两步：“选择成员”必填 employeeId，“确认仓库”必填 repository；最终调用静态 action 后关闭，禁止写回 owner/repository fixture。

- [ ] **Step 6: 运行 focused、架构和全量门禁**

Run:

```bash
pnpm exec vitest run src/hooks/useStaticPrototypeAction.test.tsx src/components/FilterToolbar src/pages/Tasks
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: adapter、表格/看板、Modal/StepsForm 全绿；无网络请求；全量门禁通过。

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useStaticPrototypeAction.ts src/hooks/useStaticPrototypeAction.test.tsx src/components/FilterToolbar src/pages/Tasks
git commit -m "feat(tasks): add task list and archive skeletons"
```

---

### Task 6: 任务详情、Artifact 与 Diff 视觉骨架

**Files:**
- Create: `src/components/DetailDrawer/index.tsx`
- Create: `src/components/DetailDrawer/index.test.tsx`
- Create: `src/pages/TaskDetail/index.tsx`
- Create: `src/pages/TaskDetail/ConversationPane.tsx`
- Create: `src/pages/TaskDetail/InspectorPanel.tsx`
- Create: `src/pages/TaskDetail/DiffContent.tsx`
- Create: `src/pages/TaskDetail/PreviewFrame.tsx`
- Create: `src/pages/TaskDetail/RejectApprovalModal.tsx`
- Create: `src/pages/TaskDetail/type.ts`
- Create: `src/pages/TaskDetail/constant.ts`
- Create: `src/pages/TaskDetail/index.style.ts`
- Create: `src/pages/TaskDetail/index.test.tsx`

**Interfaces:**
- Produces: `DetailDrawer<TRecord extends Record<string, any>>`，泛型约束与当前 `ProDescriptionsProps` 一致，可接受无索引签名的业务 interface；内部固定使用 Ant Design `Drawer + ProDescriptions`，只暴露只读详情所需字段。Artifact 使用 `size={560}`，Task 10 的 Audit 复用同一组件。
- Produces: Diff 直接使用 Ant Design `Drawer` 与 `size={880}`，不通过 `DetailDrawer` 承载非结构化 Diff。
- Produces: 五个 Inspector Tab“总览 / 文档 / 代码 / 执行 / 预览”。
- Consumes: Task 5 的 static action hook；使用 Ant Design X 静态 Bubble/Sender，不接 Chat/模型服务。

- [ ] **Step 1: 查询 Drawer/Tabs 与 Ant Design X 当前类型**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Drawer --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Tabs --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Dropdown --format json
rg -n "ProDescriptionsProps|ProDescriptionsColumn" node_modules/@ant-design/pro-components -g '*.d.ts'
rg -n "Bubble|Sender" node_modules/@ant-design/x -g '*.d.ts' | head -80
```

Expected: Drawer 使用 `size` 和 `destroyOnHidden`；不使用 deprecated `destroyOnClose`。

- [ ] **Step 2: 写 DetailDrawer 与 Task Detail 失败测试**

`src/components/DetailDrawer/index.test.tsx` 使用包含 `valueType: 'text'`、`copyable: true` 的 columns，验证关闭时无详情、打开后标题/字段可见、关闭回调触发、`destroyOnHidden` 生效，且没有表单或提交按钮。Task Detail 测试 task ID、五个 Tab 的选中 panel、驳回审批 Modal、Artifact 560 Drawer、Diff 880 Drawer、disabled Sender、Drawer 关闭及 fixture/对话不变。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/components/DetailDrawer src/pages/TaskDetail
```

Expected: FAIL，DetailDrawer 与 TaskDetail 模块尚不存在。

- [ ] **Step 4: 封装只读 DetailDrawer 并实现任务详情双栏**

`DetailDrawer` 只接受结构化只读字段，精确接口为：

```tsx
import type { ReactNode } from 'react';
import { Drawer, type DrawerProps } from 'antd';
import {
  ProDescriptions,
  type ProDescriptionsProps,
} from '@ant-design/pro-components';

export interface DetailDrawerProps<TRecord extends Record<string, any>> {
  open: boolean;
  title: ReactNode;
  size?: DrawerProps['size'];
  onClose: NonNullable<DrawerProps['onClose']>;
  dataSource?: TRecord;
  columns: NonNullable<ProDescriptionsProps<TRecord>['columns']>;
  column?: ProDescriptionsProps<TRecord>['column'];
  extra?: DrawerProps['extra'];
}

export function DetailDrawer<TRecord extends Record<string, any>>({
  open,
  title,
  size,
  onClose,
  dataSource,
  columns,
  column = 1,
  extra,
}: DetailDrawerProps<TRecord>) {
  return (
    <Drawer
      open={open}
      title={title}
      size={size}
      onClose={onClose}
      extra={extra}
      destroyOnHidden
    >
      {dataSource ? (
        <ProDescriptions<TRecord>
          bordered
          size="small"
          column={column}
          dataSource={dataSource}
          columns={columns}
        />
      ) : null}
    </Drawer>
  );
}
```

组件不得暴露 `request`、`editable`、`formProps` 或 `onDataSourceChange`，确保只读。`ArtifactRecord` 定义在 `type.ts`，`artifactColumns: NonNullable<ProDescriptionsProps<ArtifactRecord>['columns']>` 与静态记录定义在 `constant.ts`。Artifact 通过 `DetailDrawer` 复用 Ant Design mask/focus management；Diff 直接使用 Ant Design Drawer，内部使用 `ProCard + List + Typography/pre`。页面根结构：

```tsx
<PageContainer title={`任务 ${taskId}`} extra={topActions}>
  <div className={styles.detailGrid}>
    <ConversationPane />
    <InspectorPanel activeKey={activeTab} onChange={setActiveTab} />
  </div>
  <DetailDrawer<ArtifactRecord>
    size={560}
    open={artifactOpen}
    title="Artifact 文档"
    onClose={closeArtifact}
    dataSource={selectedArtifact}
    columns={artifactColumns}
  />
  <Drawer size={880} open={diffOpen} title="代码 Diff" onClose={closeDiff} destroyOnHidden>
    <DiffContent />
  </Drawer>
</PageContainer>
```

右侧 Inspector 为 344px；ConversationPane 用阶段分隔 + 静态 `Bubble.List`，底部 `Sender disabled` 明示“静态原型，不会发送消息”。

- [ ] **Step 5: 实现五 Tabs、浮层与 1280px 动作收纳**

顶部只保留一个主 Button，其余“分配任务 / 驳回审批 / 查看 Artifact / 查看完整 Diff”进入 Dropdown。“驳回审批”打开 RejectApprovalModal，必填原因后只提示并关闭，任务状态和对话不变。PreviewFrame 自带固定浅色隔离背景，不随平台 dark 反色。Diff 用语义 token 表达增删并同时显示 `+/-` 文本。

- [ ] **Step 6: 运行 focused、架构和全量门禁**

Run:

```bash
pnpm exec vitest run src/components/DetailDrawer src/pages/TaskDetail
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: Tabs、Modal、Drawers、Bubble/Sender 和不变性测试全绿；全量门禁通过。

- [ ] **Step 7: Commit**

```bash
git add src/components/DetailDrawer src/pages/TaskDetail
git commit -m "feat(tasks): add task detail and artifact views"
```

---

### Task 7: 工作区视觉骨架

**Files:**
- Create: `src/pages/Workspaces/index.tsx`
- Create: `src/pages/Workspaces/WorkspaceSelector.tsx`
- Create: `src/pages/Workspaces/MemberPanel.tsx`
- Create: `src/pages/Workspaces/RepositoryPanel.tsx`
- Create: `src/pages/Workspaces/SettingsPanel.tsx`
- Create: `src/pages/Workspaces/type.ts`
- Create: `src/pages/Workspaces/constant.ts`
- Create: `src/pages/Workspaces/index.style.ts`
- Create: `src/pages/Workspaces/index.test.tsx`

**Interfaces:**
- Produces: Workspace selector + “成员 / 仓库 / 设置” Tabs，全部状态仅存在当前页面。
- Consumes: `SemanticTag`、`MetricCard`、`useStaticPrototypeAction`；不新建 service。

- [ ] **Step 1: 查询 Tabs、List 与选择器 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Tabs --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info List --format json
rg -n "ProList" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写页面失败测试**

Workspaces 测试断言：默认选中“Platform Core”，默认 MemberPanel；切换“仓库”显示 `engineering-platform` 和 `main`；切换“设置”显示 GitLab Connection 与 Workspace Policy；切换到“Agent Runtime”更新成员/仓库内容；点击“添加成员”打开 Modal，提交只提示且成员数不变。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/pages/Workspaces/index.test.tsx
```

Expected: FAIL，页面模块尚不存在。

- [ ] **Step 4: 实现 Workspaces 主从布局**

`WorkspaceFixture` 固定字段：

```ts
export interface WorkspaceFixture {
  id: string;
  name: string;
  description: string;
  members: readonly { employeeId: string; name: string; role: string }[];
  repositories: readonly { name: string; defaultBranch: string; status: string }[];
}
```

fixtures 为 `Platform Core` 与 `Agent Runtime`。页面左列用 ProList/可访问 Button 选择 Workspace，右列用 Tabs 切换 MemberPanel、RepositoryPanel、SettingsPanel。设置动作、添加成员和更新 GitLab Connection 都经静态 action hook；关闭重开后 fixture 不变。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/Workspaces/index.test.tsx
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: Tabs、Workspace 选择器、Modal 与不变性断言全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Workspaces
git commit -m "feat(workspace): add workspace collaboration skeleton"
```

---

### Task 8: 消息中心视觉骨架

**Files:**
- Create: `src/pages/Messages/index.tsx`
- Create: `src/pages/Messages/type.ts`
- Create: `src/pages/Messages/constant.ts`
- Create: `src/pages/Messages/index.style.ts`
- Create: `src/pages/Messages/index.test.tsx`

**Interfaces:**
- Produces: Message category `all | gate | agent | mr | system` 的本地筛选。
- Consumes: `SemanticTag` 与 `useStaticPrototypeAction`；不新建 service。

- [ ] **Step 1: 查询 Segmented、List 与 Empty API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Segmented --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info List --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Empty --format json
```

- [ ] **Step 2: 写页面失败测试**

测试五个分类可见；选择“Gate”只显示 Gate 消息，选择“Agent”只显示 Agent Attempt 消息；无匹配显示 Empty；点击“全部标为已读”只提示，重新选择分类后未读 Badge 数量不变。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/Messages/index.test.tsx`

Expected: FAIL，Messages 模块尚不存在。

- [ ] **Step 4: 实现分类与紧凑列表**

`MessageCategory` 为 `all | gate | agent | mr | system`；fixtures 每类至少一条，字段为 `id/category/title/description/time/unread/tone`。Segmented 标签固定“全部 / Gate / Agent / MR / 系统”，列表行使用 Badge + SemanticTag + 时间，不用点击 span。全部已读 Button 不修改 `unread`。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/Messages/index.test.tsx
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: 分类筛选、Empty 和未读 fixture 不变性断言全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Messages
git commit -m "feat(messages): add notification center skeleton"
```

---

### Task 9: 团队看板与轻量图形 primitive

**Files:**
- Create: `src/components/MiniBarChart/index.tsx`
- Create: `src/components/MiniBarChart/index.style.ts`
- Create: `src/components/MiniBarChart/index.test.tsx`
- Create: `src/components/DistributionBar/index.tsx`
- Create: `src/components/DistributionBar/index.style.ts`
- Create: `src/components/DistributionBar/index.test.tsx`
- Create: `src/pages/TeamBoard/index.tsx`
- Create: `src/pages/TeamBoard/type.ts`
- Create: `src/pages/TeamBoard/constant.ts`
- Create: `src/pages/TeamBoard/index.style.ts`
- Create: `src/pages/TeamBoard/index.test.tsx`

**Interfaces:**
- Produces: `MiniBarChart` 和 `DistributionBar`，用 CSS Grid/Progress + 文本 Legend，无图表依赖。
- Produces: Team 切换驱动 KPI/吞吐/阶段分布/成员负载/阻塞事项的本地展示。
- Consumes: Task 4 的 MetricCard、SemanticTag；不新增 chart dependency。

- [ ] **Step 1: 查询 Progress 与 Segmented API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Progress --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Segmented --format json
```

- [ ] **Step 2: 写 primitive 与页面失败测试**

MiniBarChart 测试断言 `aria-label` 与每个 datum 的 label/valueLabel 均可读取；DistributionBar 断言所有 legend 有文本且总宽度按 value 比例表达，不只用颜色。TeamBoard 测试切换 Team 后 KPI 和成员列表改变。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/components/MiniBarChart src/components/DistributionBar src/pages/TeamBoard
```

Expected: FAIL，模块尚不存在。

- [ ] **Step 4: 实现可访问 mini chart**

接口固定为：

```ts
export interface MiniBarDatum {
  key: string;
  label: string;
  value: number;
  valueLabel?: string;
  tone?: SemanticTone;
}

export interface MiniBarChartProps {
  ariaLabel: string;
  data: readonly MiniBarDatum[];
  height?: number;
  highlightKey?: string;
}

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
  tone: SemanticTone;
}

export interface DistributionBarProps {
  ariaLabel: string;
  items: readonly DistributionItem[];
  showLegend?: boolean;
}
```

柱/段使用 token 派生色，Legend 同时写 label/value；`prefers-reduced-motion: reduce` 下移除过渡。

- [ ] **Step 5: 实现 TeamBoard**

Team fixtures 固定 `Platform`、`Agent Runtime`、`Delivery Governance` 三组，每组含 4 KPI、7 日吞吐、五阶段分布、3 名成员负载和阻塞事项。页面用 Segmented 切 Team；KPI 由 MetricCard，吞吐用 MiniBarChart，阶段用 DistributionBar，成员负载用 Progress + 文字百分比。

- [ ] **Step 6: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/components/MiniBarChart src/components/DistributionBar src/pages/TeamBoard
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: 图形文本替代与 Team 切换全绿；package.json 无新增 chart dependency。

- [ ] **Step 7: Commit**

```bash
git add src/components/MiniBarChart src/components/DistributionBar src/pages/TeamBoard
git commit -m "feat(team): add delivery team dashboard"
```

---

### Task 10: 审计看板与详情 Drawer

**Files:**
- Create: `src/pages/Audit/index.tsx`
- Create: `src/pages/Audit/type.ts`
- Create: `src/pages/Audit/constant.ts`
- Create: `src/pages/Audit/util.ts`
- Create: `src/pages/Audit/util.test.ts`
- Create: `src/pages/Audit/index.style.ts`
- Create: `src/pages/Audit/index.test.tsx`

**Interfaces:**
- Produces: `queryAuditRows: NonNullable<ProTableProps<AuditRow>['request']>`，Audit 详情 columns 由 `constant.ts` 提供。
- Consumes: Task 4/5/9 的 MetricCard、SemanticTag、FilterToolbar、MiniBarChart 和 static action hook；复用 Task 6 的 `DetailDrawer<AuditRow>`，设置 `size={460}`。

- [ ] **Step 1: 查询 Drawer、Descriptions 与 Table API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Drawer --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Descriptions --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Table --format json
rg -n "ProDescriptions|ProTableProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写 adapter 与页面失败测试**

Audit adapter 测试组合筛选 `range/action/risk/keyword`、分页、排序、fixture 不变和 fetch 0 次；页面测试点击“查看详情”打开“审计事件详情”Drawer，关闭后消失，点击导出只提示且 rows 不变。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/Audit`

Expected: FAIL，Audit 模块尚不存在。

- [ ] **Step 4: 实现 Audit ProTable 与详情**

`AuditRow` 字段固定：

```ts
export interface AuditRow {
  id: string;
  occurredAt: string;
  actor: string;
  action: 'Capability Activate' | 'Artifact Accept' | 'Promotion' | 'Config Publish';
  target: string;
  risk: 'low' | 'medium' | 'high';
  correlationId: string;
  result: 'success' | 'rejected';
}
```

ProTable 使用本地 request、`scroll={{ x: 1180 }}` 和 FilterToolbar。行操作将选中行传给 `DetailDrawer<AuditRow>`，设置 `size={460}`，用 `ProDescriptions` columns 展示精确字段；Correlation ID 使用 monospace。导出与保存筛选只静态提示。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/Audit
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: adapter、统计、图形、Drawer 与不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/Audit
git commit -m "feat(audit): add audit dashboard and detail drawer"
```

---

### Task 11: 工作区管理页面

**Files:**
- Create: `src/pages/AdminWorkspaces/index.tsx`
- Create: `src/pages/AdminWorkspaces/WorkspaceModal.tsx`
- Create: `src/pages/AdminWorkspaces/type.ts`
- Create: `src/pages/AdminWorkspaces/constant.ts`
- Create: `src/pages/AdminWorkspaces/util.ts`
- Create: `src/pages/AdminWorkspaces/util.test.ts`
- Create: `src/pages/AdminWorkspaces/index.style.ts`
- Create: `src/pages/AdminWorkspaces/index.test.tsx`

**Interfaces:**
- Produces: Workspace Management ProTable 与 `queryWorkspaceRows: NonNullable<ProTableProps<WorkspaceRow>['request']>`。
- Consumes: FilterToolbar、SemanticTag 和 static action hook；任何新增、编辑只反馈，不写 fixture。

- [ ] **Step 1: 查询管理页组件 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Select --format json
rg -n "ModalFormProps|ProTableProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写页面失败测试和 adapter 测试**

测试搜索/状态筛选/分页、`scroll.x`、创建 Modal、编辑动作与行数不变。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/pages/AdminWorkspaces
```

Expected: FAIL，页面模块尚不存在。

- [ ] **Step 4: 实现 AdminWorkspaces**

类型固定为：

```ts
export interface WorkspaceRow {
  id: string;
  name: string;
  owner: string;
  memberCount: number;
  repositoryCount: number;
  status: 'active' | 'restricted';
  updatedAt: string;
}
```

fixtures 为 Platform Core、Agent Runtime、Delivery Governance。ProTable 使用 `scroll={{ x: 1050 }}`；创建 Modal 字段为名称、Owner、默认 Team、说明；查看/编辑均为视觉动作且不修改 rows。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminWorkspaces
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: ProTable adapter、Modal 与 fixture 不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminWorkspaces
git commit -m "feat(admin): add workspace management view"
```

---

### Task 12: 技能管理页面

**Files:**
- Create: `src/pages/AdminSkills/index.tsx`
- Create: `src/pages/AdminSkills/SkillModal.tsx`
- Create: `src/pages/AdminSkills/type.ts`
- Create: `src/pages/AdminSkills/constant.ts`
- Create: `src/pages/AdminSkills/index.style.ts`
- Create: `src/pages/AdminSkills/index.test.tsx`

**Interfaces:**
- Produces: Skill card catalog；新增、编辑、发版、停用和归档只反馈，不写 fixture。
- Consumes: ProCard、SemanticTag 与 static action hook。

- [ ] **Step 1: 查询 Card 与 Modal API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Card --format json
rg -n "ModalFormProps|ProCard" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写页面失败测试**

测试 active/deprecated Tag、打开新增和编辑 Modal、合法静态提交、点击启停/发版后 card 集合与 status 不变。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/AdminSkills`

Expected: FAIL，AdminSkills 模块尚不存在。

- [ ] **Step 4: 实现 Skill catalog**

Skill fixture 字段为 `key/name/version/description/status/owner/updatedAt`，至少包含 `requirement-clarifier`、`implementation-planner`、`code-reviewer`。用 ProCard 网格 + SemanticTag；新增/编辑 Modal 字段为名称、Key、版本、说明；发版/停用/归档只提示。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminSkills
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: Catalog、Modal 和 fixture 不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminSkills
git commit -m "feat(admin): add skill management view"
```

---

### Task 13: 模型管理页面

**Files:**
- Create: `src/pages/AdminModels/index.tsx`
- Create: `src/pages/AdminModels/ModelCatalog.tsx`
- Create: `src/pages/AdminModels/ModelUsagePanel.tsx`
- Create: `src/pages/AdminModels/ModelEvaluationPanel.tsx`
- Create: `src/pages/AdminModels/ModelModal.tsx`
- Create: `src/pages/AdminModels/type.ts`
- Create: `src/pages/AdminModels/constant.ts`
- Create: `src/pages/AdminModels/util.ts`
- Create: `src/pages/AdminModels/util.test.ts`
- Create: `src/pages/AdminModels/index.style.ts`
- Create: `src/pages/AdminModels/index.test.tsx`

**Interfaces:**
- Produces: Model “模型目录 / 调用看板 / 模型评测” Tabs 与 `queryModelRows: NonNullable<ProTableProps<ModelRow>['request']>`。
- Consumes: MetricCard、SemanticTag、MiniBarChart、DistributionBar 和 static action hook。

- [ ] **Step 1: 查询 Tabs 与表格 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Tabs --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Select --format json
rg -n "ModalFormProps|ProTableProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写 adapter 与页面失败测试**

测试三个 Tabs；目录 adapter 的搜索/状态/分页/排序/不变性/fetch 0 次；调用看板可访问图形；评测表格；接入模型 Modal 静态提交后 rows 不变。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/AdminModels`

Expected: FAIL，AdminModels 模块尚不存在。

- [ ] **Step 4: 实现 Model 管理三 Tabs**

```ts
export interface ModelRow {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  status: 'active' | 'evaluation' | 'disabled';
  purpose: string;
  updatedAt: string;
}
```

目录使用 ProTable `scroll={{ x: 1120 }}`，调用看板使用 4 KPI + MiniBarChart/DistributionBar，评测使用本地表格。Tabs 切换不发请求；接入/编辑 Model Modal 只保存到表单临时 state 并在关闭时丢弃。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminModels
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: 三 Tabs、adapter、图形、Modal 与不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminModels
git commit -m "feat(admin): add model management view"
```

---

### Task 14: 角色管理页面

**Files:**
- Create: `src/pages/AdminRoles/index.tsx`
- Create: `src/pages/AdminRoles/CapabilityMatrix.tsx`
- Create: `src/pages/AdminRoles/RoleModal.tsx`
- Create: `src/pages/AdminRoles/type.ts`
- Create: `src/pages/AdminRoles/constant.ts`
- Create: `src/pages/AdminRoles/index.style.ts`
- Create: `src/pages/AdminRoles/index.test.tsx`

**Interfaces:**
- Produces: Role selector + Capability matrix；管理操作只改变当前临时选择，不修改 fixtures。
- Consumes: SemanticTag、static action hook 和架构 Capability terminology。

- [ ] **Step 1: 查询 Checkbox 与表单 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Checkbox --format json
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Form --format json
rg -n "ModalFormProps|ProList|CheckCard" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写页面失败测试**

测试选择“Workspace Admin”后能力矩阵变化；勾选能力只改变临时 UI，切换角色再切回恢复 fixture；新建角色 Modal 提交只提示。

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/pages/AdminRoles
```

Expected: FAIL，页面模块尚不存在。

- [ ] **Step 4: 实现 Role selector 与 Capability matrix**

类型固定为：

```ts
export interface RoleFixture {
  id: string;
  name: string;
  description: string;
  capabilities: readonly string[];
  memberCount: number;
}
```

fixtures 为 Platform Admin、Workspace Admin、Developer、Reviewer。能力按 Requirement、Artifact、Execution、Promotion 四组呈现，使用 Checkbox.Group/CheckCard；选择 state 在 role 改变时从 fixture 重建。保存、新建、删除只静态提示。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminRoles
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: Role 选择、能力临时 state、Modal 和 fixture 不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminRoles
git commit -m "feat(admin): add role capability management view"
```

---

### Task 15: 用户管理页面

**Files:**
- Create: `src/pages/AdminUsers/index.tsx`
- Create: `src/pages/AdminUsers/UserModal.tsx`
- Create: `src/pages/AdminUsers/type.ts`
- Create: `src/pages/AdminUsers/constant.ts`
- Create: `src/pages/AdminUsers/util.ts`
- Create: `src/pages/AdminUsers/util.test.ts`
- Create: `src/pages/AdminUsers/index.style.ts`
- Create: `src/pages/AdminUsers/index.test.tsx`

**Interfaces:**
- Produces: User ProTable 与 `queryUserRows: NonNullable<ProTableProps<UserRow>['request']>`。
- Consumes: FilterToolbar、SemanticTag 和 static action hook。

- [ ] **Step 1: 查询表格、Select 与 ModalForm API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Select --format json
rg -n "ModalFormProps|ProTableProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写 adapter 与页面失败测试**

测试 keyword/status/role 组合、分页、排序、fixture 不变和 fetch 0 次；页面测试新增/编辑 Modal 与禁用/重置动作不改变 rows。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/AdminUsers`

Expected: FAIL，AdminUsers 模块尚不存在。

- [ ] **Step 4: 实现 User ProTable**

```ts
export interface UserRow {
  employeeId: string;
  name: string;
  email: string;
  roles: readonly string[];
  status: 'active' | 'disabled';
  lastActiveAt: string;
}
```

使用至少 4 条中性 fixture。ProTable 使用 `scroll={{ x: 1120 }}` 和本地 request。UserModal 字段为员工编号、姓名、邮箱、角色、状态；新增/编辑/禁用/重置凭据只提示，不新增行、不改变 status。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminUsers
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: adapter、表格、Modal 和 fixture 不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminUsers
git commit -m "feat(admin): add user management view"
```

---

### Task 16: 菜单管理页面

**Files:**
- Create: `src/pages/AdminMenus/index.tsx`
- Create: `src/pages/AdminMenus/MenuModal.tsx`
- Create: `src/pages/AdminMenus/type.ts`
- Create: `src/pages/AdminMenus/constant.ts`
- Create: `src/pages/AdminMenus/util.ts`
- Create: `src/pages/AdminMenus/util.test.ts`
- Create: `src/pages/AdminMenus/index.style.ts`
- Create: `src/pages/AdminMenus/index.test.tsx`

**Interfaces:**
- Produces: 用户端/管理端 Menu ProTable 与 `queryMenuRows: NonNullable<ProTableProps<MenuRow>['request']>`。
- Consumes: FilterToolbar、SemanticTag、static action hook 和 Task 2 的 `RouteKey`/Registry。

- [ ] **Step 1: 查询 Switch 与表格 API**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh info Switch --format json
rg -n "ModalFormProps|ProTableProps" node_modules/@ant-design/pro-components -g '*.d.ts'
```

- [ ] **Step 2: 写 adapter 与页面失败测试**

测试 user/admin group、order 排序、visible 筛选、fixture 不变和 fetch 0 次；点击 Switch 只提示，重新筛选后 fixture `visible` 不变；新增/编辑 Modal 不新增 row。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm exec vitest run src/pages/AdminMenus`

Expected: FAIL，AdminMenus 模块尚不存在。

- [ ] **Step 4: 实现 Menu ProTable**

```ts
export interface MenuRow {
  key: RouteKey;
  name: string;
  path: string;
  group: 'user' | 'admin';
  order: number;
  visible: boolean;
}
```

数据直接对应 13 个 Registry key 的展示副本，但不反向修改 Registry。ProTable 使用 `scroll={{ x: 1050 }}`；group 显示“用户端/管理端”，Switch 受控于 fixture。新增/编辑/顺序/显示切换都只提示。

- [ ] **Step 5: 运行 focused 与全量门禁**

Run:

```bash
pnpm exec vitest run src/pages/AdminMenus
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: adapter、表格、Switch、Modal 和 fixture 不变性测试全绿；全量门禁通过。

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminMenus
git commit -m "feat(admin): add menu management view"
```

---

### Task 17: 完整路由、管理员菜单授权、mock navigation 与发布前验收

**Files:**
- Modify: `config/routes.ts`
- Create: `src/routes.test.ts`
- Modify: `mock/handlers.ts`
- Modify: `mock/handlers.test.ts`
- Modify: `mock/api.test.ts`
- Modify: `src/features/navigation/menu.test.ts`
- Modify: `src/app.test.ts`

**Interfaces:**
- Consumes: Tasks 2–16 的 Registry 和全部 page default exports。
- Produces: 16 个最终路由；`/home`、`/admin` 保持真实页面，`/tasks/archived` 先于 `/tasks/:taskId`。
- Produces: 管理端路由 `access: 'canAccessAdmin'`；用户端 navigation 不显示管理分组，管理员 navigation 才显示并可进入。
- Produces: 当前开发 mock 用户的 13-key 完整管理员 navigation；不增加 role 字段或前端授权真相源。

- [ ] **Step 1: 写完整路由和 mock navigation 失败测试**

`src/routes.test.ts` 递归收集 route，精确断言：

```ts
const expectedComponents = {
  '/login': './Login',
  '/home': './Home',
  '/tasks': './Tasks',
  '/tasks/archived': './Tasks/Archived',
  '/tasks/:taskId': './TaskDetail',
  '/workspaces': './Workspaces',
  '/messages': './Messages',
  '/team-board': './TeamBoard',
  '/audit': './Audit',
  '/admin': './Admin',
  '/admin/workspaces': './AdminWorkspaces',
  '/admin/skills': './AdminSkills',
  '/admin/models': './AdminModels',
  '/admin/roles': './AdminRoles',
  '/admin/users': './AdminUsers',
  '/admin/menus': './AdminMenus',
} as const;
```

另断言 `/login` 为 `layout:false`；根 route 仍用 `@/features/auth/RouteGuard`；root redirect `/home`；全部 `/admin` route 的 `access` 精确为 `canAccessAdmin`；归档/详情 `hideInMenu:true`、`parentKeys:['/tasks']`，且 archived 在 dynamic route 前。

mock 失败测试期望完整 navigation：

```ts
[
  ['home', '工作台'],
  ['tasks', '任务'],
  ['workspaces', '工作区'],
  ['messages', '消息中心'],
  ['teamBoard', '团队看板'],
  ['audit', '审计看板'],
  ['admin', '管理概览'],
  ['adminWorkspaces', '工作区管理'],
  ['adminSkills', '技能管理'],
  ['adminModels', '模型管理'],
  ['adminRoles', '角色管理'],
  ['adminUsers', '用户管理'],
  ['adminMenus', '菜单管理'],
]
```

`order` 为 1–13，仍位于 `{ code: 200, data, message: 'ok' }` 信封内。

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/routes.test.ts mock/handlers.test.ts mock/api.test.ts src/features/navigation/menu.test.ts src/app.test.ts
```

Expected: FAIL，当前 route config/mock 仍只有 `/home`、`/admin` 与两个 navigation item。

- [ ] **Step 3: 接入全部路由并绑定管理端 access**

`config/routes.ts` 的受保护 children 按以下顺序写入：

```ts
{ path: '/', redirect: '/home' },
{ name: '工作台', path: '/home', component: './Home' },
{ name: '任务', path: '/tasks', component: './Tasks' },
{
  name: '归档任务',
  path: '/tasks/archived',
  component: './Tasks/Archived',
  hideInMenu: true,
  parentKeys: ['/tasks'],
},
{
  name: '任务详情',
  path: '/tasks/:taskId',
  component: './TaskDetail',
  hideInMenu: true,
  parentKeys: ['/tasks'],
},
{ name: '工作区', path: '/workspaces', component: './Workspaces' },
{ name: '消息中心', path: '/messages', component: './Messages' },
{ name: '团队看板', path: '/team-board', component: './TeamBoard' },
{ name: '审计看板', path: '/audit', component: './Audit' },
```

随后写入 7 个 admin route，每项带 `access: 'canAccessAdmin'`。不得把 `/admin` 改成 redirect。

- [ ] **Step 4: 扩展 mock navigation 与菜单测试**

`navigationHandler` 返回 13 项完整成功信封。menu/app 测试分别覆盖：

```ts
expect(buildMenuData(userOnlyNavigation)).not.toContainEqual(
  expect.objectContaining({ name: '管理端' }),
);
expect(buildMenuData(adminNavigation)).toContainEqual(
  expect.objectContaining({ name: '管理端' }),
);
```

mock 当前用户代表管理员，用于完整 UI smoke；普通用户场景只通过 navigation/access 单元测试表达，不伪造第二个登录协议。

- [ ] **Step 5: 运行 route/page focused tests 和 build**

Run:

```bash
pnpm exec vitest run src/routes.test.ts src/pages mock/handlers.test.ts mock/api.test.ts src/features/navigation src/access.test.ts src/app.test.ts
pnpm depcruise
pnpm lint
pnpm test
pnpm build
```

Expected: 每个 page test 至少断言唯一标题或主 Landmark；route 与 Registry 一致；普通用户不见/不可进管理端；build 解析全部 component path。

- [ ] **Step 6: 运行 Ant Design 专项检查**

Run:

```bash
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh usage src
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh lint src --only deprecated
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh lint src --only a11y
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh lint src --only usage
NO_UPDATE_CHECK=1 pnpm exec antd --version 6.4.4 --lang zh doctor
```

Expected: 无 deprecated/a11y/usage issue；如 CLI 报告问题，回到所属任务用 RED/GREEN 修复，不以忽略规则掩盖。

- [ ] **Step 7: 运行全部发布前质量门**

逐条运行并记录结果：

```bash
pnpm depcruise
pnpm lint
pnpm test
pnpm build
pnpm doctor
pnpm test:coverage
git diff --check
```

Expected: 前六条 exit 0；coverage 报告包含新增 theme、navigation、shared components 与 pages，检查后不得出现明显未执行的核心交互分支；`git diff --check` 无 whitespace error。

- [ ] **Step 8: 运行 1440×900 fresh-profile 浏览器验收**

Run: `pnpm dev`

用全新 Chrome profile 完成以下有界清单：

1. 无 Cookie 访问 `/tasks/REQ-2026-0142` 与 `/admin/models` 都 replace 到 `/login`。
2. 登录页 light/dark 无闪烁，三字段校验与错误反馈正确。
3. 使用 `00000000 / 任意非空密码 / 123456` 登录到 `/home`，侧栏展开 208px、顶栏 52px。
4. 13 个管理员 mock 菜单全部可导航，Console 无 Runtime error；从 Tasks 进入 archived/detail 时 Tasks 保持 active。
5. system 随 OS 变化；选 light/dark 后刷新保留且忽略 OS；恢复 system 后 storage key 被删除并继续响应系统。
6. Dark 下打开 Dropdown、Select、message、创建任务 Modal、Artifact/Diff/Audit Drawer，确认没有浅色孤岛。
7. Tasks 表格/看板、Task Detail 五 Tabs、Workspace Tabs、Messages 分类、Models Tabs 与任一管理 Modal 可操作。
8. 所有提交只显示静态提示，Network 无业务写请求，关闭重开后 fixture 不变。
9. PreviewFrame 保持隔离浅色，不随平台 dark 反色；键盘焦点、Escape 关闭与焦点返回正常。
10. 保存 `/login`、`/home`、Task Detail、`/admin` 的 light/dark 截图到临时验收目录，不提交浏览器 profile。

- [ ] **Step 9: 运行 1280×900 浏览器验收**

在同一 fresh profile 将 viewport 固定 1280×900：折叠侧栏约 64px；Tasks/Audit/Models/Users 表格有内部横向滚动；Task Detail 344px Inspector 可用；顶部多动作不裁切；页面不存在 `overflow:hidden` 截断、双层滚动陷阱或全局意外横向溢出。启用 `prefers-reduced-motion: reduce` 后，非必要淡入/pulse 动画关闭。

- [ ] **Step 10: Commit route/mock/integration changes**

```bash
git add config/routes.ts src/routes.test.ts mock/handlers.ts mock/handlers.test.ts mock/api.test.ts src/features/navigation/menu.test.ts src/app.test.ts
git commit -m "feat(routes): expose reconstructed pages by navigation access"
```

- [ ] **Step 11: 最终独立审查**

使用 `superpowers:requesting-code-review` 派发独立规格审查与代码质量审查。审查输入必须包含本计划、已批准 spec、完整提交范围和 Step 6–9 验证证据；Critical/Important finding 必须使用 `superpowers:receiving-code-review` 验真并在交付前关闭。

---

## 验收映射

| 规格要求 | 计划任务 |
| --- | --- |
| system/light/dark、localStorage、首屏无闪烁、统一 Portal theme | Task 1、Task 17 浏览器验收 |
| 208/64 侧栏、52 header、品牌/搜索/主题/消息/Avatar | Task 2 |
| 管理端只对 navigation 授权管理员展示并阻止直达 | Task 2、Task 17 |
| 登录视觉重构且原认证顺序不退化 | Task 3 |
| 工作台和管理概览 | Task 4 |
| Tasks 表格/看板/归档 | Task 5 |
| Task Detail 五 Tabs、公共 DetailDrawer、Artifact/Diff Drawer | Task 6；Audit 在 Task 10 复用 |
| Workspaces 与 Messages | Task 7、Task 8 |
| TeamBoard 与 Audit | Task 9、Task 10 |
| Admin Workspaces/Skills/Models | Task 11、Task 12、Task 13 |
| Admin Roles/Users/Menus | Task 14、Task 15、Task 16 |
| 16 routes、13 menu keys、1280/1440、lint/test/build/doctor/coverage | Task 17 |

## 计划执行注意事项

- 每个任务由全新实现 Agent 执行，再由独立规格 reviewer 和代码质量 reviewer 审查；不要让同一子 Agent同时实现与批准自己的任务。
- reviewer 只读期间不得编辑；修复由原实现 Agent 或新的 fix Agent 完成，并重新运行该任务 focused/full gate。
- 若 Umi/AntD 当前类型与计划代码片段冲突，以已安装版本类型和官方 API 为准，但不得改变已批准的可观察行为；使用 `superpowers:systematic-debugging` 取证后向 controller 报告。
- 不运行 `git add -A`；每次按任务文件清单精确暂存，始终排除 `engineering-platform-gitops/`、个人 Skill 缓存、生成目录、浏览器 profile 与其他并发改动。
