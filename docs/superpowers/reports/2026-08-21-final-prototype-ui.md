# 最终原型 UI 发布候选验收报告

日期：2026-08-21

开发基线：`27d51c8939037019371099c4904a04b2311314ca`

设计事实源：`docs/superpowers/specs/2026-08-21-final-prototype-ui-design.md`

状态：当前发布候选，不是已发布最终版

## 结论边界

本候选版以锁定的 19 屏最终原型替换旧可见实现，只保留当前架构下的单一路由、页面和数据链路。已有 V0.1/V0.2 能力继续走真实 Feature/service/OpenAPI 边界；尚无后端能力的区域只显示 Empty 或禁用态，不伪造记录、指标、图表或成功反馈。

完整 CI、真实前后端联调、外部 Chrome 可视化验收和发布授权仍是成为已发布最终版的必要条件。

## 19 屏路由与数据边界

| 屏幕 | 唯一路由 | 当前数据/行为边界 |
| --- | --- | --- |
| 登录 | `/login` | 真实认证服务 |
| 工作台 | `/home` | 真实 Principal；任务区域无 API，显示空态 |
| 任务列表 | `/tasks` | 无任务 API，表格/看板共用空数据；归档仅为 `?view=archived` |
| 任务详情 | `/tasks/:taskId` | 显示真实路由 ID 与空骨架，不伪造任务/仓库/Diff/会话 |
| 工作区 | `/workspaces` | 无个人工作区 API，显示空态 |
| 消息中心 | `/messages` | 无消息 API，显示分类空态 |
| 团队看板 | `/team-board` | 无 KPI/趋势 API，显示空指标与空图表容器 |
| 审计看板 | `/audit` | 真实 V0.2 审计列表与 Problem Details |
| 管理概览 | `/admin` | 无聚合 API；只投影 `@@initialState.navigation` 中 Registry 已知且当前可见的管理入口 |
| 工作区管理 | `/admin/workspaces` | 真实 V0.2 列表、创建、成员与 Owner 能力 |
| 组织管理 | `/admin/organization` | 真实 V0.2 组织树与负责人变更 |
| 技能管理 | `/admin/skills` | 无目录 API，显示空态 |
| 模型管理 | `/admin/models` | 无模型/用量/评测 API，显示 Tabs 空态 |
| 角色管理 | `/admin/roles` | 无角色矩阵 API，显示主从空态 |
| 用户管理 | `/admin/users` | 真实 V0.2 账号列表、创建、启停与凭据重置 |
| Grant 管理 | `/admin/grants` | 真实 V0.2 授权列表、创建与撤销 |
| Policy 发布 | `/admin/policies` | 真实 V0.2 目录、草稿、校验、预览、发布与回滚 |
| 菜单管理 | `/admin/menus` | 真实 navigation 的只读投影；未知 routeKey fail closed |
| 403 无权限 | `/403` | RouteGuard 与 AccessDenied 共用真实拒绝视觉 |

`/bootstrap` 是复用 LoginShell 的隐藏认证流程，不计为第 20 个产品屏幕。

## 纯度与删除证据

- `tasks.archived` 与 `/tasks/archived` 已从 Registry 和 Umi routes 删除；不存在跳转、别名或兼容页。
- navigation 对外只使用 V0.2 `order`，未保留 `sort` 别名或适配分支。
- Task 7 的 consumer scan 证明 `useStaticPrototypeAction` 没有生产调用方，已删除 hook 及其仅验证演示行为的专属测试。
- 结构门禁现在扫描 `config` 与全部手写 `src`，排除测试、Umi 产物和 generated client；拒绝业务 fixture、演示控件标识、运行时 mock 目录、旧归档路由/注册、重复页面 path 与重复 capability component。
- 扫描中的 TypeScript `alias`、Problem Details 错误文案 `fallback` 和 ProTable 排序是当前有效实现，已按上下文保留，未做盲目正则删改。

## 本地验证证据

