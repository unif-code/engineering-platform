# Repository Guidelines

## 项目结构与模块组织

本项目是基于 Umi Max 的 React/TypeScript 应用，是内部研发平台的 Web 仓库（`engineering-platform`）。前端结构与依赖方向以独立文档仓的[平台应用与集成](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/06-platform-application-integration.md)为准：`src/pages/` 只做路由装配，业务实现按领域放在 `src/features/<feature>/`，跨 Feature 复用 UI 放在 `src/components/`，接口层为 `src/services/{generated,transport}/`，公共 hook、类型、工具、常量与全局状态归入 `src/hooks/`、`src/types/`、`src/utils/`、`src/constants/`、`src/models/`。依赖方向固定为 `pages → features → services/generated`，共享组件不得依赖具体业务 service，Feature 之间只能使用公开入口。路由、代理和应用配置位于 `config/`，本地接口模拟数据位于 `mock/`。测试应与被测代码就近放置，`tests/setupTests.ts` 负责全局测试初始化。不要修改 `src/.umi/`、`dist/`、`coverage/` 等生成目录。

## 构建、测试与开发命令

- `pnpm install`：安装依赖并生成 Umi 配置文件。
- `pnpm dev`：启动本地开发服务器。
- `pnpm build`：生成生产构建。
- `pnpm lint`：运行 Biome 检查、TypeScript 类型检查、依赖方向与 OpenAPI 生成一致性检查。
- `pnpm format`：使用 Biome 格式化代码并应用安全修复。
- `pnpm test`：单次运行 Vitest 测试套件。
- `pnpm test:watch` / `pnpm test:coverage`：监听测试或生成覆盖率报告。
- `pnpm doctor`：检查 React 代码中的常见问题。
- `pnpm openapi:fetch` / `pnpm openapi:generate` / `pnpm openapi:check`：按 `openapi/artifact.lock.json` 锁定的后端 OpenAPI Artifact 取回并校验 Digest、生成 `src/services/generated`、做兼容性（git 基线；breaking 在 `0.x` 开发阶段需提升 minor，`1.x` 及以后需提升 major）与 dirty-diff 检查；Release 门使用 `pnpm openapi:check:release`（要求已锁定构件，随 CI 的 tag 触发执行）。
- 架构基线及文档 SHA-256 的唯一事实源是独立文档仓的 [baseline-manifest.json](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/baseline-manifest.json)，更新与校验由该文档仓自身 CI 承担。

## 共享 Skill 与组件知识查询

本仓的前端结构、数据获取与工程约定以 `engineering-platform-docs` 的架构文档（尤其 06 篇）为准，不采用 generic `umi` Skill。antd 组件约定与知识查询来自 Ant Design 官方 Skill 仓（`ant-design/antd-skill`）：`ant-design` 提供 PC/Web 专属约定（antd 6 与 Pro Components 用法、ProComponents 铁律、桌面样式），`antd` 提供组件知识查询 CLI。仓库通过 `skills-lock.json` 锁定这两个 Skill；克隆后可执行 `npx skills experimental_install` 恢复，也可手动执行 `npx skills add ant-design/antd-skill --skill ant-design --skill antd`。写 PC 界面前先查 `ant-design` Skill；写 antd 代码前先用 `npx antd info <组件> --format json` 查询当前版本 API，不凭记忆写组件属性。

## 编码风格与命名约定

使用 TypeScript、两空格缩进和单引号，并交由 Biome 统一格式化。React 组件及其目录采用 PascalCase（如 `Guide/Guide.tsx`），变量和函数采用 camelCase，hook 以 `use` 开头。引用 `src` 内容时优先使用 `@/` 别名；Umi API 一律 `from '@umijs/max'` 导入，禁止从 `'umi'` 导入。页面与 Feature 的私有文件就近存放并采用单数命名（`hook.ts`、`util.ts`、`constant.ts`、`type.ts`），私有子组件平铺存放而不再套一层 `components/`，组件样式统一写在 `index.style.ts`；外部只从公开入口（`index`）引用，仅在多处（≥2 处）复用时提升到公共目录。UI 优先采用 Pro Components，其次使用 Ant Design，对话界面使用 `@ant-design/x`，禁止重复实现已有组件（自定义组件也基于 antd 改造）；样式使用 `antd-style` token 或 Tailwind 工具类，避免 Less 和硬编码主题色。

