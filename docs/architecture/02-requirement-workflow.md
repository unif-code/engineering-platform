# Requirement Workflow

> 实施阶段、激活状态和 Release 验收见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题把一项业务交付从创建、基线确认、拆分实现、集成验证、验收直到合并完成串为可追溯流程。它拥有 Requirement、WorkItem、Route、人工 Gate、业务责任 Assignment、Decision、Artifact 业务状态与 `RequirementIntegrationBaselineSelection` 的业务语义，包括 Requirement 何时选定或冻结当前证据引用、Acceptance 如何绑定与失效，以及主状态如何推进。

本文不定义人员资格、Agent 内部执行、Sandbox 物理形态、GitLab 协议细节、`IntegrationBaselineEvidence` 的 Git/MR/Artifact 证据结构，也不定义对象存储、文件扫描与保留的实现；本领域依赖这些 owner 的状态而不复制其实现。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)，Artifact 额度、Presigned 有效期等精确参数见[参数附录](./appendix-parameters.md#platform-policy-key)，结构化错误码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 领域对象与对象地图

Requirement 是整体交付与验收聚合，至少关联 Workspace、创建人、不可静默变更的类型（`feat`、`fix`、`refactor`、`chore`）、初始仓库、Route Snapshot、主状态、`recordState`、必需 WorkItem、Gate、Artifact、`RequirementIntegrationBaselineSelection`、乐观并发版本与 Audit 关联，并可逐步增加 WorkItem。WorkItem 是单一仓库中的可分配交付，分别记录 `createdBy`、`humanOwnerId`、`executorType/executorId`、`requiredCapabilities`、分配与仓库状态、唯一 Repository Branch Binding、Attempt、Artifact 与交付引用；一个 WorkItem 最终只对应一个仓库与一个任务分支，同一仓库的不同 WorkItem 仍各自拥有独立任务分支。

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

`Run` 表示执行目标，`Attempt` 表示一次固定执行输入的尝试，其运行语义由[Agent、Skill 与 Model](./03-agent-skill-model.md)拥有。`Artifact` 是不可变版本元数据与对象或外部引用，统一表示用户附件、Spec、Plan、测试报告、完整 Attempt 日志、截图、结构化执行证据与外部 Registry/Jenkins/GitLab 产物引用，是可准确版本绑定的流程证据，而不是源码或持续变化分支的替代品；源码、Working Tree 与 Commit 的权威副本在 GitLab，大对象保留在相应外部 Registry，平台只保存稳定 URL/ID、版本、SHA-256、大小、来源、时间与验证状态。

### 治理与人工 Gate 链

受控业务行为按固定顺序收敛，人工 Gate 统一为固定四段链路；稳定 Gate Type 仅表达业务责任，Decision 结果枚举固定为 `APPROVED`、`CHANGES_REQUESTED` 与 `REJECTED`：

```text
System Invariant / Security Floor → Platform Gate Policy
→ Workspace Gate Policy Override → Capability + Scope + Membership → Current Assignment

GatePolicy → GateInstance(subjectType + subjectId + subjectVersion/hash)
→ Current Assignment → Decision
```

| Gate Type | subject | 责任 |
| --- | --- | --- |
| `REQUIREMENT_BASELINE_CONFIRMATION` | Route 的 SDD、Debug Baseline 或技术基线版本 | 确认可执行基线 |
| `REQUIREMENT_ACCEPTANCE` | 冻结的 `RequirementIntegrationBaselineSelection` | 最终验收 |
| `FORMAL_MR_REVIEW` | Formal MR 的精确 `headSha` | 人工代码 Review |

### Route 与交付基线

| 类型 | Route 基线 | 确认要求 |
| --- | --- | --- |
| `feat` | 完整 SDD | 每份实际启用的 SDD 均确认 |
| `fix` | `systematic-debugging`、TDD、验证、代码评审 | Debug/Route Baseline 确认 |
| `refactor`、`chore` | Route Snapshot 指定的技术基线与验证 | 实际启用部分确认 |

`feat` 的当前 SDD 顺序是 `brainstorming → writing-plans → test-driven-development → verification-before-completion → requesting-code-review`。每条 Route 把可审计结论固化为结构化、可版本绑定的 Artifact：`feat` 交付产品行为、异常与空状态、验收标准与 Product Plan（涉及 UI 时含真实 WorkItem 分支上的可运行页面、受控 Mock、Preview 与验证证据）；`fix` 交付复现、根因、失败回归测试、修复结果与验证证据；`refactor` 与 `chore` 交付影响范围、风险、技术计划与验证清单。

### 业务状态机

```text
Requirement：CREATED → PREPARING → AWAITING_CONFIRMATION → READY → IN_PROGRESS
             → VERIFYING → AWAITING_ACCEPTANCE → AWAITING_MERGE → COMPLETED
  逆向：AWAITING_ACCEPTANCE →（验收拒绝）IN_PROGRESS；VERIFYING | AWAITING_ACCEPTANCE
        | AWAITING_MERGE →（基线或交付输入变化，按影响）IN_PROGRESS | VERIFYING
  受控取消：除 COMPLETED 外任意状态 → CANCELED

WorkItem：DRAFT → READY → IN_PROGRESS → VERIFYING → AWAITING_MERGE → COMPLETED
  终止状态：CANCELED | SUPERSEDED

正交维度：Requirement.recordState = ACTIVE | ARCHIVED | DELETED
          WorkItem.assignmentState = UNASSIGNED | ASSIGNED；repositoryState = WAITING_REPOSITORY | BOUND
          blockedReasons[] / Attempt.status / ChildExecution.status / delivery status
```

`CREATED` 表示已持久化并正在初始化首项与外部绑定；`PREPARING` 形成 SDD、Debug Baseline 或技术基线；`AWAITING_CONFIRMATION` 等待当前 Route 的人工确认；`READY` 表示基线已确认、可拆分分配与准备执行；`IN_PROGRESS` 表示必需 WorkItem 正在实现或返工；`VERIFYING` 表示进行集成、测试与外部验证；`AWAITING_ACCEPTANCE` 表示当前 Selection 已冻结、等待验收；`AWAITING_MERGE` 表示验收有效、等待必需交付审核与合并；`COMPLETED` 表示验收仍有效且所有必需 WorkItem 均完成合并；`CANCELED` 是相关活动执行停止后的安全终止。WorkItem 的 `DRAFT` 表示分配、仓库与分支、Gate 或 Guard 未齐，`READY` 表示这些条件齐备，`VERIFYING` 代表进入集成与外部验证，`AWAITING_MERGE` 只在 Requirement 验收仍有效且 Formal MR 已创建时成立，合并完成才进入 `COMPLETED`。

### Artifact 验证路径

```text
PENDING_UPLOAD → PENDING_VERIFICATION
  ├── 需要扫描 → PENDING_SCAN → AVAILABLE
  └── 受信内部纯文本且 Policy 允许跳过扫描 → AVAILABLE

异常终态：上传失败、隔离（`QUARANTINED`）、扫描失败
```

用户附件与 Agent Artifact 的额度、预警比例、等待期限、文件类型、清理时间与 Presigned 有效期都是版本化 Platform Policy，Scanner 的单对象安全 Envelope 是独立 Security Floor 而非产品额度；额度、预警比例、上传等待期限、允许文件类型、清理时间与 Presigned 有效期的当前数值见[参数附录](./appendix-parameters.md#platform-policy-key)，异常终态与配额失败的结构化错误码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 关键不变量

- `System Invariant` 与 Security Floor 不可由任何 Policy 关闭；Platform Gate Policy 与允许的 Workspace Scope Override 只能由 Super Admin 发布，Requirement 本身不建立 Policy，Workspace 成员也不能发布 Gate Policy——Gate 的强度不能由被它约束的一方决定。
- Route、Gate、Attempt、Artifact 与 Decision 在形成时保存当时的 Effective Policy 与解析快照，Decision 还必须绑定 subject、准确版本或 hash、Current Assignment 与决策时的资格快照，后续 Policy 变更只作用于尚未形成快照的事实——已发生的判定必须能按当时的规则解释。
- Workflow 在每次受保护命令中调用[身份、组织与授权](./01-identity-organization-authorization.md)的当前判定；Assignment 只说明当前责任，永不授予资格或扩大范围——责任与资格必须分离才能各自被审计。
- Requirement 的类型不可静默变更；语义发生范围扩展时创建有关联关系的新 Requirement，而不是改写既有类型、基线或历史——类型决定 Route 与 Gate，改写会让既有确认失去依据。
- `createdBy` 仅是历史事实；Agent 可以成为 executor，但 WorkItem 始终保留人类负责人，且 Agent 不能成为 Gate、MR 或验收责任人——人工责任不能由执行主体代持。
- 创建 Requirement 必须提供 Workspace、类型、标题、描述、必要背景与一个初始 GitLab Project/Repository，没有初始仓库不得创建，首个 WorkItem 自动继承该初始仓库；平台 Project 直接对应 GitLab Project，不创建平行代码项目实体，仓库选择也不按岗位或专业分类强制——第二份代码项目模型会立刻产生第二事实源。
- 只有创建人同时满足 `requiredCapabilities`、Scope、Membership、仓库访问与资源 Guard 时才自动成为 `humanOwnerId` 与 Human executor，否则 WorkItem 创建成功但保持 `UNASSIGNED` 并发出待分配通知；之后只有具备 `work_item.assign` 与对应 Scope 的人员可以分配，候选人必须是有效 Workspace 成员并满足执行、仓库访问与资源条件，系统不能随机补选执行者——执行者必须是被明确选定且具备资格的人。
- `UNASSIGNED` 或未绑定仓库的 WorkItem 可以保存、查看和通知，但不得创建分支、启动 Human/Agent 执行、修改代码或创建 Integration/Formal MR；后续 WorkItem 可以先有负责人并保持 `WAITING_REPOSITORY`，由负责人在授权范围内选择仓库，操作人仍须具备仓库绑定资格——没有责任人或落点的交付不能产生外部副作用。
- 仓库和分支已创建后发现选错仓库，必须把原 WorkItem 标为 `SUPERSEDED` 并创建替代 WorkItem，原 Binding、Attempt、Artifact 与 Audit 保留而被替代项不再计入完成条件；未启动的 WorkItem 可受控改派，运行中改派必须先安全停止当前 Attempt 或等待其终态、固化 Commit、Checkpoint、日志与 Artifact，再以新 Assignment 启动新 Attempt，且不得修改旧 Attempt 的责任或 Binding——已发生的事实与它的归属都不可改写。
- Assignment、Repository Binding、Gate Assignment 与 Decision、主状态、归档恢复删除以及 Artifact 完成确认与 Reservation 都必须使用 Revision/ETag 或等价乐观并发，冲突返回明确结果并由调用方读取最新状态后重试——后写覆盖先写会静默丢弃责任变更。
- `requirementVersion` 只随验收标准、必需 WorkItem 集合、Route 与基线、Selection 等交付语义输入的变化递增，Revision/ETag 只保护并发写入，二者不得互相替代或互相推导——因此验收通过后的 `AWAITING_MERGE` 与 `COMPLETED` 推进不会使当前有效 Acceptance Decision 失效。
- 增加、移除、替换必需 WorkItem 或改变其是否计入最终交付时，必须同时更新单调递增的 `requiredWorkItemSetVersion` 与规范化 `requiredWorkItemSetHash`——集合版本是 Evidence 覆盖校验的唯一依据。
- 创建 `RequirementIntegrationBaselineSelection` 是携带 `expectedRequirementVersion` 的受保护 CAS 命令，必须在同一事务内验证 Evidence 的 `requirementId`、集合版本与 hash、对当前全部必需 WorkItem 的一一覆盖且无额外替代项，以及每项 Commit、Artifact 与验证引用仍是当前可接受版本；成功后 Selection 保存 `integrationBaselineId/hash`、Evidence 的 Requirement 与集合版本、选择时间、选择前后 Requirement Version 与当前状态，并原子提升 Requirement Version、写入 Outbox 与 Audit；任一不匹配都返回明确 Conflict 并要求重新读取 Requirement、重新生成 Evidence 或重新选择，禁止 Last-write-wins、部分覆盖与静默重试旧 Evidence——部分覆盖的基线会让验收失去意义。
- Artifact Version、Commit、交付 head SHA、Route Bundle、必需 WorkItem 集合或其他被确认输入变化时，当前 Selection 与旧 Acceptance 失效而历史完整保留，完成的 Decision、Attempt、Artifact 与 Audit 始终保存原 actor；仅与交付快照无关的展示变化不能伪造集合变化，是否影响 Selection 必须由 Requirement 领域命令显式判定——失效判定必须是领域决定，不是投影副作用。
- 每一份实际启用的 Product、Backend 或 Frontend SDD 都独立经历确认与失效，上游确认不能跳过下游实际启用 SDD 的 Gate——Gate 的覆盖面必须与实际交付面一致。
- Workflow 固定 Route、阶段输入输出、Artifact、Gate 与恢复，Skill 的内部方法归[Agent、Skill 与 Model](./03-agent-skill-model.md)并在执行时使用版本化 Superpowers Runtime Bundle；Route 类型、Bundle、Skill、Artifact 或 Policy 变化不得改写运行中的 Attempt，需要新产品能力时创建关联 `feat` Requirement——运行中的执行只按启动时的 Contract 收敛。
- 后端 WorkItem 新增或变更 API 时必须交付版本化、机器可读且已校验的 API Contract，覆盖输入输出、错误、认证授权、幂等与重试、枚举与空值、示例、Schema Version 与兼容性；前端 WorkItem 使用当前确认的 Route Baseline 与适用 Contract、不重写已完成的产品 SDD，Mock 与实际 Contract 出现阻塞差异时必须更新 Artifact、Contract 与受影响 Gate——跨端协作只能依靠可校验的 Contract，差异必须回到基线而不是留在实现里。
- 所有类型的 SDD/Baseline Confirmation 都默认以 Requirement 创建人为审核人：创建时按有效 Gate Policy 同步解析 `defaultReviewerId`、保存解析快照与 Policy Version 并以 `defaultReviewerId` 初始化 `currentReviewerId`，因此不存在无审核人的空状态——Gate 必须始终有明确的当前责任人。
- 正常路径只有 `defaultReviewerId` 对应人员可以改派当前审核人，实际被选审核人只负责 Decision 而不能继续转派（除非其本身就是默认审核人），候选人必须实时满足 Gate 所需 Capability、Scope 与 Membership；最终 Decision 形成后不得改派，新的 Artifact 版本必须形成新的 Gate 与 Decision 关系；默认审核人停用、离职或失去有效 Scope 时，具有 `sdd.reviewer.override` 的管理员可填写原因作恢复性改派，但该能力不能跳过 Gate、资格、版本绑定或修改已完成 Decision——无界转派与事后编辑都会让人工判断无法追溯；恢复性能力只解决“找不到人”，不降低门槛。
- 人工 Gate 只能由当前 assignee 在资格实时有效时签署：允许创建人或 Artifact 作者自审，但 Agent、AI Review、确定性检查、Connector Service Account 与系统管理员身份都不能代签，岗位也不能编码进 Gate Type 或 Decision 结果（新增结果属于 Contract 变更）——人工 Gate 的价值完全来自人的责任，而不是称谓或自动化结论。
- 最终验收的默认责任人是 Requirement 创建人并可按同一 Assignment 语义异步改派，但只有 Current Acceptance Assignment 的 assignee 且具备所需 Capability、Scope 与 Membership 才可提交验收 Decision，创建人不具资格时必须改派给合格候选人——默认责任人不等于有效资格。
- SDD 确认、WorkItem 实现、最终验收、MR Review 与 Merge 是相互独立的责任——合并它们会让一次动作同时完成本应互相制约的判断。
- Acceptance Decision Snapshot 必须绑定 `requirementVersion`、`acceptanceCriteriaVersion/hash` 与当前 Selection 的 `integrationBaselineId/hash`，并保存 Current Acceptance Assignment 与决策时资格快照；三者或其引用的 Evidence 任一变化都使旧 Acceptance 失效，旧结论及其快照完整保留——验收只对它当时看到的那份交付有效。
- Attempt、Model、Adapter 或 Sandbox 的失败只产生可处置的阻塞，不把 Requirement 或 WorkItem 直接标为失败；验收拒绝使 Requirement 返回 `IN_PROGRESS`，基线或交付代码变化按影响回到 `IN_PROGRESS` 或 `VERIFYING`，MR 要求修改使 WorkItem 回到 `IN_PROGRESS` 且旧 Review 结论失效，多仓库仅部分合并时 Requirement 留在 `AWAITING_MERGE`——业务责任状态不由运行资源的故障决定，返工必须回到能重新形成证据的阶段。
- 受控取消是除 `COMPLETED` 外任意状态都可到达的安全终止，且必须在相关活动执行确实停止后才成立——取消不能只改状态而留下仍在运行的副作用。
- Jenkins 保持独立平台：用户手动运行和查看，平台不调用、不读取其状态，也不将其当作自动 Gate，用户只能提交带提交人、时间、目标 Commit、引用与说明的外部验证证据——平台 Gate 只能由平台自身的证据与人工 Decision 支撑。
- WorkItem 交付按任务分支、`dev` 集成、外部人工验证、选定 Evidence、验收与 Formal MR 的顺序进行；所有必需 WorkItem 完成集成、测试与外部人工验证后，先由本领域冻结当前 `RequirementDeliverySnapshot`（至少含 `requirementId`、当前 `requirementVersion`、`requiredWorkItemSetVersion/hash` 与全部必需 WorkItem 稳定 ID），再由[Source Control 与交付](./05-source-control-delivery.md)据此生成不可变 `IntegrationBaselineEvidence`，不能绑定持续移动的分支 HEAD；任一必需项的 Commit、Artifact、测试证据或必需集合变化都会形成新的 Evidence，本领域把旧 Selection 标记为不再当前并使旧验收失效，随后基于当前快照重新选择并再次验收——移动的 HEAD 不能作为验收对象；证据变了，结论必须重做。
- 只有验收通过且仍对当前 Selection 有效时才允许创建各 WorkItem 的 Formal MR；Requirement 进入 `COMPLETED` 要求验收有效、所有必需 WorkItem 的 Formal MR 已合并 `main`、且没有仍应计入的未完成 WorkItem——交付完成是三项事实同时成立，不是任一项的推断。
- 所有仍实际保留的 Object Version 都计入相应额度（含待验证、待扫描、隔离、归档、逻辑删除与待对账对象），上传必须先同时原子预占 Product Quota 与环境 Bucket-Class Capacity 两类 Ledger，任一失败都不得签发上传请求——只要占用存储就必须计入，双账本任一失守都会让容量准入形同虚设。
- 超过 Agent Artifact 限额时 Attempt 安全停止并记录结构化失败原因与失败维度，不截断证据——证据被截断后事故就无法复盘。
- 是否进入扫描只能由服务端依据版本化 Artifact Source/Media Policy 决定：用户上传、外部 Connector 内容与含外部二进制的 Agent Artifact 必须扫描，只有平台内部受信流程生成、类型受约束的纯文本 Spec、Plan、日志可由命中的 Policy 跳过，Frontend、调用者与 Agent 不能自行声明可信；跳过扫描不是 `CLEAN` Verdict，Artifact 仍必须保存 Source/Media Category、Policy Version 与完整性证据——自称可信就等于没有可信判定。
- 扫描投递按 Artifact Version、SHA-256 与 Scan Policy Version 幂等；Engine 不可用、Signature 过期、Timeout 或解析失败时保持不可用并按可配置的有界退避重试，超过上限进入扫描失败终态并告警，Engine 恢复后只能通过受控命令重新入队——不可用时 Fail Closed，恢复时不自动放行。
- 判定为 `MALICIOUS` 或 `SUSPICIOUS` 的 Artifact 进入隔离终态，不能人工放行或绕过，只能在 Signature 或 Policy 更新后重新扫描得到 `CLEAN`，或由用户重新上传——人工放行入口会直接击穿文件安全边界。
- 只有 `AVAILABLE` 的 Artifact 能下载或进入 Workflow Gate；后端在上传与下载时实时校验当前授权及 Artifact 关系并按准确 Object Version 校验大小、MIME 与 SHA-256，Presigned Request 只对应单一 Object Version、有界短有效期，且不持久化也不写入日志——未验证或已隔离的对象不得成为流程证据，长期或可复用的对象 URL 等于绕过授权。
- 多仓 Requirement、Agent/Child Execution 与高级 Artifact 能力只能扩展协作范围并消费已经成立的 Requirement、SDD、人工 Assignment、Gate、Decision、Evidence Selection 与 Acceptance 责任链，不能反向替代人工责任或改变 Requirement 的业务语义；多仓部分合并保留已发生事实并进入受控处置，不伪造跨仓原子性——协作能力叠加在责任链之上，声称原子性只会掩盖真实的半完成状态。
- 归档的 Requirement 隐藏于普通列表并在归档视图只读展示；归档或删除活动 Requirement 前必须安全停止 Parent 与非终态 Child、Fence 外部副作用、固化 Commit、Checkpoint、Artifact 与日志、吊销短期凭据并释放 Lease，未证明停止与 Fence 生效前不得完成状态变更——记录消失而执行仍在运行是最危险的状态。
- 恢复只适用于有恢复资格的 `ARCHIVED` 与 `DELETED` 记录，恢复的是可见性与原业务状态的继续入口而不复活已终态的 Attempt 或 Child；继续时基于原状态、最新 Commit、Artifact、Checkpoint 与当前资格创建新 Attempt 或动作，并重新校验授权、仓库 Binding、Gate 与 Policy——恢复的是流程，不是旧的执行实例。
- 删除把记录置为 `DELETED` 并进入独立 Deleted 视图；删除、读取 Deleted 记录与恢复分别需要 Capability 与 Scope，`requirement.deleted.read` 与 `requirement.deleted.restore` 不因创建人身份自动获得；归档、删除与恢复都保留 Decision、Artifact、Commit、Attempt 与 Audit，只改变业务元数据与可见性——生命周期管理不是证据销毁工具。
- 对 GitLab、Agent Orchestrator、Object Storage 与 File Security 的调用使用稳定 Idempotency Key、Outbox/Inbox、外部 ID 与 Reconciliation 收敛；“已发请求”不等于“外部已成功”，未知事实必须显示为 `UNKNOWN`、阻塞或待对账状态——猜测外部结果会产生并不存在的业务事实。
- 状态转换、Guard 失败、分配、改派、Decision、外部验证、Artifact、Attempt、恢复与 `recordState` 变化全部追加审计并贯穿 Correlation ID——责任链只有全程可关联才能被解释。

## 与其他模块的关系

下表是本模块自身视角：02 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链中段的业务编排与人工 Gate 事实 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 账号状态、Session、Capability、Scope、Membership 与服务端授权判定 | Requirement、WorkItem、Gate 与责任 Assignment 的权威业务事实和生命周期命令，供授权判定消费 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | Run/Attempt 执行事实、Child 状态与 Skill 内部方法 | Requirement/WorkItem 业务上下文、Route→Skill 定义与 Artifact Contract |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | Requirement 级 Sandbox Environment、Preview 引用与可重建证据 | Requirement/WorkItem 的稳定标识与业务终止、归档、删除命令 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | 分支命名与 Binding Saga、Integration/Formal MR、Merge、`IntegrationBaselineEvidence` 结构与变化事件、Formal MR 默认路由与 Review Assignment、`headSha` 失效规则 | 稳定 Requirement/WorkItem 标识、`RequirementDeliverySnapshot`、Selection 冻结与 Acceptance 失效判定 |
| [06 平台应用与集成](./06-platform-application-integration.md) | 业务 API 与模块边界、单模块事务与 Outbox 一致性、前端装配约束 | Requirement、WorkItem 与 Artifact 业务状态的公开 Contract |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | Artifact 对象、Object Version、双账本预占、技术垃圾清理与 Retention 执行 | Artifact 业务状态、扫描分支结果与对象引用条件 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | 文件扫描机制、Object Lock、Audit Envelope、脱敏与保留 Contract | 本领域的 Audit Trigger 与业务摘要，以及需要扫描的 Source/Media 判定输入 |
| [10 Configuration Governance](./10-configuration-governance.md) | Gate Policy 与 Artifact Policy 的 Draft、发布、回滚与 Effective Snapshot 生命周期 | Gate 与 Artifact Namespace 的 Schema、默认值与业务解释 |
| [12 实施路线图](./12-implementation-roadmap.md) | V0.3 人工交付闭环的 Release Scope、Release Gate、验收证据与激活边界 | Requirement、WorkItem、人工 Gate、Decision、Acceptance 与 Artifact 业务状态 Contract |
| [参数附录](./appendix-parameters.md) | 用户附件与 Agent Artifact 额度、预警比例、Presigned 有效期与 Artifact/扫描的结构化错误码 | 本文正文中的定性规则 |
