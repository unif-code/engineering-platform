# Agent、Skill 与 Model 详细说明

> 文档层级：L2 规范事实源
> 对应主文：[Agent、Skill 与 Model](./agent-skill-model.md)
> 实施阶段、激活状态和 Release 验收见 [12 实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)。

## 1. 责任边界

本文是 Agent Definition、Superpowers Runtime Bundle、Model Catalog/Capability/Route、Run/Attempt、Execution Binding、模型评测工具链、执行等待、Child Execution、Context/Tool/Network Policy、事件和失败语义的唯一规范事实源。

Requirement、WorkItem、Route、Gate、人工 Assignment 与 Decision 的业务语义由[Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)拥有。人员资格由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有。Sandbox 的 KVM/Kata、Materialization、Secret 注入、Lease 物理实现和容量 BOM 由[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)拥有；本文只约束其通过 Port 提供的逻辑契约。

Agent 不是人员岗位，不能授予 Capability、扩大 Scope 或做 Human Gate Decision。Prompt、UI 开关和 Model 输出都不是授权事实。Runtime 以随镜像发布的版本化 Superpowers Runtime Bundle 与 Loaded Skill Contract 执行；Workflow 不保存 Provider 专有参数或具体 Model 名称。

## 2. 概念与 Definition

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

每个 Agent Definition 至少有稳定 ID、版本、职责、支持阶段、输入/输出 Schema、Skill/Model/Tool Capability、Context Policy 与 Runtime Permission 模板；它不保存人员 ID、实际镜像 digest 或实际 Model Deployment。Definition 可按同一 Schema 扩展并版本化。

执行授权链为：

```text
用户 Capability + Scope + Membership
→ Workflow 允许业务命令
→ 创建 Run / Attempt
→ Policy 解析最小 Runtime Permission
→ Execution Binding 固化实际输入
→ Agent 仅在 Binding 内运行
```

## 3. Superpowers Runtime Bundle

当前架构基线的 `Superpowers Runtime Bundle` 是 Skill 的唯一权威可加载来源，并随 Runtime 镜像交付。Workflow 解析 Route 并将所需 Bundle 与 Loaded Skill 写入 Execution Binding；Route→Skill 定义由[Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)唯一拥有。

Runtime 镜像必须记录镜像 digest、Bundle hash、Bundle Manifest、可加载 Skill 名单、构建来源、签名与扫描结果。BINDING 阶段只接受 Bundle Manifest 与 Agent Definition 共同允许的 Skill；缺少 Route 所需 Skill、Manifest/Definition 不一致或出现其他动态来源时 Fail Closed。一个 Attempt 内保持同一 Bundle；Bundle 通过 `RuntimeBundlePort` 接入，并复用 Binding、权限与审计契约。

## 4. Model Catalog、Capability 与 Route

### 4.1 Deployment Catalog

当前架构基线的 Provider 接入阿里云百炼 `compatible-mode`。DEV 的首个 Catalog Candidate 登记 `qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro` 与 `kimi-3` 作为可替换的环境 `ModelDeployment` alias/Seed，不是 Workflow 代码常量。

Deployment 激活前，Model Adapter 必须验证实际 Provider Model ID、chat/coding/search/thinking 能力、Context 限制、Quota、价格、数据处理等级、健康状态与参数 Schema。Deployment 至少记录 Provider/Adapter、Model ID、Endpoint/Region、配置版本、输入输出和流式/取消能力、Capability 限制、限流/成本/数据等级与验证证据。不可用 Deployment 仅退出对应 Route 或 Allowlist，不改变 Agent 或 Requirement 状态机。

Capability 是服务端权威事实；Frontend 可据此隐藏选项，Gateway 仍必须拒绝伪造或不支持的请求。

### 4.2 Chat Model 与 Execution Model

**Chat Model 与 Execution Model 分开配置、解析和治理。** Chat Model 服务于用户对话：

```text
用户选择 Chat Model/开关
→ Chat Model Policy 校验 Allowlist、Scope、Deployment 健康
→ Model Gateway 校验 Capability
→ Provider Adapter 映射
→ 百炼 compatible-mode
```

