# 平台总览详细说明

> 架构基线：`2026-08-06.175`
> 文档层级：L2 详细说明
> 对应主文：[平台总览](./platform-overview.md)

## 1. 文档目的与边界

本文定义平台的 System Context、总体责任和依赖边界。它说明各领域如何共同组成 Core Platform，以及不同 Profile 如何在不改变目标 Contract 的前提下选择和启用能力，但不重复定义身份授权、Workflow、Agent、Sandbox、交付、Configuration、安全或基础设施主题的内部规则。

本文不定义组件精确版本、领域状态机全集、Release Scope、实施状态、环境 Promotion 或容量表；目标 Contract 分别属于其领域 owner，路线图事实属于 [12](./12-implementation-roadmap.md)，Deployed State 由环境 GitOps Desired State、PCS 和 Operations Read Model 证据证明。

## 2. System Context

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

平台接收人员意图并按当前身份、资源边界和业务规则处理。外部系统只经 Adapter 参与；它们不会直接取得平台领域写权限，也不会替代平台对人员责任、授权或业务决定的判断。

## 3. 外部系统

| 外部系统 | 平台使用的能力 | 边界 |
| --- | --- | --- |
| GitLab | Repository、分支、Merge Request 与外部变更 | GitLab 的对象与权限不替代平台业务授权和人工决定。 |
| Model Provider | 受控的模型推理能力 | Provider 能力通过 Model Gateway 解析，不直接定义人员权限。 |
| Sandbox Runtime | 隔离的 Agent 或构建执行能力 | 执行实例是运行资源，不是 Requirement 或人员责任事实。 |
| 对象存储与 Secret 服务 | Artifact、证据和短期凭据支撑 | 存储与凭据访问由其所属安全和技术 Contract 约束。 |
| Jenkins | 人工构建和测试 | 在目标边界中保持独立，不作为平台调用对象、状态来源或 Gate。 |
| 运维与基础设施系统 | 健康、只读状态和受控运维能力 | 平台不提供其通用管理接口，也不持有 Cloud Admin 身份。 |

## 4. 逻辑分层

| 层 | 责任 | 不负责 |
| --- | --- | --- |
| 体验层 | 呈现工作台、管理入口和当前授权上下文 | 把客户端展示作为授权结论。 |
| Control Plane | 保存并处理身份、组织、Workspace、授权、Workflow、Agent Run、Configuration Governance 和 Audit 等业务事实 | 绕过领域规则直接操作基础设施。 |
| 编排与执行层 | 编排异步业务步骤，解析执行能力并调度隔离 Runtime | 改写人员责任或替代人工 Decision。 |
| 集成层 | 以 Adapter 实现内部 Port 与外部系统之间的 Contract | 将外部 Provider 细节泄漏进领域模型。 |
| 基础设施与运维层 | 提供运行、数据、网络、Secret、恢复和可观测性能力 | 成为业务领域事实的第二来源。 |

## 5. Core Platform 模块责任

| 模块 | 目标责任 | 主要协作边界 |
| --- | --- | --- |
| 01 身份、组织与授权 | Principal、组织、Workspace、Membership、Capability、Scope、Assignment 与服务端授权。 | 向全部受保护业务提供当前授权判定，不把 UI 可见性当作授权。 |
| 02 Requirement Workflow | Requirement、WorkItem、Route、Gate、Decision、Acceptance 与业务证据责任链。 | 引用执行和交付证据，不把外部状态直接写成业务结论。 |
| 03 Agent、Skill 与 Model | Agent Definition、Skill/Model 路由、Evaluation、Run/Attempt 与 Execution Binding。 | 经 Port 使用模型与执行能力，不取得 Requirement 业务写权限。 |
| 04 Sandbox Runtime | 隔离执行、lease、资源准入、网络、Preview、清理与恢复。 | 按不可变 Binding 物化 Runtime，不解释业务责任。 |
| 05 Source Control 与交付 | GitLab Binding、分支、MR、Artifact 与交付证据收敛。 | 通过 Adapter 连接 GitLab，以稳定 Evidence 供 Workflow 引用。 |
| 06 平台应用与集成 | Web、Control Plane、业务 API、Port/Adapter、一致性与 Operations Read Model。 | 协调领域用例和外部 Effect，不成为其他领域或运行状态的第二事实源。 |
| 07 数据、消息与存储 | 权威数据、消息、缓存、Artifact、Retention、备份与组件恢复支撑。 | 保持各事实边界与可恢复证据，不用存储实现塑形领域语义。 |
| 08 安全、审计与治理 | Trust、Secret、加密、供应链、Audit、Break-glass 与安全恢复。 | 对所有受保护路径提供 Fail Closed 的安全 Contract。 |
| 09 基础设施与运维 | Platform Environment、GitOps、Kubernetes、网络、可观测性、容量与环境恢复。 | 提供受控运行边界，不反写领域事实或跨环境写入。 |
| 10 Configuration Governance | 配置分类、版本、Effective Snapshot、兼容性与 Promotion 协议。 | 绑定被审核的配置事实，不允许可变页面值决定运行。 |

