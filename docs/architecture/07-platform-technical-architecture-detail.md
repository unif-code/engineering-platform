# 内部研发平台技术架构详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 架构基线版本：2026-08-06.173
> 更新日期：2026-08-06
> 对应精简版：[平台技术架构](./07-platform-technical-architecture.md)

## 1. 文档目的与事实边界

本文说明研发工程平台采用什么技术、组件如何分层、数据和信任由谁拥有、DEV 与 PROD 如何实例化，以及基础设施如何独立替换。它应使后续开发人员或模型在不依赖对话上下文的情况下理解完整技术架构。

本文不是：

- 后端开发 Spec、API Schema、数据库表设计或实施 Plan；
- 已完成能力清单；
- Cloud Provider 采购单、精确 SKU 清单或实时价格表；
- 允许绕过 GitOps、PCS、Capability、Human Gate 或安全底线的操作手册。

文中“首发默认值”均必须进入版本化配置。除明确标记为 System Invariant、Security Floor、协议硬约束或不可变 Binding 的内容外，默认时间、容量、阈值、重试和 Retention 不得写死在业务代码、Frontend、镜像或临时脚本中。

### 1.1 统一术语

| 术语 | 含义 |
| --- | --- |
| Platform Environment | 一套独立的平台运行环境。当前仅 DEV，未来 PROD 使用同源架构独立部署 |
| Sandbox Environment | 某个 Requirement 对应的逻辑隔离执行环境，不等于 DEV 或 PROD |
| Local Development Environment | 开发人员本机工具环境，不是正式 Kubernetes Platform Environment |
| PCS | Platform Compatibility Set，不可变的组件版本、配置 Schema 和兼容性验证集合 |
| Environment Capacity Profile | 某个环境不可变、版本化的节点、Pod、存储、并发和故障余量配置 |
| CloudEnvironmentBinding | 某个环境到 Cloud Account、VPC、Region、Zone 和 IaC State 的不可变绑定世代 |
| ExternalProviderBinding | 平台外部 Cloud/Operations Provider 的逻辑绑定世代 |
| Control Plane | 保存平台业务事实并执行授权、Workflow 和治理的 Python 模块化单体 |
| Execution Plane | Agent Orchestrator、Model Gateway、Sandbox Controller/Worker 等独立执行组件 |

## 2. 当前仓库事实与目标范围

### 2.1 当前仓库事实

当前仓库是 Umi Max 前端工程，尚未包含后端、数据库迁移、Agent 执行面或正式 Kubernetes 部署。现有可复用技术基线如下：

| 领域 | 当前技术 |
| --- | --- |
| Web | Umi Max 4.6.64、React 19.2.5、TypeScript 6.0.3 |
| UI | Ant Design 6.4.4、Pro Components 3.1.12-0、Ant Design X 2.9.0 |
| 状态与请求 | Umi Initial State、Umi Model、Access、Request、TanStack React Query 5.101.0 |
| 样式 | antd-style 4.1.0、Tailwind CSS 4.3.1、CSS Modules |
| 构建 | Umi Max + utoopack，pnpm |
| 质量 | Biome 2.5.0、TypeScript noEmit、React Doctor |
| 测试 | Vitest 4.1.8、Testing Library、happy-dom、V8 coverage |

当前示例路由、mock、演示 Access 判断和 demo Service 不是生产 Capability、认证或 API 契约。

### 2.2 目标范围

目标平台包括：

- 同一 Umi Max Web App 中的用户端和“平台管理后台”；
- Python 3.12 模块化单体 Control Plane；
- 独立部署的 Agent Orchestrator、Model Gateway、Sandbox Controller、Sandbox Worker；
- PostgreSQL、Valkey、NATS JetStream、Temporal、OpenBao、Rook-Ceph RGW；
- Kubernetes、Cilium、Gateway API、cert-manager、Kata Containers；
- GitLab、Model Provider、Object Storage、Scanner、Observability 和外部 Provider Adapter；
- Cluster HA、Cluster DR、审计和只读运维看板。

首版不接入 SSO、HR，不实现 Site DR，不把 Control Plane 预先拆成微服务，也不通过空表、空开关或占位 Adapter 假装尚未实现的能力已经存在。

## 3. 总体架构准则

平台采用“可替换基础设施 + 可提取模块化单体”：

1. 业务模块只依赖稳定 Port、类型化 DTO 和领域事件，不依赖厂商 SDK 或基础设施私有对象。
2. Control Plane 是一个 Python 项目和一个部署单元，但每个模块拥有自己的领域模型、应用接口、数据和迁移。
3. Agent、Model、Sandbox 和 Image Build 属于高风险或高资源执行面，独立部署和扩缩容。
4. PostgreSQL 是业务事实源；Valkey、NATS、Temporal、Observability 和本地临时磁盘都不能替代业务事实。
5. 同步接口用于认证、查询、校验和命令受理；长任务通过 Temporal、Outbox、NATS 和持久化状态推进。
6. 所有外部副作用使用稳定 Idempotency Key、Effect Ledger、重试边界和不确定结果处置。
7. 浏览器输入、Webhook、模型输出、仓库内容、上传文件、Agent 工具输出和 Sandbox 产物默认不可信。
8. 配置、组件版本、Binding、Artifact、Decision 和 Execution Binding 都必须可追溯且版本化。
9. DEV 与 PROD 使用同源代码、组件清单、逻辑拓扑、GitOps 模板、PCS 和 Contract，不共享运行资源。
10. Observability 与 Audit 内建，但诊断数据不能冒充业务或审计事实。

跨模块治理统一采用：

~~~text
System Invariant / Security Floor
→ Platform Policy / Workspace Policy
→ Capability + Scope
→ Assignment
~~~

Assignment 只指定未完成责任的当前执行人，不授予 Capability，也不能改写已完成 Decision、Attempt、Artifact 或 Audit。

## 4. 逻辑架构与部署单元

~~~mermaid
flowchart TB
  Browser[Browser] --> Edge[运维管理的 Edge / VPN / WAF / LB]
  Edge --> Gateway[platform-gateway]
  Gateway --> Web[Umi Max Web]
  Gateway --> CP[Python Control Plane]

  CP --> PG[(PostgreSQL)]
  CP --> Cache[(Valkey)]
  CP --> Bus[(NATS JetStream)]
  CP --> Temporal[Temporal]
  CP --> Object[(Rook-Ceph RGW)]
  CP --> Bao[OpenBao]

  CP --> GitLab[GitLab Adapter]
  CP --> Orchestrator[Agent Orchestrator]
  Orchestrator --> Model[Model Gateway]
  Orchestrator --> SandboxCtl[Sandbox Controller]
  SandboxCtl --> Kata[Kata Sandbox / Image Builder]

  OpsCollector[Cluster 外 Operations Collector] --> Gateway
  OTel[OpenTelemetry] --> Metrics[Prometheus / Thanos]
  OTel --> Logs[Loki]
  OTel --> Traces[Tempo]
  Metrics --> Grafana[Grafana]
~~~

### 4.1 部署单元

| 部署单元 | 主要职责 | 事实边界 |
| --- | --- | --- |
| Umi Max Web | 用户页面、管理页面、动态菜单、交互和状态呈现 | 不做最终授权，不持有基础设施凭据 |
| platform-gateway | 当前环境统一北向入口、TLS、Route、限流和受控 Console 入口 | 不实现领域逻辑 |
| Python Control Plane | Identity、组织、Workspace、授权、Requirement Workflow、Agent Run、Audit | 拥有平台业务事实 |
| Agent Orchestrator | 执行编排、Attempt 调度、Checkpoint、取消和恢复 | 不拥有用户或 Requirement 主数据 |
| Model Gateway | 模型路由、能力映射、限流、计量、脱敏和 Provider 兼容 | 不实现 Requirement Workflow |
| Sandbox Controller | 将不可变 Resource/Runtime Profile 物化为 Kubernetes/Kata 资源 | 不做业务审批 |
| Sandbox Worker / Kata Guest | 受限代码、工具和 Build 执行 | 不保存唯一业务事实 |
| Integration Adapter | GitLab、Model、Registry、Scanner、Object、通知等协议转换 | 不作领域决策 |
| Operations Adapter | 聚合当前环境的只读健康、容量、告警和 Drift | 不修改基础设施 Desired State |

Control Plane 模块未来可以独立提取；独立部署的执行组件也不能通过直读 Control Plane 私有表取得耦合。

## 5. Platform Environment 与 Cloud Boundary

### 5.1 DEV 与 PROD

- 当前只创建 DEV。
- 未来 PROD 使用相同代码、组件、逻辑角色、HA/复制机制、GitOps 模板和 PCS，在另一组服务器和独立 Kubernetes Cluster 中实例化。
- DEV 与 PROD 不共享 Web、platform-gateway、Control Plane、PostgreSQL、Session、用户记录、NATS、OpenBao、Ceph、凭据、证书、密钥、域名、入口或状态。
- “同一个 platform-gateway”表示同一个逻辑组件与同源定义，不表示跨 Cluster 共用一个 Pod、Service 或 Gateway 实例。
- 管理产品统一命名为“平台管理后台”。当前 DEV 入口只显示 DEV；未来 PROD 入口只显示 PROD，不建设跨环境资源切换器。

### 5.2 Cloud Account 与 VPC

Alibaba Cloud 当前映射采用：

- 一个不承载业务 Workload 的 Resource Directory Management Account；
- DEV 独立 Resource Account + 非默认 Custom VPC；
- 未来 PROD 独立 Resource Account + 非默认 Custom VPC；
- 每环境独立 IaC State、Provisioning Identity、vSwitch、Route Table、Security Group、NLB、KMS、Backup Identity 和 Provider Audit Stream；
- Node、Pod、Service、VPC 与企业/VPN 地址经过全局不重叠校验；
- 默认不存在 DEV 与 PROD 之间的 VPC Peering、CEN、Shared VPC 或双向路由。

