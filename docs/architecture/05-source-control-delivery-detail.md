# GitLab、MR 与交付集成详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[GitLab、MR 与交付集成](./05-source-control-delivery.md)

## 1. 目标与边界

目标：

- 平台 Project 直接复用 GitLab Project，不复制第二套代码项目；
- 每个 WorkItem 明确绑定一个 Repository 和一条任务分支；
- 统一管理 `task branch → dev` Integration MR 和 `task branch → main` Formal MR；
- 将确定性检查、AI Review、Human Review Assignment 和 Merge Capability 分开建模；
- 通过 Source Control Port 隔离 GitLab API、Webhook、凭据与未来 Provider。

边界：

- 不复制 GitLab 完整仓库、分支、MR 或权限管理页面；
- 不以 GitLab Project Role 代替平台 Capability、Scope、Membership 和 Assignment；
- 不允许人员或 Agent 直接 Push `main`；
- 不在平台数据库、日志或审计字段保存明文 PAT/Token；
- 首版 Jenkins 是独立平台，研发平台不调用、不读取、不接收 Webhook，也不建设 Jenkins Adapter/Delivery Port。

## 2. 集成边界

```text
Requirement / WorkItem Workflow
        │
        ▼
SourceControlPort
        │
        └── GitLab Adapter

MR title/description 生成
        │
        └── ModelGatewayPort

Jenkins
        └── 开发人员在独立平台手工操作（平台外部边界）
```

Workflow 使用平台稳定命令、实体和错误码，不依赖 GitLab 私有状态字符串、Webhook Payload 或 Provider Credential。Model 只生成 MR 文本，GitLab Connector 才能执行外部写操作。

## 3. GitLab Connection 与 Workspace Repository

GitLab Connection 和 Workspace 授权 Project 通过受控命令建立。平台保存 Provider、Connection、GitLab Project ID/Path、默认分支、技术栈、保护规则和 Secret Reference；Credential 由 OpenBao 保存并以短期最小权限形式提供给 Connector。

Workspace 成员和 Agent 只能使用已经授权的 GitLab Project。仓库访问同时满足：

```text
账号和 Membership 有效
AND Platform Capability + Scope 有效
AND GitLab Project 已授权给 Workspace
AND WorkItem Repository Binding 有效
AND GitLab Credential 与分支保护允许该动作
AND Agent Execution Binding / Tool Policy 允许（Agent 场景）
```

平台岗位不自动映射成 GitLab Repository Role，GitLab Role 也不自动授予平台业务权限。两边都必须满足各自的授权和保护规则。

Workspace Repository 被移除后，禁止新 Requirement/WorkItem 选择并停止签发新 Agent Credential；已存在 Binding、Commit、MR 和 Audit 历史继续保留，进行中事项形成显式阻塞并由授权人员处置。

## 4. 核心实体

| 实体 | 职责 |
| --- | --- |
| `SourceControlConnection` | Workspace 与 Git Provider 的连接及 Secret Reference |
| `WorkspaceRepository` | 已授权的 GitLab Project 投影 |
| `RepositoryProfile` | 默认分支、技术栈、保护和检查能力 |
| `WorkItemRepositoryBinding` | 一个 WorkItem 与一个 GitLab Project 的绑定 |
| `RepositoryBranchBinding` | 不可变的 Repository、base SHA 与任务分支事实 |
| `CommitCheckpoint` | Route/Integration/Acceptance 绑定的 Commit 与 Artifact 引用 |
| `MergeRequestBinding` | WorkItem、Provider MR、source/target 和 head SHA 映射 |
| `ReviewAssignment` | Formal MR 的默认审核人、当前审核人和解析快照 |
| `ReviewDecision` | 当前 assignee 对准确 `headSha` 的人工 Decision |
| `SourceControlEffect` | 外部写操作的 Idempotency、结果和 Reconciliation 事实 |

一个 Requirement 可以有多个 WorkItem；每个 WorkItem 最终只绑定一个 Repository 和一条任务分支，因此多仓 Requirement 通过多个 WorkItem/MR 表达，而不是一条跨仓物理分支。

## 5. Requirement、WorkItem 与 Repository 绑定

### 5.1 初始仓库

