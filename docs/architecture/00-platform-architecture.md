# 内部研发平台目标架构

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06

## 1. 平台定位

建设一个面向产品、产品 Leader、前后端开发、开发 Leader、经理、管理员和超级管理员的企业内部 AI 研发平台。

平台将 Requirement、WorkItem、GitLab Project、Agent、Skill、Model、远程 Sandbox 和人工 Gate 连接起来。下面是 `feat` 的完整路径；`fix`、`refactor` 和 `chore` 由版本化 Route 决定实际 Artifact 与 Gate，不通过岗位或前端条件分支写死：

```text
需求澄清
→ Product SDD / 可运行黄金需求
→ Requirement Baseline 确认
→ WorkItem 拆分、负责人和仓库绑定
→ Backend / Frontend 交付
→ task branch 合入 dev 并完成联调与测试
→ Requirement 最终验收
→ Formal MR 人工审核
→ 合并 main
```

首版 Jenkins 保持独立，用户在 Jenkins 手工构建和测试；平台不调用、不读取其状态，也不把它作为平台 Gate。Jenkins 未来仍可通过稳定 Adapter 接入，而不改变 Requirement Workflow。

## 2. 核心设计决策

1. 单个 Platform Environment 内，用户端和管理端使用同一个前端构建产物、同一个 Control Plane API 及本环境用户事实；DEV 与未来 PROD 的运行实例、数据、Session 和凭据完全隔离。
2. 第一阶段由平台使用 8 位员工编号、本地密码、可撤销 Session 和所有用户强制 TOTP MFA 完成认证，不接入 SSO 或 HR；创建或重置账号时生成唯一随机、一次展示、默认 24 小时有效的临时密码。
3. 账号与组织身份分离；组织关系固定为“经理 → Leader → 普通员工”。产品与开发可以属于不同经理和不同组织链，但不建立第二层 Leader。
4. 创建用户不选择 Workspace；Leader 必须选择有效经理，普通员工必须选择有效直属 Leader，不再要求上下级属于同一 specialty 字符串。
5. 创建 Workspace 的 Leader 成为 Owner，只有 Owner 能邀请、移除其他 Leader和转让所有权；受邀 Leader不能继续治理 Leader 名单。
6. 正式成员由 Owner、受邀 Leader及其直属普通员工动态派生，不包含经理；Workspace 不提供手工设置正式成员。
7. Role 不作为授权核心；岗位只提供创建时的默认 Capability 模板和路由来源，实际授权统一由 Capability + Scope + Assignment + 当前资源状态决定。
8. Workspace 正式成员能否创建 Requirement 由 `requirement.create` Capability + Scope 决定；产品或开发岗位都不自动允许或禁止创建，创建权也不等于确认、验收、代码审核或合并权。
9. Requirement 按类型路由：`feat` 执行完整 SDD，`fix` 执行 Superpowers 的 systematic-debugging、TDD、验证和评审流程，`refactor` / `chore` 执行技术快速流程；只要 Route 实际启用 SDD 就必须经过人工确认 Gate。
10. `feat` 在真实前端仓库中完成 Product SDD，生成页面、交互和 Mock，形成可运行黄金需求。
11. 需要后端交付时执行 Backend SDD 并产出机器可读的 API Contract；复杂前端需求才升级为完整 Frontend SDD。
12. 创建 Requirement 时必须且只能选择一个初始 GitLab Project；Requirement 可以继续拆分多个 WorkItem，每个 WorkItem 最终必须且只能绑定一个仓库，并拥有独立任务分支和 MR。
13. Agent、Superpowers Skill、Model 和人员 Capability 相互解耦，Agent 只获得当前 Attempt 所需的短期工具权限。
14. SDD 确认、最终验收和 Formal MR Review 使用彼此独立的 Policy、Assignment 与 Decision；AI Review 只能提供证据或建议，不能代签人工 Decision。
15. Agent Attempt 在 Kata/QEMU/KVM 隔离的远程 Sandbox 中执行；Requirement 本身是业务聚合，不与单个 Sandbox 或 Attempt 生命周期绑定。
16. 归档只改变可见性并安全停止未结束执行，恢复不复活旧 Attempt；删除采用逻辑删除，第一阶段不做业务数据物理清除，Audit 始终独立保留。

