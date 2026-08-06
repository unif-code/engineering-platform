# 平台总览

> 文档层级：L1 主文
> 规范事实源：[平台总览详细说明](./platform-overview-detail.md)

## 平台定位

本平台是企业内部的 AI 研发协作平台。它将人员、组织与授权，Requirement 交付流程，Agent 执行和外部研发工具连接为一条可治理、可追溯的交付链路。

目标用户包括产品人员、开发人员、Leader、经理、平台管理员和 Super Admin。平台服务于人员主导的研发协作：Agent 可以在受控范围内执行工作，但不能取代人员的业务决定或责任。

## 系统边界与核心价值

平台负责本地身份、组织与 Workspace、授权、Requirement 到交付的业务编排、Agent Runtime 的控制以及业务审计。它通过稳定的 Adapter 使用 GitLab、Model Provider、Sandbox、对象存储和运维系统。

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
体验入口
└── 用户工作台、管理入口
    └── Control Plane
        ├── Identity / Organization / Workspace / Authorization
        ├── Requirement Workflow / Agent Run / Audit
        └── Integration Ports
            ├── Workflow Orchestrator / Model Gateway / Sandbox Controller
            └── GitLab、Model Provider、存储与运维系统 Adapter
```

模块通过明确的领域边界、Port 和事件协作。业务事实属于其领域 owner；Adapter 负责将外部能力转换为内部 Contract，不将外部角色或状态直接作为平台业务事实。

## 当前非目标

- 不重建 GitLab 的代码托管与 MR 产品能力。
- 不把独立的 Jenkins 人工构建与测试变成平台 Gate 或状态来源。
- 不允许 Model、Agent 或界面可见性绕过人员授权、人工 Gate 或受保护资源边界。
- 不将单个 Sandbox、运行实例或外部系统生命周期等同于 Requirement 生命周期。
- 不提供 Cloud、Kubernetes 或其他基础设施的通用写操作入口。

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
