# Requirement 与 SDD Workflow 详细设计

> 文档层级：L2 详细版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 对应精简版：[Requirement 与 SDD Workflow](./02-requirement-sdd-workflow.md)
> 适用读者：产品、开发、测试、平台开发人员、Agent 与运维人员

## 1. 目标与范围

本文定义内部研发平台中 `Requirement` 从创建到合并、发布跟踪的完整领域流程，作为以下工作的共同依据：

- 对 `feat`，产品和产品 Leader 在真实前端页面上确认黄金需求；
- 开发 Leader 审核、拆分和分配研发任务；
- 需要后端交付时，Backend Agent 执行 Backend SDD，并产出机器可读 API Contract；
- 对 `feat`，Product Agent 在前端任务分支完成 Product SDD，Frontend Agent 在同一分支继续 Frontend Delivery；
- 远程 Sandbox 执行生成、构建、联调和测试；
- 测试、产品验收、返修、GitLab MR、AI Review 和开发 Leader 审批；
- 平台服务实现状态机、命令、事件、幂等、补偿和审计；
- 按 `feat`、`fix`、`refactor`、`chore` 选择 SDD、Debug 或技术快速路由；
- Agent 按明确的输入、输出和 Guard 执行，不自行推断人工审批结果。

本文描述目标态，不表示当前仓库已经实现相关后端服务、Agent Runtime、Sandbox 或 GitLab 集成。

### 1.1 范围边界

本文负责：

- Requirement 和各阶段子流程；
- 阶段之间的输入、输出、状态和 Guard；
- 前后端分支与阶段基线；
- 黄金需求、API Contract、测试和验收版本；
- 返修 Requirement；
- MR 创建前后的业务门禁；
- 与 Sandbox、GitLab 和 Jenkins 的业务交互。

本文不负责：

- Agent、Skill、Model 的内部路由实现；
- Sandbox 容器、网络和调度器的底层实现；
- GitLab Adapter 和 Jenkins Adapter 的 SDK 细节；
- Jenkins 内部构建、部署和回滚脚本。

上述内容分别由对应专题详细设计说明。

## 2. 已确认设计决策

以下规则是本设计的硬约束，不作为实施时的可选项：

1. 平台领域对象统一称为 `Requirement`，中文含义为“需求”。
2. 创建 Requirement 时必须选择前端仓库。
3. 平台必须立即从所选前端仓库的 `main` 当前 Commit 创建任务分支。
4. `feat` 执行完整 Product SDD；Product SDD 和后续 Frontend Delivery 使用同一个前端任务分支。
5. `fix` 不执行完整 Product SDD，必须通过 Superpowers `systematic-debugging`、TDD、验证和代码评审路由。
6. `refactor` 和 `chore` 执行技术快速流程；发现产品行为变化时必须升级为 `feat`。
7. `feat` 的 Product SDD 必须完成澄清、Product Spec、Product Plan、真实页面、Mock、验证和 Preview，形成可运行的黄金需求候选。
8. `feat` 黄金需求必须由产品和产品 Leader 分别确认。
9. 所有路由在进入研发交付前必须由开发 Leader审核、拆分任务并分配开发人员或 Agent。
10. 需要后端交付时必须执行 Backend SDD，并产出版本化、机器可读的 API Contract。
11. SDD、Debug、Frontend Delivery、Backend SDD、联调和测试均在远程隔离 Sandbox 中执行。
12. 正式返修必须新建关联 Requirement，并按新 Requirement 类型重新路由，不覆盖或重新打开原 Requirement。
13. 最终前端和后端分别创建 GitLab MR。
14. AI Review 默认提供建议，不作为合并阻塞条件。
15. 开发 Leader 审批是 MR 合并的人工阻塞条件。
16. 代码合并到各自仓库的 `main` 后，才由 Jenkins 接管构建和发布。

## 3. 术语

| 术语 | 定义 |
| --- | --- |
| Requirement | 平台中的需求聚合根，承载产品设计、研发交付、验收和合并的完整生命周期 |
| Workflow Route | 根据 Requirement 类型固定的阶段、Superpowers Skill 和人工 Gate 集合 |
| Product SDD | 产品阶段的完整 Spec Driven Development 流程，最终产出可运行黄金需求 |
| Product Spec | 经澄清后的产品行为、交互、数据、边界和验收标准 |
| Product Plan | 将 Product Spec 落到真实前端仓库的页面、路由、组件、Mock 和验证计划 |
| 黄金需求 | 已由产品和产品 Leader 确认的 Product Spec、Plan、页面、Mock、Preview 和验证证据集合 |
| Golden Candidate | 尚未完成双重人工确认的黄金需求候选版本 |
| Backend SDD | 后端从技术澄清、设计、API Contract 到实现和验证的完整 SDD |
| Frontend Delivery Run | 普通前端基于当前 Route Baseline 和适用 API Contract 进行交付的精简流程 |
| Frontend SDD | 复杂前端使用的完整技术 SDD；对 `feat` 不重复已经确认的 Product SDD |
| API Contract | 前后端共同使用的机器可读接口契约，如 OpenAPI、AsyncAPI、JSON Schema 或 Protobuf |
| WorkItem | Requirement 下可分配、可执行的工作项 |
| Stage Baseline | 某一阶段固定的 Repository、Branch、Commit、Contract 和 Artifact 版本集合 |
| Sandbox | 为 Requirement 提供的远程隔离研发环境 |
| Run Attempt | 某阶段在 Sandbox 中的一次独立执行尝试 |
| Artifact | Product Spec、Plan、源码、Mock、Contract、日志、报告、Preview Manifest 等版本化产物 |
| Approval | 人工针对准确版本和作用域作出的确认、驳回或审批 |
| Rework Requirement | 因正式测试、验收或评审不通过而创建的关联新 Requirement |
| MR | GitLab Merge Request |
| Guard | 状态转换前必须满足的可验证条件 |

## 4. 参与者与职责

所有 Workspace 正式成员默认拥有 `requirement:create`。创建 Requirement 不授予确认、验收、任务分配、MR 审批或合并能力；这些动作继续由 Capability 和 Scope 控制。

| 参与者 | 主要职责 | 禁止事项 |
| --- | --- | --- |
| Requirement 创建者 | 选择 Workspace、Project、前端仓库、类型并描述需求 | 不得绕过前端仓库选择 |
| 产品 | 对 `feat` 参与澄清、审核页面和 Mock、确认黄金需求；按路由要求执行最终产品验收 | 不得代表产品 Leader 或开发 Leader 审批 |
| 产品 Leader | 对 `feat` 独立确认黄金需求是否可作为研发基线 | 不得由 Product Agent 自动代签 |
| 开发 Leader | 审核当前 Route Baseline、绑定后端仓库、确定前端模式、分配任务、审批 MR | 不得把 AI Review 结果当作自己的审批记录 |
| 前端开发人员 | 在既有前端任务分支上完成 Delivery 或 Frontend SDD | 不得为 Delivery 私自新建替代分支 |
| 后端开发人员 | 完成 Backend SDD、API Contract、实现和测试 | 不得以自然语言说明替代机器可读 Contract |
| 测试人员 | 针对固定前后端版本执行测试并记录结论 | 不得在代码变化后复用旧测试结论 |
| Product Agent | 对 `feat` 澄清并生成 Product Spec、Plan、页面、Mock 和验证证据 | 不得确认黄金需求 |
| Frontend Agent | 执行 Frontend Delivery Run 或 Frontend SDD | 不得修改未授权仓库或合并 `main` |
| Backend Agent | 执行 Backend SDD、Contract 和实现 | 不得发布校验失败的 Contract |
| Test Agent | 执行确定性测试并整理报告 | 不得代替产品验收 |
| Code Review Agent | 对 MR 提供 AI Review 建议 | 默认不得阻塞 MR |
| Workflow Orchestrator | 校验 Guard、推进状态、发出事件和执行补偿 | 不得伪造外部系统成功状态 |
| GitLab | 保存代码、分支、Commit、MR 和审批事实 | 不承载平台业务状态 |
| Jenkins | 在 `main` 更新后执行构建和发布 | 不参与合并前 Product SDD、Delivery 或 Sandbox 验证 |

所有 Agent Run 只能使用本次 `Execution Binding` 授予的 Requirement、Repository、Branch、Sandbox、Tool 和短期凭据。Agent 不继承发起人的全部 Capability。

## 5. 端到端流程

### 5.1 类型路由

创建时固定 `requirementType` 和 `workflowRoute`：

