# Requirement 与 SDD Workflow

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[Requirement 与 SDD Workflow 详细设计](./02-requirement-sdd-workflow-detail.md)

## 1. 模块目标

Requirement Workflow 将需求、工作项、SDD、Agent 执行、Artifact、人工 Gate、测试、验收和 GitLab MR 组织成可追溯的业务流程。它只依赖 GitLab、Object Storage、Agent Run 等模块提供的 Port，不复制 Superpowers Skill 的内部步骤，也不把外部系统状态伪装成平台事实。

统一治理顺序为：

```text
System Invariant / Security Floor
→ Platform Gate Policy
→ Workspace Gate Policy Override
→ Capability + Scope
→ Requirement Current Assignment
```

岗位只用于默认路由；任何人工 Decision 最终都必须由当前合格 assignee 作出。

## 2. 核心对象

```text
Requirement
├── 1..n WorkItem
│   ├── 1 Repository Branch Binding
│   ├── 0..n Run
│   │   └── 1..n Attempt
│   └── Artifact / Gate / MR Reference
├── Integration Baseline
├── Acceptance Assignment / Decision
└── recordState = ACTIVE | ARCHIVED | DELETED
```

- `Requirement` 表达整体业务交付进度。
- `WorkItem` 表达单仓库交付进度；一个 WorkItem 最终只绑定一个 GitLab Project/Repository。
- `Run` 表达执行目标，`Attempt` 表达一次不可变执行尝试；重试创建新 Attempt。
- `Artifact`、人工 `Decision`、Commit SHA 和 MR head SHA 都按准确版本绑定，内容变化后旧结论失效但历史保留。
- Requirement、WorkItem、Attempt、Child Build Execution 和 MR 使用独立状态机，不能相互冒充终态。

## 3. 创建、仓库与 WorkItem

创建 Requirement 时必须提供：

- Workspace；
- 类型：`feat`、`fix`、`refactor` 或 `chore`；
- 标题、描述及必要背景；
- 一个初始 GitLab Project/Repository。

平台中的 Project 直接对应 GitLab Project，不重复建立代码项目实体。第一个 WorkItem 自动绑定初始仓库；产品通常选择前端仓库，纯后端需求或开发自行创建的需求选择实际工作的仓库。

后续 WorkItem 可以先创建并分配人类负责人，再由负责人选择 Workspace 已授权仓库。仓库未绑定时以 `repositoryState=WAITING_REPOSITORY` 表示，不得创建任务分支、启动执行或创建 MR。分支创建后 Repository Branch Binding 不可变；选错仓库时保留原 WorkItem 为 `SUPERSEDED`，再创建替代 WorkItem。

任务分支从仓库 `main` 当前基线创建，命名为：

```text
type/wi-<全局递增号>-<semantic-slug>
```

`main` 为保护分支，只允许通过 Formal MR 合并。

## 4. 类型路由与 Superpowers

- `feat` 进入完整 SDD 路由。
- `fix` 不重复完整 Product SDD，使用 Superpowers 的 `systematic-debugging`、TDD、验证和代码评审流程。
- `refactor` 与 `chore` 按各自 Route Snapshot 形成技术基线；类型创建后不得静默改写。
- 首版使用 Superpowers Runtime Bundle，不接入 `grill-me`，平台不重复实现 Superpowers 已有方法。
- Product、Backend 或 Frontend 只要实际启用了某个 SDD，该 SDD 就必须经过人工 `REQUIREMENT_BASELINE_CONFIRMATION` Gate。

类型差异由 Route、Artifact 和 Gate 表达，所有类型共用同一 Requirement 主状态机。

Route Artifact 保留交付所需的结构化事实：`feat` 保存产品行为、验收标准、计划及受影响界面的可运行验证证据；`fix` 保存复现、根因、回归测试和验证结果；`refactor/chore` 保存影响范围、风险、技术计划和验证清单。后端 WorkItem 变更 API 时必须产出版本化、机器可读并通过 Schema 校验的 API Contract；前端 WorkItem 绑定当前确认的 Route Baseline 和适用 Contract，不重复已经完成的产品 SDD。

## 5. SDD Gate 与审核人

人工 Gate 统一建模为：

```text
GatePolicy
→ GateInstance(subject + version/hash)
→ Current Assignment
→ Decision
```

