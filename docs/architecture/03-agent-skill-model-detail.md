# Agent、Skill 与 Model 详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[Agent、Skill 与 Model](./03-agent-skill-model.md)

## 1. 职责与边界

本模块负责 Agent 定义、Runtime Bundle、Model Gateway、Execution Binding、Attempt 生命周期与运行审计，不拥有 Requirement/WorkItem 主状态、人员 Capability、GitLab 分支保护或 Human Gate 的最终业务事实。

目标：

- Agent、Superpowers、Model、Tool、Context、Sandbox 和人员授权相互解耦；
- 平台对话 Chat Model 与 Agent Runtime Execution Model 分开配置和治理；
- 每个 Attempt 固化可复现的执行输入，不在运行中静默换 Model、Runtime、Skill 或 Policy；
- Agent 只获得当前 WorkItem 和任务分支的最小权限；
- Provider、Model 或 Sandbox 实现替换时不修改 Requirement Workflow。

边界：

- Agent 不能充当人员岗位、授予 Capability 或作出 Human Gate Decision；
- Prompt、UI 隐藏按钮和 Model 输出都不是授权事实；
- 首版 Superpowers 随 Runtime 镜像发布，不建设独立 Skill Registry，不接入 `grill-me`；
- 业务 Workflow 不保存具体 Model 名称或 Provider 专有参数。

## 2. 概念模型

| 概念 | 职责 |
| --- | --- |
| Business Capability + Scope | 判断人员能否发起、控制、查看或审核业务动作 |
| Agent Definition | 描述一类 AI 执行者的职责、输入输出和所需逻辑能力 |
| Runtime Bundle | 随 Runtime 镜像发布的一组 Skill；首版为 Superpowers |
| Loaded Skill | 当前 Attempt 实际加载的方法 |
| Model Deployment | 可调用的 Provider、Model/alias、Endpoint、Region、Quota 与版本事实 |
| Model Capability | Deployment 声明并经验证的 chat、coding、search、thinking 等能力 |
| Chat Model Policy | 控制平台对话区允许展示和选择哪些 Deployment/Capability |
| Execution Model Route Policy | 把 Agent 请求的逻辑能力解析为实际 Deployment |
| Tool / Runtime Permission | 限制一次 Attempt 可调用的工具、资源和副作用 |
| Execution Binding | 一次 Attempt 的不可变执行快照 |
| Agent Run | 一个业务执行目标 |
| Agent Attempt | Run 的一次具体执行；重试形成新 Attempt |

授权链保持分离：

```text
用户 Capability + Scope + Membership
→ 允许发起 Workflow Command
→ Workflow 创建 Run / Attempt
→ Policy 生成最小 Runtime Permission
→ Execution Binding 固化实际权限和资源
→ Agent 只能在 Binding 内执行
```

## 3. Agent Definition 与 Runtime Bundle

### 3.1 首批 Agent

| Agent | 主要输入 | 主要输出 |
| --- | --- | --- |
| Requirement Orchestrator | Requirement、Route、Policy、当前状态 | 子 Run、交互请求、阶段结果 |
| Product Agent | `feat` 上下文、初始仓库、产品规范 | 澄清结果、Product SDD、页面/Mock Artifact |
| Backend Development Agent | 当前 Baseline、后端 WorkItem/仓库 | Technical SDD、API Contract、代码与测试 |
| Frontend Delivery Agent | 当前 Baseline、前端 WorkItem/仓库 | 前端代码、Preview 与测试 |
| Test Agent | 固定 Commit、Contract、验收标准 | 测试结果与证据 |
| Code Review Agent | 固定 `headSha`、Diff、规范、测试结果 | AI Review 建议 |

`AgentDefinition` 至少包含稳定 ID、版本、职责、支持阶段、输入/输出 Schema、所需 Skill/Model/Tool Capability、Context Policy 和 Runtime Permission 模板。它不保存实际镜像 digest、Model Deployment 或人员 ID。

### 3.2 Superpowers 路由

```text
feat
→ brainstorming
→ writing-plans
→ test-driven-development
→ verification-before-completion
→ requesting-code-review

fix
→ systematic-debugging
→ test-driven-development
→ verification-before-completion
→ requesting-code-review

refactor / chore
→ 当前 Route 要求的技术流程、测试、验证和代码评审
```

Workflow 只定义路由、状态和 Gate，不复制 Skill 内部步骤。Runtime 镜像必须记录镜像 digest、Bundle hash、可加载 Skill 清单、构建来源、签名和扫描结果；缺少所需 Skill 时在 `BINDING` 阶段失败，不得用名称相似的 Skill 替换。