Management Account 不运行 Kubernetes、数据库、OpenBao、Object Storage 或平台服务。Alibaba 自动创建的 ResourceDirectoryAccountAccessRole 只作为组织级 Break-glass：不得供日常 IaC、Collector、CI/CD 或普通运维使用；使用时要求双人批准、强 MFA、短 Session、明确 Environment 和完整 ActionTrail。

CloudEnvironmentBinding 使用不可原地修改的 Generation 保存环境、成员账号指纹、VPC、Region、单元素 Zone Set、IaC Revision 和 Provider Mapping。业务对象只消费逻辑 Endpoint、StorageClass、Workload Identity 和 Port，不保存 Cloud Resource ID。

Region、Zone、CIDR、精确 ECS/EBM SKU 和价格是部署输入，不是领域架构常量。迁移 Region 或 Provider 时创建新 Binding Generation、执行迁移并重新完成 PCS 和 Capacity Gate。

### 5.3 External Provider Contract

平台外部 Cloud/Operations Plane 分为：

- CLOUD_FOUNDATION
- BUSINESS_EDGE
- CONTROL_PLANE_ENDPOINT
- EGRESS
- CONTROL_PLANE_RECOVERY
- EXTERNAL_WATCHDOG
- PROVIDER_AUDIT
- EXTERNAL_PROVIDER_CONSOLE

运维/IaC 负责 Cloud Account、VPC、NLB、WAF、DDoS、VPN、NAT/EIP、Cloud KMS、Cluster 外备份、Watchdog 和 Provider Audit 的创建、变更、恢复与销毁。平台从 platform-gateway 开始负责应用入口、认证、领域服务、状态校验、只读投影和授权 Console 入口。

每个外部依赖使用不可变 ExternalProviderBinding Generation。平台不保存 Cloud Admin Credential，不提供 IaC Apply/Destroy、VPC、Route、Security Group、NLB 或 KMS 写接口。

每个环境有一个位于目标 Cluster 外的 Environment Operations Collector 逻辑实例。它使用分源、短期、只读身份获取 Provider/IaC/Backup/Watchdog 状态，并通过 platform-gateway 专用 HTTPS Route 投递签名 ExternalProviderStatusEnvelope。首版不宣称 mTLS 已启用；TLS 保护传输，Envelope Signature 才证明 Collector 和内容身份。

Gateway 对该 Route 执行 Source Allowlist、独立 Rate Limit、Body Size 和 Content-Type 限制，NetworkPolicy 禁止绕过 Gateway 直连 Backend。Ingest 只接受 Observed Status，不接受 IaC、Shell、Provider Mutation 或任意 Callback。

Envelope 至少包含 Schema、Environment、Binding/Generation、Collector Lineage、唯一 ID、单调 Sequence、生成/到期时间、Coverage、Health/Drift、IaC Revision、Digest 和 Signing Key ID。Ingest 按环境、Binding、Lineage 维护 High-water Mark：

- 同 Sequence 同 Digest：幂等成功；
- 同 Sequence 不同 Digest：安全冲突；
- 更小 Sequence：拒绝 Replay；
- 新 Binding 或 Lineage：必须先通过 GitOps/Trust Store 激活。

Status Trust Store 把 Signing Key ID 精确绑定到 Environment、Collector Lineage 和允许上报的 Binding Kind/ID Scope。Key 生命周期为 ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED/REVOKED；平台只保存 Public Trust Material，Private Key 留在 Cluster 外。平台恢复时必须恢复 High-water Mark；无法证明时 Feed 保持 UNKNOWN，并通过受控新 Lineage 切换，禁止静默清零 Sequence 绕过 Replay。

外部状态统一归一化为 HEALTHY、DEGRADED、UNAVAILABLE、UNKNOWN、STALE、PARTIAL、DRIFT。没有机器接口的系统显示 NOT_INTEGRATED 或带到期时间的签名运维声明，不能伪造绿色健康。

Collector 或 Feed 故障只降低可见性，不阻塞已运行的 Requirement、数据库事务或 Agent；NLB、Egress、KMS、Backup 等真实依赖失败时，仍按各自 Contract 降级或 Fail Closed。

External Watchdog 必须独立于 Kubernetes、Control Plane、PostgreSQL 和 Collector，即使整个 Cluster 不可用也能从 Cluster 外通知失联。

## 6. Umi Max Web 架构

### 6.1 单应用

用户端和管理端使用同一个 Umi Max 构建产物、同一当前环境 Session 和组件体系。管理路由使用 admin 前缀，但不是第二个工程。

后端动态菜单只返回预注册 routeKey、Capability、Scope、显示顺序和元数据。Frontend 使用静态 Route Registry 解析组件，禁止后端下发任意模块路径、脚本或 URL。

菜单和按钮隐藏仅用于 UX；每个受保护 API 仍由 Control Plane 校验当前 Principal、Capability、Scope、Membership、Assignment 和资源状态。

### 6.2 前端目录和依赖

~~~text
src/
  app.ts
  access.ts
  pages/                 Umi 路由装配
  features/              按业务能力纵向拆分
    auth/
    navigation/
    requirements/
    workflows/
    runs/
    agents/
    administration/
  components/            跨 Feature 复用 UI
  services/
    generated/           OpenAPI 生成，禁止手改
    transport/           Request、Problem Details、拦截器
  models/                少量全局客户端状态
  hooks/
  types/
  utils/
  constants/
~~~

依赖方向固定为 pages → features → services/generated；共享 UI 不依赖具体业务 Service。跨 Feature 调用通过公开入口，不能导入其他 Feature 内部文件。

### 6.3 状态管理

| 状态 | 载体 |
| --- | --- |
| 路由、筛选、详情 ID | Umi Router path/query/params |
| 服务端数据 | React Query |
| 当前用户、当前 Workspace、UI 偏好 | Umi Initial State / Model |
| 表单 | ProForm / Ant Design Form |
| 页面瞬时状态 | React state/reducer |
| Run/Attempt 增量 | SSE 或 WebSocket 更新 React Query Cache |

服务端错误统一映射为 Problem Details；组件不得依赖底层 Request/Axios 异常结构。Realtime Event 必须带实体版本，旧事件不得覆盖新状态。

### 6.4 Session 启动

1. 浏览器使用 Secure、HttpOnly、SameSite Cookie 请求当前环境 Control Plane。
2. me 接口返回用户、组织关系摘要、当前 Workspace 和有效 Capability。
3. navigation 接口返回动态菜单。
4. Frontend 以静态 Route Registry 渲染页面。
5. 所有后续 API 由 Backend 实时授权。

## 7. Python Control Plane

### 7.1 技术选型

Control Plane 使用：

- Python 3.12
- FastAPI
- Pydantic 2
- SQLAlchemy 2
- Alembic
- PostgreSQL Driver 和依赖版本由锁文件固定

统一内部结构：

~~~text
backend/control_plane/app/
  bootstrap/
  modules/
    identity/
    organization/
    workspace/
    authorization/
    requirement_workflow/
    agent_run/
    audit/
  shared/
    api/
    db/
    events/
    observability/
    security/
~~~

每个模块内部采用：

~~~text
api/          HTTP DTO、路由、鉴权声明
application/  Command、Query、Use Case、事务边界
domain/       Entity、Value Object、Domain Service、Event
ports/        Repository 与外部依赖接口
adapters/     SQL、Provider、Transport 实现
~~~

### 7.2 模块事实所有权

| 模块 | 拥有的事实 |
| --- | --- |
| Identity | 本地员工账号、密码哈希、临时凭据、Session、TOTP、认证状态 |
| Organization | 经理、Leader、普通员工、直属关系和组织版本 |
| Workspace | Owner、受邀 Leader、正式成员投影、资源归属 |
| Authorization | Capability、Scope、Grant、有效权限投影、菜单授权 |
| Requirement Workflow | Requirement、WorkItem、Route、Gate、Assignment、Decision、交付状态 |
| Agent Run | Run、Attempt、Execution Binding、Artifact 元数据和执行策略引用 |
| Audit | 追加式安全与业务审计索引 |

Configuration Schema、Policy、解析器和验证器归属于对应领域模块；统一 Configuration Catalog 只聚合，不接管模块数据。Artifact、Notification、Operations Read Model 等能力通过明确的应用边界归入拥有其事实的模块或独立可提取子域，不能成为 shared 目录中的无主业务表。

### 7.3 模块依赖规则

- 模块只能调用对方公开 Application Facade 或消费其领域事件。
- 禁止导入其他模块的 ORM Model、Repository 或内部 Domain Entity。
- 每个模块拥有独立数据库 Schema、迁移目录和数据访问账号。
- 本地事务只修改一个模块拥有的数据。
- 跨模块推进使用 Facade 协调或 Transactional Outbox，不使用分布式事务。
- API 只返回显式 DTO，不返回 ORM 对象。
- 架构测试必须验证依赖方向和禁止导入规则。

后续提取微服务时，模块的 Domain、Application、Schema、Migration、Configuration 和 Audit 责任一起迁移，其他模块继续依赖原 Port/Contract。

## 8. Identity、组织、Workspace 与授权技术约束

### 8.1 Identity

首版仅使用平台本地账号，不接入 SSO/HR，也不提供自助注册。

- 员工编号为恰好 8 位数字，允许 0 开头，按字符串保存。
- 创建或重置账号时生成每账号唯一的密码学安全随机临时密码。
- 临时密码默认 24 小时有效、只展示一次，首次成功使用时原子消费。
- 临时密码只签发受限 Bootstrap Session；完成正式密码和 TOTP 前不能进入业务能力。
- 正式密码长度 15～32 位，必须包含大写、小写和特殊字符，并拒绝弱密码、泄露密码和账号上下文密码。
- 密码采用 Argon2id、每账号独立 salt 和由 OpenBao 管理的 pepper；数据库不保存明文。
- 密码过期支持永不过期、90 天、180 天和自定义周期，属于 PLATFORM_POLICY。
- 所有用户必须绑定 TOTP，不是只对高风险用户要求。
- Enrollment 可显示二维码和一次性 Secret；首版无恢复码，管理员通过专用 Capability 重置 MFA。
- 密码或 MFA 重置撤销既有 Session；TOTP Secret 永不进入日志、Audit、配置目录或页面回显。

