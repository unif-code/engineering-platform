# umi-pro-stencil → Ant Design Pro v6 技术栈现代化（设计）

- 日期：2026-06-17
- 仓库：`umi-pro-stencil`（标准 `@umijs/max` 模板）
- 策略：**原地现代化**（保留精简结构与 git 历史），以官方 `ant-design-pro@master`（v6）的版本与配置为"已知可用"参照
- 决策已定：原地改造 · React 19 · 测试用 Vitest

## 0. 当前实际状态（已校正）

项目已是标准 umi-max 模板，且部分目标已提前完成。本次只需补齐"未完成项"：

| 已完成 ✅ | 待完成 ❌ |
| --- | --- |
| `react/react-dom ^19.2.5` + `@types/react(-dom)` 19 | antd 5→6 · pro-components 2→3 · icons 5→6 |
| `.umirc.ts` 已存在，`utoopack: {}` 已启用 | TS 5→6 |
| `.gitignore` 已含 `.turbopack`/`.umi`/`dist` | `.umirc.ts` 补 `antd.theme.cssVar` + tailwind 接入 |
| husky + lint-staged + commit-msg(`max verify-commit`) 已接好 | 删 less，引 antd-style/tailwind/CSS Modules |
| `npmClient: 'pnpm'`、routes(/home /access /table) | 引 @tanstack/react-query + Provider + 示例 |
|  | prettier/eslint/stylelint → Biome；引 vitest、react-doctor、clsx、dayjs |

## 1. 目标与背景

把本模板从 antd5 / prettier+eslint+stylelint 一栈升级到 **Ant Design Pro v6 技术栈**。本仓是精简模板（仅 demo 页，几乎无业务代码），不存在"逐步迁移业务"的风险，故原地升级优于"新建 v6 项目"。所有目标版本按官方 v6 `package.json` 锁定；官方 v6 用的就是 **stable `@umijs/max@^4.6.64`**（与本仓一致），无需 canary。

## 2. 非目标（YAGNI）

官方 Pro v6 仓里以下内容**不引入**，保持模板精简：Cloudflare Workers/Hono 后端、D3 hex 地图、`max openapi` 生成、lodash→native 全量替换、整套业务页面、cross-env 多环境脚本矩阵、commitlint（已有 `max verify-commit` 代替，见 §7）。

## 3. 依赖版本矩阵（按官方 v6 锁定）

### 升级

| 包                         | 现状    | 目标                                 |
| -------------------------- | ------- | ------------------------------------ |
| antd                       | ^5.4.0  | **^6.4**                             |
| @ant-design/pro-components | ^2.4.4  | **^3.1.12-0**（beta，官方亦用 beta） |
| @ant-design/icons          | ^5.0.1  | **^6.2**                             |
| typescript                 | ^5.0.3  | **^6.0**                             |
| react / react-dom / @types | ^19.2   | （已完成，不动）                     |
| @umijs/max                 | ^4.6.64 | （不变，已支持 v6 栈）               |

### 新增

- 运行时：`antd-style ^4.1` · `tailwindcss ^4.3` + `@tailwindcss/postcss` · `@tanstack/react-query ^5.101` · `clsx ^2.1` · `dayjs`（确保存在，antd6 默认日期库）
- 开发：`@biomejs/biome ^2.5` · `vitest`(4.x) · `@vitest/coverage-v8` · `@vitest/ui` · `happy-dom` · `jsdom` · `@testing-library/react` · `@testing-library/jest-dom` · `@testing-library/dom` · `react-doctor ^0.5`

### 移除

- devDeps：`prettier` · `prettier-plugin-organize-imports` · `prettier-plugin-packagejson`
- 配置文件：`.eslintrc.js`（`@umijs/max/eslint`）· `.stylelintrc.js`（`@umijs/max/stylelint`，仅为 less 服务）· `.prettierrc` · `.prettierignore`（均由 Biome 接管；eslint/stylelint 是 @umijs/max 内置，无独立 npm 包需卸载，删配置文件即可，不再调用 `max lint`）
- 保留：`husky`、`lint-staged`（仅改所跑命令为 biome）、`.npmrc`、`.gitignore`、commit-msg 的 `max verify-commit`

## 4. 构建与 umi 配置（utoopack 已开）

`.umirc.ts` **已存在**（含 `utoopack: {}`、`antd: {}`、access/model/initialState/request/layout、routes、`npmClient: 'pnpm'`）。本次**修改**而非新建：

- `utoopack: {}` —— 已启用，保持。
- `antd: {}` → `antd: { theme: { cssVar: true } }` —— 开启 antd 6 的 **CSS 变量模式**（v6 默认）。
- 接入 Tailwind —— **镜像官方 v6 的 Tailwind v4 接法**（umi 内置 tailwind 偏 v3，v4 用 `@tailwindcss/postcss` + 全局 `@import "tailwindcss"`，按 v6 仓配置照搬，见风险点）。
- `request: {}`（umi 内置请求插件）保留 —— React Query 是**附加**的全局数据层，与之不冲突。
- 审查 `from 'umi'` → `from '@umijs/max'`（本模板已是 `@umijs/max`，确认无遗漏即可）。

