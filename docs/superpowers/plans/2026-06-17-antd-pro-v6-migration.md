# AntD Pro v6 技术栈迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `umi-pro-stencil`（标准 @umijs/max 模板）原地升级到 Ant Design Pro v6 技术栈：utoopack 打包、antd6/pro3/icons6、React Query、Tailwind v4 + antd-style + CSS Modules、Biome、Vitest、react-doctor。

**Architecture:** 原地改造，以官方 `ant-design-pro@master` 的版本与配置为"已知可用"参照逐个替换。先打地基（依赖 + Biome + 重装），再接 umi 插件（tailwind/reactQuery），然后样式与 antd6 代码修复使构建转绿，最后叠加测试与体检工具。在 `feat/antd-pro-v6` 分支上小步提交。

**Tech Stack:** @umijs/max 4.6.64 · utoopack · React 19 · antd 6 · @ant-design/pro-components 3(beta) · @ant-design/icons 6 · antd-style 4 · Tailwind CSS v4 · @tanstack/react-query 5 · Biome 2 · Vitest 4 · react-doctor 0.5 · TypeScript 6

## Global Constraints

逐条来自 spec，每个任务都隐含遵守：

- React 已是 `react/react-dom ^19.2.5`、`@types/react ^19.2.14`、`@types/react-dom ^19.2.3`（不回退）。
- 目标版本：`antd ^6.4.4` · `@ant-design/pro-components ^3.1.12-0`（beta）· `@ant-design/icons ^6.2.5` · `typescript ^6.0.3` · `@umijs/max ^4.6.64`（不变）。
- 打包器：utoopack（`.umirc.ts` 的 `utoopack: {}`，已启用）。
- 样式：**禁止 less**。三件套：Tailwind v4（布局/间距原子类）、antd-style v4（依赖 token 的组件样式 `createStyles`）、CSS Modules（`*.module.css` 组件级隔离）。
- 代码质量：**只用 Biome**（移除 prettier/eslint/stylelint）。commit-msg 保留 umi 原生 `max verify-commit`，**不引 commitlint**。
- 测试：**只用 Vitest**（不引 Jest）。测试文件命名 `src/**/*.{test,spec}.{ts,tsx}`。
- 数据请求：`@tanstack/react-query`，经 umi 内置 `reactQuery: {}` 插件接入（自动 Provider，从 `@umijs/max` 导出 hooks）。
- 所有 commit 用 conventional 格式（`feat:`/`fix:`/`chore:`/`refactor:`/`test:`/`build:`），否则 `max verify-commit` 拦截。
- 验收口径（最终全绿）：`max dev` 能起 · `max build` 能过 · `npx tsc --noEmit` 无错 · `pnpm test` 通过 · `npx biome check` 通过 · `npx react-doctor` 跑通。

---

## 文件结构（创建/修改/删除）

**创建（根目录）**：`tailwind.config.js`、`tailwind.css`、`biome.json`、`vitest.config.ts`、`react-doctor.config.json`、`tests/setupTests.ts`
**创建（源码）**：`src/components/QueryDemo/index.tsx`（React Query + CSS Modules 示例）、`src/components/QueryDemo/index.module.css`、`src/components/Guide/Guide.test.tsx`（示例测试）
**修改**：`package.json`（依赖+脚本）、`.umirc.ts`（加 `tailwindcss`/`reactQuery`/`antd.appConfig`）、`.lintstagedrc`（→biome）、`src/components/Guide/Guide.tsx`（less→antd-style）、`src/pages/Home/index.tsx`（less→tailwind + 挂 QueryDemo）、`src/pages/Table/index.tsx`（antd6/pro3 修复）
**删除**：`src/components/Guide/Guide.less`、`src/pages/Home/index.less`、`.eslintrc.js`、`.stylelintrc.js`、`.prettierrc`、`.prettierignore`

> 说明：T1–T2 期间构建预期为"红"（antd6 代码未改、less 未除），**构建在 T4 转绿**，T5–T7 为附加项且需保持绿。

---

### Task 1: 地基 —— 依赖矩阵 + Biome 工具链 + 干净重装

