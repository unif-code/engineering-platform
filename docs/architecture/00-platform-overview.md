# 平台总览

> 架构基线：`2026-08-06.175`

## 目标与边界

本平台是企业内部的 AI 研发协作平台，把人员与组织、授权、Requirement 交付流程、Agent 执行和外部研发工具连接为一条可治理、可追溯的主链路：人员以本地身份登录并在 Workspace 内创建、澄清 Requirement，按 Requirement Workflow 形成工作计划、责任分配与人工 Gate，由人员或受控 Agent 完成 WorkItem，经 Source Control 集成代码与证据，再完成验收、人工审核与交付，全程留下可关联的 Audit。目标用户包括产品人员、开发人员、Leader、经理、平台管理员和 Super Admin；平台服务于人员主导的研发协作——Agent 可以在受控范围内执行工作，但不能取代人员的业务决定或责任。

Core Platform 负责本地身份、组织与 Workspace、授权，Requirement 到交付的业务编排，Agent/Skill/Model 控制，Sandbox Runtime，Source Control 交付，平台应用与集成，数据与存储，安全与 Audit，基础设施运维以及 Configuration Governance；它通过稳定的 Port/Adapter 使用 GitLab、Model Provider、Sandbox、对象存储和运维系统，既不重建这些外部系统的专业能力，也不把它们的实现细节纳入业务领域。平台的核心价值由三件事构成：以明确的责任、权限和人工 Gate 管理研发交付；把人、Agent、代码变更、交付证据和 Audit 关联为可解释的业务事实；让环境隔离、受控执行和可替换集成共同约束平台演进。

本文只定义 System Context、总体责任分工和依赖边界，不重复各领域的内部规则，也不定义组件精确版本、领域状态机全集、Release Scope、实施状态、环境 Promotion 或容量数值。业务状态、代码事实与审计规则的归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)，精确参数见[参数附录](./appendix-parameters.md)；实际 Deployed State 不属于任何文档，须由环境 GitOps Desired State、PCS 与 Operations Read Model 证据证明。

## 核心模型

### System Context

```text
产品与研发人员 ──浏览器──┐
平台管理员 / Super Admin ─┼──> Platform Environment
                          │      ├── Web 用户端与管理入口
                          │      ├── Control Plane
                          │      ├── Workflow 与受控执行面
                          │      └── Audit 与业务证据
                          │
                          └── Adapter ──> GitLab / Model Provider
                                          Sandbox / 对象存储 / 运维系统
```

平台接收人员意图并按当前身份、资源边界和业务规则处理。外部系统只经 Adapter 参与，不直接取得平台领域写权限，也不替代平台对人员责任、授权或业务决定的判断。

### 外部系统

| 外部系统 | 平台使用的能力 | 边界 |
| --- | --- | --- |
| GitLab | Repository、分支、Merge Request 与外部变更 | GitLab 的对象与权限不替代平台业务授权和人工决定。 |
| Model Provider | 受控的模型推理能力 | Provider 能力通过 Model Gateway 解析，不直接定义人员权限。 |
| Sandbox Runtime | 隔离的 Agent 或构建执行能力 | 执行实例是运行资源，不是 Requirement 或人员责任事实。 |
| 对象存储与 Secret 服务 | Artifact、证据和短期凭据支撑 | 存储与凭据访问由其所属安全和技术 Contract 约束。 |
| Jenkins | 人工构建和测试 | 在目标边界中保持独立，不作为平台调用对象、状态来源或 Gate。 |
| 运维与基础设施系统 | 健康、只读状态和受控运维能力 | 平台不提供其通用管理接口，也不持有 Cloud Admin 身份。 |

### 逻辑分层

| 层 | 责任 | 不负责 |
| --- | --- | --- |
| 体验层 | 呈现工作台、管理入口和当前授权上下文 | 把客户端展示作为授权结论。 |
| Control Plane | 保存并处理身份、组织、Workspace、授权、Workflow、Agent Run、Configuration Governance 和 Audit 等业务事实 | 绕过领域规则直接操作基础设施。 |
| 编排与执行层 | 编排异步业务步骤，解析执行能力并调度隔离 Runtime | 改写人员责任或替代人工 Decision。 |
| 集成层 | 以 Adapter 实现内部 Port 与外部系统之间的 Contract | 将外部 Provider 细节泄漏进领域模型。 |
| 基础设施与运维层 | 提供运行、数据、网络、Secret、恢复和可观测性能力 | 成为业务领域事实的第二来源。 |

### 模块地图

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

模块通过明确的领域边界、Port 和领域事件协作：业务事实属于其领域 owner，Adapter 只把外部能力转换为内部 Contract，不把外部角色或状态直接当作平台业务事实。

### 端到端责任链