创建 Requirement 时必须选择且只选择一个初始 Workspace Repository，不能创建无仓库 Requirement。第一个 WorkItem 自动继承该 Repository：

- 产品创建的 Requirement 通常选择前端 Repository；
- 纯后端需求选择后端 Repository；
- 前端或后端开发自行创建时选择自己实际工作的 Repository；
- 仓库类型不由人员岗位写死，产品确有后端需求时也可以选择后端 Repository。

Requirement 创建进入 `CREATED`，平台初始化首个 WorkItem、Repository Binding 和任务分支。外部 GitLab 操作未完成时保留明确 blocked reason，不能启动 Human/Agent 执行或伪装成已就绪。

### 5.2 后续 WorkItem

后续拆分的 WorkItem 可以先创建和分配人类负责人，并使用独立维度：

```text
repositoryState = WAITING_REPOSITORY | BOUND
```

人类负责人确定后，由其从 Workspace 已授权 GitLab Project 中选择一个 Repository；操作人仍需仓库绑定 Capability 和有效 Scope。Agent 可以给出建议，但不能代替人类负责人作出 Binding Decision。

仓库未绑定前，WorkItem 可以保存、展示和通知，但不能创建任务分支、启动 Human/Agent 执行、进入代码实现或创建 MR。

### 5.3 Binding 不可变性

任务分支创建前，人类负责人可以在权限允许范围内修改 Repository 选择。分支成功创建后：

```text
repositoryId + baseCommitSha + branchName
```

构成不可变 `RepositoryBranchBinding`。发现选错 Repository 时：

1. 原 WorkItem 标记 `SUPERSEDED`；
2. 保留原 Repository、Branch、Commit、Attempt、Artifact、MR 和 Audit；
3. 创建新 WorkItem、新全局编号、新 Repository Binding 和新任务分支；
4. 通过 `supersedesWorkItemId` 或等价关系关联；
5. 被替代 WorkItem 不计入 Requirement 完成条件。

不得搬运历史、覆盖 Binding 或修改 Audit 来伪装原 WorkItem 从一开始就在新 Repository。

## 6. 任务分支创建 Saga

### 6.1 分支规则

所有任务分支从对应 Repository 的 `main` 当前 Commit 创建：

```text
type/wi-<全局递增号>-<semantic-slug>
```

例如：

```text
feat/wi-1024-user-profile
fix/wi-1025-login-timeout
refactor/wi-1026-permission-cache
chore/wi-1027-toolchain-upgrade
```

编号为全局递增 WorkItem 编号，不是日期。同一 Requirement 的不同 WorkItem 即使绑定同一 Repository，也使用独立分支。

### 6.2 创建流程

```text
校验 WorkItem Assignment、Repository Binding、Capability 与 Scope
→ 查询并记录 main 当前 baseCommitSha
→ 幂等创建任务分支
→ 验证远端分支准确指向 baseCommitSha
→ 持久化不可变 RepositoryBranchBinding
→ 发布 TaskBranchCreated
```

GitLab 分支未真实创建或校验失败时，WorkItem 保持 `DRAFT` 和结构化阻塞原因，不得进入 `READY`。

重试时，同名分支只有在能够证明属于同一 WorkItem 且 base SHA 一致时才能复用。分支已创建但本地事务失败时，Reconciler 使用外部 Effect Ledger 补写绑定或报告孤儿分支，不能重复创建或静默接管未知分支。

## 7. Git 身份与分支保护

- `main` 是受保护分支，任何人员、Agent 或 Connector 都不得直接 Push，只能通过 Formal MR 合并；
- `dev` 只通过 Integration MR 接收任务分支，不把直接 Push 当作正常集成路径；
- Agent 使用与 Environment、Attempt、Project、任务分支和 TTL 绑定的短期最小权限 Credential；
- Commit 保存实际执行 Agent、代表的人类发起人、Attempt 和 Correlation ID；
- Force Push 默认拒绝，受控 rebase/冲突解决会产生新 `headSha` 并使相关检查、Acceptance 和 Review Decision 失效；
- Agent 只能写 Execution Binding 固定的任务分支，不能选择其他 Repository、Branch 或合并目标。