| 类型 | Superpowers 路由 | 跳过阶段 | 保留的核心 Gate |
| --- | --- | --- | --- |
| `feat` | `brainstorming → writing-plans → test-driven-development → verification-before-completion → requesting-code-review` | 无 | 黄金需求确认、开发 Leader审核、测试、产品验收、MR 审批 |
| `fix` | `systematic-debugging → test-driven-development → verification-before-completion → requesting-code-review` | Product SDD、黄金需求确认 | 开发 Leader审核、回归测试、必要验收、MR 审批 |
| `refactor` | 按影响范围执行测试、验证和代码评审 | Product SDD、黄金需求确认；无产品行为变化时跳过产品验收 | 开发 Leader审核、确定性测试、MR 审批 |
| `chore` | 按影响范围执行测试、验证和代码评审 | Product SDD、黄金需求确认；无产品行为变化时跳过产品验收 | 开发 Leader审核、确定性测试、MR 审批 |

Workflow Engine 只负责状态、路由、Gate、Artifact、重试和审计，不复制 Superpowers Skill 内部步骤。`fix` 必须保存复现证据、根因、回归测试和验证结果。`refactor` / `chore` 一旦发现产品行为变化，必须创建或升级为 `feat`，不得在快速流程中静默扩展范围。

非 `feat` Requirement 从 `READY` 进入 `DEV_REVIEW` 后，先在该阶段准备 Route Baseline：`fix` 通过 `systematic-debugging` 形成复现证据和根因，`refactor` / `chore` 形成影响范围、技术计划和验证清单。开发 Leader针对这些输入完成审核和任务分配后，Workflow 才进入 `DELIVERY_RUNNING` 执行实现、TDD、验证和代码评审。

### 5.2 `feat` 端到端流程

```text
创建 Requirement
  │
  ├─ 校验前端仓库
  ├─ 捕获 frontend/main Commit
  ├─ 创建前端任务分支
  └─ 创建 Requirement Sandbox
  │
Product SDD
  ├─ 澄清
  ├─ Product Spec
  ├─ Product Plan
  ├─ 真实页面与 Mock
  ├─ 构建、测试、运行和 Preview
  └─ Golden Candidate
  │
产品确认 → 产品 Leader确认
  │
开发 Leader审核
  ├─ 绑定后端仓库并创建后端任务分支
  ├─ 拆分 WorkItem
  ├─ 选择 Frontend Delivery Run 或 Frontend SDD
  └─ 分配人员或 Agent
  │
Backend SDD                 Frontend Delivery
  ├─ Technical Spec          ├─ 复用黄金需求代码
  ├─ API Contract            ├─ 绑定 API Contract
  ├─ Plan                    ├─ 生产化实现
  ├─ Implementation          └─ 构建与测试
  └─ Verification
             \              /
              前后端联调
                  │
                 测试
                  │
               产品验收
                  │
          前端 MR + 后端 MR
          ├─ 确定性检查
          ├─ AI Review 建议
          └─ 开发 Leader审批
                  │
             合并各自 main
                  │
             Jenkins 发布
```

### 5.3 Requirement 详情页

有数据权限的 Workspace 成员可以查看 Requirement 详情；能否执行创建、确认、分配、开发、验收和 MR 操作继续由 Capability 决定。

页面采用三栏结构：

```text
左侧：平台动态菜单
中间：Requirement Chat 与人工确认
右侧：结构化流程事实和研发 Artifact
```

中间 Chat 用于：

- 需求澄清和补充 Context；
- 展示 Agent 执行过程；
- 发起带明确参数的 Workflow Command；
- 展示等待人工确认、失败和重试；
- 关联 Spec、Plan、Diff、Test 和 Review，而不是复制其完整内容。

右侧至少展示：

- 当前阶段、负责人、阻塞原因和总体进度；
- Product Spec、Plan 和黄金需求版本；
- Repository、Branch 和 Commit Checkpoint；
- API Contract、Mock 和 Preview；
- 修改文件和 Diff；
- Test、Review、产品验收、MR 和 Jenkins 状态；
- 返修 Requirement 关系。

Chat 消息不是 Workflow 事实源。所有会改变状态的操作都必须转化为显式 Command，经后端校验 Capability、当前状态、目标 Artifact 版本和 Idempotency Key 后执行。右侧结构化数据来自领域实体和事件投影，刷新页面后必须可以完整恢复。

## 6. 聚合与领域实体

### 6.1 Requirement

`Requirement` 是业务聚合根，建议至少包含：

```text
id
key
workspaceId
projectId
type
workflowRoute
title
description
status
blockedReason
version
rootRequirementId
reworkOfRequirementId
reworkSequence
createdBy
createdAt
updatedAt
```

`type` 首期支持：

- `feat`
- `fix`
- `refactor`
- `chore`

`version` 用于乐观锁。所有改变 Requirement 状态的命令必须携带 `expectedVersion`。

### 6.2 RepositoryBranchBinding

一个 Requirement 至少有一个前端绑定，研发阶段增加后端绑定：

```text
id
requirementId
role                    // FRONTEND | BACKEND
repositoryId
defaultBranch           // 固定为 main
baseCommitSha
taskBranchName
taskBranchHeadSha
bindingStatus
createdAt
verifiedAt
```

关键约束：

- `(requirementId, role, repositoryId)` 唯一；
- 前端绑定必须在 Requirement 初始化时创建；
- `baseCommitSha` 创建后不可修改；
- 对 `feat`，同一前端绑定贯穿 Product SDD 与 Frontend Delivery；
- 对 `fix`、`refactor` 和 `chore`，同一绑定贯穿对应技术路由与后续交付；
- Sandbox 销毁或重建不改变 Branch Binding。

### 6.3 SDDSession

```text
id
requirementId
kind                    // PRODUCT | FRONTEND | BACKEND
status
inputBaselineId
currentAttemptId
startedAt
completedAt
```

普通前端不会创建 `FRONTEND` 类型完整 SDDSession，而是创建 `FRONTEND_DELIVERY` WorkItem 和简短 Delivery Plan。

`PRODUCT` SDDSession 仅适用于 `feat`。其他类型不得创建伪造的 Product SDD 完成记录。

### 6.4 DebugSession

`fix` 使用独立 Debug 会话记录 Superpowers `systematic-debugging` 结果：

```text
id
requirementId
status
reproductionArtifactId
rootCauseArtifactId
regressionTestArtifactId
verificationArtifactIds
currentAttemptId
startedAt
completedAt
```

完成 Guard 要求复现证据、根因、失败回归测试、修复后通过结果和验证证据齐备。

DebugSession 在 `DEV_REVIEW` 中先达到 `ROOT_CAUSE_READY`，要求复现证据和根因齐备；开发 Leader审核通过后，才进入实现、TDD 和验证。全部路由产物齐备后进入 `COMPLETED`。因此，开发 Leader审核不会被错误地建模为已经完成整个修复。

### 6.5 ArtifactVersion

所有关键产物均不可覆盖更新：

```text
id
requirementId
workItemId
artifactType
version
contentHash
storageUri
sourceCommitSha
schemaVersion
createdBy
createdAt
```

主要 `artifactType`：

- `CLARIFICATION`
- `PRODUCT_SPEC`
- `PRODUCT_PLAN`
- `ACCEPTANCE_CRITERIA`
- `PAGE_MANIFEST`
- `MOCK_CONTRACT`
- `PREVIEW_MANIFEST`
- `TECHNICAL_SPEC`
- `DELIVERY_PLAN`
- `API_CONTRACT`
- `TEST_REPORT`
- `AI_REVIEW`
- `RELEASE_STATUS`
- `DEBUG_REPRODUCTION`
- `DEBUG_ROOT_CAUSE`
- `REGRESSION_TEST`
- `RUNTIME_MANIFEST`

### 6.6 GoldenRequirementVersion

黄金需求只适用于 `feat`，是对一组版本化 Artifact 的封装：

```text
id
requirementId
version
candidateCommitSha
bundleHash
productSpecArtifactId
productPlanArtifactId
acceptanceCriteriaArtifactId
pageManifestArtifactId
mockContractArtifactId
previewManifestArtifactId
verificationArtifactIds
status
confirmedAt
```

`bundleHash` 必须覆盖所有构成黄金需求的 Artifact 标识、内容 Hash 和候选 Commit。

### 6.7 Approval

```text
id
requirementId
approvalType
subjectType
subjectId
subjectVersion
subjectHash
actorId
decision
comment
status
createdAt
invalidatedAt
invalidationReason
```

`approvalType` 至少包括：

- `PRODUCT_GOLDEN_CONFIRMATION`
- `PRODUCT_LEADER_GOLDEN_CONFIRMATION`
- `DEV_LEADER_REQUIREMENT_REVIEW`
- `PRODUCT_ACCEPTANCE`
- `DEV_LEADER_MR_APPROVAL`

### 6.8 WorkItem

