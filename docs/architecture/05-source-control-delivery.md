# Source Control 与交付

> 实施阶段、激活状态和 Release 验收见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义平台与 GitLab 之间的受控交付链路：Workspace 与 GitLab Project 的连接与授权投影、Requirement/WorkItem 的仓库绑定与不可变任务分支 Binding、Integration MR 与外部人工验证证据、`IntegrationBaselineEvidence` 的结构与变化事件、Formal MR 与 Formal Review Assignment、Merge 与多仓语义，以及 GitLab 外部事实的幂等收敛。它通过稳定 `SourceControlPort` 复用 GitLab Project，不复制第二套代码项目、分支、MR 或 GitLab 权限体系。

本文消费 [Requirement Workflow](./02-requirement-workflow.md) 的稳定 ID、`RequirementDeliverySnapshot` 与受保护命令，产生 Binding、Branch、MR、Merge 与 Evidence 事实，不复制 Requirement 的冻结、选择、验收或状态机；人员资格由[身份、组织与授权](./01-identity-organization-authorization.md)判定，Attempt 与 Agent 的分支写权限由 [Agent、Skill 与 Model](./03-agent-skill-model.md) 固定，Sandbox 只消费固定 Branch Binding 以执行代码（见 [Sandbox Runtime](./04-sandbox-runtime.md)）。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：`SourceControlPort` 的方法清单见[参数附录](./appendix-parameters.md#port-方法清单)，Evidence 生成的结构化冲突原因码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 对象与准入条件

| 对象 | 规范职责 |
| --- | --- |
| `SourceControlConnection` | Workspace 与 GitLab 的连接；凭据只保存为 OpenBao Secret Reference |
| `WorkspaceRepository` | 已授权 GitLab Project 的受控投影：Provider、Project ID/Path、默认分支、技术栈与保护规则 |
| `RepositoryBranchBinding` | 任务分支创建成功后由 `repositoryId + baseCommitSha + branchName` 构成的不可变绑定 |
| `MergeRequestBinding` | Integration/Formal MR 与 WorkItem、任务分支及准确 `headSha` 的绑定 |
| `IntegrationBaselineEvidence` | 针对一次 `RequirementDeliverySnapshot` 采集的不可变交付证据版本 |
| `FormalReviewAssignment` | Formal MR 的默认与当前审核人、组织解析快照与 Review Policy Version |
| `SourceControlEffect` | GitLab 外部写操作的 Effect Ledger 事实与收敛结果 |

仓库操作必须同时满足下列全部条件，任一不成立即拒绝：

```text
有效账号与 Membership
AND Platform Capability + Scope
AND WorkspaceRepository 已授权
AND WorkItem Repository Binding 有效
AND GitLab 分支保护与 Credential 允许该动作
AND（Agent 场景）Execution Binding / Tool Policy 允许
```

### 任务分支与交付主流程

任务分支始终从对应 Repository `main` 的当前 Commit 创建，命名为 `type/wi-<全局递增号>-<semantic-slug>`，创建过程是一个幂等 Saga：

```text
校验 WorkItem Assignment、Repository Binding、Capability 与 Scope
→ 读取并记录 main 的 baseCommitSha
→ 幂等创建任务分支
→ 验证远端分支准确指向 baseCommitSha
→ 持久化不可变 RepositoryBranchBinding
→ 发布 TaskBranchCreated
```

每个 WorkItem 的交付顺序固定为 `task → dev → task → main`：

```text
task branch（from main）
→ task branch → dev Integration MR
→ 确定性检查与 GitLab 分支保护
→ 用户手工合并 Integration MR
→ 用户在独立 Jenkins 平台手工验证并提交外部证据引用
→ 生成 IntegrationBaselineEvidence
→ 02 owner 选定 Evidence 并完成 Acceptance
→ task branch → main Formal MR
→ Formal Review + 受保护合并
```

创建 Formal MR 同样使用稳定 Idempotency：

```text
校验 WorkItem、Assignment、Branch、当前 headSha 与 02 owner 提供的受保护命令证据
→ Model 生成 title / description
→ 服务端验证和规范化文本
→ Connector 幂等创建 task branch → main MR
→ 保存 MergeRequestBinding 与 Formal Review Assignment
```

### Evidence 结构与失败处置

02 owner 先冻结不可变 `RequirementDeliverySnapshot`（至少含 `requirementId`、生成时 `requirementVersion`、`requiredWorkItemSetVersion/hash` 与按稳定 WorkItem ID 排序的全部必需 WorkItem 集合）；本领域只能针对该快照采集证据，不得自行推断哪些 WorkItem 是必需项。

`IntegrationBaselineEvidence` 至少保存 `integrationBaselineId/hash`、`requirementId`、生成时 `requirementVersion`、`requiredWorkItemSetVersion/hash`、生成时间，以及每个必需 WorkItem 的 Repository、任务分支 Commit、Integration MR 与结果、Artifact Hash、执行来源与外部验证证据；平台为此保存 Route 所要求的 Commit Checkpoint。执行来源按 02 owner 的 `executorType` 判别：`HUMAN` 交付绑定人员 executor 标识，`AGENT` 交付必须绑定 Attempt 引用，不允许两者皆无或以占位充数。快照、逐项证据与规范化序列共同进入 Evidence Hash。

下表是本领域对失败的处置语义；结构化冲突原因码见[参数附录的错误码](./appendix-parameters.md#错误码)。

| 场景 | 处理 |
| --- | --- |
| Repository 未授权或已移除 | 返回 `BindingBlocked`，拒绝新 Binding 与新 Agent Credential，历史保留 |
| 创建分支失败或远端验证不通过 | 返回 `BranchCreationFailed` 与结构化阻塞原因，允许幂等重试 |
| 分支已创建、本地事务失败 | Reconciler 依 Effect Ledger 补写 Binding 或报告孤儿分支 |
| Integration MR 检查失败 | 返回 `IntegrationMergeBlocked` 与检查证据，不执行 Merge |
| Jenkins 失败或不可用 | 平台无状态可同步，用户在 Jenkins 处置 |
| 生成 Evidence 时快照版本已变化 | 以结构化冲突原因失败并重新获取快照，不发布部分覆盖或混合版本的 Evidence |
| 无合格 Formal Reviewer | 返回 Review Assignment 无法解析的结构化事实，交 02 owner 处置 |
| `headSha` 变化 | 发布带新旧 hash 的 Review/检查/Baseline 证据变化，供 02 owner 判定 Gate/Acceptance 影响 |
| Formal Merge 冲突或保护拒绝 | 返回 `FormalMergeBlocked`，不绕过 GitLab 保护 |
| 多仓部分合并 | 保留已合并事实，返回 `MultiRepositoryDeliveryBlocked` 并停止不安全动作 |

## 关键不变量

- `main` 是受保护分支，人员、Agent 与 Connector 都不能直接 Push，唯一入 `main` 的路径是 Formal MR；`dev` 只经 Integration MR 接收任务分支，Force Push 默认拒绝——单一受保护入口是"每次进入 `main` 的变更都有对应人工审核与证据"的前提。
- 只有 `BindingReady` 能作为创建 Branch 或 MR 的输入；本领域只验证仓库选择并返回 `BindingReady` 或含原因的 `BindingBlocked`，创建 Requirement、责任人选择与业务执行限制由 02 owner 定义——绑定资格与业务决定分开判定，仓库配置错误才不会变成业务状态。
- 分支创建前 Workflow owner 可发出新的 Binding 请求，任务分支创建成功后 `repositoryId + baseCommitSha + branchName` 即不可变；此后发现仓库选错时保留原 Binding、Commit、Attempt、Artifact、MR 与 Audit 并发布冲突/处置事实，是否新建 WorkItem 或采用其他补救由 02 owner 决定——搬运或改写历史会让已发生的外部事实失去归属。
- 同名分支只在能证明属于同一 WorkItem 且 base SHA 一致时复用；外部分支已创建而本地事务失败时由 Reconciler 依 Effect Ledger 补写 Binding 或报告孤儿分支，禁止重复创建或静默接管未知分支——平台不能为不属于自己的分支背书。
- 移除 Workspace Repository 后禁止新 Binding 与新 Agent Credential，历史 Binding、Commit、MR 与 Audit 保留，进行中的事项显示明确阻塞原因并由有权限人员处置——撤销授权只切断后续动作，不能删除已发生的交付事实。
- Integration MR 不要求 Formal Human Review，有权限用户在满足确定性检查与 GitLab 分支保护后即可合并到 `dev`；Integration Merge 使用 merge commit 且不得删除 source branch——集成上下文必须可回溯，且同一任务分支还要用于 Formal MR。
- `dev` 是集成验证目标而不是 Formal MR 的 source；平台不创建 `dev → main` MR，也不要求固定的 `main → dev` 同步——Formal MR 必须直接绑定被验收的那个任务分支，才能与 Evidence 和 Review 对齐。
- Jenkins 是用户手工触发、查看与处置的独立外部平台：平台不存在 Jenkins Adapter，不调用或触发 Job，不接收其 Webhook，不查询、保存、展示或投影 Build/Deploy 状态，不复制其 Log，也不把 Jenkins 结果定义为可自动判断的 Gate，其失败、重试与回滚完全在 Jenkins 处置——外部手工系统不能成为平台 Gate 的事实源。
- 用户提交的只是外部验证证据引用及其提交人、时间、目标 Commit 与说明，而不是平台获取的 Jenkins 状态；外部验证完成后，平台内受保护动作仍由 02 owner 的 Route、Acceptance 与 Gate Contract 校验——人工声明不能被升级为平台自动结论。
- Evidence 的 WorkItem 集合必须与输入快照一一对应、无缺失、无重复，且不能引用持续移动的分支 HEAD——移动的 HEAD 不能作为验收对象。
- 任何相关 Git/MR 证据的 `headSha`、Artifact、Contract 或必需 WorkItem 集合变化，都必须产生新的 `IntegrationBaselineEvidence` 或 `IntegrationBaselineEvidenceChanged` 事件，旧 Evidence 保留为历史事实——证据是不可变版本，覆盖会让已作出的验收无法复盘。
- 生成 Evidence 期间发现 Requirement 或必需集合版本已变化时，本次生成以结构化冲突原因 Fail Closed 并重新获取快照，绝不发布部分覆盖或混合版本的 Evidence——混合版本的证据比没有证据更危险。
- 本领域只发布证据结构与变化事实；当前 `RequirementIntegrationBaselineSelection`、Acceptance Decision 对 `integrationBaselineId/hash` 的绑定与失效，以及任何 Requirement/WorkItem 业务动作都由 02 owner 决定——证据与验收分属两个 owner 才能各自独立演进。
- Model 只能生成 Formal MR 的 title 与 description，不能选择 Repository、source/target、Reviewer 或执行 Merge；重复创建请求返回同一 MR，Connector 只返回 `FormalMergeRequestCreated` 或 `FormalMergeRequestBlocked` 事实而不推进业务状态——生成内容不得成为授权或路由决定。
- Formal MR 使用 squash merge，合并后应删除 source branch；删除失败不回退已完成的 Merge 事实，而是形成独立运维待办——已成立的外部事实不能因清理失败被撤销。
- `FORMAL_MR_REVIEW` 是 02 owner 的稳定 Gate Type，本领域只规定其 Formal MR 绑定与默认 Assignment：按当前 WorkItem `humanOwnerId` 解析，普通开发人员的默认审核人为其直属 Leader，Leader 的默认审核人为本人，并保存 `defaultReviewerId`、`currentReviewerId`、组织解析快照、Review Policy Version（Review Policy 属 [02](./02-requirement-workflow.md) 的 Gate Policy Namespace，本领域只保存解析时的版本快照）与准确 `headSha`——默认路由必须可解释、可审计，而 Gate 语义仍归业务 owner。
- Reviewer 必须同时是当前 Assignment assignee，并实时具备 `merge_request.review`、有效 Scope、Membership 与账号状态——审核资格按当前事实判定，历史分配不构成权限。
- 默认审核人可在最终 Decision 前改派给任意合格候选人，被选审核人不能继续转派（除非其本身也是默认审核人）；Agent、Connector 与 Bot 不能成为人工审核人——责任链必须收敛到可追责的人。
- 允许作者本人在被合法分配且资格有效时自审；`merge_request.review` 不授予 Merge 权，`merge_request.merge` 是独立 Capability——审核与合并是两个可分别授予、可分别撤销的动作。
- 新 Commit、rebase、冲突解决、受控同步 `main`、关键 Artifact 或 API Contract 改变以及 Formal MR `headSha` 变化，均生成带新旧 hash 的 Review/检查/Baseline 证据变化事件并保留历史；Decision 的版本有效性由 02 owner 依其 Gate 与 Acceptance Contract 判定，本领域不作业务状态转换——变化必须可见，但业务结论只能由业务 owner 作出。
- 要求修改的外部事实仍使用同一 task branch 与 Formal MR；收到当前有效人工 Decision 对应的冻结请求时，Connector 冻结该 source branch 并禁止继续 Push，后续新增代码的业务建模由 02 owner 决定——冻结把"已被审核的内容"钉死在一个可核验的 Commit 上。
- Agent 场景除通用账号、Membership、Capability、Scope、Repository Binding 与 GitLab 保护校验外，还必须满足不可变 Execution Binding 与 Tool Policy；Agent Commit 在实际交付时序中仍先于 Integration MR，自动化只改变任务分支 Commit 的来源，不改变人工交付顺序、证据绑定与责任链——受控来源替换的是"谁写代码"，不是"谁负责"。
- Agent Credential 必须绑定 Platform Environment、Attempt、Project、任务分支与 TTL，只允许读取 Binding 固定的 Repository/Commit 并写当前任务分支；TTL 是任务分支 Push 窗口的硬上限，Attempt 进入 Fence 或清理时凭据按 [Sandbox Runtime](./04-sandbox-runtime.md) 的清理 Contract 即刻吊销——凭据的范围与有效期必须小于它可能造成的影响面。
- Agent 产生的有效代码必须先在 Sandbox 内形成可核验 Commit，再以该凭据直接 Push 当前任务分支；Connector 不代理该 Push，只幂等核验远端 `headSha`、把 Push Effect 记入 `SourceControlEffect` Ledger 并收敛未知结果，远端确认的 Commit SHA、Push Effect、实际 Agent、发起人员与 Binding 引用共同进入交付证据——只有远端确认的事实才是交付事实。
- Fence 生效后到达远端的 Push 不进入该 Attempt 的交付证据，Reconciler 发现此类 Push 时冻结该任务分支并发布带新旧 hash 的证据变化事件，由 02 owner 决定业务处置；未知或失败的 Push 只通过 Effect Ledger 与 Reconciliation 收敛，绝不被解释为已交付——未证明的外部效果按未完成处理是唯一安全的默认值。
- Agent 不能直接 Push `dev` 或 `main`，不能扩大 Repository Scope、Force Push、选择 Reviewer、形成 Human Decision、代替 Acceptance/Formal Review 或执行 Merge——这些都是人工责任动作，授予执行者等于取消 Gate。
- Merge 请求必须携带 02 owner 已验证的 Formal Review/Acceptance 证据，并实时确认 Formal MR 仍指向该 `headSha`、执行人具备 `merge_request.merge` 与 Scope、GitLab 检查与分支保护满足，且 Effect Ledger 未记录同一 Merge 的已完成或冲突结果；Connector 只返回 `FormalMergeSucceeded`、`FormalMergeBlocked` 或 `FormalMergeFailed` 外部事实——合并前重新验证全部条件，过期结论才不会落地。
- 一个 Requirement 可包含多个仓库 WorkItem，每项各自具有 Repository Branch Binding、Integration MR 与 Formal MR；平台不提供跨仓原子事务，也不预设前后端合并顺序，部分 MR 已合并而其他项失败时保留已合并事实、返回 `MultiRepositoryDeliveryBlocked` 并停止不安全的后续 Merge，业务处置与 Requirement 结果由 02 owner 决定——跨系统原子性无法保证，先停下并暴露状态比合并出不一致组合更安全。
- GitLab 外部写操作一律使用 Idempotency Key、期望版本与 `SourceControlEffect` Ledger，Workflow 不依赖 GitLab 私有状态字符串或凭据格式——外部系统只经稳定 Contract 参与，才能被替换与对账。
- Webhook 先进入幂等 Inbox：验证签名、按 Provider Event ID 去重、保存受控摘要后再异步处理，乱序、缺失或未知事实由 Reconciler 依当前 Project、Branch、Commit 与 MR 查询收敛；Webhook 不能直接覆盖领域状态，GitLab Bot Approval 也不能替代平台 Human Decision——推送只是提示，权威事实必须回查确认。
- GitLab 鉴权与平台 Capability、Scope、Membership、Assignment 必须同时有效且互不替代；平台不复制 GitLab 仓库或权限页面，也不把 GitLab Role 当作平台授权对象的替代品——两套授权各自收紧，任一被绕过都不会放宽另一套。
- Connection 凭据只保存为 OpenBao Secret Reference 并以短期最小权限提供给 Connector，用户与 Agent 只能使用当前 Workspace 已授权的仓库——凭据不落业务库、访问面不外溢是外部集成的最低要求。
- 稳定 `SourceControlPort` 是本领域唯一的对外协议边界（方法清单见[参数附录](./appendix-parameters.md#port-方法清单)），GitLab Connector 只做协议转换与外部效果收敛，不持有平台 Capability 或业务状态——单一 Port 让 Provider 可替换而领域语义不变。
- 审计记录 Connection/Project/Secret Reference 变化、Repository/Branch Binding、base/head SHA、外部 Effect、Commit/Agent/发起用户、检查、Artifact、Integration Merge、Acceptance、Review Assignment/Decision、Formal Merge、Webhook/Reconciliation 与异常处置，但不得记录 Secret 明文、完整 PAT 或敏感源码——证据链要完整，同时不能把凭据与源码变成新的泄露面。

## 与其他模块的关系

下表是本模块自身视角：05 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链中代码事实与交付证据的收敛环节 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 人员资格、Capability/Scope/Membership 与组织层级的服务端判定 | 仓库绑定、MR 创建、Review 与 Merge 动作所需的资格判定入口 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | 稳定 Requirement/WorkItem 标识、`RequirementDeliverySnapshot`、受保护命令证据、Selection 冻结与 Acceptance 失效判定 | 分支命名与 Binding Saga、Integration/Formal MR、Merge、`IntegrationBaselineEvidence` 结构与变化事件、Formal MR 默认路由与 Review Assignment、`headSha` 失效事实 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 不可变 Execution Binding、Attempt 引用、Tool Policy 与 Agent 的分支写权限边界 | `RepositoryBranchBinding`、任务分支 Push Effect 与交付证据收敛结果 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 固定 Checkout 的挂载与写执行边界、Fence 与凭据吊销的清理 Contract | 分支创建与保护、MR 与 GitLab 外部对账、Agent Credential 的 Binding 与 TTL 约束 |
| [06 平台应用与集成](./06-platform-application-integration.md) | 应用入口、稳定 Port/Adapter 装配、Webhook 验签与幂等一致性 Contract | `SourceControlPort` 的业务语义，以及运营视图可展示的 Connector、授权 Project、Drift、Inbox/Reconciliation、Effect、Assignment 与 Merge 阻塞 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | Artifact 对象与 Object Version、Inbox/Outbox 与 Effect Ledger 的持久化基线 | Evidence 引用的 Artifact Hash 与外部 Effect 的可对账事实 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Secret Reference 与短期凭据机制、Audit Envelope、脱敏与保留规则 | 本领域的 Audit Trigger（Binding、base/head SHA、外部 Effect、Review Decision、Merge、Reconciliation）与业务摘要 |
| [12 实施路线图](./12-implementation-roadmap.md) | 当前阶段的实施状态、Capability 激活状态与 Release 验收记录 | 交付链路必须证明的 Contract，供 Release Gate 引用 |
| [参数附录](./appendix-parameters.md) | `SourceControlPort` 方法清单与结构化冲突原因码 | 本文正文中的定性规则 |
