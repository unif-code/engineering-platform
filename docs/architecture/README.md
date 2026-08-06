# 内部研发平台架构文档

## 文档目标与当前状态

本目录是内部研发平台的唯一架构文档入口。它把系统边界、领域 Contract、技术事实、安全与环境运行要求按唯一 owner 组织，供设计、开发、评审、部署与恢复验证共同使用。

当前仓库是 Umi Max 前端模板，当前只有 DEV Platform Environment。Python Control Plane、数据服务、可部署工作负载、基础设施及未来 PROD 是已批准的目标架构；文档定义目标 Contract，不表示这些能力已经由仓库实现或已运行。

## 受众阅读路径

| 受众 | 推荐路径 |
| --- | --- |
| 负责人、架构评审 | 00 → 10，再进入与决策相关的 L2 detail。 |
| 产品、Leader、研发协作方 | 00 → 01 → 02 → 05，按执行需要补充 03、04。 |
| 应用与 Agent 开发 | 01 → 02 → 03 → 04 → 05 → 06 → 07，并以 08、09 作为约束。 |
| 平台、安全、运维 | 06 → 07 → 08 → 09 → 10，并回链领域 owner 获取业务语义。 |

## 文档导航

| 编号 | 主题 | L1 架构地图 | L2 详细 Contract | 一句职责 |
| --- | --- | --- | --- | --- |
| 00 | 平台总览 | [L1](./00-platform-overview/platform-overview.md) | [L2](./00-platform-overview/platform-overview-detail.md) | 说明 System Context、总体边界和责任链。 |
| 01 | 身份、组织与授权 | [L1](./01-identity-organization-authorization/identity-organization-authorization.md) | [L2](./01-identity-organization-authorization/identity-organization-authorization-detail.md) | 说明身份、组织、成员与服务端授权。 |
| 02 | Requirement Workflow | [L1](./02-requirement-workflow/requirement-workflow.md) | [L2](./02-requirement-workflow/requirement-workflow-detail.md) | 说明业务责任、审核、验收与证据。 |
| 03 | Agent、Skill 与 Model | [L1](./03-agent-skill-model/agent-skill-model.md) | [L2](./03-agent-skill-model/agent-skill-model-detail.md) | 说明受控执行、模型路由和不可变 Binding。 |
| 04 | Sandbox Runtime | [L1](./04-sandbox-runtime/sandbox-runtime.md) | [L2](./04-sandbox-runtime/sandbox-runtime-detail.md) | 说明隔离执行环境、容量与恢复。 |
| 05 | Source Control 与交付 | [L1](./05-source-control-delivery/source-control-delivery.md) | [L2](./05-source-control-delivery/source-control-delivery-detail.md) | 说明代码绑定、交付证据和 MR 协作。 |
| 06 | 平台应用与集成 | [L1](./06-platform-application-integration/platform-application-integration.md) | [L2](./06-platform-application-integration/platform-application-integration-detail.md) | 说明应用边界、集成、配置和运维可见性。 |
| 07 | 数据、消息与存储 | [L1](./07-data-messaging-storage/data-messaging-storage.md) | [L2](./07-data-messaging-storage/data-messaging-storage-detail.md) | 说明数据事实、消息、Artifact 与组件恢复。 |
| 08 | 安全、审计与治理 | [L1](./08-security-audit-governance/security-audit-governance.md) | [L2](./08-security-audit-governance/security-audit-governance-detail.md) | 说明 Trust、Secret、加密、Audit 与安全恢复。 |
| 09 | 基础设施与运维 | [L1](./09-infrastructure-operations/infrastructure-operations.md) | [L2](./09-infrastructure-operations/infrastructure-operations-detail.md) | 说明环境、Kubernetes、可观测性、DR 与容量。 |
| 10 | 架构基线 | [L1](./10-architecture-baseline/architecture-baseline.md) | [L2](./10-architecture-baseline/architecture-baseline-detail.md) | 索引跨模块不变量、质量场景和演进 Gate。 |

## main/detail Contract

- 每个主题的 main 是 L1 架构地图，只写目标、边界、关系、主要链路与进入 detail 的导航。
- 对应 detail 是 L2 规范事实源，唯一拥有该主题的 Contract；其他文档只引用 owner，不复制状态、参数、算法或默认值。
- 离线 HTML 架构地图固定入口为[平台架构地图](./visuals/platform-architecture-map.html)；其中节点只提供导航和摘要，Markdown 仍是唯一架构事实源。

## 维护规则

1. 修改前先定位事实 owner；在 owner detail 更新 Contract，再同步其 main、跨模块引用和验证证据。
2. 不在 README、HTML、管理看板、Read Model、Telemetry 或外部 Feed 中复制或重写规范事实。
3. 变更跨环境、授权、安全、数据兼容性、执行恢复或交付边界时，必须检查 10 的跨模块不变量与质量场景。
4. 文档只表达当前有效目标 Contract，不保留方案比较、对话记录或过期规则。
