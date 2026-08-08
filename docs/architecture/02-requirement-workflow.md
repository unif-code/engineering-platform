# Requirement Workflow

> 实施阶段、激活状态和 Release 验收见 [12 实施路线图详细说明](./12-implementation-roadmap.md)。

## 1. 责任边界与治理

本文是 Requirement、WorkItem、Route、人工 Gate、业务责任 Assignment、Decision、Artifact 与 `RequirementIntegrationBaselineSelection` 的唯一规范事实源。它拥有 Requirement 何时选定或冻结当前证据引用、Acceptance 绑定与失效以及业务状态，不定义 `IntegrationBaselineEvidence` 的 Git/MR/Artifact 证据结构、人员资格、Agent 内部执行、Sandbox 物理资源、GitLab Adapter 或对象存储实现。`IntegrationBaselineEvidence` 只由 [Source Control 与交付](./05-source-control-delivery.md)拥有。

人员、Capability、Scope、Membership、账号与 Session 的有效性由[身份、组织与授权](./01-identity-organization-authorization.md)拥有。Workflow 在每次受保护命令中调用该 owner；Assignment 只说明当前责任，永不授予资格或扩大范围。

受控业务行为依以下顺序收敛：

```text
System Invariant / Security Floor
→ Platform Gate Policy
→ Workspace Gate Policy Override
→ Capability + Scope + Membership
→ Current Assignment
```

System Invariant 不可由 Policy 关闭。Platform Policy 与允许的 Workspace Scope Override 均由 Super Admin 发布；Requirement 本身不建立 Policy，Workspace 成员也不能发布 Gate Policy。对象保存解析结果与 Policy Version，后续变更只作用于尚未形成快照的事实。

### 目标与边界

Requirement Workflow 将一项业务交付从创建、基线确认、实现、验证、验收直到合并完成串为可追溯流程。它拥有 Requirement、WorkItem、Route、Gate、Decision、Artifact 与 `RequirementIntegrationBaselineSelection` 的业务语义；不拥有人员资格、Agent 执行实现、Sandbox 物理形态、GitLab 协议细节或 `IntegrationBaselineEvidence` 的证据结构。

## 2. 领域对象与版本

### 2.1 Requirement 与 WorkItem

Requirement 是整体交付聚合，至少关联 Workspace、创建人、不可静默变更的类型、初始仓库、Route Snapshot、状态、recordState、必需 WorkItem、Gate、Artifact、`RequirementIntegrationBaselineSelection`、乐观并发版本与 Audit 关联。

类型只能为：

```text
feat | fix | refactor | chore
```

语义发生范围扩展时创建有关联关系的新 Requirement，而不是改变既有类型、基线或历史。

WorkItem 是单一仓库中的可分配交付，分别记录 `createdBy`、`humanOwnerId`、`executorType/executorId`、`requiredCapabilities`、分配/仓库状态、唯一 Repository Branch Binding、Attempt、Artifact 与交付引用。一个 Requirement 可逐步增加 WorkItem；同一仓库的不同 WorkItem 仍各自拥有独立任务分支。

`createdBy` 仅是历史事实。Agent 可以是 executor，但 WorkItem 始终保留人类负责人，且 Agent 不能成为 Gate、MR 或验收责任人。

### 2.2 版本绑定

Route、Gate、Attempt 与 Artifact 在形成时保存 Effective Policy 与解析快照。Decision 必须绑定 subject、准确版本/hash、Current Assignment 与决策时资格快照；Acceptance Decision 还绑定当前 `RequirementIntegrationBaselineSelection`。

Requirement Aggregate 为必需 WorkItem 集合维护单调递增的 `requiredWorkItemSetVersion` 与规范化 `requiredWorkItemSetHash`；增加、移除、替换必需 WorkItem，或改变其是否计入最终交付时必须更新二者。提供给 05 owner 的 `RequirementDeliverySnapshot` 至少保存 `requirementId`、当前 `requirementVersion`、`requiredWorkItemSetVersion/hash` 与全部必需 WorkItem 稳定 ID，并作为 Evidence 生成输入。