SDD 的出厂及无覆盖回退规则统一为 `CREATOR`：`feat`、`fix`、`refactor` 和 `chore` 的默认审核人都是 Requirement 创建人。Super Admin 可以通过版本化 Gate Policy 调整特定 Scope 的默认解析规则，但不能绕过 SDD 必须确认、审核资格或版本绑定。Workspace Scope 的 Override 也只能由 Super Admin 通过 Platform Scope 配置命令发布；Workspace Owner、Leader 和普通管理员不能修改 Gate Policy。

创建 Requirement 时同步保存 `defaultReviewerId` 和 `currentReviewerId`，不等待人工选择审核人。默认审核人之后可以异步改派实际审核人；正常路径只有默认审核人可以修改 Current Assignment，被选中的实际审核人不能继续转派。候选人必须具备 Gate 所需 Capability、Scope 和有效 Membership；Gate 已形成最终 Decision 后不得改派。

允许自审，但创建人或产物作者仍必须是当前 assignee 且资格有效。默认审核人不可用时，仅具备 `sdd.reviewer.override` 的管理员可以填写原因后恢复性改派。Agent、AI Review、确定性检查或 Super Admin 身份本身都不能代签人工 Decision。

## 6. 主状态机

Requirement 主状态：

```text
CREATED
→ PREPARING
→ AWAITING_CONFIRMATION
→ READY
→ IN_PROGRESS
→ VERIFYING
→ AWAITING_ACCEPTANCE
→ AWAITING_MERGE
→ COMPLETED

终止状态：CANCELED
```

WorkItem 主状态：

```text
DRAFT
→ READY
→ IN_PROGRESS
→ VERIFYING
→ AWAITING_MERGE
→ COMPLETED

终止状态：CANCELED | SUPERSEDED
```

以下内容是独立维度，不扩展主状态枚举：

```text
Requirement.recordState = ACTIVE | ARCHIVED | DELETED
WorkItem.assignmentState = UNASSIGNED | ASSIGNED
WorkItem.repositoryState = WAITING_REPOSITORY | BOUND
blockedReasons[]
Attempt.status
BuildExecution.status
MR.status
```

Attempt、Sandbox、Model 或 Adapter 失败只形成可处理的执行结果或阻塞原因，不自动把 WorkItem 或 Requirement 置为失败终态。

## 7. WorkItem 分配与 Agent Attempt

WorkItem 分别保存 `createdBy`、`humanOwnerId`、实际 `executorType/executorId` 和 `requiredCapabilities`。创建人满足 Capability、Scope 与 Membership 时可以成为负责人和执行者；否则 WorkItem 保持 `UNASSIGNED`，等待具备 `work_item.assign` 的人员异步分配。

Agent 只能作为执行者，不能取代人类负责人或人工 Gate。运行中的 WorkItem 改派时，不得静默修改旧 Attempt；应先安全停止或等待当前 Attempt 结束，固化 Commit、Artifact 和日志，再基于新 Assignment 创建新 Attempt。

Attempt 主路径为：

```text
CREATED → BINDING → QUEUED → PROVISIONING → RUNNING
→ FINALIZING → SUCCEEDED

RUNNING → WAITING_INPUT → QUEUED
RUNNING → WAITING_CHILD → QUEUED
任意活动状态 → CANCELING → CANCELED | TIMED_OUT
其他终态：FAILED
```

Execution Binding 固定 Model、Skill、Runtime、Superpowers Bundle、Tool/Context Policy、权限、仓库和分支。更换其中任何执行事实都必须创建新 Attempt。终态 Attempt 不可复活；`WAITING_INPUT` 在可配置的默认 24 小时期限内允许同一 Attempt 重新排队，超时后继续则创建新 Attempt。

## 8. Artifact 与附件

Spec、Plan、测试报告、完整 Attempt 日志、截图、用户附件和其他流程证据统一使用版本化 Artifact 元数据，并支持经 Backend 实时授权的上传与下载。