## 8. `dev` Integration MR

每个 WorkItem 的集成路径为：

```text
task branch（from main）
→ Integration MR：task branch → dev
→ 确定性检查与 GitLab 分支保护
→ 开发人员自行合并
→ dev 使用 merge commit 保留集成上下文
```

Integration MR 不要求 Leader Human Review；开发人员可以自行合并，但不能绕过 GitLab 的确定性检查和保护规则。Integration MR 合并时不得删除 source branch，因为同一 task branch 后续还要创建 Formal MR 到 `main`。

`dev` 是集成验证目标，不是 Formal MR 的 source。平台不创建 `dev → main` MR，也不建立固定 `main → dev` 同步步骤；同一 task branch 分别进入 `dev` 和 `main`，因此 `dev` 可以暂时包含尚未进入 `main` 的其他 WorkItem。

## 9. 独立 Jenkins 人工验证

Integration MR 合并 `dev` 后，开发人员在现有独立 Jenkins 中手工触发、查看并处置构建/测试。首版研发平台：

- 不调用或触发 Jenkins Job；
- 不接收 Jenkins Webhook；
- 不查询、保存或展示 Jenkins Build/Deploy 状态；
- 不复制 Jenkins Log；
- 不把 Jenkins 结果建成系统可自动判断的 Gate；
- 不定义 `DeliveryPort`、`DeliveryRun` 或 Jenkins Adapter。

开发人员完成外部验证后，在平台执行后续业务动作；该动作仍受当前 Route 的确定性检查、Integration Baseline 和 Requirement Acceptance Guard 约束。Jenkins 失败、重试或回滚完全由 Jenkins 平台处置，不改写 Git、Requirement 或 WorkItem 历史。

## 10. Integration Baseline 与 Requirement Acceptance

平台为每个 WorkItem 保存 Route 定义的 Commit Checkpoint，为 Requirement 保存由多个 WorkItem Commit/Artifact 组成的当前 Integration Baseline。Checkpoint 至少记录 Repository、Branch、Commit SHA、Artifact Hash、Agent Attempt、创建者、时间和依赖的 Gate/Decision 引用。

进入 Formal MR 阶段前：

- 当前 Route 要求的实现、测试、Integration 与其他确定性检查必须完成；
- Requirement 的 `REQUIREMENT_ACCEPTANCE` 必须准确绑定当前 Integration Baseline；
- 任一相关 WorkItem `headSha`、Artifact 或 Contract 变化会使依赖旧版本的 Acceptance/检查失效；
- WorkItem 只有在 Acceptance 仍有效且 Formal MR 已创建后进入 `AWAITING_MERGE`。

## 11. 一键创建 Formal MR

开发人员在平台点击“一键创建 MR”后：

```text
校验 WorkItem、Assignment、Branch、headSha、Gate 与 Acceptance
→ Model 根据 Requirement/WorkItem/Diff 生成 title 和 description
→ 服务端验证和规范化文本
→ GitLab Connector 幂等创建 task branch → main MR
→ 保存 MergeRequestBinding 与 Formal Review Assignment
```

首版不先展示可编辑 Modal。Model 只生成文本，不能选择 Repository、source/target、Reviewer 或执行 Merge。外部写操作以 WorkItem、source branch、target `main` 和当前 MR 身份形成稳定 Idempotency；重复点击返回已有 MR，不创建多个 Formal MR。

Formal MR 使用 squash merge。合并后自动删除 source branch；删除失败不回退 WorkItem `COMPLETED`，而是形成独立运维待办。Commit、MR、Review、Merge 和 Audit 历史永久按各自保留策略保存。

## 12. Formal MR Review Assignment

Formal MR Review 使用稳定 Gate Type `FORMAL_MR_REVIEW`，不把 Leader 岗位编码进 Gate Type。默认审核人按 WorkItem 当前 `humanOwnerId` 解析：

```text
humanOwner 是普通开发人员
→ defaultReviewer = 其直属 Leader

humanOwner 是 Leader
→ defaultReviewer = humanOwner 本人
```

