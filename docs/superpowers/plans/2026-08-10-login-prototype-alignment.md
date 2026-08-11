# Login Prototype Alignment Implementation Plan

> **执行方式：** 使用 `executing-plans` 逐 Task 执行；生产代码前必须取得对应 RED，完成声明前使用 `verification-before-completion`。

**状态：** 执行中（Task 1–3、浏览器验收与独立 review 已完成，等待最终全量门禁和提交）。

**Goal:** 从品牌事实源和 Feature 边界上修复登录页漂移，使 `/login` 精确对齐最新原型，同时完整保留 V0.2 员工编号/密码 → TOTP 两步认证。

**Architecture:** 先集中平台品牌与认证场景主题常量，再让共享 `BrandMark`、Shell 和浏览器标题消费同一事实源；新增 auth Feature 的 `LoginShell` 承载左侧自伸展、右侧固定登录区的弹性布局，`LoginPage` 只保留 Session/redirect 装配；删除 page 层旧样式与文案常量。

**Tech Stack:** Umi Max 4、React 19、TypeScript、antd 6、@ant-design/pro-components 3、antd-style、Testing Library、Vitest、Biome

## Global Constraints

- 直接在用户明确授权的 `main` 分支实施。
- 必须保留 V0.2 两步认证；员工编号/密码与 TOTP 不得同屏。
- 不修改 auth service、transport、mock、Session、路由或 Bootstrap 行为。
- 不增加演示账号、免认证入口、前端 TOTP 倒计时或演示数据重置。
- 产品运行时名称统一为“研发协作平台”，品牌方块不显示 `IP`。
- 左侧 Hero 自动伸展，右侧登录区固定 548px。
- Hero、五阶段和“集团内网 · V0.2”使用集中常量或 auth Feature 常量。
- light 认证背景固定为 `#FDFCFA`；dark、卡片、边框和文字继续使用主题 token。
- 页面只能通过 auth Feature 公开入口消费 `LoginShell`/`LoginFlow`。
- `LoginForm` 只通过官方 `contentStyle` 统一设置 `width/minWidth: 320`，不改 `containerStyle` 或内部 DOM。
- 布局只使用单层 flex，不维护 breakpoint、`@media`、`flex-wrap` 或分辨率分支。
- 所有既有认证行为测试原位保留，只能补充或做公开文案的最小更新。
- 任一未知原因的测试或门禁失败立即停止，不放宽全局 timeout、并发或断言。

## File Map

新增：

- `src/constants/brand.ts`：产品名、版本、Eyebrow 和版权事实源。
- `src/features/auth/LoginShell.tsx`：认证页视觉壳。
- `src/features/auth/LoginShell.test.tsx`：视觉壳公开语义测试。
- `src/features/auth/LoginStepHeader.tsx`：绕开 Pro title 槽的原生步骤标题。
- `src/features/auth/login.constant.ts`：五阶段常量。
- `src/features/auth/login.style.ts`：认证页主题与左右弹性布局样式。

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

---

## Task 1: 集中品牌事实并统一应用 Shell

**Files:**

- Create: `src/constants/brand.ts`
- Modify: `config/defaultSettings.ts`
- Modify: `src/components/BrandMark/index.tsx`
- Modify: `src/components/BrandMark/index.test.tsx`
- Modify: `src/features/shell/HeaderTitle.tsx`
- Modify: `src/features/shell/index.test.tsx`

**Produces:** 单一 `PLATFORM_NAME`，空白橙色品牌方块，以及统一 Shell/browser title。

- [x] **Step 1: 先改测试形成品牌 RED**

更新 `BrandMark` 测试：

```tsx
it('展开和折叠时使用统一产品名且不渲染旧字母标识', () => {
  const { rerender } = render(<BrandMark />);

  expect(
    screen.getByRole('img', { name: '研发协作平台' }),
  ).toBeInTheDocument();
  expect(screen.getByText('研发协作平台')).toBeInTheDocument();
  expect(screen.queryByText('IP')).not.toBeInTheDocument();

  rerender(<BrandMark collapsed />);

  expect(
    screen.getByRole('img', { name: '研发协作平台' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('研发协作平台')).not.toBeInTheDocument();
  expect(screen.queryByText('IP')).not.toBeInTheDocument();
});
```

同步更新 `src/features/shell/index.test.tsx` 中菜单品牌与 fallback title 的公开期望为“研发协作平台”，并断言展开/折叠均无 `IP`。