同一 Attempt 内不得热更新 Runtime Bundle。未来其他 Bundle 通过 `RuntimeBundlePort` 接入，并复用相同 Execution Binding、权限与审计契约。

## 4. Model Gateway

### 4.1 Deployment 与 Capability Catalog

首版Provider为阿里云百炼`compatible-mode`。当前DEV首个Model Catalog Candidate登记`qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro`和`kimi-3`四个Provider配置名/alias；它们仅作为可替换`ModelDeployment`环境配置Seed存在，不写入Workflow代码。激活前Model Adapter必须校验实际Provider Model ID、chat/coding/search/thinking能力、Context限制、Quota、价格、数据处理等级和健康状态；不可用Deployment只从对应Route/Allowlist退出，不改变Agent或Requirement状态机。

每个 Deployment 记录：

- Provider/Adapter、实际 Model 标识、Endpoint/Region 和配置版本；
- 可用上下文、输入/输出类型、流式与取消能力；
- 是否支持联网搜索、深度思考、多模态和对应约束；
- Quota、限流、健康、成本和允许的数据等级；
- Provider 参数 Schema 及验证证据。

Capability 是服务端权威事实。Frontend 可以据此隐藏不支持的选项，但 Gateway 必须再次校验，不能信任客户端提交的开关。

### 4.2 平台对话 Chat Model

```text
用户选择 Chat Model/开关
→ Chat Model Policy 校验 Allowlist、Scope 与 Deployment 健康
→ Model Gateway 校验 Capability
→ Provider Adapter 映射参数
→ 百炼 compatible-mode
```

- 对话区只展示 Chat Model Policy 允许的 Deployment；
- 只有 Deployment 支持搜索时才显示“联网搜索”，支持 thinking 时才显示“深度思考”；
- Chat 请求不自动创建 Agent Attempt，也不授予 Repository、Sandbox 或 Tool 权限；
- 用户在对话区选择的 Model 和开关不得隐式传递给后续 Agent Execution Binding；
- Prompt 正文不进入普通 Metric、Trace、Audit 摘要或基础设施日志。

### 4.3 Agent Execution Model

Agent Definition 和 Workflow 只请求逻辑 Capability，例如 `reasoning-high`、`coding-frontend`、`coding-backend`、`review-code`、`model-search`。Execution Model Route Policy 根据数据等级、允许 Provider、任务类型、上下文长度、质量、延迟、成本、健康和回退策略解析实际 Deployment。

解析结果、Capability Snapshot、搜索/思考开关、Provider Adapter 版本和规范化参数摘要进入 Execution Binding。Agent 不继承 Chat Model 选择；未来若允许用户为 Agent 选 Model，也必须作为独立、受 Policy 约束的输入参与 Binding，而不能复用对话区状态。

Agent 联网有两条受控路径：

1. Deployment 原生支持搜索时，由 Model Gateway 调用 Model Search Capability；
2. Workflow 明确批准 Search Connector 时，由 Tool Policy 和 Connector Egress 执行。

两条路径都必须记录来源、查询、结果引用和数据分类，并遵守 Context Policy。它们不能给 Sandbox 打开任意公网出口。

### 4.4 Provider Adapter

稳定接口至少支持 invoke、stream、countTokens、cancel、healthCheck 和 estimateCost。百炼 `enable_search`、thinking 等非 OpenAI 标准参数只能由 Adapter 根据规范化 Capability 请求映射，例如 Python SDK 需要的 `extra_body` 细节不得进入 Workflow、Agent Definition 或 Frontend 领域模型。

Provider 不支持请求的 Capability、参数校验失败或 Deployment 不健康时，Gateway 返回结构化错误。若 Route Policy 允许回退，必须创建新的 Attempt 和新的 Execution Binding，记录原失败、目标 Deployment 与原因；同一 Attempt 内禁止静默切换。

## 5. Execution Binding

每个 Attempt 在启动前形成不可变绑定：

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

Binding 保存逻辑 Sandbox/Runtime Profile，不保存可被 Workflow 依赖的 Pod、Node 或 RuntimeClass 名称。运行中或从等待状态恢复时始终使用原 Binding；任何 Model、Skill、Runtime、Resource Profile、Policy、Repository 或 Branch 变化都需要新 Attempt。

## 6. Attempt 状态机

