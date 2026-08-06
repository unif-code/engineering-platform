# Requirement 与 SDD Workflow 详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[Requirement 与 SDD Workflow](./02-requirement-sdd-workflow.md)
> 适用读者：产品、开发、测试、平台开发人员、Agent 与运维人员

## 1. 目标与边界

本文定义 Requirement 从创建、SDD 与人工确认，到多仓库交付、Agent 执行、测试、最终验收和 Formal MR 合并的业务架构。目标是让其他开发人员或模型能够准确理解领域边界、状态语义、版本绑定和失败恢复规则，而不依赖对话上下文。

本文负责：

- Requirement、WorkItem、Run、Attempt、Artifact、Gate、Assignment 和 Integration Baseline 的关系；
- `feat`、`fix`、`refactor`、`chore` 的 Workflow Route；
- SDD 与 Superpowers Runtime Bundle 的边界；
- 人工 Gate、默认审核人、异步改派和版本失效；
- GitLab Project、任务分支、`dev` 集成和 Formal MR 的业务顺序；
- Requirement 归档、恢复、逻辑删除及其对运行中 Agent 的影响；
- 用户附件和 Agent Artifact 的授权、配额、扫描、可用性与生命周期；
- 状态转换、外部事实、并发控制和 Audit 的架构约束。

本文不定义：

- 数据库表、HTTP API、Event Schema 或具体类结构；
- Superpowers Skill 内部提示词和执行步骤实现；
- Sandbox、Temporal、GitLab Adapter、Object Storage Adapter 或 File Security Engine 的底层实现；
- Jenkins 的构建脚本、发布流程或 Jenkins Adapter。首版 Jenkins 仍是独立平台。

本文是架构基线，不是后端开发 Spec、实施 Plan 或代码设计。

## 2. 治理原则

### 2.1 四层治理

Workflow 的所有受控行为按以下顺序解析：

```text
System Invariant / Security Floor
→ Platform Gate Policy
→ Workspace Gate Policy Override
→ Capability + Scope
→ Requirement Current Assignment
```

- System Invariant 保护人工 Gate 不可代签、保护分支、Artifact 安全扫描、Audit 不可篡改等底线，不能由配置关闭。
- Platform Policy 由 Super Admin 通过统一配置发布流程管理。
- Workspace Scope 只可由 Super Admin 在 Platform 明确允许的边界内发布 Gate Policy Override；Workspace 成员不能获得配置权限。
- Capability + Scope 判断某人是否具备执行资格，Assignment 决定当前具体责任人。
- Assignment 不能补足缺少的 Capability、Scope 或 Membership，也不能改变平台/Workspace Policy。

### 2.2 版本化事实

- Requirement、Gate 和 Attempt 创建时保存实际解析结果与 Policy Version。
- Gate Decision 绑定明确 subject、version/hash、Assignment 和决策时资格快照。
- Acceptance Decision 绑定 Requirement Integration Baseline。
- Formal MR Review Decision 绑定准确 `headSha`。
- Artifact version、bundle hash、Commit SHA、MR head SHA 或验收基线变化时，相关旧 Decision 失效但历史保留。
- 已完成的 Decision、Attempt、Artifact 和 Audit 保留原 actor，不因人员、组织或权限变化而改写。

### 2.3 模块边界

Requirement Workflow 属于模块化 Control Plane。它通过稳定 Port 使用：

- GitLab Project、分支、Commit 和 MR；
- Agent Run、Attempt 与 Child Execution；
- Object Storage 和 File Security；
- Authorization、Organization、Workspace 与 Assignment；
- Audit、通知和运维状态投影。

模块不得直接读取或修改其他模块的数据表。未来提取为微服务时，领域模型和状态机不因基础设施或 Adapter 替换而重写。

## 3. 领域对象

### 3.1 对象关系

```text
Requirement
├── Route Snapshot
├── 1..n WorkItem
│   ├── Human Assignment
│   ├── Repository Branch Binding
│   ├── 0..n Run
│   │   └── 1..n Attempt
│   │       └── 0..n sequential Child Execution
│   ├── Artifact Reference
│   └── Formal MR Reference
├── Gate Instance / Assignment / Decision
├── Integration Baseline
├── Acceptance Assignment / Decision
└── recordState = ACTIVE | ARCHIVED | DELETED
```

### 3.2 Requirement

Requirement 是整体业务交付聚合根，至少表达：

- 稳定 ID、Workspace、创建人、类型、标题和描述；
- 创建时选择的初始 GitLab Project；
- 当前 Route Snapshot 和 Requirement 主状态；
- 独立的 `recordState`；
- WorkItem 集合、必需 WorkItem 集合和替代关系；
- 当前阻塞原因；
- Gate、Artifact、Integration Baseline、Acceptance 和 Formal MR 的稳定引用；
- 乐观并发版本和 Audit 关联标识。

Requirement 类型固定为：

```text
feat | fix | refactor | chore
```

类型创建后不得静默改写。范围变化需要不同业务语义时，创建关联 Requirement，并保留关系和原因。

### 3.3 WorkItem

WorkItem 表达一个仓库中的一份可分配交付责任。每个 WorkItem 分别保存：

- `createdBy`：创建事实，不授予执行资格；
- `humanOwnerId`：对交付最终负责的人类负责人；
- `executorType/executorId`：Human 或 Agent 实际执行者；
- `requiredCapabilities`：执行需要的能力集合；
- `assignmentState`、`repositoryState` 和主状态；
- 唯一 Repository Branch Binding；
- Attempt、Artifact、测试证据和 MR 引用；
- `supersedesWorkItemId` 或等价替代关系。

一个 Requirement 可以逐步产生多个 WorkItem；每个 WorkItem 最终必须且只能绑定一个 GitLab Project/Repository。同一仓库有多个 WorkItem 时，各自使用独立任务分支。

### 3.4 Run、Attempt 与 Child Execution

- Run 表示业务执行目标。
- Attempt 表示一次具有不可变 Execution Binding 的具体尝试。
- 业务重试创建新的有序 Attempt，不覆盖旧 Attempt。
- Child Execution 是 Parent Attempt 依赖的异步执行；首发 Child Type 为 Image Build。
- Parent Attempt 与 Child Execution 使用独立状态、Binding、Lease、Credential、日志和 Artifact，并通过稳定 ID 关联。

每个 Attempt 的 Execution Binding 固化：

