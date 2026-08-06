# 架构基线详细说明

> 文档层级：L2 跨模块规范索引
> 对应主文：[架构基线](./architecture-baseline.md)

## 1. 责任边界

本文只定义跨模块不变量、依赖边界、事实 owner 索引、质量属性场景和演进 Gate 的引用关系。每个领域对象的状态、协议字段、资源参数、恢复步骤和安全机制均由其模块 detail 唯一拥有；本文不复制这些规则。

平台当前只有 DEV 运行环境，本仓库仍是 Umi Max 前端模板。Python Control Plane、数据服务、Deployable、基础设施和未来 PROD 是已批准的目标架构。这些 target Contract 自本基线生效起即约束实现、环境实例化与验收，但不表示相关运行实例已经存在。

## 2. 跨模块不变量矩阵

| 不变量 | 规范 owner | 消费者 | 证据 |
| --- | --- | --- | --- |
| 服务端以实时授权投影和 Assignment 判定受保护动作；Assignment 只委派既有权限，不能扩大 Capability 或 Scope。 | [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md) | 02、05、06、管理入口 | 授权判定、Assignment 记录与 Audit |
| Requirement、WorkItem、Route、Gate、Decision、Acceptance 与 Artifact 形成业务责任链；跨模块只以稳定标识和版本引用协作。 | [02](../02-requirement-workflow/requirement-workflow-detail.md) | 01、03、05、06、07 | 领域版本、Decision、Acceptance 与 Artifact 证据 |
| Run、Attempt 与不可变 Execution Binding 是受控执行事实；执行资源不取得 Requirement 的业务写权限。 | [03](../03-agent-skill-model/agent-skill-model-detail.md) | 02、04、06、07 | Binding、运行事件与 Effect Ledger |
| Git/MR/Artifact `IntegrationBaselineEvidence` 的结构、ID/hash、外部事实与变化事件由 05 拥有；Requirement 选定/冻结 Evidence 引用、Acceptance 绑定与失效及业务状态由 02 拥有。 | [05](../05-source-control-delivery/source-control-delivery-detail.md) 与 [02](../02-requirement-workflow/requirement-workflow-detail.md) | 03、06、07 | Evidence、Selection、外部事实、Acceptance 与交付 Audit |
| Browser、菜单、Read Model、Telemetry 与外部 Feed 只用于展示、诊断或可见性；它们不能授权、反写领域事实或阻断独立的已运行业务。 | [06](../06-platform-application-integration/platform-application-integration-detail.md) | 00～05、07～09 | 应用 API、Read Model freshness、Collector/Feed 状态与 Audit |
| 模块内事务在单一事实边界完成；跨模块与外部副作用经 Outbox、Inbox、Effect Ledger、幂等键和可重放证据收敛。 | [06](../06-platform-application-integration/platform-application-integration-detail.md) | 02～05、07、09 | Transaction、Outbox/Inbox、Effect Ledger、Reconciliation |
| DEV 与未来 PROD 的运行实例、信任边界、数据、凭据、密钥、备份和故障域完全隔离。 | [09](../09-infrastructure-operations/infrastructure-operations-detail.md) | 00～08 | CloudEnvironmentBinding、PCS、部署与恢复证据 |
| 配置有类型、版本和生效快照；运行、审核和集成使用被绑定的 effective snapshot，不读取未受控的可变值。 | [06](../06-platform-application-integration/platform-application-integration-detail.md) | 01～05、07～09 | 配置版本、snapshot、发布与 Audit |
| Execution Binding 不可变；Sandbox 以 fenced lease、容量准入和 Kata 隔离运行，恢复不能绕过绑定和资源边界。 | [03](../03-agent-skill-model/agent-skill-model-detail.md) 与 [04](../04-sandbox-runtime/sandbox-runtime-detail.md) | 02、06、09 | Binding、lease、Capacity Profile、Runtime 事件 |
| Artifact 以 exact Object Version 作为证据单位，同时受 Product Quota Ledger 与 Environment Bucket-Class Capacity Ledger 约束；两类不足独立呈现。 | [07](../07-data-messaging-storage/data-messaging-storage-detail.md) | 02、05、06、08、09 | Object Version、双 Ledger reservation、扫描与容量证据 |
| 安全、Audit 与恢复依赖可验证信任、密钥、授权和证据；任一受保护条件不可证明时 Fail Closed。 | [08](../08-security-audit-governance/security-audit-governance-detail.md) | 01～07、09 | Trust、Audit、恢复验证与告警证据 |