```text
人员 Principal
→ 当前 Session 与授权校验
→ Control Plane 命令及领域规则
→ Workflow 责任与人工 Gate
→ Agent / Sandbox 的受控执行（如适用）
→ Adapter 外部 Effect 与证据回流
→ 领域事实、可读投影与 Audit
```

每一层只承担自身职责：人员对业务决定和受分配责任负责，Control Plane 对当前规则与业务事实负责，执行面按不可变执行 Contract 运行，Adapter 对外部交互负责，Audit 记录可追溯证据。已启动的执行不改变“后续用户控制动作必须以当前授权重新判断”的规则。

### 单个 Platform Environment

一个 Platform Environment 是自包含的运行与治理边界：同一环境内的用户端和管理入口使用同一个 Web 构建产物和同一个 Control Plane API，并使用该环境本地的身份、Session、组织、Workspace、授权和 Audit 事实。环境内的 Control Plane 是业务事实协调点；领域模块各自维护权威事实，通过公开 Port、领域事件或只读投影交换信息，异步消息和缓存只加速传播，不取代权威事实。

### Profile 与 Capability 启用语义

| 概念 | 在 Target Architecture 中的含义 | 选择与启用规则 |
| --- | --- | --- |
| Core Platform | 01～10 全部逻辑模块、跨模块责任链、安全边界及其完整目标 Contract 与 Port/Adapter Contract。 | 始终作为设计与评审边界；不等同于某次 Release 的启用清单，也不表示全部 Capability 同时运行。 |
| Launch Profile | 从 Core Platform 中选出的首发 Capability 组合，以满足目标 Contract 的最小可运营拓扑启用。 | 入选 Capability 必须满足对应目标 Contract；未被选入或未通过 Capability Activation Gate 的能力保持关闭。 |
| Hardened Target Profile | 完整 Node Role、冗余、隔离、可观测性、恢复和规模化目标。 | 由已批准的 Evolution Trigger 与容量证据驱动候选评估，不是 Launch Profile 的默认采购或部署状态。 |
| Future Evolution | 通过独立演进 Port/Adapter、数据边界、Deployable 与基础设施实现来提升规模与韧性的方向。 | 每项分别验证兼容、迁移、回退、恢复、安全和 Observability，不借演进重写无关领域，也不自动启用目标能力。 |