## 接口与数据获取

接口层以独立文档仓的[平台应用与集成](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/06-platform-application-integration.md)为准：`src/services/generated/` 的 OpenAPI 客户端由后端仓（`engineering-platform-backend`）发布的版本化 OpenAPI Artifact 生成，不得手改；`src/services/transport/` 统一承载认证、请求基建与错误归一（Problem Details），页面不得依赖底层 HTTP 客户端异常。服务端数据获取统一使用 React Query（从 `@umijs/max` 导入 `useQuery` / `useMutation`），表格数据走 ProTable 的 `request`；明确禁止使用 `useRequest`。

## 测试规范

Vitest 在 `happy-dom` 环境中运行，并结合 Testing Library 与 `jest-dom`。测试文件使用 `*.test.ts(x)` 或 `*.spec.ts(x)` 命名，放在 `src/` 下并优先与实现文件同目录。测试应关注可观察行为和用户交互。语句、分支、函数与行覆盖率阈值均为 80%；请检查 `pnpm test:coverage` 输出，并为缺陷修复补充回归测试。

## 提交与 Pull Request 规范

仓库使用线性提交历史。按照项目工具要求使用 Conventional Commits，例如 `feat(table): add user filtering` 或 `fix(access): handle missing role`。每个提交只处理一个明确主题。Pull Request 应说明行为变化、关联相关 issue、列出验证命令，并为 UI 改动附上截图。路由、代理、依赖或环境配置变更必须明确标注。

治理例外先登记后引用：任何 `DEV-xxx` 编号必须先存在于 `engineering-platform-docs` 仓 `architecture/deviations.md` 的登记条目，才可在本仓 runbook、文档、清单或注释中引用；铸造新编号的一方负责在同一工作批次内完成 docs 仓登记。

## 配置与安全

通过 `REACT_APP_ENV` 和 `config/proxy.ts` 选择代理配置。禁止提交凭据；敏感值应保存在本地环境配置中，并在 Pull Request 中说明所需环境变量名称。

## Codex 原生记忆

- 平台共享记忆位于同级 `engineering-platform-docs/memories_1.sqlite`，同步规则以该仓 `MEMORIES.md` 为准。
- 仅当用户明确发送 `【同步记忆】` 时，进入同级 `engineering-platform-docs` 运行 `npm run memory:sync`；禁止直接复制或覆盖任一 SQLite 文件。
- 共享记忆同步进本机 Codex 原生数据库后由 Codex 自身消费，不在成员仓展开、复制或提交记忆正文。
- 记忆与事实冲突时，以当前用户指令、本仓当前 Git/代码、docs 架构文档和可执行测试为准。

## Superpowers 开发进度

- 开始或恢复开发任务时，先读取 `docs/superpowers/progress/current.md`；验证其中 `Based On Commit` 存在且是当前 HEAD 的祖先，再检查该提交之后的 Git log、工作树与测试证据。
- 恢复顺序固定为 `current.md → active plan/spec → Git log/status → 测试证据 → Codex memory`。信息冲突时，优先级为当前用户指令、当前 Git/代码、架构文档与测试、progress、memory。
- 仅当用户明确发送 `【同步进度】` 时更新本仓 `current.md` 并推送；不得自动提交业务源码，不得复制 `.superpowers/sdd`、会话或工作树 diff。首次初始化允许同一提交包含本节与 `current.md`。
- `Remote Recoverable: yes` 只表示继续开发所需的源码、计划和证据均已提交并推送；存在本机独有改动时必须写 `no`。