```text
CREATED
→ BINDING
→ QUEUED
→ PROVISIONING
→ RUNNING
→ FINALIZING
→ SUCCEEDED

RUNNING → WAITING_INPUT → QUEUED
RUNNING → WAITING_CHILD → QUEUED

任意活动状态 → CANCELING → CANCELED
任意活动状态 → CANCELING → TIMED_OUT

其他终态：FAILED
```

- `BINDING`：解析并持久化不可变 Binding；解析失败进入 `FAILED`；
- `QUEUED`：不持有活动 Sandbox，等待原子 Capacity Lease；
- `PROVISIONING`：获得带 Generation/Fencing Token 的 Lease，创建 Materialization、挂载固定分支并申请短期 Secret；
- `RUNNING`：Agent 正在执行；
- `WAITING_INPUT`：结构化问题和 Checkpoint 已持久化，活动资源与短期凭据已释放；
- `WAITING_CHILD`：Parent 已完成持久化 Handoff 并释放资源，等待独立 Child Execution；
- `FINALIZING`：固化 Commit、Artifact、日志与 Checkpoint，停止副作用，清理资源和凭据；
- `CANCELING`：按不可变 terminationCause 幂等停止 Parent/Child、Fence 副作用并释放 Lease；
- `SUCCEEDED`、`CANCELED`、`FAILED`、`TIMED_OUT` 为不可逆终态。

正常执行不能绕过 `FINALIZING`，取消和超时不能绕过 `CANCELING`。业务重试创建有序新 Attempt 并关联来源；Temporal Activity 可以在同一 Binding 内有限重试瞬时错误，但不能改变 Binding。

## 7. 等待、Child Execution 与容量

### 7.1 `WAITING_INPUT`

等待期限为版本化 Platform Policy，默认 `24h`，在 Binding 时保存有效值和 Policy 版本。进入等待前必须固化结构化问题、Checkpoint、日志和 Artifact，并释放 Sandbox Capacity Lease 与短期 Secret。

用户答复时重新校验当前访问权、WorkItem Assignment 和控制 Capability；通过后同一 Attempt 回到 `QUEUED`，重新获得 Lease 后才进入 `PROVISIONING`。迟到答复不能复活已超时 Attempt，需要从 Checkpoint 创建新 Attempt。

### 7.2 `WAITING_CHILD`

首个 Child Type 为 Image Build。Parent 使用稳定 Idempotency Key 创建唯一 Child Binding，固化 Checkpoint 后释放自己的 Agent Lease，Child 才能申请 Build Lease。Child 结束后先固化 Digest、SBOM/Provenance、日志、Artifact 或结构化错误，再释放资源并唤醒仍有效的 Parent。

Parent 保持同一 Attempt/Binding，从 Continuation Queue 重新获得 `1 Unit` 后恢复。Parent 取消、Requirement 归档/删除或 Deadline 到期时级联安全终止非终态 Child；迟到 Child 结果只用于审计，不能复活 Parent。

### 7.3 Capacity Contract

- `resource/standard-v1` 为 `1 Unit`；
- `resource/image-build-v1` 为 `2 Units`；
- DEV `maxSandboxCapacityUnits=5`，PROD 为 `8`；
- Agent 与 Build Lease 在同一原子 Capacity Ledger 和 Fencing 域中扣减；
- Parent 处于 `WAITING_CHILD` 时占 `0 Unit`，Build 必须一次取得完整 `2 Units`；
- 没有 Build 时最多 DEV 5、PROD 8 个 standard Agent；一个 Build 活动时最多另有 DEV 3、PROD 6 个 standard Agent。

产品并发上限只能由 Super Admin 在已验证 Capacity Envelope 内配置；物理 Unit Ceiling、Resource Profile、Lease 和调度事实由 GitOps/Capacity Profile 管理，平台只读展示。

## 8. Runtime Permission 与 Context

常用 Runtime Permission 包括读取已绑定仓库、写当前任务分支、执行批准命令/测试、写 Artifact、发布 Preview 和访问批准网络目标。默认禁止：

- 访问未绑定仓库、其他 WorkItem 分支或其他 Workspace；
- 直接 Push/合并 `main`；
- 获取 Kubernetes API 身份、平台级 Secret 或 Cloud Admin Credential；
- 修改账号、组织、Capability、Assignment、Policy 或 Human Decision；
- 扩大 Tool、Network、Resource Profile 或 RuntimeClass。

Context 只包含当前 Requirement/WorkItem、固定版本 SDD/Plan/API Contract、允许的 Repository 内容、当前 Commit/Diff/Test/Review 和相关对话引用。Context Builder 记录来源、版本、摘要与数据分类，不默认发送整个 Workspace、其他项目源码、Secret 或未批准附件。