Profile 的 Release 选择、实施状态与环境 Promotion 见[实施路线图](./12-implementation-roadmap.md)，人数容量场景与服务器数值见[参数附录](./appendix-parameters.md#容量与服务器规划)；本文只定义两者必须遵守的架构边界。

## 关键不变量

- 授权结论只在服务端产生：Model、Agent 与界面可见性绝不绕过人员授权、人工 Gate 或受保护资源边界——展示层与执行资源都不是授权事实源。
- 受保护操作在授权或关键事实未知、过期、无法验证时 Fail Closed——安全与责任正确性优先于可用性，猜测不能成为继续执行的依据。
- 重要业务动作必须能关联 Principal、Scope、责任、证据与 Audit——无法解释的动作也就无法归属责任。
- 人员与 Runtime 都只获得完成当前动作所需的权限范围——缩小任一主体被滥用时的影响面。
- DEV 与 PROD 是两个独立 Platform Environment，不共享 Web/API 运行实例、域名、数据库、用户记录、Session、凭据、Audit 或外部连接上下文，也不存在跨环境切换器或跨环境直接写入路径——环境隔离是可验证的故障域与信任域边界；个人 Local Development Environment 不属于该部署语义。
- DEV 与 PROD 以同源代码、逻辑模块、Contract、GitOps 模板和兼容性基线独立部署——同源保证行为一致，独立部署保证隔离。
- 高风险执行与异步编排可以作为独立部署单元，但仍受相同的领域 Contract 约束——部署拆分不是放宽规则的理由。
- 依赖方向固定为 体验层 → Control Plane 公开 API → 领域模块 → Port → Adapter → 外部系统；领域模块不依赖 UI、具体外部 Provider 或基础设施实现来解释业务规则——反向依赖会让外部变更改写领域语义。完整依赖与写入边界见[架构基线](./11-architecture-baseline.md)。
- UI 不直接连接领域数据存储或基础设施 Backend，后端返回的菜单与可见性也不是安全边界——可见性是体验结果，不是权限判定。
- Adapter 依赖内部 Port，不能反向要求业务模块采用外部系统的角色、状态或数据模型，存储与消息实现也不塑形领域语义——这是外部 Provider 与基础设施可替换的前提。
- 事件、消息与只读投影依赖权威领域事实，不得反写权威事实，其延迟、失败或重建也不得静默放宽安全规则——异步只加速传播，不产生第二事实源。
- 外部 Provider 与部署实现只通过 Port/Adapter 更换，不改变核心业务语义——集成与部署选择不应绑定领域模型。
- 平台不重建 GitLab 的代码托管与 MR 产品能力——平台的价值在治理与关联，专业能力经 Adapter 复用。
- 独立的 Jenkins 人工构建与测试不作为平台 Gate、状态来源或调用对象——平台 Gate 只能由平台自身的证据与人工 Decision 支撑。
- 单个 Sandbox、运行实例或外部系统的生命周期不等同于 Requirement 生命周期，执行资源也不取得 Requirement 的业务写权限——运行资源可以重建，业务责任事实不随其消失。
- 运行实例故障不得使已记录的业务事实、交付证据和 Audit 失去归属与可追溯性——恢复要恢复整条责任链，而不只是进程。
- 平台不提供 Cloud、Kubernetes 或其他基础设施的通用写操作入口——业务入口不应升级成基础设施管理面。
- Target Architecture、Implementation Roadmap 与 Deployed State 不得相互替代——目标 Contract、交付决策与运行事实由三类不同证据证明。
- 未被路线图选入或未通过 Capability Activation Gate 的能力保持关闭，且不得以不满足授权、安全、隔离、证据或恢复 Contract 的半成品方式启用——部分启用会把整条链路的安全边界降级。
- 运行、审核与集成绑定被审核的配置版本与 Effective Snapshot，不允许可变页面值决定行为——配置必须有类型、可版本化且可回溯才能作为受控输入。
- Configuration 的通用治理协议由 [Configuration Governance](./10-configuration-governance.md) 定义，各 Namespace 的 Policy 数据与业务解释仍属对应领域模块——治理协议与业务语义分离才能各自独立演进。

## 与其他模块的关系

00 拥有模块边界与责任链总览，故本表按模块列出该模块自身的消费与提供；其余各篇的同名表是该篇模块自身的视角。表中包含 01～10 的 Core Platform 模块，以及 11、12 与参数附录三篇跨模块文档。每个模块的完整 Contract 由该模块自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 10 的 Configuration Contract（Draft/ChangeSet/Effective Snapshot/Promotion 语义） | Principal、组织、Workspace、Membership 与成员投影、Capability、Scope、Assignment、服务端授权判定、Super Admin 与 Bootstrap 边界、配置命令资格与 Identity 恢复 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | 01 授权判定、03 执行事实、05 交付证据、07 Artifact 对象 | Requirement、WorkItem、Route、Gate、Decision、Acceptance 与业务责任链 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 01 授权、02 业务上下文、04 执行能力、10 配置快照 | Agent Definition、Skill/Model 路由、Evaluation、Run/Attempt 与不可变 Execution Binding |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 03 Execution Binding、08 短期凭据、09 Node 与物理容量边界 | 隔离执行、lease、资源准入、网络、Preview、清理与恢复 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | 01 授权、02 责任链引用、06 Adapter 与一致性 Contract | GitLab Binding、分支、MR、Artifact 与稳定交付 Evidence |
| [06 平台应用与集成](./06-platform-application-integration.md) | 01～05、07～10 的领域与技术 Contract | Web 与 Control Plane 边界、业务 API、Port/Adapter、跨模块一致性、Operations Read Model 与运维 Console 可见性 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | 09 的运行、存储与备份能力 | 权威数据、消息、缓存、Artifact 对象与配额账本、Retention、备份与组件恢复支撑 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | 01 身份事实、07 存储与保留能力 | Trust、Secret、加密、供应链、Audit Envelope、Break-glass 与安全恢复的 Fail Closed Contract |
| [09 基础设施与运维](./09-infrastructure-operations.md) | 10 的 GitOps 配置治理协议 | Platform Environment、GitOps Desired State、Kubernetes、网络、可观测性、物理容量准入与环境恢复 |
| [10 Configuration Governance](./10-configuration-governance.md) | 01 的配置命令资格、各领域 Namespace 的 Schema、默认值与业务解释 | 配置分类、版本、Effective Snapshot、兼容性演进与 DEV→PROD Promotion 协议 |
| [11 架构基线](./11-architecture-baseline.md) | 00～10 的目标 Contract | 跨模块不变量、依赖与写入边界、Quality Scenario 以及三类 Gate 的分类与语义 |
| [12 实施路线图](./12-implementation-roadmap.md) | 00～11 的目标 Contract、附录的容量场景与数值 | Release Scope、Release Gate 与验收证据、实施状态、环境 Promotion 与 Profile 选择 |
| [参数附录](./appendix-parameters.md) | 各模块正文中的定性规则 | 全部精确参数：资源数值、Policy Key、错误码、Port 方法清单、Runtime 组件、容量场景与服务器矩阵 |