## 3. 核心业务结构

```text
Identity
├── 员工编号本地账号
├── 随机一次性临时密码与正式密码
├── 可撤销 Session
└── 所有用户强制 TOTP MFA

Organization
└── 经理 → Leader → 普通员工
    ├── 一个经理可以有多个 Leader
    └── 产品 / 前端 / 后端仅为专业分类，不形成独立组织树

Workspace
├── Owner
├── 受邀 Leaders
├── 各 Leader 的直属员工
├── 有时效协作成员（非正式成员投影）
├── GitLab Project Binding
└── Requirement
```

正式成员跟随 Workspace Leader 和直属员工关系动态投影；经理不会仅因管理 Leader 自动成为成员。跨组织或临时访问使用带起止时间、原因、Scope和临时Grant的独立协作关系，不改写正式成员集合。Workspace Membership只决定进入边界，能做什么仍由Capability + Scope + Assignment决定。

## 4. Requirement 主流程

```text
创建 Requirement 并选择一个初始 GitLab Project
→ 按 feat / fix / refactor / chore 解析版本化 Route
→ 生成 SDD、Debug Baseline 或技术计划并完成人工确认
→ 拆分 WorkItem、设置人类负责人并绑定各自仓库
→ 从 main 创建任务分支并启动 Human 或 Agent Attempt
→ Integration MR：task branch → dev
→ 用户在独立 Jenkins 手工构建/测试
→ 冻结 Requirement Integration Baseline 并最终验收
→ 一键创建 Formal MR：task branch → main
→ 当前 MR Review assignee 人工审核并合并 main
```

验收或 MR 审核要求修改时，通常继续原 WorkItem、分支和 MR，并使旧 Decision 按 Artifact 版本或 `headSha` 失效；范围扩大或已经完成后出现新问题时，再创建关联的 `fix`、`feat`、`refactor` 或 `chore` Requirement。所有历史 Decision、Commit、Artifact 和 Audit 保留。

## 5. 平台分层

```text
体验层
├── 用户工作台
├── Requirement 详情三栏界面
└── 管理端

控制平面
├── Identity
├── Organization
├── Workspace
├── Authorization
├── Requirement Workflow
├── Agent Run
├── Configuration
└── Audit

执行平面
├── Temporal + Platform Orchestrator Worker
├── Model Gateway
├── Sandbox Controller
└── Kata Remote Sandbox

集成平面
├── GitLab Adapter
├── Model Provider Adapter
├── Object Storage / Secret / Event Bus Adapter
└── Notification / Operations Adapter
```

所有外部系统通过 Adapter 接入，Workflow 只依赖内部稳定接口，避免替换 Git 平台、Model、Sandbox 或 Jenkins 时修改核心业务。

## 6. 推荐部署形态

第一阶段采用“可替换基础设施 + 可提取模块化单体”：

- Python Control Plane 是一个模块化单体部署单元，内部包含 Identity、Organization、Workspace、Authorization、Requirement Workflow、Agent Run 和 Audit 模块；
- Temporal、Platform Orchestrator Worker、Model Gateway 和 Sandbox Controller 作为独立 Deployable，隔离异步编排与高风险执行面；
- PostgreSQL、Valkey/Redis-compatible、NATS JetStream、OpenBao、S3-compatible Object Storage、GitLab、Model Provider 和 Observability 都通过稳定 Port/Adapter 接入；
- 领域事实先与 Transactional Outbox 原子提交，再通过 NATS JetStream 发布；消息系统不是业务事实源；
- DEV 与未来 PROD 使用同源代码、组件清单、HA/复制机制、GitOps 模板和 PCS，但分别部署在独立 Resource Account、VPC 和 Kubernetes Cluster 中。

