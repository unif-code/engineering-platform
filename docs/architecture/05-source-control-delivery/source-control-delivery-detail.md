# Source Control 与交付详细说明

> 文档层级：L2 规范事实源
> 对应主文：[Source Control 与交付](./source-control-delivery.md)

## 1. 责任边界

本文是 GitLab Binding、任务分支 Saga、Integration/Formal MR、GitLab 外部事实收敛、Formal Review Assignment、Merge 与多仓语义的唯一规范事实源。Requirement、WorkItem、Gate、Decision、Acceptance 与业务状态由 [Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)唯一拥有；本文只消费其稳定 ID、有效 Gate/Decision 与 Integration Baseline 引用，不复制其状态机。

人员资格由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有；Execution Binding 与 Agent 的分支写权限由[Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)拥有。平台不复制 GitLab 仓库或权限页面，也不把 GitLab Role 当作平台 Capability、Scope、Membership 或 Assignment 的替代品。

## 2. GitLab Binding

`SourceControlConnection` 连接 Workspace 与 GitLab；凭据只保存为 OpenBao Secret Reference，并以短期最小权限提供给 Connector。`WorkspaceRepository` 是已授权 GitLab Project 的受控投影，记录 Provider、Project ID/Path、默认分支、技术栈和保护规则。用户和 Agent 只能使用当前 Workspace 已授权的仓库。

仓库操作必须同时满足：

```text
有效账号与 Membership
AND Platform Capability + Scope
AND WorkspaceRepository 已授权
AND WorkItem Repository Binding 有效
AND GitLab 分支保护与 Credential 允许该动作
AND（Agent 场景）Execution Binding / Tool Policy 允许
```

创建 Requirement 时必须选择且只选择一个初始 Repository；第一个 WorkItem 自动继承。后续 WorkItem 可保持 `repositoryState = WAITING_REPOSITORY`，由其人类负责人从授权仓库中选择；在 `BOUND` 前不得建分支、启动人类或 Agent 执行，或创建 Integration/Formal MR。

分支创建前允许在权限范围内改选 Repository。分支创建成功后，`repositoryId + baseCommitSha + branchName` 构成不可变 `RepositoryBranchBinding`。发现仓库选错时，原 WorkItem 进入 `SUPERSEDED`，保留其 Binding、Commit、Attempt、Artifact、MR 和 Audit；新建替代 WorkItem、新全局编号、新 Binding 和新分支，通过稳定关联表达替代，不能搬运或改写历史。

移除 Workspace Repository 后，禁止新 Binding 和新 Agent Credential；历史 Binding、Commit、MR 和 Audit 保留，进行中的事项显示明确阻塞原因，由有权限人员处置。

## 3. Branch Saga 与保护规则

任务分支始终从对应 Repository `main` 的当前 Commit 创建，命名为：

```text
type/wi-<全局递增号>-<semantic-slug>
```

```text
校验 WorkItem Assignment、Repository Binding、Capability 与 Scope
→ 读取并记录 main 的 baseCommitSha
→ 幂等创建任务分支
→ 验证远端分支准确指向 baseCommitSha
→ 持久化不可变 RepositoryBranchBinding
→ 发布 TaskBranchCreated
```

GitLab 分支未真实创建或验证失败时，WorkItem 保持其 Workflow owner 定义的 `DRAFT` 并记录结构化阻塞原因，不能伪装为 `READY`。同名分支只在能证明属于同一 WorkItem 且 base SHA 一致时复用。若外部分支已创建而本地事务失败，Reconciler 依 Effect Ledger 补写 Binding 或报告孤儿分支，禁止重复创建或静默接管未知分支。

`main` 是受保护分支，人员、Agent 和 Connector 均不能直接 Push，只能由 Formal MR 合并。`dev` 只经 Integration MR 接收任务分支。Agent Credential 必须绑定 Environment、Attempt、Project、任务分支与 TTL；Force Push 默认拒绝。受控 rebase 或冲突解决生成新 `headSha`，并使依赖旧版本的检查、Acceptance 与 Review Decision 失效。

## 4. Integration MR 与外部人工验证

每个 WorkItem 的交付顺序固定为 `task → dev → task → main`：

```text
task branch（from main）
→ task branch → dev Integration MR
→ 确定性检查与 GitLab 分支保护
→ 用户手工合并 Integration MR
→ 用户在独立 Jenkins 平台手工验证
→ task branch → main Formal MR
```

Integration MR 不要求 Formal Human Review；有权限的用户可在满足确定性检查和 GitLab 保护规则后合并到 `dev`。Integration Merge 使用 merge commit 保留集成上下文，且不得删除 source branch，因为它仍要用于 Formal MR。`dev` 是集成验证目标，不是 Formal MR 的 source；平台不创建 `dev → main` MR，也不要求固定的 `main → dev` 同步。

Jenkins 是独立外部平台，用户手工触发、查看和处置构建/测试。平台不存在 Jenkins Adapter，不调用或触发 Jenkins Job，不接收 Jenkins Webhook，不查询、保存、展示或投影 Jenkins Build/Deploy 状态，不复制 Jenkins Log，也不把 Jenkins 结果定义为可自动判断的 Gate。Jenkins 的失败、重试与回滚完全由 Jenkins 处置；用户完成外部验证后，在平台继续受当前 Route、Integration Baseline 和 Acceptance Guard 约束的业务动作。

## 5. Integration Baseline 与 Formal MR

平台为每个 WorkItem 保存 Route 所要求的 Commit Checkpoint；Requirement 的 Integration Baseline 由当前必需 WorkItem 的 Repository、任务分支 Commit、Integration 结果、Artifact Hash、Attempt 引用与验证证据组成。它不能引用持续移动的分支 HEAD。

