# Engineering Baseline Sync Design

## 背景

`umi-pro-stencil` 已完成 Umi Max、Utoopack、TypeScript、Biome、Vitest、Husky 与统一验证脚本升级。`engineering-platform` 使用相同的 Web 技术栈，但仍保留旧的工程接线：pnpm 10、Umi 4.6.64、依赖 Umi 生成目录的 `tsconfig`、`mfsu: false`、直接 `vite` 依赖、npm 脚本链，以及缺失的实际 Git hooks。

本次同步只升级工程基线，不改变平台业务架构。平台的 Feature 分层、OpenAPI Artifact、生成客户端、Problem Details、dependency-cruiser、Docker 镜像发布和 Release 门继续作为本仓专属能力保留。

## 目标

- 将共享 Web 工程栈同步到当前 `umi-pro-stencil` 基线。
- 使用 Utoopack 统一开发与生产构建，不由项目直接维护 Vite。
- 让 TypeScript、Biome、Vitest 和工程验证不依赖 `src/.umi` 生成目录即可运行。
- 将本地与 CI 门禁统一到 `pnpm verify`。
- 为工程结构和 Markdown 增加可执行、可回归的验证器。
- 将 `AGENTS.md` 收敛为 `unif:umi` Skill 之上的平台专属 overlay。

## 非目标

- 不修改 `src/pages/`、`src/features/`、业务组件或交互行为。
- 不修改 API、Service、React Query、OpenAPI schema、生成客户端或 Problem Details 行为。
- 不把模板的 `{ code, data, message }` 通用协议规则套到平台现有接口层。
- 不修改 dependency-cruiser 的平台分层规则。
- 不改变 Nginx 运行时镜像、Docker 发布流程或 tag Release 门语义。
- 不提交 `src/.umi*`、`dist`、`coverage`、`node_modules`、`.pnpm-store` 等生成物。

## 优先级与架构边界

开发前读取 `unif:umi` Skill。若共享 Skill 与平台事实冲突，按以下优先级处理：

1. `engineering-platform-docs` 的平台架构与已锁定 OpenAPI Artifact。
2. 本仓 `AGENTS.md` 中的平台 overlay。
3. `unif:umi` 的通用 Umi 工程规则。

平台继续采用：

- `pages → features → services` 的依赖方向。
- `src/services/generated/` 由 OpenAPI Artifact 生成且不得手改。
- `src/services/transport/` 负责认证、HTTP 基建与 Problem Details 归一化。
- dependency-cruiser 与 `scripts/dependency-contract.mjs` 执行架构门禁。

## 运行时与构建基线

### Node 与 pnpm

- `packageManager` 设为 `pnpm@11.18.0`。
- `engines.node` 设为 `>=22.22.1`，`engines.pnpm` 设为 `>=11`。
- `.nvmrc` 保留 `24.12.0`，满足 Node floor。
- Docker builder 对齐为 `node:24.12.0-alpine`，避免本地、CI 与镜像构建使用不同 Node 大版本。
- 所有仓库脚本使用 `pnpm` 组合，不再通过 `npm run` 间接调用。

### 依赖同步

与模板共有的依赖同步到当前基线，平台专属依赖继续保留：

- 保留 `@ant-design/x`、`openapi-fetch`、`openapi-typescript`、`dependency-cruiser` 和 Testing Library `user-event`。
- 增加显式 `@types/node` 与 `@tanstack/react-query-devtools`。
- 将 `@umijs/max` 移入 `devDependencies`。
- 删除项目直接声明的 `vite`。Vitest 与 Umi 内部需要的 Vite 由各自传递依赖管理。
- 不直接依赖 `@utoo/pack`，Utoopack 由 Umi 管理。
- TypeScript 暂时保持 5.9.3。平台保留的 `openapi-typescript@7.13.0` 官方 peer range 为 `typescript: ^5.x`；Ant Design Pro 的 TypeScript 7 基线使用不同的 `max openapi` 生成链。本轮不替换平台 Artifact/Digest/兼容性门禁，也不引入双 TypeScript workspace。待生成器官方支持 TypeScript 7 后再整体升级。
- pnpm 11 的依赖构建脚本策略集中写入根 `pnpm-workspace.yaml`：只允许 `esbuild` 执行必要构建脚本，对无需执行脚本的兼容包显式拒绝，不开启全局放行。

### Umi 配置

`config/config.ts` 保留平台主题预加载、路由、代理、layout title、request、mock、React Query 和 Tailwind 配置，并增加模板通用构建项：

- `base: '/'`
- `@root` alias
- `hash: true`
- `fastRefresh: true`
- `routePrefetch: {}`
- `manifest: {}`
- `utoopack: {}`

删除 `mfsu: false` 与 `esbuildMinifyIIFE`。这些旧 bundler 配置不再作为 Utoopack 项目契约。

## 静态检查与测试基线

### 独立 TypeScript 配置