```text
id
requirementId
type
deliveryMode
status
repositoryBranchBindingId
assigneeType
assigneeId
requiredCapabilityIds
inputBaselineId
outputBaselineId
createdAt
completedAt
```

主要类型：

- `DEBUG_FIX`
- `TECHNICAL_FAST`
- `BACKEND_SDD`
- `FRONTEND_DELIVERY`
- `FRONTEND_SDD`
- `INTEGRATION`
- `TEST`
- `MR_DELIVERY`

### 6.9 APIContractVersion

```text
id
requirementId
backendWorkItemId
version
format
schemaVersion
contentHash
artifactId
compatibility
status
publishedAt
```

`format` 可为 `OPENAPI`、`ASYNCAPI`、`JSON_SCHEMA` 或 `PROTOBUF`。已发布版本不可原地修改。

### 6.10 StageBaseline

`StageBaseline` 固定某阶段所有输入：

```text
id
requirementId
stage
frontendCommitSha
backendCommitSha
goldenRequirementVersion
debugEvidenceVersion
apiContractVersion
mockContractVersion
sandboxTemplateVersion
executionBindingIds
createdAt
```

测试、产品验收和 MR 创建只能针对明确的 Stage Baseline。

### 6.11 其他实体

- `SandboxBinding`：Requirement 与逻辑 Sandbox 的绑定；
- `RunAttempt`：一次隔离执行及结果；
- `VerificationRun`：构建、单测、Contract、联调或 E2E 结果；
- `AcceptanceRecord`：产品对固定 Stage Baseline 的验收结论；
- `RequirementRelation`：`REWORK_OF`、`SUPERSEDES` 等关系；
- `MergeRequestBinding`：WorkItem、Repository、Branch、MR 和 head SHA 的绑定；
- `WorkflowTransition`：状态转换的追加式记录；
- `DomainEvent`：Outbox 中待发布的领域事件。

## 7. 状态模型

### 7.1 Requirement 主状态机

```text
DRAFT
  → INITIALIZING
  → READY
  ├─ feat → PRODUCT_SDD_RUNNING → GOLDEN_REVIEW → GOLDEN_CONFIRMED
  └─ fix / refactor / chore ────────────────────────────┐
                                                       ▼
  → DEV_REVIEW
  → DELIVERY_RUNNING
  → INTEGRATION_RUNNING
  → TESTING
  ├─ 需要产品验收 → PRODUCT_ACCEPTANCE
  └─ 无产品行为变化 ─────────────────┐
                                    ▼
  → MR_RUNNING
  → MERGING
  → MERGED
  → RELEASE_TRACKING
  → COMPLETED
```

终止或替代状态：

```text
CANCELED
INITIALIZATION_FAILED
REWORK_REQUIRED
SUPERSEDED_BY_REWORK
MERGE_PARTIALLY_COMPLETED
```

`BLOCKED` 不作为主状态，而是通过 `blockedReason` 和 `blockingRefs` 叠加表达，以避免主状态机因外部等待产生大量回退边。

| 当前状态 | 进入条件 | 允许的下一状态 |
| --- | --- | --- |
| `DRAFT` | Requirement ID 已保留 | `INITIALIZING`、`CANCELED` |
| `INITIALIZING` | 前端仓库校验开始 | `READY`、`INITIALIZATION_FAILED` |
| `READY` | 任务分支已创建并验证，Sandbox 可调度 | `feat` → `PRODUCT_SDD_RUNNING`；其他类型 → `DEV_REVIEW`；或 `CANCELED` |
| `PRODUCT_SDD_RUNNING` | Product SDDSession 已开始 | `GOLDEN_REVIEW`、`CANCELED` |
| `GOLDEN_REVIEW` | Golden Candidate 可运行且校验通过 | `GOLDEN_CONFIRMED`、`PRODUCT_SDD_RUNNING` |
| `GOLDEN_CONFIRMED` | 产品和产品 Leader均已确认同一版本 | `DEV_REVIEW` |
| `DEV_REVIEW` | `feat` 已完成黄金确认；其他类型已固定技术路由并可开始准备审核输入 | 当前 Route Baseline 齐备且开发 Leader审核通过后进入 `DELIVERY_RUNNING`；或进入 `REWORK_REQUIRED` |
| `DELIVERY_RUNNING` | WorkItem 已分配 | 需要跨端联调 → `INTEGRATION_RUNNING`；否则 → `TESTING`；或 `REWORK_REQUIRED` |
| `INTEGRATION_RUNNING` | 前后端交付产物齐备 | `TESTING`、`REWORK_REQUIRED` |
| `TESTING` | Integration Baseline 已固定 | 需要产品验收 → `PRODUCT_ACCEPTANCE`；无产品行为变化 → `MR_RUNNING`；或 `REWORK_REQUIRED` |
| `PRODUCT_ACCEPTANCE` | 所有必需测试通过 | `MR_RUNNING`、`REWORK_REQUIRED` |
| `MR_RUNNING` | 当前路由要求的测试、必要产品验收及其他 Gate 已通过，实际需要的 MR 已创建 | `MERGING`、`REWORK_REQUIRED` |
| `MERGING` | 确定性门禁通过且开发 Leader审批 | `MERGED`、`MERGE_PARTIALLY_COMPLETED` |
| `MERGED` | 前后端 MR 均已合并各自 `main` | `RELEASE_TRACKING` |
| `RELEASE_TRACKING` | Jenkins 已接管发布 | `COMPLETED` |
| `REWORK_REQUIRED` | 正式驳回，原流程冻结 | `SUPERSEDED_BY_REWORK` |

### 7.2 Product SDD 子状态机

该子状态机只适用于 `feat`。其他 Requirement 类型保持 `NOT_APPLICABLE`，不得伪造完成记录。

```text
NOT_STARTED
  → CLARIFYING
  → PRODUCT_SPEC_DRAFTING
  → PRODUCT_PLAN_DRAFTING
  → PAGE_AND_MOCK_BUILDING
  → VERIFYING
  → PREVIEW_READY
  → GOLDEN_CANDIDATE_SUBMITTED
  → PRODUCT_CONFIRMED
  → PRODUCT_LEADER_CONFIRMED
  → COMPLETED
```

产品或产品 Leader提出修改时，子状态进入 `CHANGES_REQUESTED`，随后根据修改影响回到：

- `CLARIFYING`
- `PRODUCT_SPEC_DRAFTING`
- `PRODUCT_PLAN_DRAFTING`
- `PAGE_AND_MOCK_BUILDING`

任何 Artifact 改动都会产生新 Golden Candidate 版本，旧审批不得迁移。

### 7.3 WorkItem 状态机

```text
CREATED
  → ASSIGNED
  → PREPARING
  → RUNNING
  → SELF_VERIFYING
  → READY_FOR_INTEGRATION
  → COMPLETED
```

执行异常可进入：

- `RETRYABLE_FAILED`
- `BLOCKED`
- `CANCELED`

`RETRYABLE_FAILED` 只能通过创建新的 Run Attempt 恢复，不能覆盖失败 Attempt。

### 7.4 API Contract 状态机

```text
DRAFT
  → VALIDATING
  → VALIDATED
  → PUBLISHED
  → IMPLEMENTED
  → INTEGRATION_VERIFIED
```

失败状态：

- `INVALID`
- `INCOMPATIBLE`
- `SUPERSEDED`

已处于 `PUBLISHED` 的 Contract 发生变化时，创建新版本并将旧版本标记为 `SUPERSEDED`；不允许回写旧内容。

### 7.5 Sandbox Run 状态机

```text
REQUESTED
  → PROVISIONING
  → READY
  → RUNNING
  → SUCCEEDED | FAILED | TIMED_OUT | CANCELED
  → ARTIFACTS_SEALED
  → DESTROYED
```

Sandbox 失败不直接改变业务阶段结论。Orchestrator 根据失败分类决定创建新 Attempt、标记阶段阻塞或发起人工处理。

### 7.6 MR 状态机

```text
NOT_CREATED
  → DRAFT
  → READY
  → CHECKING
  → AI_REVIEWED | AI_REVIEW_UNAVAILABLE
  → LEADER_REVIEW
  → CHANGES_REQUESTED | APPROVED
  → MERGED | CLOSED
```

AI Review 的 `AI_REVIEW_UNAVAILABLE` 不阻止进入 `LEADER_REVIEW`。编译、测试、安全和凭据扫描等确定性 Policy 可以阻塞。

## 8. Requirement 创建与前端分支 Saga

### 8.1 创建命令

`CreateRequirement` 至少包含：

```text
workspaceId
projectId
type
title
description
frontendRepositoryId
createdBy
idempotencyKey
```