## 5. 样式体系（删 less，三件套分工）

删除 `src/components/Guide/Guide.less`、`src/pages/Home/index.less`（同时删 `.stylelintrc.js`），建立 Pro v6 同款分工，并在模板各留一处示范：

- **Tailwind v4**（布局/间距/原子类）：`Home/index.tsx` 的 `.container{padding-top:80px}` → `className="pt-20"`。
- **antd-style v4**（依赖 antd 主题 token 的组件样式）：`Guide.tsx` 的 `.title{margin:0 auto;font-weight:200}` → `createStyles` 写法，演示 token 用法。
- **CSS Modules**（组件级隔离）：启用 `*.module.css` 约定，留一个最小示例文档化用法。

## 6. 数据请求（React Query）

- 在 umi 运行时 `src/app.tsx` 导出 `rootContainer`，用 `<QueryClientProvider client={queryClient}>` 包裹应用（全局单例 `QueryClient`）。
- `src/pages/Table/index.tsx` 的 `ProTable` 的 `request` 是 pro-table 自带能力，**保留不动**（它不是 `useRequest`）。
- 新增一个用 `useQuery` 的最小示例，作为模板范式。

## 7. 代码质量与 git 钩子（Biome + 现有 husky/lint-staged + max verify-commit）

- `biome.json` —— Biome 同时做 lint + format；忽略生成物 `src/.umi`、`src/.umi-production`、`src/.umi-test`、`dist`、`node_modules`（按 v6 `biome.json` 照搬并适配本仓路径）。
- **改写现有 `.lintstagedrc`**（当前用 `max lint`(eslint/stylelint) + prettier）为 biome：
  ```json
  {
    "**/*.{js,jsx,tsx,ts,css,json,md}": ["npx @biomejs/biome check --write"]
  }
  ```
- **commit-msg**：保留现有 `.husky/commit-msg` → `npx --no-install max verify-commit $1`（umi 原生 conventional-commit 校验，零额外依赖）。**不引 commitlint**（与 Pro v6 唯一刻意的差异，理由：更精简、umi-native；如需严格对齐可换 commitlint，待评审确认）。
- `.husky/pre-commit` → 现有 `npx --no-install lint-staged --quiet` 保留。
- **react-doctor**：作为 `npm run doctor`（`react-doctor`）健康体检脚本，与 Biome 互补；可选接 CI。

### scripts（保持精简）

```jsonc
{
  "dev": "max dev",
  "build": "max build",
  "start": "npm run dev",
  "format": "biome check --write",
  "biome:lint": "biome lint",
  "lint": "npm run biome:lint && npm run tsc",
  "tsc": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui",
  "doctor": "react-doctor",
  "prepare": "husky",
  "postinstall": "max setup",
  "setup": "max setup"
}
```

（`tsc --noEmit` 依赖 `src/.umi/tsconfig.json`，需先 `max setup` 生成 `.umi`）

## 8. 测试（Vitest，仅一套）

umi 官方指南用 Jest、Pro v6 用 Vitest，二者互斥——**只上 Vitest**（对齐 v6）。

- `vitest.config.ts` —— 镜像 v6：配 umi 路径别名（`@`→`src`、`@@`→`src/.umi`）、`happy-dom`/`jsdom` 环境、setup 引入 `@testing-library/jest-dom`。
- `tests/` 目录 + 一个示例组件测试（如 `Guide` 渲染断言）。

## 9. 杂项

- **dayjs**：antd 6 默认日期库；确认无 `moment` 残留（本模板预期无）。
- **clsx**：className 组合工具。
- **tsconfig / 类型**：`@types/react(-dom)` 已是 19；TS 升 6；`tsconfig.json` 仍 `extends ./src/.umi/tsconfig.json`。

## 10. 风险与验证点

1. **Tailwind v4 × umi/utoopack** 最易出问题（umi 内置 tailwind 偏 v3）——严格照搬 Pro v6 的 v4 接法。
2. **pro-components 3.x 为 beta**、**TS 6** 大版本、**antd 6 破坏性变更**（cssVar、个别 API/静态方法）——逐项核对 Guide/Table 用到的 antd 组件。
3. **utoopack 与 less**：`@utoo/pack` 的 less 是可选 peer；删 less 后无需 less-loader 链，反而更干净；但要确认 tailwind/postcss 在 utoopack 下的加载链正常。
4. **验证口径（完成标准）**：`max dev` 能起 · `max build` 能过 · `tsc --noEmit` 无错 · `vitest run` 通过 · `biome check` 通过 · `react-doctor` 跑通。

## 11. 实施时需从官方 v6 仓抓取并适配的文件

`.umirc.ts`（tailwind/antd 段参照）、`biome.json`、`vitest.config.ts`、tailwind 全局样式入口、`app.tsx`（react-query provider 写法参照）。其余配置内容已在本文档给出。