**Files:**
- Modify: `package.json`
- Create: `biome.json`
- Modify: `.lintstagedrc`
- Delete: `.eslintrc.js`, `.stylelintrc.js`, `.prettierrc`, `.prettierignore`

**Interfaces:**
- Produces: 可用的 node_modules（修复 react-dom 解析）、`@biomejs/biome` 可执行、antd6/pro3/icons6/TS6 及 antd-style/tailwind/react-query/vitest/react-doctor 已安装。

- [ ] **Step 1: 用目标矩阵覆写 `package.json`**

```json
{
  "private": true,
  "author": "qq382724925 <382724935@qq.com>",
  "scripts": {
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
    "setup": "max setup",
    "lint-staged": "lint-staged"
  },
  "dependencies": {
    "@ant-design/icons": "^6.2.5",
    "@ant-design/pro-components": "^3.1.12-0",
    "@tanstack/react-query": "^5.101.0",
    "@umijs/max": "^4.6.64",
    "antd": "^6.4.4",
    "antd-style": "^4.1.0",
    "clsx": "^2.1.1",
    "dayjs": "^1.11.20",
    "react": "^19.2.5",
    "react-dom": "^19.2.5"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.5.0",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitest/coverage-v8": "^4.1.8",
    "@vitest/ui": "^4.1.8",
    "happy-dom": "^20.10.1",
    "husky": "^9.1.7",
    "lint-staged": "^17.0.2",
    "react-doctor": "^0.5.0",
    "typescript": "^6.0.3",
    "vitest": "^4.1.8"
  }
}
```

> 已移除 `prettier`、`prettier-plugin-organize-imports`、`prettier-plugin-packagejson`；happy-dom 作为 vitest 环境（不引 jsdom）。

- [ ] **Step 2: 创建 `biome.json`**（照搬 Pro v6 并去掉 Pro 专属忽略项）

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "css": { "parser": { "tailwindDirectives": true } },
  "files": {
    "ignoreUnknown": true,
    "includes": [
      "**/*",
      "!**/.umi",
      "!**/.umi-production",
      "!**/.umi-test",
      "!**/src/services",
      "!**/mock",
      "!**/dist",
      "!**/coverage",
      "!**/node_modules",
      "!biome.json",
      "!tailwind.css",
      "!pnpm-lock.yaml"
    ]
  },
  "formatter": { "enabled": true, "indentStyle": "space" },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "off", "noUnknownAtRules": "off" },
      "correctness": { "useUniqueElementIds": "off", "useExhaustiveDependencies": "off" },
      "a11y": { "noStaticElementInteractions": "off", "useValidAnchor": "off", "useKeyWithClickEvents": "off" }
    }
  },
  "javascript": { "jsxRuntime": "reactClassic", "formatter": { "quoteStyle": "single" } }
}
```

- [ ] **Step 3: 把 `.lintstagedrc` 改成 biome**

```json
{
  "**/*.{js,jsx,ts,tsx,css,json,md}": ["npx @biomejs/biome check --write"]
}
```

- [ ] **Step 4: 删除旧 lint/format 配置**

```bash
git rm .eslintrc.js .stylelintrc.js .prettierrc .prettierignore
```

- [ ] **Step 5: 干净重装并生成 .umi**

```bash
rm -rf node_modules
pnpm install
npx max setup
```
Expected: 安装成功；`node -e "require.resolve('react-dom/package.json')"` 不报错；`src/.umi` 生成。

- [ ] **Step 6: 确认 Biome 可运行**

Run: `npx biome --version && npx biome check . || true`
Expected: 打印 biome 版本；`check` 能跑（此时可能报若干 lint 问题，正常，后续任务会改到干净）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "build: bump to AntD Pro v6 stack deps and switch lint/format to Biome"
```
Expected: pre-commit 用 biome 跑过暂存的 json 文件；`max verify-commit` 接受 conventional 信息。

---

### Task 2: 接入 umi 插件 —— Tailwind v4 + React Query + antd App 上下文