- [x] **Step 2: 运行品牌 RED**

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx src/features/shell/index.test.tsx
```

Expected: 只因旧产品名和 `IP` 标识失败；其他 Shell 行为仍通过。

- [x] **Step 3: 新增品牌事实源并最小接线**

`src/constants/brand.ts`：

```ts
export const PLATFORM_NAME = '研发协作平台';
export const PLATFORM_RELEASE_LABEL = '集团内网 · V0.2';
export const PLATFORM_EYEBROW = 'ENGINEERING PLATFORM';
export const PLATFORM_COPYRIGHT = '© 2026 集团企业开发部 · 仅限内网使用';
```

实现要求：

- `BrandMark` 从 `PLATFORM_NAME` 读取可访问名与展开名称。
- 保留品牌方块 DOM，但移除 `IP` 文本。
- `config/defaultSettings.ts` 的 title 使用 `PLATFORM_NAME`。
- `HeaderTitle` fallback 使用 `PLATFORM_NAME`。
- 不新增品牌 variant 或页面级 name prop。

- [x] **Step 4: 运行品牌 GREEN 与 scoped checks**

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx src/features/shell/index.test.tsx
pnpm exec biome check config/defaultSettings.ts src/constants/brand.ts src/components/BrandMark src/features/shell
pnpm exec tsc --noEmit
```

Expected: 全部 exit 0，无新 warning。

- [x] **Step 5: 提交品牌基础改动**

只暂存本 Task 文件，提交：

```bash
git commit -m "refactor(brand): centralize platform identity"
```

---

## Task 2: 在 auth Feature 建立可维护的 LoginShell

**Files:**

- Modify: `src/constants/theme.ts`
- Create: `src/features/auth/login.constant.ts`
- Create: `src/features/auth/login.style.ts`
- Create: `src/features/auth/LoginShell.tsx`
- Create: `src/features/auth/LoginShell.test.tsx`
- Modify: `src/features/auth/index.ts`

**Consumes:** `BrandMark`、集中品牌常量、公开 `usePlatformTheme`。
**Produces:** 不读取 service/Session 的纯视觉 `LoginShell`。

- [x] **Step 1: 写 LoginShell 缺失能力测试**

测试必须通过公开 role/name 覆盖：

- 品牌可访问名与版本。
- 标题整体可访问名及独立“可治理”文本。
- `aria-label="研发交付链路"` 的五个 list item。
- 版权文案。
- `headerAction` 与 `children` 被原样装配。
- DOM 不出现 `IP`、演示数据重置或同屏 TOTP 文案。

- [x] **Step 2: 运行 LoginShell RED**

```bash
pnpm exec vitest run src/features/auth/LoginShell.test.tsx
```

Expected: 因 `LoginShell` 尚不存在而失败。

- [x] **Step 3: 建立认证语义 token 和阶段常量**

在 `src/constants/theme.ts` 增加：

```ts
export const LIGHT_AUTH_BACKGROUND = '#FDFCFA';
```

在 `login.constant.ts` 导出只读五阶段数组：

```ts
export const DELIVERY_STAGES = [
  '需求对齐',
  'Spec / Plan 规格计划',
  '开发',
  'Review 评审',
  'MR 合并',
] as const;
```

- [x] **Step 4: 实现 LoginShell 语义结构**

接口固定为：

```tsx
export interface LoginShellProps {
  children: ReactNode;
  headerAction: ReactNode;
}
```

结构固定为 `<main>` + 绝对顶部 `<header>` + Hero `<section>` + 表单 `<section>`。`LoginShell` 使用 `usePlatformTheme()` 的 `resolvedTheme` 传给 `useStyles`，light 取 `LIGHT_AUTH_BACKGROUND`，dark 取 `token.colorBgLayout`。

禁止：

- 读取 auth service、Session、history 或 URL。
- 从 `src/pages` 导入内容。
- 为 visual test 添加测试专用生产属性。

- [x] **Step 5: 实现原型与弹性布局样式**

桌面关键值：header 56/44、Hero 88、右侧登录区 548、form card 460、LoginForm 320、title 50/800/1.28、card 14/32。阶段节点、卡片、边框、阴影和 dark 模式使用 token；只有品牌橙与认证 light 背景使用集中常量。

页面使用单层 flex：Hero `flex: 1`，右侧登录区 `flex: 0 0 548px`；不新增 breakpoint、`@media`、`flex-wrap` 或分辨率分支。

- [x] **Step 6: 公开 Feature 入口并运行 GREEN**

从 `src/features/auth/index.ts` 导出 `LoginShell` 和类型。

```bash
pnpm exec vitest run src/features/auth/LoginShell.test.tsx
pnpm exec biome check src/constants/theme.ts src/features/auth/LoginShell.tsx src/features/auth/LoginShell.test.tsx src/features/auth/login.constant.ts src/features/auth/login.style.ts src/features/auth/index.ts
pnpm exec tsc --noEmit
```

Expected: 全部 exit 0。

---

## Task 3: 将 LoginPage 收敛为路由装配并保留认证状态机

**Files:**

