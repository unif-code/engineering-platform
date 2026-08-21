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
| 管理概览 | `/admin` | 无聚合 API，显示空状态与导航入口 |
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
| `pnpm test:tooling` | PASS，60/60；包含 structure/Markdown 单测 |
| `pnpm verify:structure` | PASS，结构验证通过 |
| `pnpm verify:markdown` | PASS，Markdown 验证通过 |
| route/navigation 分组 | PASS；Registry/Menu/routes 3 files / 21 tests，RouteGuard 1 file / 15 tests |
| shell 分组 | PASS；app 1/21，shell 2/8，theme 3/35 |
| 受影响无 API 页面分组 | PASS；Tasks/TaskDetail 2/2，Messages/TeamBoard 2/2，Admin/Skills/Models 3/7，Roles/Menus 3/6 |
| `node_modules/.bin/vitest.cmd run src/pages/AdminGrants --reporter=verbose` | PASS，2 files / 15 tests |
| 本地 `biome.cmd check --files-ignore-unknown=true` 精确改动文件 | PASS，6 个可支持文件，无修复 |
| `pnpm tsc` | PASS |
| `pnpm depcruise` | PASS，151 modules / 385 dependencies，20 条架构边合同 |
| changed TSX scoped Ant Design lint | PASS，3 个文件均 0 issues |
| `git diff --check` 与 targeted residual scans | PASS，无结构差异错误、目标残留、运行时 mock 目录、已删链引用或 test-only 生产导出 |
| `pnpm openapi:check:release` | PASS，spec 摘要一致，generated 目录无手改或漂移 |

本地未运行 coverage、doctor 或 build，符合本计划的 focused-local/full-CI 分工。

## RED/GREEN 记录

- 结构门禁 RED：新增的三个 fixture 用例均因“Missing expected exception”失败，分别证明门禁未拒绝通用业务 fixture/演示控件、旧归档路由/注册和重复 path/component。GREEN：实现生产源扫描与 route AST 检查后 41/41 通过；最终 tooling 60/60 通过。
- TeamBoard RED：RouteGuard 15 项中 1 项因查找已过时的 `选择团队` 失败，当前 DOM 明确暴露 `aria-label="团队范围"`。GREEN：测试改为当前语义后 15/15 通过，生产代码未增加旧名别名。
- Grants RED：新增的真实 `INHERITED` DTO 使原行查询同时命中“继承”和“直接”两行，Testing Library 报 `Found multiple elements`。此失败发生在精确 mutation payload/context 断言之后，不是生产 payload 或重复调用缺陷。GREEN：只将行断言收窄到“直接”来源，单例 1/1 与完整 Grants 2 files / 15 tests 通过。
- 一次合并 shell 测试因连续 60 秒无新输出被主动中止；按 app/shell/theme 拆分后分别 21/21、8/8、35/35 通过。该中止不记为 PASS。

## CANNOT VERIFY 与 CI/发布要求

- 外部 Chrome：`CANNOT VERIFY`。外部 Chrome 控制返回 `Browser is not available: chrome`，当前只能发现应用内浏览器，因此未完成 1440×900 与 1280px 的 19 屏对照、真实登录/授权跳转、明暗主题和真实 mutation 验收。未使用应用内浏览器替代。
- 真实联调：`CANNOT VERIFY`。Workspace Owner 候选人的后端约束以及所有 V0.2 mutation 的真实端到端行为仍需联调/验收环境证明。
- `.github/workflows/ci.yml` 的 `verify` job 仍执行 `pnpm verify`；`package.json` 中该命令包含 lint、tooling/structure/Markdown、完整 coverage、doctor、Ant Design checks 与 build。tag 触发的 `release-gate` 另外执行 `pnpm openapi:check:release`。
- 只有 Task 7 最终提交的 PR CI 全绿、whole-branch Spec/Standards review 通过、真实联调和外部 Chrome 验收完成，并获得明确发布授权后，才能合并/发布并宣称最终版。
