# umi-pro-stencil

`@umijs/max`(umi 4) + **Ant Design Pro v6** Web 端模板。React 19 · TS 6 · antd 6 · pro-components 3 · 打包 utoopack。

## Skills（来自 @unif 共享 marketplace）

本仓的开发约定 skill **不内联**,统一来自 `@unif` 共享 marketplace(`unif-design/skills`),已在 `.claude/settings.json` 声明 —— 克隆并信任目录后自动安装:

- **umi**：所有 umi 项目通用基线——代码归位、组件/页面内部结构、services/信封、React Query、路由/权限、命名、导入、工具链。
- **ant-design**：PC/Web 专属——antd6/pro-components3 用法、ProComponents 铁律、桌面样式(antd-style + Tailwind)。
- **antd**：antd 组件知识查询 CLI(`npx antd info` 先查再写)。

手动安装:`npx skills add unif-design/skills --skill umi --skill ant-design --skill antd`,或 `/plugin install umi@unif-skills`(+ `ant-design` / `antd`)。

## 必守约定（详见上述 skills）

- **代码归位**：接口→`src/services/<模块>/`；复用组件→`src/components/<Name>/`；复用 hook→`src/hooks/`；全局类型→`src/types/`；纯函数→`src/utils/`；常量→`src/constants/`；全局态→`src/models/`；页面→`src/pages/<Page>/`；构建/路由→`config/`。
- **内部结构**：私有就近——子组件平铺(不套 `components/`)、私有文件单数(`hook.ts`/`util.ts`/`constant.ts`/`type.ts`)、样式 `index.style.ts`；外部只从 `index` 引；≥2 处复用才提到 `src/`。
- **接口**：手写 `services/`（`@umijs/max` 的 `request`）；信封 `{ code, data, message }`，`code===200` 成功取 `data`、失败用 `message`。
- **数据**：React Query（`useQuery`/`useMutation` from `@umijs/max`）；表格用 ProTable `request`；**不用 useRequest**。
- **组件（PC）**：优先 **ProComponents → antd**，**禁止重复造已有组件**；自定义也基于 antd 改造；写 antd 前 `npx antd info`。
- **样式（PC）**：组件 `index.style.ts`(antd-style token) + 布局 Tailwind；颜色走 token/cssVar；**禁 less / 静态内联**。
- **导入/工具链**：一律 `from '@umijs/max'`（非 `'umi'`）、`@/` 指 `src`、日期 dayjs；Biome 格式化+lint、Vitest(`*.test.tsx` 同目录)、conventional commits（`max verify-commit`）。

新增/修改代码前先查 **umi**（通用）+ **ant-design**（PC）skill。