创建 `RequirementIntegrationBaselineSelection` 是 Requirement Aggregate 的受保护 CAS 命令。命令必须携带 `expectedRequirementVersion`，并在同一事务中验证：Evidence 的 `requirementId` 与当前 Requirement 相同；Evidence 的 `requiredWorkItemSetVersion/hash` 与当前集合一致；Evidence 对当前全部必需 WorkItem 一一覆盖且无额外替代项；每项 Commit、Artifact 与验证引用仍是当前可接受版本。成功后 Selection 保存 `integrationBaselineId/hash`、Evidence 的 Requirement/集合版本、选择时间、选择前后 Requirement Version 与当前状态，并原子提升 Requirement Version、写入 Outbox/Audit。CAS、集合或逐项覆盖任一不匹配均返回明确 Conflict，调用方重新读取 Requirement、重新生成 Evidence 或重新选择；禁止 Last-write-wins、部分覆盖或静默重试旧 Evidence。

Artifact Version、Commit、交付 head SHA、Route Bundle、必需 WorkItem 集合或其他被确认输入变化时，当前 Selection 与旧 Acceptance 失效而历史保留。仅与交付快照无关的展示变化不能伪造集合变化；是否影响 Selection 必须由 Requirement 领域命令显式判定。

完成的 Decision、Attempt、Artifact 与 Audit 始终保存原 actor，不因组织、授权或 Assignment 后续变化而重写。外部交付的准确 Commit、分支与 MR 事实由[Source Control Delivery](./05-source-control-delivery.md)提供，本领域只保存稳定引用。

### 对象地图

```text
Requirement
├── Route Snapshot
├── Gate Instance → Assignment → Decision
├── WorkItem × 1..n
│   ├── Human Assignment / Repository Branch Binding
│   ├── Route / test / external-validation Artifact
│   ├── delivery reference
│   └── Run → Attempt × 1..n（受控执行扩展）
├── RequirementIntegrationBaselineSelection → IntegrationBaselineEvidence reference
└── recordState
```

- `Requirement` 是整体交付与验收聚合。
- `WorkItem` 是一个仓库中的可交付责任；一个 WorkItem 最终只对应一个仓库与任务分支。
- `Run` 表示执行目标，`Attempt` 表示一次固定执行输入的尝试；其运行语义由[Agent、Skill 与 Model](./03-agent-skill-model.md)拥有。
- `Artifact` 是可准确版本绑定的流程证据，而不是源码或持续变化分支的替代品。

## 3. 创建、分配与仓库选择

创建 Requirement 必须提供 Workspace、类型、标题、描述、必要背景和一个初始 GitLab Project/Repository。平台 Project 直接对应 GitLab Project，不创建平行代码项目实体；没有初始仓库不得创建 Requirement。仓库选择不按岗位或专业分类强制。

首个 WorkItem 自动继承初始仓库。若创建人同时满足所需 Capability、Scope、Membership、仓库访问及资源 Guard，可成为 `humanOwnerId` 与 Human executor；否则创建成功但 WorkItem 为 `UNASSIGNED`，系统发出待分配通知。

后续 WorkItem 可先有负责人而保持：

```text
repositoryState = WAITING_REPOSITORY
```

负责人在授权范围内选择仓库；操作人仍须有仓库绑定资格。未绑定时不得建分支、启动 Human/Agent 执行或创建 Integration/Formal MR。仓库和分支已创建后，发现选错仓库须将原 WorkItem 标为 `SUPERSEDED` 并创建替代 WorkItem；原 Binding、Attempt、Artifact 和 Audit 保留，被替代项不再计入完成条件。分支命名、Binding Saga 和交付协议只见[Source Control Delivery](./05-source-control-delivery.md)。

创建 WorkItem 的默认 Assignment 为：

```text
创建人具备 requiredCapabilities + Scope + Membership
  → humanOwnerId = 创建人，executor = 创建人，ASSIGNED
否则
  → UNASSIGNED
```

仅有 `work_item.assign` 与对应 Scope 的人员可分配；候选人必须是有效 Workspace 成员并满足执行、仓库访问与资源条件。并发分配只接受基于当前版本的第一笔有效写入。`UNASSIGNED` 可被保存、查看和通知，但不能启动执行、修改代码或创建 Formal MR；系统不能随机补选执行者。