对话界面只显示 Policy 允许的 Deployment；只有支持 search 才显示联网搜索，支持 thinking 才显示深度思考。Chat 请求不创建 Agent Attempt，也不授予 Repository、Sandbox 或 Tool 权限。对话的 Model 与开关绝不隐式传给后续 Agent Binding，Prompt 正文不进入普通 Metric、Trace、Audit 摘要或基础设施日志。

Execution Model 由 Agent Definition/Workflow 请求逻辑 Capability，例如 `reasoning-high`、`coding-frontend`、`coding-backend`、`review-code`、`model-search`。Execution Model Route Policy 综合数据等级、允许 Provider、任务类型、上下文长度、质量、延迟、成本、健康与回退策略，解析实际 Deployment。解析后的 Deployment、Capability Snapshot、search/thinking 开关、Adapter 版本与规范化参数摘要进入 Binding。

未来若允许用户选择 Agent Model，该选择必须作为独立、Policy 约束的 Execution 输入，不得复用 Chat 状态。

### 4.3 搜索、思考与 Adapter

Agent 可经两种受控方式联网：Deployment 原生的 Model Search Capability，或 Workflow 明确批准的 Search Connector。两者都要记录来源、查询、结果引用和数据分类，均受 Context Policy 约束，均不向 Sandbox 授予任意公网出口。

Provider Adapter 的稳定能力至少包括 `invoke`、`stream`、`countTokens`、`cancel`、`healthCheck` 和 `estimateCost`。百炼 `enable_search`、thinking 等非 OpenAI 标准参数仅由 Adapter 从规范化 Capability 请求映射；例如 SDK `extra_body` 不进入 Workflow、Agent Definition 或 Frontend 领域模型。

Capability 不匹配、参数无效或 Deployment 不健康时 Gateway 返回结构化错误。允许回退时必须创建新 Attempt 和新 Binding，记录原失败、目标 Deployment 与原因；同一 Attempt 中严禁静默切换。

## 5. Run、Attempt 与不可变 Execution Binding

Run 是一个业务执行目标；Attempt 是一次具体执行。业务重试创建有序新 Attempt，保留来源、旧 Binding、日志与结果。每个 Attempt 在启动前必须固化：

```text
ExecutionBinding
├── environmentId / workspaceId
├── requirementId / workItemId / assignmentVersion
├── agentDefinitionId / version
├── runtimeImageDigest / skillBundleHash / loadedSkillNames[]
├── modelDeploymentId / capabilitySnapshot / adapterVersion
├── toolPolicyVersion / contextPolicyVersion / networkPolicyVersion
├── runtimePermissions[]
├── repositoryBranchBindingId / repositoryId / branch / baseCommitSha
├── resourceProfileId / digest / resourceVector / unitWeight
├── runtimeProfileId / digest
├── deadlineSnapshot / policyVersions
└── correlationId / createdAt / expiresAt
```

Binding 保存逻辑 Sandbox/Runtime Profile 引用，不保存 Pod、Node 或 RuntimeClass 等物理字段。运行中及从等待恢复时必须使用原 Binding；任何 Agent、Model、Skill、Runtime、Resource Profile、Policy、Repository 或 Branch 变化都要求新 Attempt。

用户 Session 或控制权限失效不会主动中止已启动 Attempt，但立刻影响其后的查看、取消、重试和新 Run。Requirement 取消、归档或删除是业务终止命令，Workflow 通过执行 Port 请求安全停止。

## 6. Attempt 状态与转换

```text
CREATED → BINDING → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED

RUNNING → WAITING_INPUT → QUEUED
任意活动状态 → CANCELING → CANCELED | TIMED_OUT
其他终态：FAILED
```

| 状态 | 语义 |
| --- | --- |
| `CREATED` | 已记录，尚未形成 Binding |
| `BINDING` | 解析并持久化 Agent、模型、Skill、权限、仓库和资源输入 |
| `QUEUED` | Binding 已校验，等待唯一 Fenced Capacity Lease |
| `PROVISIONING` | 通过 Sandbox Port 准备物化、固定分支和短期凭据 |
| `RUNNING` | Agent 运行中 |
| `WAITING_INPUT` | 问题与 Checkpoint 已持久化，等待用户输入 |
| `FINALIZING` | 固化结果、Commit、Artifact、日志、Checkpoint 并清理副作用 |
| `CANCELING` | 幂等终止 Parent/Child、Fence 副作用并回收资源 |
| `SUCCEEDED`、`CANCELED`、`FAILED`、`TIMED_OUT` | 不可逆终态 |

