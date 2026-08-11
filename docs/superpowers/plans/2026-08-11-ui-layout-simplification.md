# UI Layout Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用自然的 Flex/auto-fit 布局替换固定 viewport 补丁，并清理 UI 目录中可证明无用的样式与邻近代码，同时保持所有业务行为和契约不变。

**Architecture:** 不新增通用布局组件；每个页面在现有 `antd-style` 文件中直接表达最小布局。ProLayout 使用官方默认 breakpoint，同构卡片由容器空间自动排列，主从区域由 Flex wrap 自然换行。纯布局重构以现有行为测试的 GREEN→REFACTOR→GREEN 保护；唯一配置行为变化 `app.ts` 使用明确 RED→GREEN。

**Tech Stack:** Umi Max 4.6.64、React 19、TypeScript、Ant Design 6.4.4、Pro Components 3.1.14-6、antd-style、Vitest 4.1.9、Testing Library、Biome。

## Global Constraints

- 只修改 UI 及相关测试：`src/app.ts`、`src/app.test.ts`、`src/pages/`、`src/features/`、`src/components/` 和本计划/设计文档。
- 不修改 `src/services/`、`mock/`、权限模型、路由注册表语义或 V0.2 API 契约。
- 不修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。
- 不新增 `ResponsiveGrid`、`ResponsiveSplit` 等通用布局封装。
- 删除 UI 布局中的 `@media (max-width: ...)`；保留 `prefers-reduced-motion` 和主题媒体查询。
- 保留 LoginForm 320px 内容宽度、ProTable 列宽/`scroll.x`、看板内部横滚、TaskDetail Inspector 产品宽度和明确的控件可用宽度。
- `minWidth: 0`、`maxWidth: '100%'`、`width: '100%'`、`flexShrink: 0` 必须有收缩、截断、滚动或固定交互目标的证据，否则删除。
- 不增加 sleep、retry、全局 timeout 或只锁定具体 viewport 像素的测试。
- 每个提交只暂存任务列出的精确文件，保留并发或既有未提交现场。

---

### Task 1: 收口当前登录页与 Audit 在途改动

