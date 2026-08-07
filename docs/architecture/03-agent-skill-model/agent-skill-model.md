# Agent、Skill 与 Model

> 文档层级：L1 运行地图
> 规范事实源：[Agent、Skill 与 Model 详细说明](./agent-skill-model-detail.md)
> 实施阶段、激活状态和 Release 验收见 [12 实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)。

## 目标与边界

本领域负责 Agent Definition、Superpowers Runtime Bundle、Model Catalog 与 Route、Run/Attempt、不可变 Execution Binding、模型评测工具链、执行等待与运行审计。它不拥有 Requirement 主状态、人工 Gate、人员资格、GitLab 交付协议或 Sandbox 的物理实现。

业务 Workflow 决定何时和为何创建 Run，运行中的 Agent 仅在绑定输入和最小权限内执行；需求、Gate 和业务 Assignment 见[Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)。Sandbox 隔离、资源与物化细节见[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)。

## 概念地图

```text
Agent Definition + Superpowers Runtime Bundle
             + Model Route + Execution Policy
                           ↓
Agent Run → Agent Attempt → immutable Execution Binding
                              ├── Model / Skill / Runtime
                              ├── Context / Tool / Network permissions
                              └── repository branch / resource constraints
```

- `Agent Definition` 描述职责、输入输出、所需逻辑能力与权限模板。
- Runtime Bundle 是随 Runtime 镜像发布的 Skill 集合；当前架构基线使用 Superpowers。
- `Chat Model` 服务于用户对话，`Execution Model` 服务于 Agent；二者独立治理，不能相互隐式继承。
- Run 是业务目标，Attempt 是一次可复现执行；重试或变更输入创建新 Attempt。

## 模型路由

用户对话按 Chat Model Policy 的 Allowlist 选择 Deployment；Agent 只请求如 `coding-backend` 或 `review-code` 的逻辑 Capability，由 Execution Model Route Policy 选择实际 Deployment。当前架构基线通过阿里云百炼 `compatible-mode` 接入，Provider 参数由 Adapter 映射，不能渗入 Workflow 或前端领域模型。

联网搜索与深度思考是 Deployment Capability。Model Search 与批准的 Connector 均是受控路径，不等价于开放 Sandbox 公网出口。

## 运行与恢复

Attempt 在启动前形成不可变 Execution Binding，固定 Agent、Runtime/Bundle/Skill、Model、Context、Tool/Network Permission、仓库分支、资源约束、Policy 与 Deadline。运行中不得静默换 Model、Skill、Runtime、Policy、仓库或分支。

Attempt 生命周期覆盖创建、Binding、排队、Sandbox 物化、运行、收尾与终态；完整状态枚举、转换 Guard 和失败语义只由[详细说明](./agent-skill-model-detail.md)定义。等待用户输入或 Child Execution 时释放活动资源，恢复时沿用同一 Binding 并重新排队；终态不复活。Sandbox 的 Lease、容量、Kata/KVM 与 Secret Materialization 只通过 Sandbox Port 使用。

## Evaluation 与高级恢复

模型与 Prompt 回归使用版本锁定的 `promptfoo` 受控 Job；模型选型与性能基准使用版本锁定的 `EvalScope` 按需 Job。二者只经 `ModelEvaluationPort → ModelGatewayPort` 调用批准 Deployment，不取得 Provider 原始凭据；它们不作为常驻平台运行，不拥有 Prompt、Dataset、Workflow 或 Gate 事实，输入、阈值、实际 Deployment 与结果固定为不可变 Evaluation Evidence，业务是否通过仍由对应 owner 判定。

`WAITING_CHILD`、Child Execution、Continuation Reservation 和高级恢复建立在 Run/Attempt 与不可变 Execution Binding 之上。它们不改变原 Binding，也不以恢复、回退或评测结果绕过 Runtime、Model、权限、资源和人工 Gate Contract。

## 最小权限与可审计性

Execution Binding 只允许读取绑定仓库、写当前任务分支、运行批准工具、写 Artifact、发布 Preview 及访问批准网络目标。默认禁止跨仓库、直接操作 `main`、读取平台级 Secret 或修改身份、授权、Assignment、Policy 与人工 Decision。

事件、状态变更、Model 解析、Context 来源、Tool/Egress、Artifact、失败与重试均以 Correlation ID 审计。已启动 Attempt 不因 Session 失效自动中断；后续控制操作始终重新检查当前授权。