`CREATED → BINDING` 需关联 Run、WorkItem 与有效 Assignment；`BINDING → QUEUED` 需完整持久化 Binding、校验和审计，失败进入 `FAILED`。`QUEUED → PROVISIONING` 只在获得唯一 Fencing 保护 Lease 后进行，`PROVISIONING → RUNNING` 需确认绑定代码、网络 Policy 与短期凭据准备就绪。正常完成一定经过 `FINALIZING`；取消和超时一定经过 `CANCELING`。

终态不可复活。Temporal Activity 可在同一 Binding 中有限重试瞬时基础设施错误，不能变更 Binding。Attempt 失败、取消或超时不自动终结 WorkItem/Requirement；上层 Workflow 决定阻塞、重试、取消或继续。

## 7. Evaluation 工具链

当前架构基线不自建常驻 Prompt/LLMOps 平台。`promptfoo` 是 Prompt、Model Route 与 Agent 黑盒行为的默认回归评测执行器，运行在版本锁定的一次性 Evaluation Job 中；未来 CI 只可触发同一 Job Contract。`EvalScope` 是模型选型、质量基准和推理性能压测的默认按需执行器。二者都不是长期运行的 Deployable，不拥有账号、权限、Prompt、Dataset、Workflow、Gate 或运行事实，也不引入独立数据库和管理界面。

每次评测必须固定工具版本与镜像 digest、Evaluation Config、Dataset/Case Version、Prompt/Template Hash、Model Deployment/Capability Snapshot、随机 Seed、并发、阈值、超时和数据分类。`promptfoo`/`EvalScope` 只能通过 `ModelEvaluationPort → ModelGatewayPort → Provider Adapter` 调用当前环境的批准 Deployment，不取得 Provider 原始 Endpoint、API Key 或 SDK Credential，也不能把工具自己的 Provider/Model 配置带入领域层；能力校验、参数吸收、配额、成本、Correlation 与取消仍由现有 Gateway/Adapter Contract 执行。

执行结果形成不可变 `Evaluation Evidence`，至少包含原始结构化结果、摘要、工具版本、输入 Hash、实际 Model Deployment、Provider Request/Correlation ID、Token/成本/延迟、失败与 Coverage，并通过[Requirement Workflow 的 Artifact Contract](../02-requirement-workflow/requirement-workflow-detail.md)保存稳定引用和内容校验值。业务 Workflow 只能消费该证据并自行判定 Gate；工具的页面、退出码或临时缓存不能直接改写 Requirement、Attempt、Model Catalog 或有效配置。

Evaluation Job 是运行在 `platform-worker` 的受限可信工作负载，只获得本次数据集、批准 Model Route 与结果 Artifact 的最小短期权限，并以 Non-root、只读 RootFS、`automountServiceAccountToken=false` 和 default-deny NetworkPolicy 运行；主工具容器禁止挂载默认 Token 或 Kubernetes API audience Token。确需短期服务身份时，只有 OpenBao Agent init/sidecar 可挂载短 TTL、`audience=openbao` 的 projected ServiceAccount Token，并将短期 mTLS/Service Identity 写入 tmpfs；主工具容器只读取该内存文件，不能挂载或读取用于登录 OpenBao 的 Token。不需要 Secret 的 Job 不启动 Injector。Egress 只允许 Model Gateway、Artifact API 与明确批准的数据集来源。Evaluation Config 只允许已注册的声明式 Provider、Assertion、Evaluator 和 Dataset Adapter，禁止用户提供或加载内联 JavaScript/Python、Shell Command、远程 Plugin 或其他可执行扩展；未来确需执行不可信评测代码时必须新增独立 Sandbox Execution Contract，不能放宽本 Job。

Secret 仍按 08 注入，Prompt、测试输入和模型输出只进入按数据分类保护的评测 Artifact，不进入普通 Log、Trace、Metric Label 或 Audit 正文。评测固定到精确 Model Deployment，禁止静默 Provider fallback；工具崩溃、Case 缺失、结果不可解析、目标 Deployment 不可用或 Coverage 不完整时，本次证据为无效或不完整，禁止伪造通过结论，重新执行必须生成新的 Evaluation Evidence。