- Agent Definition；
- Runtime Image digest；
- Superpowers Bundle hash 与 Skill；
- Model Deployment；
- Tool、Context 和 Runtime Permission Policy；
- Repository、Branch 和 Commit；
- Resource Profile 及完整 Resource Vector；
- 已解析的 Deadline、等待期限和 Policy Version。

运行中不得静默替换 Model、Skill、Runtime、Policy、仓库或分支。任何替换都创建新 Attempt。

用户 Session 结束或控制权限变化不主动中断已经启动的 Attempt，但会立即影响之后的查看、取消、重试和新 Run。Requirement 归档、删除或显式取消属于业务终止命令，必须执行安全停止。

### 3.5 Gate、Assignment 与 Decision

所有人工 Gate 使用统一结构：

```text
GatePolicy
→ GateInstance(subjectType + subjectId + subjectVersion/hash)
→ Current Assignment
→ Decision
```

当前业务 Gate Type 为：

| Gate Type | Subject | 责任 |
| --- | --- | --- |
| `REQUIREMENT_BASELINE_CONFIRMATION` | 当前 Route 的 SDD、Debug Baseline 或技术基线版本 | 确认执行基线 |
| `REQUIREMENT_ACCEPTANCE` | 冻结的 Integration Baseline | 最终验收 |
| `FORMAL_MR_REVIEW` | Formal MR 的准确 `headSha` | 代码人工 Review |

Gate Type 只描述业务责任，不编码产品 Leader、开发 Leader等岗位。Decision 使用 `APPROVED`、`CHANGES_REQUESTED`、`REJECTED` 等稳定结果；岗位、默认路由和实际审核人分别保存在 Policy、Assignment 与 Decision Snapshot 中。

### 3.6 Artifact 与 Integration Baseline

Artifact 是不可变版本的元数据和 Object/External Reference。Spec、Plan、测试报告、完整 Attempt 日志、截图、用户附件和结构化执行证据都进入 Artifact 链路。

Integration Baseline 是 Requirement 最终验收的冻结输入，至少记录每个必需 WorkItem 的：

- GitLab Project/Repository；
- 任务分支和准确 Commit SHA；
- `dev` 集成结果；
- Artifact hash；
- 测试和外部验证证据。

Integration Baseline 不能只绑定持续变化的 `dev` HEAD。

## 4. Requirement 创建与仓库绑定

### 4.1 创建输入

创建 Requirement 时必须选择：

- Workspace；
- Requirement 类型；
- 一个初始 GitLab Project/Repository；
- 标题、描述及必要背景。

平台中的 Project 直接对应 GitLab Project，不再建立一套平行的代码项目实体。Requirement 不能在没有初始仓库的情况下创建。

产品创建 Requirement 时通常选择前端仓库，但纯后端需求也必须选择后端仓库；前端或后端开发自行创建时选择自己实际工作的仓库。业务规则不按岗位强制仓库类型。

### 4.2 第一个 WorkItem

- Requirement 的第一个 WorkItem 自动继承初始仓库。
- 创建人满足 WorkItem 的 Capability、Scope、Membership、仓库访问和资源 Guard 时，可以同时成为 `humanOwnerId` 与 Human executor。
- 创建人不满足执行资格时，WorkItem 保持 `assignmentState=UNASSIGNED`，发布待分配通知，但 Requirement 创建仍然成功。
- Requirement 创建与 SDD 实际审核人的人工选择解耦，不等待后续改派。

### 4.3 后续 WorkItem

后续 WorkItem 可以先创建并分配 `humanOwnerId`，暂时保持：

```text
repositoryState = WAITING_REPOSITORY
```

确定人类负责人后，由其从 Workspace 已授权 GitLab Project 中选择仓库；操作人仍须具备仓库绑定 Capability 和有效 Scope。Agent 可以提出建议，但不能代替人类负责人作出绑定决定。

仓库未绑定前不得：

- 创建任务分支；
- 启动 Human 或 Agent 执行；
- 创建 Integration MR 或 Formal MR。

### 4.4 Repository Branch Binding

任务分支从对应仓库 `main` 当前基线创建，命名为：

```text
type/wi-<全局递增号>-<semantic-slug>
```

全局编号不是日期。分支创建成功后，以下事实构成不可变 Binding：

```text
repositoryId + baseCommitSha + branchName
```

分支创建前，人类负责人可以在授权范围内修改仓库；分支创建后发现仓库错误时：

1. 原 WorkItem 进入 `SUPERSEDED`；
2. 保留其仓库、分支、Commit、Attempt、Artifact 和 Audit；
3. 创建新的替代 WorkItem、新编号和新任务分支；
4. 被替代 WorkItem 不再计入 Requirement 完成条件。

不得搬运或改写历史 Binding 来伪装原 WorkItem 从一开始就位于新仓库。

## 5. Workflow Route 与 Superpowers

### 5.1 类型路由

| Requirement 类型 | 当前 Route 基线 | 人工确认 |
| --- | --- | --- |
| `feat` | 完整 SDD | 实际启用的 SDD 必须确认 |
| `fix` | `systematic-debugging`、TDD、验证、代码评审 | Debug/Route Baseline 按 Gate 确认 |
| `refactor` | 按 Route Snapshot 形成技术基线并执行验证 | 实际启用的 SDD 必须确认 |
| `chore` | 按 Route Snapshot 形成技术基线并执行验证 | 实际启用的 SDD 必须确认 |

`feat` 的完整 SDD 由 Superpowers Runtime Bundle 提供，典型阶段为：

```text
brainstorming
→ writing-plans
→ test-driven-development
→ verification-before-completion
→ requesting-code-review
```

`fix` 不重复完整 Product SDD。首版不接入 `grill-me`，也不在平台实现一套与 Superpowers 重复的方法论。

### 5.2 平台与 Skill 的边界

Superpowers 负责方法和执行步骤；Workflow 只负责：

- Route Snapshot；
- Skill/Bundle 版本绑定；
- 阶段输入与 Artifact 输出；
- Human Gate；
- Attempt、超时、重试和恢复；
- Capability、Scope、Assignment 与 Audit。

Agent 产出内容不能直接变成人工 Decision。Product、Backend 或 Frontend 只要启用了某个 SDD，就必须创建绑定准确 Artifact 版本的 `REQUIREMENT_BASELINE_CONFIRMATION`。

### 5.3 Route Artifact 与交付基线

各 Route 必须把 Agent 对话中的结论固化为结构化、可版本绑定的 Artifact：