未启动 WorkItem 可受控改派。运行中改派必须先安全停止当前 Attempt 或等待其终态，固化 Commit、Checkpoint、日志和 Artifact 后，以新 Assignment 启动新 Attempt；不得修改旧 Attempt 的责任或 Binding。

## 4. Route 与交付基线

| 类型 | Route 基线 | 确认要求 |
| --- | --- | --- |
| `feat` | 完整 SDD | 每份实际启用的 SDD 均确认 |
| `fix` | `systematic-debugging`、TDD、验证、代码评审 | Debug/Route Baseline 确认 |
| `refactor` | Route Snapshot 指定的技术基线与验证 | 实际启用部分确认 |
| `chore` | Route Snapshot 指定的技术基线与验证 | 实际启用部分确认 |

`feat` 的当前 SDD 顺序是 `brainstorming → writing-plans → test-driven-development → verification-before-completion → requesting-code-review`。Workflow 固定 Route、阶段输入输出、Artifact、Gate 与恢复；Skill 的内部方法由[Agent、Skill 与 Model](./03-agent-skill-model.md)拥有，执行时使用版本化 Superpowers Runtime Bundle。

每条 Route 将可审计结论固化为结构化、可版本绑定 Artifact：

- `feat`：产品行为、异常/空状态、验收标准、Product Plan；涉及 UI 时包含真实 WorkItem 分支上的可运行页面、受控 Mock、Preview 与验证证据。
- `fix`：复现、根因、失败回归测试、修复结果与验证证据。
- `refactor`、`chore`：影响范围、风险、技术计划与验证清单。

后端 WorkItem 新增或变更 API 时，必须交付版本化、机器可读并已校验的 API Contract，覆盖输入输出、错误、认证授权、幂等/重试、枚举/空值、示例、Schema Version 与兼容性。前端 WorkItem 使用当前确认的 Route Baseline 和适用 Contract，不重写已完成的产品 SDD。Mock 与实际 Contract 有阻塞差异时，必须更新 Artifact、Contract 与受影响 Gate。

每一份实际启用的 Product、Backend 或 Frontend SDD 都独立经历确认与失效；上游确认不能跳过下游实际启用 SDD 的 Gate。Route 类型、Bundle、Skill、Artifact 或 Policy 变化不得改写运行中的 Attempt；需要新产品能力时创建关联 `feat` Requirement。

## 5. Gate、Assignment 与 Decision

人工 Gate 统一为：

```text
GatePolicy
→ GateInstance(subjectType + subjectId + subjectVersion/hash)
→ Current Assignment
→ Decision
```

稳定 Gate Type 仅表达业务责任：

| Gate Type | subject | 责任 |
| --- | --- | --- |
| `REQUIREMENT_BASELINE_CONFIRMATION` | Route 的 SDD、Debug Baseline 或技术基线版本 | 确认可执行基线 |
| `REQUIREMENT_ACCEPTANCE` | 冻结的 `RequirementIntegrationBaselineSelection` | 最终验收 |
| `FORMAL_MR_REVIEW` | Formal MR 的精确 `headSha` | 人工代码 Review |

Decision 结果枚举固定为 `APPROVED`、`CHANGES_REQUESTED`、`REJECTED`，新增结果属于 Contract 变更；岗位不能编码进 Gate Type 或结果。Formal MR 的默认路由、Review Assignment 与 `headSha` 失效由[Source Control Delivery](./05-source-control-delivery.md)唯一规定。

### 5.1 SDD 审核人

所有类型的 SDD/Baseline Confirmation 都使用同一默认回退：**默认审核人为 Requirement 创建人**。创建时按有效 Gate Policy 同步解析 `defaultReviewerId`，保存解析快照与 Policy Version，并初始化 `currentReviewerId = defaultReviewerId`；创建不等待人工选择，因此不存在无审核人的空状态。

默认审核人可以在 Gate 最终 Decision 前异步选择或改变当前审核人。正常路径只有 `defaultReviewerId` 对应人员可改派；实际被选审核人只负责 Decision，不能继续转派，除非其同时就是默认审核人。候选人必须实时满足 Gate 所需 Capability、Scope 与 Membership。Gate 到达确认点时等待 Current Reviewer；最终 Decision 形成后不得改派，新 Artifact 版本须形成新的 Gate/Decision 关系。

