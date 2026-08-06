# Source Control 与交付

> 文档层级：L1 运行地图
> 规范事实源：[Source Control 与交付详细说明](./source-control-delivery-detail.md)

## 目标与边界

本领域通过稳定 `SourceControlPort` 管理 GitLab Project、Requirement/WorkItem 的仓库绑定、任务分支、Integration MR、Formal MR、人工 Review 与 Merge。它复用 GitLab Project，不复制第二套代码项目、分支、MR 或 GitLab 权限体系。

Requirement、WorkItem、Gate、Decision、Acceptance、`RequirementIntegrationBaselineSelection` 与业务状态由 [Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)拥有；本领域唯一拥有 Git/MR/Artifact `IntegrationBaselineEvidence` 的证据结构、`integrationBaselineId/hash`、外部事实与变化事件。Attempt 和 Execution Binding 由 [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)拥有；Sandbox 仅消费固定 Branch Binding 以执行代码，见 [Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)。

## 绑定与任务分支

本领域接收 Workflow owner 的 Repository Binding 请求，并返回 `BindingReady` 或含原因的 `BindingBlocked`。创建 Requirement 的初始仓库选择、后续 WorkItem 的责任和业务限制由 Workflow owner 决定；未获得 `BindingReady` 的请求不会创建 Branch 或 MR。

一旦任务分支成功创建，`repositoryId + baseCommitSha + branchName` 即成为不可变的 Repository Branch Binding。任务分支从对应仓库的 `main` 固定 Commit 创建，Agent 只可写已绑定的当前任务分支；Binding 选择错误时，本领域保留原外部事实并返回结构化处置结果，由 Workflow owner 决定业务补救。

## 交付主流程

```text
task branch（from main）
→ task branch → dev Integration MR
→ 平台内确定性检查与用户手工合并 Integration MR
→ 用户在独立 Jenkins 手工验证并向平台提交外部证据引用
→ 生成 IntegrationBaselineEvidence
→ Requirement 选定 Evidence 并完成 Acceptance
→ task branch → main Formal MR
→ Formal Review + 受保护合并
```

Integration MR 面向 `dev`，必须满足 GitLab 检查与分支保护；它不要求 Formal Human Review，且合并时保留任务分支。Formal MR 始终从同一任务分支进入受保护 `main`，绑定准确 `headSha`、当前 Formal Review Assignment 与 Requirement Acceptance；新 Commit 或重写分支会使依赖旧版本的结论失效。

## 外部 Jenkins 与多仓交付

Jenkins 完全在平台外部：用户在独立 Jenkins 平台手工触发、查看和处置构建或测试。平台不自动触发或调用 Jenkins，不接收 Jenkins Webhook，不读取、保存或展示 Jenkins 状态，也不将其结果投影为系统 Gate。用户提交的只是外部验证证据引用及其提交人、时间、目标 Commit 和说明，不是平台获取的 Jenkins 状态。

一个 Requirement 可经多个 WorkItem 交付到多个仓库，每个 WorkItem 各自拥有 Binding、任务分支和 Formal MR。平台不宣称跨仓原子 Merge；部分合并保留已发生的外部事实，停止不安全后续 Merge，并让授权人员按当前 Requirement 的兼容与交付策略处置。

## 不变量与关系

- `main` 只通过 Formal MR 合并；人员、Agent 和 Connector 都不能直接 Push，`dev` 也只经 Integration MR 接收任务分支。
- GitLab 外部写操作使用 Idempotency、Effect Ledger、Webhook Inbox 与 Reconciliation 收敛；Workflow 不依赖 GitLab 私有状态字符串或凭据格式。
- GitLab 鉴权与平台 Capability、Scope、Membership、Assignment 均须有效，互不替代。详细 Branch Saga、Review Assignment、失败与审计规则见[详细说明](./source-control-delivery-detail.md)。
