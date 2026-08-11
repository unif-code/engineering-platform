# 登录页原型对齐设计

状态：已确认
首次确认：2026-08-10
最新原型复核：2026-08-11
范围：平台品牌基础、认证页视觉外壳与既有 V0.2 登录流程

## 背景

当前 `/login` 已实现 V0.2 两步认证：员工编号与密码验证成功后，再进入 TOTP 验证。该认证状态机、Problem Details 错误呈现、Session 刷新和安全回跳均已有测试覆盖，不能为了复刻原型退回“账号、密码、TOTP 同屏提交”。

最新 Claude Design handoff 已重新完整读取：`README.md`、`决策记录.md`、`研发协作平台.dc.html` 全文以及生成的 `support.js` 入口。登录画面的稳定事实是 56px 顶部品牌栏、空白橙色方块、“研发协作平台”、暖白背景、左侧交付链路 Hero 和右侧 460px 登录卡片。

现有实现的根因不只是页面 CSS：

- 产品名称分散在 `config/defaultSettings.ts`、`BrandMark` 和 `HeaderTitle`，仍使用“内部研发平台”。
- `BrandMark` 内置 `IP` 字样，而最新原型在登录页和侧栏都使用空白橙色方块。
- 登录布局、文案和视觉常量放在 `src/pages/Login`，违反 `pages → features` 中 pages 只做路由装配的边界。
- 认证场景暖白背景没有语义 token，只能退化为通用 `colorBgLayout` 或页面魔法值。

因此不采用登录页局部覆盖，而是统一品牌事实源并抽出认证视觉壳。

## 目标

- 产品名称、发布标识和版权文案只有一个事实源。
- 浏览器标题、应用 Shell、登录页共同显示“研发协作平台”。
- `BrandMark` 默认呈现空白橙色方块；展开时显示产品名，折叠时仍保留产品可访问名。
- 登录页在 1440×900 下精确复现最新原型的顶部栏、Hero、阶段链和卡片布局。
- light 主题使用认证场景暖白背景 `#FDFCFA`；dark 主题继续使用平台主题 token，不形成浅色孤岛。
- 登录视觉实现在 auth Feature，`src/pages/Login` 只装配 Session 刷新、主题入口和登录 Feature。
- 保留 light/dark/system、窄屏响应式和完整 V0.2 两步认证。

## 架构决策

### 1. 单一品牌事实源

新增 `src/constants/brand.ts`，集中导出：

- `PLATFORM_NAME = '研发协作平台'`
- `PLATFORM_RELEASE_LABEL = '集团内网 · V0.2'`
- `PLATFORM_EYEBROW = 'ENGINEERING PLATFORM'`
- `PLATFORM_COPYRIGHT = '© 2026 集团企业开发部 · 仅限内网使用'`

`config/defaultSettings.ts`、`BrandMark`、`HeaderTitle` 和登录视觉壳全部从该文件读取，不再支持页面级品牌覆盖。未来品牌或版本调整只改一个事实源。

历史 spec/plan 中的旧产品名作为历史记录保留，不批量改写；运行时代码与新设计以本文件为准。

### 2. 共享 BrandMark 直接对齐新品牌

最新原型的登录页和侧栏标识一致，因此不增加 `showMonogram`、`name` 或登录专用 variant。`BrandMark` 的默认契约直接更新为：

- 方块只承载品牌色，不包含可见字母。
- 根节点 `role="img"`，可访问名为 `PLATFORM_NAME`。
- 展开时显示 `PLATFORM_NAME`，折叠时只显示方块。
- `collapsed`、`size` 和 `className` 继续保持原接口。

这避免长期维护两套并不存在的品牌变体。

### 3. LoginShell 归属 auth Feature

新增 `src/features/auth/LoginShell.tsx`、`login.style.ts` 与 `login.constant.ts`：

- `LoginShell` 只负责品牌栏、Hero、阶段链、响应式布局和登录卡片容器。
- 它通过 `children` 接收认证表单，通过 `headerAction` 接收主题入口，不读取 Session 或 service。
- `LoginFlow` 继续拥有凭据 → TOTP 状态机。
- `LoginPage` 继续拥有登录后 `me`/navigation 刷新、Initial State commit 与安全 redirect。

迁移完成后删除 `src/pages/Login/index.style.ts` 与 `src/pages/Login/constant.ts`，避免双重事实源。

### 4. 认证场景语义色