当默认审核人停用、离职或失去有效 Scope 时，具有 `sdd.reviewer.override` 的管理员可填写原因作恢复性改派。该能力不能跳过 Gate、资格、版本绑定或修改已完成 Decision。允许创建人或 Artifact 作者自审，但仅限其为当前 assignee 且资格实时有效时。Agent、AI Review、确定性检查、Connector Service Account 与系统管理员身份均不能代签。

### 5.2 验收责任

最终验收默认责任人为 Requirement 创建人，可按同一 Assignment 语义异步改派。只有 Current Acceptance Assignment 的 assignee，且具备所需 Capability、Scope 与 Membership，才可提交验收 Decision；创建人不具资格时必须改派给合格候选人。SDD 确认、WorkItem 实现、最终验收、MR Review 与 Merge 是相互独立的责任。

Acceptance Decision Snapshot 必须明确绑定 `requirementVersion`、`acceptanceCriteriaVersion/hash` 与当前 Selection 中的 `integrationBaselineId/hash`，并保存 Current Acceptance Assignment 及决策时资格快照。Requirement 版本、验收标准、当前 `RequirementIntegrationBaselineSelection` 或其引用的 Evidence 任一变化，都会使旧 Acceptance Decision 失效；旧结论及其快照完整保留，新验收必须针对当前三项版本重新作出。`requirementVersion` 是交付语义版本，只随验收标准、必需 WorkItem 集合、Route/基线与 Selection 等交付输入的变化递增；主状态转换与记录级并发使用独立的 Revision/ETag（见第 10 节），不递增 `requirementVersion`，因此验收通过后的 `AWAITING_MERGE` 与 `COMPLETED` 推进不会使当前有效 Acceptance Decision 失效。

## 6. 业务状态机

Requirement 主状态：

```text
CREATED → PREPARING → AWAITING_CONFIRMATION → READY → IN_PROGRESS
→ VERIFYING → AWAITING_ACCEPTANCE → AWAITING_MERGE → COMPLETED

逆向转换：
AWAITING_ACCEPTANCE →（验收拒绝）IN_PROGRESS
VERIFYING | AWAITING_ACCEPTANCE | AWAITING_MERGE
  →（基线或交付输入变化，按影响）IN_PROGRESS | VERIFYING

受控取消：除 COMPLETED 外任意状态 → CANCELED
```

| 状态 | 含义 |
| --- | --- |
| `CREATED` | 已持久化，正在初始化首项与外部绑定 |
| `PREPARING` | 形成 SDD、Debug Baseline 或技术基线 |
| `AWAITING_CONFIRMATION` | 等待当前 Route 的人工确认 |
| `READY` | 基线确认，可拆分、分配与准备执行 |
| `IN_PROGRESS` | 必需 WorkItem 正在实现或返工 |
| `VERIFYING` | 进行集成、测试和外部验证 |
| `AWAITING_ACCEPTANCE` | 当前 `RequirementIntegrationBaselineSelection` 已冻结，等待验收 |
| `AWAITING_MERGE` | 验收有效，等待必需交付审核/合并 |
| `COMPLETED` | 验收仍有效且所有必需 WorkItem 均完成合并 |
| `CANCELED` | 取消已完成相关活动执行的安全终止 |

WorkItem 主状态为：

```text
DRAFT → READY → IN_PROGRESS → VERIFYING → AWAITING_MERGE → COMPLETED

终止状态：CANCELED | SUPERSEDED
```

`DRAFT` 表示分配、仓库/分支、Gate 或 Guard 未齐；`READY` 表示这些条件齐备；`VERIFYING` 代表进入集成和外部验证；`AWAITING_MERGE` 只在 Requirement 验收仍有效且 Formal MR 已创建时成立；合并完成才进入 `COMPLETED`。MR 要求修改会回到 `IN_PROGRESS`，旧 Review 结论失效。

下列维度独立于上述业务状态：

```text
Requirement.recordState = ACTIVE | ARCHIVED | DELETED
WorkItem.assignmentState = UNASSIGNED | ASSIGNED
WorkItem.repositoryState = WAITING_REPOSITORY | BOUND
blockedReasons[] / Attempt.status / ChildExecution.status / delivery status
```