- `feat`：产品行为、异常与空状态、验收标准、Product Plan；涉及前端界面时，还包括基于真实 WorkItem 分支的可运行页面、受控 Mock、Preview 与验证证据。
- `fix`：可复现证据、根因、失败回归测试、修复后结果和验证证据。
- `refactor/chore`：影响范围、风险、技术计划和验证清单。

后端 WorkItem 引入或变更 API 时，必须产出版本化、机器可读的 API Contract，例如 OpenAPI、AsyncAPI、JSON Schema 或 Protobuf。Contract 至少覆盖输入/输出、错误、认证授权、幂等/重试、枚举/空值、示例、Schema Version 和兼容性，并在作为交付基线前通过格式校验、引用解析、示例校验与兼容性检查。

前端 WorkItem 使用当前已确认的 Route Baseline 和适用 API Contract，不重新编写已经完成的产品 SDD。Mock 与真实 Contract 存在阻塞差异时，必须更新对应 Artifact、Contract 和受影响 Gate，不能宣称已经完成真实联调。

Product、Backend 或 Frontend 的具体 SDD 只要实际启用，就各自遵循统一的人工确认、版本失效和 Assignment 规则；不能因为某个上游 SDD 已确认而自动跳过另一个实际启用的 SDD Gate。

### 5.4 Route 变化

- Route 类型、Bundle、Skill、Artifact 或 Policy 变化不能静默修改运行中的 Attempt。
- 尚未启动的对象按 Effect Semantics 使用新 Policy；已创建的 Gate、Attempt 和 Artifact 保存原解析版本。
- 当前 Route 发现范围已扩展为新的产品能力时，创建关联 `feat` Requirement；原 Requirement 和已有事实保持不变。

## 6. Human Gate 与审核人路由

### 6.1 Gate Policy 层级

Gate Policy 按以下顺序解析：

```text
System Invariant
→ Platform Gate Policy
→ Workspace Gate Policy Override
→ Requirement Current Assignment
```

Requirement 不创建第三层 Policy，只保存 Policy 解析快照、默认责任人和可显式改派的 Current Assignment。第一阶段不提供 Project Gate Policy。

只有 Super Admin 可以通过 Platform Scope 的版本化配置命令发布 Gate Policy，包括指定 Workspace Scope 的 Override。Workspace Owner、Leader 和普通管理员不能发布配置；Workspace Override 只能在 Platform 允许的边界内覆盖或收紧，不能绕过 Human Gate、Capability、Scope 或版本绑定。

### 6.2 SDD 默认审核人

所有 Requirement 类型采用统一基线：

```text
defaultReviewerResolver = CREATOR
```

即 `feat`、`fix`、`refactor` 和 `chore` 的出厂及无覆盖回退默认审核人都是 Requirement 创建人。Super Admin 可以在特定 Scope 通过版本化 Gate Policy 调整解析规则；默认值不在业务代码中按类型或岗位分叉。

创建 Requirement 时系统同步：

1. 使用当时有效 Policy 解析 `defaultReviewerId`；
2. 保存 Policy Version 与解析快照；
3. 初始化 `currentReviewerId = defaultReviewerId`；
4. 继续创建流程，不等待审核人手工操作。

因此，即使没有改派也始终存在明确的 Current Reviewer。

### 6.3 异步改派

- 默认审核人可以在 Requirement 创建后异步选择或修改实际审核人。
- 正常路径只有 `defaultReviewerId` 对应人员可以修改 `currentReviewerId`。
- 被选中的实际审核人只负责审核，不能继续转派；如果其同时也是默认审核人，则仍按默认审核人规则操作。
- 候选人必须具备 Gate 所需 Capability、Scope 和有效 Membership。
- Gate 到达确认点时等待 Current Reviewer，不要求创建时同步完成选择。
- Gate 已形成最终 Decision 后不得改派；新 Artifact 版本形成新的 Gate/Decision 关系。
- 默认审核人停用、离职或失去有效 Scope 时，具备 `sdd.reviewer.override` 的管理员可以填写原因后恢复性改派。
- Override 不能跳过 Gate、降低审核资格、替换 Artifact 版本或改写已完成 Decision。

### 6.4 自审与职责隔离

允许自审：创建人或 Artifact 作者只要同时是 Current Assignment assignee，并满足 Capability、Scope 与 Membership，就可以作出 Decision。创建人身份本身不授予审核资格。

以下责任彼此独立：

- SDD Baseline Confirmation；
- WorkItem 实现与 Agent 控制；
- Requirement Acceptance；
- Formal MR Review；
- Formal MR Merge。

完成其中一项不会自动继承其他 Assignment、Capability 或 Decision。Agent、AI Review、确定性检查、Connector Service Account 和系统管理员都不能冒充人工审核人。

## 7. Assignment

### 7.1 WorkItem 分配

创建 WorkItem 时按以下规则解析：

```text
创建人具备 requiredCapabilities + Scope + Membership
  → humanOwnerId = 创建人
  → executor = 创建人
  → assignmentState = ASSIGNED

创建人不具备执行资格
  → assignmentState = UNASSIGNED
  → 通知待分配
```

只有具备 `work_item.assign` 和对应 Scope 的人员可以分配；候选人必须是有效 Workspace 成员，并满足执行、仓库访问和资源状态要求。多人并发分配时只接受第一笔基于当前版本的有效写入。

`UNASSIGNED` 可以保存、查看和通知，但不能启动 Agent、修改代码或创建 Formal MR。系统可以提醒长期未分配事项，但不能随机选择执行者。

Agent 执行时仍必须保存 `humanOwnerId`。Agent 是 executor，不是 SDD、MR 或最终验收的人工责任人。

### 7.2 改派

- 尚未启动的 WorkItem 可以直接受控改派。
- 运行中的 WorkItem 不得把现有 Attempt 静默换人。
- 改派应先安全停止当前 Attempt，或等待其结束；随后保留 Commit、Artifact、Checkpoint 和日志，再基于新 Assignment 创建新 Attempt。
- 分配、自动解析、人工改派、并发冲突、拒绝和启动都进入 Audit。

### 7.3 Acceptance Assignment

- Requirement 最终验收默认责任人为 Requirement 创建人。
- 创建人可以按统一 Assignment 规则异步改派实际验收人。
- 只有当前 Acceptance Assignment assignee 且具备所需 Capability、Scope 与 Membership 的人员可以验收。
- 创建人缺少资格时不能直接验收，只能改派给合格候选人。

