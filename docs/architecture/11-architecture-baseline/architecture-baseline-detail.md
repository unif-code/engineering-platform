# 架构基线详细说明

> 架构基线：`2026-08-06.175`
> 文档层级：L2 跨模块规范索引
> 对应主文：[架构基线](./architecture-baseline.md)

## 1. 责任边界

本文只定义跨模块不变量、依赖边界、事实 owner 索引、质量属性场景以及 Release Gate、Capability Activation Gate、Evolution Trigger 的分类和引用关系。每个领域对象的状态、协议字段、资源参数、恢复步骤和安全机制均由其模块 detail 唯一拥有；本文不复制这些规则。

00～11 定义完整 Target Architecture；[12](./12-implementation-roadmap.md)唯一选择 Release Scope、Profile 与环境 Promotion。被路线图选入当前 Release 的能力必须满足其目标 Contract，未选能力保持关闭；目标能力不得以不满足安全、授权、隔离、证据或恢复 Contract 的半成品方式启用。实际 Deployed State 仍必须由环境 GitOps Desired State、PCS 和 Operations Read Model 证据证明。

## 2. 跨模块不变量矩阵

| 不变量 | 规范 owner | 消费者 | 证据 |
| --- | --- | --- | --- |
| 服务端以实时授权投影和 Assignment 判定受保护动作；Assignment 只委派既有权限，不能扩大 Capability 或 Scope。 | [01](./01-identity-organization-authorization.md) | 02、05、06、10、管理入口 | 授权判定、Assignment 记录与 Audit |
| Requirement、WorkItem、Route、Gate、Decision、Acceptance 与 Artifact 形成业务责任链；跨模块只以稳定标识和版本引用协作。 | [02](./02-requirement-workflow.md) | 01、03、05、06、07 | 领域版本、Decision、Acceptance 与 Artifact 证据 |
| Run、Attempt 与不可变 Execution Binding 是受控执行事实；执行资源不取得 Requirement 的业务写权限。 | [03](./03-agent-skill-model.md) | 02、04、06、07 | Binding、运行事件与 Effect Ledger |
| Git/MR/Artifact `IntegrationBaselineEvidence` 的结构、ID/hash、外部事实与变化事件由 05 拥有；Requirement 选定/冻结 Evidence 引用、Acceptance 绑定与失效及业务状态由 02 拥有。 | [05](./05-source-control-delivery.md) 与 [02](./02-requirement-workflow.md) | 03、06、07 | Evidence、Selection、外部事实、Acceptance 与交付 Audit |
| Browser、菜单、Read Model、Telemetry 与外部 Feed 只用于展示、诊断或可见性；它们不能授权、反写领域事实或阻断独立的已运行业务。 | [06](./06-platform-application-integration.md) | 00～05、07～10 | 应用 API、Read Model freshness、Collector/Feed 状态与 Audit |
| 模块内事务在单一事实边界完成；跨模块与外部副作用经 Outbox、Inbox、Effect Ledger、幂等键和可重放证据收敛。 | [06](./06-platform-application-integration.md) | 02～05、07、09～10 | Transaction、Outbox/Inbox、Effect Ledger、Reconciliation |
| DEV 与 PROD 的运行实例、信任边界、数据、凭据、密钥、备份和故障域完全隔离。 | [09](./09-infrastructure-operations.md) | 00～08、10 | CloudEnvironmentBinding、PCS、部署与恢复证据 |
| `GITOPS_CONFIG` 只由环境受保护 Git 路径形成 Desired State；本环境 Flux 只负责 Reconcile，Observed Status 与平台投影不能成为第二事实源或跨环境写路径。 | [09](./09-infrastructure-operations.md) 与 [10](./10-configuration-governance.md) | 01～08、11 | Git MR/Commit、Review、Flux Inventory/Condition、Drift 与 Audit |
| 配置有类型、版本和生效快照；运行、审核和集成使用被绑定的 Effective Snapshot，不读取未受控的可变值。 | [10](./10-configuration-governance.md) | 01～09 | 配置版本、Snapshot、发布与 Audit |
| Execution Binding 不可变；Sandbox 以 fenced lease、容量准入和 Kata 隔离运行，恢复不能绕过绑定和资源边界。 | [03](./03-agent-skill-model.md) 与 [04](./04-sandbox-runtime.md) | 02、06、09 | Binding、lease、Capacity Profile、Runtime 事件 |
| Artifact 以 exact Object Version 作为证据单位，同时受 Product Quota Ledger 与 Environment Bucket-Class Capacity Ledger 约束；两类不足独立呈现。 | [07](./07-data-messaging-storage.md) | 02、05、06、08、09 | Object Version、双 Ledger reservation、扫描与容量证据 |
| 安全、Audit 与恢复依赖可验证信任、密钥、授权和证据；任一受保护条件不可证明时 Fail Closed。 | [08](./08-security-audit-governance.md) | 01～07、09～10 | Trust、Audit、恢复验证与告警证据 |