Formal MR 创建时保存 `defaultReviewerId`、`currentReviewerId`、MR Review Policy 版本、负责人/组织解析快照和准确 `headSha`。Agent 可以是 executor，但 WorkItem 必须始终保存人类负责人，Agent/Connector/Bot 身份不能成为人工审核人。

审核资格同时要求：

```text
currentReviewerId == 当前 Review Assignment assignee
AND merge_request.review
AND 有效 Scope
AND 有效 Membership / 账号状态
```

默认审核人可以在最终 Decision 前把 `currentReviewerId` 改派给任意合格候选人，包括 MR 作者本人。被选择的实际审核人只负责 Review，不能继续转派，除非其本身也是默认审核人。无法解析合格默认审核人时 Gate 阻塞，等待受控改派，不能自动选择随机人员。

允许人员自审：作者本人只要被合法分配且 Capability、Scope、Membership 有效，就可以作出 Decision。`merge_request.review` 只表示资格，不能绕过 Assignment；`merge_request.merge` 是独立 Capability，有审核权不自动获得合并权。

SDD/Baseline Confirmation 使用独立 Gate Policy、Assignment 和 Decision，Formal MR 不复用 SDD 审核人或结论。

## 13. `headSha`、修改与冻结

AI Review、确定性检查、Requirement Acceptance 和 Formal Review Decision 都绑定准确版本。下列变化使旧结论按依赖关系失效并保留历史：

- 新 Commit；
- rebase、冲突解决或受控同步 `main`；
- API Contract、必须测试或关键 Artifact 变化；
- Formal MR `headSha` 变化。

Reviewer 要求修改时继续使用同一 WorkItem、task branch 和 Formal MR，WorkItem 回到 `IN_PROGRESS`。开发完成后重新进入 Integration/验证/Acceptance 流程；MR 自动指向新 head，旧 Decision 失效并重新审核，不创建隐式 `fix` Requirement。

Review `APPROVED` 后冻结 source branch，禁止继续 Push。批准后仍要求新增代码时按新的 `fix` 或 `feat` Requirement 处理，不能修改已批准 head 后沿用旧 Decision。

AI Review 只能产生建议或 Policy 定义的机器证据，不能代替 Human Decision。其不可用、严重级别与阻塞语义由版本化检查 Policy 明确，不能由 Model 自己决定能否合并。

## 14. Merge 与多仓 Requirement

执行 Merge 前必须实时校验：

- Formal MR 仍指向已批准 `headSha`；
- Current Review Decision 有效；
- Requirement Acceptance 对当前 Integration Baseline 仍有效；
- 执行人具备 `merge_request.merge` 和有效 Scope；
- GitLab 确定性检查和保护规则满足；
- Idempotency/Effect Ledger 未记录同一 Merge 已完成或冲突结果。

一个 Requirement 的多个 WorkItem 各自创建 Formal MR。平台不宣称跨 Repository 原子事务，也不写死前后端合并顺序；顺序和兼容约束由当前 Requirement 的受控 Integration/Merge 策略决定。

部分 MR 已合并、其他 MR 失败时：

- Requirement 保持 `AWAITING_MERGE`；
- 已合并事实不回滚或伪装成未发生；
- 停止不安全的后续 Merge，显示明确 blocked reason；
- 由授权人员选择兼容修正、继续 Merge、回滚发布或创建关联 Requirement；
- 全部必需 Formal MR 合并且 Acceptance 仍有效后，Requirement 才能 `COMPLETED`。

## 15. Webhook、Reconciliation 与 Port

GitLab Webhook 先进入幂等 Inbox：验证签名、按 Provider Event ID 去重、保存受控摘要、异步处理并支持重放。乱序或缺失事件由 Reconciler 按 Project/Branch/MR 当前事实对账；Webhook 不能直接覆盖领域状态。

`SourceControlPort` 至少提供：

```text
listAuthorizedRepositories
getRepositoryProfile
getBranch / getCommit / compare
createTaskBranch
createIntegrationMergeRequest
mergeIntegrationMergeRequest
createFormalMergeRequest
getMergeRequest
mergeFormalMergeRequest
deleteSourceBranch
reconcileExternalEffect
```

Review Assignment 和 Human Decision 由平台 Gate/Assignment Port 管理；Adapter 可以同步 Provider MR 状态，但不能把 GitLab Bot Approval 当成人工 Decision。所有外部写操作使用 Idempotency Key、期望版本和 Effect Ledger。

