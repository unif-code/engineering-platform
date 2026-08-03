# Agent、Skill 与 Model 详细设计

> 文档层级：L2 详细版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 对应精简版：[Agent、Skill 与 Model](./03-agent-skill-model.md)

## 1. 目标

本模块负责选择和编排 AI 执行者，但不拥有 Requirement 状态、人员授权或 GitLab 业务规则。

目标：

- Agent、Superpowers Runtime Bundle、Model、Tool 和人员 Capability 相互解耦；
- 根据 Requirement 类型调用固定的 Superpowers Skill 路由；
- 每次 Attempt 固定并记录 Runtime 镜像、Bundle hash 和实际 Skill，保证可追溯；
- Agent 只获得当前 Requirement、Repository、Branch 和 Sandbox 的最小权限；
- Model Provider 或版本替换时不修改业务 Workflow。

非目标：

- 不用 Agent 类型代替人员岗位；
- 不允许 Agent 自行授予权限或跨越人工 Gate；
- 不把 Prompt 当作权限控制；
- 不在业务代码中硬编码具体 Model 名称。
- 第一阶段不建设独立 Skill Registry、Skill 发布中心或 Workspace Skill 版本选择。
- 第一阶段不接入 `grill-me`。

## 2. 概念模型

| 概念 | 作用 | 示例 |
| --- | --- | --- |
| Business Capability | 判断人员是否能发起、审批或管理业务操作 | `requirement:create`、`mr:merge` |
| Agent Definition | 描述一类 AI 执行者的职责、输入输出和运行约束 | Product Agent、Backend Agent |
| Runtime Bundle | 随 Agent Runtime 镜像发布的一组可调用 Skill | Superpowers |
| Loaded Skill | 当前 Attempt 实际加载的方法 | `brainstorming`、`systematic-debugging` |
| Model Deployment | 一个可调用的 Model Provider 部署 | Provider、Model、Region、Quota |
| Model Capability | Model 能力标签 | `coding`、`reasoning-high` |
| Tool | 可实际产生副作用的工具 | 文件编辑、命令执行、Git、测试 |
| Runtime Permission | 限制一次 Agent Run 可以调用什么工具和资源 | `repo:write-task-branch` |
| Execution Binding | 一次 Attempt 固定的 Agent、Runtime、Skill、Model 和 Policy 集合 | 不可变执行快照 |

人员 Business Capability 与 Agent Runtime Permission 使用不同命名空间和授权链：

```text
用户 Capability
→ 允许用户发起一次业务动作

Workflow
→ 创建 Agent Run
→ 根据 Policy 生成 Runtime Permission
→ Agent 在有限资源范围内执行
```

用户拥有 `development:execute`，不代表 Agent 继承用户所有权限；Agent 只得到当前任务分支写权限。

## 3. Agent Definition

首批 Agent：

| Agent | 主要输入 | 主要输出 |
| --- | --- | --- |
| Requirement Orchestrator | Requirement、当前状态、Policy | 阶段调度、人工 Gate、子 Run |
| Product Agent | `feat` 需求、前端仓库、组件规范 | 澄清、Product Spec、Plan、页面、Mock |
| Backend Development Agent | 当前 Route Baseline、后端仓库 | Backend Spec、Plan、API Contract、代码 |
| Frontend Delivery Agent | 当前 Route Baseline、API Contract | Delivery Plan、正式前端代码、测试 |
| Test Agent | Commit、Contract、验收标准 | 测试结果与证据 |
| Code Review Agent | Diff、规范、测试结果 | 分级 Review 建议 |

`AgentDefinition` 至少包含：

```text
id
code
version
purpose
supportedWorkflowStages
inputSchema
outputSchema
requiredSkillNames
requiredRuntimePermissions
contextPolicyId
toolPolicyId
modelRoutePolicyId
status
```

Agent 只声明需要哪些 Skill 名称和 Runtime 能力，不指定 Runtime 镜像 digest、Model 名称或人员。

## 4. Superpowers Runtime Bundle

### 4.1 发布方式

第一阶段 Superpowers 随 Agent Runtime 镜像构建和发布，不在 Control Plane 中复制 Skill 内容。部署元数据至少包含：

