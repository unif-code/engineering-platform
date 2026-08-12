# 前端原型高保真对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以最新 `研发协作平台.dc.html` 为唯一界面事实源，在保留既有路由、权限和契约行为的前提下，将所有桌面端页面对齐到至少 95% 的原型保真度。

**Architecture:** 以根级 `ConfigProvider` 的 global/component tokens 统一颜色与紧凑密度，以 ProLayout 的公开配置完成壳层和双主题侧栏；各页面继续使用现有 antd / Pro Components 组件，不建立统一 Table 包装器。图表职责统一交给 `@ant-design/charts`，只有两个及以上页面真实复用的能力才保留在 `src/components/`。

**Tech Stack:** React 19、TypeScript 5、Umi Max 4、Ant Design 6、Pro Components 3、Ant Design Charts、antd-style、Vitest、Testing Library。

## Global Constraints

- 原型文件固定为 `/Users/liulijun/Downloads/untitled/project/研发协作平台.dc.html`，基线 SHA-256 为 `34766593ecdca6e21a7a9332b70a93db3df060168b6432216292a83fd07524a3`；`/Users/liulijun/Downloads/内部研发平台架构设计/研发协作平台.dc.html` 为字节一致镜像。
- 主色 `#EB6E00`，悬停色 `#FF8F2E`；浅色侧栏白底、深色侧栏 `#191919`。
- 壳层头部 52px、展开侧栏 208px、折叠侧栏 56px、内容内边距 20px × 24px。
- 原型表格和工具栏使用 `size="small"`；原型没有的搜索、筛选、摘要和操作不得显示。
- 中文为主文案，API / domain key 仅作为次级标识；原始 key、模型名、错误码保持原值。
- AdminOrganization、AdminGrants、AdminPolicies 保留为独立菜单，并仅在菜单名称加 `（新增）`；页面标题不加。
- 超级管理员投影必须覆盖 Route Registry 中全部 16 个 `menu: true` 路由；新增可见路由时由回归测试防止遗漏。
- `/admin` 仅保留直达兼容，不进入侧栏或菜单管理目录。
- 不修改后端契约、OpenAPI 产物、权限模型或生成目录。
- 不引入全局 `.ant-*` 覆盖；只使用公开 props、global/component tokens、`styles` 和 `classNames`。
- 不建立统一 Table、Select、Button 包装器；官方组件已经匹配原型时保持原组件边界。
- 每个行为修复先取得有效 RED，再做最小 GREEN；已有行为测试不得整体删除重写。

---

### Task 1: 统一主题 Token、双主题侧栏与应用壳