**Files:**
- Modify: `package.json`（新增 `tailwindcss` devDep）, `.umirc.ts`
- Create: `tailwind.config.js`, `tailwind.css`

**Interfaces:**
- Consumes: T1 安装的 `@tanstack/react-query`（reactQuery 插件用）。
- Produces: 全局 Tailwind 原子类可用；`useQuery` 等可从 `@umijs/max` 导入；antd 静态方法（message 等）有 App 上下文。

> 注：T1 的 package.json 未含 `tailwindcss`，**本任务负责新增并安装**。umi 的 `tailwindcss` 插件需要项目内安装 tailwindcss，且**只需 `tailwindcss`、不需要 `@tailwindcss/postcss`**（umi 插件自管 PostCSS，与官方 Pro v6 一致）。

- [ ] **Step 1: 安装 tailwindcss v4，再修改 `.umirc.ts`**

先安装 tailwindcss（T1 漏装；只需它，不要 `@tailwindcss/postcss`）：

```bash
pnpm add -D tailwindcss@^4.3.0
```
Expected: `tailwindcss` 进入 devDependencies 且安装成功。

再修改 `.umirc.ts`（新增 `tailwindcss`、`reactQuery`；`antd: {}`→`antd: { appConfig: {} }`；其余不动）：

```ts
import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {
    appConfig: {},
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  reactQuery: {},
  tailwindcss: {},
  layout: {
    title: '@umijs/max',
  },
  routes: [
    { path: '/', redirect: '/home' },
    { name: '首页', path: '/home', component: './Home' },
    { name: '权限演示', path: '/access', component: './Access' },
    { name: ' CRUD 示例', path: '/table', component: './Table' },
  ],
  npmClient: 'pnpm',
  utoopack: {},
});
```

- [ ] **Step 2: 创建 `tailwind.config.js`**

```js
module.exports = {
  content: ['./src/**/*.tsx'],
};
```

- [ ] **Step 3: 创建 `tailwind.css`**（Tailwind v4 入口，umi tailwindcss 插件会自动引入）

```css
@import "tailwindcss";

@source "./src";
```

- [ ] **Step 4: 重新 setup 并确认配置可解析**