在 `src/constants/theme.ts` 增加 `LIGHT_AUTH_BACKGROUND = '#FDFCFA'`。这是经批准原型固定的认证场景语义色，不修改全局 `colorBgLayout`，因此不会意外改变其他页面。

`LoginShell` 从公开 `usePlatformTheme` 获取 `resolvedTheme`：

- light：使用 `LIGHT_AUTH_BACKGROUND`。
- dark：使用 `token.colorBgLayout`。
- 卡片、边框、文字、阴影继续使用 antd token。

## 页面视觉规则

### 桌面

- 基准视口 1440×900，页面最小高度 `100vh`。
- 顶部栏 56px，左右内边距 44px。
- 左侧 Hero 内边距 88px。
- 右侧内容列 460px，右侧留白 88px。
- 主标题 50px、800 weight、1.28 line-height，只高亮“可治理”。
- 阶段链固定为“需求对齐 → Spec / Plan 规格计划 → 开发 → Review 评审 → MR 合并”。
- 前四个阶段是轻边框胶囊，最后一个是深色实心胶囊。
- 登录卡片为 14px 圆角、轻边框、低对比阴影和 32px 内边距。
- 底部显示集中品牌常量中的版权文案。

### 响应式

- 1280px 及以上保持双栏。
- 中等宽度收紧留白和标题字号，但不改变信息层级。
- 小屏改为 Hero 在上、登录卡片在下，不产生 document 横向滚动。
- 主题入口始终可通过公开按钮访问。

## 登录流程

`LoginFlow` 只调整凭据步骤标题为“账号登录”，行为保持不变：

1. 凭据步骤显示员工编号和密码。
2. 成功后进入“验证动态码”并自动聚焦 TOTP。
3. `BOOTSTRAP`、429、凭据错误、TOTP 错误和 challenge 失效保持现有恢复路径。
4. TOTP 成功后仍先刷新 `me`、navigation 与 Initial State，React commit 完成后才导航。

不复制原型的同屏 TOTP、演示数据重置、前端验证码倒计时或认证绕过。

## 文件边界

新增：

- `src/constants/brand.ts`
- `src/features/auth/LoginShell.tsx`
- `src/features/auth/LoginShell.test.tsx`
- `src/features/auth/login.constant.ts`
- `src/features/auth/login.style.ts`

修改：

- `config/defaultSettings.ts`
- `src/constants/theme.ts`
- `src/components/BrandMark/index.tsx`
- `src/components/BrandMark/index.test.tsx`
- `src/features/shell/HeaderTitle.tsx`
- `src/features/shell/index.test.tsx`
- `src/features/auth/index.ts`
- `src/features/auth/LoginFlow.tsx`
- `src/features/auth/LoginFlow.test.tsx`
- `src/pages/Login/index.tsx`
- `src/pages/Login/index.test.tsx`

删除：

- `src/pages/Login/constant.ts`
- `src/pages/Login/index.style.ts`

不修改 auth service、transport、mock、Session、路由或 Bootstrap 行为。

## 测试与验收

严格按 TDD 执行：

- `BrandMark` 展开/折叠均使用统一产品可访问名，DOM 中不再出现 `IP`。
- Shell fallback、菜单品牌和浏览器标题都消费同一品牌常量。
- `LoginShell` 公开结构包含品牌、版本、Hero、五阶段、版权和主题入口。
- 主标题整体可访问名正确，“可治理”仍可独立识别。
- 页面现有认证、错误、Bootstrap、Session commit 和 redirect 测试原位保留。
- 凭据与 TOTP 不同屏。
- focused Vitest、Biome、TypeScript、dependency-cruiser、antd lint、`pnpm lint` 与 `pnpm test` 全绿。

浏览器使用 fresh profile 验收：

- 1440×900 light：背景为原型暖白，顶部栏、Hero、阶段链和卡片无偏移或裁切。
- 1440×900 dark：页面、卡片、输入与主题 Dropdown 无浅色孤岛。
- 1280×900 保持双栏；窄屏无 document 横向溢出。
- 主题切换正常；进入 TOTP 后输入框自动聚焦。
- Console 无 runtime error；除未登录 bootstrap 请求的预期 401 外无异常网络请求。

## 非目标

- 不提供临时演示账号或免认证入口。
- 不恢复三字段同屏登录。
- 不调整 Bootstrap 初始化向导视觉。
- 不修改登录 API、DTO、Cookie、权限或 Session 生命周期。
- 不批量重写历史文档中的旧版本文案。