短期凭据与 Environment、Attempt、Repository、Branch、Tool、Scope 和有效期绑定。进入等待、终态、取消、超时、归档或删除时立即吊销。

## 9. Human Gate 与 Assignment

Agent、AI Review 和确定性检查只能产生证据，不能伪造人员 Decision。当前稳定 Gate Type 包括：

- `REQUIREMENT_BASELINE_CONFIRMATION`；
- `REQUIREMENT_ACCEPTANCE`；
- `FORMAL_MR_REVIEW`。

所有 Requirement 类型的 SDD/Baseline Confirmation 默认审核人为 Requirement 创建人。创建时保存 `defaultReviewerId` 和 `currentReviewerId`；默认审核人可以在 Decision 前异步改派给具备所需 Capability、Scope 和 Membership 的候选人。被改派的实际审核人只负责 Decision，不能继续转派，除非其同时是默认审核人。

人员创建者或产物作者可以自审，只要他是 Current Assignment 的 assignee 且资格实时有效。Formal MR Review 使用独立 Assignment 和 Policy，不复用 SDD Decision；MR 的具体解析规则由 Source Control 领域负责。

## 10. Port、事件与一致性

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
AgentRunRequested
ExecutionBound
AgentAttemptQueued
AgentAttemptStarted
AgentWaitingInput
AgentWaitingChild
AgentAttemptFinalizing
AgentAttemptSucceeded
AgentAttemptFailed
AgentAttemptCanceled
ModelDeploymentHealthChanged
ModelFallbackRequested
RuntimePermissionRevoked
```

所有 Command 使用 Idempotency Key，状态转换使用期望版本、唯一约束或 Fenced Lease；事件携带 Environment、Workspace、Requirement、WorkItem、Run、Attempt 和 Correlation/Causation ID。

## 11. 失败处理

| 场景 | 处理 |
| --- | --- |
| Runtime/Bundle/Skill digest 不可验证 | `BINDING` 失败，不创建 Sandbox |
| Model Capability 不匹配 | 重新按 Policy 解析；无有效 Deployment 时失败，不伪造开关 |
| Model 限流或不可用 | 有界重试；允许回退时创建新 Attempt |
| Context 超限 | 按 Context Policy 结构化压缩并保留来源，不静默删除关键 Artifact |
| Tool、Egress 或 Secret 被拒绝 | 结构化失败或请求人工处理，不扩大权限 |
| Capacity 不足 | 保持 `QUEUED`，不创建无 Lease Sandbox |
| Memory/Ephemeral 超限 | 安全终止并记录 `RESOURCE_EXHAUSTED` 证据 |
| 用户取消、归档或 Deadline | 进入 `CANCELING`，Fence Parent/Child 并吊销凭据 |
| Orchestrator 重启或重复消息 | 通过 Attempt ID、Generation、Fencing Token 和 Reconciliation 幂等收敛 |

## 12. 审计、指标与验收

审计记录发起人及 Capability、实际 Agent、Runtime/Bundle/Skill、Model Deployment/Capability/Adapter、Context 来源、Tool/Egress、Repository/Branch/Commit、Resource/Runtime Profile、Lease、状态转换、Artifact、回退、重试、取消和人员 Decision 引用，不记录 Secret 值或把 Prompt 正文写入普通审计字段。

管理后台在当前环境展示 Run/Attempt 成功率、队列长度与年龄、`WAITING_INPUT`/`WAITING_CHILD`、Model Token/成本/延迟/限流、回退、Active Lease、Capacity Unit、资源峰值、Throttle/OOM/Eviction、Runtime/Policy Drift、告警与 Runbook。DEV 和 PROD 数据不跨环境混合。

验收至少覆盖：

1. Chat Model 选择和联网/思考开关不会改变 Agent Execution Model；
2. 不支持搜索或 thinking 的 Deployment 在 UI 不显示开关，伪造请求也被 Gateway 拒绝；
3. `feat` 与 `fix` 分别加载当前确认的 Superpowers 路由；
4. Attempt 运行中无法静默更换 Model、Skill、Runtime 或 Resource Profile；
5. Agent 只能写当前任务分支，不能直接 Push/合并 `main`；
6. `WAITING_INPUT` 和 `WAITING_CHILD` 释放 Lease，恢复时沿用原 Binding 并重新排队；
7. Model 回退、业务重试和终态后继续均创建新 Attempt；
8. Agent、AI Review 或 Connector 无法作出 Human Gate Decision；
9. Model 或 Sandbox Provider 替换不修改 Requirement Workflow。