Run: `npx max setup`
Expected: 无配置报错；控制台不再因未知配置项（tailwindcss/reactQuery）报错。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: wire utoopack tailwind v4 and react-query umi plugins"
```

---

### Task 3: 样式迁移 + antd6 代码修复 —— 构建转绿

> 本任务把 less 全删、改写为 antd-style/Tailwind，并修掉 antd6/React19 的破坏性改动，使 `max build`/`tsc` 转绿。

**Files:**
- Modify: `src/components/Guide/Guide.tsx`
- Delete: `src/components/Guide/Guide.less`
- Modify: `src/pages/Home/index.tsx`
- Delete: `src/pages/Home/index.less`
- Modify: `src/pages/Table/index.tsx`

**Interfaces:**
- Produces: 无 less 依赖；`Guide`/`HomePage` 接口不变（`Guide` 仍接收 `{ name: string }`）。

- [ ] **Step 1: 用 antd-style 改写 `src/components/Guide/Guide.tsx`**

```tsx
import { Layout, Row, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';

const useStyles = createStyles(({ token }) => ({
  title: {
    margin: '0 auto',
    fontWeight: 200,
    color: token.colorTextHeading,
  },
}));

interface Props {
  name: string;
}

// 脚手架示例组件（antd-style: 依赖 token 的组件样式）
const Guide: React.FC<Props> = (props) => {
  const { name } = props;
  const { styles } = useStyles();
  return (
    <Layout>
      <Row>
        <Typography.Title level={3} className={styles.title}>
          欢迎使用 <strong>{name}</strong> ！
        </Typography.Title>
      </Row>
    </Layout>
  );
};

export default Guide;
```

- [ ] **Step 2: 删除 `Guide.less`**

```bash
git rm src/components/Guide/Guide.less
```

- [ ] **Step 3: 用 Tailwind 改写 `src/pages/Home/index.tsx`**（`padding-top:80px` → `pt-20`）

```tsx
import Guide from '@/components/Guide';
import { trim } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';

const HomePage: React.FC = () => {
  const { name } = useModel('global');
  return (
    <PageContainer ghost>
      {/* Tailwind: 布局/间距原子类 */}
      <div className="pt-20">
        <Guide name={trim(name)} />
      </div>
    </PageContainer>
  );
};

export default HomePage;
```

- [ ] **Step 4: 删除 `Home/index.less`**

```bash
git rm src/pages/Home/index.less
```

- [ ] **Step 5: 修复 `src/pages/Table/index.tsx` 的 React19 类型**（`useRef` 在 React19 类型下必须传初值）

把第 90 行：
```tsx
  const actionRef = useRef<ActionType>();
```
改为：
```tsx
  const actionRef = useRef<ActionType>(null);
```

- [ ] **Step 6: 跑类型检查，按报错补修**

Run: `npx tsc --noEmit`
Expected: 通过。若 pro-components 3 改了类型名（例如 `ProDescriptionsItemProps` 列类型），按 tsc 报错改为 v3 对应类型（如 `ProColumns<API.UserInfo>`），改完重跑至无错。

- [ ] **Step 7: 跑生产构建确认转绿**

Run: `npx max build`
Expected: 构建成功，产物在 `dist/`，无 less/antd6 报错。

- [ ] **Step 8: 启动开发服务器人工确认**

Run: `npx max dev`（起来后访问 http://localhost:8000/home）
Expected: 首页正常渲染；`pt-20` 间距生效（Tailwind 工作）；标题样式生效（antd-style 工作）。确认后 Ctrl-C。
> 若 `pt-20` 不生效：确认 `tailwind.css` 被引入（umi tailwindcss 插件应自动注入）；必要时在 `src/` 下新增 `global.css` 并 `@import './tailwind.css';`（umi 自动引入 `src/global.css`）。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "refactor: drop less for antd-style + tailwind and fix antd6/react19 breakages"
```

---

### Task 4: React Query + CSS Modules 示例

**Files:**
- Create: `src/components/QueryDemo/index.tsx`
- Create: `src/components/QueryDemo/index.module.css`
- Modify: `src/pages/Home/index.tsx`

**Interfaces:**
- Consumes: T2 的 `reactQuery` 插件（`useQuery` from `@umijs/max`）。
- Produces: `QueryDemo` 默认导出组件，无 props。

- [ ] **Step 1: 创建 `src/components/QueryDemo/index.module.css`**（CSS Modules + antd6 cssVar 变量）

```css
.card {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--ant-color-border, #f0f0f0);
  border-radius: 8px;
}
```

- [ ] **Step 2: 创建 `src/components/QueryDemo/index.tsx`**（React Query + CSS Modules 示例）

```tsx
import { useQuery } from '@umijs/max';
import { Spin, Typography } from 'antd';
import styles from './index.module.css';

// 示例：React Query 管理服务端状态（缓存/去重/重试开箱即用）；样式用 CSS Modules 隔离
const QueryDemo: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['demo-now'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return new Date().toLocaleString();
    },
  });

  return (
    <div className={styles.card}>
      <Typography.Text>React Query 示例（首次加载后命中缓存）：</Typography.Text>{' '}
      {isLoading ? (
        <Spin size="small" />
      ) : (
        <Typography.Text strong>{data}</Typography.Text>
      )}
    </div>
  );
};

export default QueryDemo;
```
> 若 `@umijs/max` 未导出 `useQuery`，改为 `import { useQuery } from '@tanstack/react-query';`（T2 已启用插件，通常可从 `@umijs/max` 导入）。

- [ ] **Step 3: 在 Home 挂上 `QueryDemo`**

把 `src/pages/Home/index.tsx` 的 import 区加上：
```tsx
import QueryDemo from '@/components/QueryDemo';
```
把 `<div className="pt-20">` 内容改为：
```tsx
      <div className="pt-20">
        <Guide name={trim(name)} />
        <QueryDemo />
      </div>
```

- [ ] **Step 4: 构建 + 开发态确认**

Run: `npx max build`
Expected: 构建成功。
Run: `npx max dev` → 访问 /home
Expected: 出现 React Query 示例卡片；刷新/二次进入命中缓存（值不闪变）；卡片边框用到 antd 主题色（CSS Modules + cssVar 生效）。Ctrl-C。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: add react-query + css-modules demo component"
```

---

### Task 5: Vitest 测试

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setupTests.ts`
- Create: `src/components/Guide/Guide.test.tsx`

**Interfaces:**
- Consumes: T1 安装的 vitest 全家桶 + `@testing-library/*`。

- [ ] **Step 1: 创建 `vitest.config.ts`**（含 umi 路径别名）

```ts
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@root': join(__dirname),
      '@@': join(__dirname, 'src', '.umi'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.umi'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/.umi/**', 'src/**/*.d.ts'],
    },
    passWithNoTests: true,
    testTimeout: 15000,
  },
});
```

- [ ] **Step 2: 创建 `tests/setupTests.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 3: 写一个失败的测试 `src/components/Guide/Guide.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Guide from './Guide';

describe('Guide', () => {
  it('renders welcome text with the given name', () => {
    render(<Guide name="@umijs/max" />);
    expect(screen.getByText(/欢迎使用/)).toBeInTheDocument();
    expect(screen.getByText('@umijs/max')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 跑测试**

Run: `pnpm test`
Expected: 1 个测试通过（`Guide` 渲染断言）。
> 若因 antd-style 主题缺 Provider 报错，用 antd `ConfigProvider` 包裹：`render(<ConfigProvider><Guide name="@umijs/max" /></ConfigProvider>)`（`import { ConfigProvider } from 'antd'`）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "test: add vitest config and Guide component test"
```

---

### Task 6: react-doctor 代码健康体检

**Files:**
- Create: `react-doctor.config.json`

**Interfaces:**
- Consumes: T1 安装的 `react-doctor`；`doctor` 脚本（T1 已加）。

- [ ] **Step 1: 创建 `react-doctor.config.json`**（照搬 Pro v6 并去掉 Pro 专属忽略）

```json
{
  "ignore": {
    "files": [
      "config/**",
      "mock/**",
      "scripts/**",
      "src/.umi*/**",
      "src/services/**",
      "**/*.md",
      "**/*.css"
    ]
  },
  "failOn": "error",
  "adoptExistingLintConfig": true
}
```

- [ ] **Step 2: 跑体检**

Run: `npx react-doctor`
Expected: 输出健康分与分项报告，能跑通（首次可能需联网拉规则）。如报出 error 级问题，按建议修；非阻断项可作为后续优化记录。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: add react-doctor config and health-check script"
```

---

### Task 7: 全量验收

**Files:** 无（仅校验，必要时小修）

- [ ] **Step 1: 逐项跑验收口径**

```bash
npx tsc --noEmit          # 期望: 无错
npx biome check .         # 期望: 通过（必要时 npx biome check --write 后复跑）
pnpm test                 # 期望: 通过
npx max build             # 期望: 成功
npx react-doctor          # 期望: 跑通
npx max dev               # 期望: 起服务，/home、/access、/table 三页正常；Ctrl-C
```

- [ ] **Step 2: 确认无 less / 无 prettier-eslint-stylelint 残留**

```bash
test -z "$(git ls-files '*.less')" && echo "无 less 文件 OK"
ls .eslintrc.js .stylelintrc.js .prettierrc .prettierignore 2>/dev/null && echo "仍有残留(需删)" || echo "旧配置已清 OK"
grep -rn "from 'umi'" src/ && echo "发现 from 'umi'(需改 @umijs/max)" || echo "无 from 'umi' OK"
```

- [ ] **Step 3: 收尾提交（如有小修）**

```bash
git add -A
git commit -m "chore: finalize AntD Pro v6 migration" || echo "无改动可提交"
```

- [ ] **Step 4: 报告完成 + 给出合并建议**

输出最终验收结果（每条命令的实际输出摘要），并提示在 `feat/antd-pro-v6` 分支上可发起合并到 `main`。