## 8. Requirement 主状态机

### 8.1 状态图

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

### 8.2 状态语义

| 状态 | 语义 |
| --- | --- |
| `CREATED` | Requirement 已持久化，正在初始化首个 WorkItem 和必要外部绑定 |
| `PREPARING` | 正在执行澄清并形成当前 Route 的 SDD、Debug Baseline 或技术基线 |
| `AWAITING_CONFIRMATION` | 等待当前 Route 实际要求的 Human Gate |
| `READY` | 受控 Baseline 已确认，可以完成 WorkItem 拆分、分配和启动准备 |
| `IN_PROGRESS` | 至少一个必需 WorkItem 正在实现，或退回后正在返工 |
| `VERIFYING` | 必需 WorkItem 正在完成 `dev` 集成、测试和外部 Jenkins 人工验证 |
| `AWAITING_ACCEPTANCE` | Integration Baseline 已冻结，等待最终验收 |
| `AWAITING_MERGE` | 最终验收已通过，必需 Formal MR 正在审核或合并 |
| `COMPLETED` | 验收仍对当前 Baseline 有效，且全部必需 Formal MR 已合并 `main` |
| `CANCELED` | Requirement 已主动取消，全部相关活动执行完成安全终止 |

### 8.3 独立维度与回退

以下事实不进入 Requirement 主状态：

```text
recordState = ACTIVE | ARCHIVED | DELETED
blockedReasons[]
WorkItem.status
Attempt.status
BuildExecution.status
MR.status
```

- Attempt、Sandbox、Model 或 Adapter 失败只形成阻塞原因和可恢复操作，不把 Requirement 直接改成失败终态。
- 最终验收拒绝时回到 `IN_PROGRESS`，继续原 WorkItem 或增加修正 WorkItem；范围扩大时另建关联 `feat` Requirement。
- Formal MR 要求修改或代码变化使 Integration Baseline 失效时，回到 `IN_PROGRESS` 或 `VERIFYING`。
- 多仓库部分合并时保持 `AWAITING_MERGE` 并进入显式处置，不能错误进入 `COMPLETED`。
- 所有转换由后端命令、业务 Guard、版本校验和 Audit 驱动，客户端不能直接覆盖状态字段。

## 9. WorkItem 主状态机

### 9.1 状态图

```text
DRAFT
→ READY
→ IN_PROGRESS
→ VERIFYING
→ AWAITING_MERGE
→ COMPLETED

终止状态：CANCELED | SUPERSEDED
```

### 9.2 状态语义

| 状态 | 语义 |
| --- | --- |
| `DRAFT` | 负责人、执行者、仓库、分支或前置 Gate 尚未全部就绪 |
| `READY` | Assignment、Repository Branch Binding、Gate 和权限 Guard 全部满足 |
| `IN_PROGRESS` | Human 或 Agent 正在实现；要求修改后也回到此状态 |
| `VERIFYING` | 实现完成，进入 `dev` 集成、测试和外部 Jenkins 人工验证 |
| `AWAITING_MERGE` | Requirement 最终验收通过且 Formal MR 已创建 |
| `COMPLETED` | Formal MR 已合并 `main` |
| `CANCELED` | WorkItem 被主动取消，相关执行已安全停止 |
| `SUPERSEDED` | 新 WorkItem 已接管责任，不再计入 Requirement 完成条件 |

以下内容使用独立维度：

```text
assignmentState = UNASSIGNED | ASSIGNED
repositoryState = WAITING_REPOSITORY | BOUND
blockedReasons[]
Attempt.status
BuildExecution.status
```

Attempt 失败、超时或取消不会直接终结 WorkItem。只要 WorkItem 未取消或被替代，处理阻塞后可以创建新 Attempt。

Formal MR 要求修改时，WorkItem 从 `AWAITING_MERGE` 回到 `IN_PROGRESS`；旧 Review Decision 按 head SHA 失效。进入 `AWAITING_MERGE` 前，必须确认所属 Requirement 的最终验收仍对当前 Integration Baseline 有效。

## 10. Attempt 与 Child Execution

### 10.1 Attempt 状态机

```text
CREATED
→ BINDING
→ QUEUED
→ PROVISIONING
→ RUNNING
→ FINALIZING
→ SUCCEEDED

RUNNING → WAITING_INPUT → QUEUED → PROVISIONING → RUNNING
RUNNING → WAITING_CHILD → QUEUED → PROVISIONING → RUNNING

任意活动状态 → CANCELING → CANCELED
任意活动状态 → CANCELING → TIMED_OUT
其他终态：FAILED
```

### 10.2 状态语义

| 状态 | 语义 |
| --- | --- |
| `CREATED` | Attempt 记录已创建，尚未形成不可变 Binding |
| `BINDING` | 正在解析 Model、Skill、Runtime、Tool、Context、权限、仓库和资源配置 |
| `QUEUED` | Binding 已持久化并校验，等待带 Fencing Token 的 Capacity Lease |
| `PROVISIONING` | 正在创建或恢复 Sandbox、挂载代码并申请短期 Secret Lease |
| `RUNNING` | Agent 正在执行 |
| `WAITING_INPUT` | 已持久化结构化问题和 Checkpoint，等待用户输入，不代表 Human Gate |
| `WAITING_CHILD` | Parent 已完成持久化 Handoff并释放自身运行资源，等待 Child 终态 |
| `FINALIZING` | 正在固化 Artifact、日志、Checkpoint、结果并回收资源和凭据 |
| `SUCCEEDED` | 本次 Attempt 成功结束 |
| `CANCELING` | 正在幂等停止 Parent/Child、Fence 副作用、固化结果并回收 Lease/Credential |
| `CANCELED` | 安全取消完成 |
| `FAILED` | 本次 Attempt 发生不可恢复错误 |
| `TIMED_OUT` | Deadline 到期且安全终止完成 |

### 10.3 转换 Guard

- `CREATED → BINDING` 前必须关联 Run、WorkItem 和当前有效 Assignment。
- `BINDING → QUEUED` 前必须完整持久化不可变 Binding、校验结果和 Audit；解析失败进入 `FAILED`。
- `QUEUED → PROVISIONING` 必须获得唯一且受 Fencing 保护的 Sandbox Capacity Lease。
- `PROVISIONING → RUNNING` 必须确认 Sandbox、代码与分支、Network Policy 和短期 Secret Lease 均已就绪。
- 正常结束必须先进入 `FINALIZING`，不得直接进入 `SUCCEEDED`。
- 取消和超时必须经过 `CANCELING`，不得从活动状态直接写终态。
- 安全终止必须固化可保存状态，停止全部非终态 Child，Fence 外部副作用并回收 Credential/Lease。

