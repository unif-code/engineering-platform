# 内部研发平台架构文档

> 架构基线：`2026-08-06.175`

## 文档目标与事实层级

本目录是内部研发平台的唯一架构文档入口。它把系统边界、领域 Contract、技术事实、安全与环境运行要求按唯一 owner 组织，供设计、开发、评审、部署与恢复验证共同使用。

阅读和维护时必须区分三层事实，任何一层都不能替代另一层：

| 事实层 | 回答的问题 | 唯一事实源 |
| --- | --- | --- |
| Target Architecture | 平台完整目标由哪些模块、边界、Port/Adapter、不变量和安全 Contract 构成？ | 00～11；领域规则由对应 detail 唯一拥有，11 只索引跨模块基线。 |
| Implementation Roadmap | 哪些 Capability 被选入哪个 Release、实施到什么状态、采用哪个 Profile，以及如何从 DEV Promotion 到 PROD？ | [12 实施路线图](./12-implementation-roadmap.md)、[路线图详细说明](./12-implementation-roadmap.md)与[环境容量和服务器规划](./environment-capacity-plan.md)。 |
| Deployed State | 某个 Platform Environment 实际运行什么 Image Digest/Bundle、配置、拓扑、容量和健康状态？ | 该环境受保护 Git 路径形成的 GitOps Desired State、Platform Compatibility Set（PCS）和 Operations Read Model 证据；Markdown 与 HTML 不复制运行状态。 |

Target Architecture 的适用与 Gate 规则见[架构基线详细说明](./11-architecture-baseline.md)；Implementation Roadmap 的 Scope、状态与 Profile 选择见[实施路线图详细说明](./12-implementation-roadmap.md)；Deployed State 的环境证据定义见[基础设施与运维详细说明](./09-infrastructure-operations.md)和[Configuration Governance 详细说明](./10-configuration-governance.md)。

## 受众阅读路径

| 受众 | 推荐路径 |
| --- | --- |
| 负责人、架构评审 | 00 → 11，再进入与决策相关的领域 detail；需要评估交付顺序时再读取 12。 |
| 产品、Leader、研发协作方 | 00 → 12 → 01、02、05 的对应 detail，按 Release Scope 补充 03、04。 |
| 应用与 Agent 开发 | 00 → 12 → 当前 Capability 对应的领域 detail，并以 08、09、10 的 Contract 约束实现。 |
| 平台、安全、运维 | 00 → 12 → 06～10 的对应 detail；架构评审回到 11，运行判断回到 Deployed State 证据。 |

## 文档导航

| 编号 | 主题 | L1 架构地图 | L2 详细 Contract | 一句职责 |
| --- | --- | --- | --- | --- |
| 00 | 平台总览 | [L1](./00-platform-overview.md) | [L2](./00-platform-overview.md) | 说明 System Context、总体边界和责任链。 |
| 01 | 身份、组织与授权 | [L1](./01-identity-organization-authorization.md) | [L2](./01-identity-organization-authorization.md) | 说明身份、组织、成员与服务端授权。 |
| 02 | Requirement Workflow | [L1](./02-requirement-workflow.md) | [L2](./02-requirement-workflow.md) | 说明业务责任、审核、验收与证据。 |
| 03 | Agent、Skill 与 Model | [L1](./03-agent-skill-model.md) | [L2](./03-agent-skill-model.md) | 说明受控执行、模型路由、评测工具链和不可变 Binding。 |
| 04 | Sandbox Runtime | [L1](./04-sandbox-runtime.md) | [L2](./04-sandbox-runtime.md) | 说明隔离执行环境、容量与恢复。 |
| 05 | Source Control 与交付 | [L1](./05-source-control-delivery.md) | [L2](./05-source-control-delivery.md) | 说明代码绑定、交付证据和 MR 协作。 |
| 06 | 平台应用与集成 | [L1](./06-platform-application-integration.md) | [L2](./06-platform-application-integration.md) | 说明应用边界、集成、安全公告和运维可见性。 |
| 07 | 数据、消息与存储 | [L1](./07-data-messaging-storage.md) | [L2](./07-data-messaging-storage.md) | 说明数据事实、消息、Artifact 与组件恢复。 |
| 08 | 安全、审计与治理 | [L1](./08-security-audit-governance.md) | [L2](./08-security-audit-governance.md) | 说明 Trust、Secret、加密、Audit 与安全恢复。 |
| 09 | 基础设施与运维 | [L1](./09-infrastructure-operations.md) | [L2](./09-infrastructure-operations.md) | 说明环境、Flux GitOps、Kubernetes、可观测性、DR 与容量。 |
| 10 | Configuration Governance | [L1](./10-configuration-governance.md) | [L2](./10-configuration-governance.md) | 说明配置分类、生命周期、Effective Snapshot 与 Promotion。 |
| 11 | 架构基线 | [L1](./11-architecture-baseline.md) | [L2](./11-architecture-baseline.md) | 索引跨模块不变量、质量场景和三类 Gate。 |
| 12 | 实施路线图 | [L1](./12-implementation-roadmap.md) | [L2](./12-implementation-roadmap.md) · [容量规划](./environment-capacity-plan.md) | 唯一记录 Release Scope、实施状态、环境 Promotion、Profile 选择与人数容量场景。 |

## main/detail Contract

- 每个主题的 main 是 L1 架构地图，只写目标、边界、关系、主要链路与进入 detail 的导航。
- 对应 detail 是 L2 规范事实源，唯一拥有该主题的 Contract；其他文档只引用 owner，不复制状态、参数、算法或默认值。
- 00～11 构成 Target Architecture；12 只编排实施与环境 Promotion，不修改或弱化目标 Contract。
- 离线 HTML 架构地图固定入口为[平台架构地图](./visuals/platform-architecture-map.html)；其中节点只提供导航和摘要，Markdown 仍是唯一架构事实源。

## 维护规则

1. 修改前先定位事实 owner；在 owner detail 更新 Contract，再同步其 main、跨模块引用和验证证据。
2. 产品版本范围、Release 阶段、实施状态、环境 Promotion、Launch Profile 和人数容量场景只在 12 维护；00～11 只固定链接，不复制这些事实。
3. 不在 README、HTML、管理看板、Read Model、Telemetry 或外部 Feed 中复制或重写领域规范事实或 Deployed State。
4. 变更跨环境、授权、安全、数据兼容性、执行恢复或交付边界时，必须检查 11 的跨模块不变量、质量场景和 Gate 分类。
5. 文档只表达当前有效目标 Contract 与路线图事实，不保留方案比较、对话记录或过期规则。