`frontendRepositoryId` 缺失时命令必须在任何外部写操作发生前失败。

### 8.2 Saga 步骤

```text
1. 校验创建者 Capability 和 Workspace Scope
2. 校验前端仓库已加入 Workspace Allowlist
3. 根据 `type` 固定 `workflowRoute`，生成 Requirement ID、Requirement Key 和分支名
4. 持久化 DRAFT Requirement 与 Outbox
5. 将 Requirement 置为 INITIALIZING
6. 通过 Source Control Adapter 读取 frontend/main 当前 Commit SHA
7. 保存不可变 baseCommitSha
8. 从该 SHA 创建前端任务分支
9. 重新读取远端分支，验证其 head SHA 等于 baseCommitSha
10. 保存 RepositoryBranchBinding
11. 请求创建 Requirement 逻辑 Sandbox
12. Sandbox Checkout 同一前端任务分支
13. 将 Requirement 置为 READY
14. 发出 RequirementReady
```

推荐分支格式：

```text
feat/REQ-20260731-001
fix/REQ-20260731-002
refactor/REQ-20260731-003
chore/REQ-20260731-004
```

### 8.3 幂等与补偿

- `CreateRequirement` 以 `workspaceId + idempotencyKey` 唯一；
- 相同幂等键重试必须返回同一 Requirement，不得创建第二条分支；
- 创建分支前先查询目标分支；
- 若目标分支存在且已绑定同一 Requirement，并指向预期 SHA，视为成功；
- 若目标分支存在但未绑定当前 Requirement，进入 `INITIALIZATION_FAILED`，不得覆盖；
- GitLab 成功但数据库确认失败时，通过 Reconciler 查询远端分支并补齐绑定；
- 数据库已保存绑定但 GitLab 不存在分支时，状态进入 `INITIALIZATION_FAILED`，重新创建时仍使用原 `baseCommitSha`；
- Sandbox 创建失败时保留已创建分支和绑定，吊销临时凭据；重试只创建新 Sandbox Attempt；
- 不自动删除无法确认归属的远端分支。

### 8.4 同一前端分支规则

从 `READY` 到最终 MR，前端只能使用初始化阶段创建的 `taskBranchName`：

- 对 `feat`，Product Agent 将页面和 Mock 提交到该分支；
- 对 `feat`，黄金需求 Commit 必须属于该分支，Frontend Delivery 从该 Commit 继续提交；
- 对 `fix`、`refactor` 和 `chore`，Debug 或技术快速路由与后续交付持续使用该分支；
- Sandbox 重建时重新 Checkout 该分支；
- 平台不为任何后续阶段新建替代前端分支；
- 不允许 Agent force push 或改写已经被阶段基线引用的历史；
- 最终前端 MR 的 source branch 必须是该分支。

平台至少记录：

```text
baseCommitSha
goldenCandidateCommitSha       // 仅 feat
goldenRequirementCommitSha     // 仅 feat
frontendCompletedCommitSha
integratedFrontendCommitSha
acceptedFrontendCommitSha      // 当前路由要求产品验收时
frontendMrHeadSha
```

## 9. 阶段输入、输出与 Guard

| 阶段 | 必需输入 | 必需输出 | 完成 Guard |
| --- | --- | --- | --- |
| Requirement 初始化 | Workspace、Project、类型、前端仓库、需求描述 | Requirement、前端 Branch Binding、Sandbox Binding | 分支存在且指向记录的 `baseCommitSha` |
| `feat` Product Clarification | 原始需求、仓库上下文 | Clarification Artifact | 未解决问题为零，或明确记录为产品接受的假设 |
| `feat` Product Spec | Clarification | Product Spec、验收标准 | Schema 完整，行为、边界和异常场景可验证 |
| `feat` Product Plan | Product Spec、真实仓库、组件规范 | Product Plan | 路由、页面、组件、Mock 和验证步骤已映射到仓库 |
| `feat` 页面与 Mock | Product Plan、前端任务分支 | 页面代码、Mock Contract、Mock 数据 | 产物已提交到同一前端任务分支 |
| `feat` Product 验证 | 页面、Mock、仓库脚本 | 构建报告、测试报告、Preview | 安装、构建、必要测试、启动和健康检查通过 |
| `feat` 黄金需求确认 | Golden Candidate | 两个人工 Approval、GoldenRequirementVersion | 产品和产品 Leader确认同一 `bundleHash` |
| `fix` Debug | 缺陷描述、仓库与运行证据 | 复现证据、根因、回归测试、验证结果 | `systematic-debugging` 路由产物完整，失败测试修复后通过 |
| `refactor` / `chore` 技术准备 | 影响范围、仓库上下文 | 技术计划、风险和验证清单 | 未发现未声明的产品行为变化 |
| 开发 Leader审核 | 当前路由 Baseline | WorkItem、后端绑定、模式决策、分配 | 所有必需 WorkItem 已分配且 Capability 满足 |
| Backend SDD | 当前路由 Baseline、后端仓库 | Technical Spec、Plan、API Contract、后端代码、测试 | Contract 已发布，实现和测试通过 |
| Frontend Delivery | 当前路由 Baseline、API Contract | 前端生产代码、Delivery Plan、测试 | 使用原前端分支，构建和测试通过 |
| 联调 | 前端 SHA、后端 SHA、Contract 版本 | Integration Baseline、联调报告 | Contract 校验和必需联调用例通过 |
| 测试 | Integration Baseline | Test Report | 所有阻塞级用例通过 |
| 产品验收 | 路由要求验收且测试通过的固定 Baseline | AcceptanceRecord | 产品对准确版本给出 `APPROVED` |
| MR | 已满足当前路由全部 Gate 的 Baseline | 前端 MR、后端 MR、Review、Leader Approval | 所有实际存在的 MR 均满足门禁并获 Leader审批 |
| 合并 | 已批准 MR | 两个 `main` Commit | GitLab 确认两个 MR 均已合并 |
| 发布跟踪 | `main` Commit | Jenkins Run 和发布状态 | Jenkins 返回终态并已关联 Requirement |

## 10. Product SDD 详细流程

本节仅适用于 `feat`。`fix`、`refactor` 和 `chore` 按第 5.1 节路由，不创建 Product SDD 或 Golden Requirement 完成记录。

### 10.1 仓库上下文采集

Product Agent 开始前必须读取固定版本的：

- 前端 `RepositoryBranchBinding`；
- 路由、页面和组件目录；
- Package Manager 和可用脚本；
- UI 组件规范、主题 Token 和样式约束；
- 测试框架和 Mock 约定；
- Workspace 与 Repository Policy。

上下文必须记录来源 Commit 和内容 Hash。不得使用无法定位版本的组件规范生成黄金需求。

### 10.2 需求澄清

Clarification 至少覆盖：

- 用户和业务目标；
- 正常流程、异常流程和空状态；
- 页面入口、退出和导航；
- 字段、校验、权限和可见性；
- 加载、成功、失败和重试反馈；
- 数据来源和 Mock 边界；
- 响应式、可访问性和兼容范围；
- 可观察的产品验收标准。

Agent 可以提出问题和建议，但不能自行把未确认的高影响假设标记为产品决策。

### 10.3 Product Spec 与 Plan

Product Spec 描述“产品必须表现为什么”；Product Plan 描述“如何在当前前端仓库形成可验证页面”。二者必须分离版本。

Product Plan 至少包含：

- 涉及的路由和页面；
- 复用与新增组件；
- 状态和数据流；
- Mock Endpoint、响应和错误场景；
- 预期修改文件；
- 构建、测试、启动和 Preview 步骤；
- 与验收标准的逐项映射。

### 10.4 页面与 Mock

页面和 Mock 必须满足：

- 基于真实任务分支，而不是独立原型工程；
- 使用仓库现有组件和主题规范；
- 覆盖 Product Spec 中的主要状态；
- Mock API 具有机器可读 Schema；
- Mock 数据不得包含真实敏感信息；
- 页面可以通过仓库标准命令运行；
- 所有变更提交到同一前端任务分支。

### 10.5 验证与 Preview

至少执行：

1. 依赖解析；
2. 静态检查；
3. TypeScript 或对应语言类型检查；
4. 构建；
5. Product SDD 新增测试；
6. 启动与健康检查；
7. 关键页面访问；
8. Mock 正常、空数据和错误场景；
9. Preview 发布和权限校验。

只有验证成功并生成不可变 Preview Manifest，才允许提交 Golden Candidate。

### 10.6 黄金需求确认

确认顺序：

```text
Golden Candidate
→ 产品确认
→ 产品 Leader确认
→ Golden Requirement 固化
```

两个 Approval 必须引用相同：