## 3. 依赖方向与写入边界

通用依赖方向固定为：

```text
UI → public API → domain/application → Port → Adapter → external
```

- 00 提供 System Context；01～05 提供领域 Contract；06 提供应用与集成 Contract；07 提供数据事实与持久化 Contract；08 提供 Trust/Security Contract；09 提供环境与运维 Contract；10 提供 Configuration Governance Contract；11 仅提供跨模块索引。
- UI 只能调用 public API，不直连数据服务、消息系统、Secret、Kubernetes、Cloud 或外部 Provider。
- domain/application 依赖 Port 抽象，不依赖 Adapter 实现；Adapter 不得塑形或替代领域语义。
- projection、Read Model、Telemetry、Feed 和管理看板不得反写权威领域事实。
- 每个业务写入在 owner 的事务边界内完成；跨 owner 的传播、重试、未知外部结果与恢复遵循 06 的一致性 Contract。

## 4. Fact Owner Index

| 编号 | 唯一职责 | Canonical detail |
| --- | --- | --- |
| 00 | System Context、全局责任链与总体边界。 | [00 detail](./00-platform-overview.md) |
| 01 | 本地身份、组织、Workspace、授权、配置授权与恢复资格。 | [01 detail](./01-identity-organization-authorization.md) |
| 02 | Requirement 领域对象、Workflow、Gate、Decision、Acceptance、Artifact 与 `RequirementIntegrationBaselineSelection` 业务语义。 | [02 detail](./02-requirement-workflow.md) |
| 03 | Agent 定义、Skill/Model 路由、模型评测工具链、Run/Attempt 与 Execution Binding。 | [03 detail](./03-agent-skill-model.md) |
| 04 | Sandbox 物化、隔离、lease、容量准入、网络、Preview 与清理。 | [04 detail](./04-sandbox-runtime.md) |
| 05 | GitLab Binding、分支交付、`IntegrationBaselineEvidence`、Formal MR 与外部事实收敛。 | [05 detail](./05-source-control-delivery.md) |
| 06 | Web/Control Plane、Port/Adapter、一致性、Operations Read Model、Console 与公告。 | [06 detail](./06-platform-application-integration.md) |
| 07 | PostgreSQL、Valkey、NATS、Temporal、Object Storage、Artifact 对象/配额账本、Retention 与组件数据恢复。 | [07 detail](./07-data-messaging-storage.md) |
| 08 | Secret、PKI、加密、供应链、Audit、Break-glass 与信任恢复。 | [08 detail](./08-security-audit-governance.md) |
| 09 | Environment Binding、PCS、Flux GitOps、Kubernetes、Node、网络、可观测性、Cluster DR、容量与 TCO。 | [09 detail](./09-infrastructure-operations.md) |
| 10 | Configuration Catalog、生命周期协议、Effective Snapshot、兼容演进与 DEV→PROD Promotion。 | [10 detail](./10-configuration-governance.md) |
| 11 | 跨模块不变量、引用关系、质量场景与三类 Gate。 | 本文 |

## 5. Quality Scenarios