Attempt、Model、Adapter 或 Sandbox 的失败只产生可处置阻塞，不把 Requirement 或 WorkItem 直接标为失败。验收拒绝返回 `IN_PROGRESS`；基线或交付代码变化按影响回到 `IN_PROGRESS` 或 `VERIFYING`；多仓库仅部分合并时 Requirement 留在 `AWAITING_MERGE`。

### 主流程

```text
创建 Requirement 与初始仓库
→ 按 Route 形成基线与 Artifact
→ Human Gate 确认
→ 拆分、分配并启动 WorkItem
→ 实现与验证
→ 选定并冻结 IntegrationBaselineEvidence 引用
→ 最终验收
→ Formal MR 合并
→ COMPLETED
```

## 7. 集成、外部验证与验收

WorkItem 交付按 Source Control 的任务分支、`dev` 集成、外部人工验证、选定 Evidence、验收与 Formal MR 顺序进行。Jenkins 是独立平台：用户手动运行和查看，平台不调用、不读取其状态，也不将其当作自动 Gate；用户可提交带提交人、时间、目标 Commit、引用和说明的外部验证证据。

所有必需 WorkItem 完成集成、测试和外部人工验证后，02 owner 先冻结当前 `RequirementDeliverySnapshot`，05 owner 再根据该快照生成不可变 `IntegrationBaselineEvidence`，不能绑定持续移动的分支 HEAD。Requirement 通过上述 CAS 与覆盖校验创建并冻结指向该 `integrationBaselineId/hash` 的 `RequirementIntegrationBaselineSelection`。任一必需项的 Commit、Artifact、测试证据或必需集合变化都会形成新的 Evidence；02 owner 将旧 Selection 标记为不再当前并使旧验收失效，随后基于当前快照选择新 Evidence 并再次验收。

验收通过且仍对当前 `RequirementIntegrationBaselineSelection` 有效后，才允许创建各 WorkItem 的 Formal MR。Requirement 进入 `COMPLETED` 的条件同时是：验收有效、所有必需 WorkItem 的 Formal MR 已合并 `main`、没有仍应计入的未完成 WorkItem。GitLab 分支、MR、Webhook、分支保护与 reconciliation 细节由[Source Control Delivery](./05-source-control-delivery.md)拥有。

## 8. Artifact 与高级协作

Artifact 是不可变版本元数据与对象或外部引用，统一表示用户附件、Spec、Plan、测试报告、完整 Attempt 日志、截图、结构化执行证据及外部 Registry/Jenkins/GitLab 产物引用。源码、Working Tree 与 Commit 的权威副本在 GitLab；大对象保留在相应外部 Registry，平台只保存稳定 URL/ID、版本、SHA-256、大小、来源、时间与验证状态。

用户附件默认限制为单文件 `50 MiB`、每 Requirement 合计 `200 MiB`；Agent Artifact 默认限制为单 Object `100 MiB`、单 Attempt 合计 `500 MiB`、单 Requirement 全部 Attempt 合计 `1 GiB`。这些产品限额、等待期限、文件类型与清理时间均为版本化 Platform Policy；使用量达到 `80%` 预警。Scanner 的 `100 MiB` 单对象安全 Envelope 是独立 Security Floor，不能仅提高产品额度越过。

所有仍实际保留的 Object Version 均计入相应额度，包括待验证、待扫描、隔离、归档、逻辑删除及待对账对象。上传先同时原子预占 Product Quota 与环境 Bucket-Class Capacity 两类 Ledger，任一失败不得签发请求。超过 Agent Artifact 限额时，Attempt 安全停止为 `FAILED`，记录 `failureCode=RESOURCE_EXHAUSTED` 与 `failureDimension=ARTIFACT_QUOTA`，不截断证据。

Artifact Version 的完整性验证主路径为：

```text
PENDING_UPLOAD → PENDING_VERIFICATION
  ├── 需要扫描 → PENDING_SCAN → AVAILABLE
  └── 受信内部纯文本且 Policy 允许跳过扫描 → AVAILABLE

异常：UPLOAD_FAILED | QUARANTINED | SCAN_FAILED
```

