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

## 编码风格与命名约定

使用 TypeScript、两空格缩进和单引号，并交由 Biome 统一格式化。React 组件及其目录采用 PascalCase（如 `Guide/Guide.tsx`），变量和函数采用 camelCase，hook 以 `use` 开头。引用 `src` 内容时优先使用 `@/` 别名，Umi API 从 `@umijs/max` 导入。页面私有文件应就近存放，仅在多处复用时提升到公共目录。UI 优先采用 Pro Components，其次使用 Ant Design；样式使用 `antd-style` token 或 Tailwind 工具类，避免 Less 和硬编码主题色。

## 测试规范

Vitest 在 `happy-dom` 环境中运行，并结合 Testing Library 与 `jest-dom`。测试文件使用 `*.test.ts(x)` 或 `*.spec.ts(x)` 命名，放在 `src/` 下并优先与实现文件同目录。测试应关注可观察行为和用户交互。当前未设置覆盖率阈值；请检查 `pnpm test:coverage` 输出，并为缺陷修复补充回归测试。

## 提交与 Pull Request 规范

仓库目前没有提交历史。按照项目工具要求使用 Conventional Commits，例如 `feat(table): add user filtering` 或 `fix(access): handle missing role`。每个提交只处理一个明确主题。Pull Request 应说明行为变化、关联相关 issue、列出验证命令，并为 UI 改动附上截图。路由、代理、依赖或环境配置变更必须明确标注。

## 配置与安全

通过 `REACT_APP_ENV` 和 `config/proxy.ts` 选择代理配置。禁止提交凭据；敏感值应保存在本地环境配置中，并在 Pull Request 中说明所需环境变量名称。