该方式比一开始全面微服务更容易交付，同时保留按模块拆分服务的接口边界。

## 7. 安全与治理原则

- `main` 禁止直接 Push，所有代码通过 MR 合并。
- Capability 授权必须带平台、Workspace、Project、Requirement 或 Repository Scope。
- 平台始终至少保留一个有效 Super Admin；Super Admin 的保留能力只治理平台配置和 Super Admin 生命周期，不是绕过 Capability、Assignment、Human Gate 或云基础设施边界的万能权限。
- Secret 不进入代码、日志、Prompt、ConfigMap 或普通环境变量；OpenBao Agent Injector 优先写入 Pod 内存文件并使用短期、最小权限凭据。
- Sandbox 默认隔离计算、文件、网络和凭据。
- Agent 不能以人员岗位获得权限，只能获得本次 Run 的最小 Runtime Policy。
- 关键操作写入追加式、防篡改 Audit，并关联用户、Agent、Skill、Model、仓库、Commit、Requirement 与外部 Effect；Audit 不随业务逻辑删除而删除。
- Cloud Account、VPC、NLB、WAF、VPN、NAT、KMS、外部 Backup 和 Watchdog 由运维治理；平台只消费逻辑 Contract 与签名只读状态，不持有 Cloud Admin Credential，也不提供基础设施写操作。

## 8. 环境与演进边界

- 当前只实例化 DEV，未来 PROD 单独部署；当前 DEV 不是简化拓扑试验环境，而是使用与 PROD 相同组件、Contract、HA 机制和运维流程的较小 Capacity Profile。
- 每个环境只有一个 `platform-gateway`，同时承载该环境用户端、管理端及获批专用 Route；DEV 和 PROD 不共享 Gateway、域名、Session、数据库或内部控制台实例。
- 当前使用单 Region、Single-Zone，提供 Cluster HA 与 Cluster DR，不宣称 Zone、Region 或 Site DR；Region/Zone 当前为部署时分配参数。
- 首个 Alibaba Cloud Sandbox Compute 在 Region 未定时以两台 EBM 作为保守 Fallback；架构不变量是两台独立物理 Host、KVM-capable、Kata 与单 Node 故障容量。目标 Region 若有官方 GA 且通过 PCS 的较小 Nested-Virtualization ECS，可独立替换 Provider Mapping。
- 首年当前 DEV Capacity Candidate 为 12 个 Node；未来 PROD 为 15 个 Node。具体 SKU 和月费不写入业务架构，通过独立 Environment TCO Snapshot 在 Region 与购买方式确定后计算。
- 后续可独立把模块化单体提取为微服务，或替换数据库、Cache、Event Bus、Secret Manager、Object Storage 与 Observability 实现；迁移通过新 Adapter、PCS、Capacity Profile 和数据验证完成，不修改领域 Workflow。

## 9. 模块导航

- [组织、Workspace 与 Capability](./01-organization-workspace-capability.md)
- [Requirement 与 SDD Workflow](./02-requirement-sdd-workflow.md)
- [Agent、Skill 与 Model](./03-agent-skill-model.md)
- [远程 Sandbox Runtime](./04-remote-sandbox.md)
- [GitLab、MR 与交付集成](./05-source-control-delivery.md)
- [管理端、审计与数据看板](./06-admin-audit-observability.md)
- [平台技术架构](./07-platform-technical-architecture.md)
- [完整架构决策基线](./08-rolling-architecture-decision-baseline.md)

## 10. 非目标

- 不重建 GitLab 的代码托管能力。
- 不重建 Jenkins 的部署流水线。
- 不允许 Model 或 Agent 绕过人工审批和受保护分支策略。
- 第一阶段不为每个逻辑模块建立独立微服务。
- 不把任何具体 Model 版本、Git Provider 或 Sandbox 实现写死在业务流程中。