### 10.4 `WAITING_INPUT`

- 等待期限为版本化 Platform Policy，默认 `24h`，不写死在业务代码中。
- Attempt 建立 Binding 时保存实际等待期限和 Policy Version；之后的配置变化不追溯修改该 Attempt。
- 进入等待状态前必须持久化结构化问题、Checkpoint、日志和 Artifact，释放活动计算资源并吊销短期 Secret。
- 用户在期限内回复时重新校验当前访问权限、WorkItem Assignment 和控制 Capability。
- 校验通过后，同一个 Attempt 回到 `QUEUED`；重新获得 Lease 后才进入 `PROVISIONING` 和 `RUNNING`。
- 超时后通过 `CANCELING` 进入 `TIMED_OUT`；迟到回复不能复活旧 Attempt，需要继续时基于旧 Checkpoint 创建新 Attempt。

### 10.5 `WAITING_CHILD`

- 首发同一 Parent Attempt 任一时刻最多存在一个非终态 Child；可顺序创建多个，但不能并行拆分绕过容量上限。
- Parent 只有在持久化 Child Binding、Checkpoint、Artifact/日志位置和关联 ID，并可靠释放自身 Lease、Sandbox 与短期 Credential 后，Child 才能启动。
- Child 使用独立 Execution ID、Binding、Build Lease、Credential、Workspace 与 Fencing Token。
- Child 终态先固化结构化结果、Artifact、日志、结束原因和 Audit，再释放资源。
- Parent 只有在仍处于 `WAITING_CHILD`、未被取消/归档/删除/超时且 Binding 与结果有效时，才可回到 `QUEUED`。
- Child 失败本身不自动终结 Parent；Parent 恢复后按 Tool/Workflow Policy 决定处理，只有 Parent 自身不可恢复错误或 Deadline 才形成其终态。
- Parent 取消、Requirement 归档/删除或 Deadline 到期必须级联取消非终态 Child；迟到 Child 结果只进入 Audit，不能复活 Parent。

### 10.6 终态与重试

`SUCCEEDED`、`CANCELED`、`FAILED` 和 `TIMED_OUT` 都是不可逆终态。业务重试创建新 Attempt，并记录来源 Attempt 与原因。Temporal Activity 可以在同一 Attempt 内对瞬时基础设施错误做有界重试，但不能更换 Binding。

Attempt 终态不会自动成为 WorkItem 或 Requirement 终态。每次状态变化、Guard 失败、取消、超时和重试关系都必须通过 Correlation ID 贯穿 Run、Attempt、WorkItem 与 Requirement，并写入 Audit。

## 11. Artifact 与附件

### 11.1 分类和权威来源

统一 Artifact 元数据覆盖：

- 用户上传附件；
- 平台生成的 Spec、Plan、测试报告和完整 Attempt 日志；
- 截图及其他可下载流程证据；
- 外部 Registry、Jenkins 或 GitLab 产物的稳定 Reference。

Git Working Tree、源码和 Commit 的权威副本在 GitLab，不复制到 Object Storage。大型 Build、Container Image、安装包和专业 CI 产物保存在 Jenkins、GitLab Package/Container Registry 或可替换 Artifact Registry；平台只记录稳定 URL/External ID、版本、SHA-256、大小、来源、时间与验证状态。

### 11.2 配额

用户附件首发默认值：

| 维度 | 默认值 |
| --- | ---: |
| 单附件 | `50 MiB` |
| 单 Requirement 用户附件合计 | `200 MiB` |

Agent Artifact 首发默认值：

| 维度 | 默认值 |
| --- | ---: |
| 单 Object | `100 MiB` |
| 单 Attempt 合计 | `500 MiB` |
| 单 Requirement 全部 Attempt 合计 | `1 GiB` |

- 所有限额均为版本化 Platform Policy，只允许 Super Admin 受控配置；第一阶段不实现 Workspace/Project 多级覆盖。
- 当前用量达到任一限额 `80%` 时预警，超过限额拒绝新的上传或 Artifact 创建。
- Scanner `100 MiB` 单对象 Envelope 是独立 Security Floor；提高产品单 Object 上限时必须同步通过 File Security 与基础设施容量验证。
- 平台生成的 Spec、Plan、测试报告和日志不计入用户附件 `200 MiB`，但计入对应 Agent Artifact 配额。
- Agent Artifact 超额时 Attempt 安全停止并进入 `FAILED`，记录 `failureCode=RESOURCE_EXHAUSTED`、`failureDimension=ARTIFACT_QUOTA`、命中层级和实际用量；不得静默截断证据。
- 降低配额不使既有 Artifact 失效。

仍被实际保留的 Object Version 都占用额度，包括：

- `AVAILABLE`；
- 待校验或待扫描；
- `QUARANTINED`；
- 归档或逻辑删除 Requirement 下的附件；
- 已写入 Object Storage 但尚待对账的 Object Version。

只有未来正式物理清除确认 Object Version 已删除后，业务数据额度才可释放。归档或逻辑删除不能用来绕过真实存储成本。

### 11.3 双 Ledger 预占

上传初始化必须在受控事务/Reservation 流程中同时满足：

1. Product Quota Ledger：单 Object、Attempt、Requirement 等产品额度；
2. Environment Bucket-Class Capacity Ledger：环境级 Bucket 容量与安全水位。

Backend 先按声明大小原子预占，成功后才签发 Presigned Request。并发上传共享同一 Requirement 配额并受一致的锁或 CAS 保护；任一 Ledger 失败都不能签发上传请求。

完成、失败、过期和对账必须按精确 Object Version 分别调账。不得通过直接修改累计数字掩盖长期预占、孤立对象或 Object 泄漏。

### 11.4 上传状态

Artifact Version 可用性主路径为：

```text
PENDING_UPLOAD
→ PENDING_VERIFICATION
→ PENDING_SCAN
→ AVAILABLE

异常状态：UPLOAD_FAILED | QUARANTINED | SCAN_FAILED
```

`EXPIRED` 与 `ORPHANED` 属于 Upload Session/技术垃圾对账分类，不代表一个已经可供业务使用的 Artifact Version。

流程为：