## 3. 依赖方向与写入边界

通用依赖方向固定为：

```text
UI → public API → domain/application → Port → Adapter → external
```

- 00 提供 System Context；01～05 提供领域 Contract；06 提供应用、集成与配置 Contract；07 提供数据事实与持久化 Contract；08 提供 Trust/Security Contract；09 提供环境与运维 Contract；10 仅提供跨模块索引。
- UI 只能调用 public API，不直连数据服务、消息系统、Secret、Kubernetes、Cloud 或外部 Provider。
- domain/application 依赖 Port 抽象，不依赖 Adapter 实现；Adapter 不得塑形或替代领域语义。
- projection、Read Model、Telemetry、Feed 和管理看板不得反写权威领域事实。
- 每个业务写入在 owner 的事务边界内完成；跨 owner 的传播、重试、未知外部结果与恢复遵循 06 的一致性 Contract。

## 4. Fact Owner Index

| 编号 | 唯一职责 | Canonical detail |
| --- | --- | --- |
| 00 | System Context、全局责任链与总体边界。 | [00 detail](../00-platform-overview/platform-overview-detail.md) |
| 01 | 本地身份、组织、Workspace、授权、配置授权与恢复资格。 | [01 detail](../01-identity-organization-authorization/identity-organization-authorization-detail.md) |
| 02 | Requirement 领域对象、Workflow、Gate、Decision、Acceptance、Artifact 与 `RequirementIntegrationBaselineSelection` 业务语义。 | [02 detail](../02-requirement-workflow/requirement-workflow-detail.md) |
| 03 | Agent 定义、Skill/Model 路由、Run/Attempt 与 Execution Binding。 | [03 detail](../03-agent-skill-model/agent-skill-model-detail.md) |
| 04 | Sandbox 物化、隔离、lease、容量准入、网络、Preview 与清理。 | [04 detail](../04-sandbox-runtime/sandbox-runtime-detail.md) |
| 05 | GitLab Binding、分支交付、`IntegrationBaselineEvidence`、Formal MR 与外部事实收敛。 | [05 detail](../05-source-control-delivery/source-control-delivery-detail.md) |
| 06 | Web/Control Plane、Port/Adapter、配置、一致性、Operations Read Model、Console 与公告。 | [06 detail](../06-platform-application-integration/platform-application-integration-detail.md) |
| 07 | PostgreSQL、Valkey、NATS、Temporal、Object Storage、Artifact 对象/配额账本、Retention 与组件数据恢复。 | [07 detail](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| 08 | Secret、PKI、加密、供应链、Audit、Break-glass 与信任恢复。 | [08 detail](../08-security-audit-governance/security-audit-governance-detail.md) |
| 09 | Environment Binding、PCS、Kubernetes、Node、网络、可观测性、Cluster DR、容量与 TCO。 | [09 detail](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| 10 | 跨模块不变量、引用关系、质量场景与演进 Gate。 | 本文 |

## 5. Quality Scenarios

| 场景触发 | 期望结果 | 证据 owner |
| --- | --- | --- |
| 用户授权或 Assignment 发生撤销，同时存在 Session 或待执行操作。 | 新受保护请求立即按当前服务端授权拒绝；已启动 Attempt 的控制权按领域 Contract 收敛。 | [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)、[03](../03-agent-skill-model/agent-skill-model-detail.md) |
| 并发写入或外部调用结果未知。 | 权威事务保持一致；外部副作用通过幂等和 Reconciliation 收敛，不以投影猜测成功。 | [06](../06-platform-application-integration/platform-application-integration-detail.md) |
| Attempt 或承载它的 Node 发生恢复。 | 执行恢复保持不可变 Binding、fenced lease 和容量边界，并从可验证检查点继续或安全结束；物理 Node 或 Cluster 恢复由环境 Contract 验证后再承载工作负载。 | [03](../03-agent-skill-model/agent-skill-model-detail.md)、[04](../04-sandbox-runtime/sandbox-runtime-detail.md)、[09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| Collector 或 External Status Feed 不可用。 | 诊断和可见性降级；独立的 Requirement、事务、Agent 与控制循环继续按其 owner Contract 工作。 | [06](../06-platform-application-integration/platform-application-integration-detail.md) |
| Artifact 并发上传或安全扫描结果未知。 | Artifact 生命周期、exact Object Version、双 Ledger reservation 与安全判定保持各自 owner 一致；不满足安全条件的对象不能成为可用证据。 | [02](../02-requirement-workflow/requirement-workflow-detail.md)、[07](../07-data-messaging-storage/data-messaging-storage-detail.md)、[08](../08-security-audit-governance/security-audit-governance-detail.md) |
| 组件数据或 Cluster 需要恢复。 | 组件恢复、信任恢复和环境恢复按各自 owner 的验证链执行；数据恢复完成不等同于端到端 Workflow 可恢复。 | [07](../07-data-messaging-storage/data-messaging-storage-detail.md)、[08](../08-security-audit-governance/security-audit-governance-detail.md)、[09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| Sandbox 的 N+1 余量不满足。 | 新执行不能绕过 Capacity Profile 或隔离要求进入运行；保留明确的准入和诊断证据。 | [04](../04-sandbox-runtime/sandbox-runtime-detail.md)、[09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| 使用 Break-glass 或恢复权限。 | 只允许具备资格的受控操作，并形成独立、追加式、可验证 Audit；信任或证据缺失时拒绝开放受保护服务。 | [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)、[08](../08-security-audit-governance/security-audit-governance-detail.md) |

## 6. Evolution Gates

| Gate | 必须满足的跨模块约束 | 规范 owner |
| --- | --- | --- |
| Environment | `CloudEnvironmentBinding`、PCS、Capacity Profile 与 Provisioning Gate 形成可验证环境实例。 | [09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| Authorization | Capability、Scope、Assignment、Session 与配置授权在服务端形成当前有效判定。 | [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md) |
| Security | Trust、Secret、加密、Audit、供应链和恢复信任链可验证且 Fail Closed。 | [08](../08-security-audit-governance/security-audit-governance-detail.md) |
| Execution | Requirement 的责任链、不可变 Execution Binding、Sandbox 准入与受控恢复保持一致。 | [02](../02-requirement-workflow/requirement-workflow-detail.md)、[03](../03-agent-skill-model/agent-skill-model-detail.md)、[04](../04-sandbox-runtime/sandbox-runtime-detail.md) |
| Integration and configuration | Port/Adapter、typed/versioned configuration、Outbox/Inbox 与外部证据可独立验证和回放。 | [05](../05-source-control-delivery/source-control-delivery-detail.md)、[06](../06-platform-application-integration/platform-application-integration-detail.md) |

以下演进路径彼此独立，每一项只替换其 owner 的 Port/Adapter、数据或部署边界，并分别通过兼容、迁移、回退、恢复和 Observability Gate；不能借一次演进重写无关领域模块：

| 当前边界 | 独立目标 | 主要 owner |
| --- | --- | --- |
| Python Control Plane 模块化单体 | 按模块提取独立微服务 | [06](../06-platform-application-integration/platform-application-integration-detail.md) |
| PostgreSQL | 云托管 PostgreSQL 或模块独立数据库 | [07](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| Valkey HA | Valkey Cluster 或云 Redis-compatible | [07](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| NATS JetStream | 扩展集群或其他 Event Bus Adapter | [07](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| OpenBao | 托管 Secret Manager | [08](../08-security-audit-governance/security-audit-governance-detail.md) |
| S3-compatible Object Storage | 其他自建或云托管实现 | [07](../07-data-messaging-storage/data-messaging-storage-detail.md) |
| 精简 Observability | 分布式 Observability | [09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| Sandbox Node Pool | 独立 Sandbox Cluster | [04](../04-sandbox-runtime/sandbox-runtime-detail.md)、[09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
| Cluster DR | Site DR | [09](../09-infrastructure-operations/infrastructure-operations-detail.md) |