- `goldenRequirementVersion`
- `candidateCommitSha`
- `bundleHash`
- `previewManifestArtifactId`

任何一个值不同都不能合并为一次有效确认。

## 11. 版本与审批失效

### 11.1 基本原则

- Approval 只对明确 Subject、Version、Hash 和 Commit 生效；
- Approval 不是 Requirement 的永久布尔字段；
- 产物变化创建新版本，不覆盖已审批版本；
- 状态机推进时重新计算有效审批，不信任缓存值；
- 失效记录保留原决策、失效时间和原因。

### 11.2 失效矩阵

| 变化 | 自动失效内容 |
| --- | --- |
| `feat` Product Spec、Product Plan、验收标准、页面行为、Mock 或 Golden Candidate Commit 变化 | 产品确认、产品 Leader确认 |
| `feat` 黄金需求版本变化 | 开发 Leader Requirement Review、既有任务拆分和模式决策需重新确认 |
| 前端仓库或任务分支变化 | 当前 Requirement 初始化之后的全部阶段结论 |
| 后端仓库或任务分支变化 | Backend SDD、Contract、联调、测试和验收结论 |
| 已发布 API Contract 变化 | 前端 Contract 绑定、联调、测试和产品验收 |
| `frontendCompletedCommitSha` 或 `backendCompletedCommitSha` 变化 | 联调、测试和产品验收 |
| 测试 Baseline 任一版本变化 | Test Report 和产品验收 |
| 产品验收后任一代码 Commit 或 Contract 变化 | 产品验收、MR 创建资格 |
| MR head SHA 变化 | 该 MR 的确定性检查、AI Review 结果时效标记和开发 Leader审批 |

### 11.3 Frontend Delivery 的允许变化

本节只适用于 `feat`。其 Frontend Delivery 在黄金需求 Commit 之后继续修改同一分支。以下生产化变化不会自动修改已固化的 Golden RequirementVersion：

- 将 Mock Adapter 替换为符合已绑定 API Contract 的真实请求；
- 补充错误处理、日志、类型、测试和性能优化；
- 不改变 Product Spec 的内部重构。

如果 Delivery 改变可观察产品行为、验收标准、页面结构语义或 Mock Contract，必须：

1. 停止当前 Delivery；
2. 生成新的 Product SDD Artifact 版本；
3. 重新生成 Golden Candidate；
4. 重新获得产品和产品 Leader确认；
5. 由开发 Leader重新审核受影响任务。

## 12. 开发 Leader审核与分配

开发 Leader只能审核已满足当前路由前置 Guard 的 Requirement：`feat` 必须为 `GOLDEN_CONFIRMED`；`fix` 必须具备复现证据和根因；`refactor` / `chore` 必须具备影响范围和验证清单。

审核内容：

- 当前路由 Baseline 是否完整、可实现；
- 前端与后端影响范围；
- 后端仓库选择；
- WorkItem 拆分和依赖；
- API Contract 交付顺序；
- Frontend Delivery 模式；
- 人员或 Agent Capability；
- 风险、测试范围和 MR 合并计划。

### 12.1 后端分支

开发 Leader选择后端仓库后，平台从该仓库 `main` 当前 Commit 创建后端任务分支，分支后缀与 Requirement Key 保持一致。后端 Branch Binding 使用独立的 `baseCommitSha`，不得假设前后端仓库 Commit 一致。

后端分支创建失败时 Requirement 保持 `DEV_REVIEW` 并设置 `blockedReason=BACKEND_BRANCH_CREATION_FAILED`，不得启动 Backend SDD。

### 12.2 分配 Guard

进入 `DELIVERY_RUNNING` 前必须满足：

- 开发 Leader Approval 有效；
- 前端和后端 Branch Binding 已验证；
- Backend SDD WorkItem 已分配；
- Frontend Delivery 或 Frontend SDD WorkItem 已分配；
- 每个执行者具备所需 Capability 和 Scope；
- Requirement Sandbox 可以挂载两个任务分支；
- 依赖图无环；
- 交付模式已经记录。

## 13. Backend SDD 与 API Contract

Backend SDD 执行：

```text
技术澄清
→ Technical Spec
→ API Contract Draft
→ Contract 校验
→ Backend Plan
→ 实现
→ 单元与集成测试
→ Contract 实现一致性校验
→ Ready for Integration
```

### 13.1 API Contract 最小内容

- Endpoint、Method 或消息 Topic；
- 请求参数、Header、Body 和约束；
- 正常响应、错误响应和错误码；
- 认证与授权要求；
- 分页、排序和筛选约定；
- 幂等和重试语义；
- 日期、时区、枚举和空值语义；
- 示例；
- 兼容性级别；
- Contract 版本和 Schema 版本。

### 13.2 发布 Guard

API Contract 进入 `PUBLISHED` 前必须：

- 通过对应格式的 Schema 校验；
- 无未解析引用；
- 示例符合 Schema；
- 错误结构完整；
- 与前一已发布版本完成兼容性比较；
- 内容已保存为不可变 Artifact；
- 已关联 Backend SDD WorkItem 和 Requirement。

`feat` Frontend Delivery 可以在 Contract 发布前继续使用黄金需求 Mock；其他类型只能使用当前路由中明确绑定的 Mock 或测试替身。任何类型在 Contract 发布前都不得宣称真实接口联调完成。

### 13.3 Contract 与 Mock

平台必须生成或执行 Contract-Mock 差异检查：

- 字段名、类型和必填性；
- 状态码与错误码；
- 枚举和空值；
- 分页结构；
- 示例数据；
- 前端依赖的所有 Endpoint。

存在阻塞差异时，必须修订当前路由受控 Artifact 或 API Contract，并按失效矩阵重新取得对应结论；只有 `feat` 回到 Product SDD。

## 14. Frontend Delivery

### 14.1 普通 Frontend Delivery Run

Frontend Delivery 使用当前 Requirement 类型的 Route Baseline：

```text
加载 Route Baseline
  ├─ feat: Golden Requirement
  ├─ fix: Debug Evidence
  └─ refactor/chore: Technical Plan
→ Checkout 原前端任务分支
→ 加载 API Contract
→ 生成简短 Delivery Plan
→ 接入真实 API
→ 补充生产逻辑
→ 构建与测试
→ Ready for Integration
```

`feat` 的简短 Delivery Plan 只描述交付动作，不重复：

- 产品背景；
- 用户故事；
- Product Spec；
- 已确认交互；
- 已确认验收标准。

### 14.2 复杂前端 Full SDD

满足以下任一条件时升级为 Frontend SDD：

- 跨多个前端仓库或多个端；
- 新增或变更公共组件、公共 SDK；
- 架构级路由、权限、状态管理或数据层改动；
- 大规模迁移或需要兼容多套运行时；
- Product SDD 页面无法直接演进为生产实现；
- 开发 Leader基于风险明确要求升级。

升级后执行：

```text
技术澄清
→ Frontend Technical Spec
→ Frontend Plan
→ 实现
→ 单元、组件和 E2E 测试
→ Ready for Integration
```

Frontend SDD 继续使用原前端任务分支，不重新创建分支。对 `feat`，它不重复已经完成的产品黄金需求确认；若技术设计导致产品行为变化，则按第 11 节回到 Product SDD。对 `fix`、`refactor` 或 `chore`，若发现产品行为变化，必须停止当前路由并创建或升级为 `feat`，不得直接伪造 Product SDD 前置结论。

### 14.3 模式升级记录

`FRONTEND_DELIVERY_RUN → FRONTEND_FULL_SDD` 只能由开发 Leader确认，记录：

- 原模式；
- 新模式；
- 触发规则；
- 影响范围；
- 决策人；
- 决策时间；
- 保留的输入和 Artifact；
- 需要失效或重新执行的阶段。

不允许从 Full SDD 自动降级回普通 Delivery Run。

## 15. 远程 Sandbox 执行约束

一个 Requirement 对应一个逻辑 Sandbox，底层可以由多个隔离容器或 Pod 组成：

```text
Requirement Sandbox
├── frontend workspace
├── backend workspace
├── Mock service
├── frontend preview
├── backend service
├── integration runner
└── Agent runtime
```

### 15.1 每次 Run 的固定输入

- Requirement ID 和当前版本；
- WorkItem ID；
- Stage Baseline；
- Repository、Branch 和 Commit；
- Golden RequirementVersion；
- API ContractVersion；
- Sandbox TemplateVersion；
- Execution Binding；
- Runtime Policy；
- 有效期内短期凭据。

### 15.2 标准输出清单

每次 Run Attempt 必须返回 Manifest：