11 汇总跨模块不变量、Quality Scenario 和 Gate 分类，但不重新拥有上述领域规则。

## 6. 单个 Platform Environment 总体结构

一个 Platform Environment 是自包含的运行与治理边界：同一环境内的用户端和管理入口使用同一个 Web 构建产物和同一个 Control Plane API，并使用该环境本地的身份、Session、组织、Workspace、授权和 Audit 事实。

环境内的 Control Plane 是业务事实协调点。领域模块各自维护其权威事实，通过公开 Port、领域事件或只读投影交换信息；异步消息和缓存可以加速传播，不能取代权威事实。高风险执行与异步编排可作为独立部署单元，但仍受相同的领域 Contract 约束。

## 7. DEV 与 PROD 实例语义

DEV 与 PROD 使用同源代码、逻辑模块、Contract、GitOps 模板和兼容性基线独立部署。环境是否已 Provision、已部署或已接收 Promotion 只能由路线图与 Deployed State 证据判断，本文不声明其运行状态。

DEV 与 PROD 是两个独立的 Platform Environment：不共享 Web/API 运行实例、域名、数据库、用户记录、Session、凭据、Audit 或外部连接上下文。每个环境的管理入口只治理并展示当前环境；不存在跨环境切换器或跨环境直接写入路径。

个人 Local Development Environment 不属于该部署语义。

## 8. Profile 与 Capability 启用语义

| 概念 | 在 Target Architecture 中的含义 | 选择与启用规则 |
| --- | --- | --- |
| Core Platform | 01～10 全部逻辑模块、跨模块责任链及其完整目标 Contract。 | 始终作为设计与评审边界；不表示全部 Capability 同时运行。 |
| Launch Profile | 支撑首次安全交付所需的 Capability 组合与最小可运营拓扑。 | 由 12 选择；入选 Capability 必须满足对应目标 Contract，未选或未通过 Activation Gate 的能力保持关闭。 |
| Hardened Target Profile | 完整 Node Role、冗余、隔离、可观测性、恢复和规模化目标。 | 由已批准的 Evolution Trigger 与容量证据驱动候选评估，不是默认采购或部署状态。 |
| Future Evolution | Port/Adapter、数据边界、Deployable 与基础设施实现的独立演进方向。 | 每项分别验证兼容、迁移、回退、恢复、安全和 Observability，不借演进重写无关领域。 |

[实施路线图](./12-implementation-roadmap.md)统一导航 Release Scope、Profile 选择和 Promotion；[路线图详细说明](./12-implementation-roadmap.md)拥有版本 Contract 与状态；[环境容量与服务器规划](./environment-capacity-plan.md)拥有人数容量场景和 Profile 数值。本节只定义三者必须遵守的架构边界。

## 9. 端到端责任链

```text
人员 Principal
→ 当前 Session 与授权校验
→ Control Plane 命令及领域规则
→ Workflow 责任与人工 Gate
→ Agent / Sandbox 的受控执行（如适用）
→ Adapter 外部 Effect 与证据回流
→ 领域事实、可读投影与 Audit
```

每一层仅承担其自身职责：人员对业务决定和受分配责任负责；Control Plane 对当前规则与业务事实负责；执行面按不可变执行 Contract 运行；Adapter 对外部交互负责；Audit 记录可追溯证据。已启动执行的生命周期不改变后续用户控制动作必须以当前授权重新判断的规则。

## 10. 全局依赖方向

```text
体验层 → Control Plane 公开 API → 领域模块 → Port → Adapter → 外部系统
                          ↓
                     Outbox / 事件 / 只读投影
```

- 领域模块不能依赖 UI、具体外部 Provider 或基础设施实现来解释业务规则。
- UI 不能直接连接领域数据存储或基础设施 Backend；后端返回的菜单与可见性也不是安全边界。
- Adapter 依赖内部 Port，不能反向要求业务模块采用外部系统的角色、状态或数据模型。
- 事件与投影依赖权威领域事实；它们的延迟、失败或重建不得静默放宽安全规则。
- Configuration 通用治理协议由 [10](./10-configuration-governance.md)拥有；各 Namespace 的 Policy 数据与业务解释仍由对应领域模块拥有。

## 11. 架构质量目标

- **可解释性**：对重要业务动作能够关联 Principal、Scope、责任、证据和 Audit。
- **最小授权**：人员与 Runtime 都只获得完成当前动作所需的权限范围。
- **环境隔离**：环境本地的身份、数据、会话和外部连接不跨 DEV/PROD 共享。
- **可替换性**：外部 Provider 与部署实现通过 Port/Adapter 更换，不改变核心业务语义。
- **安全收敛**：授权或关键事实未知、过期或无法验证时，受保护操作不能依赖猜测继续执行。
- **可恢复性**：运行实例故障不应使已记录的业务事实、交付证据和 Audit 失去其归属与可追溯性。
