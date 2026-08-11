# UI 布局与前端代码简化设计

## 背景

登录页对齐原型的过程中，曾使用固定分辨率、媒体查询、多层布局约束和重复宽度补丁来控制页面。最终验证表明，简单的 Flex 主结构、少量明确的内容宽度和组件官方能力即可满足设计目标，而且更容易维护。

仓库内其他 UI 仍存在相似模式：按 viewport 编写的布局分支、已经允许换行却又叠加的媒体查询、重复的 4→2→1 卡片网格、手写的侧栏宽度判断，以及无法证明用途的样式属性。本次工作统一清理这些实现，同时保持业务行为、数据契约和页面语义不变。

## 目标

- UI 布局优先由内容和容器决定，不再围绕固定屏幕宽度编程。
- 删除 UI 目录中未使用、重复或无实际作用的样式、常量、辅助函数、import 和测试代码。
- 保持现有业务行为、路由、权限、service、mock 和 API 契约不变。
- 保留确有功能作用的尺寸、滚动、收缩和无障碍规则。
- 不为本次清理新增通用布局组件或新的设计系统抽象。

## 非目标

- 不修改 `src/services/`、`mock/`、权限模型、路由注册表语义或 V0.2 API 契约。
- 不重新设计页面视觉语言、信息架构、交互流程或文案。
- 不修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。
- 不把全部固定尺寸机械删除；具有明确产品或内容语义的尺寸继续保留。

## 统一布局原则

### 1. 自然布局优先

- 页面纵向结构使用简单的 Flex column。
- Toolbar、主从区域、编辑/预览区域和并排面板使用可换行 Flex，让容器空间决定是否换行。
- 同构指标卡和分析卡可以使用 CSS Grid `auto-fit`/`auto-fill`，但不得再维护 4→2→1、3→2→1 等 viewport breakpoint 分支。
- 不使用 JavaScript 读取 `window.innerWidth` 决定初始布局。
- 不新增 `ResponsiveGrid`、`ResponsiveSplit` 等仅用于包裹 CSS 的公共组件。

### 2. 使用组件官方能力

- ProLayout 恢复自身的响应式 Sider 行为，不再同时设置自定义 viewport 阈值和 `breakpoint: false`。
- ProTable 继续使用列宽和 `scroll.x` 表达表格内部横向滚动。
- Segmented、Space、ProCard、Form 等组件已有的 `block`、换行或内容布局能力优先于外围补丁。

### 3. 尺寸保留规则

以下尺寸具有明确作用，应保留：

- LoginForm 的 `contentStyle` 320px 内容宽度和登录卡片设计宽度。
- ProTable 列宽、`scroll.x` 和看板内部横向滚动所需的最小宽度。
- TaskDetail Inspector 等具有明确产品结构的固定栏宽。
- 搜索框、Select 等保证可操作性的内容宽度或最小宽度。
- 图表、图标和触控目标的语义尺寸。

以下规则必须逐项证明用途，否则删除：

- `minWidth: 0`：仅保留在需要允许 Flex/Grid 子项收缩、ellipsis、nowrap 或长文本换行的位置。
- `maxWidth: '100%'`：仅保留在固定内容宽度确实需要受父容器约束的位置。
- `width: '100%'`：仅保留在组件默认不会填充可用空间的位置。
- `flexShrink: 0`：仅保留在操作按钮、图标或固定值不能被压缩的位置。
- `boxSizing`、重复 display 声明和仅为旧布局服务的 class。

### 4. 媒体查询规则

- 删除 UI 布局中的 `@media (max-width: ...)` 分支。
- 保留 `@media (prefers-reduced-motion: reduce)`，因为它属于无障碍行为，不是布局补丁。
- 主题的 `prefers-color-scheme` 检测不在本次清理范围内。

## 改造范围

### 应用壳与共享布局

- `src/app.ts`、`src/app.test.ts`
  - 删除 `DEFAULT_COLLAPSED_MAX_VIEWPORT_WIDTH`、`shouldCollapseSiderByDefault` 及固定 viewport 测试。
  - 恢复 ProLayout 官方 breakpoint 行为。
- `src/components/FilterToolbar/`
  - 仅使用 Flex basis、grow 和 wrap 完成上下文区与操作区自然换行。

### 同构卡片与 Dashboard

- `src/pages/Home/`
- `src/pages/Admin/`
- `src/pages/Tasks/`
- `src/pages/TeamBoard/`
- `src/pages/Audit/`
- `src/pages/AdminModels/`

指标卡、入口卡和分析卡删除固定 viewport 分支，使用内容驱动的 Flex 或 auto-fit Grid。Tasks 看板自身的横向滚动结构保持不变。

### 主从与并排工作区

- `src/pages/AdminRoles/`
- `src/pages/AdminPolicies/`
- `src/pages/Workspaces/`
- `src/pages/TaskDetail/`

主从区域和编辑/预览区域优先使用可换行 Flex。TaskDetail Inspector 的产品宽度和 Sticky 行为保留；只清理其周边无效约束。

### 身份引导与其余 UI

- `src/features/auth/index.style.ts`
  - Bootstrap 页面使用自然宽度、最大内容宽度和统一 padding，删除移动端媒体分支。
- `src/pages/`、`src/features/`、`src/components/` 中其余样式文件
  - 对照 JSX/TSX 使用点删除 orphan style key。
  - 删除重复常量、无调用辅助函数、无效 className 和对应的实现细节测试。
  - 只处理 UI 及其测试，不进入 service、mock 和业务领域代码。

## 测试策略

### 行为保持型重构

每一批先运行现有 focused tests 建立 GREEN 基线，再做布局重构并重复运行同一测试。现有测试继续验证可观察行为、公共 role/name、交互结果和数据不变性。

### 行为变化型修复

仅 `app.ts` 的响应式策略属于可观察配置变化：先修改测试，证明它不再依赖自定义 viewport 阈值且使用 ProLayout 官方 breakpoint；取得 RED 后再修改生产代码至 GREEN。

### 测试清理

- 删除只锁定内部 CSS 实现、固定 viewport 或无产品语义像素值的断言。
- 保留用于证明表格横滚、看板内部滚动、Drawer 宽度或其他明确产品契约的尺寸断言。
- 不增加 sleep、retry 或全局 timeout。

### 最终验证

- 分批运行受影响页面与共享组件的 focused Vitest。
- 运行 `pnpm lint`。
- 运行 `pnpm test`。
- 在现有开发服务器中检查登录页、应用壳、Dashboard、主从页面和表格页面；只验证自然换行、无全局溢出和交互可用，不把具体 viewport 像素写成产品契约。

## 实施批次

1. 应用壳与 FilterToolbar。
2. Home、Admin、Tasks、TeamBoard、Audit、AdminModels 的卡片布局。
3. AdminRoles、AdminPolicies、Workspaces、TaskDetail 与 Bootstrap。
4. 全 UI orphan style、重复代码和测试实现细节清扫。
5. 全量静态检查、测试与浏览器验收。

每一批必须保持独立可验证；发现行为回归时停止该批次并定位根因，不通过增加 breakpoint 或宽度补丁掩盖问题。

## 验收标准

- UI 布局样式中不再存在 `@media (max-width: ...)`。
- `src/app.ts` 不再直接读取 viewport 宽度决定 Sider 状态。
- 不新增通用布局封装。
- orphan style key、无调用 UI 辅助代码和对应无效 import 已清理。
- 业务行为、service、mock、权限和 API 契约无变化。
- 表格、看板、TaskDetail 和 reduced-motion 的功能性布局规则仍存在。
- `pnpm lint` 与 `pnpm test` 通过。