```json
{
  "requirementId": "req_xxx",
  "workItemId": "wi_xxx",
  "stage": "FRONTEND_DELIVERY",
  "attempt": 2,
  "result": "SUCCEEDED",
  "inputBaselineId": "baseline_xxx",
  "sourceCommits": {
    "frontend": "sha",
    "backend": "sha"
  },
  "artifacts": [],
  "verifications": [],
  "executionBindingId": "binding_xxx",
  "startedAt": "RFC3339",
  "completedAt": "RFC3339"
}
```

Orchestrator 必须验证 Manifest、GitLab Commit 和 Artifact Store 事实，不能仅凭 Agent 文本回复推进状态。

### 15.3 重试规则

- 失败重试创建新的 `RunAttempt`；
- 新 Attempt 使用新的短期凭据；
- 不复用无法确认清洁状态的 Sandbox 实例；
- 重试必须引用原 Attempt；
- Model、Runtime Bundle 或 Skill fallback 产生新的 Execution Binding；
- 旧日志和失败 Artifact 保留；
- 达到重试上限后进入 `BLOCKED`，等待有权限人员处理。

## 16. 联调、测试与产品验收

### 16.1 Integration Baseline

进入联调前固定：

- `goldenRequirementVersion`（仅 `feat`）
- `debugEvidenceVersion`（仅 `fix`）
- `frontendCompletedCommitSha`
- `backendCompletedCommitSha`
- `apiContractVersion`
- `mockContractVersion`
- Sandbox TemplateVersion

联调至少验证：

- 前端请求与 API Contract 一致；
- 后端实现与 API Contract 一致；
- 正常、空数据、权限不足、业务错误和系统错误；
- Loading、重试和超时；
- 核心业务链路；
- 前后端日志中的 Correlation ID。

### 16.2 测试

测试报告必须引用准确 Integration Baseline，并区分：

- Build 和静态检查；
- 前端单元、组件与 E2E；
- 后端单元与集成；
- Contract 测试；
- 前后端联调；
- 安全和凭据确定性检查；
- 回归测试。

任何代码 Commit、Contract 或关键配置变化后，旧 Test Report 自动失效。

### 16.3 产品验收

`feat` 必须执行产品验收；`fix` 根据影响范围和 Workspace Policy 决定是否要求产品验收；确认无产品行为变化的 `refactor` / `chore` 可以跳过产品验收。跳过必须由路由 Guard 产生明确的 `NOT_REQUIRED` 记录，不能伪造 `APPROVED`。

产品验收输入：

- 有效 Test Report；
- 固定前端和后端 Commit；
- 固定 API Contract；
- `feat` 的 Golden Requirement 验收清单，或 `fix` 的缺陷复现与回归清单；
- 受权限保护的 Preview；
- 已知限制。

产品只能对完整 Baseline 作出：

- `APPROVED`
- `REJECTED`

`APPROVED_WITHOUT_EVIDENCE` 不是合法状态。产品验收后再产生代码或 Contract 变化时，验收自动失效。

## 17. 返修 Requirement

### 17.1 返修触发

以下正式结论触发返修：

- 测试阶段正式拒绝交付；
- 产品验收为 `REJECTED`；
- MR 阶段确认需要改变产品或研发交付；
- 合并或发布后发现需要修复的问题。

执行阶段内部可自动修复的编译错误、测试失败和临时网络失败属于同一 Run 的失败尝试，不单独创建返修 Requirement。只有已经形成正式交付或人工拒绝结论的问题才进入返修流程。

### 17.2 新建规则

返修不得重新打开或覆盖原 Requirement。平台执行：

```text
1. 冻结原 Requirement 当前 Baseline 和失败证据
2. 将原 Requirement 标记为 REWORK_REQUIRED
3. 创建新的 RequirementRelation(REWORK_OF)
4. 创建新 Requirement
5. 重新选择并确认前端仓库
6. 根据新 Requirement 类型从该仓库当前 main 创建对应任务分支
7. 按 feat / fix / refactor / chore 重新选择 SDD、Debug 或技术快速路由并执行其必要 Gate
8. 新 Requirement 开始执行后，将原 Requirement 标记为 SUPERSEDED_BY_REWORK
```

返修类型由问题性质决定：产品行为新增或变化使用 `feat`，缺陷修复使用 `fix`，无行为变化的结构调整使用 `refactor`，工程维护使用 `chore`。不得因为来源是验收拒绝就统一重新执行完整 Product SDD。

新 Requirement 可只读引用原 Requirement 的：

- 问题描述；
- 失败测试；
- 产品反馈；
- 旧 Golden Requirement；
- 旧 Commit、Contract、MR 和发布记录。

不得继承：

- 人工 Approval；
- Test Report 结论；
- 产品验收；
- MR 审批；
- 阶段完成状态。

### 17.3 关系与展示

```text
rootRequirementId
reworkOfRequirementId
reworkSequence
relationReason
sourceStage
sourceBaselineId
```

平台按 `rootRequirementId` 展示完整返修链，并以最新未取消 Requirement 的状态作为需求族当前状态。

若原 Requirement 存在未合并 MR，平台必须阻止其继续合并并标记为已被返修替代；是否关闭 GitLab MR 由有权限人员确认后执行。已合并代码不得通过改写历史撤销，新返修从当前 `main` 继续处理。

## 18. MR、合并与 Jenkins

### 18.1 MR 创建 Guard

只有满足以下条件才能创建前端和后端 MR：

- Requirement 状态为 `MR_RUNNING`；
- Product Acceptance 有效；
- 前端 source branch 是初始化时创建的同一任务分支；
- 后端 source branch 是开发 Leader审核时绑定的任务分支；
- 两个 target branch 均为各自仓库的 `main`；
- MR head SHA 与 Accepted Baseline 一致；
- API Contract 已 `INTEGRATION_VERIFIED`；
- 无未处理的阻塞级确定性检查；
- Requirement 未被 Rework 替代。

### 18.2 Review 与审批

每个 MR 执行：

```text
确定性检查
→ AI Review
→ 开发 Leader审批
→ 合并 main
```

AI Review 规则：

- 默认只产生风险、定位和修改建议；
- `AI_REVIEW_UNAVAILABLE` 不阻塞开发 Leader审批；
- 不得把 AI 的严重度标签直接映射为人工审批；
- 安全扫描、Secret 扫描、编译和测试等确定性结果由独立 Policy 决定是否阻塞；
- 新 MR Commit 使 AI Review 标记为过期，并按 Policy 重新执行。

开发 Leader审批规则：

- 分别审批前端和后端 MR；
- Approval 绑定准确 `mrHeadSha`；
- MR head 变化后旧 Approval 自动失效；
- Agent 不得代表开发 Leader审批或合并；
- 合并通过 GitLab 受保护分支规则执行。

### 18.3 两仓库合并

平台记录 `MergePlan`，包含前后端 MR、建议顺序、兼容性说明和回滚责任人。两个 MR 分别合并，不伪装成跨仓库原子事务。

若第一个 MR 已合并、第二个失败：

- Requirement 进入 `MERGE_PARTIALLY_COMPLETED`；
- 停止自动继续；
- 保存已合并 `main` Commit；
- 由开发 Leader根据兼容性选择重试剩余 MR、回滚已合并代码或创建 Rework Requirement；
- 所有选择必须记录原因和审批人。

### 18.4 Jenkins 边界

```text
GitLab 确认 MR 合并 main
→ GitLab/Jenkins 触发发布
→ 平台关联 Jenkins Run
→ 平台只读同步构建和发布状态
```

- Jenkins 不执行 Product SDD、分支开发或 MR 前验证；
- Jenkins 失败不回写或改写 Git 历史；
- 重试和回滚由 Jenkins 发布机制执行；
- 平台只展示、关联并审计发布结果；
- Requirement 是否进入 `COMPLETED` 依据 Workspace 发布 Policy 和 Jenkins 终态判断。

## 19. 命令契约

建议首批领域命令：