**Files:**
- Modify: `docs/superpowers/plans/2026-08-10-login-prototype-alignment.md`
- Modify: `docs/superpowers/specs/2026-08-10-login-prototype-alignment-design.md`
- Modify: `src/components/BrandMark/index.style.ts`
- Modify: `src/components/BrandMark/index.test.tsx`
- Modify: `src/components/BrandMark/index.tsx`
- Modify: `src/constants/theme.ts`
- Modify: `src/features/auth/LoginFlow.test.tsx`
- Modify: `src/features/auth/LoginFlow.tsx`
- Modify: `src/features/auth/index.ts`
- Create: `src/features/auth/LoginShell.test.tsx`
- Create: `src/features/auth/LoginShell.tsx`
- Create: `src/features/auth/LoginStepHeader.tsx`
- Create: `src/features/auth/login.constant.ts`
- Create: `src/features/auth/login.style.ts`
- Modify: `src/features/shell/MenuBrand.tsx`
- Delete: `src/pages/Login/constant.ts`
- Delete: `src/pages/Login/index.style.ts`
- Modify: `src/pages/Login/index.test.tsx`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/pages/Audit/index.test.tsx`

**Interfaces:**
- Consumes: 已批准的登录页设计与本轮已有 RED/GREEN 证据。
- Produces: 登录页自然 Flex 基线；Audit “今天”筛选使用固定 fixture 时钟的确定性测试基线。

- [x] **Step 1: 核对当前 diff 没有混入布局清理范围外文件**

Run:

```bash
git status --short
git diff --check
```

Expected: 只有上述登录文件、`src/pages/Audit/index.test.tsx` 和本计划文档相关现场；无 whitespace error。

- [x] **Step 2: 重新运行已完成的登录页行为验证**

Run:

```bash
pnpm exec vitest run src/components/BrandMark src/features/auth/LoginFlow.test.tsx src/features/auth/LoginShell.test.tsx src/pages/Login/index.test.tsx
```

Expected: BrandMark、LoginFlow、LoginShell、Login 页面全部 PASS；无 React/antd warning。

- [x] **Step 3: 重新运行 Audit 日期回归**

Run:

```bash
pnpm exec vitest run src/pages/Audit/index.test.tsx
```

Expected: 9 tests PASS；“按时间、actor 与 targetType”不再依赖执行当天日期。

- [x] **Step 4: 验证登录与 Audit scoped 静态检查**

Run:

```bash
pnpm exec biome check src/components/BrandMark src/constants/theme.ts src/features/auth src/features/shell/MenuBrand.tsx src/pages/Login src/pages/Audit/index.test.tsx
pnpm exec tsc --noEmit --pretty false
```

Expected: 两条命令 exit 0。

- [x] **Step 5: 提交登录页重构**

Stage only the login files listed above, excluding `src/pages/Audit/index.test.tsx` and this plan, then run:

```bash
git commit -m "refactor(login): simplify prototype-aligned layout"
```

Expected: commit 只包含登录、品牌和对应登录文档。

- [x] **Step 6: 提交 Audit 确定性测试**

Stage only `src/pages/Audit/index.test.tsx`, then run:

```bash
git commit -m "test(audit): fix date-dependent filter contract"
```

Expected: commit 只包含 Audit 测试时钟修复。

---

### Task 2: 恢复应用壳官方响应式并简化 FilterToolbar

**Files:**
- Modify: `src/app.test.ts`
- Modify: `src/app.ts`
- Modify: `src/components/FilterToolbar/index.style.ts`
- Test: `src/components/FilterToolbar/index.test.tsx`

**Interfaces:**
- Consumes: ProLayout `SiderMenu` 默认 `breakpoint = 'lg'`；FilterToolbar 现有 `filters/search/summary/actions` props。
- Produces: 不读取 viewport 的 layout runtime 配置；仅靠 Flex wrap 的共享 Toolbar。

- [x] **Step 1: 建立共享组件 GREEN 基线**

Run:

```bash
pnpm exec vitest run src/app.test.ts src/components/FilterToolbar/index.test.tsx
```

Expected: 当前测试全部 PASS。

- [x] **Step 2: 写应用壳官方响应式 RED**

在 `src/app.test.ts` 删除 1440/1280/1024 与 SSR 的 `defaultCollapsed` 用例，加入：

```ts
it('不覆盖 ProLayout 官方响应式侧栏配置', () => {
  const config = layout({});

  expect(config).not.toHaveProperty('defaultCollapsed');
  expect(config).not.toHaveProperty('breakpoint');
});
```

- [x] **Step 3: 运行测试确认 RED**

Run:

```bash
pnpm exec vitest run src/app.test.ts -t "不覆盖 ProLayout 官方响应式侧栏配置"
```

Expected: FAIL；当前配置仍包含 `defaultCollapsed` 和 `breakpoint: false`。

- [x] **Step 4: 删除自定义 viewport 配置**

在 `src/app.ts` 删除：

```ts
const DEFAULT_COLLAPSED_MAX_VIEWPORT_WIDTH = 1280;