1. Backend 实时校验 Capability、Scope、Workspace/Requirement 关系、File Type Policy 和额度。
2. 创建不可变 Artifact Version 元数据和不含用户文件名的服务端 Object Key。
3. 签发只绑定 Bucket、Object Key、操作、预期大小、MIME 与 SHA-256 的短期 Presigned Request；默认有效期 `5min`，可配置。
4. Frontend 上传后只提交完成确认，不能自行声明成功。
5. Backend 通过 Object Storage Adapter 获取精确 Version ID，验证实际大小、MIME 和 SHA-256。
6. 需要扫描的对象进入 `PENDING_SCAN`；只有扫描结果为 `CLEAN` 才进入 `AVAILABLE`。

相同 Upload ID 和结果的完成重试必须幂等。缺失 Object、越权完成、冲突结果或完整性不一致进入 `UPLOAD_FAILED` 并写 Audit。

PostgreSQL 只保存 Bucket Logical ID、Object Key、Version ID、SHA-256、大小、声明/检测 MIME、原文件名、状态、Owner、Requirement/Attempt 关系和时间等稳定元数据，不保存 Presigned URL 或 S3 Secret。

### 11.5 下载

- Backend 每次下载前重新校验当前 Capability、Scope、业务关系和 Artifact 状态。
- 只对准确 `AVAILABLE` Object Version 签发短期 Presigned GET，默认有效期 `5min`，可配置。
- 原始文件名只作为安全编码后的展示信息和 `Content-Disposition`，不参与 Object Key。
- Browser 不取得 Bucket Credential、Admin API 或可列举 Bucket 的临时身份。
- Presigned URL 是短期敏感信息，不得持久化，也不得进入 Frontend、Backend、Ingress、Audit 或 Observability 的完整日志。

### 11.6 File Type 与安全扫描

允许文件类型由版本化全局 `Artifact File Policy` 管理，不在 Frontend 或领域代码中写扩展名分支。只有 Super Admin 可以发布配置。

首发可配置目录只包含 File Security 能够完整识别和检查的已知类别。未知格式、可执行文件、安装包、动态链接库、含宏文档、加密或密码保护容器默认不可用；管理员不能通过新增任意扩展名宣称一种格式安全。

上传初始化先按文件名和声明 MIME 前置拒绝，上传完成后仍按内容特征、检测 MIME 和扫描结论复核。任一不一致都 Fail Closed。即使某个默认禁止但可完整扫描的类别后来被允许，也必须继续扫描，并强制下载而非浏览器内联执行。

用户上传、外部 Connector 导入和包含外部二进制内容的 Agent Artifact 必须异步扫描。内部受信流程生成且类型受约束的纯文本 Spec、Plan 和日志，可以按版本化 Policy 跳过扫描。调用方不能自行声明“可信”。

扫描结果归一化为：

```text
CLEAN | MALICIOUS | SUSPICIOUS | ERROR
```

- `CLEAN` 才能进入 `AVAILABLE`。
- `MALICIOUS` 或 `SUSPICIOUS` 进入 `QUARANTINED`。
- Engine 不可用、Signature 过期、超时或解析失败保持 Fail Closed，并按有界退避重试；超过次数进入 `SCAN_FAILED`。
- `QUARANTINED` Artifact 不向用户、普通管理员、Workflow 或 Agent 签发下载地址，首版不提供人工放行或自动物理删除。
- File Security 通过可替换 `FileSecurity Port` 接入；领域模型不依赖具体引擎协议。

### 11.7 Versioning、Object Lock 与清理

- Requirement Attachment 与普通 Agent Artifact 默认启用 Versioning，不自动施加 Object Lock。
- 与已完成 SDD Decision、最终验收、Merge、发布或其他正式证据绑定的 Artifact Version 标记为关键 Artifact，并使用 `GOVERNANCE` Object Lock。
- 普通 Super Admin 不默认拥有 Object Lock Bypass；Break-glass 必须独立授权、填写原因并完整审计。
- Requirement 归档、逻辑删除或恢复不创建 Object 删除标记，不绕过 Versioning/Object Lock。

Upload Session 与技术垃圾默认清理规则：

| 场景 | 默认值 | 结果 |
| --- | ---: | --- |
| Session 到期且 RGW 无 Object | `1h` | `EXPIRED` 并释放预占 |
| RGW 有 Object 但无有效 Artifact 引用 | `7d` | `ORPHANED`，等待修复与对账 |
| 未完成 Multipart Upload | `24h` | Bucket Lifecycle Abort |

这些时间都是版本化、受校验的 Cleanup Policy。缩短 Policy 不得让既有 `ORPHANED` Object 立即跨越原保护窗口；Eligibility 保存当时 Policy Version。

物理删除技术垃圾前，必须按精确 Bucket、Object Key 和 Version ID 再次交叉校验 Artifact、Quota、Object Lock/Retention 与业务引用。只有从未被业务接受且不受保护的技术垃圾可清理。`AVAILABLE`、`QUARANTINED`、归档、逻辑删除、关键 Artifact、Audit 与 Backup 不进入该自动清理流程。

## 12. 归档、恢复与逻辑删除

### 12.1 三种记录状态

```text
recordState = ACTIVE | ARCHIVED | DELETED
```

`recordState` 与 Requirement 主状态正交。归档或删除不能改写原业务进度、Decision、Attempt、Artifact、Commit 或 Audit。

### 12.2 归档

- 归档后 Requirement 从普通列表隐藏，在独立归档视图只读展示。
- 如果存在活动 Attempt 或非终态 Child Execution，归档命令先进入安全停止流程。
- 必须停止 Parent 与 Child、Fence 外部副作用、固化 Commit/Checkpoint/Artifact/日志、吊销短期 Credential 并释放 Lease。
- 在无法证明执行已停止和 Fence 生效前，不能完成归档。
- 归档后不得让用户不可见的 Agent 继续产生变更。

### 12.3 恢复

- 恢复契约同时适用于具备恢复资格的 `ARCHIVED` 与 `DELETED` 记录；它按受审计的删除/归档前快照恢复记录可见性，并恢复原 Requirement 主状态的继续入口。
- 旧 Attempt 和 Child Execution 终态不可复活。
- 用户要求继续时，系统基于原主状态、最新 Commit、已有 Artifact、Checkpoint 和当前 Assignment/权限创建新 Attempt 或继续动作。
- 恢复后仍须重新校验当前 Capability、Scope、Membership、Repository Binding、Gate 有效性和 Policy。