| 命令 | 执行者 | 关键 Guard |
| --- | --- | --- |
| `CreateRequirement` | 有创建 Capability 的成员 | 前端仓库必填且已授权 |
| `RetryRequirementInitialization` | 创建者或平台运维 | 状态为 `INITIALIZATION_FAILED` |
| `StartProductSdd` | Orchestrator | 类型为 `feat`，分支和 Sandbox 已验证 |
| `StartDebugRoute` | Orchestrator | 类型为 `fix`，已固定 `systematic-debugging` 路由 |
| `StartTechnicalFastRoute` | Orchestrator | 类型为 `refactor` 或 `chore`，影响范围已记录 |
| `SubmitGoldenCandidate` | Product Agent | 类型为 `feat`，页面、Mock、验证和 Preview 齐备 |
| `ConfirmGoldenAsProduct` | 产品 | 类型为 `feat`，Candidate 版本未变化 |
| `ConfirmGoldenAsProductLeader` | 产品 Leader | 类型为 `feat`，产品已确认同一版本 |
| `ReviewAndAssignRequirement` | 开发 Leader | `feat` 的 Golden Approval 有效，或技术路由输入与影响范围有效 |
| `PublishApiContract` | Backend Agent/开发人员 | Schema 和兼容性校验通过 |
| `CompleteBackendDelivery` | 后端执行者 | Contract、实现、测试齐备 |
| `CompleteFrontendDelivery` | 前端执行者 | 使用原分支且构建测试通过 |
| `SubmitIntegrationResult` | Integration WorkItem 执行者 | Baseline 未变化 |
| `SubmitTestResult` | 测试人员或 Test Agent | 测试引用固定 Baseline |
| `AcceptProductDelivery` | 产品 | 当前路由要求产品验收且 Test Report 有效 |
| `RejectAndCreateRework` | 有拒绝 Capability 的参与者 | 已形成正式拒绝结论 |
| `CreateMergeRequests` | Orchestrator | 当前路由要求的测试、验证、代码评审和可选产品验收均有效 |
| `RecordAiReview` | Code Review Agent | 绑定当前 MR head SHA |
| `ApproveMergeRequest` | 开发 Leader | 确定性门禁通过 |
| `RecordMergeResult` | GitLab Webhook Consumer | 外部事件已验签和去重 |
| `RecordReleaseStatus` | Jenkins Adapter | 关联已合并 main Commit |

每个写命令必须包含：

```text
commandId
idempotencyKey
correlationId
actor
expectedRequirementVersion
occurredAt
```

## 20. 领域事件

### 20.1 事件 Envelope

```json
{
  "eventId": "evt_xxx",
  "eventType": "GoldenRequirementConfirmed",
  "eventVersion": 1,
  "aggregateType": "Requirement",
  "aggregateId": "req_xxx",
  "aggregateVersion": 12,
  "workspaceId": "ws_xxx",
  "projectId": "project_xxx",
  "correlationId": "corr_xxx",
  "causationId": "cmd_xxx",
  "actor": {},
  "occurredAt": "RFC3339",
  "payload": {}
}
```

事件消费者必须按 `eventId` 幂等，并能容忍重复和乱序事件。

### 20.2 核心事件

| 事件 | 主要消费者 |
| --- | --- |
| `RequirementCreated` | Branch Saga、审计、通知 |
| `RequirementRouteSelected` | Workflow Orchestrator、审计 |
| `FrontendBranchCreated` | Sandbox Provisioner、状态投影 |
| `RequirementSandboxReady` | 对应类型的 SDD、Debug 或技术快速 Orchestrator |
| `ProductSddStarted` | Agent Runtime、审计 |
| `DebugRootCauseCaptured` | `fix` 路由、审计、回归测试调度 |
| `TechnicalFastRouteStarted` | `refactor` / `chore` 路由、审计 |
| `GoldenCandidateSubmitted` | Approval Service、通知 |
| `GoldenConfirmedByProduct` | Product Leader通知 |
| `GoldenRequirementConfirmed` | Dev Leader通知、任务编排 |
| `RequirementReviewedByDevLeader` | WorkItem Scheduler |
| `BackendBranchCreated` | Backend SDD Scheduler |
| `WorkItemAssigned` | Agent Runtime、人员通知 |
| `ApiContractPublished` | Frontend Delivery、Contract Registry |
| `BackendDeliveryCompleted` | Integration Orchestrator |
| `FrontendDeliveryCompleted` | Integration Orchestrator |
| `IntegrationPassed` | Test Scheduler |
| `TestPassed` | Product Acceptance通知 |
| `ProductDeliveryAccepted` | MR Orchestrator |
| `ReworkRequirementCreated` | 原 Requirement 投影、通知 |
| `MergeRequestCreated` | Deterministic Checks、AI Review |
| `AiReviewCompleted` | MR 投影、开发 Leader通知 |
| `MergeRequestApprovedByLeader` | Merge Orchestrator |
| `MergeRequestMerged` | Requirement 聚合、Jenkins 状态关联 |
| `MainReleaseStarted` | Release Tracking |
| `MainReleaseCompleted` | Requirement 投影、审计 |

所有状态改变与 Outbox 写入必须在同一数据库事务中完成。

## 21. 失败分类与恢复

### 21.1 失败类别

- `TRANSIENT`：网络、限流、服务短暂不可用；
- `RESOURCE`：配额、磁盘、并发或超时；
- `VALIDATION`：输入、Schema、Guard 或 Contract 不合法；
- `BASELINE`：仓库 `main` 自身无法安装、构建或测试；
- `IMPLEMENTATION`：生成或交付代码失败；
- `POLICY`：权限、安全或 Workspace Policy 拒绝；
- `EXTERNAL_CONFLICT`：分支、MR、main 漂移或外部状态冲突；
- `SECURITY`：凭据泄漏、越权或异常网络访问；
- `HUMAN_REJECTION`：产品、产品 Leader或开发 Leader正式拒绝。

### 21.2 恢复矩阵

| 失败场景 | 状态与恢复 |
| --- | --- |
| GitLab 读取 `main` 失败 | 保持 `INITIALIZING`，退避重试；超过上限进入 `INITIALIZATION_FAILED` |
| 分支名冲突 | 不覆盖远端分支；进入 `INITIALIZATION_FAILED`，由有权限人员解决 |
| 分支已创建但平台超时 | Reconciler 查询远端并补齐 Binding，不重复创建 |
| Sandbox Provision 失败 | 保留分支；吊销凭据；创建新 Attempt |
| Sandbox 超时 | 终止进程、封存日志、销毁实例；按 Policy 重试 |
| Sandbox 清理失败 | 隔离实例、吊销凭据、触发 Janitor 和安全告警 |
| 基础 `main` 无法构建 | 标记 `BASELINE_FAILURE`，阻止 Golden Candidate，通知仓库负责人 |
| `feat` 页面或 Mock 不可运行 | Product SDD 留在 `VERIFYING`，不得发布 Preview 或提交审核 |
| Model、Runtime Bundle 或 Skill 失败 | 新 Attempt 使用新的 Execution Binding；不覆盖旧记录 |
| 产品或产品 Leader驳回 | 生成新 Candidate 版本，旧 Approval 失效 |
| 后端分支创建失败 | Requirement 保持 `DEV_REVIEW` 并阻塞 |
| API Contract 非法 | Contract 进入 `INVALID`，阻止发布和正式联调 |
| API Contract 不兼容 | Contract 进入 `INCOMPATIBLE`，创建新版本或调整设计 |
| Frontend Delivery 发现复杂度升级条件 | 暂停普通 Run，由开发 Leader确认升级 Full SDD |
| 联调或正式测试拒绝 | 创建 Rework Requirement，原 Requirement 冻结 |
| 产品验收拒绝 | 创建 Rework Requirement，不在原分支继续返修 |
| MR AI Review 不可用 | 记录不可用；默认继续开发 Leader审核 |
| MR head 变化 | 旧检查、AI Review 时效和 Leader Approval 失效 |
| MR 冲突 | 在受控 Sandbox 解决并产生新 Commit，重新执行检查和审批 |
| 前后端只合并一个 MR | 进入 `MERGE_PARTIALLY_COMPLETED`，停止自动流程并人工决策 |
| Jenkins 发布失败 | Git 历史保持不变；同步失败状态，由 Jenkins 重试或回滚 |
| Webhook 重复或乱序 | Inbox 去重；按外部版本和时间戳投影；定时 Reconcile |
| Secret 泄漏 | 立即取消 Run、吊销 Secret、隔离 Sandbox、脱敏日志并发出安全事件 |

### 21.3 自动重试限制

自动重试只适用于明确的 `TRANSIENT` 和可恢复 `RESOURCE` 失败。以下情况不得自动重试并伪装成成功：

- 人工拒绝；
- Guard 失败；
- 权限或 Policy 拒绝；
- Contract 不兼容；
- 分支归属冲突；
- Secret 泄漏；
- 前后端部分合并。

## 22. 并发、一致性与对账

### 22.1 乐观锁

所有 Requirement 命令基于 `expectedRequirementVersion`。版本冲突时调用方必须重新读取最新 Snapshot 和有效 Approval，不允许直接覆盖。

### 22.2 Outbox 与 Inbox

- 领域状态与 Outbox 在同一事务提交；
- GitLab、Jenkins Webhook 先进入 Inbox；
- Inbox 通过 Provider Event ID 去重；
- 外部写操作携带 Idempotency Key；
- Consumer 处理结果和消费游标原子保存。

### 22.3 Reconciler

定时对账至少检查：