根 `tsconfig.json` 不再 extends `src/.umi/tsconfig.json`，直接声明 ES2022、bundler resolution、React JSX、strict、noEmit、noImplicitReturns、aliases、Vitest/Node types，以及 config/mock/src/tests/vitest 配置的 include。所有 `.umi*`、dist 和 coverage 目录明确 exclude。

Umi 的 React Query 插件运行时从 `@umijs/max` 转出 TanStack Query API，但独立 tsconfig 下该生成式转出缺少稳定声明、会让 `useQuery().data` 退化为 `any`。根 `typings.d.ts` 只补齐 `useQuery` 与 `useMutation` 到 TanStack Query 公共函数类型的真实映射，并由 compile-time 守卫持续验证；不在业务页面逐个补参数类型，也不重新依赖 `.umi` 生成配置。

`tsconfig.depcruise.json` 继续 extends 根配置，只保留 dependency-cruiser 所需的 `baseUrl` 与 paths 覆盖。

### Biome

- `biome check .` 同时执行格式化检查和 lint。
- 使用 Biome 2 的 `preset: "recommended"`，移除已弃用的 `recommended: true`。
- 检查 config、mock、scripts、src 和 tests。
- 只排除生成物、Markdown、lockfile、`.pnpm-store` 和 `src/services/generated`。
- 不通过扩大 ignore 来隐藏手写代码问题。

### Vitest

- 保留 `fileParallelism: false`，因为页面套件并发会造成资源饥饿。
- 增加 `clearMocks: true` 与 `restoreMocks: true`。
- `passWithNoTests` 设为 `false`。
- Coverage 包含手写 `src` 与 `mock`，排除生成客户端、声明文件、样式和测试文件。
- Statements、Branches、Functions、Lines 阈值统一设为 80%。

稳定 main 的沙箱外基线为 68 个测试文件、454 个测试全部通过；Statements 93.35%、Branches 85.95%、Functions 96.41%、Lines 93.25%。V8 Coverage 在当前受限沙箱内会阻塞 inspector 通道，沙箱外同命令正常运行，因此完整验收需在允许 V8 Coverage 的环境执行。

## 工程验证器

### 结构验证

新增 `scripts/verify-structure.mjs` 与相邻 Node test。验证器针对平台工程契约检查：

- pnpm/Node floor、必需依赖、`@umijs/max` 所属 dependency group。
- 不直接依赖 Vite 或 `@utoo/pack`。
- Utoopack 配置存在且旧 MFSU 配置消失。
- TypeScript 不依赖 `.umi`、启用 strict 且覆盖平台源码目录。
- Biome 覆盖手写目录并排除生成客户端。
- Husky hooks、lint-staged、共享 Skill 声明存在。
- 手写源码不从 `umi` 导入且不含 Less。

验证器不检查 API 信封或 Service 解包规则，避免覆盖平台协议。

### Markdown 验证

新增通用 Markdown 验证器，检查文件末尾换行、尾随空白、未闭合 fence、无效编码和断裂的仓内相对链接。历史计划中作为示例的伪链接改为代码文本；指向独立架构仓的引用改为外部 GitHub 链接，使 CI 单仓 checkout 也能验证。

## Git hooks、CI 与交付

- `.husky/pre-commit` 运行 lint-staged。
- `.husky/commit-msg` 运行 `max verify-commit`。
- lint-staged 对代码/config 执行 Biome 自动修复，对 Markdown 执行 Markdown 验证器。
- `pnpm verify` 聚合 Biome、TypeScript、dependency-cruiser、OpenAPI、tooling tests、结构、Markdown、Coverage、React Doctor、Ant Design CLI 与 Utoopack build。
- CI verify job 安装 frozen lockfile 后只运行 `pnpm verify`，避免本地与 CI 清单漂移。
- Docker publish job 与 tag Release gate 保持原语义。

## 实施与回滚

用户明确要求直接在已清洁且与远端同步的 `main` 工作区实施，因此不创建分支或隔离 worktree。每轮写入前后核对 `git status`，不覆盖其他会话新产生的文件。

实施按 TDD 推进：先写验证器测试并确认 RED，再写最小验证器实现；随后让验证器在现有仓库上产生预期 RED，逐项升级配置直到 GREEN。工程文档、配置和交付接线分成独立 Conventional Commits，任何批次均可单独 revert。

## 验收标准

- 项目使用 Utoopack，`package.json` 不直接声明 Vite 或 `@utoo/pack`。
- pnpm 11、Node floor、Docker builder 和 lockfile 一致。
- `tsc --noEmit` 不依赖预生成 `.umi`。
- 结构与 Markdown 验证器具有 RED/GREEN 证据。
- 平台 OpenAPI、Problem Details 与依赖方向门禁保持通过。
- Coverage 四项均不低于 80%。
- `pnpm verify` 完整通过。
- git diff 不包含业务/API 行为修改或生成物。