| 场景触发 | 期望结果 | 证据 owner |
| --- | --- | --- |
| 用户授权或 Assignment 发生撤销，同时存在 Session 或待执行操作。 | 新受保护请求立即按当前服务端授权拒绝；已启动 Attempt 的控制权按领域 Contract 收敛。 | [01](./01-identity-organization-authorization.md)、[03](./03-agent-skill-model.md) |
| 并发写入或外部调用结果未知。 | 权威事务保持一致；外部副作用通过幂等和 Reconciliation 收敛，不以投影猜测成功。 | [06](./06-platform-application-integration.md) |
| Attempt 或承载它的 Node 发生恢复。 | 执行恢复保持不可变 Binding、fenced lease 和容量边界，并从可验证检查点继续或安全结束；物理 Node 或 Cluster 恢复由环境 Contract 验证后再承载工作负载。 | [03](./03-agent-skill-model.md)、[04](./04-sandbox-runtime.md)、[09](./09-infrastructure-operations.md) |
| Collector 或 External Status Feed 不可用。 | 诊断和可见性降级；独立的 Requirement、事务、Agent 与控制循环继续按其 owner Contract 工作。 | [06](./06-platform-application-integration.md) |
| Artifact 并发上传或安全扫描结果未知。 | Artifact 生命周期、exact Object Version、双 Ledger reservation 与安全判定保持各自 owner 一致；不满足安全条件的对象不能成为可用证据。 | [02](./02-requirement-workflow.md)、[07](./07-data-messaging-storage.md)、[08](./08-security-audit-governance.md) |
| 组件数据或 Cluster 需要恢复。 | 组件恢复、信任恢复和环境恢复按各自 owner 的验证链执行；数据恢复完成不等同于端到端 Workflow 可恢复。 | [07](./07-data-messaging-storage.md)、[08](./08-security-audit-governance.md)、[09](./09-infrastructure-operations.md) |
| Sandbox 的 N+1 余量不满足。 | 新执行不能绕过 Capacity Profile 或隔离要求进入运行；保留明确的准入和诊断证据。 | [04](./04-sandbox-runtime.md)、[09](./09-infrastructure-operations.md) |
| Evaluation 或 Vulnerability Scan Job 失败、超预算、证据不完整或过期。 | 不形成评测通过或“无漏洞”结论；对应 Gate 不推进，安全公告保留上一期并显示 Gap/Alert。 | [03](./03-agent-skill-model.md)、[06](./06-platform-application-integration.md)、[09](./09-infrastructure-operations.md) |
| 使用 Break-glass 或恢复权限。 | 只允许具备资格的受控操作，并形成独立、追加式、可验证 Audit；信任或证据缺失时拒绝开放受保护服务。 | [01](./01-identity-organization-authorization.md)、[08](./08-security-audit-governance.md) |

## 6. Gate 分类

三类 Gate 的输入、决策和效果不同，不能混用：

| 分类 | 决策对象 | 通过后允许 | 未通过时 |
| --- | --- | --- | --- |
| Release Gate | 路线图明确选定的 Release Scope、候选制品与 Promotion 证据包。 | 形成下一阶段候选，或按路线图定义完成指定环境 Promotion。 | Release 不推进；保留失败、Gap、恢复与重新验收证据。 |
| Capability Activation Gate | 已实施 Capability 在指定 Platform Environment、Scope、配置和依赖下的启用请求。 | 只在批准边界内打开该 Capability。 | Capability 保持关闭；不得以降级安全 Contract 的方式部分启用。 |
| Evolution Trigger | 业务需求、容量、可靠性、兼容性或运维测量形成的演进信号。 | 创建待评估的 Capability、Capacity 或 Architecture Candidate。 | 保持既有目标边界；Trigger 本身不批准开发、采购、迁移、启用或部署。 |

### 6.1 Release Gate

Release Gate 由 [12 路线图详细说明](./12-implementation-roadmap.md)为各 Release 定义 Scope、前置依赖、验收证据与 Promotion 结果。11 只固定以下跨模块规则：

1. Gate 只验收被路线图选入该 Release 的 Capability，不把完整 Target Architecture 的所有未来能力强行纳入当前验收。
2. 每项入选 Capability 必须满足其领域 owner 的完整目标 Contract；Release Scope 不能重写或放宽授权、安全、隔离、证据、容量准入和恢复底线。
3. 未选 Capability、未完成 Capability Activation Gate 的能力以及仅有界面或 Adapter 占位的能力必须保持关闭。
4. Release 状态只表示路线图决策；实际 Image、配置、拓扑和健康状态仍由 Deployed State 证据证明。
5. Gate 失败时安全停止推进、保留证据并按 owner Contract 恢复，不要求所有单点故障下无感继续。

### 6.2 Capability Activation Gate

Capability Activation Gate 在 Capability 已实施后、首次或变更启用边界前执行，并至少证明：

- Capability、Scope、Assignment、Session 与配置授权形成服务端当前有效判定；
- 依赖的 Trust、Secret、供应链、数据、网络、容量和恢复条件可验证，未知时 Fail Closed；
- Execution Binding、Port/Adapter、Effective Snapshot、外部 Effect 与 Audit 证据能够绑定和回放；
- 启用范围、关闭路径、回退条件、Observability 与责任人明确；
- 环境本地证据能够证明启用结果，不以 UI、Read Model freshness 或路线图状态替代运行事实。

