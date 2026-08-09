# Repository Guidelines

## 项目结构与模块组织

本项目是基于 Umi Max 的 React/TypeScript 应用。路由页面放在 `src/pages/<Page>/`，复用组件放在 `src/components/<Name>/`，接口客户端放在 `src/services/<domain>/`。公共 hook、类型、工具、常量和全局状态分别归入 `src/` 下对应目录。路由、代理和应用配置位于 `config/`，本地接口模拟数据位于 `mock/`。测试应与被测代码就近放置，`tests/setupTests.ts` 负责全局测试初始化。不要修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。

## 构建、测试与开发命令

- `pnpm install`：安装依赖并生成 Umi 配置文件。
- `pnpm dev`：启动本地开发服务器。
- `pnpm build`：生成生产构建。
- `pnpm lint`：运行 Biome 检查和 TypeScript 类型检查。
- `pnpm format`：使用 Biome 格式化代码并应用安全修复。
- `pnpm test`：单次运行 Vitest 测试套件。
- `pnpm test:watch` / `pnpm test:coverage`：监听测试或生成覆盖率报告。
- `pnpm doctor`：检查 React 代码中的常见问题。

## 共享 Skill 与组件知识查询

本仓的开发约定 skill 不内联，统一来自 `@unif` 共享 marketplace（`unif-design/skills`），由仓库的 `.claude/settings.json` 声明——克隆并信任目录后自动安装：`umi` 提供所有 umi 项目的通用基线（代码归位、组件与页面内部结构、`services/` 信封、React Query、路由与权限、命名、导入、工具链），`ant-design` 提供 PC/Web 专属约定（antd 6 与 pro-components 3 用法、ProComponents 铁律、桌面样式），`antd` 提供组件知识查询 CLI。未自动安装时手动执行 `npx skills add unif-design/skills --skill umi --skill ant-design --skill antd`，或 `/plugin install umi@unif-skills`（另加 `ant-design`、`antd`）。新增或修改代码前先查 `umi`（通用）与 `ant-design`（PC）skill；写 antd 代码前先用 `npx antd info <组件>` 查询当前版本 API，不凭记忆写组件属性。

## 编码风格与命名约定

使用 TypeScript、两空格缩进和单引号，并交由 Biome 统一格式化。React 组件及其目录采用 PascalCase（如 `Guide/Guide.tsx`），变量和函数采用 camelCase，hook 以 `use` 开头。引用 `src` 内容时优先使用 `@/` 别名；Umi API 一律 `from '@umijs/max'` 导入，禁止从 `'umi'` 导入。页面私有文件应就近存放并采用单数命名（`hook.ts`、`util.ts`、`constant.ts`、`type.ts`），私有子组件平铺存放而不再套一层 `components/`，组件样式统一写在 `index.style.ts`；外部只从 `index` 引用，仅在多处（≥2 处）复用时提升到公共目录。UI 优先采用 Pro Components，其次使用 Ant Design，禁止重复实现已有组件（自定义组件也基于 antd 改造）；样式使用 `antd-style` token 或 Tailwind 工具类，避免 Less 和硬编码主题色。

## 接口与数据获取

接口客户端手写在 `src/services/<domain>/`，统一使用 `@umijs/max` 导出的 `request`。后端响应固定为 `{ code, data, message }` 信封：`code === 200` 视为成功并取 `data`，其他取值一律按失败处理并使用 `message` 提示，不得把整个信封当作业务数据。服务端数据获取统一使用 React Query（从 `@umijs/max` 导入 `useQuery` / `useMutation`），表格数据走 ProTable 的 `request`；明确禁止使用 `useRequest`。

## 测试规范

Vitest 在 `happy-dom` 环境中运行，并结合 Testing Library 与 `jest-dom`。测试文件使用 `*.test.ts(x)` 或 `*.spec.ts(x)` 命名，放在 `src/` 下并优先与实现文件同目录。测试应关注可观察行为和用户交互。当前未设置覆盖率阈值；请检查 `pnpm test:coverage` 输出，并为缺陷修复补充回归测试。

## 提交与 Pull Request 规范

仓库目前没有提交历史。按照项目工具要求使用 Conventional Commits，例如 `feat(table): add user filtering` 或 `fix(access): handle missing role`。每个提交只处理一个明确主题。Pull Request 应说明行为变化、关联相关 issue、列出验证命令，并为 UI 改动附上截图。路由、代理、依赖或环境配置变更必须明确标注。

## 配置与安全

通过 `REACT_APP_ENV` 和 `config/proxy.ts` 选择代理配置。禁止提交凭据；敏感值应保存在本地环境配置中，并在 Pull Request 中说明所需环境变量名称。