| 命令 | 结果 |
| --- | --- |
| `pnpm test:tooling` | PASS，62/62；包含 route screen structure AST/Markdown 单测 |
| `pnpm verify:structure` | PASS，结构验证通过 |
| `pnpm verify:markdown` | PASS，Markdown 验证通过 |
| route/navigation 分组 | PASS；Registry/Menu/routes 3 files / 21 tests，RouteGuard 1 file / 15 tests |
| shell 分组 | PASS；app 1/21，shell 2/8，theme 3/35 |
| 受影响无 API 页面分组 | PASS；Tasks/TaskDetail 2/2，Messages/TeamBoard 2/2，Admin/Skills/Models 3/7，Roles/Menus 3/6 |
| `node_modules/.bin/vitest.cmd run src/features/governance/screens/AdminGrants --reporter=verbose` | PASS，2 files / 15 tests |
| 本地 `biome.cmd check --files-ignore-unknown=true` 精确改动文件 | PASS，6 个可支持文件，无修复 |
| `pnpm tsc` | PASS |
| `pnpm depcruise` | PASS，175 modules / 432 dependencies，20 条架构边合同 |
| governance scoped Ant Design lint/usage | PASS，77 files；0 deprecated、0 a11y、0 usage，4 个既有 `virtual={false}` performance warning；20 components / 126 imports |
| `git diff --check` 与 targeted residual scans | PASS，无结构差异错误、目标残留、运行时 mock 目录、已删链引用或 test-only 生产导出 |
| `pnpm openapi:check:release` | PASS，spec 摘要一致，generated 目录无手改或漂移 |

本地未运行 coverage、doctor 或 build，符合本计划的 focused-local/full-CI 分工。

## RED/GREEN 记录

- 结构门禁 RED：新增的三个 fixture 用例均因“Missing expected exception”失败，分别证明门禁未拒绝通用业务 fixture/演示控件、旧归档路由/注册和重复 path/component。GREEN：实现生产源扫描与 route AST 检查后 41/41 通过；route screen 深模块契约再增加 2 项，最终 tooling 62/62 通过。
- TeamBoard RED：RouteGuard 15 项中 1 项因查找已过时的 `选择团队` 失败，当前 DOM 明确暴露 `aria-label="团队范围"`。GREEN：测试改为当前语义后 15/15 通过，生产代码未增加旧名别名。
- Grants RED：新增的真实 `INHERITED` DTO 使原行查询同时命中“继承”和“直接”两行，Testing Library 报 `Found multiple elements`。此失败发生在精确 mutation payload/context 断言之后，不是生产 payload 或重复调用缺陷。GREEN：只将行断言收窄到“直接”来源，单例 1/1 与完整 Grants 2 files / 15 tests 通过。
- 一次合并 shell 测试因连续 60 秒无新输出被主动中止；按 app/shell/theme 拆分后分别 21/21、8/8、35/35 通过。该中止不记为 PASS。

## Whole-branch review 行为与组件收口

本轮仍处于发布候选开发阶段，没有新增历史兼容、route alias、adapter 或 fallback 链路。后端 V0.2 的管理概览 routeKey 唯一为 `admin`；Registry 将该键作为菜单入口，生产代码和测试均不存在 `admin.overview`。

- `/tasks?view=archived` 由 Umi `useLocation` 读取，作为 `/tasks` 同一列表的可观察归档状态；没有恢复旧归档路由。
- 管理概览只从真实 initialState navigation 经 Registry fail-closed 投影链接；未知键和非管理入口不显示。
- Umi 全局 request 对原始 response 403 与已归一化 `ApiError` 403 均进入 `/403`，并在 query 中保留 requestId；拒绝页从路由事实源取得工作台路径。
- Audit 与 Grant 列表失败均返回 `success: false`、清空陈旧行并显示显式 Alert；Grant 统计失败时显示不可用标记，不伪造为 0。
- TaskDetail 的禁用输入改用 `@ant-design/x` 公开 `Sender`，MetricCard 使用 Statistic 公共 semantic styles 与主题 token；组织页禁用按钮统一提供 Tooltip。
- GrantModal 的 payload builder 保持私有，测试通过真实 Modal 表单交互锁定 payload 与 Problem Details；结构扫描器的同步/异步重复收敛为一个共享 collector。

### 本轮 RED/GREEN 与门禁证据

- 行为 RED：Tasks、Admin、全局 403、AccessDenied、Sender、组织 Tooltip 共 7 个断言先失败；Audit/Grant 错误态分别暴露缺少重试与伪造统计。实现后相应 focused suites 全部通过。
- 管理入口契约 RED：将 `admin` 设为非菜单的故障注入令 Registry/Menu 7 项失败；恢复唯一当前契约 `admin` 后 15/15 通过，没有加入别名。
- 已归一化 403 RED：`ApiError` 没有 response 时跳转调用为 0；统一采用 response status 或 Problem status 后 app 完整 23/23 通过。
- 架构 RED：共享 AccessDenied 组件直接依赖 Feature 时 dependency-cruiser 报 `components-no-business`；改用 Registry 同源的 `APP_PATHS` helper 后 152 modules / 392 dependencies 与 20 条边合同通过。
- focused GREEN：Tasks/Admin/AccessDenied 6/6，AdminOrganization 7/7，Audit 6/6，AdminGrants 11/11，GrantModal 2/2，TaskDetail/MetricCard 2/2，navigation 15/15。
- 静态与 release GREEN：Biome 精确改动文件、`pnpm tsc`、`pnpm depcruise`、tooling 62/62、structure、Markdown 与 `pnpm openapi:check:release` 均通过；generated 目录无改动。
- scoped Ant Design lint：本轮新改组件和页面均 0 issues；Audit 保留 3 个既存的 `Select virtual={false}` performance warning，这三个选项集合均为小型有界枚举，且该公开属性用于稳定可访问的选项 DOM，不属于 deprecated/usage/a11y 问题。
- residual scan：`admin.overview`、Statistic 内部 selector/`valueStyle`、Grant builder 生产导出均为 0；旧归档键和路径只存在于负向测试与结构门禁模式。