进入 Formal MR 前，当前 Route 的实现、测试、Integration 及其他确定性检查必须完成，且 `REQUIREMENT_ACCEPTANCE` 必须准确绑定当前 Integration Baseline。任何相关 WorkItem 的 `headSha`、Artifact 或 Contract 变化都会使依赖旧版本的 Checkpoint、Acceptance 或检查失效；只有 Acceptance 仍有效且 Formal MR 已创建，Workflow owner 才能将 WorkItem 推进至 `AWAITING_MERGE`。

创建 Formal MR 使用稳定 Idempotency：

```text
校验 WorkItem、Assignment、Branch、当前 headSha、Gate 与 Acceptance
→ Model 生成 title / description
→ 服务端验证和规范化文本
→ Connector 幂等创建 task branch → main MR
→ 保存 MergeRequestBinding 与 Formal Review Assignment
```

Model 只能生成文本，不能选择 Repository、source/target、Reviewer 或执行 Merge。重复请求返回同一 MR，不能创建多个。Formal MR 使用 squash merge；合并后应删除 source branch，删除失败不回退已完成的 Merge 事实，而是形成独立运维待办。

## 6. Formal Review Assignment 与 `headSha`

`FORMAL_MR_REVIEW` 是 Requirement Workflow 的稳定 Gate Type；本领域只规定其 Formal MR 绑定和默认 Assignment。Formal MR 创建时，按当前 WorkItem `humanOwnerId` 解析：普通开发人员的默认审核人为其直属 Leader；Leader 的默认审核人为本人。保存 `defaultReviewerId`、`currentReviewerId`、组织解析快照、Review Policy Version 和准确 `headSha`。

Reviewer 必须同时是当前 Assignment assignee，且实时具备 `merge_request.review`、有效 Scope、Membership 与账号状态。默认审核人可在最终 Decision 前改派给任意合格候选人；被选审核人不能继续转派，除非其也为默认审核人。Agent、Connector 与 Bot 不能成为人工审核人。允许作者本人在被合法分配且资格有效时自审；`merge_request.review` 不授予 Merge 权，`merge_request.merge` 是独立 Capability。

新 Commit、rebase、冲突解决、受控同步 `main`、关键 Artifact 或 API Contract 改变，以及 Formal MR `headSha` 变化，均使旧 AI Review、确定性检查、Acceptance 和 Formal Review Decision 按依赖关系失效，历史保留。要求修改时沿用同一 WorkItem、task branch 与 Formal MR，重新经过 Integration、验证与 Acceptance；批准后冻结 source branch，禁止继续 Push。批准后还需新增代码时必须形成新的受控 Requirement，不能修改已批准 head 并沿用旧 Decision。

## 7. Merge、多仓与外部事实收敛

Merge 前必须实时确认：Formal MR 仍指向已批准的 `headSha`、当前 Review Decision 和 Requirement Acceptance 均有效、执行人有 `merge_request.merge` 与 Scope、GitLab 检查/分支保护满足，且 Effect Ledger 未记录同一 Merge 的已完成或冲突结果。

一个 Requirement 可包含多个仓库 WorkItem；每项各自具有 Repository Branch Binding、Integration MR 与 Formal MR。平台不提供跨仓原子事务，也不预设前后端合并顺序。部分 MR 已合并而其他项失败时，Requirement 保持 `AWAITING_MERGE`，保留已合并事实，停止不安全后续 Merge，并交由授权人员选择兼容修正、继续、回滚发布或创建关联 Requirement。所有必需 Formal MR 合并且 Acceptance 对当前 Baseline 仍有效后，才由 Workflow owner 完成 Requirement。

GitLab 外部写操作使用 Idempotency Key、期望版本和 `SourceControlEffect` Ledger。Webhook 进入幂等 Inbox，先验证签名、按 Provider Event ID 去重并保存受控摘要，再异步处理；乱序、缺失或未知事实由 Reconciler 依据当前 Project、Branch、Commit 和 MR 查询收敛。Webhook 不能直接覆盖领域状态，GitLab Bot Approval 不能替代平台 Human Decision。

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

## 8. 失败、审计与验收

| 场景 | 处理 |
| --- | --- |
| Repository 未授权或已移除 | 拒绝新 Binding/凭据，历史保留，进行中事项阻塞 |
| 创建分支失败 | 保持 `DRAFT`，允许幂等重试，不启动执行 |
| 分支已创建、本地事务失败 | Reconciler 补写 Binding 或报告孤儿分支 |
| Integration MR 检查失败 | 不允许合并 `dev`，在同一任务分支修复 |
| Jenkins 失败或不可用 | 平台无状态可同步，用户在 Jenkins 处置 |
| 无合格 Formal Reviewer | Gate 阻塞，等待合规改派 |
| `headSha` 变化 | 相关检查、Acceptance 与 Decision 失效并重新验证 |
| Formal Merge 冲突或保护拒绝 | 保持 `AWAITING_MERGE`，不绕过 GitLab 保护 |
| 多仓部分合并 | 保留已合并事实，停止不安全动作并显式处置 |

审计记录 Connection/Project/Secret Reference 变化、Repository/Branch Binding、base/head SHA、外部 Effect、Commit/Agent/发起用户、检查、Artifact、Integration Merge、Acceptance、Review Assignment/Decision、Formal Merge、Webhook/Reconciliation 与异常处置；不得记录 Secret 明文、完整 PAT 或敏感源码。平台运营视图仅展示 GitLab Connector、授权 Project、Drift、Inbox/Reconciliation、Effect、Assignment 与 Merge 阻塞；应用集成入口见未来的[平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)。