**Files:**
- Modify: `src/constants/theme.ts`
- Modify: `src/features/theme/config.ts`
- Modify: `src/features/theme/ThemeProvider.test.tsx`
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`
- Modify: `src/features/shell/HeaderActions.tsx`
- Modify: `src/features/shell/index.style.ts`
- Modify: `src/features/shell/index.test.tsx`
- Modify: `src/features/navigation/menu.ts`
- Modify: `src/features/navigation/menu.test.ts`
- Modify: `src/features/navigation/registry.tsx`
- Modify: `src/features/navigation/registry.test.tsx`
- Modify: `mock/handlers.ts`
- Modify: `mock/handlers.test.ts`
- Modify: `mock/api.test.ts`

**Interfaces:**
- Consumes: `createAntdThemeConfig(resolvedTheme)`、`buildMenuData(navigation)`、Umi `layout` runtime config。
- Produces: 原型色彩/密度 component tokens、208/56 侧栏、52px header、分主题 Menu token、16 个可见菜单项和隐藏 `/admin` 兼容路由。

- [ ] **Step 1: 写主题与壳层视觉契约测试**

```ts
expect(lightTheme.token).toMatchObject({
  colorPrimary: '#EB6E00',
  colorLink: '#EB6E00',
  colorLinkHover: '#FF8F2E',
});
expect(lightTheme.components?.Table).toMatchObject({
  headerBg: '#FAFAFA',
  cellPaddingBlockSM: 8,
});
expect(layoutConfig.siderWidth).toBe(208);
expect(layoutConfig.menu?.collapsedWidth).toBe(56);
```

- [ ] **Step 2: 运行 RED**

Run: `pnpm exec vitest run src/features/theme/ThemeProvider.test.tsx src/app.test.ts src/features/shell/index.test.tsx src/features/navigation/menu.test.ts src/features/navigation/registry.test.tsx mock/handlers.test.ts mock/api.test.ts`

Expected: 默认 Token、侧栏宽度或菜单标签仍与原型不一致。

- [ ] **Step 3: 用公开 Token 和 ProLayout 配置完成最小实现**

```ts
components: {
  Table: {
    headerBg: '#FAFAFA',
    cellPaddingBlockSM: 8,
    cellPaddingInlineSM: 12,
  },
  Button: { primaryColor: '#FFFFFF' },
  Menu: resolvedTheme === 'dark'
    ? { darkItemBg: '#191919', darkItemSelectedBg: '#EB6E00' }
    : { itemBg: '#FFFFFF', itemSelectedBg: '#FFF7F0' },
}
```

`src/app.ts` 只通过公开 `layout` token/config 设置 header、sider、menu，不查询内部 `.ant-*` DOM。

- [ ] **Step 4: 对齐 Header 和菜单投影**

保持 220px 全局搜索、紧凑消息 badge、用户菜单内的主题/退出；AdminOrganization、AdminGrants、AdminPolicies 菜单加 `（新增）`，其他菜单不加；`/admin` 不投影。

- [ ] **Step 5: 验证并提交**

Run: `pnpm exec vitest run src/features/theme src/features/shell src/features/navigation src/app.test.ts mock/handlers.test.ts mock/api.test.ts`

Run: `NO_UPDATE_CHECK=1 pnpm exec antd lint src/features/theme src/features/shell --format json`

Commit: `feat(shell): align platform navigation with prototype`

### Task 2: 保留官方组件边界并统一共享展示能力

**Files:**
- Modify: `src/components/FilterToolbar/index.tsx`
- Modify: `src/components/FilterToolbar/index.style.ts`
- Modify: `src/components/FilterToolbar/index.test.tsx`
- Modify: `src/components/MetricCard/index.tsx`
- Modify: `src/components/MetricCard/index.style.ts`
- Modify: `src/components/MetricCard/index.test.tsx`
- Modify: `src/components/SemanticTag/index.tsx`
- Modify: `src/components/SemanticTag/index.style.ts`
- Modify: `src/components/SemanticTag/index.test.tsx`
- Modify: `src/components/DetailDrawer/index.tsx`
- Modify: `src/components/DetailDrawer/index.test.tsx`
- Delete after consumer migration: `src/components/MiniBarChart/index.tsx`
- Delete after consumer migration: `src/components/MiniBarChart/index.style.ts`
- Delete after consumer migration: `src/components/MiniBarChart/index.test.tsx`
- Delete after consumer migration: `src/components/DistributionBar/index.tsx`
- Delete after consumer migration: `src/components/DistributionBar/index.style.ts`
- Delete after consumer migration: `src/components/DistributionBar/index.test.tsx`

**Interfaces:**
- Consumes: antd `Space`、`Tag`、`Drawer` 和 theme tokens。
- Produces: 紧凑但不重复封装的 toolbar / metric / tag / drawer；手写图形组件不再承担图表绘制。

- [ ] **Step 1: 写共享组件回归测试**

```tsx
expect(screen.getByRole('toolbar')).toHaveAttribute('data-density', 'compact');
expect(screen.getByRole('dialog', { name: '详情' })).toBeVisible();
expect(screen.getByRole('status', { name: '活跃' })).toBeVisible();
```

- [ ] **Step 2: 运行 RED**

Run: `pnpm exec vitest run src/components/FilterToolbar src/components/MetricCard src/components/SemanticTag src/components/DetailDrawer`

- [ ] **Step 3: 最小化共享样式**

仅保留跨两个以上消费者共用的布局；不新建 `PrototypeTable`、`PrototypeButton` 或 `PrototypeSelect`。页面专属间距留在页面的 `index.style.ts`。

- [ ] **Step 4: 验证并提交**

Run: `pnpm exec vitest run src/components`

Run: `NO_UPDATE_CHECK=1 pnpm exec antd lint src/components --format json`

Commit: `refactor(ui): simplify shared prototype primitives`

### Task 3: 使用 Ant Design Charts 替换手写图表职责

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/pages/Home/index.tsx`
- Modify: `src/pages/Home/index.test.tsx`
- Modify: `src/pages/TeamBoard/index.tsx`
- Modify: `src/pages/TeamBoard/index.test.tsx`
- Modify: `src/pages/AdminModels/ModelDashboardPanel.tsx`
- Modify: `src/pages/AdminModels/index.test.tsx`
- Modify: `src/pages/Audit/index.tsx`
- Modify: `src/pages/Audit/index.test.tsx`
- Delete: `src/components/MiniBarChart/index.tsx`
- Delete: `src/components/MiniBarChart/index.style.ts`
- Delete: `src/components/MiniBarChart/index.test.tsx`
- Delete: `src/components/DistributionBar/index.tsx`
- Delete: `src/components/DistributionBar/index.style.ts`
- Delete: `src/components/DistributionBar/index.test.tsx`