本轮未在本地运行 coverage、doctor、build 或完整 Ant Design 检查，继续由 `.github/workflows/ci.yml` 的 `pnpm verify` 承担完整 coverage、doctor、Ant Design checks 与 build。真实联调、外部 Chrome 19 屏视觉验收和明确发布授权仍未完成，因此状态仍是当前发布候选，而不是已发布最终版。

## Standards 架构深模块收口

19 个产品屏幕与隐藏 `/bootstrap` 流程的实现、私有组件、样式、类型、工具和测试已整体进入深 Feature 模块：认证入口位于 `src/features/access/screens`，门户入口位于 `src/features/portal/screens`，治理入口位于 `src/features/governance/screens`。三个 Feature 根只按名称导出各自的 `*Screen` 接口；`src/pages/<Route>/index.tsx` 只保留一条 Umi 所需的默认 re-export，不再承载实现或私有文件。

- route screen AST 门禁先对原 `src/pages` 结构取得 RED，再锁定 routes、pages adapter 与 Feature Screen 的精确对应关系；最终 `pnpm verify:structure` 通过，tooling 62/62 通过。
- access focused 为 3 files / 13 tests，portal focused 为 6 files / 7 tests，governance focused 为 23 files / 151 tests，全部通过；移动后的 Policy fixture 路径统一使用仓库 `@root/tests` 事实源。
- governance 生产代码只消费公开 `@/features/administration` 与 `@/features/navigation`，不直接依赖 generated 或 transport；9 个 screen test suites 通过仓库级 `tests/fixtures/apiError.ts` 构造真实 Problem Details 错误，100/100 复验通过且没有扩大 production Feature 接口。
- AdminWorkspaces 不再让正常交互区长期留在外层 `Spin` 容器中；Owner 候选加载指示与工作区表格保持独立，加载时仍保留真实工作区列表并禁用创建。该页完整 19/19 通过，未关闭 user-event pointer 检查或使用 `fireEvent` 绕过真实交互。
- 最终精确 Biome 覆盖 89 个本批文件；TypeScript、175 modules / 432 dependencies 的 dependency-cruiser、20 条边合同、scoped Ant Design、Markdown 与 pinned OpenAPI release check 全部通过。定向扫描确认 pages 私有实现、Feature 深导入、governance 对 generated/transport 的直接依赖均为 0。

本次收口没有加入旧页面副本、别名、兼容导出或双链路；当前代码仍是发布候选开发版，只有完整 CI、真实联调、外部 Chrome 验收和明确发布授权完成后才是已发布最终版。

## CANNOT VERIFY 与 CI/发布要求

- 外部 Chrome：`CANNOT VERIFY`。外部 Chrome 控制返回 `Browser is not available: chrome`，当前只能发现应用内浏览器，因此未完成 1440×900 与 1280px 的 19 屏对照、真实登录/授权跳转、明暗主题和真实 mutation 验收。未使用应用内浏览器替代。
- 真实联调：`CANNOT VERIFY`。Workspace Owner 候选人的后端约束以及所有 V0.2 mutation 的真实端到端行为仍需联调/验收环境证明。
- `.github/workflows/ci.yml` 的 `verify` job 仍执行 `pnpm verify`；`package.json` 中该命令包含 lint、tooling/structure/Markdown、完整 coverage、doctor、Ant Design checks 与 build。tag 触发的 `release-gate` 另外执行 `pnpm openapi:check:release`。
- 只有精确当前候选 HEAD 的 PR CI 全绿，并在合并后确认精确 merge SHA 的 CI 与 whole-branch Spec/Standards review 全绿，同时完成真实联调、外部 Chrome 验收并获得明确发布授权后，才能发布并宣称最终版。