- 用户单附件默认最大 `50 MiB`，同一 Requirement 用户附件总量默认最大 `200 MiB`。
- Agent Artifact 默认限额为单 Object `100 MiB`、单 Attempt 合计 `500 MiB`、单 Requirement 全部 Attempt 合计 `1 GiB`。
- 产品额度、Presigned Request 默认有效期、允许文件类型和清理时间均为版本化 Platform Policy，只能由 Super Admin 受控配置；首版不做 Workspace/Project 多级额度。
- Scanner 的 `100 MiB` 单对象安全 Envelope 是独立 Security Floor，不能只提高产品额度绕过。
- 上传按声明大小原子预占，并同时满足产品额度与环境 Bucket Capacity Ledger；归档、逻辑删除、隔离和仍保留的 Object Version 继续占用额度。
- 上传完成后必须校验精确 Object Version、大小、MIME 和 SHA-256；外部二进制内容异步扫描，只有 `AVAILABLE` Artifact 可以下载或进入 Workflow Gate。
- 浏览器只能取得短期、单 Object Version 的 Presigned Request，不能取得 Bucket Credential；Presigned URL 不持久化、不进入日志。
- Requirement 归档、删除或恢复只改变平台元数据与可见性，首版不因此删除 Object Version。

Git Working Tree 和源码的权威副本保留在 GitLab；大型 Build、Image、安装包和专业 CI 产物保留在对应 Registry，平台只保存稳定引用和校验元数据。

## 9. 集成、最终验收与 MR

交付顺序为：

```text
task branch（from main）
→ Integration MR：task branch → dev
→ 外部 Jenkins 人工构建/测试
→ 冻结 Requirement Integration Baseline
→ REQUIREMENT_ACCEPTANCE
→ 一键创建 Formal MR：task branch → main
→ FORMAL_MR_REVIEW
→ squash merge main
```

Integration MR 不要求 Leader 人工审核，开发人员可以在 GitLab 确定性检查和分支保护约束下自行合并。Jenkins 是独立平台；首版研发平台不调用 Jenkins、不读取其状态，也不把 Jenkins 状态作为平台自动 Gate，只保存用户提交的外部验证证据。

最终验收默认责任人为 Requirement 创建人，并可按统一 Assignment 规则异步改派。验收人必须是当前 Acceptance Assignment 的 assignee，且具备所需 Capability、Scope 和有效 Membership。验收 Decision 绑定冻结的 Integration Baseline；验收通过后才能创建 Formal MR。

Formal MR 的默认审核路由与 SDD 不同：依据 WorkItem 的 `humanOwnerId` 解析，普通开发默认路由到直属 Leader，Leader 作为负责人时默认路由到本人；默认审核人可以改派给任何具备 `merge_request.review` 和有效 Scope 的候选人，包括作者本人。Approval 绑定准确 `headSha`，head 变化后必须重新审核。`merge_request.review` 与 `merge_request.merge` 是独立 Capability。

Requirement 只有在最终验收仍对当前 Integration Baseline 有效，且所有必需 WorkItem 的 Formal MR 都已合并 `main` 后才能进入 `COMPLETED`。验收或 MR 要求修改时继续原 WorkItem，回到实现/验证阶段；范围扩大时再创建关联 `feat` Requirement。

## 10. 归档、恢复与逻辑删除

- 归档使 Requirement 从普通列表隐藏，并在独立归档视图中只读展示。
- 归档进行中的 Requirement 前，平台必须安全停止相关 Attempt 及全部非终态 Child Execution，完成 Fence、Credential/Lease 回收和结果固化。
- 恢复只恢复业务记录及原主状态的继续入口，不复活旧 Attempt；需要继续时基于原状态、最新 Commit、Checkpoint 和 Artifact 创建新 Attempt 或继续动作。
- 删除采用逻辑删除并进入独立 Deleted 视图；第一阶段不做物理清除，也不实现 Legal Hold 占位能力。
- 删除、查看 Deleted 和恢复分别执行 Capability + Scope 校验；`requirement.deleted.read`、`requirement.deleted.restore` 不因创建人身份自动获得。
- Audit 是独立追加式事实，不因归档、删除或恢复而删除或改写。

## 11. 配置、并发与审计

- Gate Policy、Artifact 配额、文件类型和等待时间等产品行为使用版本化 Platform Policy；运行对象保存解析结果与 Policy Version。
- 只有 Super Admin 可以发布 Platform Policy，也只有 Super Admin 可以在平台允许的边界内发布 Workspace Scope Gate Policy Override；Workspace 成员不能配置 Policy。Assignment 只改变单个 Requirement 的未完成责任。
- 状态转换、分配、改派、Gate Decision、Artifact、归档、恢复、逻辑删除、Attempt、MR 和外部验证声明全部使用后端 Guard、乐观并发控制与 Audit。
- 已完成的 Decision、Attempt、Artifact 和 Audit 保留原 actor，不因后续组织、权限或 Assignment 变化而改写。