## 8. 等待、恢复与 Child Execution

### 8.1 WAITING_INPUT

`WAITING_INPUT` 不是人工 Gate。等待期限为版本化 Platform Policy，默认 `24h`，在 Binding 时保存有效值与版本。进入等待前必须持久化结构化问题、Checkpoint、日志与 Artifact，释放活动 Sandbox Capacity Lease 与短期 Secret。

期限内答复时，重新校验当前访问权、WorkItem Assignment 与控制 Capability；通过后仍使用同一个 Attempt/Binding 回到 `QUEUED`，重新获得 Lease 才能 `PROVISIONING`。逾期后经 `CANCELING` 进入 `TIMED_OUT`；迟到答复只能从 Checkpoint 创建新 Attempt。

### 8.2 WAITING_CHILD

高级 Child 路径增加 `RUNNING → WAITING_CHILD → QUEUED` 转换；`WAITING_CHILD` 表示 Parent 已完成 Handoff，正在等待独立 Child 的持久化结果。

本 Target Contract 定义的 Child Type 范围包含 Image Build；新增 Child Type 必须独立定义状态机、Binding、资源、权限、结果与恢复 Contract，不能复用 Image Build 的隐含假设。具体 Child Type 的实施阶段、激活状态与 Release 验收只由 [12 实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)记录，本领域不保存当前启用或部署事实。同一 Parent Attempt 任一时刻最多有一个非终态 Child，可顺序创建多个但不得以并行绕过限制。Parent 仅在以稳定 Idempotency Key 创建/确认唯一 Child Binding、固化 Checkpoint 与关联引用、并可靠释放自身活动资源后进入 `WAITING_CHILD`。

Child Build Execution 使用独立状态机，不能复用 Parent Attempt 状态；状态集合固定为：

```text
CREATED | QUEUED | PROVISIONING | RUNNING | FINALIZING | SUCCEEDED
| CANCELING | CANCELED | FAILED | TIMED_OUT
```

`SUCCEEDED`、`CANCELED`、`FAILED`、`TIMED_OUT` 是供 Parent 消费的结构化终态结果。`WAITING_INPUT` 与 `WAITING_CHILD` 只属于 Parent Attempt，不能写入 Child Build Execution。

Build Handoff 已完成但 Child 尚未取得 Lease 时，如果有效的 `agent.image_build.active_build_limit=0`，Sandbox 返回 `POLICY_DISABLED`。本领域必须将 Child 收敛为带该原因码的 `CANCELED` 终态、固化结构化结果并唤醒仍有效的 Parent；该 Child 不能无限保持 `QUEUED`，也不能把普通 Policy 下调解释为强杀已持有 Lease 的 Child。

Child 使用独立 Execution ID、Binding、Lease、Credential 与 Fencing Token。Child 终态先固化 Digest、SBOM/Provenance、日志、Artifact 或结构化错误，再释放资源。Parent 仅在仍等待、未取消/归档/删除/超时、原 Binding 与 Checkpoint 有效且结果属于绑定 Child 时回到 `QUEUED`。Child 失败自身不终结 Parent；Parent 的后续处理由 Tool/Workflow Policy 决定。

Child 完成 `FINALIZING` 且其 Build Lease 可安全释放时，若 Parent 仍通过上述恢复校验，系统必须在同一受控提交中释放 Child Lease，并为该 Parent 创建专属 `ParentContinuationReservation`。该 Reservation 只用于重新取得 Parent 原 Execution Binding 所绑定的 standard Agent Lease；具体 Resource Profile、Unit Weight、Capacity Ledger 与 Lease 原子实现由[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)拥有。

Parent 随后进入 Agent Continuation Queue，优先使用自己的 Reservation 恢复；剩余容量才向普通新 Agent 或后续 Build 开放。优先恢复不得绕过 `agent.sandbox.active_attempt_limit`、Resource Vector、Placement、并发或安全 Gate，也不得抢占现有执行。

