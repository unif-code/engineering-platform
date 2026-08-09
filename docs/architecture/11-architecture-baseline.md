# 架构基线

> 具体 Release 的 Scope、实施阶段、Capability 激活状态、环境 Promotion 与 Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义跨模块不变量、全局依赖与写入边界、Quality Scenario，以及 Release Gate、Capability Activation Gate 与 Evolution Trigger 三类 Gate 的分类语义和组合规则。00～11 共同构成已批准的 Target Architecture 基线，用于指导设计、实施、评审与运行准备。

基线只描述目标模块与跨模块 Contract，不声明仓库实现进度、Release Scope、Platform Environment 部署状态或容量数值。DEV 与 PROD 以同源代码、Contract、GitOps 模板和 Platform Compatibility Set 在独立环境中实例化；实际 Deployed State 不属于任何文档，只能由环境 GitOps Desired State、PCS 与 Operations Read Model 证据证明。

每个领域对象的状态、协议字段、资源参数、恢复步骤与安全机制由其所属模块定义，本文不复制这些规则，也不再另建 owner 索引与模块地图：各类事实的归属、跨 owner 拆分与文档导航见 [README 所有权矩阵](./README.md#事实所有权矩阵)与[文档导航](./README.md#文档导航)，本文正文与表格中的模块编号按该矩阵解析，精确参数见[参数附录](./appendix-parameters.md)。架构评审以本文与 00 为入口，具体决策回到对应 owner 文档，运行判断回到 Deployed State 证据。

## 核心模型

### 全局依赖方向

```text
UI → public API → domain/application → Port → Adapter → external
```

每一跳只向右依赖：左侧不感知右侧实现，右侧不塑形左侧语义；跳跃直连、反向依赖与反写权威事实都不成立。

### 三类 Gate

三类 Gate 的输入、决策和效果不同，不能混用；各 Release 的 Scope、前置依赖、验收证据与 Promotion 结果由实施路线图定义，本文只固定分类语义与组合规则：

| 分类 | 决策对象 | 通过后允许 | 未通过时 |
| --- | --- | --- | --- |
| Release Gate | 路线图明确选定的 Release Scope、候选制品与 Promotion 证据包。 | 形成下一阶段候选，或按路线图定义完成指定环境 Promotion。 | Release 不推进；保留失败、Gap、恢复与重新验收证据。 |
| Capability Activation Gate | 已实施 Capability 在指定 Platform Environment、Scope、配置和依赖下的启用请求。 | 只在批准边界内打开该 Capability。 | Capability 保持关闭；不得以降级安全 Contract 的方式部分启用。 |
| Evolution Trigger | 业务需求、容量、可靠性、兼容性或运维测量形成的演进信号。 | 创建待评估的 Capability、Capacity 或 Architecture Candidate。 | 保持既有目标边界；Trigger 本身不批准开发、采购、迁移、启用或部署。 |

### 跨模块验证维度

Release Gate 与 Capability Activation Gate 按各自 Scope 组合下列维度；Evolution Trigger 只决定是否创建候选，不跳过候选后续适用的 Gate。

| 验证维度 | 必须满足的跨模块约束 | 规范 owner |
| --- | --- | --- |
| Environment | `CloudEnvironmentBinding`、PCS、Capacity Profile 与 Provisioning Gate 形成可验证环境实例。 | 09 |
| Authorization | Capability、Scope、Assignment、Session 与配置授权在服务端形成当前有效判定。 | 01 |
| Security | Trust、Secret、加密、Audit、供应链和恢复信任链可验证且 Fail Closed。 | 08 |
| Execution | Requirement 的责任链、不可变 Execution Binding、Sandbox 准入与受控恢复保持一致。 | 02、03、04 |
| Integration and configuration | Port/Adapter、typed/versioned configuration、Outbox/Inbox 与外部证据可独立验证和回放。 | 05、06、10 |

### Quality Scenario

每个场景描述跨模块的期望收敛结果，是架构评审与 Gate 验收的检验单：

| 场景触发 | 期望结果 | 证据 owner |
| --- | --- | --- |
| 用户授权或 Assignment 发生撤销，同时存在 Session 或待执行操作。 | 新受保护请求立即按当前服务端授权拒绝；已启动 Attempt 的控制权按领域 Contract 收敛。 | 01、03 |
| 并发写入或外部调用结果未知。 | 权威事务保持一致；外部副作用通过幂等和 Reconciliation 收敛，不以投影猜测成功。 | 06 |
| Attempt 或承载它的 Node 发生恢复。 | 执行恢复保持不可变 Binding、fenced lease 和容量边界，并从可验证检查点继续或安全结束；物理 Node 或 Cluster 恢复由环境 Contract 验证后再承载工作负载。 | 03、04、09 |
| Collector 或 External Status Feed 不可用。 | 诊断和可见性降级；独立的 Requirement、事务、Agent 与控制循环继续按其 owner Contract 工作。 | 06 |
| Artifact 并发上传或安全扫描结果未知。 | Artifact 生命周期、exact Object Version、双 Ledger reservation 与安全判定保持各自 owner 一致；不满足安全条件的对象不能成为可用证据。 | 02、07、08 |
| 组件数据或 Cluster 需要恢复。 | 组件恢复、信任恢复和环境恢复按各自 owner 的验证链执行；数据恢复完成不等同于端到端 Workflow 可恢复。 | 07、08、09 |
| Sandbox 的 N+1 余量不满足。 | 新执行不能绕过 Capacity Profile 或隔离要求进入运行；保留明确的准入和诊断证据。 | 04、09 |
| Evaluation 或 Vulnerability Scan Job 失败、超预算、证据不完整或过期。 | 不形成评测通过或“无漏洞”结论；对应 Gate 不推进，安全公告保留上一期并显示 Gap/Alert。 | 03、06、09 |
| 使用 Break-glass 或恢复权限。 | 只允许具备资格的受控操作，并形成独立、追加式、可验证 Audit；信任或证据缺失时拒绝开放受保护服务。 | 01、08 |

### Future Evolution 边界

已识别的独立演进路径彼此不耦合，每项只替换起始边界所属 owner 的 Port/Adapter、数据或部署实现：

| Target Architecture 起始边界 | 独立演进方向 | 主要 owner |
| --- | --- | --- |
| Python Control Plane 模块化单体 | 按模块提取独立微服务 | 06 |
| PostgreSQL | 云托管 PostgreSQL 或模块独立数据库 | 07 |
| Valkey HA | Valkey Cluster 或云 Redis-compatible | 07 |
| NATS JetStream | 扩展集群或其他 Event Bus Adapter | 07 |
| OpenBao | 托管 Secret Manager | 08 |
| S3-compatible Object Storage | 其他自建或云托管实现 | 07 |
| 精简 Observability | 分布式 Observability | 09 |
| Sandbox Node Pool | 独立 Sandbox Cluster | 04、09 |
| Cluster DR | Site DR | 09 |

## 关键不变量

- 授权、Workflow、执行、交付、数据、安全与运维各自拥有规范性 Contract，跨模块只以稳定标识、版本和 Port 引用协作，不复制彼此的状态或参数——复制会立刻产生第二事实源，并让两侧无法独立演进。
- 平台以领域事实、明确责任和可验证证据为中心：Browser、菜单、Read Model、Telemetry、外部 Feed 与管理看板只用于展示、诊断或可见性，不能授权、反写权威领域事实或阻断独立的已运行业务，其失败只降低可见性并由应用 API、Read Model freshness、Collector/Feed 状态与 Audit 呈现——它们都不是权威事实源。
- UI 只调用 public API，不直连数据服务、消息系统、Secret、Kubernetes、Cloud 或外部 Provider——展示层不是安全边界，直连会把凭据与基础设施暴露在最外层。
- domain/application 只依赖 Port 抽象而不依赖 Adapter 实现，Adapter 不得塑形或替代领域语义——这是外部 Provider 与基础设施可替换的前提。
- 每个业务写入在其 owner 的事务边界内完成，模块内事务保持单一事实边界；跨模块与外部副作用经 Outbox、Inbox、Effect Ledger、幂等键与可重放证据收敛，并遵循 06 的一致性 Contract，以 Transaction、Outbox/Inbox、Effect Ledger 与 Reconciliation 为证据——分布式原子性不可伪造，只能显式收敛。
- 受保护动作由服务端以实时授权投影和 Assignment 判定，Assignment 只委派既有权限、不能扩大 Capability 或 Scope，并以授权判定、Assignment 记录与 Audit 为证据——授权结论必须来自服务端当前事实，委派不能成为提权通道。
- Requirement、WorkItem、Route、Gate、Decision、Acceptance 与 Artifact 形成业务责任链，跨模块只以稳定标识和版本引用协作，并以领域版本、Decision、Acceptance 与 Artifact 证据留痕——责任链是可追溯的业务事实，不能被运行资源或外部对象改写。
- Run、Attempt 与不可变 Execution Binding 是受控执行事实，执行资源不取得 Requirement 的业务写权限，并以 Binding、运行事件与 Effect Ledger 为证据——运行资源可以重建，业务责任不随其转移。
- Execution Binding 不可变，Sandbox 以 fenced lease、容量准入和 Kata 隔离运行，恢复不能绕过绑定和资源边界，并以 Binding、lease、Capacity Profile 与 Runtime 事件为证据——恢复不是放宽隔离与容量的窗口。
- Git/MR/Artifact `IntegrationBaselineEvidence` 的结构、ID/hash、外部事实与变化事件属于 05，Requirement 选定/冻结 Evidence 引用、Acceptance 绑定与失效及业务状态属于 02，两侧变更必须双向确认——结构事实与业务解释分离，才能让外部变化不直接改写验收结论。
- Artifact 以 exact Object Version 作为证据单位，同时受 Product Quota Ledger 与 Environment Bucket-Class Capacity Ledger 约束，两类不足独立呈现——业务配额与物理容量是两种不同的拒绝原因，混淆会掩盖真实瓶颈。
- DEV 与 PROD 的运行实例、信任边界、数据、凭据、密钥、备份和故障域完全隔离，并由 `CloudEnvironmentBinding`、PCS、部署与恢复证据证明——隔离是可验证的故障域与信任域边界，不是部署习惯。
- `GITOPS_CONFIG` 的 Desired State 仅在环境受保护 Git 路径形成，本环境 Flux 只负责 Reconcile，Observed Status 与平台投影不构成第二事实源或跨环境写路径，并以 Git MR/Commit、Review、Flux Inventory/Condition、Drift 与 Audit 为证据——基础设施变更必须经 Git Review，不能从平台侧绕开。
- 配置有类型、版本和生效快照，运行、审核与集成使用被绑定的 Effective Snapshot 而不读取未受控的可变值，并以配置版本、Snapshot、发布与 Audit 为证据——可变页面值不能决定受控行为。
- 安全、Audit 与恢复依赖可验证的信任、密钥、授权与证据；信任、授权、配额或恢复条件任一不可证明时受保护操作 Fail Closed，并以 Trust、Audit、恢复验证与告警证据留痕——安全与责任正确性优先于可用性，猜测不能作为继续执行的依据。
- Release Gate 只验收被路线图选入该 Release 的 Capability，不把完整 Target Architecture 的所有未来能力强行纳入当前验收——验收范围必须与交付决策一致。
- 每项入选 Capability 必须满足其领域 owner 的完整目标 Contract，Release Scope 不能重写或放宽授权、安全、隔离、证据、容量准入和恢复底线——Release 决策只选择做什么，不改变正确性标准。
- 未选 Capability、未完成 Capability Activation Gate 的能力以及仅有界面或 Adapter 占位的能力必须保持关闭，也不得以不满足授权、安全、隔离、证据或恢复 Contract 的半成品方式启用——部分启用会把整条链路的安全边界降级。
- Release 状态只表示路线图决策，实际 Image、配置、拓扑和健康状态仍由 Deployed State 证据证明——目标 Contract、交付决策与运行事实是三类互不替代的证据。
- Gate 失败时安全停止推进、保留失败与恢复证据并按 owner Contract 恢复，不要求所有单点故障下无感继续——安全停止比强行继续更可运营。
- Capability Activation Gate 在 Capability 已实施后、首次或变更启用边界前执行，至少证明 Capability/Scope/Assignment/Session 与配置授权形成服务端当前有效判定、依赖的 Trust/Secret/供应链/数据/网络/容量/恢复条件可验证且未知时 Fail Closed、Execution Binding/Port/Adapter/Effective Snapshot/外部 Effect 与 Audit 证据可绑定并回放、启用范围/关闭路径/回退条件/Observability 与责任人明确，以及环境本地证据能证明启用结果——不以 UI、Read Model freshness 或路线图状态替代运行事实。
- Activation Gate 通过后必须形成环境本地、不可变的 `CapabilityActivationRecord`，至少绑定 Capability 标识、目标 Environment、适用 Scope、Gate 证据引用、批准 Principal、批准时间、生效配置版本与批准时的架构基线号（见 [00](./00-platform-overview.md)），该 Record 及其失效与替换历史作为跨模块治理数据由 [10](./10-configuration-governance.md) 按配置生命周期持久化；它是判断此 Capability 在指定 Environment 与 Scope 内已通过激活的唯一权威运行时事实——运行时判断需要一个可解析、可失效的事实，而不是文档或界面状态。
- 启用该 Capability 的 Feature Toggle 发布、其专属 Deployable 的 Desired State 变更，以及消费该 Capability 的 Execution Binding、Run 与 Sandbox 物化都必须引用当前有效 Record；Record 缺失、失效或不可解析时 Fail Closed，Capability 保持或恢复关闭——否则一个开关就能绕过 Activation Gate。
- Record 不替代 Deployed State 证据，Release Gate 与路线图状态也不替代 Record：一次 Release Gate 通过不自动打开全部入选 Capability，需要运行时开关或受控 Scope 的能力仍须分别完成 Capability Activation Gate；一次 Activation Gate 通过也不构成后续 Release 或跨环境 Promotion 的批准——两类 Gate 的决策对象不同，通过范围也不同。
- Evolution Trigger 只把已批准阈值或明确业务需求转换为候选评估；Trigger 成立后 owner 必须为候选明确价值、影响边界、兼容与迁移方案、回退、容量、安全、恢复、Observability 和后续适用 Gate，在这些决策完成前不改变 Release Scope、Capability 开关或 Deployed State——测量信号是评估输入，不是批准。
- 架构可替换基础设施、可提取模块、可独立迁移 Deployable，但每次演进只替换其 owner 的 Port/Adapter、数据或部署边界，不借一次演进重写无关领域模块，也不以过早拆分牺牲当前系统的一致性和可运营性——演进只有在边界可控时才产生价值。
- 路线图只选择要交付的 Capability，不能修改目标 Contract；任何变更不得通过菜单、Read Model、部署参数或文档副本绕开 owner——绕开 owner 的变更没有可验证的事实来源。
- 影响跨模块边界、信任、数据兼容性、运行恢复或交付责任的变更必须同时更新受影响模块的引用、Quality Scenario 与适用 Gate——不变量、场景与 Gate 是同一套约束的三种表达，只改一处会让基线自相矛盾。

## 与其他模块的关系

下表是本模块自身视角：11 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | System Context、模块边界、逻辑分层与端到端责任链约定 | 完整的全局依赖与写入边界、跨模块不变量本体与三类 Gate 分类语义 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 服务端授权判定、Assignment、Session 与配置命令资格的领域 Contract | Authorization 验证维度、授权不变量，以及授权撤销与 Break-glass 质量场景 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement 责任链、人工 Gate、Decision、Acceptance 与 Artifact 业务状态 Contract | Execution 验证维度、责任链不变量，以及 Artifact 与交付证据质量场景 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | Run/Attempt、不可变 Execution Binding 与评测工具链 Contract | 受控执行不变量、Execution 验证维度，以及执行恢复与评测失败质量场景 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 隔离物化、fenced lease、容量准入与清理 Contract | 隔离与容量不变量，以及 N+1 余量不足与 Node 恢复质量场景 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | GitLab Binding、`IntegrationBaselineEvidence` 结构与外部事实收敛 Contract | 交付证据双向确认不变量与 Integration and configuration 验证维度 |
| [06 平台应用与集成](./06-platform-application-integration.md) | 应用与集成 Contract、Port/Adapter 装配与跨模块一致性 Contract | 一致性收敛与投影不反写不变量，以及未知外部结果与 Feed 不可用质量场景 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | 权威数据、消息、Artifact 对象与配额账本、备份与组件恢复 Contract | Artifact 双账本不变量与组件数据恢复质量场景 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Trust、Secret、加密、供应链、Audit 与安全恢复的 Fail Closed Contract | Security 验证维度、Fail Closed 不变量与信任恢复质量场景 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | 环境与运维 Contract：Environment Binding、PCS、GitOps、容量准入与 Cluster DR | Environment 验证维度、环境隔离与 `GITOPS_CONFIG` 不变量，以及 Evolution Trigger 分类语义 |
| [10 Configuration Governance](./10-configuration-governance.md) | Configuration Governance Contract：分类、Effective Snapshot、兼容演进与 Promotion | 配置受控输入不变量，以及 `CapabilityActivationRecord` 必须绑定的 Gate 证据语义 |
| [12 实施路线图](./12-implementation-roadmap.md) | 各 Release 的 Scope、前置依赖、验收证据、Promotion 结果与 Profile 选择 | Release Gate 与 Capability Activation Gate 的分类语义、验证维度与 Gate 失败处置规则 |
| [参数附录](./appendix-parameters.md) | 容量 Evolution Trigger 阈值、Hardened Target 场景与上线前验证证据清单 | 三类 Gate 与验证维度的分类语义，供参数按 Gate 与场景归位 |