function shouldCollapseSiderByDefault(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth <= DEFAULT_COLLAPSED_MAX_VIEWPORT_WIDTH
  );
}
```

并从 layout 返回值删除：

```ts
defaultCollapsed: shouldCollapseSiderByDefault(),
breakpoint: false,
```

- [x] **Step 5: 将 FilterToolbar 改为纯 Flex 自然换行**

`src/components/FilterToolbar/index.style.ts` 保留外层 `display: 'flex'`、`flexWrap: 'wrap'` 和 gap，删除两段 1280px media。使用以下关系：

```ts
context: {
  display: 'flex',
  flex: '1 1 360px',
  flexWrap: 'wrap',
  gap: token.marginSM,
  alignItems: 'center',
  minWidth: 0,
},
controls: {
  display: 'flex',
  flex: '1 1 auto',
  flexWrap: 'wrap',
  gap: token.marginSM,
  alignItems: 'center',
  justifyContent: 'flex-end',
},
```

- [x] **Step 6: 验证 GREEN 与 scoped 静态检查**

Run:

```bash
pnpm exec vitest run src/app.test.ts src/components/FilterToolbar/index.test.tsx
pnpm exec biome check src/app.ts src/app.test.ts src/components/FilterToolbar
pnpm exec tsc --noEmit --pretty false
```

Expected: 全部 exit 0；FilterToolbar 的公开 role/name 与四个内容区仍存在。

- [x] **Step 7: 提交应用壳与共享 Toolbar**

```bash
git add src/app.ts src/app.test.ts src/components/FilterToolbar/index.style.ts src/components/FilterToolbar/index.test.tsx
git commit -m "refactor(layout): use native responsive shell"
```

---

### Task 3: 简化 Home、Admin 与 Tasks 卡片布局

**Files:**
- Modify: `src/pages/Home/index.style.ts`
- Test: `src/pages/Home/index.test.tsx`
- Modify: `src/pages/Admin/index.style.ts`
- Test: `src/pages/Admin/index.test.tsx`
- Modify: `src/pages/Tasks/index.style.ts`
- Test: `src/pages/Tasks/index.test.tsx`

**Interfaces:**
- Consumes: 现有 MetricCard、ProCard、Tasks board DOM 结构。
- Produces: 容器驱动的同构卡片排列；Tasks 看板横向滚动保持不变。

- [x] **Step 1: 建立三页 GREEN 基线**

Run each command separately:

```bash
pnpm exec vitest run src/pages/Home/index.test.tsx
pnpm exec vitest run src/pages/Admin/index.test.tsx
pnpm exec vitest run src/pages/Tasks/index.test.tsx
```

Expected: 三个文件各自 PASS。

- [x] **Step 2: 简化 Home 布局**

将 `metricsGrid` 改为：

```ts
gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
```

删除两段 media。将 `contentGrid` 改为 `display: 'flex'`、`flexWrap: 'wrap'`；将 `column` 设置为 `flex: '1 1 320px'` 并保留 `minWidth: 0`，因为列表长文本需要允许列收缩。

- [x] **Step 3: 简化 Admin 布局**

使用以下容器列规则并删除全部 max-width media：

```ts
metricsGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
},
entryGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
},
lowerGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
},
```

保留各自 gap、卡片 border 与列表收缩规则。

- [x] **Step 4: 简化 Tasks 指标布局**

把 `metricsGrid` 改为 `repeat(auto-fit, minmax(220px, 1fr))` 并删除 1280px media。保留：

```ts
board: { maxWidth: '100%', overflowX: 'auto' },
boardGrid: { gridTemplateColumns: 'repeat(5, minmax(210px, 1fr))', minWidth: 1100 },
```

这些规则表达看板内部横滚，不是 viewport 补丁。

- [x] **Step 5: 运行页面回归与静态检查**

Run each page test separately, then Biome:

```bash
pnpm exec vitest run src/pages/Home/index.test.tsx
pnpm exec vitest run src/pages/Admin/index.test.tsx
pnpm exec vitest run src/pages/Tasks/index.test.tsx
pnpm exec biome check src/pages/Home src/pages/Admin src/pages/Tasks
```

Expected: 全部 PASS；Tasks 列表/看板切换、筛选和 Modal 行为不变。

- [x] **Step 6: 提交 Dashboard 基础布局**

```bash
git add src/pages/Home/index.style.ts src/pages/Admin/index.style.ts src/pages/Tasks/index.style.ts
git commit -m "refactor(ui): simplify dashboard card layouts"
```

---

### Task 4: 简化 TeamBoard、Audit 与 AdminModels 分析布局

**Files:**
- Modify: `src/pages/TeamBoard/index.style.ts`
- Test: `src/pages/TeamBoard/index.test.tsx`
- Modify: `src/pages/Audit/index.style.ts`
- Test: `src/pages/Audit/index.test.tsx`
- Modify: `src/pages/AdminModels/index.style.ts`
- Test: `src/pages/AdminModels/index.test.tsx`

**Interfaces:**
- Consumes: MetricCard、MiniBarChart、DistributionBar、ProTable 和现有切换/筛选行为。
- Produces: 无固定 viewport breakpoint 的分析卡布局；表格和筛选契约保持不变。

- [x] **Step 1: 建立三页 GREEN 基线**

Run each separately:

```bash
pnpm exec vitest run src/pages/TeamBoard/index.test.tsx
pnpm exec vitest run src/pages/Audit/index.test.tsx
pnpm exec vitest run src/pages/AdminModels/index.test.tsx
```

Expected: 三个文件各自 PASS。

- [x] **Step 2: 简化 TeamBoard**

- `selectorHeader` 增加 `flexWrap: 'wrap'` 并删除 screenMD media。
- `teamSelector` 使用 `flex: '1 1 360px'`，删除 `width: 'min(100%, 560px)'` 和 `flexShrink: 0`。
- `metricsGrid` 使用 `repeat(auto-fit, minmax(220px, 1fr))`。
- `analysisGrid` 使用 `repeat(auto-fit, minmax(320px, 1fr))`。
- 删除三段 viewport media；保留成员名称 `minWidth: 0` 与百分比 `flexShrink: 0`。

- [x] **Step 3: 简化 Audit**

- `metricsGrid` 使用 `repeat(auto-fit, minmax(220px, 1fr))`。
- `analysisGrid` 使用 `repeat(auto-fit, minmax(280px, 1fr))`。
- 删除 screenXL/screenLG media。
- 保留筛选控件可操作宽度、搜索框父容器约束和 ProTable `scroll.x`。

- [x] **Step 4: 简化 AdminModels**

- `metricsGrid` 使用 `repeat(auto-fit, minmax(220px, 1fr))`。
- `analysisGrid` 使用 `repeat(auto-fit, minmax(320px, 1fr))`。
- 删除三段 viewport media。
- 逐项核对 `page/tabPanel` 的 `minWidth: 0`：只有 ProTable/长模型 ID 的祖先收缩链需要时才保留。

- [x] **Step 5: 运行回归与静态检查**

```bash
pnpm exec vitest run src/pages/TeamBoard/index.test.tsx
pnpm exec vitest run src/pages/Audit/index.test.tsx
pnpm exec vitest run src/pages/AdminModels/index.test.tsx
pnpm exec biome check src/pages/TeamBoard src/pages/Audit src/pages/AdminModels
```

Expected: 全部 PASS；Audit cursor、AdminModels Tabs/ProTable、Team 切换行为不变。

- [x] **Step 6: 提交分析页布局**

```bash
git add src/pages/TeamBoard/index.style.ts src/pages/Audit/index.style.ts src/pages/AdminModels/index.style.ts
git commit -m "refactor(ui): simplify analytics layouts"
```

---

### Task 5: 简化 AdminRoles 与 AdminPolicies 工作区

**Files:**
- Modify: `src/pages/AdminRoles/index.tsx`
- Modify: `src/pages/AdminRoles/CapabilityMatrix.tsx`
- Modify: `src/pages/AdminRoles/index.style.ts`
- Test: `src/pages/AdminRoles/index.test.tsx`
- Modify: `src/pages/AdminPolicies/index.tsx`
- Modify: `src/pages/AdminPolicies/index.style.ts`
- Test: `src/pages/AdminPolicies/index.test.tsx`

**Interfaces:**
- Consumes: Role 选择/Capability 编辑行为；Policy Catalog/Draft/Preview/Version 行为。
- Produces: Flex wrap 主从区与自动排列的能力组/Policy 工作区。

- [x] **Step 1: 建立两页 GREEN 基线**

```bash
pnpm exec vitest run src/pages/AdminRoles/index.test.tsx
pnpm exec vitest run src/pages/AdminPolicies/index.test.tsx
```

Expected: 两页全部 PASS。

- [x] **Step 2: 给 AdminRoles 两个布局角色命名**

在角色 `<nav>` 上增加 `className={styles.roleList}`；在 `CapabilityMatrix` 根 `<section>` 上增加 `className={styles.matrix}`。样式为：

```ts
masterDetail: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: token.margin,
  alignItems: 'flex-start',
},
roleList: { flex: '0 1 292px' },
matrix: { flex: '1 1 520px', minWidth: 0 },
capabilityGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: token.margin,
},
```

删除 master/detail 和 capability grid 的 viewport media。保留长 Capability code 所需的收缩/换行规则。

- [x] **Step 3: 简化 AdminPolicies 工作区**

给 Catalog `<section>` 增加 `className={styles.catalog}`，然后使用：

```ts
workspace: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: token.margin,
},
catalog: { flex: '1 1 520px', minWidth: 0 },
editor: { flex: '1 1 360px', minWidth: 0, /* 保留现有视觉属性 */ },
```

删除 1200px media。保留 `editorFields` 的 `auto-fit`，因为它已经由容器驱动。

- [x] **Step 4: 运行回归与静态检查**

```bash
pnpm exec vitest run src/pages/AdminRoles/index.test.tsx
pnpm exec vitest run src/pages/AdminPolicies/index.test.tsx
pnpm exec biome check src/pages/AdminRoles src/pages/AdminPolicies
pnpm exec tsc --noEmit --pretty false
```

Expected: 全部 exit 0；Capability 跨组状态、Policy dirty/validate/preview/publish 行为不变。

- [x] **Step 5: 提交治理工作区布局**

```bash
git add src/pages/AdminRoles/index.tsx src/pages/AdminRoles/CapabilityMatrix.tsx src/pages/AdminRoles/index.style.ts src/pages/AdminPolicies/index.tsx src/pages/AdminPolicies/index.style.ts
git commit -m "refactor(admin): simplify governance workspaces"
```

---

### Task 6: 简化 Workspaces、TaskDetail 与 Bootstrap

**Files:**
- Modify: `src/pages/Workspaces/index.tsx`
- Modify: `src/pages/Workspaces/WorkspaceSelector.tsx`
- Modify: `src/pages/Workspaces/index.style.ts`
- Test: `src/pages/Workspaces/index.test.tsx`
- Modify: `src/pages/TaskDetail/index.style.ts`
- Test: `src/pages/TaskDetail/index.test.tsx`
- Modify: `src/features/auth/index.style.ts`
- Test: `src/features/auth/BootstrapWizard.test.tsx`

**Interfaces:**
- Consumes: Workspace selector/Tabs、TaskDetail conversation/Inspector、Bootstrap 四步流程。
- Produces: 可自然换行的主从区域；TaskDetail 宽屏仍保留 344px Inspector；Bootstrap 不含 viewport media。

- [x] **Step 1: 建立三个区域 GREEN 基线**

```bash
pnpm exec vitest run src/pages/Workspaces/index.test.tsx
pnpm exec vitest run src/pages/TaskDetail/index.test.tsx
pnpm exec vitest run src/features/auth/BootstrapWizard.test.tsx
```

Expected: 三个文件各自 PASS。

- [x] **Step 2: 简化 Workspaces 主从和卡片集合**

为 selector 与 detail ProCard 增加明确 class：

```ts
selectorCard: { flex: '0 1 260px' },
detailCard: { flex: '1 1 560px', minWidth: 0 },
masterDetail: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: token.margin,
  alignItems: 'flex-start',
},
```

使用 `clsx(styles.card, styles.selectorCard)` 和 `clsx(styles.card, styles.detailCard)` 组合现有视觉样式。将 `metricsGrid`、`memberList`、`repositoryList`、`settingsGrid` 改为相应的 `repeat(auto-fit, minmax(...))`；保留 repository 名称 ellipsis 与 key/value 长文本换行所需的 `minWidth: 0`。

- [x] **Step 3: 简化 TaskDetail 双栏**

使用：

```ts
detailGrid: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: token.margin,
  alignItems: 'flex-start',
},
conversationPane: { flex: '1 1 640px', minWidth: 0 },
inspector: {
  position: 'sticky',
  top: token.margin,
  flex: '0 1 344px',
  maxWidth: '100%',
},
```

删除重复的 `width: 344`/`minWidth: 0`。保留 Inspector 产品宽度基准、Sticky、conversation viewport 高度、Diff 内部横滚和 `minWidth: 'max-content'`。

- [x] **Step 4: 简化 Bootstrap 容器**

删除两段 screenSM media，改为：

```ts
page: {
  boxSizing: 'border-box',
  display: 'flex',
  minHeight: '100vh',
  alignItems: 'center',
  justifyContent: 'center',
  padding: token.padding,
},
panel: {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 760,
  padding: token.paddingXL,
},
```

保留其余 token 化视觉属性、Steps `responsive` 和 content `maxWidth: 520`。

- [x] **Step 5: 运行回归与静态检查**

```bash
pnpm exec vitest run src/pages/Workspaces/index.test.tsx
pnpm exec vitest run src/pages/TaskDetail/index.test.tsx
pnpm exec vitest run src/features/auth/BootstrapWizard.test.tsx
pnpm exec biome check src/pages/Workspaces src/pages/TaskDetail src/features/auth/index.style.ts
pnpm exec tsc --noEmit --pretty false
```

Expected: 全部 exit 0；Workspace Tabs、TaskDetail focus return、Bootstrap 步骤/错误恢复不变。

- [x] **Step 6: 提交主从页面布局**

```bash
git add src/pages/Workspaces src/pages/TaskDetail/index.style.ts src/features/auth/index.style.ts
git commit -m "refactor(ui): simplify split-pane layouts"
```

---

### Task 7: 全 UI orphan style 与邻近冗余代码清扫

**Files:**
- Review: `src/components/BrandMark/`
- Review: `src/components/DetailDrawer/`
- Review: `src/components/DistributionBar/`
- Review: `src/components/FilterToolbar/`
- Review: `src/components/MetricCard/`
- Review: `src/components/MiniBarChart/`
- Review: `src/components/SemanticTag/`
- Review: `src/features/auth/`（只审查呈现代码）
- Review: `src/features/shell/`
- Review: `src/features/theme/`（只审查呈现代码，不改变主题状态语义）
- Review: `src/pages/AdminGrants/`
- Review: `src/pages/AdminMenus/`
- Review: `src/pages/AdminOrganization/`
- Review: `src/pages/AdminSkills/`
- Review: `src/pages/AdminUsers/`
- Review: `src/pages/AdminWorkspaces/`
- Review: `src/pages/Bootstrap/`
- Review: `src/pages/Login/`
- Review: `src/pages/Messages/`
- Review all corresponding UI tests in the same directories.

**Interfaces:**
- Consumes: Spec 中的尺寸保留规则与前六个任务完成后的最终 UI tree。
- Produces: 没有 orphan style key、无调用 UI helper、无效 className 或布局实现细节测试的 UI 代码。

- [x] **Step 1: 生成 style key 使用清单**

对每个 UI 目录运行以下形式的命令，比较 style 定义与 TSX 引用：

```bash
rg -n "^[[:space:]]{2}[A-Za-z][A-Za-z0-9]*:" src/components src/features src/pages -g '*.style.ts'
rg -n -o "styles\.[A-Za-z][A-Za-z0-9]*" src/components src/features src/pages -g '*.ts' -g '*.tsx'
```

逐目录确认每个 style key 至少有一个真实 JSX/TSX 引用；删除零引用 key。动态 class 组合必须通过对应 `styles.<key>` 引用证明，不按字符串猜测。

- [x] **Step 2: 扫描固定 viewport 与过度尺寸**

Run:

```bash
rg -n "@media \(max-width|window\.innerWidth|clamp\(" src/app.ts src/components src/features src/pages -g '*.ts' -g '*.tsx'
rg -n "minWidth|maxWidth|width:|flexShrink" src/components src/features src/pages -g '*.style.ts'
```

Expected after Tasks 2–6: 第一条无布局命中。对第二条逐项应用 spec 的尺寸保留规则；不能指向收缩、ellipsis、内部滚动或交互尺寸的声明删除。

- [x] **Step 3: 清理邻近 UI 代码**

在上述精确目录中先运行 Biome/TypeScript，再列出公共 UI export：

```bash
pnpm exec biome check src/components src/features/auth src/features/shell src/features/theme src/pages
pnpm exec tsc --noEmit --pretty false
rg --no-filename --replace '$1' '^export (?:const|function|class) ([A-Za-z][A-Za-z0-9_]*)' src/components src/features/auth src/features/shell src/features/theme src/pages -g '*.ts' -g '*.tsx'
```

Biome/TypeScript 报告的 unused local/import 直接清理。对最后一条命令列出的公共 UI export，只有在仓库级精确符号搜索证明除定义与本目录公开入口外没有消费者时才删除；搜索到 service、mock、权限、路由或契约消费者的符号立即保留，不纳入本任务。

- [x] **Step 4: 审查 CSS 实现细节测试**

Run:

```bash
rg -n "toHaveStyle|innerWidth|matchMedia" src/components src/features src/pages src/app.test.ts -g '*test.ts' -g '*test.tsx'
```

删除只证明旧 viewport 分支或无产品语义像素值的断言。保留 BrandMark 产品尺寸、ProTable `scroll.x`、图表数据比例、主题 `matchMedia` 和其他 spec 明确保留的契约断言。

- [x] **Step 5: 运行每个实际改动目录的 focused tests**

For every changed directory, run its nearest test file, for example:

```bash
pnpm exec vitest run src/pages/Messages/index.test.tsx
pnpm exec vitest run src/pages/AdminWorkspaces/index.test.tsx
pnpm exec vitest run src/components/MiniBarChart src/components/DistributionBar
```

Expected: 每个实际修改目录 PASS；没有修改的目录不制造无意义 diff。

- [x] **Step 6: 运行 scoped Biome 与 TypeScript**

```bash
pnpm exec biome check src/app.ts src/app.test.ts src/components src/features src/pages
pnpm exec tsc --noEmit --pretty false
```

Expected: exit 0；无 unused import/type error。

- [x] **Step 7: 提交实际清扫结果**

Stage only files with evidence-backed cleanup, then run:

```bash
git commit -m "refactor(ui): remove redundant presentation code"
```

If Task 7 produces no diff, skip this commit and record “no additional orphan code found”.

---

### Task 8: 全量验证、浏览器验收与独立审查

**Files:**
- Verify: all files changed by Tasks 1–7.
- Update: `docs/superpowers/plans/2026-08-11-ui-layout-simplification.md` checkbox state only after each command completes.

**Interfaces:**
- Consumes: Tasks 1–7 的提交。
- Produces: 可提交/推送的全量验证证据与审查结论。

- [x] **Step 1: 验证源码约束**

Run:

```bash
rg -n "@media \(max-width|window\.innerWidth|clamp\(" src/app.ts src/components src/features src/pages -g '*.ts' -g '*.tsx'
git diff --check
```

Expected: 第一条无布局命中；第二条 exit 0。`prefers-reduced-motion` 不在搜索模式中，继续保留。

- [x] **Step 2: 运行仓库 lint**

```bash
pnpm lint
```

Expected: exit 0；Biome、TypeScript、dependency-cruiser、OpenAPI 检查通过。

- [x] **Step 3: 运行完整测试**

```bash
pnpm test
```

Expected: 全部 Vitest files/tests PASS。若失败且原因不明，立即停止，不通过 timeout/retry/sleep 掩盖。

- [x] **Step 4: 运行生产构建**

```bash
pnpm build
```

Expected: Webpack build exit 0。

- [x] **Step 5: 浏览器检查自然布局**

复用 `pnpm dev`，检查：

- Login 左侧自然撑满、右侧登录区稳定，主题切换正常。
- ProLayout Sider 由官方 breakpoint 响应，不再依赖页面初始化时的 JS viewport 判断。
- Home/Admin/Tasks/TeamBoard/Audit/AdminModels 卡片随容器自然排列。
- AdminRoles/AdminPolicies/Workspaces/TaskDetail 在空间不足时自然换行，无全局横向溢出。
- ProTable、Tasks board、Diff code 仅在自身容器内部横向滚动。
- Bootstrap 四步流程布局完整。

不要把检查时的具体 viewport 数字写入代码或测试；只记录是否存在全局 overflow、重叠、裁切和不可操作控件。

- [x] **Step 6: 请求独立代码审查**

Use `requesting-code-review` against the commit range beginning before Task 1 and ending at current HEAD. Reviewer must report Critical/Important/Minor findings with file/line evidence and must not edit files.

Expected: Critical/Important 为 0；成立的 finding 按 RED→GREEN 修复并重复相应 focused/full gate。

- [x] **Step 7: 最终范围核对**

```bash
git status --short
git log --oneline --decorate -12
git diff --stat 63702ff..HEAD
```

Expected: 只包含登录收口、Audit 测试确定性修复、UI 布局简化、evidence-backed UI 清扫和批准文档；无 service/mock/权限/契约改动。
