# 平台总览

> 文档层级：L1 主文
> 规范事实源：[平台总览详细说明](./platform-overview-detail.md)

## 平台定位

本平台是企业内部的 AI 研发协作平台。它将人员、组织与授权，Requirement 交付流程，Agent 执行和外部研发工具连接为一条可治理、可追溯的交付链路。

目标用户包括产品人员、开发人员、Leader、经理、平台管理员和 Super Admin。平台服务于人员主导的研发协作：Agent 可以在受控范围内执行工作，但不能取代人员的业务决定或责任。

## 系统边界与核心价值

Core Platform 负责本地身份、组织与 Workspace、授权、Requirement 到交付的业务编排、Agent/Skill/Model 控制、Sandbox Runtime、Source Control 交付、平台应用与集成、数据与存储、安全与 Audit、基础设施运维以及 Configuration Governance。它通过稳定的 Port/Adapter 使用 GitLab、Model Provider、Sandbox、对象存储和运维系统。

平台不重建外部系统的专业能力，不把外部系统的实现细节纳入业务领域。其核心价值是：

- 以明确的责任、权限和人工 Gate 管理研发交付；
- 将人、Agent、代码变更、交付证据和 Audit 关联为可解释的业务事实；
- 让环境隔离、受控执行和可替换集成共同约束平台演进。

身份、组织、Workspace 与授权的边界由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization.md)定义；[安全、审计与治理](../08-security-audit-governance/security-audit-governance.md)和[基础设施与运维](../09-infrastructure-operations/infrastructure-operations.md)分别拥有安全审计与专业运维控制台规则。

## 端到端业务主链路

```text
人员以本地身份登录
→ 在 Workspace 内创建并澄清 Requirement
→ 按 Requirement Workflow 形成工作计划、责任分配与人工 Gate
→ 人员或受控 Agent 完成 WorkItem
→ 通过 Source Control 集成代码与证据
→ 完成验收、人工审核与交付
→ 全程留下可关联的 Audit
```

此链路中的 Requirement 状态、Route、Gate 和交付规则由[Requirement Workflow](../02-requirement-workflow/requirement-workflow.md)拥有；GitLab、MR 与交付集成规则由[Source Control 与交付](../05-source-control-delivery/source-control-delivery.md)拥有。

## 模块地图

```text
00 Platform Overview
└── Target Architecture
    ├── Core Platform
    │   ├── 01 Identity / Organization / Workspace / Authorization
    │   ├── 02 Requirement Workflow
    │   ├── 03 Agent / Skill / Model
    │   ├── 04 Sandbox Runtime
    │   ├── 05 Source Control / Delivery
    │   ├── 06 Platform Application / Integration
    │   ├── 07 Data / Messaging / Storage
    │   ├── 08 Security / Audit / Governance
    │   ├── 09 Infrastructure / Operations
    │   └── 10 Configuration Governance
    └── 11 Cross-module Architecture Baseline
```

模块通过明确的领域边界、Port 和事件协作。业务事实属于其领域 owner；Adapter 负责将外部能力转换为内部 Contract，不将外部角色或状态直接作为平台业务事实。

## Profile 与演进边界

- **Core Platform**：完整目标架构的逻辑模块、责任链、安全边界和 Port/Adapter Contract；它不等同于某次 Release 的启用清单。
- **Launch Profile**：从 Core Platform 中选出首发所需 Capability，并以满足目标 Contract 的最小可运营拓扑启用；未被路线图选入或未通过 Capability Activation Gate 的能力保持关闭。
- **Hardened Target Profile**：保留完整 Node Role、冗余、隔离、可观测性、恢复和规模化目标，供容量与可靠性需求达到 Evolution Trigger 后采用；它不是 Launch Profile 的默认部署声明。
- **Future Evolution**：通过独立演进 Port/Adapter、数据边界或 Deployable 提升规模与韧性，不重写无关领域语义，也不自动启用目标能力。

Profile 的 Release 选择、实施状态、环境 Promotion 和容量场景只由[实施路线图](../12-implementation-roadmap/implementation-roadmap.md)及其 detail 拥有；本总览不复制版本范围、服务器数字或运行状态。

## 稳定边界

- 不重建 GitLab 的代码托管与 MR 产品能力。
- 不把独立的 Jenkins 人工构建与测试变成平台 Gate 或状态来源。
- 不允许 Model、Agent 或界面可见性绕过人员授权、人工 Gate 或受保护资源边界。
- 不将单个 Sandbox、运行实例或外部系统生命周期等同于 Requirement 生命周期。
- 不提供 Cloud、Kubernetes 或其他基础设施的通用写操作入口。
- 不将 Target Architecture、Implementation Roadmap 或 Deployed State 相互替代。

## 阅读导航

- [平台总览详细说明](./platform-overview-detail.md)：系统上下文、环境和全局依赖方向。
- [身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization.md)：人员与访问控制入口。
- [Requirement Workflow](../02-requirement-workflow/requirement-workflow.md)：业务交付流程与人工 Gate。
- [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model.md)：Agent 责任和执行能力。
- [Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime.md)：受控执行环境。
- [Source Control 与交付](../05-source-control-delivery/source-control-delivery.md)：代码、MR 与交付集成。
- [平台应用与集成](../06-platform-application-integration/platform-application-integration.md)：应用入口与集成边界。
- [数据、消息与存储](../07-data-messaging-storage/data-messaging-storage.md)：领域事实与数据支撑边界。
- [安全、审计与治理](../08-security-audit-governance/security-audit-governance.md)：安全边界与治理证据。
- [基础设施与运维](../09-infrastructure-operations/infrastructure-operations.md)：部署、运维与兼容性 Contract。
- [Configuration Governance](../10-configuration-governance/configuration-governance.md)：配置分类、生命周期与跨环境 Promotion。
- [架构基线](../11-architecture-baseline/architecture-baseline.md)：跨模块不变量、质量场景与三类 Gate。
- [实施路线图](../12-implementation-roadmap/implementation-roadmap.md)：Release Scope、实施状态、环境 Promotion 与 Profile 选择。
