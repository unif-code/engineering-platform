# Repository Guidelines

## 项目结构与模块组织

本项目是基于 Umi Max 的 React/TypeScript 应用，是内部研发平台的 Web 仓库（`engineering-platform`）。前端结构与依赖方向以[平台应用与集成](docs/architecture/06-platform-application-integration.md)为准：`src/pages/` 只做路由装配，业务实现按领域放在 `src/features/<feature>/`，跨 Feature 复用 UI 放在 `src/components/`，接口层为 `src/services/{generated,transport}/`，公共 hook、类型、工具、常量与全局状态归入 `src/hooks/`、`src/types/`、`src/utils/`、`src/constants/`、`src/models/`。依赖方向固定为 `pages → features → services/generated`，共享组件不得依赖具体业务 service，Feature 之间只能使用公开入口。路由、代理和应用配置位于 `config/`，本地接口模拟数据位于 `mock/`。测试应与被测代码就近放置，`tests/setupTests.ts` 负责全局测试初始化。不要修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。

## 构建、测试与开发命令

- `pnpm install`：安装依赖并生成 Umi 配置文件。
- `pnpm dev`：启动本地开发服务器。
- `pnpm build`：生成生产构建。
- `pnpm lint`：运行 Biome 检查、TypeScript 类型检查、OpenAPI 生成一致性与架构基线清单检查。
- `pnpm format`：使用 Biome 格式化代码并应用安全修复。
- `pnpm test`：单次运行 Vitest 测试套件。
- `pnpm test:watch` / `pnpm test:coverage`：监听测试或生成覆盖率报告。
- `pnpm doctor`：检查 React 代码中的常见问题。
- `pnpm openapi:fetch` / `pnpm openapi:generate` / `pnpm openapi:check`：按 `openapi/artifact.lock.json` 锁定的后端 OpenAPI Artifact 取回并校验 Digest、生成 `src/services/generated`、做兼容性（git 基线，breaking 需主版本升级）与 dirty-diff 检查；Release 门使用 `pnpm openapi:check:release`（要求已锁定构件，随 CI 的 tag 触发执行）。
- `pnpm baseline:update` / `pnpm baseline:check`：架构文档变化后刷新/校验 `docs/architecture/baseline-manifest.json`（架构基线号与文档 SHA-256 的唯一事实源）。

## 共享 Skill 与组件知识查询

本仓的前端结构、数据获取与工程约定以 `docs/architecture/`（尤其 06 篇）为准，不采用 `@unif` 共享 marketplace 的 `umi` 通用基线 skill。antd 组件约定与知识查询仍来自该 marketplace（`unif-design/skills`），当前需手动安装：`ant-design` 提供 PC/Web 专属约定（antd 6 与 pro-components 3 用法、ProComponents 铁律、桌面样式），`antd` 提供组件知识查询 CLI。安装执行 `npx skills add unif-design/skills --skill ant-design --skill antd`，或 `/plugin install ant-design@unif-skills`（另加 `antd`）；仓库尚未提交声明这些 skill 的 `.claude/settings.json`，一旦提交，克隆并信任目录后即可自动安装。写 PC 界面前先查 `ant-design` skill；写 antd 代码前先用 `npx antd info <组件>` 查询当前版本 API，不凭记忆写组件属性。

## 编码风格与命名约定

使用 TypeScript、两空格缩进和单引号，并交由 Biome 统一格式化。React 组件及其目录采用 PascalCase（如 `Guide/Guide.tsx`），变量和函数采用 camelCase，hook 以 `use` 开头。引用 `src` 内容时优先使用 `@/` 别名；Umi API 一律 `from '@umijs/max'` 导入，禁止从 `'umi'` 导入。页面与 Feature 的私有文件就近存放并采用单数命名（`hook.ts`、`util.ts`、`constant.ts`、`type.ts`），私有子组件平铺存放而不再套一层 `components/`，组件样式统一写在 `index.style.ts`；外部只从公开入口（`index`）引用，仅在多处（≥2 处）复用时提升到公共目录。UI 优先采用 Pro Components，其次使用 Ant Design，对话界面使用 `@ant-design/x`，禁止重复实现已有组件（自定义组件也基于 antd 改造）；样式使用 `antd-style` token 或 Tailwind 工具类，避免 Less 和硬编码主题色。

## 接口与数据获取

接口层以[平台应用与集成](docs/architecture/06-platform-application-integration.md)为准：`src/services/generated/` 的 OpenAPI 客户端由后端仓（`engineering-platform-backend`）发布的版本化 OpenAPI Artifact 生成，不得手改；`src/services/transport/` 统一承载认证、请求基建与错误归一（Problem Details），页面不得依赖底层 HTTP 客户端异常。服务端数据获取统一使用 React Query（从 `@umijs/max` 导入 `useQuery` / `useMutation`），表格数据走 ProTable 的 `request`；明确禁止使用 `useRequest`。

## 测试规范

Vitest 在 `happy-dom` 环境中运行，并结合 Testing Library 与 `jest-dom`。测试文件使用 `*.test.ts(x)` 或 `*.spec.ts(x)` 命名，放在 `src/` 下并优先与实现文件同目录。测试应关注可观察行为和用户交互。当前未设置覆盖率阈值；请检查 `pnpm test:coverage` 输出，并为缺陷修复补充回归测试。

## 提交与 Pull Request 规范

仓库使用线性提交历史。按照项目工具要求使用 Conventional Commits，例如 `feat(table): add user filtering` 或 `fix(access): handle missing role`。每个提交只处理一个明确主题。Pull Request 应说明行为变化、关联相关 issue、列出验证命令，并为 UI 改动附上截图。路由、代理、依赖或环境配置变更必须明确标注。

## 配置与安全

通过 `REACT_APP_ENV` 和 `config/proxy.ts` 选择代理配置。禁止提交凭据；敏感值应保存在本地环境配置中，并在 Pull Request 中说明所需环境变量名称。