首版不实现 Passkey/WebAuthn 的表、API、UI 或空开关。Identity 必须让现有密码与 TOTP 流程实际经过与认证方式无关的 Authenticator Port；未来可在该 Port 后增加 userVerification=required 的 Passkey Adapter，而不修改 Session、Authorization 或业务 Workflow。

Session 为服务端可撤销 Session。连续 60 分钟无受认证用户活动后失效；后台 Agent 运行不刷新用户 Session。同一账号默认最多 3 个有效 Session，可在 1～10 范围通过 Policy 配置。

Session、密码、MFA 或用户控制权限变化不终止已启动 Attempt，但会立即影响查看、取消、重试和新 Run。

每个 Platform Environment 只允许执行一次版本化 Super Admin Bootstrap。Super Admin 使用相同的 8 位员工编号、正式密码和强制 TOTP，保留能力 platform.configuration.manage 与 platform.super_admin.manage 不进入普通岗位模板或 Grant。平台必须始终保持至少一个有效 Super Admin；最后一个不可被移除、停用或删除。

最后一个 Super Admin 不可正常登录时，只允许在维护窗口运行 Digest 锁定、短生命周期的 Cluster 内 Recovery Job/CLI，通过最小权限 Recovery Port 创建一次性 Bootstrap 资格；不提供 Web Recovery、不直接改 SQL、不复用 OpenBao Share，也不保留常驻高权限 ServiceAccount。

### 8.2 组织与 Workspace

组织当前只有一层 Leader：

~~~text
经理
└── Leader
    └── 普通员工（产品、前端或后端）
~~~

创建 Leader 时选择经理；创建普通员工时选择直属 Leader。产品和开发可以属于不同经理链。首版不允许 Leader 嵌套 Leader，也不允许普通员工拥有下属。

Workspace 规则：

- 创建 Workspace 的 Leader 是唯一 Owner；
- Owner 可以邀请、移除其他 Leader并转让 Owner；
- 受邀 Leader参与业务，但不能继续邀请、移除其他 Leader或转让 Owner；
- 正式成员投影 = Owner + 受邀 Leader + 这些 Leader 当前直属普通员工；
- 经理不会因管理 Leader 自动成为成员；
- Membership 只进入 Workspace 边界，动作仍需 Capability + Scope。

### 8.3 Authorization

岗位只用于默认 Capability 模板或默认责任人解析，业务授权不检查字符串角色。

每个 API 请求校验：

~~~text
Principal + Session
→ Membership
→ Capability
→ Scope
→ Assignment
→ Resource State Guard
~~~

授权投影可以缓存，但 PostgreSQL 当前版本是事实源。版本未知、缓存过期或安全写操作无法回源时拒绝，不使用陈旧权限放行。

## 9. Typed Configuration 与发布边界

Configuration Catalog 只管理已注册的类型化配置，不提供任意 Key/Value、JSON、SQL、表达式或脚本编辑器。

| 分类 | 事实源 | 管理方式 |
| --- | --- | --- |
| PLATFORM_POLICY | 对应模块 PostgreSQL | Super Admin 在平台后台受控发布 |
| GITOPS_CONFIG | Git、Helm、Kubernetes Manifest | 后台只读，变更走 GitOps |
| SYSTEM_INVARIANT | 领域代码、数据库约束、安全规则 | 只读展示，不可降级为普通开关 |

Super Admin 的保留能力 platform.configuration.manage 只管理 PLATFORM_POLICY，不能修改 GitOps、Secret、安全底线或绕过 Human Gate。

Secret、Token、Access Key、TOTP Secret、Private Key 和明文凭据永不进入 Catalog；Catalog 只保存稳定 Secret Reference、用途、版本、Fingerprint、轮换和健康元数据。为解除 Bootstrap/Recovery 循环依赖而位于 Cluster 外或离线的 Share、Recovery Key、Recovery Bundle 继续服从各自更严格的恢复 Contract。

PLATFORM_POLICY 使用：

~~~text
DRAFT
→ 服务端类型/依赖/Security Floor 校验
→ Impact Preview
→ TOTP Challenge
→ PUBLISHED
~~~

发布的最小单位是单一模块 Namespace + 单一 Scope 的 Configuration ChangeSet。发布采用 Active Pointer CAS，跨模块 ChangeSet 不伪装为全局原子事务。回滚创建新版本，不删除历史。

每个配置声明类型、单位、时区、默认值、Min/Max、Allowlist、依赖、Scope、继承方式、事实源、变更通道、Effect Semantics、Promotion Mode、回滚值和 Redaction。生效语义从 IMMEDIATE、NEW_OBJECT、NEXT_SCHEDULE、NEW_ATTEMPT、RESTART、ROLLOUT、RECREATE 等受控集合选择。

DEV 到 PROD 的 Policy Promotion 使用签名 Canonical JSON Bundle，不复制数据库、不共享 Secret，也不建立跨环境运行时信任。PROD 导入后重新校验本地 Schema、Security Floor、Scope、基础设施 Envelope 和 Secret Reference，再形成 PROD Draft；最终仍需 PROD 本地 TOTP 发布。

## 10. Port、Adapter 与通信

### 10.1 核心 Port

| Port | 稳定语义 | 当前 Adapter |
| --- | --- | --- |
| SourceControlPort | Project、Repository、Branch、Commit、MR | GitLab |
| ContainerRegistryPort | OCI Repository、Digest、Pull/Push Scope | GitLab Container Registry |
| ModelProviderPort | Chat/Completion/Stream、Deployment Capability | 百炼 compatible-mode |
| WorkflowOrchestratorPort | Workflow 启动、Signal、Query、Cancel | Temporal |
| EventBusPort | Command/Event 发布与消费 | NATS JetStream |
| CachePort | Session 热数据、缓存、限流、锁 | Valkey Sentinel-aware Client |
| SecretManagerPort | Secret Reference、Lease、Transit、PKI | OpenBao |
| ObjectStoragePort | Versioned Object、Presigned Request、Metadata | Rook-Ceph RGW |
| FileSecurityPort | 用户文件恶意内容扫描 | ClamAV Adapter |
| ImageSecurityPort | OCI Image、SBOM、漏洞和配置扫描 | Trivy Adapter |
| ArtifactSignerPort | OCI Signature、Provenance | Cosign + OpenBao Transit |
| SandboxPort | 创建、恢复、停止、回收 Sandbox | Kubernetes/Kata Controller |
| ImageBuildPort | 受控 Child Image Build | Rootless BuildKit |
| TelemetryPort | 标准 Telemetry 输出 | OpenTelemetry |
| Metrics/Log/Trace/Alert Query Port | 运维查询 | Thanos、Loki、Tempo、Alertmanager |
| ConsoleAccessPort | 受权新标签页入口 | Auth Proxy / Console Adapter |
| OperationsStatusFeedPort | Cluster 外 Provider 状态导入 | 签名 Envelope Ingest |
| TrustBundlePort | Root Trust Bundle 分发 | GitOps/Node/Workload Adapter |
| ServiceIdentityPort | Machine JWT/JWKS | Identity + OpenBao Transit |

领域 DTO 不暴露 Kubernetes Pod、NATS Message、GitLab 私有响应、OpenBao Token、Ceph Bucket Admin API 或 Alibaba Resource ID。

### 10.2 通信规则

- Browser 的平台业务和控制请求只访问当前环境 platform-gateway；后端实时授权后，允许 Browser 使用只绑定精确 Object Version 的短期 Presigned Request 访问 S3 Endpoint，或在新标签页打开受权 Console。
- Browser 不直连 Model Gateway、NATS、OpenBao、Kubernetes API、Observability Backend 或 RGW Admin API。
- Control Plane 对长任务只同步返回受理结果，状态通过 Query、SSE 或事件更新。
- 内部同步调用携带 Workload Identity、traceparent、request ID、Correlation ID。
- 传输 TLS/mTLS 与业务授权分别校验，TLS 不等于 Capability。
- 外部 Webhook 先验签、持久化、去重，再异步处理。
- 外部调用执行 Timeout、有限重试、Circuit Breaker；无 Idempotency 能力的副作用进入 UNKNOWN/RECONCILIATION，不虚构 Exactly Once。

Jenkins 首版继续是独立平台。用户手动触发和查看，研发平台不调用 Jenkins、不读取其状态、不把 Jenkins 作为 Gate。未来接入时新增稳定 CI Port/Adapter，不修改 Requirement 状态机。

## 11. Requirement、Workflow 与事件

### 11.1 Requirement 与 WorkItem

Requirement 类型为 feat、fix、refactor、chore。每个 Requirement 创建时必须选择一个初始 GitLab Project；首个 WorkItem 继承该仓库，后续 WorkItem 由其人类负责人选择一个仓库。

任务分支从 main 创建，格式为 type/wi-{全局递增号}-{semantic-slug}。main 禁止直接 Push，只能通过 MR 合并。

交付路径：

~~~text
task branch from main
→ Integration MR: task branch → dev
→ 独立 Jenkins 手工测试
→ Requirement Integration Baseline
→ 最终验收
→ Formal MR: task branch → main
→ 人工 Review
→ squash merge main
~~~

Requirement、WorkItem、Attempt、Build Execution 分别拥有状态机，不能把执行失败直接映射为业务失败。

Requirement 的 recordState 独立为 ACTIVE、ARCHIVED、DELETED。归档和逻辑删除都先安全终止相关非终态执行；恢复只恢复业务入口，不复活旧 Attempt。首版无物理清除和 Legal Hold 占位实现。

