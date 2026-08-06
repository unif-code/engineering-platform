# Requirement Workflow

> 文档层级：L1 领域地图
> 规范事实源：[Requirement Workflow 详细说明](./requirement-workflow-detail.md)

## 目标与边界

Requirement Workflow 将一项业务交付从创建、基线确认、实现、验证、验收直到合并完成串为可追溯流程。它拥有 Requirement、WorkItem、Route、Gate、Decision、Artifact 与 Integration Baseline 的业务语义；不拥有人员资格、Agent 执行实现、Sandbox 物理形态或 GitLab 协议细节。

人员是否有资格承担责任由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)判定。本领域保存的是 Requirement、Gate 或验收的当前责任 Assignment，不能以 Assignment 补足 Capability、Scope 或 Membership。

## 对象地图

```text
Requirement
├── Route Snapshot
├── WorkItem × 1..n
│   ├── Human Assignment / Repository Branch Binding
│   ├── Run → Attempt × 1..n
│   ├── Route / test / external-validation Artifact
│   └── delivery reference
├── Gate Instance → Assignment → Decision
├── Integration Baseline
└── recordState
```

- `Requirement` 是整体交付与验收聚合。
- `WorkItem` 是一个仓库中的可交付责任；一个最终只对应一个仓库与任务分支。
- `Run` 表示执行目标，`Attempt` 表示一次固定执行输入的尝试；其运行语义由[Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)拥有。
- `Artifact` 是可准确版本绑定的流程证据，而不是源码或持续变化分支的替代品。

## 主流程

```text
创建 Requirement 与初始仓库
→ 按 Route 形成基线与 Artifact
→ Human Gate 确认
→ 拆分、分配并启动 WorkItem
→ 实现与验证
→ 冻结 Integration Baseline
→ 最终验收
→ Formal MR 合并
→ COMPLETED
```

创建时选择 `feat`、`fix`、`refactor` 或 `chore`。第一个 WorkItem 继承初始仓库；后续 WorkItem 可以先等待仓库。未绑定仓库不得创建分支、启动执行或创建交付请求。仓库与任务分支的创建、集成和 MR 协议由[Source Control Delivery](../05-source-control-delivery/source-control-delivery-detail.md)定义。

Route 将方法与业务流程分开：`feat` 使用完整 SDD，`fix` 从 `systematic-debugging`、TDD、验证和代码评审开始，`refactor` 与 `chore` 形成各自技术基线。实际启用的每一份 SDD 或 Route Baseline 均须经过人工确认。

## Gate、责任与验收

Gate 以“Policy → 绑定版本的 Gate Instance → Current Assignment → Decision”表达。默认审核人由创建时解析的 Policy 决定，默认回退为 Requirement 创建人；默认责任人可在 Decision 前异步改派。Agent、AI Review 和确定性检查仅提交证据，不能形成 Human Decision。

最终验收以冻结的 Integration Baseline 为输入；基线、Artifact、Commit 或交付证据改变会使相关结论失效。全部必需 WorkItem 的交付合并且验收仍有效时，Requirement 才完成。

## 生命周期与不变量

Requirement 主路径为 `CREATED → PREPARING → AWAITING_CONFIRMATION → READY → IN_PROGRESS → VERIFYING → AWAITING_ACCEPTANCE → AWAITING_MERGE → COMPLETED`，可受控进入 `CANCELED`。WorkItem、Attempt、Child Execution 与交付对象使用独立状态机；执行失败产生阻塞和恢复入口，不伪造 Requirement 失败终态。

`recordState=ACTIVE | ARCHIVED | DELETED` 与业务进度正交。归档或逻辑删除须先安全停止活动执行，恢复恢复业务可见性与继续入口，但不复活旧 Attempt。所有状态转换、Assignment、Decision、Artifact 与外部事实均受后端 Guard、幂等和审计约束。

Artifact 的对象存储、文件安全、配额账本和 Audit 存储实现由未来的[Data/Messaging/Storage](../07-data-messaging-storage/data-messaging-storage-detail.md)与[Security/Audit/Governance](../08-security-audit-governance/security-audit-governance-detail.md)拥有；本领域仅使用其可验证结果。