恢复的价值是继续原 Requirement 的业务进度，而不是重新执行已经终结的技术进程。

### 12.4 逻辑删除

- 删除 Requirement 只改变为 `recordState=DELETED`，进入独立 Deleted 视图。
- 删除活动 Requirement 时使用与归档相同的安全停止、Fence 和固化契约。
- 第一阶段不做物理清除，也不实现没有真实行为的 Legal Hold 表、字段、API 或模块。
- 删除、查看 Deleted 和恢复分别受 Capability + Scope 控制。
- `requirement.deleted.read` 与 `requirement.deleted.restore` 是细粒度能力；创建人也不能绕过能力校验。
- 未来物理清除必须与 Retention、Legal Hold、清除资格、人工审批、级联范围、备份影响和销毁证明整体设计，不能只增加删除按钮。

### 12.5 Audit 独立性

Audit 不是 Requirement 删除表。归档、恢复和逻辑删除本身都产生追加式 Audit，既有 Audit 不因业务记录状态变化而删除、覆盖或重写。

## 13. 集成、测试与最终验收

### 13.1 `dev` 集成

每个 WorkItem 的交付顺序是：

```text
task branch（from main）
→ Integration MR：task branch → dev
→ 开发人员在独立 Jenkins 中手工构建/测试
→ Requirement Integration Baseline
→ 最终验收
→ Formal MR：task branch → main
```

Integration MR 不需要 Leader 人工审核，开发人员可以自行合并，但仍受 GitLab 确定性检查和分支保护约束。`dev` 使用 merge commit 保留集成上下文。

同一任务分支依次进入 `dev` 和 `main`，不建立固定 `main → dev` 同步步骤。`dev` 可以同时包含尚未进入 `main` 的其他工作。

### 13.2 Jenkins 边界

Jenkins 是独立平台：

- 用户手动触发和查看构建/测试；
- 研发平台首版不调用 Jenkins；
- 研发平台不读取 Jenkins 状态；
- Jenkins 状态不是平台自动 Gate；
- 用户可以向 Requirement 提交外部验证声明和 Artifact Reference，平台只记录提交人、时间、目标 Commit、Reference 与说明，不伪造 Jenkins 成功事实。

### 13.3 冻结 Integration Baseline

所有必需 WorkItem 完成 `dev` 集成、测试和外部人工验证后，平台冻结 Requirement Integration Baseline。冻结时必须绑定准确 Commit 和 Artifact hash，而不是读取当时会继续变化的分支 HEAD。

任何必需 WorkItem 的 Commit、Artifact 或测试证据变化，都会使既有 Acceptance Decision 失效；重新冻结 Baseline 后再次验收。

### 13.4 最终验收

- 最终验收默认责任人是 Requirement 创建人，可异步改派。
- 实际验收人必须是 Current Acceptance Assignment assignee，并具备要求的 Capability、Scope 和有效 Membership。
- Acceptance Decision 绑定准确 Requirement 版本、验收标准和 Integration Baseline。
- 验收通过且 Decision 仍有效后，才允许为各 WorkItem 创建 Formal MR。
- 验收不通过时，相关 WorkItem 回到 `IN_PROGRESS` 或增加修正 WorkItem；未通过交付不能进入 `main`。
- 范围扩大为新能力时创建关联 `feat` Requirement，而不是改写原验收历史。

## 14. Formal MR 与合并

### 14.1 创建

开发人员确认外部测试完成且 Requirement 最终验收有效后，在平台执行“一键创建 MR”：

- Model 生成 MR title/description；
- GitLab Connector 创建 `task branch → main` MR；
- 创建命令必须幂等，重复点击返回已有 MR；
- 首版不要求先展示 Modal 预览。

`main` 是受保护分支，Human 和 Agent 都不能直接 Push。Formal MR 使用 squash merge，成功后自动删除 source branch；分支清理失败只形成运维待办，不回退已完成业务事实。

### 14.2 MR 审核人

Formal MR 与 SDD 使用独立 Policy 和 Assignment。默认解析依据 WorkItem 当前 `humanOwnerId`：

- 人类负责人是普通开发人员时，默认审核人为其直属 Leader；
- 人类负责人本身是 Leader 时，默认审核人为其本人；
- Agent 执行仍沿用 WorkItem 人类负责人的审核路由；
- 无法解析合格审核人时 Gate 阻塞，等待受控改派。

默认 Leader 可以把实际审核人改派给任何具备 `merge_request.review` 和有效 Scope 的候选人，包括 MR 作者本人。Leader 是默认路由来源，不是硬编码审批岗位。

只有当前 Review Assignment assignee 可以作出 Decision。`merge_request.review` 只代表审核资格，`merge_request.merge` 是独立 Capability。

### 14.3 Review 失效与返工

- Approval 绑定准确 `headSha`。
- Approval 前 head 变化使旧检查和 Decision 失效，必须重新审核。
- 审核人要求修改时继续使用同一 WorkItem、同一分支和同一 MR，不自动新建 `fix` Requirement。
- WorkItem 回到 `IN_PROGRESS`，修改后重新走验证、Integration Baseline、Acceptance 与 MR Review 的必要失效链路。
- MR 批准后冻结 source branch，禁止继续 Push；批准后确需新改动时按新的 `fix` 或 `feat` Requirement 处理。

### 14.4 完成条件

WorkItem 在自己的 Formal MR 合并 `main` 后进入 `COMPLETED`。Requirement 只有同时满足以下条件才进入 `COMPLETED`：

1. Acceptance Decision 对当前 Integration Baseline 仍有效；
2. 所有必需 WorkItem 的 Formal MR 已合并 `main`；
3. 不存在仍应计入完成条件的未完成 WorkItem。

多仓库只完成部分 MR 时，Requirement 保持 `AWAITING_MERGE`，并显示每个 WorkItem 的准确状态。

## 15. 并发、失败与恢复

### 15.1 乐观并发

以下命令必须校验当前 Revision/ETag 或等价版本：

- WorkItem 分配和改派；
- Repository Binding；
- SDD、Acceptance 和 MR Review Assignment；
- Gate Decision；
- Requirement/WorkItem 状态转换；
- 归档、恢复和逻辑删除；
- Artifact 完成确认和配额 Reservation。

并发冲突必须返回明确 Conflict，由调用方读取最新状态后重试；不得以后写覆盖先写。

### 15.2 外部事实