### 11.2 SDD 与 Human Gate

- feat 使用完整 SDD；
- fix 使用 Superpowers systematic-debugging、TDD、验证和代码评审，不重复完整 Product SDD；
- 首版使用 Superpowers Runtime Bundle，不接入 grill-me；
- Workflow 实际启用的任何 SDD 都必须经过 Human Gate。

Gate 统一建模为：

~~~text
GatePolicy
→ GateInstance(subject + version/hash)
→ Current Assignment
→ Decision
~~~

所有 Requirement 类型的 SDD 默认审核人为创建人，可以按资格异步改派。Artifact/Commit/headSha 改变后，旧 Decision 失效但历史保留。Agent 和系统管理员不能代签人工 Decision。

### 11.3 Temporal

Temporal 只编排 Workflow，不拥有 Requirement、Attempt、Gate、Artifact 或 Audit 事实。

首个 PCS Candidate：

- Temporal Helm Chart 1.6.0
- Server/Admin Tools 1.31.2
- UI 2.52.0
- Python SDK 1.30.0
- Frontend、History、Matching、System Worker 各 2 Replica
- Platform Orchestrator Worker 2 Replica
- numHistoryShards = 512
- Default Store 和 Visibility 使用同环境 CloudNativePG 中独立 temporal 与 temporal_visibility 数据库

Temporal Service 仅使用 ClusterIP；Internode 与 Frontend 使用 mTLS。SDK Client 除证书外还必须提交由 ServiceIdentityPort 签发、OpenBao Transit 保护的短期 Machine JWT，Authorizer 校验 Namespace read/write/worker/admin Claim；Sandbox 和普通用户不持有 Temporal Credential。

Runtime Role 只做 DML，Schema 由短生命周期 DDL Job 管理。Temporal History 只保存非敏感控制元数据，不保存源码、Prompt、Secret 或完整附件。Worker Build ID 绑定不可变应用镜像和 Workflow Code，活动 Workflow 不在发布中静默换版本。

### 11.4 NATS、Outbox 与 Inbox

NATS JetStream 每环境 3 节点、File Storage、Replicas=3。首发 NATS Server 2.14.4，Chart 2.14.2，精确镜像 Digest 在 PCS 冻结时锁定。

NATS Client 与 Route 全部使用 TLS。每个 Deployable Unit 使用独立 mTLS Certificate + NKey Identity，并以 Publish/Subscribe Subject Allowlist 最小授权；PLATFORM 与 SYS Account 隔离，Sandbox 不获得 NATS 网络或 Credential。

消息语义：

- Domain Transaction、Audit、Outbox 在同一个 PostgreSQL Transaction 提交；
- Relay 等待 JetStream Persist ACK 后才标记已发布；
- Consumer Inbox Unique Key 防止重复业务副作用；
- Commit 后才 AckSync；
- 传输为 At Least Once，业务效果通过 Inbox/Effect Ledger 实现幂等；
- 单条消息上限 256 KiB，大对象使用 Object Reference。

Event 使用 CloudEvents 1.0.2 Structured JSON；Command 使用平台 CommandEnvelope v1。Subject 为 platform.{command|event|dlq}.{domain}.{message}.v{major}。

首发 Stream：

| Stream | Retention | 时间 | MaxBytes | 满容量行为 |
| --- | --- | ---: | ---: | --- |
| PLATFORM_COMMANDS | WorkQueue | 未完成最多 7d | 1 GiB | DiscardNew |
| PLATFORM_EVENTS | Limits | 30d | 5 GiB | DiscardOld |
| PLATFORM_DLQ | Limits | 90d | 2 GiB | DiscardNew |

DLQ 不自动 Redrive；重放必须校验 Capability、Subject、Schema、目标 Consumer 和幂等 Request ID，并保留原消息关系。

NATS备份使用应用一致的Account Backup而不是三个PVC的独立CSI Snapshot。DEV与PROD每天`04:00 Asia/Shanghai`执行`nats account backup --consumers --check`，按Stream顺序保存PLATFORM Account的Stream、Message、Consumer配置与位置；Manifest记录各Stream开始/完成时间、Sequence范围、Message/Consumer数量、Checksum、NATS版本和对应PostgreSQL Outbox Watermark。前次任务未完成、空间不足、完整性失败或Stream配置正在变化时不得启动重叠备份。

备份经TLS上传到本环境独立`nats-backup`，启用Encryption、Versioning和覆盖Retention的`GOVERNANCE` Object Lock；DEV保留3天、PROD保留7天，已发布Outbox至少保留30天。恢复先用GitOps重建空的三节点Cluster，在隔离环境校验Stream配置、消息Sequence、Consumer位置、Schema和抽样Payload，再按Manifest Watermark从PostgreSQL Outbox以安全重叠窗补发并沿用原Envelope ID，由Inbox/Effect Ledger消除重复。DEV每月、PROD每季度执行完整恢复演练；Cluster DR目标为`RPO <= 5min`、`RTO <= 60min`，以演练实测为准，不把每日备份频率写成消息RPO，也不宣称Site DR。

## 12. Agent、Model、Sandbox 与 Image Build

### 12.1 Run、Attempt 与 Execution Binding

Run 表示业务执行目标，Attempt 表示一次具体执行。重试创建新 Attempt，不能覆盖旧记录。

Execution Binding 固化：

- Agent Definition
- Runtime Image Digest
- Superpowers Bundle Hash 与 Skill
- Model Deployment
- Tool、Context、Network 和 Secret Policy
- Resource Profile、Runtime Profile、PCS
- Repository、Branch、Commit
- Deadline、Retry 和等待策略

运行中的 Attempt 不得静默切换 Model、Skill、Runtime 或 Policy。

Attempt 主状态：

~~~text
CREATED → BINDING → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED
RUNNING → WAITING_INPUT → QUEUED
RUNNING → WAITING_CHILD → QUEUED
活动状态 → CANCELING → CANCELED
其他终态：FAILED | TIMED_OUT
~~~

WAITING_INPUT 默认等待 24 小时，保存 Checkpoint 后释放 Sandbox 和 Secret；用户回复后重新授权并排队。WAITING_CHILD 用于持久化 Parent/Child Handoff，首发 Child Type 为 IMAGE_BUILD。Parent 释放 1 Unit 后 Child 才能竞争完整 2 Unit Build Lease。

取消、超时、归档或删除必须经过 CANCELING，完成 Fence、Child 级联、Credential/Lease 撤销和结果固化后进入终态。

### 12.2 Model Gateway

首版接入阿里云百炼 compatible-mode。qwen、deepseek、kimi 等名称是 Model Deployment/alias，不写死在 Workflow。

Chat Model 与 Agent Execution Model 分开配置。联网搜索、深度思考是 Deployment Capability Metadata：

- UI 只在当前 Model 支持时显示开关；
- enable_search、thinking 等 Provider 私有字段由 Adapter 映射；
- Workflow 请求逻辑能力，不依赖 Provider 参数；
- Agent 搜索通过受控 Model Search Capability 或批准 Connector，不向 Sandbox 开放任意公网。

### 12.3 Kata Sandbox

Sandbox 使用专用 sandbox-worker Node Pool 与 Kata Containers：

- Kata Containers 4.0.x Stable，当前 Candidate 4.0.0；
- Rust runtime-rs；
- QEMU/KVM；
- containerd-shim-kata-v2；
- Guest RootFS 为只读 ext4 + dm-verity；
- RootFS Block Transport 为 virtio-blk-pci；
- Workload RootFS/Workspace 使用受控 virtio-fs；
- Runtime 失败不得回退到 runc、旧 Go Runtime、ACK runV 或普通容器。

普通 Agent 与 Image Builder 使用不同的不可变 Runtime Profile：

- runtime/agent-standard-v1
- runtime/image-build-v1

Sandbox Controller 是唯一 Materializer。用户和 Agent 不能选择 RuntimeClass、Node、Pod 数、SecurityContext、Mount、ServiceAccount 或资源规格。

sandbox-worker 使用在受控 Image Build Pipeline 中预烘焙的不可变 Node Image，Kata Shim、QEMU、Guest Kernel/RootFS、Firmware、virtiofsd、containerd Handler 和配置均锁入 PCS。正式节点禁止运行 kata-deploy 安装 DaemonSet，也禁止 Cloud-init、启动脚本、包管理器或人工 SSH 在 Join 后补装或替换 Runtime。

Node 加入可调度池前必须通过 KVM Provisioning Gate：验证 /dev/kvm、CPU Virtualization Flag、KVM Kernel Module、kata-runtime check、Guest 启停与清理、Node Reboot/Drain、RuntimeClass、Cilium、CSI、MTU、性能和隔离，并锁定精确 Provider SKU、Firmware/CPU、Node Image、Kernel 与 Kata/VMM Digest。任一检查失败时保持 Taint/不可调度，不能回退 runc。

普通 Sandbox 禁止 privileged、hostNetwork、hostPID、hostIPC、hostPath、Host Device、Docker/containerd/Kubelet Socket 和 Kubernetes ServiceAccount Token；默认非 Root、drop ALL、no new privileges、RuntimeDefault seccomp、只读 RootFS。仅平台签名 Tool Profile 可以引入经过 PCS 验证的最小例外。

### 12.4 Resource Profile 与 Capacity Ledger

| Profile | Capacity Unit | CPU Request/Limit | Memory Request/Limit | Ephemeral Request/Limit |
| --- | ---: | --- | --- | --- |
| resource/standard-v1 | 1 | 2 / 4 vCPU | 6 / 8 GiB | 30 / 50 GiB |
| resource/image-build-v1 | 2 | 4 / 8 vCPU | 12 / 16 GiB | 60 / 100 GiB |

DEV maxSandboxCapacityUnits = 5，PROD = 8；每环境最多 1 个 Active Image Build。Agent 和 Build 使用同一个带 Fencing Token 的 Capacity Ledger，不能分段获取 Unit 或先创建 Pod 再计数。