后端在上传/下载时实时校验当前授权及 Artifact 关系，按准确 Object Version 校验大小、MIME 与 SHA-256。是否进入 `PENDING_SCAN` 只能由服务端依据版本化 Artifact Source/Media Policy 决定：用户上传、外部 Connector 内容和含外部二进制的 Agent Artifact 必须扫描；只有平台内部受信流程生成、类型受约束的纯文本 Spec、Plan、日志可由命中的 Policy 跳过，Frontend、调用者和 Agent 不能自行声明可信。跳过扫描不是 `CLEAN` Verdict，Artifact 必须保存 Source/Media Category、Policy Version 与完整性证据。

扫描投递按 Artifact Version、SHA-256 与 Scan Policy Version 幂等。Engine 不可用、Signature 过期、Timeout 或解析失败时保持不可用并按可配置的有界退避重试；超过上限进入 `SCAN_FAILED`、告警，Engine 恢复后只能通过受控命令重新入队。`MALICIOUS/SUSPICIOUS` 进入 `QUARANTINED`，不能人工放行或绕过，只能在 Signature/Policy 更新后重新扫描得到 `CLEAN`，或由用户重新上传。只有 `AVAILABLE` Artifact 能下载或进入 Workflow Gate。Presigned Request 默认 `5min`、只对应单一 Object Version，不持久化也不写入日志。文件类型、扫描、Object Lock、技术垃圾清理和存储/安全实现分别由[Data/Messaging/Storage](./07-data-messaging-storage.md)与[Security/Audit/Governance](./08-security-audit-governance.md)拥有；本领域依赖其状态而不复制实现。

多仓 Requirement 与 Agent/Child Execution 产生的 Artifact 都只能扩展协作范围，不能绕过已经成立的 Requirement、SDD、人工 Assignment、Gate、Decision、Evidence Selection 与 Acceptance 责任链。多仓部分合并保留已发生事实并进入受控处置，不伪造跨仓原子性。

多仓 Requirement、Agent/Child Execution 与高级 Artifact 配额、扫描和恢复属于核心 Requirement/SDD/人工责任链之上的受控协作能力。它们只能消费已经成立的 Assignment、Gate、Decision 与 Acceptance Contract，不能反向替代人工责任或改变 Requirement 的业务语义。

## 9. 归档、删除与恢复

`recordState` 与主状态正交：

```text
ACTIVE | ARCHIVED | DELETED
```

归档隐藏于普通列表并在归档视图只读展示。归档或删除活动 Requirement 前，必须安全停止 Parent 与非终态 Child、Fence 外部副作用、固化 Commit/Checkpoint/Artifact/日志、吊销短期凭据并释放 Lease；未证明停止和 Fence 生效前不得完成状态变更。

恢复适用于有恢复资格的 `ARCHIVED` 与 `DELETED` 记录，恢复可见性和原业务状态的继续入口，不复活已终态 Attempt 或 Child。继续时基于原状态、最新 Commit、Artifact、Checkpoint 和当前资格/Assignment 创建新 Attempt 或动作，并重新校验授权、仓库 Binding、Gate 与 Policy。

删除将记录置为 `DELETED` 并进入独立 Deleted 视图。删除、读取 Deleted、恢复分别需 Capability + Scope，`requirement.deleted.read` 与 `requirement.deleted.restore` 不因创建人身份自动获得。归档、删除和恢复保留 Decision、Artifact、Commit、Attempt 与 Audit，并只改变业务元数据与可见性。

## 10. 并发、外部事实与审计

Assignment、Repository Binding、Gate Assignment/Decision、主状态、归档/恢复/删除及 Artifact 完成确认/Reservation 都必须使用 Revision/ETag 或等价乐观并发。冲突返回明确结果，调用方读取最新状态后重试，不得以后写覆盖先写。Revision/ETag 与 `requirementVersion` 是相互独立的版本流：前者保护并发写入，后者只表达交付语义输入的变化，二者不得互相替代或互相推导。

对 GitLab、Agent Orchestrator、Object Storage 与 File Security 的调用用稳定 Idempotency Key、Outbox/Inbox、外部 ID 与 Reconciliation 收敛。“已发请求”不是“外部已成功”；未知事实必须显示 `UNKNOWN`、阻塞或待对账状态。状态转换、Guard 失败、分配、改派、Decision、外部验证、Artifact、Attempt、恢复与 recordState 变化全部追加审计，并贯穿 Correlation ID。