GitLab、Object Storage、Agent Orchestrator 和 File Security 操作可能与平台事务分离。平台使用稳定 Idempotency Key、Outbox/Inbox、Reconciliation、外部对象 ID 和准确版本收敛，但不能把“已发请求”记录成“外部已成功”。

外部状态未知时显示 `UNKNOWN`、阻塞原因或待对账状态，不伪造分支、Object、MR、扫描或 Child Execution 成功。

### 15.3 失败影响

| 失败 | 当前对象结果 | 上层影响 |
| --- | --- | --- |
| Attempt 不可恢复失败 | Attempt `FAILED` | WorkItem 保持可处理，允许新 Attempt |
| Attempt 超时 | 经 `CANCELING` 后 `TIMED_OUT` | WorkItem 记录阻塞，不自动终结 |
| Artifact 超额 | Attempt 安全停止并 `FAILED` | 保留已有证据，等待配置或交付策略处置 |
| 上传/扫描失败 | Artifact 不可用 | Workflow Gate Fail Closed，Requirement 不自动失败 |
| MR head 变化 | Review Decision 失效 | 回到必要 Review/验证环节 |
| Acceptance Baseline 变化 | Acceptance Decision 失效 | 禁止创建或继续合并依赖旧验收的 Formal MR |
| 归档/删除 | 级联安全停止运行 | 主状态和历史保留，recordState 改变 |

## 16. 配置与 Audit

### 16.1 可配置项

以下产品行为使用版本化 `PLATFORM_POLICY`，由 Super Admin 通过统一 Configuration ChangeSet 发布：

- Gate 默认解析规则和允许的 Workspace Override；
- 用户附件和 Agent Artifact 配额；
- Artifact File Type Policy；
- Presigned Request 有效期；
- `WAITING_INPUT` 期限；
- Upload Session、Orphan 和 Multipart Cleanup 时间；
- 扫描重试等受约束参数。

业务对象保存解析后的 Effective Value 与 Policy Version。配置回滚创建新版本，不修改历史。可配置项不能越过 Human Gate、Capability、Version Binding、Scanner Envelope、Private Bucket、短期授权和 Audit 等 System Invariant。

### 16.2 Audit 范围

至少以下事实必须追加式审计：

- Requirement 与 WorkItem 创建、类型、分配、改派和状态转换；
- Repository 选择、Binding、分支和替代关系；
- Route、Skill/Bundle 和 Execution Binding；
- Gate Policy 解析、Assignment、Override、Decision 和失效；
- Artifact 上传、下载授权、验证、扫描、隔离、额度和对账；
- Attempt、Child、取消、超时、重试、Fence 和 Credential/Lease 回收；
- Integration Baseline、外部验证声明、Acceptance、MR Review 和 Merge；
- 归档、恢复和逻辑删除；
- 配置发布、回滚和命中版本。

Audit 记录 actor/Workload Identity、原因、Scope、对象版本、前后状态、Correlation ID 和结果。Audit 独立于业务删除，不能由 Requirement 生命周期清理。

### 16.3 运维可见性

平台管理后台只读展示：

- 各 Requirement、WorkItem、Attempt 和 Child 状态及阻塞原因；
- 未分配、待仓库绑定、待确认、待验收和待 MR Review 数量与年龄；
- Artifact 配额、Reservation、孤立对象、扫描积压和失败；
- Archive/Deleted 数量及安全停止进度；
- Agent Queue、Lease、Fence、取消和恢复；
- GitLab、Object Storage、File Security 与 Agent Adapter 健康；
- Policy Version、Assignment、Decision 失效原因和 Audit 入口。

管理后台不能直接修改 GitOps/基础设施参数，也不能通过展示页面绕过领域命令和 Capability。

## 17. 架构验收场景

### 17.1 创建人与审核人

- 创建任一类型 Requirement 后立即保存默认 SDD Reviewer 为创建人。
- 不进行改派时，当前 Reviewer 始终明确。
- 默认 Reviewer 可以异步改派合格候选人；普通被改派人不能继续转派。
- 创建人不具备 Gate Capability 时不能自审，只能改派。

### 17.2 多仓库 WorkItem

- 创建 Requirement 时必须选择一个初始仓库，第一个 WorkItem 自动绑定。
- 后续 WorkItem 可先 `WAITING_REPOSITORY`，仓库绑定前不能启动。
- 分支创建后选错仓库时，原 WorkItem 保留为 `SUPERSEDED`，新 WorkItem 使用新 Binding。

### 17.3 SDD 与 Superpowers

- `feat` 使用 Superpowers 完整 SDD；`fix` 使用 `systematic-debugging`、TDD、验证和代码评审，不重复 Product SDD。
- 首版不存在 `grill-me` Route。
- 任何实际启用的 SDD 都必须由当前合格 assignee 确认，Agent 不能代签。

### 17.4 Attempt 隔离

- Attempt 失败不把 WorkItem 或 Requirement 直接置为失败终态。
- 更换 Model、Skill、Runtime 或 Policy 会创建新 Attempt。
- `WAITING_INPUT` 在期限内恢复同一 Attempt；超时后创建新 Attempt。
- Parent 进入 `WAITING_CHILD` 后释放自身运行资源；归档 Requirement 会安全取消 Parent 与 Child。

### 17.5 Artifact

- 并发上传不能突破 Requirement 总配额。
- 非 `AVAILABLE` Artifact 不能下载或进入 Gate。
- 归档、删除或隔离不释放仍保留 Object Version 的额度。
- Presigned URL 不进入持久化数据和日志。
- Agent Artifact 超额会安全停止 Attempt，保留既有证据并报告准确资源维度。

### 17.6 归档、恢复和删除

- 归档运行中 Requirement 前，所有相关执行均完成 Fence、固化与资源回收。
- 恢复后回到原业务进度，但旧 Attempt 不复活；继续执行创建新 Attempt。
- 删除只进入 Deleted 视图，不物理清除 Artifact 或 Audit。
- 创建人没有相应 Capability 时不能删除、查看 Deleted 或恢复。

### 17.7 验收与 MR

- Integration Baseline 绑定每个必需 WorkItem 的准确 Commit 与 Artifact hash。
- 最终验收通过前不能创建 Formal MR。
- MR head 变化使 Review Decision 失效。
- 审核要求修改继续同一 WorkItem、分支和 MR，不自动创建 `fix`。
- 所有必需 MR 合并且 Acceptance 仍有效后，Requirement 才能 `COMPLETED`。