同一 sandbox-worker 故障后仍须在剩余节点证明 5/8 Unit 的任意批准组合可调度。N+1 保证容量，不保证内存态无中断迁移；旧执行先 Fence，再从 Checkpoint/Commit/Artifact 受控恢复。

### 12.5 Image Build 与供应链

Image Build 不在主 Agent Guest 中执行。Rootless BuildKit 运行在独立一次性 Kata Build Sandbox，通过 ImageBuildPort 创建 Child Execution。

首发 Registry 为 GitLab Container Registry。Image Identity 必须是 OCI Manifest/List Digest，Tag 只是可移动 Alias。Builder 只获得当前 Project/Repository 的短期最小 Pull/Push Scope。

Build 成功后：

1. 发布到 Quarantine Repository Path；
2. 生成 SBOM 和 Provenance；
3. Cosign 通过 ArtifactSignerPort 调用 OpenBao Transit 签名；
4. Trivy 按 Digest 扫描；
5. Image Security 状态进入 PENDING_SCAN → PASSED、BLOCKED、ERROR 或 EXPIRED。

Signature 不等于扫描通过，扫描通过不等于已批准部署。首版不自动部署、不触发 Jenkins、不移动 Release Tag。

不可绕过的 Image Security Floor 包括：Trust/Provenance 失败、Coverage 不完整、Embedded Secret、Base OS EOL、CISA KEV、任意 Critical Vulnerability。High 默认阻止且仅允许精确 Digest/Finding 的限时 Exception；其他 Floor 不接受 Exception。

## 13. Kubernetes、PCS、Network 与 PKI

### 13.1 PCS

PCS 是不可变的联合兼容集合，生命周期为：

~~~text
CANDIDATE → DEV_VALIDATED → PROD_APPROVED → ACTIVE → RETIRED
~~~

同一 Set ID 内容不可修改；Patch、安全更新或配置变化创建新 Set。PCS 冻结前重新核对官方支持矩阵、安全 Patch、Artifact Provenance、CRD Conversion 和全部镜像 Digest，冻结后不追随 latest。

首个 Candidate：

| 组件 | 目标版本 |
| --- | --- |
| Kubernetes | 1.36，当前 Patch Candidate v1.36.3 |
| Node OS | Ubuntu Server 24.04 LTS Minimal amd64，当前 24.04.4 |
| containerd | 2.3 LTS，当前 2.3.1，CRI v1、config v4、cgroup v2 |
| Kata | 4.0.x，当前 4.0.0 |
| Cilium | 1.20.x，当前 1.20.0 |
| Gateway API | v1.6.x Standard，当前 CRD v1.6.1 |
| cert-manager | 1.21.x，当前 v1.21.1 |
| CloudNativePG | 1.30.x，当前 1.30.0 |
| PostgreSQL | 18，当前 18.4 |
| PgBouncer | 当前 1.25.2 |

Patch Candidate 是冻结时需再次核验的版本，不是自动更新规则。

### 13.2 Node Role 与拓扑

每个环境包含四类固定 Node Role：

- k8s-control-plane
- platform-worker
- sandbox-worker
- storage-worker

Role 由 GitOps、Label、Taint、Affinity、RuntimeClass 和 Admission 共同保护，不能在线改 Label 把节点直接转换角色。

每环境当前为 Single-Zone，所有 ECS Node 加入同一 High Availability、host、Affinity=1 的 Deployment Set，证明不同 Node 对应不同物理 Host。该拓扑只承诺 Cluster HA，不承诺 Zone/Site DR。

全部 Node 使用无 Swap 基线；不启用 LimitedSwap，也不使用 failSwapOn=false 容忍漂移。内存压力通过 Reserved、Request/Limit、Priority、Eviction、OOM、告警和扩容处理。

### 13.3 Kubernetes Control Plane

DEV 与 PROD 都使用：

- 3 个专用 Control Plane Node；
- Stacked etcd，每 Node 一个 Voting Member；
- Quorum = 2；
- Cluster 外、Provider-managed、Private-only L4 Kubernetes API Endpoint；
- Alibaba 当前 Mapping 为 internal-facing NLB TCP 6443 透传；
- kube-apiserver 终止 TLS，NLB 不持有 API Private Key；
- etcd 2379/2380 不经过 NLB；
- 普通 kubeconfig、Join、Controller 和恢复流程统一使用 HA Endpoint。

API NLB 属于 External Provider/IaC，不能由尚未存在的 Kubernetes Service 创建。每环境一个独立 NLB；业务 Edge、WAF、platform-gateway 和 Kubernetes API NLB 不能复用。

### 13.4 Cilium 与 Gateway

Cilium 使用：

- 完整 eBPF kube-proxy replacement；
- cluster-pool IPAM；
- IPv4；
- VXLAN Tunnel，Node Underlay UDP 8472；
- 跨 Node Pod 流量 WireGuard，UDP 51871；
- socketLB.hostNamespaceOnly=true 以兼容 Kata；
- 独立 cilium-envoy DaemonSet；
- Hubble，每环境 2 Relay + UI；
- Namespace 双向 Default Deny。

Sandbox 默认不能访问 PostgreSQL、NATS、OpenBao、Kubernetes API、Node Metadata、其他 Sandbox 或任意公网。允许 GitLab、Model Gateway、依赖源和搜索时，使用 ServiceAccount/Namespace/稳定 Label、FQDN/CIDR Allowlist 和 Connector。

Northbound 使用标准 Gateway API，由 Cilium Gateway Controller 提供 Data Plane，不额外部署 Envoy Gateway 或 ingress-nginx。当前使用 IP；未来切域名只修改 Listener、Certificate、DNS/Edge Mapping，不修改业务 Route 或领域代码。

platform-gateway 当前 Edge Trust Mode 为 DIRECT_OR_L4_TRANSPARENT：外部 LB 若存在只做 L4 TLS 字节透传，TLS 在 platform-gateway 终止。Gateway 不信任客户端提交的 Forwarded 或 X-Forwarded-For，除非未来经过新 Provider Mapping 明确验证 trusted hops。

### 13.5 Stateful Storage

PostgreSQL、Valkey、NATS、OpenBao、Scanner Signature以及Prometheus、Alertmanager、Loki WAL、Tempo恢复卷和OpenTelemetry Gateway Queue统一依赖逻辑StorageClass Contract `stateful-rwo-lowlatency`。它提供低延迟、加密、可观测、可在线扩容且拓扑感知的独占Block Storage，固定使用`ReadWriteOnce`、`volumeBindingMode=WaitForFirstConsumer`、`reclaimPolicy=Retain`和`allowVolumeExpansion=true`；每个Stateful Replica独占一个Volume，禁止Multi-Attach/RWX、共享数据目录、Root Filesystem、非受控`hostPath`或隐式落入Ceph RBD/CephFS。

当前Alibaba Cloud Mapping使用经PCS验证的ESSD CSI，以及DEV/PROD各自独立、只用于本环境Stateful Volume的`Aliyun_AES_256` Customer-managed Key。该CMK不得跨环境或与Node OS、Ceph、Object/Backup、OpenBao Seal等用途复用，并启用Deletion Protection；普通Cloud Identity、Kubernetes Workload、平台Super Admin和应用均无权Disable、Schedule Deletion或修改Key Policy。CSI解析到错误环境Key、Key不可用或Provider返回未加密Volume时Provision/Ready Gate必须Fail Closed，不得回退默认Service Key、Local PV、Ceph、NAS或未加密云盘。

Node故障后的Volume重挂必须先证明旧Node/Pod已经停止写入并完成安全Detach/Fence；状态不确定、旧Writer仍可能存在或Volume Health不明时禁止Force Attach和双写。CSI Snapshot只可作为经组件验证的维护检查点，不能替代PostgreSQL PITR、NATS Account Backup、OpenBao Raft Snapshot等应用一致性备份。

Provider Mapping变化只影响新建Volume，不会隐式迁移既有PV。迁移Storage Backend或更换CMK必须创建新PCS与Capacity Profile，通过应用复制、Backup/Restore或加密Snapshot/Copy创建目标Volume，完成一致性/Checksum、Cutover和回退验证后再退役旧Volume；禁止直接修改默认StorageClass、Key ID或Helm值把现有Stateful Workload整批隐式迁移。

### 13.6 PKI 与 Secret 加密

内部 PKI：

- 离线 Organization Root CA：ECDSA P-384 / SHA-384，默认 10 年；
- DEV/PROD 各自独立 Online Intermediate：ECDSA P-256，默认 3 年；
- 叶子证书 ECDSA P-256；
- OpenBao PKI + cert-manager 签发和轮换；
- Root Private Key 永不进入 OpenBao、Kubernetes、Git、Server 或平台数据库；
- TrustBundlePort 分发公开 Root Bundle；
- Gateway 叶子证书默认 30 天，到期前 10 天轮换，rotationPolicy=Always。

每环境OpenBao PKI同时发布完整CRL和内置OCSP：完整CRL默认24小时、自动重建且Grace Period为6小时，OCSP Response默认4小时，首版不开Delta CRL。紧急吊销在记录Revocation后必须立即触发并验证CRL Rotate；Certificate、CRL和OCSP的Signature、Issuer、有效期与Serial状态持续探测，状态过期、签名不匹配或发布内容不一致时告警，依赖在线吊销状态的受控Workload/mTLS Client必须Fail Closed。

Intermediate轮换后，旧Issuer立即移除签发用途，只保留`read-only,crl-signing,ocsp-signing`以服务历史叶子证书；只有其全部叶子证书过期、CRL/OCSP缓存窗和安全缓冲结束且证明无消费者后才能退役。每环境独立部署2个跨Node分散的只读`pki-publication` Adapter，只代理获批的Issuer Certificate、完整CRL与OCSP Endpoint，不持有OpenBao Token、Private Key或签发/吊销权限；Gateway仅为精确批准的PKI状态Path开放必要Method，其他OpenBao API不暴露。

