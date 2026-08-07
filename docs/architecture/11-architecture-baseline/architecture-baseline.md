# 架构基线

> 架构基线：`2026-08-06.175`
> 文档层级：L1 基线地图
> 规范跨模块 Contract：[架构基线详细说明](./architecture-baseline-detail.md)

## 基线定位与适用范围

本文是内部研发平台的批准 Target Architecture 基线，用于指导设计、实施、评审与运行准备。它定义完整目标模块及跨模块 Contract，不声明仓库实现进度、Release Scope、Platform Environment 部署状态或容量选择。

DEV 与 PROD 以同源代码、Contract、GitOps 模板和 Platform Compatibility Set 在独立环境中实例化。Release Scope、实施状态、环境 Promotion 与 Profile 选择由 [12 实施路线图](../12-implementation-roadmap/implementation-roadmap.md)唯一拥有；实际 Deployed State 由环境 GitOps Desired State、PCS 与 Operations Read Model 证据证明。

## 系统级原则

1. 平台以领域事实、明确责任和可验证证据为中心；浏览器展示、菜单、Read Model、Telemetry 与外部 Feed 均不是权威事实源。
2. 授权、Workflow、执行、交付、数据、安全和运维各自拥有规范性 Contract；跨模块协作使用稳定引用，不复制彼此的状态或参数。
3. 所有环境、信任材料、数据、凭据和故障域保持隔离；受保护操作在信任、授权、配额或恢复条件不可证明时 Fail Closed。
4. 模块内事务保持单一事实边界；跨模块与外部副作用通过 Outbox、Inbox、Effect Ledger、幂等键和审计证据收敛。
5. 配置是有类型、可版本化且可回溯的受控输入；运行和决策绑定有效配置快照，而不是依赖可变页面值。
6. 架构可替换基础设施、可提取模块与可独立迁移 Deployable，但不以过早拆分牺牲当前系统的一致性和可运营性。

## Gate 分类

- **Release Gate**：判断路线图选定的 Release Scope 能否形成可发布候选或完成环境 Promotion。
- **Capability Activation Gate**：判断某项已实施 Capability 是否可在指定 Environment、Scope 和配置下开启。
- **Evolution Trigger**：由业务、容量、可靠性或运维证据触发新的演进候选评估，不直接批准实现、启用或部署。

被路线图选入当前 Release 的能力必须满足其目标 Contract，未选能力保持关闭。任何 Gate 都不能通过缩减安全边界、以半成品启用目标能力或用路线图状态替代环境证据来通过；详细分类与跨模块验证维度见[架构基线详细说明](./architecture-baseline-detail.md)。

## 模块地图

| 编号 | 主题 | L1 | L2 规范事实 |
| --- | --- | --- | --- |
| 00 | 平台总览 | [平台总览](../00-platform-overview/platform-overview.md) | [详细说明](../00-platform-overview/platform-overview-detail.md) |
| 01 | 身份、组织与授权 | [架构地图](../01-identity-organization-authorization/identity-organization-authorization.md) | [详细说明](../01-identity-organization-authorization/identity-organization-authorization-detail.md) |
| 02 | Requirement Workflow | [架构地图](../02-requirement-workflow/requirement-workflow.md) | [详细说明](../02-requirement-workflow/requirement-workflow-detail.md) |
| 03 | Agent、Skill 与 Model | [架构地图](../03-agent-skill-model/agent-skill-model.md) | [详细说明](../03-agent-skill-model/agent-skill-model-detail.md) |
| 04 | Sandbox Runtime | [架构地图](../04-sandbox-runtime/sandbox-runtime.md) | [详细说明](../04-sandbox-runtime/sandbox-runtime-detail.md) |
| 05 | Source Control 与交付 | [架构地图](../05-source-control-delivery/source-control-delivery.md) | [详细说明](../05-source-control-delivery/source-control-delivery-detail.md) |
| 06 | 平台应用与集成 | [架构地图](../06-platform-application-integration/platform-application-integration.md) | [详细说明](../06-platform-application-integration/platform-application-integration-detail.md) |
| 07 | 数据、消息与存储 | [架构地图](../07-data-messaging-storage/data-messaging-storage.md) | [详细说明](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| 08 | 安全、审计与治理 | [架构地图](../08-security-audit-governance/security-audit-governance.md) | [详细说明](../08-security-audit-governance/security-audit-governance-detail.md) |
| 09 | 基础设施与运维 | [架构地图](../09-infrastructure-operations/infrastructure-operations.md) | [详细说明](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| 10 | Configuration Governance | [架构地图](../10-configuration-governance/configuration-governance.md) | [详细说明](../10-configuration-governance/configuration-governance-detail.md) |
| 11 | 架构基线 | 本文 | [详细说明](./architecture-baseline-detail.md) |

## 阅读优先级

- 负责人和架构评审先阅读 00、11 的 L1，再按决策主题进入对应 L2。
- 产品、Leader 和研发先阅读 00、12，再进入当前 Capability 对应的领域 detail。
- 应用和 Agent 开发按 12 的 Release Scope 阅读 02～07、10 的 L2，并以 08 的安全 Contract 和 09 的环境 Contract 约束实现。
- 平台、安全与运维按 12 的 Profile 选择阅读 06～10 的 L2；架构评审回到 11，运行判断回到 Deployed State 证据。

## 变更规则

架构变更先识别事实 owner，再在该 owner 的 detail 中更新规范性 Contract，并同步更新相关 L1 地图、跨模块引用和验证证据。路线图只选择要交付的 Capability，不能修改目标 Contract；任何变更不得通过菜单、Read Model、部署参数或文档副本绕开 owner。若影响边界、信任、数据兼容性、运行恢复或交付责任，必须同时更新受影响模块的链接、质量场景和适用 Gate。