- Modify: `src/pages/Login/index.test.tsx`
- Modify: `src/features/auth/LoginFlow.test.tsx`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/features/auth/LoginFlow.tsx`
- Create: `src/features/auth/LoginStepHeader.tsx`
- Modify: `src/features/auth/login.style.ts`
- Delete: `src/pages/Login/constant.ts`
- Delete: `src/pages/Login/index.style.ts`

- [x] **Step 1: 就地改写现有页面与 LoginFlow 测试形成 RED**

保留 `src/pages/Login/index.test.tsx` 全部认证、错误、Bootstrap、Session commit 和 redirect 测试。只把首个视觉用例更新为最新品牌、Hero、五阶段、版本、版权和主题入口。

在 `LoginFlow.test.tsx` 新增凭据标题保护：

```tsx
it('凭据步骤使用账号登录标题并保持两字段', () => {
  render(<LoginFlow onAuthenticated={mocks.onAuthenticated} />);

  expect(
    screen.getByRole('heading', { name: '账号登录' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('员工编号')).toBeInTheDocument();
  expect(screen.getByLabelText('密码')).toBeInTheDocument();
  expect(screen.queryByLabelText('TOTP 动态码')).not.toBeInTheDocument();
});
```

- [x] **Step 2: 运行装配 RED**

```bash
pnpm exec vitest run src/pages/Login/index.test.tsx src/features/auth/LoginFlow.test.tsx
```

Expected: 视觉用例因页面尚未使用 `LoginShell` 失败；标题用例因 Pro title 只产生普通 `span` 而失败。既有认证行为继续通过。

- [x] **Step 3: 最小接线并删除 page 私有视觉文件**

`LoginPage` 保留 `refreshSession`、`postLoginPath`、`useEffect` 与错误处理，return 收敛为：

```tsx
<LoginShell headerAction={<ThemeSelector />}>
  <LoginFlow onAuthenticated={refreshSession} />
</LoginShell>
```

新增 `LoginStepHeader`，在表单内容区用原生 `h2` 呈现“账号登录”与“验证动态码”；不再使用 Pro 的 `title`/`subTitle` 槽。两个 LoginForm 共享官方 `contentStyle={{ width: 320, minWidth: 320 }}`；删除 page 层 `constant.ts` 和 `index.style.ts`，并确保没有残留导入。

- [x] **Step 4: 运行 focused GREEN 和架构门**

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx src/features/shell/index.test.tsx src/features/auth/LoginShell.test.tsx src/features/auth/LoginFlow.test.tsx src/pages/Login/index.test.tsx
pnpm exec biome check config/defaultSettings.ts src/constants src/components/BrandMark src/features/shell src/features/auth src/pages/Login
pnpm exec tsc --noEmit
pnpm depcruise
git diff --check
```

Expected: 全部 exit 0；依赖方向无 violation。

- [x] **Step 5: 运行 antd 专项检查**

```bash
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/auth
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/pages/Login
```

Expected: deprecated/a11y/usage 无本轮问题。

---

## Task 4: 全量验证、浏览器验收与提交

- [ ] **Step 1: 运行全量门禁**

逐条运行，上一条失败即停止：

```bash
pnpm lint
pnpm test
```

Expected: 全部 exit 0。不以重试掩盖失败。

- [x] **Step 2: 浏览器验收**

启动 `pnpm dev`，使用 fresh profile 验收：

1. light：背景 `#FDFCFA`；header 56px；Hero、五阶段和 460px 卡片无裁切。
2. dark：页面、卡片、输入和主题 Dropdown 无浅色孤岛。
3. 左侧 Hero 自动填充，右侧 548px 登录区、460px 卡片和 320px LoginForm 尺寸稳定。
4. 凭据成功后只出现 TOTP 且自动聚焦。
5. 应用 Shell 展开/折叠均显示新品牌，无 `IP`。
6. Console 无 runtime error；网络仅允许未登录 bootstrap 的预期 401。

截图保存到 `/private/tmp`，不提交；结束后停止 dev/browser 并确认端口释放。

- [x] **Step 3: 请求独立只读 review**

按 `requesting-code-review` 对本计划全部代码 diff 做一次只读 review。Critical/Important 必须先技术核验，再按 TDD 修复并重新运行受影响门禁。

- [ ] **Step 4: 精确提交登录改动**

确认 `git status --short`、`git diff --check` 和 staged 文件清单。按主题提交：

```bash
git commit -m "feat(login): align authentication shell with prototype"
```

不得包含 service、mock、路由、Session、生成目录、截图或其他任务文件。

- [ ] **Step 5: 使用 finishing-a-development-branch 收口**

只在全部验证通过后进入 `finishing-a-development-branch`，报告 commit、验证证据、浏览器截图位置和任何剩余 concern。