TrustBundlePort的权威Root Bundle是GitOps管理、带Digest与Review Evidence的独立Artifact，只包含批准的Organization Root Trust Anchor；Intermediate、Leaf和Private Key不得进入。Workload通过只读投影挂载，Node/Server通过版本化Node Image/Bootstrap Adapter安装，员工终端通过独立可信渠道核对Fingerprint。Root轮换先让Bundle同时包含新旧Root并完成DEV、Workload、Node和终端分发验证，再切换新Intermediate/Leaf Chain；旧Root仅在全部依赖Chain、缓存和安全缓冲结束后移除，不能覆盖后立即拆除旧信任路径。

Kubernetes API Data-at-rest Encryption 使用每环境本地 secretbox EncryptionConfiguration，不增加在线外部 KMS 依赖：

- 加密 secrets、configmaps 和明确敏感 CRD；Sensitive API Resource Catalog 只使用小写复数 resource 或 resource.group 精确标识，不使用 Kind、API Version、模糊名或全资源 Wildcard；
- 每环境独立 CSPRNG 32-byte raw key；
- 三个 API Server 使用相同有序 Keyring 和配置 Hash；
- 全新 Cluster 从首个对象起完全不配置 identity；既有未加密存量仅可在受审计迁移窗把 identity 作为最后一个临时 Read Fallback，永不位于首位；
- 轮换第一阶段把新 Key 放在同一 secretbox.keys 数组第二位作为 Read Candidate，旧 Key 仍为首位 Writer；全部 Backend兼容后，第二阶段把新 Key提升首位 Writer；首版不启用自动 Reload，每次原子替换文件并逐个 Drain、重启和验证 API Backend；
- 新 Key成为 Writer后，按 Catalog逐 Resource执行幂等全量 Rewrite，再验证 API读取、逐 Backend Canary写入、对象数量和 Raw etcd的 k8s:enc:secretbox:v1:{keyName}: Envelope前缀；
- kube-apiserver Pre-start Gate 必须校验 encryption-provider-config Flag、apiserver.config.k8s.io/v1 Schema、文件/权限、Catalog、Config Hash 和 Key Generation；失败时不启动、不加入 NLB，不能只依赖 readyz；
- Snapshot 与 Recovery Bundle 精确绑定 Encryption Configuration Hash、Key Generation 和完整历史 Keyring；
- 恢复时先把 Keyring/Configuration 放到所有 Control Plane Host，再允许 API Server 接触 restored etcd；
- 未来只允许迁移到 Kubernetes KMS v2，不引入 KMS v1。

## 14. 数据、缓存、Secret 与对象存储

### 14.1 PostgreSQL

每环境采用 CloudNativePG：

- 1 Primary + 2 Standby；
- Quorum-based Synchronous Replication：method=any、number=1、dataDurability=required、failoverQuorum=true；
- 两个 Standby 都不可用时，不能自动降级异步写入；
- 自动 Failover 必须证明候选包含全部已确认事务；
- 业务流量通过 2 个 PgBouncer Transaction Pooling Pod；
- Alembic、DDL、DBA 和 Break-glass 才能直连 rw Service；
- max_connections 首年 100，所有连接池有界。

数据卷使用低延迟、加密、RWO SSD；不使用 Ceph RBD。备份通过 Barman Cloud Plugin 0.13.0、WAL Archive 和 S3-compatible Bucket：

- archive_timeout = 5min；
- 每日 Physical Base Backup；
- PROD Recovery Window 30d，DEV 7d；
- LZ4；
- PROD Cluster DR Candidate：RPO ≤ 5min、PGDATA ≤ 50 GiB 时 RTO ≤ 60min；
- DEV 每月、PROD 每季度恢复演练。

### 14.2 Valkey

首发 Valkey 9.1.1-trixie：

- 1 Primary + 2 Replica；
- 3 Sentinel，quorum=2；
- TLS/mTLS + ACL，default User 关闭；
- noeviction；
- AOF everysec + 周期 RDB；
- 只保存可重建热数据、Session 热索引、限流、幂等和短期锁；
- PostgreSQL 保留 Session、安全和业务权威事实；
- 安全/一致性操作在 Cache 不可用时回源或 Fail Closed。

业务只使用 CachePort 和 Sentinel-aware Client，不写死 Primary 地址或供应商配置。

### 14.3 OpenBao

首发 OpenBao Server 2.6.1、Chart 0.28.6，使用 Integrated Storage Raft：

| 环境 | Voting Server | Quorum |
| --- | ---: | ---: |
| DEV | 3 | 2 |
| PROD | 5 | 3 |

当前无独立 Seal KMS/HSM，使用每环境独立 Shamir 5 Share / Threshold 3。全部 Share 目前可由同一保管人按正式介质流程暂管，但这是临时治理例外，不宣称多人制衡。Share 不进入 Git、Kubernetes、OpenBao、数据库、日志或即时通信。

Workload 使用 Kubernetes Auth、短期 Token 和 Agent Injector。Secret 只写入 Pod tmpfs 内存文件，不进入环境变量、镜像、Prompt、Artifact 或持久磁盘。首版数据库凭据为静态、按服务/用途隔离的最小权限账号，未来可在 SecretManagerPort 后切换动态凭据，无需修改业务模块。

OpenBao 使用两个 file Audit Device：独立 Audit PVC 和 stdout；两个都不可写时 Secret 请求 Fail Closed。长期权威 Audit 进入 audit-worm，默认 365d COMPLIANCE Object Lock。

OpenBao只使用在线原子的`bao operator raft snapshot save`作为正式备份，不把多个Raft PVC/CSI Snapshot当作一致性恢复源。PROD默认每小时Snapshot、小时点保留48小时、每日点保留30天；DEV默认每6小时Snapshot并保留7天。升级、Seal Migration、`rotate-keys`及高风险Auth/Policy/Secret Engine变更前必须额外创建并验证按需Snapshot。

每个Snapshot使用唯一对象名，Manifest至少绑定Environment、Cluster ID、Snapshot Time、OpenBao/Artifact版本、Raft Index、Seal Generation、Object Version、Size和SHA-256。Snapshot在上传前使用本环境离线OpenPGP Public Key客户端加密，只进入独立`openbao-recovery`并启用TLS、Versioning和默认7天`GOVERNANCE` Object Lock，不依赖待恢复的OpenBao Transit/SSE-S3。Shamir轮换后立即生成并验证新Snapshot；仍有保留Snapshot依赖的旧Share Generation必须保存到最后一个相关Snapshot到期且恢复验证通过。

DEV每月、PROD每季度在网络隔离的临时Cluster执行完整恢复：使用Manifest记录的版本与匹配Shamir Generation恢复并验证Raft Index、Auth、Policy、Secret Engine、抽样Secret及Token/Lease行为，再扩展到DEV 3/PROD 5个Voting Server。`snapshot-force`会绕过Seal一致性并替换整库状态，只允许审批后的Break-glass身份人工执行，不授予Backup Job或普通运维。PROD Cluster DR目标为`RPO <= 1h`、`RTO <= 60min`，DEV为`RPO <= 6h`、`RTO <= 60min`，均以对象存储和3份匹配Share可取得且演练实测为准，不宣称Site DR。

### 14.4 Object Storage

首发采用 Rook-Ceph RGW：

- Rook v1.20.2；
- Ceph Tentacle v20.2.2；
- 仅承载 S3-compatible RGW，不作为 PostgreSQL、Valkey、NATS、OpenBao 的通用 RBD/CephFS；
- DEV 3 个 storage-worker/OSD，PROD 4 个；
- 每 OSD 1 TiB 企业级 PLP SSD；
- Pool size=3、min_size=2、failureDomain=host；
- 3 MON、2 MGR、2 RGW；
- Cluster 平均或任一 OSD 50% 即启动扩容；nearfull/backfillfull/full = 70%/75%/80%。

每个`storage-worker`的OS/MON SSD与独占Raw OSD必须物理分离，一块Raw Device只对应一个OSD。每个Host-based OSD从首次Provision起启用Ceph原生dm-crypt/LUKS，即Rook `encryptedDevice: "true"`；禁止明文上线后宣称可以原地补加密，既有未加密OSD只能通过逐OSD替换、Backfill、健康检查和故障回退迁移。

Host-based OSD的`dmcrypt_key`、Lockbox和CephX解锁链由`ceph-volume`与Ceph MON管理，不属于PVC-backed OSD的外部KMS路径，也不得描述为OpenBao托管OSD Key。承载MON数据和Ceph密钥材料的OS/MON存储同样必须静态加密，自动解锁与恢复材料不能只保存在同一Node或Disk。Go-live前生成受控加密的离线Ceph Recovery Bundle，包含恢复所需的MON/Cluster Metadata、CephX/Lockbox与相关Kubernetes Secret，并完成Node重启、单盘替换、MON Quorum及密钥恢复演练；明文材料不得进入Git、日志、平台数据库、普通ConfigMap或即时通信。

逻辑 Bucket Class：

- requirement-attachments
- agent-artifacts
- audit-worm
- postgres-backup
- nats-backup
- openbao-recovery
- observability-logs
- observability-traces

每类使用独立 Credential、Policy、Versioning、Encryption、Retention 和 Capacity Ledger。Prefix 不能替代 Bucket 级隔离。

首个Environment Capacity Profile的逻辑Operating Quota为：

| Bucket Class | DEV | PROD |
| --- | ---: | ---: |
| requirement-attachments | 16 GiB | 24 GiB |
| agent-artifacts | 48 GiB | 56 GiB |
| audit-worm | 64 GiB | 96 GiB |
| postgres-backup | 72 GiB | 128 GiB |
| nats-backup | 40 GiB | 80 GiB |
| openbao-recovery | 8 GiB | 16 GiB |
| observability-logs | 150 GiB | 150 GiB |
| observability-traces | 50 GiB | 50 GiB |
| **合计** | **448 GiB** | **600 GiB** |

