# Agent、Skill 与 Model

> 文档层级：L1 运行地图
> 规范事实源：[Agent、Skill 与 Model 详细说明](./agent-skill-model-detail.md)

## 目标与边界

本领域负责 Agent Definition、Superpowers Runtime Bundle、Model Catalog 与 Route、Run/Attempt、Execution Binding、执行等待与运行审计。它不拥有 Requirement 主状态、人工 Gate、人员资格、GitLab 交付协议或 Sandbox 的物理实现。

业务 Workflow 决定何时和为何创建 Run，运行中的 Agent 仅在绑定输入和最小权限内执行；需求、Gate 和业务 Assignment 见[Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)。Sandbox 隔离、资源与物化细节见未来的[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)。

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
- Runtime Bundle 是随 Runtime 镜像发布的 Skill 集合；首版为 Superpowers。
- `Chat Model` 服务于用户对话，`Execution Model` 服务于 Agent；二者独立治理，不能相互隐式继承。
- Run 是业务目标，Attempt 是一次可复现执行；重试或变更输入创建新 Attempt。

## 模型路由

用户对话按 Chat Model Policy 的 Allowlist 选择 Deployment；Agent 只请求如 `coding-backend` 或 `review-code` 的逻辑 Capability，由 Execution Model Route Policy 选择实际 Deployment。首版通过阿里云百炼 `compatible-mode` 接入，Provider 参数由 Adapter 映射，不能渗入 Workflow 或前端领域模型。

联网搜索与深度思考是 Deployment Capability。Model Search 与批准的 Connector 均是受控路径，不等价于开放 Sandbox 公网出口。

## 运行与恢复

Attempt 在启动前形成不可变 Execution Binding，固定 Agent、Runtime/Bundle/Skill、Model、Context、Tool/Network Permission、仓库分支、资源约束、Policy 与 Deadline。运行中不得静默换 Model、Skill、Runtime、Policy、仓库或分支。

主路径是 `CREATED → BINDING → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED`。等待用户输入或 Child Execution 时释放活动资源，恢复时沿用同一 Binding 并重新排队；终态不复活。Sandbox 的 Lease、容量、Kata/KVM 与 Secret Materialization 只通过 Sandbox Port 使用。

## 最小权限与可审计性

Execution Binding 只允许读取绑定仓库、写当前任务分支、运行批准工具、写 Artifact、发布 Preview 及访问批准网络目标。默认禁止跨仓库、直接操作 `main`、读取平台级 Secret 或修改身份、授权、Assignment、Policy 与人工 Decision。

事件、状态变更、Model 解析、Context 来源、Tool/Egress、Artifact、失败与重试均以 Correlation ID 审计。已启动 Attempt 不因 Session 失效自动中断；后续控制操作始终重新检查当前授权。
