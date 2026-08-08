# 平台应用与集成

> 实施阶段、Capability 激活状态、Release 验收与 Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义平台应用的完整 Target Architecture：前端应用边界、Control Plane 模块化单体与模块边界、按 Capability 激活的独立 Deployable、稳定 Port/Adapter、同步与异步应用通信的一致性 Contract、External Provider Contract 与外部状态 Feed、Operations Read Model、Console Access 以及安全公告链路。它消费各领域 owner 的稳定 ID、受保护命令与有效配置快照，不重新定义 Identity、授权、Requirement、Agent、Sandbox 或 GitLab 的状态机。

本文不声明任何 Platform Environment 已部署哪些组件：环境中的 Image、Bundle、拓扑与健康状态由 GitOps Desired State、Platform Compatibility Set（PCS）与运行证据证明。领域状态分别属于 [01](./01-identity-organization-authorization.md)～[05](./05-source-control-delivery.md)，数据与持久化基线属于 [07](./07-data-messaging-storage.md)，密钥、加密、Secret 与 Audit 保留属于 [08](./08-security-audit-governance.md)，Cluster、Node、组件版本与总容量属于 [09](./09-infrastructure-operations.md)，Configuration 的通用治理协议与生命周期属于 [10](./10-configuration-governance.md)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：安全公告的默认采集/发布调度与重试上限见[参数附录](./appendix-parameters.md#platform-policy-key)，`SourceControlPort` 与 `SandboxPort` 的方法清单见[参数附录](./appendix-parameters.md#port-方法清单)。

## 核心模型

### 组件地图

以下是完整目标组件地图；图中节点不表示必须同时部署：

```text
Browser
  → platform-gateway
    ├── Umi Web（用户端 + 平台管理后台）
    └── Python Control Plane（模块化单体）
          ├── 领域模块（含独立 Configuration 模块）
          ├── 公开 Application Facade / Port
          ├── Transactional Outbox / Inbox
          └── Operations Read Model / Console Access（按需增强）
                ↕ 按 Capability 激活的 Port / Adapter
       GitLab · Model · Sandbox · Object · Security Feed · Operations Feed
```

### Umi Web 与 Session Bootstrap

同一 Umi Max、React、TypeScript 应用承载用户端与平台管理后台两个路由空间，共用 Design Token、Layout、API Client 与当前环境 Session。目录边界为 `pages/`（路由装配）、`features/{auth,navigation,chat,requirements,workflows,runs,agents,administration}/`、`components/`（跨 Feature UI）、`services/{generated,transport}/` 以及 `models/ hooks/ types/ utils/`。

状态边界固定为：路由、筛选与对象标识使用 URL；服务端数据由 React Query 管理；当前用户、当前 Workspace 与轻量 UI 偏好使用 Umi Initial State/Model；表单使用 ProForm 或 Ant Design Form；对话界面复用已锁定的 `@ant-design/x` 的 `Bubble`、`Conversations`、`Sender`、`Attachments` 与 `ThoughtChain`；临时交互状态保留在组件内。

Session Bootstrap 固定为：Secure + HttpOnly + SameSite Cookie → 当前环境 `me`（Principal、组织摘要、Workspace、有效 Capability）→ `navigation`（预注册 routeKey、Capability、Scope、排序、元数据）→ 静态 Route Registry → 受保护 API 的服务端实时授权。

### Control Plane 模块与独立 Deployable

目标 Control Plane 使用 Python 3.12、FastAPI、Pydantic 2、SQLAlchemy 2 与 Alembic，依赖及 PostgreSQL Driver 版本由锁文件固定。前端与 Control Plane 分属 `engineering-platform`（Web）与 `engineering-platform-backend`（Control Plane）两个仓库，跨仓契约以带版本与 Digest 的 OpenAPI Artifact 传递：

```text
control_plane/app/（位于独立仓库 engineering-platform-backend）
  bootstrap/
  modules/{identity,organization,workspace,authorization,configuration,
           requirement_workflow,agent_run,audit}/
  shared/{api,db,events,observability,security}/
```

每个模块内部使用 `api/`（HTTP DTO、路由、鉴权声明）、`application/`（命令、查询、用例与事务）、`domain/`（实体、值对象、领域服务、事件）、`ports/`（Repository 与外部依赖接口）与 `adapters/`（SQL、Provider、Transport 实现），并拥有自己的领域模型、数据库 Schema、迁移目录、数据访问账号、本领域 Namespace 的 Typed Configuration Schema 与 Audit 责任。

Control Plane 之外的独立 Deployable 按信任、高风险或独立扩缩容边界划分：

| Deployable | 责任 | 禁止拥有的事实 |
| --- | --- | --- |
| Platform Orchestrator Worker | Temporal Workflow、Timer、Activity 与 Agent 编排 | Requirement、用户与权限主数据 |
| Model Gateway | Model Catalog、能力映射、Route、配额、Usage 与 Provider 兼容 | Requirement Workflow |
| Sandbox Controller | Resource/Runtime Profile 的物化、Lease/Fencing、回收 | 业务审批 |
| GitLab Connector | `SourceControlPort` 的协议转换与外部效果收敛 | 平台 Capability 或业务状态 |
| File Security Worker | 文件检查与规范化 Verdict | Artifact 领域归属 |
| Operations Adapter | 受限查询与外部状态投影 | 基础设施 Desired State |

稳定 Port 至少包括 `SourceControlPort`、`ContainerRegistryPort`、`ModelProviderPort`、`ModelEvaluationPort`、`WorkflowOrchestratorPort`、`EventBusPort`、`CachePort`、`SecretManagerPort`、`ObjectStoragePort`、`FileSecurityPort`、`ImageSecurityPort`、`VulnerabilityScannerPort`、`ArtifactSignerPort`、`SandboxPort`、`ImageBuildPort`、`TelemetryPort`、Metrics/Log/Trace/Alert Query Port、`ConsoleAccessPort`、`OperationsStatusFeedPort`、`TrustBundlePort` 与 `ServiceIdentityPort`。

### 一致性主流程

```text
单一模块领域写入 + Audit + Outbox
             └── 同一 PostgreSQL transaction
→ Relay 取得 EventBus 持久 ACK
→ 标记已发布
→ Consumer Inbox 以唯一键去重
→ Effect Ledger 完成外部副作用
→ 业务提交后 Ack
```

### External Provider Binding 与状态 Envelope

External Provider Contract 只治理平台外的 Cloud/Operations Plane Binding：`CLOUD_FOUNDATION`、`BUSINESS_EDGE`、`CONTROL_PLANE_ENDPOINT`、`EGRESS`、`CONTROL_PLANE_RECOVERY`、`EXTERNAL_WATCHDOG`、`PROVIDER_AUDIT` 与 `EXTERNAL_PROVIDER_CONSOLE`。每个外部依赖必须有版本化、不可原地修改的 `ExternalProviderBinding` Generation，至少记录 Environment、Binding ID/Kind、Provider Mapping、逻辑 Endpoint/Resource Reference、方向/协议、Trust Profile、Desired IaC/PCS Revision、健康/失败 Contract、数据分类、Operations Owner、Runbook、Console Link 与生命周期。

权威链固定为：Cluster 外 IaC/PCS/`CloudEnvironmentBinding` 定义 Desired → Provider API 与外部探针提供 Observed → Provider Audit 记录变更 → 平台保存已签名 Feed 的只读 Projection。其中 `Environment Operations Collector` 经 `OperationsStatusFeedPort` 推送 Canonical、签名、版本化的 `ExternalProviderStatusEnvelope`；Envelope 至少包含 Schema Version、Environment、Binding/Generation、Collector Lineage、全局 Envelope ID、Lineage 单调 Sequence、生成/到期时间、Coverage、Observed Health/Drift、Incident、IaC Revision、Payload Digest 与 Signing Key ID。

## 关键不变量

- DEV 与 PROD 只从相同代码、Contract、Flux GitOps 模板与 PCS 独立实例化，绝不共享入口、Web、gateway、Session、Control Plane、数据库、凭据或任何运行时状态——环境是可验证的故障域与信任域边界。
- `platform-gateway` 是当前 Platform Environment 唯一的北向应用入口，负责 TLS、路由、限流与受控 Console 入口且不承载领域决策，Browser 的业务请求只经该入口——单一入口才能统一施加传输与授权边界。
- Browser 不持有也不直连数据库、消息系统、Kubernetes、Secret Manager、RGW 管理接口、Model Gateway 或基础设施凭据；对象读写只能在授权后使用绑定精确 Object Version 的短期 Presigned Request——浏览器始终按不可信客户端处理。
- 后端不能下发任意模块路径、脚本或 URL，可加载页面由静态 Route Registry 决定；Umi Access、菜单与按钮只控制体验，受保护 API 仍调用 [01](./01-identity-organization-authorization.md) 的当前授权判定——可见性是体验结果，不是授权结论。
- 同一 Umi Web 构建产物承载用户端与 `/admin` 管理路由，`/admin` 只是路由前缀而不是第二个工程；对话交互复用 `@ant-design/x` 组件而不引入独立 Chat 应用，该组件库不拥有登录、权限、对话事实、Model Route 或独立服务端——UI 组件库不得升级为事实源。
- 前端依赖方向固定为 `pages → features → services/generated`，共享组件不得依赖具体业务 service，Feature 之间只能使用公开入口——反向依赖会让页面装配决定业务语义。
- `services/generated` 的 OpenAPI 客户端不得手改，其生成输入只来自后端仓发布的版本化 OpenAPI Artifact，双仓 CI 各自校验兼容性，两仓不共享代码内部结构也不以相对路径互相引用——跨仓契约必须是可版本化的 Artifact 而不是共享目录。
- transport 把服务端错误归一为 Problem Details，页面不得依赖底层 HTTP 客户端异常；SSE/WebSocket 更新必须携带实体版本，旧事件不得覆盖新状态——传输细节与乱序事件都不应改写页面已知事实。
- 目标 Control Plane 的交付边界始终是模块化单体：模块可在未来连同 Domain、Application、Schema、Migration、本领域 Policy 数据与配置语义、Audit 责任和公开 Contract 一起提取，但在提取发生前仍运行在同一部署单元内，独立 Deployable 与可提取模块都不得被描述为已存在的领域微服务——可提取性来自边界纪律，不是当前拓扑。
- 模块只能调用其他模块公开的 Application Facade 或消费领域事件，禁止导入其 ORM Model、Repository 或内部 Entity；API 只返回显式 DTO，架构测试必须验证依赖方向与禁止导入规则——边界要由自动化证明，否则会被逐次例外侵蚀。
- 每个本地事务只改写一个模块拥有的数据，跨模块动作通过 Facade 编排或 Transactional Outbox 收敛且禁止分布式事务；`shared` 不得承载无主业务表或无主业务规则——无主数据会让责任与恢复同时失去归属。
- 领域写入、Audit 与待发布消息在同一 PostgreSQL Transaction 原子提交；传输是 at-least-once，Outbox Relay 可重试而 Inbox 与 Effect Ledger 必须把重复交付归并为相同业务效果，不得虚构 exactly-once——事实与其证据必须同生同灭。
- 同步调用只适用于认证、查询、校验与命令受理，长任务同步只返回受理结果而状态通过 Query、SSE 或事件取得；命令使用稳定 Idempotency Key 与显式版本/并发条件，消息 Schema 与主版本通过 Contract 演进，消费者不得猜测未知字段或把传输顺序当作业务顺序，大对象只传 Object Reference——异步只加速传播，不定义业务顺序，也不承担对象存储职责。
- 内部同步调用携带 Workload Identity、`traceparent`、request ID 与 correlation ID，TLS/mTLS 与业务授权分别校验；外部调用必须有 timeout、有限重试与 circuit breaker，没有幂等保证的外部效果进入 `UNKNOWN/RECONCILIATION`——未证明的外部效果按未完成处理。
- 外部 Webhook 必须先验签、持久化与去重，之后才异步处理——未验证的推送不得进入领域处理路径。
- 领域模块只依赖公开 Contract：Adapter 可替换但不能绕过领域语义与私有数据边界，独立 Deployable 不得直读 Control Plane 私有表，领域 DTO 也不泄露厂商 SDK 对象、Pod、消息、Token、Bucket Admin API 或 Cloud Resource ID——外部细节一旦进入 DTO 就会固化进领域语义。
- Umi Web、Python Control Plane、OpenAPI、单模块 Transaction 与 Port/Adapter 骨架构成始终存在的应用基础；Capability 未激活时不部署其专属 Deployable，也不创建空消息链或空数据服务，代码中的 Port、DTO 与受控 Feature Toggle 只保留兼容边界而不能被解释为能力已启用——保留 Contract 不等于预先安装 Worker、Controller、Scanner、Feed 或 Console。
- 能力只有在路线图选中的 Capability Package 首次消费、其依赖与 Security Floor 可验证且 Capability Activation Gate 通过后才部署对应 Worker、Gateway、Controller、Connector、Scanner 或 Operations Adapter，且必须满足完整 Port/Adapter、安全、恢复与可观测 Contract，不得以半成品降级启用——部分启用会把整条链路的安全边界降级。
- Flux 只从当前环境受保护 Git 路径 Reconcile 已批准的 Desired State；管理后台、Control Plane、Operations Read Model 与 Adapter 不得直接创建、修改或删除 Kubernetes Workload，也不得把 Flux Observed Status 反写为 Desired State——业务入口不应升级成基础设施管理面。
- Frontend、脚本、旧缓存或 Operations Projection 都不能自行决定 Effective Configuration；本文只通过稳定 Port 消费 Effective Configuration，不建立平行的 Draft、Publish、Rollback 或 Promotion 状态（生命周期属于 [Configuration Governance](./10-configuration-governance.md)，发布资格与 Super Admin 边界属于 [01](./01-identity-organization-authorization.md)）——治理协议与消费方分离才能各自独立演进。
- Configuration 是 Control Plane 内的独立领域模块，通过稳定 Port 提供 Effective Configuration 且不形成独立 Deployable 或微服务，各领域模块仍拥有本 Namespace 的 Typed Configuration Schema、默认值、约束、解析器与业务解释——通用生命周期集中，业务语义分散。
- 运维与 IaC 拥有 Cloud Account、网络、外部 Edge、DNS、Egress、Cloud KMS、Cluster 外 Backup、Watchdog、Provider Audit 及其变更与恢复；平台只拥有 gateway 之后的应用路由、认证、稳定 Infrastructure Port、状态 Feed 校验、只读 Projection、告警关联与受权 Console 入口，Super Admin 与平台 API 都不跨越该边界——平台不持有 Cloud Admin 身份。
- `ExternalProviderBinding` 只允许保存 Secret Reference、证书 Fingerprint、Key ID 等非敏感标识，凭据与恢复材料由 [08](./08-security-audit-governance.md) 管理——Binding 是可审计的历史序列，不是凭据仓库。
- Projection、页面颜色与人工备注都不是 Desired State；Observed 偏离 Desired 时标记 `DRIFT` 并链接 Runbook，平台不自动修复——只读导入不能变成第二个 Desired State。
- 每个环境的 `Environment Operations Collector` 位于目标 Kubernetes Cluster 之外并由运维管理，使用彼此隔离的短期只读/探测身份，不持有业务数据库、平台用户、OpenBao 或 Kubernetes Admin 凭据，也不读取另一环境；写 Provider 的恢复工具与只读 Collector 必须是不同 Identity、Process 与 Audit 用途——读写分离才能让只读链路失陷时不产生写影响。
- 外部状态的唯一导入形式是已验证、可去重、受时效约束的签名只读 Envelope，平台不接受 IaC、Shell、Provider Mutation 或任意 Callback；Envelope 不得包含 Access Key、Token、Cookie、完整账号标识、Secret 或敏感原始 Provider 响应——导入面越窄，可信度越高。
- Ingest 依次验证传输策略、环境与 Binding Generation、Schema、Signing Key 状态/Scope、签名与 Digest、Envelope ID、Sequence、时钟偏差与 `Valid Until`，并按 `(environment, binding, generation, collector lineage)` 维护 High-water Mark：同 Sequence 同 Digest 幂等成功、同 Sequence 不同 Digest 判为安全冲突、低序号拒绝；未知、过期、重放、乱序、不兼容或签名错误一律拒绝并产生结构化 Audit/Alert，恢复后不得静默清零 High-water Mark，成功只更新当前环境 Operations Read Model 并保留非敏感收取证据——单调序列是重放与回滚攻击的唯一有效防线。
- External Watchdog 是 Cluster 外的独立告警链，必须在 Kubernetes、Control Plane、PostgreSQL 与 Collector 均不可用时仍能通知失联，Collector 只能投影其结果——失联告警不能依赖被监控对象本身。
- Feed 超过 `Valid Until`、签名无效或 Collector 不可用时状态为 `STALE/PARTIAL/UNKNOWN` 且不保留旧的绿色状态；外部来源没有机器可读 API 或受控探针时状态必须为 `NOT_INTEGRATED`，运维提供的有界有效期签名 Operations Declaration 必须显示声明来源、Coverage 与到期时间并在过期后回到 `UNKNOWN`——人工声明不是持续机器观测，也不是真实依赖的健康证明。
- 外部状态 Feed 只改变运维可见性：其 `STALE/PARTIAL/UNKNOWN` 不等于真实依赖故障，也不阻塞没有同步依赖该 Feed 的既有 Requirement、数据库事务、Agent Attempt 或控制循环；真实依赖失败始终按该依赖自身的同步调用、健康与失败 Contract 处理——把可见性缺失当作故障会制造人为停机。
- Operations Read Model 是当前环境可重建的只读投影，统一查询组件 Baseline、有效配置、Health、容量、性能、Backup/Restore、依赖、Alert、Gap、Drift 与趋势，消费受限 Observability/Operations Adapter 而不替代业务事实、Audit、IaC Desired State 或专业查询产品，并按 `全局概览 → 组件详情 → 实例 / 告警 / Gap / Drift / Runbook` 的固定层级呈现；管理后台按 Capability + Scope 只展示当前环境，`GITOPS_CONFIG`、PCS、Replica、Node、Ceph fullness 等基础设施值仅显示 Desired/Effective/Drift 且不能从后台写入——只读投影不得成为第二事实源或写入通道。
- 任何投影 Lag、查询失败或 Coverage 不完整都必须显式显示，不得把部分结果伪装为健康——不可证明的状态必须自我声明，否则运维会基于假绿色作决定。
- Operations Read Model、安全公告、复杂 Console 与高级 Provider 治理是按 Capability Package 激活的增强能力而不是基础应用启动的前置条件；未启用时不部署其专属 Adapter、Collector、Scanner 或页面后端，也不以空实现宣称通过——增强能力要么完整满足本主题 Contract，要么明确关闭。
- `ConsoleAccessPort` 只接受预注册且在允许列表内的 `consoleId/linkId`，目标由服务端依据当前 Environment 解析；客户端、External Envelope 与用户都不能提交任意目标 URL，未注册 Link、Environment 不匹配、目标 Scheme/Host/Path 不符合注册值或可能形成 Open Redirect 的请求一律拒绝——目标解析只有留在服务端才能杜绝重定向劫持。
- Grafana、Hubble、Temporal、OpenBao 与外部 Provider Console 一律在受控新标签页打开而不使用 iframe，每次打开前都校验当前 Session、Capability、Scope 与目标 Link Policy；平台没有 SSO 时目标系统继续执行自己的认证，Console Access 不得降低、跳过或替代目标认证，也不得向浏览器暴露 Data Source、Kubernetes、Cloud 或 Console Admin Credential——入口授权与目标认证是两道必须各自成立的门。
- Console Access 的 Audit 至少记录 actor、Environment、目标 console/link、授权结果与打开动作，且不记录短期访问材料、目标 Session 或目标页面内容——审计要能追责，但不能把访问材料复制成新的泄露面。
- 安全公告由 Frontend 轮询 Backend API 而不使用 WebSocket 或实时推送；Source Adapter 只访问批准的 CISA KEV、NVD API 2.0 与 OSV API 这三类官方机器可读来源，不抓取 HTML 也不接受任意 URL，各来源隔离 Endpoint、timeout、限流与凭据引用，并生成包含 Source、Retrieved At、有效期、Coverage、Canonical Hash 与原始响应/Object Reference 的不可变 `Vulnerability Data Snapshot`——来源允许列表与快照化是结果可复现的前提，公告本身是可重放的批量事实而不需要实时通道。
- 依赖与 SBOM 漏洞匹配通过 `VulnerabilityScannerPort` 使用版本锁定的 `OSV-Scanner` 一次性 Job，只消费 Source Adapter 固化的精确 OSV Data Snapshot 并以 Offline Mode 扫描批准的 CycloneDX/SPDX Artifact 或受支持的 Package Manifest/Lockfile；该 Job 没有外部 Egress，不能自行查询 OSV、deps.dev、Package Registry 或其他补充来源，解析需要 Snapshot 之外的数据时本次 Coverage 标记不完整而绝不临时放行网络——扫描器只是匹配器，其输入必须完全可复现。
- 平台不建设独立漏洞管理平台、外部数据通道或常驻扫描服务：`OSV-Scanner` 不作为常驻服务、不拥有公告状态，也不替代 CISA KEV/NVD Source Adapter、筛选、去重、发布与 Audit——公告事实由平台拥有，扫描能力只是其中一个可替换环节。
- 调度、时区、来源允许列表、Endpoint、扫描器版本/digest、筛选条件、timeout、限流与重试值全部是注册的版本化配置，Technology Inventory 同样是平台级版本化配置，都不硬编码在 Frontend、业务代码或任务脚本中（默认调度与重试上限见[参数附录](./appendix-parameters.md#platform-policy-key)）——采集行为必须可审核、可回滚。
- 结果以 CVE 优先、来源 Advisory 与规范化指纹辅助去重，筛选匹配 Technology Inventory 的 CISA KEV 与 High/Critical 漏洞——去重与筛选口径必须确定，否则同一漏洞会反复出现或被漏掉。
- 每次扫描形成不可变 `Vulnerability Scan Evidence`，至少绑定 Scanner Image/Config Digest、输入 Artifact 的 exact Object Version 与 Hash、`Vulnerability Data Snapshot` ID/Hash、开始/完成时间、Coverage、结构化 JSON/SARIF、输出 Hash、状态与错误摘要，公告生成记录只保存稳定 Evidence 引用并可据此重放筛选——公告结论必须能被原样复算。
- 扫描状态固定为 `SUCCEEDED | PARTIAL | FAILED | EXPIRED`：仅在证据有效且全部必需输入与来源成功时才可标记 `SUCCEEDED`；可选来源缺失但有效结果仍可证明时为 `PARTIAL`，自动发布必须醒目标明成功、失败与缺失的 Coverage；扫描失败或超时、输出不可解析、必需 Snapshot/输入缺失、证据超过有效期、任一必需来源失败或全部来源失败时为 `FAILED/EXPIRED`，保留上一期公告、不发布空公告、阻止本期自动发布并告警——任何未扫描、缺失或过期状态都不能被解释为"无漏洞"。
- 公告、游标、来源摘要/Hash、扫描 Evidence、去重、筛选、重试、生成与发布均可查询且可审计，可见性仅按公告读取 Capability + Scope 判定——公告是受权访问的业务事实，不是公开页面。
- 集群内 Grafana、Hubble、Temporal、OpenBao 的 Console 使用本地 Console Access Contract，GitLab、Model Provider 与安全公告 Feed 由各自 Connector/Source Adapter 管理，Jenkins 在 Target Architecture 中是用户手工使用的外部系统且不存在 Jenkins Adapter、Webhook 或状态投影——不同信任模型的外部依赖不能共用一套 Contract。

## 与其他模块的关系

下表是本模块自身视角：06 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | Web 与 Control Plane 的应用边界及跨模块集成 Contract |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 当前 Principal、Workspace 摘要、有效 Capability 与服务端授权判定；配置命令资格与 Super Admin 边界 | Session Bootstrap、导航与静态 Route Registry 装配、受保护 API 的统一入口 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement、WorkItem 与 Artifact 业务状态的公开 Contract | 业务 API 与模块边界、单模块事务与 Outbox 一致性、前端装配约束 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | Workflow 编排事实、Agent 与 Model 的执行与路由 Contract | Platform Orchestrator Worker 与 Model Gateway 的 Deployable 边界及稳定 Port/Adapter 装配 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | `SandboxPort` 契约与 Preview Gateway 的访问校验要求 | Sandbox Controller 的 Deployable 边界与平台应用入口 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | `SourceControlPort` 的业务语义与 GitLab 外部效果收敛结果 | GitLab Connector 的 Deployable 边界、Webhook 验签与幂等一致性 Contract |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | PostgreSQL、Valkey、NATS、Temporal 与 Object Storage 的运行与恢复事实、Outbox/Inbox 持久化基线 | 应用侧的单模块事务、Outbox/Inbox/Effect Ledger 一致性 Contract 与 Object Reference 传递约束 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Secret、加密、Trust 材料、供应链与文件扫描机制、Audit Envelope 与保留规则、`ExternalProviderBinding` 只能保存非敏感标识的边界 | Console Access、Feed Ingest 与安全公告的 Audit Trigger |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Cluster、Node、组件版本、PCS、GitOps Desired State、可观测性与总容量事实 | Operations Read Model 的只读投影边界、Flux 单向 Reconcile 约束与告警关联 |
| [10 Configuration Governance](./10-configuration-governance.md) | Catalog、Draft、Publish、Rollback、Effective Snapshot、Schema 演进与 Promotion 生命周期 | Control Plane 内 Configuration 模块的装配边界与 Effective Configuration 的消费方式 |
| [12 实施路线图](./12-implementation-roadmap.md) | 实施阶段、Capability 激活状态、Release 验收与 Profile 选择 | Capability Activation Gate 必须证明的应用与集成 Contract |
| [参数附录](./appendix-parameters.md) | 安全公告默认调度与重试上限、Port 方法清单 | 本文正文中的定性规则 |
