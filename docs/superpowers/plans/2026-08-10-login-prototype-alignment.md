# Login Prototype Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 `/login` 的视觉外壳精确对齐已确认原型，同时完整保留 V0.2 员工编号/密码 → TOTP 两步认证。

**Architecture:** `LoginPage` 继续负责编排品牌 Hero、`LoginFlow` 和登录后的 Session 刷新；认证状态机、service、transport 与 mock 不变。先给共享 `BrandMark` 增加向后兼容的可选品牌名，再以页面语义结构和 token 样式重构登录外壳，最后用现有行为测试、全量门禁和浏览器场景验证。

**Tech Stack:** Umi Max 4、React 19、TypeScript、antd 6、@ant-design/pro-components 3、antd-style、Testing Library、Vitest、Biome

## Global Constraints

- 必须保留 V0.2 两步认证；员工编号/密码与 TOTP 不得同屏。
- 不修改 auth service、transport、mock、Session、路由或 Bootstrap 行为。
- 不增加演示账号、免认证入口、前端 TOTP 倒计时或演示数据重置。
- 1440×900 为桌面视觉基准；1280px 及以上保持横向双栏。
- 品牌文案固定为“研发协作平台”“集团内网 · V0.2”。
- Hero 固定为“需求到合并，一条可治理的 AI 交付链路。”，仅“可治理”高亮。
- 阶段固定为“需求对齐 → Spec / Plan 规格计划 → 开发 → Review 评审 → MR 合并”。
- 品牌橙只复用 `BRAND_ORANGE`；其余颜色使用 antd token，不制造 dark 主题浅色孤岛。
- 所有既有认证行为测试必须保留，只能补充或按公开文案变化做最小更新。
- 任何生产代码前必须先运行对应 RED；未知原因导致 `pnpm lint` 或 `pnpm test` 失败时立即停止并报告。

---

## File Map

- `src/components/BrandMark/index.tsx`：共享品牌标识；新增可选 `name`，默认行为不变。
- `src/components/BrandMark/index.test.tsx`：保护默认品牌名与显式品牌名。
- `src/pages/Login/constant.ts`：登录页唯一交付阶段文案。
- `src/pages/Login/index.tsx`：登录路由页语义结构、Hero、品牌栏与 `LoginFlow` 装配。
- `src/pages/Login/index.style.ts`：桌面原型、dark 和响应式视觉规则。
- `src/pages/Login/index.test.tsx`：公开品牌、Hero、阶段、版本和两步流回归。
- `src/features/auth/LoginFlow.tsx`：只将凭据步骤标题改为“账号登录”。
- `src/features/auth/LoginFlow.test.tsx`：保护凭据步骤公开标题，原认证测试保持原位。

---

### Task 1: 让 BrandMark 支持登录页品牌名

**Files:**
- Modify: `src/components/BrandMark/index.tsx`
- Modify: `src/components/BrandMark/index.test.tsx`

**Interfaces:**
- Consumes: 既有 `BrandMarkProps` 的 `collapsed`、`size`、`className`。
- Produces: `BrandMarkProps.name?: string`，默认值为 `'内部研发平台'`；可访问名和可见名称都使用最终 `name`。

- [ ] **Step 1: 写显式品牌名的失败测试**

在 `src/components/BrandMark/index.test.tsx` 保留原测试，并新增：

```tsx
it('只在显式传参时展示上下文品牌名', () => {
  render(<BrandMark name="研发协作平台" />);

  expect(
    screen.getByRole('img', { name: '研发协作平台' }),
  ).toBeInTheDocument();
  expect(screen.getByText('研发协作平台')).toBeInTheDocument();
  expect(screen.queryByText('内部研发平台')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行 RED**

Run:

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx
```

Expected: TypeScript/测试失败，指出 `BrandMarkProps` 尚无 `name` 或无法找到“研发协作平台”。

- [ ] **Step 3: 最小实现可选 `name`**

将组件签名调整为：

```tsx
export interface BrandMarkProps {
  collapsed?: boolean;
  size?: 'small' | 'default';
  className?: string;
  name?: string;
}

export function BrandMark({
  collapsed = false,
  size = 'default',
  className,
  name = '内部研发平台',
}: BrandMarkProps) {
  const { styles } = useStyles();

  return (
    <span
      aria-label={name}
      className={clsx(styles.root, collapsed && styles.collapsed, className)}
      role="img"
    >
      <span
        aria-hidden="true"
        className={clsx(
          styles.mark,
          size === 'small' ? styles.smallMark : styles.defaultMark,
        )}
      >
        IP
      </span>
      {collapsed ? null : (
        <span aria-hidden="true" className={styles.name}>
          {name}
        </span>
      )}
    </span>
  );
}
```