- RepositoryBranchBinding 与 GitLab 分支；
- 记录的 task branch head 与 GitLab head；
- MR 状态、head SHA 和审批；
- `main` Merge Commit；
- Jenkins Run 和发布终态；
- 长时间未结束的 Sandbox；
- 已销毁 Sandbox 的凭据状态。

对账只能修复可证明的投影差异；无法证明时进入人工处理，不猜测外部成功。

## 23. Agent 执行协议

Agent 开始任一阶段前必须：

1. 获取最新 Requirement Snapshot；
2. 校验阶段状态和 Guard；
3. 校验 Requirement 类型对应的 Workflow Route；
4. 获取不可变 Stage Baseline；
5. 获取包含 Runtime 镜像 digest、Skill Bundle hash 和实际 Skill 名称的 Execution Binding；
6. 在绑定 Sandbox 中 Checkout 指定 Branch 和 Commit；
7. 声明预期 Artifact 和验证命令；
8. 定期上报 Heartbeat；
9. 响应取消和凭据到期；
10. 完成后提交结构化 Run Manifest；
11. 等待 Orchestrator 根据外部事实推进状态。

Agent 禁止：

- 用自然语言“已完成”替代 Artifact、Commit 或测试证据；
- 修改非绑定 Repository 或 Branch；
- 对 `feat`，在 Product SDD 和 Frontend Delivery 之间新建前端分支；
- 自己确认黄金需求；
- 自己完成产品验收；
- 自己完成开发 Leader审批；
- 直接 push 或合并 `main`；
- 静默切换 Runtime Bundle、Skill、Model 或 Contract 版本；
- 把失败 Attempt 覆盖为成功。

## 24. 审计要求

以下动作必须写入追加式 Audit Log：

- Requirement 创建、取消和返修；
- Repository 选择和 Branch Saga 每一步；
- Sandbox 创建、凭据注入、命令执行、暂停和销毁；
- Agent、Runtime 镜像 digest、Skill Bundle hash、实际 Skill、Model 和 Runtime Policy；
- Prompt、上下文来源和 Artifact Hash；
- 所有 Commit、Stage Baseline 和 Preview；
- Golden Candidate 提交与双重确认；
- 开发 Leader审核、模式决策和任务分配；
- API Contract 发布和兼容性结果；
- 联调、测试和产品验收；
- MR 创建、确定性检查、AI Review、Leader审批和合并；
- Jenkins 构建、发布、重试和回滚状态；
- 所有人工 Override、失效、补偿和安全事件。

单条审计记录至少包含：

```text
auditId
workspaceId
projectId
requirementId
actorType
actorId
capability
action
resourceType
resourceId
beforeVersion
afterVersion
commandId
correlationId
idempotencyKey
source
occurredAt
result
reason
artifactRefs
```

Secret、Token 和敏感业务数据不得写入日志、Prompt 或审计正文。人工 Override 必须填写原因，且不能用于伪造产品、产品 Leader或开发 Leader审批。

## 25. 验收场景

### 场景 1：Requirement 创建成功

```text
Given 创建者有 Capability，前端仓库已加入 Workspace
When 创建 feat Requirement
Then 平台从 frontend/main 当前 SHA 创建 feat/REQ-* 分支
And Branch Binding 记录同一 baseCommitSha
And Sandbox Checkout 该分支
And Requirement 进入 READY
```

### 场景 2：未选择前端仓库

```text
Given 创建请求没有 frontendRepositoryId
When 提交 CreateRequirement
Then 命令失败
And 不创建 Requirement 分支
And 不创建 Sandbox
```

### 场景 3：Product SDD 产出黄金需求

```text
Given feat Requirement 为 READY
When Product Agent 完成澄清、Spec、Plan、页面、Mock 和验证
Then 所有代码进入原前端任务分支
And Preview 可运行
And Golden Candidate 引用准确 Commit 和 bundleHash
```

### 场景 4：双重黄金确认

```text
Given feat Requirement 的 Candidate V1 已获产品确认
When 产品 Leader确认同一 V1
Then Requirement 进入 GOLDEN_CONFIRMED
And GoldenRequirementVersion 固化
```

### 场景 5：确认后 Candidate 被修改

```text
Given Candidate V1 已获产品确认
When 页面或 Mock 变化形成 V2
Then V1 产品确认失效
And 产品和产品 Leader必须确认 V2
```

### 场景 6：普通前端交付

```text
Given feat Requirement 的开发 Leader选择 FRONTEND_DELIVERY_RUN
When Frontend Agent 开始交付
Then 继续使用 Product SDD 的同一前端分支
And 不重复 Product Spec
And 基于 API Contract 接入真实接口
```

### 场景 7：复杂前端升级

```text
Given feat Requirement 的 Delivery 涉及公共组件和架构级改动
When 开发 Leader确认升级
Then WorkItem 切换为 FRONTEND_FULL_SDD
And 仍使用原前端分支
And 保留已有黄金需求
```

### 场景 8：后端 Contract

```text
Given Backend SDD 已完成 Contract Draft
When Schema、示例和兼容性校验通过
Then 发布不可变 APIContractVersion
And Frontend Delivery 和 Integration 固定使用该版本
```

### 场景 9：产品验收拒绝

```text
Given 测试通过并进入产品验收
When 产品选择 REJECTED
Then 原 Requirement 进入 REWORK_REQUIRED
And 创建 REWORK_OF 关联的新 Requirement
And 新 Requirement 从前端仓库当前 main 创建新任务分支
And 平台根据新 Requirement 类型选择完整 SDD、Debug 或技术快速流程
```

### 场景 10：fix 使用 Debug 路由

```text
Given fix Requirement 已进入 READY
When Orchestrator 启动执行
Then 第一阶段加载 systematic-debugging
And 保存复现证据和根因
And 后续执行 TDD、验证和代码评审
And 不创建 Product SDD 或黄金需求完成记录
```

### 场景 11：refactor 发现产品行为变化

```text
Given refactor Requirement 正在技术快速流程
When 执行发现需要改变产品行为
Then 当前快速流程停止
And 平台要求创建或升级为 feat
And 不在 refactor 中静默继续实现
```

### 场景 12：AI Review 不可用

```text
Given 前后端 MR 的确定性检查通过
When AI Review 服务不可用
Then MR 记录 AI_REVIEW_UNAVAILABLE
And 默认仍可进入开发 Leader审核
```

### 场景 13：Leader审批后 MR head 变化

```text
Given 开发 Leader已审批 MR head SHA A
When MR 更新为 SHA B
Then SHA A 的审批自动失效
And SHA B 重新执行检查和开发 Leader审批
```

### 场景 14：前后端部分合并

```text
Given 前端 MR 已合并
When 后端 MR 合并失败
Then Requirement 进入 MERGE_PARTIALLY_COMPLETED
And 自动合并停止
And 开发 Leader选择重试、回滚或创建 Rework Requirement
```

### 场景 15：Jenkins 发布失败

```text
Given 两个 MR 已合并 main
When Jenkins 发布失败
Then Requirement 保留准确 main Commit
And Git 历史不被改写
And 平台展示失败、重试或回滚状态
```

### 场景 16：Sandbox 失败重试

```text
Given feat Requirement 的 Product SDD Run Attempt 1 超时
When Orchestrator 允许重试
Then Attempt 1 日志和状态保留
And 创建新的 Sandbox Attempt 2
And Attempt 2 使用新的短期凭据和 Execution Binding
```

## 26. 实施检查清单

实现任何会推进 Requirement 状态的功能前，应逐项确认：

- 是否校验了当前状态、`expectedVersion` 和 Guard；
- 是否根据 `feat`、`fix`、`refactor`、`chore` 固定了正确 Workflow Route；
- `fix` 是否从 `systematic-debugging` 开始并保存根因与回归测试；
- `refactor` / `chore` 发现产品行为变化时是否升级为 `feat`；
- 是否绑定了准确 Repository、Branch 和 Commit；
- 是否使用了不可变 Artifact 和 Stage Baseline；
- 是否错误地复制了旧 Approval；
- 是否通过 Outbox 发出领域事件；
- 外部写操作是否有 Idempotency Key；
- Webhook 是否先进入 Inbox 并完成验签；
- Agent 结果是否通过 GitLab、Artifact Store 或测试事实校验；
- 失败是否保留 Attempt 并执行明确补偿；
- 是否写入完整审计；
- 是否可能绕过产品、产品 Leader或开发 Leader人工 Gate；
- 是否可能在合并 `main` 前错误触发 Jenkins；
- 对 `feat`，是否保持 Product SDD 与 Frontend Delivery 使用同一前端任务分支；
- 正式返修是否创建了新的关联 Requirement。