Activation Gate 通过后必须形成环境本地、不可变的 `CapabilityActivationRecord`，至少绑定 Capability 标识、目标 Environment、适用 Scope、Gate 证据引用、批准 Principal、批准时间与生效配置版本；Record 及其失效与替换历史由 Configuration 模块作为跨模块治理数据按[Configuration Governance 详细说明](./10-configuration-governance.md)的生命周期持久化，是该 Capability 在指定 Environment 与 Scope 内已通过激活的唯一运行时权威事实。启用该 Capability 的 Feature Toggle 发布、其专属 Deployable 的 Desired State 变更以及消费该 Capability 的 Execution Binding、Run 与 Sandbox 物化必须引用当前有效 Record；Record 缺失、失效或不可解析时 Fail Closed，Capability 保持或恢复关闭。Record 不替代 Deployed State 证据，Release Gate 与路线图状态也不替代 Record。

一次 Release Gate 通过不自动打开全部入选 Capability；需要运行时开关或受控 Scope 的能力仍须分别完成 Capability Activation Gate。一次 Capability Activation Gate 通过也不构成后续 Release 或跨环境 Promotion 的批准。

### 6.3 Evolution Trigger

Evolution Trigger 只负责把已批准阈值或明确业务需求转换为候选评估。Trigger 成立后，owner 必须为候选明确价值、影响边界、兼容与迁移方案、回退、容量、安全、恢复、Observability 和后续适用 Gate；在这些决策完成前，不改变 Release Scope、Capability 开关或 Deployed State。

以下 Future Evolution 路径彼此独立，每一项只替换其 owner 的 Port/Adapter、数据或部署边界，不能借一次演进重写无关领域模块：

| Target Architecture 起始边界 | 独立演进方向 | 主要 owner |
| --- | --- | --- |
| Python Control Plane 模块化单体 | 按模块提取独立微服务 | [06](./06-platform-application-integration.md) |
| PostgreSQL | 云托管 PostgreSQL 或模块独立数据库 | [07](./07-data-messaging-storage.md) |
| Valkey HA | Valkey Cluster 或云 Redis-compatible | [07](./07-data-messaging-storage.md) |
| NATS JetStream | 扩展集群或其他 Event Bus Adapter | [07](./07-data-messaging-storage.md) |
| OpenBao | 托管 Secret Manager | [08](./08-security-audit-governance.md) |
| S3-compatible Object Storage | 其他自建或云托管实现 | [07](./07-data-messaging-storage.md) |
| 精简 Observability | 分布式 Observability | [09](./09-infrastructure-operations.md) |
| Sandbox Node Pool | 独立 Sandbox Cluster | [04](./04-sandbox-runtime.md)、[09](./09-infrastructure-operations.md) |
| Cluster DR | Site DR | [09](./09-infrastructure-operations.md) |

## 7. 跨模块验证维度

Release Gate 和 Capability Activation Gate 按其 Scope 组合下列验证维度；Evolution Trigger 只决定是否创建候选，不跳过候选后续适用的 Gate：

| 验证维度 | 必须满足的跨模块约束 | 规范 owner |
| --- | --- | --- |
| Environment | `CloudEnvironmentBinding`、PCS、Capacity Profile 与 Provisioning Gate 形成可验证环境实例。 | [09](./09-infrastructure-operations.md) |
| Authorization | Capability、Scope、Assignment、Session 与配置授权在服务端形成当前有效判定。 | [01](./01-identity-organization-authorization.md) |
| Security | Trust、Secret、加密、Audit、供应链和恢复信任链可验证且 Fail Closed。 | [08](./08-security-audit-governance.md) |
| Execution | Requirement 的责任链、不可变 Execution Binding、Sandbox 准入与受控恢复保持一致。 | [02](./02-requirement-workflow.md)、[03](./03-agent-skill-model.md)、[04](./04-sandbox-runtime.md) |
| Integration and configuration | Port/Adapter、typed/versioned configuration、Outbox/Inbox 与外部证据可独立验证和回放。 | [05](./05-source-control-delivery.md)、[06](./06-platform-application-integration.md)、[10](./10-configuration-governance.md) |