Quota合计必须保持在三副本下50% Raw Planning Boundary内：DEV未分配Reserve为64 GiB，PROD约82.7 GiB。Reserve优先覆盖Metadata、历史Version、Multipart、GC延迟、OSD倾斜与Recovery/Backfill；其中只为`audit-worm`保留DEV 16 GiB、PROD 32 GiB Emergency Margin，使其RGW后备Ceiling分别为80/128 GiB，其他Class不得借用Audit Margin或基础设施Reserve。

Logical Class Usage必须聚合同类全部物理Bucket与Object Version、Lock、Delete Marker、Multipart及GC/Metadata估算；同一Class的物理Bucket必须划分互斥Quota，不能每个Bucket重复获得整份Class额度。Operating Quota使用率70%/85%分别告警/Critical，并与30天预测、Cluster平均和最满OSD的50% Raw Gate取更危险结果；额度与阈值属于GITOPS_CONFIG/Capacity Profile，管理后台只读。

Object Retention Reconciler只清理`audit-worm`、`postgres-backup`、`nats-backup`和`openbao-recovery`中超过权威保留期的精确Object Version。只有Object Lock到期、没有Legal Hold/调查/恢复/业务引用，并且Backup仍存在满足Recovery Window和恢复链的更新有效副本时才可删除；判定、拒绝、删除和失败全部Audit，Identity不具备Retention Bypass或跨Bucket通配删除。Requirement Attachment与Agent Artifact的归档/逻辑删除不释放容量，Loki/Tempo对象继续由各自Backend Retention清理。

audit-worm 默认使用 365d COMPLIANCE Object Lock；PostgreSQL、NATS、OpenBao Backup 默认使用覆盖恢复窗口且不少于既定基线的 GOVERNANCE Lock；普通 Attachment/Agent Artifact 默认 Versioning，只有绑定正式 Decision、验收、Merge 或发布证据的关键 Artifact Version 才进入 GOVERNANCE Lock。

除 openbao-recovery 外，普通 Bucket 首版使用由 RGW执行的 SSE-S3，当前 Provider Mapping由每环境独立 OpenBao Transit提供不可导出 Key，并必须通过 Vault-compatible DEV Compatibility Gate。RGW或 OpenBao不可用时加密对象读写 Fail Closed，禁止回退明文。

openbao-recovery 明确排除同源 Transit依赖，使用每环境独立的离线 OpenPGP Recovery Key进行客户端加密；Public Key/Fingerprint可由 GitOps只读分发，Private Key和 Passphrase永不进入 OpenBao、Ceph、Kubernetes、数据库或在线 Secret。

Control Plane 的 kubernetes-etcd-backup 权威 Repository 位于目标 Kubernetes Cluster/Rook-Ceph 之外，不是第九个 RGW Bucket。

完整恢复顺序固定为：先从 Cluster外 etcd Snapshot + Recovery Bundle恢复 Control Plane、etcd、HA API和核心控制循环；再恢复可读取 Recovery Bucket密文的 RGW基础；随后离线提供 OpenPGP Private Key恢复 OpenBao；恢复 Transit/SSE解密能力后，最后恢复 PostgreSQL、NATS、Artifact和其他依赖 SSE-S3的数据。禁止让 OpenBao恢复依赖其自身尚未恢复的 Transit Key。

### 14.5 Artifact 与文件安全

用户附件默认：

- 单文件 50 MiB；
- 单 Requirement 200 MiB；
- 80% 预警；
- 后端授权后签发默认 5 分钟 Presigned Upload/Download；
- PostgreSQL 同时预占产品配额和 Environment Bucket-Class 配额；
- 只有 AVAILABLE Artifact 可下载或进入 Gate。

Agent Artifact 默认：

- 单 Object 100 MiB；
- 单 Attempt 500 MiB；
- 单 Requirement 1 GiB；
- 超额时 Attempt 安全失败为 RESOURCE_EXHAUSTED / ARTIFACT_QUOTA，不静默截断。

文件扫描采用 ClamAV 1.5.3，通过 FileSecurityPort 接入。每环境 2 个 Scanner Replica，完整健康时总并发 4。Scanner Envelope：

- 单对象最大 100 MiB；
- MaxScanSize 400 MiB；
- MaxRecursion 17；
- MaxFiles 10000；
- MaxScanTime 120s。

达到扫描限制、加密内容不可检查、签名过期、引擎错误或 Coverage 不完整都 Fail Closed。Verdict 归一化为 CLEAN、MALICIOUS、SUSPICIOUS、ERROR；只有 CLEAN 转 AVAILABLE。

## 15. Observability 与平台运维视图

### 15.1 标准与事实边界

应用使用 OpenTelemetry SDK、OTLP、W3C Trace Context 和 request/run/requirement/attempt Correlation ID。Metric、普通 Log、Trace 和 Hubble Event 是诊断数据，不是 Requirement、Attempt、Audit 或 Artifact 事实源。

非 OTel 原生组件通过 Prometheus Exporter、ServiceMonitor、原生日志和受控 Adapter 接入，不能宣称所有基础设施原生使用 OTel。

Trace 与结构化 Log 通过 OTLP，应用 Metric 通过进程内 Prometheus Exporter抓取，避免双写同一 Series。首版 Trace 采集率 100%，关闭 Tail Sampling、Span Metrics 和 Tempo Metrics Generator。Authorization、Cookie、Password、Token、Presigned Query、Prompt、源码、附件、SQL Bind Value 和未经批准的 Payload 不得进入 Label、Log 或 Span Attribute；高基数 Correlation ID 不作为 Prometheus/Loki Index Label。

### 15.2 首个精简正式组件组

| 能力 | 首发拓扑 |
| --- | --- |
| Metrics | 2 Prometheus，各 50 GiB RWO、30d |
| Metrics Query | 2 Thanos Sidecar + 2 Thanos Query，无 Thanos Object Store |
| Alert | 3 Alertmanager，各 5 GiB RWO |
| Console | 2 Grafana，共用 CloudNativePG grafana 数据库 |
| Log | 3 Loki Monolithic，replication_factor=3，各 10 GiB WAL |
| Log Gateway | 2 Loki Gateway |
| Trace | 1 Tempo 3.0.2 Monolithic target=all，10 GiB 恢复卷，7d |
| Collection | 每 Node 1 OTel Agent，2 OTel Gateway，各 10 GiB 持久 Queue |
| Network | Hubble Agent、每环境 2 Relay、Hubble UI |

首个 PCS Candidate 组件版本：

- kube-prometheus-stack 88.1.5
- Prometheus Operator 0.93.0
- Prometheus 3.13.2-distroless
- Alertmanager 0.33.1
- Grafana 13.1.2 / Chart 12.10.3
- Thanos 0.42.4
- Loki 3.7.5 / Chart 18.7.3
- OTel Collector Chart 0.168.0 / Operand 0.157.0
- Tempo 3.0.2

Tempo Monolithic 只有 1 Replica，不能通过复制不受支持的 target=all Pod 冒充 HA。Tempo 故障时两份 OTel Gateway 持久 Queue 提供目标 4 小时有界缓冲；时间或容量先耗尽后允许丢诊断 Trace，但必须计数、告警并显示 Gap。

首版不部署 Mimir、Kafka、Thanos Object Store 或全分布式 Loki/Tempo。达到明确容量、查询或 HA 触发器后，通过新 PCS、Dual Write/Read、Query Parity、Retention/Backfill 和回退验证迁移。

PrometheusRule + Alertmanager 是唯一告警计算与通知状态事实源，Grafana Managed Alerting 关闭。普通 Loki Log 默认保留 14d，Security/OpenBao Audit 热查和关键访问 Log 默认 30d，Hubble Deny/异常 Drop 默认 7d；这些热查副本不替代 Audit WORM。

Loki Tenant Header只是路由选择器，不是认证。所有入口必须删除客户端 X-Scope-OrgID、Auth Proxy和身份 Header，再由受信 Loki Gateway/OTel Gateway依据当前环境 mTLS Service Identity注入固定 Tenant；NetworkPolicy禁止绕过 Gateway直连 Loki。Tempo首版固定 multitenancy_enabled=false，不接受或解释客户端 Tenant Header，环境隔离由独立 Cluster、Workload Identity和 NetworkPolicy实现。

### 15.3 管理后台与 Console

平台管理后台提供：

~~~text
全局概览
→ 组件详情
→ 实例 / 告警 / Gap / Drift / Runbook
~~~

覆盖 Kubernetes、PostgreSQL、Valkey、NATS、Temporal、OpenBao、Ceph/RGW、Prometheus/Thanos、Alertmanager、OTel、Loki、Tempo、Grafana、Hubble、Agent/Sandbox、Model、GitLab 和 External Provider。

业务级 PLATFORM_POLICY 仅 Super Admin 可受控发布。GITOPS_CONFIG、PCS、Node、Replica、Ceph Fullness、OpenBao Seal、资源和基础设施阈值在后台只读，Super Admin 也不能直接修改。

Grafana、Hubble、Temporal、OpenBao 和 Provider Console 从当前环境平台管理后台授权后在新标签页打开，不使用 iframe。每次访问先校验本地 Session、Capability 和 Scope；浏览器不获得 Data Source、Kubernetes、Cloud、OpenBao 或 Provider Admin Credential。

### 15.4 安全公告

首版消息通过 API 拉取。安全公告 Source Adapter 仅访问批准的 CISA KEV、NVD API 2.0、OSV API，不抓任意 HTML。

默认每周日 02:00 Asia/Shanghai 增量采集，每周一 07:00 自动发布。数据源部分失败时标注 Coverage；全部失败时不发布空公告，保留上一期并告警。可见性由 Capability + Scope 决定，不硬编码管理员或 Leader 角色。