关键事件：

```text
WorkspaceRepositoryAdded
WorkspaceRepositoryRemoved
WorkItemRepositoryBound
TaskBranchCreated
IntegrationMergeRequestCreated
IntegrationMergeRequestMerged
CommitCheckpointRecorded
FormalMergeRequestCreated
FormalReviewAssigned
FormalReviewDecisionInvalidated
FormalReviewApproved
FormalMergeRequestMerged
SourceBranchDeletionFailed
```

不存在 Jenkins/Delivery 事件。

## 16. 失败处理

| 场景 | 处理 |
| --- | --- |
| Workspace Repository 未授权或已移除 | 拒绝新 Binding/凭据，历史引用保留，进行中事项阻塞 |
| 创建分支失败 | WorkItem 保持 `DRAFT`，允许幂等重试，不启动执行 |
| 外部分支成功、本地事务失败 | Reconciler 按 Effect Ledger 补写或报告孤儿分支 |
| 仓库选错且分支已创建 | 原 WorkItem `SUPERSEDED`，创建替代 WorkItem，不改历史 |
| Integration MR 检查失败 | 不允许自行合并 `dev`，修复同一任务分支 |
| Jenkins 失败或不可用 | 平台无状态可同步，由开发人员在 Jenkins 处置 |
| MR 文本 Model 不可用 | 记录结构化失败并重试/人工触发，不改变 source/target 或绕过 Guard |
| 无合格 Formal Reviewer | Gate 阻塞，等待默认审核人或受控恢复路径改派 |
| `headSha` 变化 | 旧检查、Acceptance 与 Review Decision 失效，重新验证 |
| Formal Merge 冲突或保护规则拒绝 | 保持 `AWAITING_MERGE`，不绕过 GitLab 保护 |
| 多仓部分合并 | 保留已合并事实，停止不安全后续动作并进入显式处置 |
| source branch 自动删除失败 | WorkItem 完成事实不回退，创建运维待办 |

## 17. 审计、可观测性与验收

审计记录 Connection/Project/Secret Reference 变化、Repository/Branch Binding、base/head SHA、分支与 MR 外部 Effect、Commit/Agent/代表用户、检查与 Artifact、Integration Merge、Requirement Acceptance、Review Assignment/改派/Decision、Formal Merge、Webhook/Reconciliation 和异常处置。Secret、完整 PAT 和敏感源码不得进入普通审计字段。

管理后台在当前 Environment 展示 Source Control Connector 健康、授权 Project、分支/MR Drift、Webhook Inbox/Reconciliation、External Effect、Review Assignment、Decision 失效、Merge 阻塞和 Runbook；不展示或伪造 Jenkins 状态。

验收至少覆盖：

1. Requirement 无法在未选择初始 Repository 的情况下创建，第一个 WorkItem 自动继承；
2. 后续 WorkItem 可处于 `WAITING_REPOSITORY`，绑定前不能执行或创建分支；
3. 分支名使用 `type/wi-<全局号>-<slug>` 且从 `main` 固定 SHA 创建；
4. Repository 选错且已建分支时通过 `SUPERSEDED` 替代，不篡改历史；
5. Agent 和人员都不能直接 Push `main`；
6. Integration MR 进入 `dev`、无需 Leader Review、使用 merge commit且保留 source branch；
7. Jenkins 完全位于平台外部，不存在 Adapter、Webhook、状态投影或 Gate；
8. 一键创建的是 `task branch → main` Formal MR，重复点击返回同一个 MR；
9. 普通开发负责人默认路由直属 Leader，Leader 负责人默认路由本人，均可受控改派合格 Reviewer；
10. 作者具备 `merge_request.review` 且被 Assignment 选中时可以自审；
11. `headSha` 变化使旧 Decision 失效，要求修改继续同一分支和 MR；
12. Formal MR 使用 squash merge，合并后自动删除 source branch；
13. 不需要固定 `main → dev` 同步；
14. GitLab Provider 替换只改变 Adapter/Mapping，不修改 WorkItem、Assignment 或 Workflow。