**Interfaces:**
- Consumes: `@ant-design/charts` Column/Bar/Line 图表与现有 fixture 数据。
- Produces: 带中文可访问名称、原型橙色序列和 reduced-motion 配置的官方图表。

- [ ] **Step 1: 安装官方图表依赖**

Run: `pnpm add @ant-design/charts`

- [ ] **Step 2: 写图表行为 RED**

```tsx
expect(screen.getByRole('img', { name: '近七日任务趋势' })).toBeVisible();
expect(screen.getByText('任务阶段分布')).toBeVisible();
expect(screen.queryByTestId('handwritten-bar')).not.toBeInTheDocument();
```

- [ ] **Step 3: 用官方图表做最小实现**

```tsx
<Column
  data={chartData}
  xField="label"
  yField="value"
  color="#EB6E00"
  animation={reducedMotion ? false : undefined}
/>
```

外层保留语义 `figure` / `figcaption`，不包装成新的通用 chart DSL。

- [ ] **Step 4: 验证并提交**

Run: `pnpm exec vitest run src/pages/Home src/pages/TeamBoard src/pages/AdminModels src/pages/Audit`

Commit: `refactor(charts): use ant design charts for dashboards`

### Task 4: 对齐登录、工作台和用户端基础页面

**Files:**
- Modify: `src/features/auth/LoginShell.tsx`
- Modify: `src/features/auth/LoginShell.test.tsx`
- Modify: `src/features/auth/LoginFlow.tsx`
- Modify: `src/features/auth/LoginFlow.test.tsx`
- Modify: `src/features/auth/LoginStepHeader.tsx`
- Modify: `src/features/auth/login.style.ts`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/pages/Login/index.test.tsx`
- Modify: `src/pages/Home/index.tsx`
- Modify: `src/pages/Home/index.style.ts`
- Modify: `src/pages/Home/index.test.tsx`
- Modify: `src/pages/Messages/index.tsx`
- Modify: `src/pages/Messages/index.style.ts`
- Modify: `src/pages/Messages/index.test.tsx`

**Interfaces:**
- Consumes: 现有两步登录/Bootstrap/Session 行为、antd `LoginForm`、`Segmented`。
- Produces: 原型 flex 登录布局、中文文案、无登录页主题按钮；消息中心继续使用现有 Segmented。

- [ ] **Step 1: 写可见结构 RED**

```tsx
expect(screen.getByRole('heading', { name: '研发协作平台' })).toBeVisible();
expect(screen.queryByRole('button', { name: '切换主题' })).not.toBeInTheDocument();
expect(screen.getByRole('radiogroup', { name: '消息分类' })).toBeVisible();
```

- [ ] **Step 2: 运行 RED**

Run: `pnpm exec vitest run src/features/auth src/pages/Login src/pages/Home src/pages/Messages`

- [ ] **Step 3: 最小实现**

登录页仅使用单层 flex：左侧 `flex: 1`，右侧固定原型区域，`LoginForm` 使用官方 `contentStyle={{ width: 320 }}`；不添加媒体查询、分辨率分支或重复表单。

- [ ] **Step 4: 验证并提交**

Run: `NO_UPDATE_CHECK=1 pnpm exec antd lint src/features/auth src/pages/Login src/pages/Home src/pages/Messages --format json`

Commit: `feat(ui): align login and user landing pages`

### Task 5: 对齐任务、详情与工作区页面

**Files:**
- Modify: `src/pages/Tasks/index.tsx`
- Modify: `src/pages/Tasks/index.style.ts`
- Modify: `src/pages/Tasks/index.test.tsx`
- Modify: `src/pages/Tasks/TaskList.tsx`
- Modify: `src/pages/Tasks/TaskBoard.tsx`
- Modify: `src/pages/Tasks/Archived.tsx`
- Modify: `src/pages/TaskDetail/index.tsx`
- Modify: `src/pages/TaskDetail/index.style.ts`
- Modify: `src/pages/TaskDetail/index.test.tsx`
- Modify: `src/pages/TaskDetail/InspectorPanel.tsx`
- Modify: `src/pages/TaskDetail/ConversationPane.tsx`
- Modify: `src/pages/Workspaces/index.tsx`
- Modify: `src/pages/Workspaces/index.style.ts`
- Modify: `src/pages/Workspaces/index.test.tsx`
- Modify: `src/pages/Workspaces/WorkspaceSelector.tsx`

**Interfaces:**
- Consumes: 现有任务/工作区 fixtures、ProTable request、DetailDrawer、Modal/Steps。
- Produces: 原型任务 list/board/archive、详情三栏、工作区主从布局；所有表格 small，编号可导航。

- [x] **Step 1: 写原型存在/不存在契约 RED**

```tsx
expect(screen.getByRole('table')).toHaveAttribute('data-size', 'small');
expect(screen.getByRole('link', { name: 'REQ-2026-0142' })).toHaveAttribute(
  'href',
  '/tasks/REQ-2026-0142',
);
expect(screen.queryByText('任务指标总览')).not.toBeInTheDocument();
```

- [x] **Step 2: 逐页最小 GREEN**

原型没有的指标、PageContainer 摘要或筛选逐项删除；原型存在的状态切换、Modal、Drawer 和键盘回焦保留。

- [x] **Step 3: focused 验证与提交**

Run: `pnpm exec vitest run src/pages/Tasks src/pages/TaskDetail src/pages/Workspaces`

Commit: `feat(tasks): align collaboration workflows with prototype`

### Task 6: 对齐团队、审计与管理原型页面

**Files:**
- Modify: `src/pages/TeamBoard/index.tsx`
- Modify: `src/pages/TeamBoard/index.style.ts`
- Modify: `src/pages/TeamBoard/index.test.tsx`
- Modify: `src/pages/Audit/index.tsx`
- Modify: `src/pages/Audit/index.style.ts`
- Modify: `src/pages/Audit/index.test.tsx`
- Modify: `src/pages/AdminSkills/index.tsx`
- Modify: `src/pages/AdminSkills/index.style.ts`
- Modify: `src/pages/AdminSkills/index.test.tsx`
- Modify: `src/pages/AdminModels/index.tsx`
- Modify: `src/pages/AdminModels/index.style.ts`
- Modify: `src/pages/AdminModels/index.test.tsx`
- Modify: `src/pages/AdminRoles/index.tsx`
- Modify: `src/pages/AdminRoles/index.style.ts`
- Modify: `src/pages/AdminRoles/index.test.tsx`
- Modify: `src/pages/AdminUsers/index.tsx`
- Modify: `src/pages/AdminUsers/index.style.ts`
- Modify: `src/pages/AdminUsers/index.test.tsx`
- Modify: `src/pages/AdminMenus/index.tsx`
- Modify: `src/pages/AdminMenus/index.style.ts`
- Modify: `src/pages/AdminMenus/index.test.tsx`
- Modify: `src/pages/AdminWorkspaces/index.tsx`
- Modify: `src/pages/AdminWorkspaces/index.style.ts`
- Modify: `src/pages/AdminWorkspaces/index.test.tsx`

**Interfaces:**
- Consumes: 既有 request adapter、fixture、Modal/Drawer、Tabs/Segmented/ProTable。
- Produces: 原型中的团队、审计和六个管理页面，中文主文案、small Table/Select/Pagination、原型工具栏与弹层。

- [ ] **Step 1: 为每页写一条结构 RED 和一条交互保持测试**

```tsx
expect(screen.getByRole('table')).toBeVisible();
expect(screen.getByRole('button', { name: '新增用户' })).toBeVisible();
expect(screen.queryByRole('combobox', { name: '原型未提供的筛选' })).not.toBeInTheDocument();
```

- [ ] **Step 2: 按原型屏幕顺序逐页 GREEN**

顺序：TeamBoard → Audit → AdminSkills → AdminModels → AdminRoles → AdminUsers → AdminMenus → AdminWorkspaces。每页只调整自己的 columns、toolbar、文案、布局和弹层，不复制另一个页面的 JSX。

- [ ] **Step 3: focused 验证与提交**

Run: `pnpm exec vitest run src/pages/TeamBoard src/pages/Audit src/pages/AdminSkills src/pages/AdminModels src/pages/AdminRoles src/pages/AdminUsers src/pages/AdminMenus src/pages/AdminWorkspaces`

Commit: `feat(admin): align prototype management screens`

### Task 7: 对齐无独立原型的架构保留页面

**Files:**
- Modify: `src/pages/AdminOrganization/index.tsx`
- Modify: `src/pages/AdminOrganization/index.style.ts`
- Modify: `src/pages/AdminOrganization/index.test.tsx`
- Modify: `src/pages/AdminGrants/index.tsx`
- Modify: `src/pages/AdminGrants/index.style.ts`
- Modify: `src/pages/AdminGrants/index.test.tsx`
- Modify: `src/pages/AdminPolicies/index.tsx`
- Modify: `src/pages/AdminPolicies/index.style.ts`
- Modify: `src/pages/AdminPolicies/index.test.tsx`
- Modify: `src/pages/AdminPolicies/PolicyDraftEditor.tsx`
- Modify: `src/pages/AdminPolicies/PolicyVersionHistory.tsx`
- Modify: `src/pages/AdminMenus/constant.ts`
- Modify: `src/pages/AdminMenus/util.test.ts`

**Interfaces:**
- Consumes: 既有 organization/grant/policy service seam、reason/If-Match/Problem/竞态保护。
- Produces: 与最近原型管理页一致的紧凑页面，独立菜单名称带 `（新增）`，不新增平行能力。

- [ ] **Step 1: 写架构保留与菜单一致性 RED**

```tsx
expect(screen.getByRole('link', { name: '组织管理（新增）' })).toBeVisible();
expect(screen.getByRole('heading', { name: '组织管理' })).toBeVisible();
expect(screen.queryByRole('heading', { name: /新增/ })).not.toBeInTheDocument();
```

- [ ] **Step 2: 最小复用相邻原型视觉**

Organization 使用 AdminWorkspaces 的主从比例但不共享业务组件；Grants 使用 AdminUsers 的紧凑表格节奏；Policies 使用 AdminModels 的 Tabs/Drawer 节奏。仅复用全局 tokens 和已有基础组件。

- [ ] **Step 3: focused 验证与提交**

Run: `pnpm exec vitest run src/pages/AdminOrganization src/pages/AdminGrants src/pages/AdminPolicies src/pages/AdminMenus`

Commit: `feat(admin): align governance pages with prototype system`

### Task 8: 浏览器高保真验收、争议清单与完整门禁

**Files:**
- Create: `docs/superpowers/reports/2026-08-11-prototype-high-fidelity-alignment.md`
- Modify only when a verified defect is found: files from Tasks 1-7。

**Interfaces:**
- Consumes: Tasks 1-7 的最终 UI。
- Produces: 每屏 PASS/FAIL/CANNOT VERIFY 记录、争议项清单、截图和完整质量门证据。

- [ ] **Step 1: 逐页浏览器对照**

在浅色和深色下逐页核对 15 个原型页面；记录区块/控件/文案 100%、关键间距误差 ≤4px、列宽比例误差 ≤5%、无额外可见内容。

- [ ] **Step 2: 单列争议项**

报告只列仍需用户决策的内容，例如架构新增页面的具体布局、原型静态交互与真实契约冲突、无法用公开 API 精确复刻的细节；不把已由原型明确规定的内容列为争议。

- [ ] **Step 3: 完整验证**

Run: `pnpm lint`

Run: `pnpm test`

Run: `pnpm test:coverage`

Run: `pnpm doctor`

Run: `pnpm antd:check`

Run: `pnpm build`

- [ ] **Step 4: 提交报告与最终修复**

Commit: `test(ui): verify high-fidelity prototype alignment`