## 16. Security 与 Audit

### 16.1 Security Floor

- Capability、Scope、Membership、Assignment 和资源 Guard 必须服务端校验。
- Human Gate 不得由 Agent 或自动任务代签。
- main 保护分支禁止直接 Push。
- Secret 不进入 Git、镜像、环境变量、Prompt、日志、Artifact 或普通配置。
- Sandbox 默认拒绝网络、Host、Kubernetes 和其他 Sandbox 访问。
- 未验证组件、Runtime、Node、Artifact、Image、Provider Envelope 或配置 Fail Closed。
- Infrastructure Desired State 只能由 GitOps/IaC 改变。
- DEV 与 PROD 的账号、VPC、Cluster、Credential、Key、数据和运行状态隔离。

### 16.2 Audit

Audit 是独立追加式事实，记录 Actor/Workload Identity、时间、动作、对象、结果、原因、版本和前后摘要。它不是 Requirement 删除表、Debug Log 或 Observability Log。

必须审计 Identity、Organization、Workspace、Capability、Assignment、Policy、Gate、MR、Attempt、Build、Secret、归档、恢复、逻辑删除、DLQ、Provider Feed 和 Break-glass。

Audit 不保存明文密码、TOTP Secret、Token、Private Key、完整 Presigned URL、Prompt/代码正文或 Secret Value。平台 Audit 与 OpenBao/Provider/Kubernetes Audit 保持独立，通过 Request ID、Trace 和 Actor Context 关联。

## 17. Cluster HA、备份与灾难恢复

首版边界为同站点 Cluster HA 与 Cluster DR，不宣称 Zone、Region、Account 或 Site DR。DEV 不是 PROD Standby。

### 17.1 Control Plane DR

权威恢复链：

- Cluster 外 kubernetes-etcd-backup Repository；
- 原生 etcdctl Snapshot；
- 客户端 OpenPGP 加密；
- 独立 Control Plane Recovery Bundle；
- Snapshot Manifest 精确绑定 Bundle、PCS、Endpoint/SAN、Encryption Configuration 和完整 secretbox Keyring；
- Snapshot 与 Recovery Bundle 使用不同物理 Bucket、Identity 和 Policy；
- Restore Reader 与 Writer 分离；
- 恢复后逐 Backend 直连验证，验证通过才加入 NLB。

默认：

| 环境 | Snapshot | Retention | RPO | RTO |
| --- | --- | --- | --- | --- |
| DEV | 每 3h | 7d | ≤ 6h | ≤ 120min |
| PROD | 每 30min | 周期 48h、每日 30d | ≤ 1h | ≤ 120min |

两环境默认 7d GOVERNANCE Object Lock。DEV 每月、PROD 每季度完整 Restore Drill。

### 17.2 组件 DR

| 组件 | 权威恢复方式 |
| --- | --- |
| PostgreSQL | Barman Base Backup + WAL/PITR |
| NATS | Account Backup + PostgreSQL Outbox 对账补发 |
| OpenBao | Raft Snapshot + 匹配 Shamir Generation |
| Ceph/RGW | 同站点三副本与组件恢复；不等于 Site DR |
| Grafana | CloudNativePG + GitOps Provisioning |
| Loki/Tempo | RGW 对象和当前 Retention；诊断数据无业务 RPO |
| Valkey | 可选 PVC 快速恢复，否则从 PostgreSQL/领域事实重建 |

平台管理后台展示 Backup Verified、Restore Verified、RPO Gap、实测 RTO、Object Lock、容量和 Runbook，但不提供 Snapshot 下载、Private Key、Reader Credential 或 Restore 写操作。

### 17.3 独立演进路径

以下变化只能替换 Adapter、Binding、PCS、Capacity Profile 和迁移流程，不应重写领域模块：

- 模块化单体 → 独立微服务；
- PostgreSQL → 云托管 PostgreSQL 或模块独立数据库；
- Valkey Sentinel → Valkey Cluster 或云 Redis-compatible；
- NATS JetStream → 其他 Event Bus；
- OpenBao → 托管 Secret Manager；
- Rook-Ceph RGW → 云 S3-compatible；
- 精简 Observability → 分布式 Observability；
- Sandbox Node Pool → 独立 Sandbox Cluster；
- Cluster DR → Site DR。

## 18. Environment Capacity Profile 与 TCO

### 18.1 首个 Capacity Candidate

| 环境 | Node Role | 数量 | 单 Node CPU / RAM | 单 Node 磁盘 |
| --- | --- | ---: | --- | --- |
| DEV | k8s-control-plane | 3 | 2 vCPU / 4 GiB | 100 GiB OS/etcd |
| DEV | platform-worker | 4 | 8 vCPU / 32 GiB | 100 GiB OS/Runtime |
| DEV | sandbox-worker | 2 | Alibaba Fallback：64 vCPU / 192 GiB | 100 GiB OS + 500 GiB Runtime |
| DEV | storage-worker | 3 | 至少 8 vCPU / 32 GiB | 256 GiB OS/MON + 1 TiB OSD |
| PROD | k8s-control-plane | 3 | 4 vCPU / 8 GiB | 100 GiB OS/etcd |
| PROD | platform-worker | 6 | 8 vCPU / 32 GiB | 200 GiB OS/Runtime |
| PROD | sandbox-worker | 2 | Alibaba Fallback：64 vCPU / 192 GiB | 100 GiB OS + 800 GiB Runtime |
| PROD | storage-worker | 4 | 至少 8 vCPU / 32 GiB | 256 GiB OS/MON + 1 TiB OSD |

当前只采购和部署 DEV，共 12 Node；未来 PROD 为独立 15 Node。27 只是两环境未来同时存在的算术合计。

Alibaba EBM 只是 Region/Zone 未确定时用于证明 KVM 可用性的保守 Fallback，不是架构硬下限，也不是基于 30 DAU 推导的工作负载需求。若目标 Region/Zone 有正式 GA、可购、明确支持 Nested Virtualization 且通过实机 PCS 的更小 ECS，必须使用 Effective SKU 重新计算 Capacity 和 TCO。

在 EBM Fallback 下，DEV 派生至少 190 vCPU / 620 GiB，PROD 至少 220 vCPU / 728 GiB；这些数值不是跨云常量。具体 SKU 未经 Allocatable、调度碎片、KVM、PDB、RWO Topology、N+1、I/O、Rollout 和故障演练不能标记 VALIDATED/ACTIVE。

### 18.2 存储 BOM

| 环境 | Node 系统盘 | Sandbox Runtime | Ceph Raw OSD | Active ESSD PVC | Nominal 合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV | 1,668 GiB | 1,000 GiB | 3,072 GiB | 28 卷 / 425 GiB | 6,165 GiB |
| PROD | 2,724 GiB | 1,600 GiB | 4,096 GiB | 32 卷 / 675 GiB | 9,095 GiB |

去重规则：

- Ceph Bucket Quota、Loki/Tempo Object、Audit Margin 已位于 Raw OSD 内，不再次计费；
- Loki/Tempo 本地 WAL/Queue PVC 与对象数据职责不同，分别计费；
- PostgreSQL/NATS/OpenBao 在线 PVC 与 RGW Backup 是两份真实存储，均计费；
- Temporal 和 Grafana 数据已计入 PostgreSQL，不增加独立数据库；
- Cluster 外 etcd Repository、NLB、KMS、NAT/EIP、Egress、Watchdog、Collector 和 Restore Drill 临时资源单列。

### 18.3 TCO Contract

当前 Region/Zone 为 UNASSIGNED，因此只确认资源 BOM 和计费项，不编造精确月费。

Environment TCO Snapshot 独立于 PCS/Capacity Digest，至少引用：

- CloudEnvironmentBinding、PCS、Capacity Profile；
- 报价时间和有效期；
- Region/Zone；
- 精确 SKU、磁盘类别和性能等级；
- 包年包月/按量、期限；
- NLB、KMS、外部 Backup、NAT/EIP、Egress；
- 流量假设、币种、税费和折扣。

先计算当前 DEV；未来 PROD 单独报价，再按需汇总。

## 19. 验证与架构守则

任何实现或组件替换至少验证：

- 模块依赖和数据所有权；
- OpenAPI、Event Schema、Port Contract 与 Provider Adapter；
- Capability、Scope、Assignment 和 Human Gate；
- Outbox/Inbox、Idempotency、Replay、Unknown Result 和 Reconciliation；
- PCS Compatibility Matrix、CRD Conversion、Upgrade、Rollback/Forward-fix；
- Node/Pod/Host 单故障、Quorum、PDB、Topology 和 Rollout Headroom；
- Kata/KVM、RuntimeClass、NetworkPolicy、MTU、Resource Limit、清理和 Fence；
- Backup、PITR、Restore Drill、RPO/RTO；
- Secret 不落盘、不入日志和最小权限；
- External Provider Envelope Signature、Sequence、Freshness、Watchdog 独立性；
- Observability Partial/Gap、Alert Delivery 和只读 Console；
- DEV 与 PROD 不共享运行资源或信任材料。

禁止事项：

- 在业务代码中写死 Provider Resource ID、Pod、Node、Primary 地址或具体 RuntimeClass；
- 跨模块直读表或共享 ORM Model；
- 把 Redis、NATS、Temporal、Loki、Tempo 或本地磁盘作为业务事实源；
- 用 Frontend 菜单、JWT Claim、岗位字符串或 Assignment 替代服务端授权；
- 用 latest、浮动 Tag、自动 Patch 或未锁定镜像进入正式环境；
- 在平台后台提供 Cloud、Kubernetes、Ceph、OpenBao 或 GitOps Admin 写能力；
- 把 DEV/PROD 的同源架构误写成共享实例；
- 把 EBM Fallback、Candidate Patch、Region、价格或采购方式写成领域硬编码；
- 在架构最终批准前生成后端开发 Spec、实施 Plan 或代码。
