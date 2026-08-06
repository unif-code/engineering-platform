# Agent、Skill 与 Model 详细说明

> 文档层级：L2 规范事实源
> 对应主文：[Agent、Skill 与 Model](./agent-skill-model.md)

## 1. 责任边界

本文是 Agent Definition、Superpowers Runtime Bundle、Model Catalog/Capability/Route、Run/Attempt、Execution Binding、Child Execution、执行等待、Context/Tool/Network Policy、事件和失败语义的唯一规范事实源。

Requirement、WorkItem、Route、Gate、人工 Assignment 与 Decision 的业务语义由[Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)拥有。人员资格由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有。Sandbox 的 KVM/Kata、Materialization、Secret 注入、Lease 物理实现和容量 BOM 由未来的[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)拥有；本文只约束其通过 Port 提供的逻辑契约。

Agent 不是人员岗位，不能授予 Capability、扩大 Scope 或做 Human Gate Decision。Prompt、UI 开关和 Model 输出都不是授权事实。首版 Superpowers 随 Runtime 镜像发布，不建设独立 Skill Registry，不接入 `grill-me`；Workflow 不保存 Provider 专有参数或具体 Model 名称。

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
| Execution Binding | Attempt 的不可变运行输入与权限快照 |
| Run / Attempt | 业务目标 / 目标的一次执行 |

首批 Agent Definition 可包含：Requirement Orchestrator、Product Agent、Backend Development Agent、Frontend Delivery Agent、Test Agent 与 Code Review Agent。Definition 至少有稳定 ID、版本、职责、支持阶段、输入/输出 Schema、Skill/Model/Tool Capability、Context Policy 与 Runtime Permission 模板；它不保存人员 ID、实际镜像 digest 或实际 Model Deployment。

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

Superpowers 是 Runtime Bundle 的首版内容。Route 到 Skill 的典型组合为：

```text
feat: brainstorming → writing-plans → test-driven-development
      → verification-before-completion → requesting-code-review

fix:  systematic-debugging → test-driven-development
      → verification-before-completion → requesting-code-review

refactor / chore: 当前 Route 规定的技术流程、测试、验证和代码评审
```

Runtime 镜像必须记录镜像 digest、Bundle hash、可加载 Skill 名单、构建来源、签名与扫描结果。BINDING 阶段缺少所需 Skill、Bundle 或可验证 digest 时失败，不能以相近名称替代。一个 Attempt 内不得热更新 Bundle；未来 Bundle 只能经 `RuntimeBundlePort` 接入，并复用 Binding、权限与审计契约。

## 4. Model Catalog、Capability 与 Route

### 4.1 Deployment Catalog

首版 Provider 接入阿里云百炼 `compatible-mode`。DEV 的首个 Catalog Candidate 登记 `qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro` 与 `kimi-3` 作为可替换的环境 `ModelDeployment` alias/Seed，不是 Workflow 代码常量。

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
RUNNING → WAITING_CHILD → QUEUED

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
| `WAITING_CHILD` | Parent 完成 Handoff，等待独立 Child 的持久化结果 |
| `FINALIZING` | 固化结果、Commit、Artifact、日志、Checkpoint 并清理副作用 |
| `CANCELING` | 幂等终止 Parent/Child、Fence 副作用并回收资源 |
| `SUCCEEDED`、`CANCELED`、`FAILED`、`TIMED_OUT` | 不可逆终态 |

`CREATED → BINDING` 需关联 Run、WorkItem 与有效 Assignment；`BINDING → QUEUED` 需完整持久化 Binding、校验和审计，失败进入 `FAILED`。`QUEUED → PROVISIONING` 只在获得唯一 Fencing 保护 Lease 后进行，`PROVISIONING → RUNNING` 需确认绑定代码、网络 Policy 与短期凭据准备就绪。正常完成一定经过 `FINALIZING`；取消和超时一定经过 `CANCELING`。

终态不可复活。Temporal Activity 可在同一 Binding 中有限重试瞬时基础设施错误，不能变更 Binding。Attempt 失败、取消或超时不自动终结 WorkItem/Requirement；上层 Workflow 决定阻塞、重试、取消或继续。

## 7. 等待、恢复与 Child Execution

### 7.1 WAITING_INPUT

`WAITING_INPUT` 不是人工 Gate。等待期限为版本化 Platform Policy，默认 `24h`，在 Binding 时保存有效值与版本。进入等待前必须持久化结构化问题、Checkpoint、日志与 Artifact，释放活动 Sandbox Capacity Lease 与短期 Secret。

期限内答复时，重新校验当前访问权、WorkItem Assignment 与控制 Capability；通过后仍使用同一个 Attempt/Binding 回到 `QUEUED`，重新获得 Lease 才能 `PROVISIONING`。逾期后经 `CANCELING` 进入 `TIMED_OUT`；迟到答复只能从 Checkpoint 创建新 Attempt。

### 7.2 WAITING_CHILD

首发 Child Type 是 Image Build。同一 Parent Attempt 任一时刻最多有一个非终态 Child，可顺序创建多个但不得以并行绕过限制。Parent 仅在以稳定 Idempotency Key 创建/确认唯一 Child Binding、固化 Checkpoint 与关联引用、并可靠释放自身活动资源后进入 `WAITING_CHILD`。

Child 使用独立 Execution ID、Binding、Lease、Credential 与 Fencing Token。Child 终态先固化 Digest、SBOM/Provenance、日志、Artifact 或结构化错误，再释放资源。Parent 仅在仍等待、未取消/归档/删除/超时、原 Binding 与 Checkpoint 有效且结果属于绑定 Child 时回到 `QUEUED`。Child 失败自身不终结 Parent；Parent 的后续处理由 Tool/Workflow Policy 决定。

Parent 取消、Requirement 归档/删除或 Deadline 到期时，须级联安全终止非终态 Child；迟到 Child 结果只可审计，不得复活 Parent。Parent/Child 的队列、执行和总 Deadline 分别保存，不可用 `WAITING_INPUT` 默认期限重置。Lease、资源向量与物理调度仅通过[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)契约处理。

## 8. Context、Tool、Network 与权限

Runtime Permission 可包含读取已绑定仓库、写当前任务分支、执行批准命令/测试、写 Artifact、发布 Preview、访问批准网络目标。默认拒绝：

- 未绑定仓库、其他 WorkItem 分支或其他 Workspace；
- 直接 Push/合并 `main`；
- Kubernetes API 身份、平台级 Secret、Cloud Admin Credential；
- 修改账号、组织、Capability、Assignment、Policy 或 Human Decision；
- 扩大 Tool、Network、Resource Profile 或 RuntimeClass。

Context 仅由当前 Requirement/WorkItem、固定版本 SDD/Plan/API Contract、许可的 Repository 内容、当前 Commit/Diff/Test/Review 与相关对话引用组成。Context Builder 要记录来源、版本、摘要与数据分类，默认不发送整个 Workspace、其他项目源码、Secret 或未批准附件。

短期凭据绑定 Environment、Attempt、Repository、Branch、Tool、Scope 与有效期。进入等待、终态、取消、超时或收到业务终止时立即吊销。Sandbox 的 Secret 注入、网络 Egress 与物理隔离不在本文重新定义。

## 9. 事件、一致性与失败

稳定 Port：

```text
AgentDefinitionPort
RuntimeBundlePort
ModelGatewayPort
ModelCapabilityCatalogPort
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
