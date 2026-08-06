# Agent、Skill 与 Model

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[Agent、Skill 与 Model 详细设计](./03-agent-skill-model-detail.md)

## 1. 模块目标

将人员授权、AI 执行者、执行方法、Model 路由和运行资源解耦。业务 Workflow 只表达业务目标和逻辑能力，不绑定具体 Provider、Model 名称、Runtime 镜像或 Kubernetes 实现。

## 2. 概念边界

```text
人员 Capability + Scope：决定人员能否发起、控制或审核业务动作
Agent Definition：定义一类 AI 执行者的职责与输入输出
Runtime Bundle / Skill：定义执行方法，首版使用 Superpowers
Chat Model：服务平台对话区，由 Chat Model Policy 管理
Execution Model：服务 Agent Attempt，由 Model Route Policy 管理
Tool / Runtime Permission：限制本次执行允许产生的副作用
Execution Binding：固化一次 Attempt 的全部实际执行事实
```

Agent 不是人员岗位，也不继承发起人的全部 Capability。Agent 不能作出 Human Gate Decision。

## 3. Agent 与 Superpowers

首批 Agent 包括 Requirement Orchestrator、Product Agent、Backend Development Agent、Frontend Delivery Agent、Test Agent 和 Code Review Agent。Agent Definition 只声明职责、输入输出、所需逻辑能力和权限，不固定 Model 或镜像。

首版 Superpowers 随 Agent Runtime 镜像发布：

- `feat` 使用完整 SDD 路由；
- `fix` 从 `systematic-debugging` 开始，并继续 TDD、验证和代码评审；
- `refactor`、`chore` 按当前 Route 执行技术流程；
- 不接入 `grill-me`，也不在平台复制 Superpowers 已提供的方法。

同一 Attempt 内禁止热更新 Runtime Bundle。未来接入其他 Bundle 时复用 `RuntimeBundlePort`、Execution Binding 和审计契约。

## 4. Model Gateway

首版通过阿里云百炼 `compatible-mode` 接入可配置Model Deployment/alias。当前DEV首个Catalog Candidate登记`qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro`和`kimi-3`；它们是环境配置Seed，不是Workflow代码常量，激活前必须验证实际Provider ID、Capability、Quota、价格和健康状态。

平台对话与 Agent 执行分开治理：

- 对话区只展示 Chat Model Policy 允许用户选择的 Deployment；
- 联网搜索、深度思考等开关只在所选 Deployment 声明支持时显示；
- 百炼 `enable_search`、thinking 等非 OpenAI 标准参数只由 Provider Adapter 映射；
- Agent 不继承对话区的 Model 选择，而是请求逻辑 Model Capability，由 Execution Model Route Policy 解析实际 Deployment；
- Agent 联网通过支持搜索的 Model Capability 或批准的 Connector，不能因此获得 Sandbox 任意公网出口。

Model、Runtime、Skill 或 Policy 需要变化时创建新 Attempt；不得在运行中的 Attempt 内静默切换。

## 5. Run、Attempt 与 Execution Binding

Run 表示业务执行目标，Attempt 表示一次具体执行。每个 Attempt 的不可变 Execution Binding 至少固化：

- Requirement、WorkItem、Assignment、Repository Branch Binding；
- Agent Definition、Runtime 镜像 digest、Superpowers Bundle hash 和实际 Skill；
- Execution Model Deployment、Capability 与 Provider 参数解析结果；
- Tool、Context、Network、Runtime Permission；
- Resource/Runtime Profile、Sandbox 和 Secret Lease 约束；
- Policy 版本、Deadline 和 Correlation ID。

Attempt 使用 `CREATED → BINDING → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED` 主路径，并支持 `WAITING_INPUT`、`WAITING_CHILD`、`CANCELING` 以及 `CANCELED`、`FAILED`、`TIMED_OUT` 终态。重试创建新 Attempt，不覆盖旧 Binding、日志或结果。

等待用户输入或异步 Image Build 时释放活动 Sandbox 与短期凭据，恢复时沿用原 Attempt 和 Binding，重新排队获取带 Fencing Token 的 Capacity Lease。

## 6. 权限与人工 Gate

Agent 只获得当前 WorkItem、仓库、任务分支、Sandbox、Tool 和有效期内短期凭据的最小权限。默认禁止访问其他仓库或分支、直接 Push/合并 `main`、读取平台级 Secret、修改人员授权或绕过 Gate。

`REQUIREMENT_BASELINE_CONFIRMATION`、`REQUIREMENT_ACCEPTANCE` 和 `FORMAL_MR_REVIEW` 等 Human Gate 只能由当前 Assignment 的合格人员作出 Decision。人员作者可以在 Assignment、Capability、Scope 和 Membership 均有效时自审；这不等于允许 Agent 代替人员审批。

已经启动的 Attempt 不因用户 Session 失效或控制权限变化而自动停止，但权限变化立即影响查看、取消、重试和新 Run。Requirement 归档、删除或显式取消属于业务终止命令，必须安全停止相关执行并吊销凭据。

## 7. 容量、治理与审计

Sandbox Capacity Ledger 统一管理 Agent Attempt 与 Image Build：`resource/standard-v1` 占 `1 Unit`，`resource/image-build-v1` 占 `2 Units`；首个 Capacity Profile 为 DEV `5 Units`、PROD `8 Units`。Capacity Unit 是准入权重，不是 CPU 时间、计费单位、用户配额或 Pod 数量。

每个 Attempt 记录实际 Agent、Runtime/Bundle digest、Skill、Model、Capability、Provider 参数解析、Context 来源、Tool 调用、Commit、Artifact、Token、成本、耗时、状态变化、资源 Lease、失败与人工决策。历史事实不得被后续配置或部署变更改写。