- Runtime 镜像 digest；
- Skill Bundle hash；
- 镜像内可加载的 Skill 名称；
- 构建时间和部署环境；
- 安全扫描与签名结果。

同一 `AgentRunAttempt` 启动后禁止热更新 Runtime Bundle。新镜像只影响后续新建 Attempt。

### 4.2 Requirement 路由

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
→ 按影响范围选择必要的测试、验证和代码评审
```

Workflow Engine 只持有路由、状态和 Gate，不重复定义上述 Skill 的内部步骤。若 Runtime 镜像缺少路由要求的 Skill，Attempt 在 Binding 阶段失败，不得用名称相近的 Skill 静默替换。

### 4.3 未来扩展

未来其他 Skill Bundle 通过 `RuntimeBundlePort` 接入，并复用 Execution Binding、Runtime Permission 和审计契约。是否建设独立 Registry 必须由真实多 Bundle 管理需求驱动，不属于第一阶段。

## 5. 指令与 Policy 优先级

从高到低：

1. 平台安全与合规 Policy；
2. Workspace 数据、Model、Tool 和网络 Policy；
3. Repository 固有规范；
4. 当前 Workflow 指定的 Superpowers Skill；
5. Requirement 上下文和用户补充信息。

低优先级内容不能扩大高优先级允许的权限。Repository 中的文本也不能要求 Agent 读取其他 Workspace、输出 Secret 或绕过人工审批。

## 6. Model Gateway

### 6.1 逻辑路由

Workflow 只请求逻辑能力：

```text
reasoning-high
coding-frontend
coding-backend
review-code
multimodal-ui
```

`ModelRoutePolicy` 根据以下条件选择实际部署：

- Workspace Model Allowlist；
- 数据等级和 Provider 区域；
- 任务类型与上下文长度；
- 质量、延迟和成本预算；
- Provider 健康度与限流；
- 是否允许自动回退。

### 6.2 Provider Adapter

统一接口至少包含：

```text
invoke
stream
countTokens
cancel
healthCheck
estimateCost
```

Provider 专有参数由 Adapter 映射，不能泄漏到 Requirement Workflow。

### 6.3 回退

自动回退必须满足 Workspace Policy。每次回退创建新的 `AgentRunAttempt`，记录原失败、目标部署和原因，不得在同一个 Attempt 中静默替换 Model。

## 7. Execution Binding

启动 Agent Run 前生成不可变绑定：

```text
ExecutionBinding
├── requirementId
├── workflowStage
├── agentDefinitionVersion
├── runtimeImageDigest
├── skillBundleHash
├── loadedSkillNames[]
├── modelDeploymentId
├── toolPolicyVersion
├── contextPolicyVersion
├── runtimePermissions[]
├── repositoryAndBranch[]
├── sandboxId
└── expiresAt
```

执行过程中若需更换 Runtime、Skill、Model 或 Policy，创建新 Attempt 和新 Binding。历史结果始终能定位到实际执行环境。

## 8. Agent Run 状态

```text
CREATED
→ BINDING
→ WAITING_SANDBOX
→ RUNNING
→ WAITING_HUMAN
→ SUCCEEDED

