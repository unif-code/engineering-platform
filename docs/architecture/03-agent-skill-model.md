# Agent、Skill 与 Model

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[Agent、Skill 与 Model 详细设计](./03-agent-skill-model-detail.md)

## 1. 模块目标

将“谁能发起操作”“由哪个 AI 执行”“使用什么方法执行”“由哪个 Model 推理”彻底解耦。第一阶段使用随 Agent Runtime 镜像发布的 Superpowers，保留未来替换 Runtime Bundle 的接口。

## 2. 概念边界

```text
人员 Capability：决定用户是否有权发起或审批
Agent：决定由哪类 AI 执行工作
Skill：决定 Agent 按什么专业流程和规范执行
Model：提供推理、代码生成或多模态能力
Runtime Policy：限制 Agent 本次可以访问的工具与资源
```

Agent 不是人员岗位，也不继承用户的全部 Capability。

## 3. Agent 类型

平台首批提供：

- Requirement Orchestrator；
- Product Agent；
- Backend Development Agent；
- Frontend Delivery Agent；
- Test Agent；
- Code Review Agent。

Agent 定义职责、输入输出和允许使用的工具，不固定 Model，也不写死具体 Skill。

## 4. Superpowers Runtime Bundle

第一阶段不建设独立 Skill Registry、Skill 发布中心或 Workspace 版本选择页面。Workflow 根据 Requirement 类型调用 Superpowers：

- `feat`：`brainstorming`、`writing-plans`、TDD、验证和代码评审；
- `fix`：`systematic-debugging`、TDD、验证和代码评审；
- `refactor` / `chore`：按影响范围执行技术快速流程。

Superpowers 随 Agent Runtime 镜像发布。同一 Attempt 内不允许热更新；未来接入其他 Skill Bundle 时复用相同 Runtime Adapter。

## 5. Model 路由

业务流程只引用 Model Capability 或逻辑别名，例如：

- `reasoning-high`；
- `coding-frontend`；
- `coding-backend`；
- `review-security`。

Model Gateway 再根据 Workspace Policy、成本、可用性、上下文长度和任务类型选择实际 Provider 与版本，并支持回退。具体 Model 名称不得写入 Workflow 代码。

## 6. 权限与人工门禁

每次 Agent Run 只获得：

- 指定 Requirement；
- 指定 Repository 和 Branch；
- 指定 Sandbox；
- 指定 Tool；
- 有效期内的短期凭据。

Agent 默认不能审批自己的产物、修改平台权限或合并 `main`。产品确认、产品 Leader确认、开发 Leader审核和 MR 审批属于人工责任。

## 7. 治理与审计

每个 `AgentRunAttempt` 记录：

- Runtime 镜像 digest、Skill Bundle hash 和实际加载的 Skill 名称；
- Agent、Model、Tool Policy 和 Context Policy；
- Prompt 和上下文来源版本；
- 工具调用、Commit、Artifact；
- Token、成本、耗时、失败原因；
- 人工确认和覆盖决策。

这样既能复现结果，也能按 Workspace、Project、Requirement、Agent、Skill Bundle 和 Model 分析质量与成本。
