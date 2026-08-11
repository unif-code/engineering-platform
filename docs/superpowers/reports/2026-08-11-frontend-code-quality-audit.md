# 前端代码质量深度审计报告

## 结论

本轮对当前 `main` 的全部手写前端代码、Mock、测试工具、质量脚本和直接相关配置做了逐文件只读审计。审计范围共 317 个 Git tracked 文件：核心代码范围 296 个，相关仓库配置 21 个；另有 4 个 generated client 文件、`openapi/spec.json`、`pnpm-lock.yaml` 和历史文档被明确排除。覆盖账本与 Git 文件数相等，没有抽样遗漏。

当前代码不存在需要重新设计页面或推翻组件体系的问题。原型布局、主题、表格横向滚动、Drawer/Inspector 固定业务尺寸、ellipsis 所需 `minWidth: 0` 和 reduced-motion 规则均有明确职责，应保留。主要改进方向是：把路由业务实现迁出 `src/pages/`、收紧 Administration 内部边界、删除历史兼容层、统一重复的异步/Mock 基建，并修复少量有直接证据的问题。

## 事实源与诊断证据

- 架构事实源：`../engineering-platform-docs/architecture/06-platform-application-integration.md`。
- React 依据：React 19.2 官方 [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)。用户事件引发的导航应留在事件处理链，不应经过镜像 state + Effect。
- Ant Design 依据：仓库锁定 `antd@6.4.4`，使用 `NO_UPDATE_CHECK=1 pnpm exec antd info` 查询 `Progress`、`Select`、`Steps`、`Form`；参考官方 [LLMs.txt](https://ant.design/docs/react/llms/)。
- Pro Components 依据：本地锁定 `@ant-design/pro-components@3.1.14-6` 的类型声明与运行时代码。
- React：实际安装 `react@19.2.7`；`pnpm doctor` exit 0。
- Ant Design：`antd usage ./src` 扫描 247 文件、30 个组件、180 次 import；`antd lint ./src` 为 0 deprecated / 0 a11y / 0 usage，只有 14 个 `Select virtual={false}` 性能提示；`antd doctor` 12 项通过，唯一 SSR CSS-in-JS 提示因本应用 `ssr: false` 不构成缺陷。
- 全量基线：`pnpm lint` 通过；`pnpm test` 68/68 files、454/454 tests 通过。
- TypeScript 探针：`tsc --noEmit --noUnusedLocals --noUnusedParameters` 通过，说明可以把两项约束纳入根配置。
- Biome 探针：当前关闭的三项 a11y 规则均 0 issue；`useExhaustiveDependencies` 只发现 `ModelCatalog` 一个冗余依赖；`noExplicitAny` 只涉及 `config/proxy.ts` 和受上游泛型约束的 `DetailDrawer`。
- CSS 覆盖：全部 `index.style.ts` 的静态 style key 均有消费者；动态 `styles[tone]` 已人工核对。没有可证明的 orphan style。

## 已确认 Findings

| ID | 等级 | 位置 | 证据与处理 |
| --- | --- | --- | --- |
| F-01 | Important | `scripts/openapi.mjs` | `checkBaselineCompatibility()` 解构的是 `ref`，两个 breaking 分支却插值未定义的 `baseRef`；真实 breaking Artifact 会抛 `ReferenceError`，遮蔽应有的兼容性诊断。先加 Node fixture RED，再改用 `ref`。 |
| F-02 | Important | `src/pages/**` | 除 Bootstrap 薄装配外，136 个路由目录文件持有 fixture、查询、mutation、表单、状态和测试，违反 `pages → features`。按业务域迁入 Feature，路由路径和页面 DOM 不变。 |
| F-03 | Normal | `src/pages/Login/index.tsx` | 登录成功先写 `loginSucceeded`，再由 Effect 导航；这是用户提交事件产生的动作。应在 `setInitialState` 完成后直接 `history.push(postLoginPath)`，避免一次镜像 state 和额外 render。 |
| F-04 | Normal | `src/pages/Admin/index.tsx` | 外层 `div role="progressbar"` 包裹本身已输出 `role="progressbar"` 与 ARIA value 的 Ant `Progress`，形成嵌套重复语义。把 accessible name 直接传给 `Progress`。 |
| F-05 | Normal | `src/features/auth/RouteGuard.tsx`、`src/access.ts` | Auth RouteGuard 只是 Navigation RouteGuard 的无调用转发；Umi access 只返回 `canAccessAdmin`，routes 无 `access` 消费。删除两组兼容层、测试和空 `access: {}` 注册。 |
| F-06 | Normal | `src/services/transport/envelope.ts`、`src/types/api.ts` | V0.1 `{code,data,message}` envelope 已无调用，且与当前 Problem Details/OpenAPI 规则冲突。删除文件和 public export。 |
| F-07 | Normal | Administration 列表页 | AdminUsers、AdminWorkspaces、AdminGrants 重复实现 request generation、卸载失效、total 更新与错误抑制。迁入同一 Feature 后提取一个私有、窄类型的 `useLatestProTableRequest`；Audit cursor 流不复用它。 |
| F-08 | Normal | `mock/*.ts` | UUID、Request/Response、header/query 读取、正整数解析、Problem 响应和写请求门禁重复 5 次以上。提取 `mock/util.ts`，保留各领域状态机，不做万能 Mock framework。 |
| F-09 | Normal | 动态 Select | Principal、Workspace、组织上级、Owner/Leader 选项来自可增长集合，却显式关闭默认虚拟滚动。删除这些动态 Select 的 `virtual={false}`；固定小枚举保留现状。 |
| F-10 | Normal | `src/pages/AdminModels/ModelModal.tsx` | `ModalForm<Partial<ModelFormValues>>` 使通过 Form 校验后的 `onFinish` 仍被建模为缺字段。改成 `ModalForm<ModelFormValues>`；`initialValues` 仍可保持 partial。 |
| F-11 | Normal | `src/pages/AdminUsers/util.ts` | `formatAccountError` 重复 `formatGovernanceError`。统一 Administration 私有错误格式化入口并保留 requestId 行为测试。 |
| F-12 | Normal | `src/types/theme.d.ts` | 全局声明从共享 `src/types` 反向导入 Theme Feature 私有文件。迁入 `src/features/theme/global.d.ts`，就近消费 `ThemeSnapshot`。 |
| F-13 | Normal | `biome.json`、`tsconfig.json` | 手写 `mock/**` 被 Biome 排除；可通过的 exhaustive deps/a11y/no-unused 规则未启用。纳入 Mock，启用已验证规则；`useUniqueElementIds` 因测试环境与显式 Form id 需求继续关闭。 |
| F-14 | Normal | `skills-lock.json` | 当前只锁 generic `umi` Skill，与最新 `AGENTS.md` 明确“不采用通用 umi 基线、改用 ant-design + antd”不一致。通过官方 installer 更新 lock，不手工伪造 hash。 |
| F-15 | Minor | `BootstrapWizard.tsx` | `Steps responsive` 与 6.4.4 默认 `true` 完全相同，删除冗余 prop。 |
| F-16 | Minor | `ModelCatalog.tsx` | `useMemo` dependency 中包含稳定的 state setter `setModalState`，Biome exhaustive-deps 探针确认多余。删除该依赖。 |
| F-17 | Minor | 七个 `.gitkeep` | 目录已有文件或当前没有必须保留的目录契约，placeholder 无运行/构建作用。删除。 |

## 明确保留的实现

- `key={JSON.stringify(queryParams)}`：AdminModels/AdminWorkspaces 已有确定性竞态回归证据，是当前 ProTable stale rendering 的隔离边界；没有同等可靠替代前不删除。
- Audit 的 cursor merge、去重、retry token、sort reset 与 generation guard：它是 cursor 分页，不并入普通 page/pageSize Hook。
- AdminPolicies 的 candidate generation、dirty rollback 防护和可空数值草稿：对应已修复的迟到响应、旧值提交和草稿覆盖缺陷。
- ThemeProvider 的 `setAntdConfigRef.current = setAntdConfig`：用于隔离 setter identity，已有同步与系统主题测试覆盖，不为“少一行 ref”改写。
- `DetailDrawer` 的显式 focus return、TaskDetail 三类浮层焦点恢复：已有真实键盘与浏览器回归证据。
- `minWidth: 0`、`overflow`、表格 `scroll.x`、Drawer/Inspector 宽度、图表 reduced-motion 和当前 flex/grid：均服务于 shrink、内部滚动或原型结构，不属于冗余 CSS。
- Route Registry 与 Umi routes 的双声明：它是“服务端只下 routeKey”的安全边界，已有一一对应测试，不合并成运行时动态路由。
- V0.2 Mock-only service seam：OpenAPI 0.2 Artifact 尚未锁定，当前 DTO/endpoint adapter 保持集中且标注 Task 10 整体替换；本轮不猜后端 schema。
- 固定小枚举的 `Select virtual={false}`：选项数量固定、测试依赖公开可见 option 语义，性能提示不构成缺陷。

## 目标目录映射

| 当前路由实现 | 目标 Feature | 路由入口结果 |
| --- | --- | --- |
| `pages/Login`、`pages/Bootstrap` | `features/auth` | 两个 page 仅导出公开 `LoginPage` / `BootstrapPage` |
| `pages/Home` | `features/dashboard` | `pages/Home/index.tsx` 一行公开导出 |
| `pages/Tasks`、`pages/TaskDetail` | `features/tasks` | 保留 `/tasks`、`/tasks/archived`、`/tasks/:taskId` 三个入口 |
| `pages/Workspaces` | `features/workspaces` | 保留 `/workspaces` |
| `pages/Messages` | `features/messages` | 保留 `/messages` |
| `pages/TeamBoard` | `features/teamBoard` | 保留 `/team-board` |
| `pages/Admin*`、`pages/Audit` | `features/administration/{overview,account,organization,workspace,grant,audit,policy,model,role,menu,skill}` | 所有 AdminXxx 和 `/audit` page 只从 Administration public index 导出 |

Administration 的 `index.ts` 只保留跨 Feature 需要的公开页面组件；现有 endpoint facade 下沉为私有 `service.ts`，领域内部通过相对路径消费，避免 Feature 自己绕回 public barrel。

## `Select virtual={false}` 裁决

### 删除 `virtual={false}`

- AdminGrants Principal 筛选。
- GrantModal Principal 与 Workspace。
- AdminOrganization SuperiorModal 的上级候选。
- AdminWorkspaces 创建 Owner，以及邀请/转让动作的账号候选。

这些集合由服务端数据投影产生，会随账号/Workspace 增长；使用 6.4.4 默认 `virtual: true`。

### 保留 `virtual={false}`

- status、profession、capability、scope type、audit range/action/risk/target、model provider/status、menu group/visibility 等固定小枚举。
- Login/Bootstrap 固定流程内的短选项（若存在）。

保留不是忽略 CLI，而是基于数据规模与可访问性语义的明确裁决。

## 逐文件覆盖账本

账本规则：表中的 glob 只覆盖 Git tracked 文件，括号给出精确文件数；同一文件只属于一行。`MOVE` 表示现有实现与测试整体迁移，原 route `index.tsx` 会被新的薄装配文件替代。

### Core scope：296 files

| 文件或完整组 | 数量 | 结论 | 说明 |
| --- | ---: | --- | --- |
| `config/config.ts` | 1 | REFACTOR | 删除无消费者的 access 注册；工程 bundler 升级由独立 baseline plan 处理。 |
| `config/proxy.ts` | 1 | REFACTOR | 用推断类型消除 `any`。 |
| `config/defaultSettings.ts`、`config/routes.ts`、`config/themePreflight.ts` | 3 | KEEP | 布局、静态路由与首屏主题职责清晰。 |
| `mock/**` | 15 | REFACTOR | 共享 HTTP/Problem helper、复用 DTO 类型并纳入 Biome；领域状态机和契约测试保留。 |
| `scripts/openapi.mjs` | 1 | FIX | F-01。 |
| `scripts/dependency-contract.mjs` | 1 | KEEP | 20 条 fixture edge 有明确契约。 |
| `src/access.ts`、`src/access.test.ts` | 2 | REMOVE | F-05。 |
| `src/app.ts`、`src/app.test.ts` | 2 | KEEP | Session owner、401 single-flight、layout 与 responsive 行为已有完整测试。 |
| `src/assets/.gitkeep`、`src/components/.gitkeep`、`src/constants/.gitkeep`、`src/hooks/.gitkeep`、`src/models/.gitkeep`、`src/types/.gitkeep`、`src/utils/.gitkeep` | 7 | REMOVE | F-17。 |
| `src/components/BrandMark/**` | 3 | KEEP | 跨 Feature 品牌组件。 |
| `src/components/DetailDrawer/index.tsx` | 1 | REFACTOR | 局部记录上游泛型 `any` 约束；行为不变。 |
| `src/components/DetailDrawer/index.test.tsx` | 1 | KEEP | 公共 Drawer/focus 行为覆盖。 |
| `src/components/DistributionBar/**` | 3 | KEEP | 原生 meter/legend、token 与 reduced-motion 正确。 |
| `src/components/FilterToolbar/**` | 3 | KEEP | 跨表格筛选布局，无业务 service 依赖。 |
| `src/components/MetricCard/**` | 3 | KEEP | 通用指标投影。 |
| `src/components/MiniBarChart/**` | 3 | KEEP | 原生 figure/meter 与 reduced-motion 正确。 |
| `src/components/SemanticTag/**` | 3 | KEEP | 集中 tone → token 语义。 |
| `src/constants/brand.ts`、`src/constants/route.ts`、`src/constants/theme.ts` | 3 | KEEP | 跨 Feature 稳定常量。 |
| `src/features/administration/**` | 6 | REFACTOR | 拆 public index / private service / error，并接收全部管理领域实现。 |
| `src/features/auth/RouteGuard.tsx`、`src/features/auth/RouteGuard.test.tsx` | 2 | REMOVE | F-05。 |
| `src/features/auth/BootstrapWizard.tsx`、`src/features/auth/index.ts` | 2 | REFACTOR | 去冗余 Steps prop、公开 route page、移除旧 RouteGuard export。 |
| `src/features/auth/BootstrapWizard.test.tsx`、`LoginFlow.tsx`、`LoginFlow.test.tsx`、`LoginShell.tsx`、`LoginShell.test.tsx`、`LoginStepHeader.tsx`、`index.style.ts`、`login.constant.ts`、`login.style.ts`、`mockContract.test.ts`、`service.ts`、`service.test.ts`、`type.ts` | 13 | KEEP | 登录/初始化契约、布局与错误恢复边界清晰。 |
| `src/features/navigation/**` | 11 | KEEP | Route Registry、redirect、menu、guard 与 service 边界完整。 |
| `src/features/shell/**` | 5 | KEEP | Layout header/menu 组件职责清晰。 |
| `src/features/theme/**` | 9 | KEEP | 单一 Theme owner、预加载与系统同步覆盖完整。 |
| `src/hooks/useStaticPrototypeAction.ts`、`src/hooks/useStaticPrototypeAction.test.tsx` | 2 | KEEP | 被多个 Feature 复用且不依赖业务 service。 |
| `src/pages/Admin/**` | 5 | MOVE | → `features/administration/overview`，并修 F-04。 |
| `src/pages/AdminGrants/**` | 7 | MOVE | → `features/administration/grant`，并复用 latest request Hook。 |
| `src/pages/AdminMenus/**` | 8 | MOVE | → `features/administration/menu`。 |
| `src/pages/AdminModels/**` | 11 | MOVE | → `features/administration/model`，并修 F-10/F-16。 |
| `src/pages/AdminOrganization/**` | 6 | MOVE | → `features/administration/organization`，恢复动态 Select virtualization。 |
| `src/pages/AdminPolicies/**` | 9 | MOVE | → `features/administration/policy`；保留 candidate generation/dirty guard。 |
| `src/pages/AdminRoles/**` | 7 | MOVE | → `features/administration/role`。 |
| `src/pages/AdminSkills/**` | 6 | MOVE | → `features/administration/skill`。 |
| `src/pages/AdminUsers/**` | 11 | MOVE | → `features/administration/account`，统一错误与 latest request。 |
| `src/pages/AdminWorkspaces/**` | 10 | MOVE | → `features/administration/workspace`，复用 latest request。 |
| `src/pages/Audit/**` | 8 | MOVE | → `features/administration/audit`；保持独立 cursor state machine。 |
| `src/pages/Bootstrap/index.tsx` | 1 | KEEP | 已是薄路由装配。 |
| `src/pages/Home/**` | 5 | MOVE | → `features/dashboard`。 |
| `src/pages/Login/**` | 2 | MOVE | 页面编排与测试 → `features/auth`，route 留薄导出，并修 F-03。 |
| `src/pages/Messages/**` | 5 | MOVE | → `features/messages`。 |
| `src/pages/TaskDetail/**` | 10 | MOVE | → `features/tasks`，焦点回归保持。 |
| `src/pages/Tasks/**` | 12 | MOVE | → `features/tasks`，保留三个 route exports。 |
| `src/pages/TeamBoard/**` | 5 | MOVE | → `features/teamBoard`。 |
| `src/pages/Workspaces/**` | 9 | MOVE | → `features/workspaces`。 |
| `src/routes.test.ts` | 1 | KEEP | 验证 config routes / registry 一一对应。 |
| `src/services/adminAccounts/**` | 3 | KEEP | Mock-only seam，等待 V0.2 generated client 整体替换。 |
| `src/services/adminAudit/**` | 2 | KEEP | 同上。 |
| `src/services/adminGrants/**` | 2 | KEEP | 同上。 |
| `src/services/adminOrganization/**` | 3 | KEEP | 同上。 |
| `src/services/adminPolicies/**` | 2 | KEEP | 同上。 |
| `src/services/adminWorkspaces/**` | 3 | KEEP | 同上。 |
| `src/services/auth/**` | 3 | KEEP | 当前 auth DTO/Problem 归一与测试完整。 |
| `src/services/navigation/**` | 3 | KEEP | 当前 navigation DTO 与 service 完整。 |
| `src/services/transport/envelope.ts` | 1 | REMOVE | F-06。 |
| `src/services/transport/index.ts` | 1 | REFACTOR | 删除 legacy envelope export。 |
| `src/services/transport/index.test.ts`、`mutation.ts`、`mutation.test.ts` | 3 | KEEP | Problem、401、Idempotency/If-Match 行为完整。 |
| `src/types/api.ts` | 1 | REMOVE | F-06。 |
| `src/types/theme.d.ts` | 1 | MOVE | → `src/features/theme/global.d.ts`。 |
| `src/types/presentation.ts` | 1 | KEEP | 跨 Feature 纯展示语义。 |
| `tests/fixtures/dependency-contract/**` | 21 | KEEP | dependency-cruiser executable contract。 |
| `tests/mockRequestHarness.ts`、`tests/setupTests.ts` | 2 | KEEP | 真实 Mock route boundary 与全局 jest-dom 初始化。 |

### Related repository configuration：21 files

| 文件 | 结论 | 说明 |
| --- | --- | --- |
| `.dependency-cruiser.cjs` | KEEP | 已覆盖 pages/features/components/services/transport 的禁止方向。 |
| `.dockerignore`、`.gitignore` | KEEP | generated、cache、secret/local config 排除正确。 |
| `.github/workflows/ci.yml` | KEEP | 当前 lint/test/build 与 OpenAPI Release gate 正确；后续 baseline plan 可统一 verify。 |
| `.nvmrc`、`Dockerfile`、`nginx.conf` | KEEP | 工程版本同步由独立 baseline plan 负责，本轮不混入业务重构。 |
| `AGENTS.md` | KEEP | 最新用户治理规则是本轮事实源。 |
| `CLAUDE.md`、`README.md` | KEEP | 不属于运行时代码；内容升级由工程 baseline 文档任务负责。 |
| `biome.json` | REFACTOR | F-13。 |
| `openapi/artifact.lock.json` | KEEP | 0.1.0 digest 锁定，V0.2 未到不改。 |
| `package.json` | KEEP | 依赖升级属于独立 baseline plan；本轮只消费锁定版本。 |
| `react-doctor.config.json` | KEEP | 当前 `pnpm doctor` 通过。 |
| `skills-lock.json` | FIX | F-14。 |
| `tailwind.config.js`、`tailwind.css` | KEEP | Tailwind source 仅覆盖手写 `src`。 |
| `tsconfig.depcruise.json` | KEEP | dependency-cruiser aliases 正确。 |
| `tsconfig.json` | REFACTOR | 在当前或 baseline 独立配置中加入 noUnused 两项；不得继续靠 generated `.umi` 作为最终根配置。 |
| `typings.d.ts` | KEEP | Umi runtime typings 入口。 |
| `vitest.config.ts` | KEEP | 串行文件执行和 generated coverage exclusions 有真实资源证据。 |

## 明确排除

- `src/services/generated/**`：4 个 Artifact 生成文件，`GENERATED/EXCLUDED`。
- `openapi/spec.json`：后端 Artifact，`GENERATED/EXCLUDED`。
- `pnpm-lock.yaml`：包管理器生成，只有依赖变更时机械更新。
- `src/.umi*`、`dist/`、`coverage/`：ignored generated 目录，不纳入审查或提交。
- `docs/superpowers/**`：历史设计/计划不属于运行时代码；本报告与实施计划除外。

## 计划依赖与冲突说明

只读审计取证时，`docs/superpowers/plans/2026-08-11-engineering-baseline-sync.md` 尚未实施；本报告成文期间，该计划已在另一执行流开始落地，并会继续修改 `package.json`、`tsconfig.json`、`biome.json`、Vitest 和 CI。深度代码重构必须等待它自然完成并取得 clean baseline，不能与其并发修改同一工作树；接续时必须保留本轮要求的 no-unused、exhaustive-deps、a11y/noExplicitAny 约束和 Mock coverage。

该 baseline plan 中“采用 generic umi Skill、把 AGENTS 收敛为其 overlay、只锁 umi Skill”的文字已被最新用户 `AGENTS.md` 明确覆盖；执行前必须另行修订，不能按旧文本落地。本轮实施只使用架构 06、Ant Design CLI/官方 LLM 文档，不采用 generic Umi baseline。

## 审计完成条件

- 317 个纳入文件均已在账本中得到唯一结论。
- 所有 Finding 都能映射到实施计划中的独立任务。
- 未把 CLI performance warning、固定尺寸或 style key 机械升级为缺陷。
- 未修改生产代码、页面、样式、路由、Mock 或生成目录。