异常终态：
FAILED | CANCELED | TIMED_OUT
```

`WAITING_HUMAN` 只表示 Agent 暂停等待输入或审批，不代表审批已经通过。

Run 和 Attempt 分离：

- Run 表示一次业务执行目标；
- Attempt 表示一次具体 Runtime Bundle、Model 和 Sandbox 尝试；
- 重试保留原 Attempt，不覆盖日志。

## 9. Runtime Permission

常用权限：

```text
repository:read
repository:write-task-branch
command:execute-allowlisted
test:execute
preview:publish
artifact:write
network:access-allowlisted
mr:create
```

默认禁止：

- 访问未绑定的 Repository；
- 写其他 Requirement 分支；
- Push 或合并 `main`；
- 读取平台级 Secret；
- 修改用户、岗位、Capability 或 Policy；
- 审批本次 Agent 生成的 Artifact。

凭据与 Run、Sandbox、Repository、Branch 和有效期绑定。Run 结束、取消、超时或协作成员到期时立即吊销。

## 10. Context 管理

Context 由结构化引用组成：

- Requirement 与验收标准；
- 固定版本的 Spec、Plan、API Contract；
- Repository Profile 和允许读取的代码；
- Workspace 与 Repository 规范；
- 当前 Commit、Diff、测试与 Review；
- 与当前阶段相关的历史对话。

不得默认把完整 Workspace 历史、其他项目代码或 Secret 发送给 Model。Context 构建结果需要记录来源、版本、摘要和数据分类。

## 11. 人工 Gate

以下适用于当前路由的 Gate 不能由 Agent 自行通过：

- `feat` 的产品黄金需求确认；
- `feat` 的产品 Leader黄金需求确认；
- 开发 Leader技术审核和分配；
- 当前路由要求的产品最终验收；
- 开发 Leader审批 MR；
- 超级管理员安全操作。

Agent 可以提出建议、生成检查结果或请求确认，但 Workflow Service 才能依据人员 Capability 和 Artifact 版本推进状态。

## 12. API 边界

建议 Port：

```text
AgentRegistryPort
RuntimeBundlePort
ModelGatewayPort
ExecutionPolicyPort
AgentRunPort
ArtifactPort
SandboxPort
```

所有创建或重试操作接受 `idempotencyKey`；所有状态更新携带期望版本，避免重复请求和并发覆盖。

## 13. 领域事件

```text
AgentRunRequested
ExecutionBound
AgentRunStarted
AgentWaitingHuman
AgentRunSucceeded
AgentRunFailed
AgentRunCanceled
RuntimeBundleDeployed
ModelDeploymentHealthChanged
ModelFallbackApplied
RuntimePermissionRevoked
```

事件包含 `correlationId`、Requirement、Run、Attempt、Workspace 和版本信息。

## 14. 失败处理

| 场景 | 处理 |
| --- | --- |
| Runtime 缺少路由要求的 Skill | Binding 失败并阻塞，不使用不相关 Skill |
| Runtime 镜像或 Bundle hash 不可验证 | Binding 失败，不启动 Sandbox |
| Model 限流或不可用 | 按 Policy 重试或创建回退 Attempt |
| Context 超限 | 按 Context Policy 压缩并保留来源，不静默丢弃关键 Artifact |
| Tool 被拒绝 | Agent Run 失败或等待人工，不扩大权限 |
| 输出不符合 Schema | 限次修复；失败后保留原输出 |
| 人工修改了 Artifact | 使相关 Agent 结论和审批过期，按需重跑 |
| Run 被取消 | 停止工具调用、吊销凭据并封存日志 |

## 15. 审计与指标

审计记录：

- 谁发起、依据什么 Business Capability；
- 实际 Agent、Runtime 镜像 digest、Bundle hash、加载的 Skill、Model 和 Policy；
- Context 来源、Tool 调用和 Runtime Permission；
- 生成 Artifact、Commit 和校验结果；
- 回退、重试、人工覆盖和取消。

指标包括：

- Run/Attempt 成功率和平均耗时；
- Runtime Bundle 与 Skill 使用量和失败分布；
- Model Token、成本、延迟、限流和回退率；
- 人工接管率；
- Agent 产物一次通过率和返修率。

## 16. 验收场景

1. `feat` Attempt 按顺序加载完整 Superpowers SDD 路由。
2. `fix` Attempt 从 `systematic-debugging` 开始，不执行完整 Product SDD。
3. 同一个 Agent 可以在不修改 Workflow 的情况下更换 Model Deployment。
4. 用户能发起开发，但 Agent 只能写当前任务分支。
5. Agent 请求合并 `main` 时被 Runtime Policy 拒绝并审计。
6. Model 回退生成独立 Attempt 和 Execution Binding。
7. Runtime 镜像或 Model 升级不改变历史 Attempt 的绑定记录。
8. Artifact 修改后，基于旧版本的 Review 和审批自动失效。
9. Runtime 缺少要求的 Skill、Model 或 Sandbox 时，Workflow 进入明确的阻塞状态而不是假成功。