`ParentContinuationReservation` 必须绑定 Parent、原 Binding、Generation/Fencing Token、版本化 TTL 与 Policy Version，并通过 Reconciliation 收敛。Parent 失效、取消、归档、删除或超时，恢复 Gate 失败，或 TTL 到期时，Reservation 必须立即释放，不能永久占用容量。本领域拥有 Parent/Child 生命周期和优先恢复语义；Sandbox Runtime 拥有 Reservation 对 Capacity Ledger/Lease 的原子物化与释放。

Parent 取消、Requirement 归档/删除或 Deadline 到期时，须级联安全终止非终态 Child；迟到 Child 结果只可审计，不得复活 Parent。Parent/Child 的队列、执行和总 Deadline 分别保存，不可用 `WAITING_INPUT` 默认期限重置。Lease、资源向量与物理调度仅通过[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)契约处理。

## 9. Context、Tool、Network 与权限

Runtime Permission 可包含读取已绑定仓库、写当前任务分支、执行批准命令/测试、写 Artifact、发布 Preview、访问批准网络目标。默认拒绝：

- 未绑定仓库、其他 WorkItem 分支或其他 Workspace；
- 直接 Push/合并 `main`；
- Kubernetes API 身份、平台级 Secret、Cloud Admin Credential；
- 修改账号、组织、Capability、Assignment、Policy 或 Human Decision；
- 扩大 Tool、Network、Resource Profile 或 RuntimeClass。

Context 仅由当前 Requirement/WorkItem、固定版本 SDD/Plan/API Contract、许可的 Repository 内容、当前 Commit/Diff/Test/Review 与相关对话引用组成。Context Builder 要记录来源、版本、摘要与数据分类，默认不发送整个 Workspace、其他项目源码、Secret 或未批准附件。

短期凭据绑定 Environment、Attempt、Repository、Branch、Tool、Scope 与有效期。进入等待、终态、取消、超时或收到业务终止时立即吊销。Sandbox 的 Secret 注入、网络 Egress 与物理隔离不在本文重新定义。

## 10. 事件、一致性与失败

稳定 Port：

```text
AgentDefinitionPort
RuntimeBundlePort
ModelGatewayPort
ModelCapabilityCatalogPort
ModelEvaluationPort
ExecutionPolicyPort
AgentRunPort
ArtifactPort
SandboxPort
```

关键事件：

```text
AgentRunRequested / ExecutionBound / AgentAttemptQueued / AgentAttemptStarted
AgentWaitingInput / AgentWaitingChild / AgentAttemptFinalizing
AgentAttemptSucceeded / AgentAttemptFailed / AgentAttemptCanceled
ModelDeploymentHealthChanged / ModelFallbackRequested / RuntimePermissionRevoked
```

所有 Command 使用 Idempotency Key；状态更新使用预期版本、唯一约束或 Fenced Lease。事件携带 Environment、Workspace、Requirement、WorkItem、Run、Attempt 及 Correlation/Causation ID。Orchestrator 重启或重复消息以 Attempt ID、Generation、Fencing Token 和 Reconciliation 幂等收敛。

| 场景 | 处理 |
| --- | --- |
| Runtime/Bundle/Skill digest 不可验证 | `BINDING` 失败，不请求 Sandbox |
| Model Capability 不匹配 | 重新按 Route 解析；无可用 Deployment 则失败 |
| Model 限流或不可用 | 有界重试；允许回退则新 Attempt |
| Context 超限 | 按 Context Policy 压缩并保留来源，不静默丢关键 Artifact |
| Tool、Egress 或 Secret 被拒绝 | 结构化失败或请求人工处理，不扩大权限 |
| Capacity 不足 | 保持 `QUEUED`，不物化 Sandbox |
| Memory/Ephemeral 超限 | 安全终止并记录 `RESOURCE_EXHAUSTED` 证据 |
| 取消、归档或 Deadline | `CANCELING`，Fence Parent/Child 并撤销凭据 |

审计记录发起人及其 Capability、实际 Agent、Runtime/Bundle/Skill、Model Deployment/Capability/Adapter、Context 来源、Tool/Egress、Repository/Branch/Commit、资源引用、状态、Artifact、回退、重试、取消与 Decision 引用；不得记录 Secret 值或 Prompt 正文。运行指标按环境展示队列、等待、成功率、Token/成本/延迟/限流、Lease、资源异常、漂移、告警和 Runbook，DEV 与 PROD 不混合。