不得修改默认名称、`IP` 标识或折叠逻辑，确保 `MenuBrand` 零行为变化。

- [ ] **Step 4: 运行 GREEN 与格式检查**

Run:

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx
pnpm exec biome check src/components/BrandMark
```

Expected: BrandMark 全部测试通过；Biome 0 error。

- [ ] **Step 5: 提交共享组件改动**

```bash
git add src/components/BrandMark/index.tsx src/components/BrandMark/index.test.tsx
git commit -m "feat(brand): support contextual product name"
```

---

### Task 2: 按原型重构登录页外壳并保留两步认证

**Files:**
- Modify: `src/pages/Login/constant.ts`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/pages/Login/index.style.ts`
- Modify: `src/pages/Login/index.test.tsx`
- Modify: `src/features/auth/LoginFlow.tsx`
- Modify: `src/features/auth/LoginFlow.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `<BrandMark name="研发协作平台" size="small" />`；现有 `LoginFlowProps.onAuthenticated`；`ThemeSelector`。
- Produces: `/login` 的原型对齐视觉；`DELIVERY_STAGES` 五项只读字符串数组；凭据步骤公开标题“账号登录”。

- [ ] **Step 1: 扩展登录页测试形成视觉 RED**

在 `src/pages/Login/index.test.tsx` 从 Testing Library 增加 `within` 导入，并把原“呈现交付链路 Hero、平台品牌与主题入口”用例改为以下公开行为；其余认证用例原位保留：

```tsx
it('按原型呈现品牌、Hero、交付链路和版本', () => {
  renderLoginPage();

  expect(
    screen.getByRole('img', { name: '研发协作平台' }),
  ).toBeInTheDocument();
  expect(screen.getByText('集团内网 · V0.2')).toBeInTheDocument();

  const heading = screen.getByRole('heading', {
    name: /需求到合并，\s*一条可治理的\s*AI 交付链路。/,
  });
  expect(within(heading).getByText('可治理')).toBeInTheDocument();

  const deliveryFlow = screen.getByRole('list', {
    name: '研发交付链路',
  });
  for (const label of [
    '需求对齐',
    'Spec / Plan 规格计划',
    '开发',
    'Review 评审',
    'MR 合并',
  ]) {
    expect(within(deliveryFlow).getByText(label)).toBeInTheDocument();
  }

  expect(
    screen.getByText('© 2026 集团企业开发部 · 仅限内网使用'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '主题设置' }),
  ).toBeInTheDocument();
});
```

在 `src/features/auth/LoginFlow.test.tsx` 新增：

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

- [ ] **Step 2: 运行 RED 并确认只因新视觉缺失失败**

Run:

```bash
pnpm exec vitest run src/pages/Login/index.test.tsx src/features/auth/LoginFlow.test.tsx
```

Expected: 新原型用例因旧品牌/标题/阶段/版本文案失败；新 LoginFlow 用例因当前标题“欢迎回来”失败。既有认证用例仍通过。

- [ ] **Step 3: 固定五阶段文案**

将 `src/pages/Login/constant.ts` 替换为：

```ts
export const DELIVERY_STAGES = [
  '需求对齐',
  'Spec / Plan 规格计划',
  '开发',
  'Review 评审',
  'MR 合并',
] as const;
```

- [ ] **Step 4: 重构 LoginPage 语义结构**

保留 `refreshSession`、`postLoginPath`、`useEffect` 与所有错误处理，只替换 return 结构并新增 `clsx` 导入：

```tsx
return (
  <main className={styles.page}>
    <header className={styles.header}>
      <BrandMark name="研发协作平台" size="small" />
      <div className={styles.headerActions}>
        <span className={styles.version}>集团内网 · V0.2</span>
        <ThemeSelector />
      </div>
    </header>

    <section className={styles.hero} aria-labelledby="login-hero-title">
      <p className={styles.eyebrow}>ENGINEERING PLATFORM</p>
      <h1 className={styles.heroTitle} id="login-hero-title">
        需求到合并，
        <br />
        一条<span className={styles.heroAccent}>可治理</span>的
        <br />
        AI 交付链路。
      </h1>
      <ol className={styles.deliveryStages} aria-label="研发交付链路">
        {DELIVERY_STAGES.map((stage, index) => (
          <li className={styles.stageItem} key={stage}>
            <span
              className={clsx(
                styles.stage,
                index === DELIVERY_STAGES.length - 1 && styles.terminalStage,
              )}
            >
              {stage}
            </span>
            {index < DELIVERY_STAGES.length - 1 ? (
              <span aria-hidden="true" className={styles.stageArrow}>
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <small className={styles.meta}>
        © 2026 集团企业开发部 · 仅限内网使用
      </small>
    </section>

    <section className={styles.formPane} aria-label="登录表单">
      <div className={styles.formCard}>
        <LoginFlow onAuthenticated={refreshSession} />
      </div>
    </section>
  </main>
);
```

每个 `li` 同时承载阶段节点和其后的装饰箭头；箭头设置 `aria-hidden`，`ol/li` 保留阶段链的公开语义。

- [ ] **Step 5: 实现原型布局与主题样式**

在 `src/pages/Login/index.style.ts` 中删除旧 `brand`、`themeAction` 和整栏边界规则，使用以下布局值：

```ts
page: {
  position: 'relative',
  boxSizing: 'border-box',
  display: 'grid',
  gridTemplateAreas: '"hero form"',
  gridTemplateColumns: 'minmax(0, 1fr) 460px',
  minHeight: '100vh',
  overflow: 'hidden',
  backgroundColor: token.colorBgLayout,
  color: token.colorText,
  '@media (max-width: 1279px)': {
    gridTemplateColumns: 'minmax(0, 1fr) 420px',
  },
  [`@media (max-width: ${token.screenMD}px)`]: {
    gridTemplateAreas: '"hero" "form"',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto auto',
    overflow: 'auto',
  },
},
header: {
  position: 'absolute',
  top: 0,
  right: 0,
  left: 0,
  zIndex: 1,
  display: 'flex',
  height: 56,
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingInline: 44,
  [`@media (max-width: ${token.screenMD}px)`]: {
    paddingInline: token.padding,
  },
},
headerActions: {
  display: 'flex',
  alignItems: 'center',
  gap: token.marginXS,
},
version: {
  color: token.colorTextTertiary,
  fontSize: token.fontSizeSM,
},
hero: {
  position: 'relative',
  gridArea: 'hero',
  display: 'flex',
  minWidth: 0,
  flexDirection: 'column',
  justifyContent: 'center',
  paddingBlock: token.paddingXL * 3,
  paddingInline: 88,
  '@media (max-width: 1279px)': {
    paddingInline: 48,
  },
  [`@media (max-width: ${token.screenMD}px)`]: {
    paddingBlock: token.paddingXL * 2,
    paddingInline: token.padding,
  },
},
eyebrow: {
  marginBlock: `0 ${token.marginLG}px`,
  color: BRAND_ORANGE,
  fontSize: token.fontSizeSM,
  fontWeight: token.fontWeightStrong,
  letterSpacing: '0.3em',
},
heroTitle: {
  maxWidth: 720,
  margin: 0,
  color: token.colorTextHeading,
  fontSize: 50,
  fontWeight: 800,
  letterSpacing: '-0.035em',
  lineHeight: 1.28,
  '@media (max-width: 1279px)': {
    fontSize: 44,
  },
  [`@media (max-width: ${token.screenMD}px)`]: {
    fontSize: 36,
  },
},
heroAccent: { color: BRAND_ORANGE },
deliveryStages: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: token.marginXS,
  alignItems: 'center',
  marginBlock: `${token.marginXL + token.marginXS}px 0`,
  padding: 0,
  listStyle: 'none',
},
stageItem: {
  display: 'flex',
  alignItems: 'center',
  gap: token.marginXS,
},
stage: {
  paddingBlock: token.paddingXXS,
  paddingInline: token.paddingSM,
  border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  borderRadius: 14,
  backgroundColor: token.colorBgContainer,
  color: token.colorTextSecondary,
  fontSize: token.fontSizeSM,
},
terminalStage: {
  borderColor: token.colorText,
  backgroundColor: token.colorText,
  color: token.colorBgContainer,
},
stageArrow: {
  color: BRAND_ORANGE,
  fontSize: token.fontSizeSM,
},
meta: {
  position: 'absolute',
  bottom: 22,
  left: 88,
  color: token.colorTextQuaternary,
  fontSize: token.fontSizeSM,
  '@media (max-width: 1279px)': {
    left: 48,
  },
  [`@media (max-width: ${token.screenMD}px)`]: {
    position: 'static',
    marginTop: token.marginXL,
  },
},
formPane: {
  gridArea: 'form',
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  paddingInlineEnd: 88,
  '@media (max-width: 1279px)': {
    paddingInlineEnd: 48,
  },
  [`@media (max-width: ${token.screenMD}px)`]: {
    justifyContent: 'center',
    paddingBlock: `0 ${token.paddingXL * 2}px`,
    paddingInline: token.padding,
  },
},
formCard: {
  boxSizing: 'border-box',
  width: '100%',
  padding: 32,
  border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
  borderRadius: 14,
  backgroundColor: token.colorBgElevated,
  boxShadow: token.boxShadowSecondary,
  [`@media (max-width: ${token.screenMD}px)`]: {
    maxWidth: 460,
    padding: token.paddingLG,
  },
},
```

上述响应式值必须进入对应 style key；不得增加全局 CSS、Less 或硬编码浅色 RGBA 阴影。

- [ ] **Step 6: 只调整凭据步骤标题**

在 `src/features/auth/LoginFlow.tsx` 的凭据 `LoginForm` 中将：

```tsx
title="欢迎回来"
```

替换为：

```tsx
title="账号登录"
```

保留 `subTitle="使用平台账号继续"`、全部字段、rules、提交按钮、错误恢复与 TOTP 分支。

- [ ] **Step 7: 运行 focused GREEN**

Run:

```bash
pnpm exec vitest run src/components/BrandMark/index.test.tsx src/pages/Login/index.test.tsx src/features/auth/LoginFlow.test.tsx
pnpm exec biome check src/components/BrandMark src/pages/Login src/features/auth/LoginFlow.tsx src/features/auth/LoginFlow.test.tsx
```

Expected: 三组测试全部通过且无 warning；Biome 0 error。若仅有 formatter 差异，使用 scoped `pnpm exec biome check --write <same paths>` 后重新运行上述两条命令。

- [ ] **Step 8: 运行静态与组件专项门禁**

Run:

```bash
pnpm exec tsc --noEmit
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/pages/Login
NO_UPDATE_CHECK=1 pnpm exec antd lint ./src/features/auth
pnpm depcruise
git diff --check
```

Expected: 全部 exit 0；antd deprecated/a11y/usage 无本轮问题；依赖方向无 violation。

- [ ] **Step 9: 运行仓库全量门禁**

必须逐条运行，上一条失败就停止，不重试掩盖失败：

```bash
pnpm lint
pnpm test
```

Expected: 两条命令均 exit 0；Vitest 全部测试通过。原因不明的失败立即报告，不自行放宽全局 timeout、并发配置或断言。

- [ ] **Step 10: 浏览器验收登录页**

启动：

```bash
pnpm dev
```

使用 fresh browser profile，且在导航前设置视口，依次核对：

1. 1440×900 light：顶部栏 56px；品牌/版本正确；Hero 文案与五阶段完整；右侧卡片无裁切。
2. 1440×900 dark：背景、卡片、输入、主题 Dropdown 无浅色孤岛。
3. 1280×900：保持横向双栏，无 document 横向溢出。
4. 窄屏：Hero 与表单纵向排列，无 document 横向溢出。
5. 输入合法凭据并进入 TOTP：员工编号/密码消失，TOTP 自动聚焦；无需完成真实登录。
6. Console 无 runtime error，除未登录 `/me`、`/navigation` 的预期 401 外无异常请求。

保存 light/dark 各一张 1440×900 截图到 `/private/tmp` 作为本地验收证据，不提交截图。结束后停止 dev/browser 并确认端口释放。

- [ ] **Step 11: 提交登录页改动**

先确认精确范围：

```bash
git status --short
git diff --check
```

只暂存本 Task 六个文件：

```bash
git add src/pages/Login/constant.ts src/pages/Login/index.tsx src/pages/Login/index.style.ts src/pages/Login/index.test.tsx src/features/auth/LoginFlow.tsx src/features/auth/LoginFlow.test.tsx
git commit -m "feat(login): align authentication page with prototype"
```

Expected: commit 不包含 service、mock、路由、Session、生成目录或浏览器证据。
