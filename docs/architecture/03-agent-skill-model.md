# Agent、Skill 与 Model

> 实施阶段、激活状态和 Release 验收见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义平台的受控执行：Agent Definition 与随镜像交付的 Superpowers Runtime Bundle、Model Catalog/Capability/Route、Run 与 Attempt、不可变 Execution Binding、模型评测工具链、执行等待与 Child Execution、Context/Tool/Network Policy，以及运行事件、失败与审计语义。Agent 是受约束的执行者而不是人员岗位：它可以成为 executor，但不能授予 Capability、扩大 Scope 或替人做 Human Gate Decision。

本文不定义 Requirement 主状态、人工 Gate、人员资格与 GitLab 交付协议，也不定义 Sandbox 的 KVM/Kata 隔离、Materialization、Secret 注入、Lease 物理实现与容量 BOM——本文只约束 Sandbox 通过 Port 提供的逻辑契约。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：Sandbox 与 Image Build 的准入 Policy Key、执行等待期限见[参数附录](./appendix-parameters.md#platform-policy-key)，资源向量与 Unit 权重见[参数附录](./appendix-parameters.md#resource-profile)，结构化失败原因码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 概念与 Definition

下表定义本领域的规范概念，供其余各节引用：

| 概念 | 规范职责 |
| --- | --- |
| Agent Definition | 一类执行者的职责、Schema、逻辑能力与权限模板 |
| Runtime Bundle | 随镜像交付的一组可加载 Skill |
| Loaded Skill | 某 Attempt 实际使用的方法集合 |
| Model Deployment | 可调用 Provider、模型/alias、Endpoint、Region、版本与运行状态 |
| Model Capability | 经服务端验证的 chat、coding、search、thinking 等能力 |
| Chat Model Policy | 对话界面的 Deployment/Capability Allowlist |
| Execution Model Route Policy | 将 Agent 逻辑能力解析到 Deployment |
| Run / Attempt | 业务目标 / 目标的一次执行 |
| Execution Binding | Attempt 的不可变运行输入与权限快照 |
| Evaluation Evidence | 固定工具、数据集、模型路由和阈值后生成的不可变评测 Artifact |

首批 Agent Definition 的规范性基线如下：

| Agent Definition | 输入 | 输出 |
| --- | --- | --- |
| Requirement Orchestrator | Requirement、Route、Policy、当前状态 | 子 Run、交互请求、阶段结果 |
| Product Agent | `feat` 上下文、初始仓库、产品规范 | 澄清结果、Product SDD、页面或 Mock Artifact |
| Backend Development Agent | 当前 Baseline、后端 WorkItem 与仓库 | Technical SDD、API Contract、代码与测试 |
| Frontend Delivery Agent | 当前 Baseline、前端 WorkItem 与仓库 | 前端代码、Preview、测试 |
| Test Agent | 固定 Commit、Contract、验收标准 | 测试结果与证据 |
| Code Review Agent | 固定 `headSha`、Diff、规范、测试结果 | AI Review 建议 |

每个 Agent Definition 至少有稳定 ID、版本、职责、支持阶段、输入/输出 Schema、Skill/Model/Tool Capability、Context Policy 与 Runtime Permission 模板，并可按同一 Schema 扩展与版本化；它不保存人员 ID、实际镜像 digest 或实际 Model Deployment。

### 执行授权链与 Execution Binding

执行授权链固定为：用户 Capability + Scope + Membership → Workflow 允许业务命令 → 创建 Run / Attempt → Policy 解析最小 Runtime Permission → Execution Binding 固化实际输入 → Agent 仅在 Binding 内运行。Run 是一个业务执行目标，Attempt 是一次可复现执行；每个 Attempt 在启动前固化：

```text
ExecutionBinding
├── environmentId / workspaceId / correlationId / createdAt / expiresAt
├── requirementId / workItemId / assignmentVersion
├── agentDefinitionId / version
├── runtimeImageDigest / skillBundleHash / loadedSkillNames[]
├── modelDeploymentId / capabilitySnapshot / adapterVersion
├── toolPolicyVersion / contextPolicyVersion / networkPolicyVersion / runtimePermissions[]
├── repositoryBranchBindingId / repositoryId / branch / baseCommitSha
├── resourceProfileId / digest / resourceVector / unitWeight
├── runtimeProfileId / digest
└── deadlineSnapshot / policyVersions
```

Binding 保存逻辑 Sandbox/Runtime Profile 引用，不保存 Pod、Node 或 RuntimeClass 等物理字段。

### Attempt 与 Child 状态机

```text
Attempt：CREATED → BINDING → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED
等待：RUNNING → WAITING_INPUT | WAITING_CHILD → QUEUED
取消与超时：任意活动状态 → CANCELING → CANCELED | TIMED_OUT
失败：BINDING → FAILED；PROVISIONING → FAILED
      RUNNING →（执行失败，仍先固化证据）FINALIZING → FAILED
      FINALIZING →（固化失败，记录证据缺口）FAILED
Child Build Execution 使用独立状态机，不复用 Parent Attempt 状态：
      CREATED → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED
      失败与取消路径同上；Build 准入 Policy 关闭时 QUEUED → CANCELING → CANCELED
```

`CREATED` 表示已记录但尚未形成 Binding；`BINDING` 解析并持久化 Agent、模型、Skill、权限、仓库与资源输入；`QUEUED` 表示 Binding 已校验、正在等待唯一 Fenced Capacity Lease；`PROVISIONING` 通过 Sandbox Port 准备物化、固定分支与短期凭据；`RUNNING` 表示 Agent 运行中；`WAITING_INPUT` 表示结构化问题与 Checkpoint 已持久化、等待用户输入；`WAITING_CHILD` 表示 Parent 已完成 Handoff、正在等待独立 Child 的持久化结果；`FINALIZING` 固化结果、Commit、Artifact、日志与 Checkpoint 并清理副作用；`CANCELING` 幂等终止 Parent/Child、Fence 副作用并回收资源；`SUCCEEDED`、`CANCELED`、`FAILED`、`TIMED_OUT` 是不可逆终态。`WAITING_INPUT` 与 `WAITING_CHILD` 只属于 Parent Attempt，不能写入 Child Build Execution；Child 的四个终态是供 Parent 消费的结构化结果。

### 稳定 Port 与事件

本领域的稳定 Port 为 `AgentDefinitionPort`、`RuntimeBundlePort`、`ModelGatewayPort`、`ModelCapabilityCatalogPort`、`ModelEvaluationPort`、`ExecutionPolicyPort`、`AgentRunPort`、`ArtifactPort` 与 `SandboxPort`。

关键事件为 `AgentRunRequested`、`ExecutionBound`、`AgentAttemptQueued`、`AgentAttemptStarted`、`AgentWaitingInput`、`AgentWaitingChild`、`AgentAttemptFinalizing`、`AgentAttemptSucceeded`、`AgentAttemptFailed`、`AgentAttemptCanceled`、`AgentAttemptTimedOut`、`ModelDeploymentHealthChanged`、`ModelFallbackRequested` 与 `RuntimePermissionRevoked`。

## 关键不变量

- Agent 不是人员岗位：它不能授予 Capability、扩大 Scope 或替人签署 Human Gate Decision，Prompt、UI 开关与 Model 输出也都不是授权事实——授权与人工责任只能来自服务端判定与人的 Decision。
- Skill 只能来自随 Runtime 镜像发布的版本化 Superpowers Runtime Bundle，经 `RuntimeBundlePort` 接入并复用 Binding、权限与审计契约，一个 Attempt 内保持同一 Bundle；Workflow 解析 Route 后把所需 Bundle 与 Loaded Skill 写入 Execution Binding，Route→Skill 定义仍属于[Requirement Workflow](./02-requirement-workflow.md)——可加载来源单一且随镜像交付，执行才可复现。
- Runtime 镜像必须记录镜像 digest、Bundle hash、Bundle Manifest、可加载 Skill 名单、构建来源、签名与扫描结果；`BINDING` 阶段只接受 Bundle Manifest 与 Agent Definition 共同允许的 Skill，缺少 Route 所需 Skill、Manifest 与 Definition 不一致、digest 不可验证或出现其他动态来源时 Fail Closed 并不再请求 Sandbox——无法验证的执行输入不得进入隔离环境。
- Model Deployment 激活前必须由 Model Adapter 验证实际 Provider Model ID、chat/coding/search/thinking 能力、Context 限制、Quota、价格、数据处理等级、健康状态与参数 Schema，并至少记录 Provider/Adapter、Model ID、Endpoint/Region、配置版本、输入输出与流式/取消能力、Capability 限制、限流/成本/数据等级与验证证据——未经验证的 Provider 声明不能成为可路由能力。
- Model Capability 是服务端权威事实：Frontend 可据此隐藏选项，Gateway 仍必须拒绝伪造或不支持的请求——界面可见性不是能力判定。
- 不可用的 Deployment 仅退出对应 Route 或 Allowlist，不改变 Agent 或 Requirement 状态机——Provider 健康是可替换的运行输入，不是业务事实。
- Chat Model 与 Execution Model 分开配置、解析与治理：对话路径为 用户选择 → Chat Model Policy 校验 Allowlist/Scope/Deployment 健康 → Model Gateway 校验 Capability → Provider Adapter 映射 → 百炼 `compatible-mode`；对话界面只显示 Policy 允许的 Deployment，且只有支持 search 才显示联网搜索、支持 thinking 才显示深度思考——两类模型的风险面不同，隐式继承会把对话选择变成执行授权。
- Chat 请求不创建 Agent Attempt，也不授予 Repository、Sandbox 或 Tool 权限；对话的 Model 与开关绝不隐式传给后续 Agent Binding，Prompt 正文不进入普通 Metric、Trace、Audit 摘要或基础设施日志——对话是无副作用路径，其内容也不是可随意扩散的运行数据。
- Execution Model 由 Agent Definition/Workflow 请求逻辑 Capability（如 `reasoning-high`、`coding-frontend`、`coding-backend`、`review-code`、`model-search`），Execution Model Route Policy 综合数据等级、允许 Provider、任务类型、上下文长度、质量、延迟、成本、健康与回退策略解析实际 Deployment，解析结果连同 Capability Snapshot、search/thinking 开关、Adapter 版本与规范化参数摘要进入 Binding；Capability 不匹配时重新按 Route 解析，无可用 Deployment 则失败——Workflow 只声明需要什么能力，具体模型是可替换的解析结果。
- 当前架构基线的 Provider 接入阿里云百炼 `compatible-mode`，DEV 的首个 Catalog Candidate 登记 `qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro` 与 `kimi-3` 作为可替换的环境 `ModelDeployment` alias/Seed，不是 Workflow 代码常量；未来若允许用户选择 Agent Model，该选择必须作为独立、受 Policy 约束的 Execution 输入而不复用 Chat 状态——模型清单是环境配置，对话界面不能成为绕过执行治理的入口。
- Agent 只能经两种受控方式联网：Deployment 原生的 Model Search Capability，或 Workflow 明确批准的 Search Connector；两者都记录来源、查询、结果引用与数据分类，都受 Context Policy 约束，都不向 Sandbox 授予任意公网出口——受控检索不等于开放出口。
- Provider Adapter 的稳定能力至少包括 `invoke`、`stream`、`countTokens`、`cancel`、`healthCheck` 与 `estimateCost`；百炼 `enable_search`、thinking 等非 OpenAI 标准参数仅由 Adapter 从规范化 Capability 请求映射，例如 SDK `extra_body` 不进入 Workflow、Agent Definition 或 Frontend 领域模型——Provider 专有细节留在 Adapter 内，领域模型才能更换 Provider。
- Capability 不匹配、参数无效或 Deployment 不健康时 Gateway 返回结构化错误；限流或不可用只允许有界重试，允许回退时必须创建新 Attempt 与新 Binding 并记录原失败、目标 Deployment 与原因，同一 Attempt 中严禁静默切换模型——静默切换会让同一份执行证据对应两套实际输入。
- 业务重试创建有序的新 Attempt 并保留来源、旧 Binding、日志与结果；运行中及从等待恢复时必须使用原 Binding，任何 Agent、Model、Skill、Runtime、Resource Profile、Policy、Repository 或 Branch 变化都要求新 Attempt——不可变 Binding 是可复现执行与责任归属的前提。
- 用户 Session 或控制权限失效不会主动中止已启动 Attempt，但立刻影响其后的查看、取消、重试与新 Run；Requirement 取消、归档或删除是业务终止命令，由 Workflow 经执行 Port 请求安全停止——运行中的执行按启动时的 Contract 收敛，控制动作按当前授权判定。
- `CREATED → BINDING` 需关联 Run、WorkItem 与有效 Assignment，`BINDING → QUEUED` 需完整持久化 Binding、通过校验并写入审计，失败进入 `FAILED`——没有责任与完整输入的执行不得排队。
- `QUEUED → PROVISIONING` 只在取得唯一且受 Fencing 保护的 Capacity Lease 后进行，`PROVISIONING → RUNNING` 需确认绑定代码、网络 Policy 与短期凭据就绪；容量不足时 Attempt 保持 `QUEUED` 且不物化 Sandbox——重复或半就绪的物化会产生无法归属的副作用。
- 正常完成与执行失败都必须经 `FINALIZING` 固化证据后进入终态，`FINALIZING` 自身失败时直接进入 `FAILED` 并记录证据缺口，取消与超时一定经过 `CANCELING`——证据固化与副作用回收不能被失败路径跳过。
- 终态不可复活；Temporal Activity 只能在同一 Binding 内有限重试瞬时基础设施错误，不能变更 Binding；Attempt 失败、取消或超时不自动终结 WorkItem/Requirement，由上层 Workflow 决定阻塞、重试、取消或继续——执行结果是业务判断的输入，不是业务结论。
- Memory 或 Ephemeral 超限时安全终止并记录结构化的资源耗尽证据（原因码见[参数附录](./appendix-parameters.md#错误码)）——资源事故必须留下可复盘的失败维度。
- 平台不自建常驻 Prompt/LLMOps 平台：`promptfoo` 是 Prompt、Model Route 与 Agent 黑盒行为的默认回归评测执行器，`EvalScope` 是模型选型、质量基准与推理性能压测的默认按需执行器，两者都运行在版本锁定的一次性 Evaluation Job 中，不是长期运行的 Deployable，不拥有账号、权限、Prompt、Dataset、Workflow、Gate 或运行事实，也不引入独立数据库与管理界面，未来 CI 只可触发同一 Job Contract——评测是一次性证据生产，常驻工具平台会变成第二事实源。
- 每次评测必须固定工具版本与镜像 digest、Evaluation Config、Dataset/Case Version、Prompt/Template Hash、Model Deployment/Capability Snapshot、随机 Seed、并发、阈值、超时与数据分类，并只能通过 `ModelEvaluationPort → ModelGatewayPort → Provider Adapter` 调用当前环境已批准的 Deployment，不取得 Provider 原始 Endpoint、API Key 或 SDK Credential，也不能把工具自带的 Provider/Model 配置带入领域层——固定输入才可复现，绕过 Gateway 就同时绕过了能力校验、配额、成本、Correlation 与取消。
- 执行结果形成不可变 `Evaluation Evidence`（至少含原始结构化结果、摘要、工具版本、输入 Hash、实际 Model Deployment、Provider Request/Correlation ID、Token/成本/延迟、失败与 Coverage），并通过[Requirement Workflow 的 Artifact Contract](./02-requirement-workflow.md)保存稳定引用与内容校验值；业务 Workflow 只能消费该证据并自行判定 Gate，工具的页面、退出码或临时缓存不能改写 Requirement、Attempt、Model Catalog 或有效配置——Gate 结论必须来自被审计的证据，而不是工具的运行时状态。
- Evaluation Job 是运行在 `platform-worker` 的受限可信工作负载：只获得本次数据集、批准 Model Route 与结果 Artifact 的最小短期权限，以 Non-root、只读 RootFS、`automountServiceAccountToken=false` 与 default-deny NetworkPolicy 运行，Egress 只允许 Model Gateway、Artifact API 与明确批准的数据集来源；主工具容器禁止挂载默认 Token 或 Kubernetes API audience Token，确需短期服务身份时只有 OpenBao Agent init/sidecar 可挂载短 TTL、`audience=openbao` 的 projected ServiceAccount Token 并把短期 mTLS/Service Identity 写入 `tmpfs`，主工具容器只读取该内存文件，不需要 Secret 的 Job 不启动 Injector——可信负载也不等于特权负载，Token 落到工具容器就等于把平台身份交给评测代码。
- Evaluation Config 只允许已注册的声明式 Provider、Assertion、Evaluator 与 Dataset Adapter，禁止用户提供或加载内联 JavaScript/Python、Shell Command、远程 Plugin 等可执行扩展；未来确需执行不可信评测代码时必须新增独立 Sandbox Execution Contract，不能放宽本 Job——受限 Job 不是 Sandbox，不能承载任意代码执行。
- 评测固定到精确 Model Deployment，禁止静默 Provider fallback；工具崩溃、Case 缺失、结果不可解析、目标 Deployment 不可用或 Coverage 不完整时本次证据即为无效或不完整，禁止伪造通过结论，重新执行必须生成新的 Evaluation Evidence；Prompt、测试输入与模型输出只进入按数据分类保护的评测 Artifact，不进入普通 Log、Trace、Metric Label 或 Audit 正文，Secret 仍按[安全、审计与治理](./08-security-audit-governance.md)注入——不完整的证据必须显示为不完整，否则评测反而掩盖质量风险。
- `WAITING_INPUT` 不是人工 Gate；等待期限是版本化 Platform Policy（取值见[参数附录](./appendix-parameters.md#platform-policy-key)）并在 Binding 时保存有效值与版本，进入等待前必须持久化结构化问题、Checkpoint、日志与 Artifact，并释放活动 Sandbox Capacity Lease 与短期 Secret——等待中的执行不应继续占用隔离容量或持有凭据。
- 期限内答复时重新校验当前访问权、WorkItem Assignment 与控制 Capability，通过后仍使用同一 Attempt/Binding 回到 `QUEUED`，重新取得 Lease 才能 `PROVISIONING`；逾期后经 `CANCELING` 进入 `TIMED_OUT`，迟到答复只能从 Checkpoint 创建新 Attempt——恢复必须重新通过授权与容量两道门。
- 本 Target Contract 定义的 Child Type 范围包含 Image Build；新增 Child Type 必须独立定义状态机、Binding、资源、权限、结果与恢复 Contract，不能复用 Image Build 的隐含假设，其阶段选择、激活状态与 Release 验收记录在[实施路线图](./12-implementation-roadmap.md)——不同 Child 的失败面不同，共用假设会掩盖缺失的 Contract。
- 同一 Parent Attempt 任一时刻最多一个非终态 Child，可顺序创建多个但不得以并行绕过限制；Parent 仅在以稳定 Idempotency Key 创建或确认唯一 Child Binding、固化 Checkpoint 与关联引用、并可靠释放自身活动资源后进入 `WAITING_CHILD`——Handoff 必须先释放再取得，否则父子会同时占用容量。
- Build Handoff 已完成但 Child 尚未取得 Lease 时，若有效的 Image Build 准入 Policy 已降为不允许新 Build，本领域必须把该 Child 收敛为带对应 Policy 原因码的 `CANCELED` 终态、固化结构化结果并唤醒仍有效的 Parent；该 Child 不能无限保持 `QUEUED`，也不能把普通 Policy 下调解释为强杀已持有 Lease 的 Child（Policy Key 见[参数附录](./appendix-parameters.md#platform-policy-key)，原因码见[参数附录的错误码](./appendix-parameters.md#错误码)）——Policy 下调只影响后续准入，等待中的 Child 必须收敛到确定终态。
- Child 使用独立 Execution ID、Binding、Lease、Credential 与 Fencing Token，终态先固化 Digest、SBOM/Provenance、日志、Artifact 或结构化错误再释放资源；Parent 仅在仍等待、未取消/归档/删除/超时、原 Binding 与 Checkpoint 有效且结果属于其绑定 Child 时回到 `QUEUED`，Child 失败本身不终结 Parent，后续处理由 Tool/Workflow Policy 决定——父子是两个可独立收敛的执行，结果必须可验证归属。
- Child 完成 `FINALIZING` 且其 Build Lease 可安全释放、Parent 仍通过恢复校验时，必须在同一受控提交中释放 Child Lease 并为该 Parent 创建专属 `ParentContinuationReservation`；该 Reservation 只用于重新取得 Parent 原 Execution Binding 所绑定的 standard Agent Lease，其 Resource Profile、Unit Weight、Capacity Ledger 与 Lease 原子实现属于[Sandbox Runtime](./04-sandbox-runtime.md)——释放与预留必须原子发生，Parent 才不会在恢复前被普通请求挤掉。
- Parent 随后进入 Agent Continuation Queue 并优先使用自己的 Reservation 恢复，剩余容量才向普通新 Agent 或后续 Build 开放；优先恢复不得绕过 Sandbox 并发上限 Policy、完整 Resource Vector、Placement、并发或安全 Gate，也不得抢占现有执行；`ParentContinuationReservation` 必须绑定 Parent、原 Binding、Generation/Fencing Token、版本化 TTL 与 Policy Version 并通过 Reconciliation 收敛，Parent 失效、取消、归档、删除、超时、恢复 Gate 失败或 TTL 到期时立即释放——优先级只改变排序，不改变准入，也不允许永久占用容量。
- Parent 取消、Requirement 归档或删除、Deadline 到期时必须级联安全终止非终态 Child，迟到的 Child 结果只可审计而不得复活 Parent；Parent 与 Child 的队列、执行与总 Deadline 分别保存，不可用执行等待的默认期限重置——级联终止与独立 Deadline 共同防止孤儿执行。
- `WAITING_CHILD`、Child Execution、Continuation Reservation 与高级恢复都建立在 Run/Attempt 与不可变 Execution Binding 之上：它们不改变原 Binding，也不以恢复、回退或评测结果绕过 Runtime、Model、权限、资源与人工 Gate Contract——高级能力只能叠加在既有 Contract 之上。
- Runtime Permission 只包含读取已绑定仓库、写当前任务分支、执行批准的命令与测试、写 Artifact、发布 Preview 与访问批准的网络目标；默认拒绝未绑定仓库、其他 WorkItem 分支与其他 Workspace，直接 Push 或合并 `main`，Kubernetes API 身份、平台级 Secret 与 Cloud Admin Credential，修改账号、组织、Capability、Assignment、Policy 或 Human Decision，以及扩大 Tool、Network、Resource Profile 或 RuntimeClass；Tool、Egress 或 Secret 被拒绝时形成结构化失败或请求人工处理，绝不扩大权限——执行者的权限面必须小到即使被滥用也无法改写治理事实。
- Context 仅由当前 Requirement/WorkItem、固定版本 SDD/Plan/API Contract、许可的 Repository 内容、当前 Commit/Diff/Test/Review 与相关对话引用组成，Context Builder 记录来源、版本、摘要与数据分类，默认不发送整个 Workspace、其他项目源码、Secret 或未批准附件；超限时按 Context Policy 压缩并保留来源，不静默丢弃关键 Artifact——上下文是可审计输入，超限压缩不能变成证据丢失。
- 短期凭据绑定 Environment、Attempt、Repository、Branch、Tool、Scope 与有效期，进入等待、终态、取消、超时或收到业务终止时立即吊销——凭据的存活期不得超过它所服务的那次执行。
- 所有 Command 使用 Idempotency Key，状态更新使用预期版本、唯一约束或 Fenced Lease，事件携带 Environment、Workspace、Requirement、WorkItem、Run、Attempt 与 Correlation/Causation ID；Orchestrator 重启或重复消息以 Attempt ID、Generation、Fencing Token 与 Reconciliation 幂等收敛——重复投递是分布式常态，幂等与 Fencing 是唯一可靠的收敛方式。
- 审计记录发起人及其 Capability、实际 Agent、Runtime/Bundle/Skill、Model Deployment/Capability/Adapter、Context 来源、Tool/Egress、Repository/Branch/Commit、资源引用、状态、Artifact、回退、重试、取消与 Decision 引用，但不得记录 Secret 值或 Prompt 正文；运行指标按环境展示队列、等待、成功率、Token/成本/延迟/限流、Lease、资源异常、漂移、告警与 Runbook，DEV 与 PROD 不混合——执行必须可解释，但可解释不等于可泄露，也不等于可跨环境合并。

## 与其他模块的关系

下表是本模块自身视角：03 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链中受控执行段的 Run/Attempt 与 Binding 事实 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 发起与控制执行的人员资格判定，以及 Workload Identity 与 Human Assignment 的区分 | 已启动 Attempt 的不可变执行 Contract 边界 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement/WorkItem 业务上下文、Route→Skill 定义、Artifact Contract、人工 Gate 与业务终止命令 | Run/Attempt 执行事实、Child 状态、Skill 内部方法与 Evaluation Evidence |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 隔离物化、Capacity Lease 与 Fencing、资源准入、网络、短期 Secret 注入、Preview 与清理结果 | 不可变 Execution Binding、Parent/Child 生命周期语义，以及 `ParentContinuationReservation` 的创建与释放请求 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | `RepositoryBranchBinding`、任务分支 Push Effect 与交付证据收敛 | Attempt 引用、Agent 的分支写权限边界与 Execution Binding 语义 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | Artifact 对象、消息投递与 Temporal/NATS 运行支撑 | Attempt 日志、评测与执行证据的 Artifact 引用条件 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Secret 注入、Audit Envelope、脱敏与保留 Contract | 本领域的 Audit Trigger（Binding、状态转换、模型回退、取消、权限吊销）与业务摘要 |
| [10 Configuration Governance](./10-configuration-governance.md) | Model、Route、Tool/Context/Network Policy 与执行等待期限的 Draft、发布、回滚与 Effective Snapshot 生命周期 | Agent 与 Model Namespace 的 Schema、默认值与业务解释 |
| [12 实施路线图](./12-implementation-roadmap.md) | Child Type 与 Agent Capability 的阶段选择、激活状态与 Release 验收 | 受控执行的目标 Contract，供 Release Gate 引用 |
| [参数附录](./appendix-parameters.md) | 准入 Policy Key、执行等待期限、资源向量与 Unit 权重、结构化错误码 | 本文正文中的定性规则 |
