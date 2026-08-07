# 平台应用与集成详细说明

> 文档层级：L2 规范事实源
> 对应主文：[平台应用与集成](./platform-application-integration.md)

## 1. 责任边界

本文是前端应用边界、Control Plane 模块化单体、Deployable、Port/Adapter、应用通信、External Provider Contract、Operations Read Model、Console Access 与安全公告的唯一规范事实源。

本文消费领域 owner 的稳定 ID、受保护命令与有效配置快照，不重新定义 Identity、授权、Requirement、Agent、Sandbox 或 GitLab 的状态机。PostgreSQL、Valkey、NATS、Temporal 与 Object Storage 的运行和恢复事实由 [数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有。安全密钥、加密、Secret 与 Audit 保留规则只见 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)；Cluster、Node、组件版本和总容量只见 [基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)。

DEV 是当前唯一实例化的 Platform Environment，当前仓库是 Umi Max 前端模板。本文规定的 Python Control Plane、数据服务、独立 Deployable、Operations Adapter 与基础设施属于已批准的目标架构，不声明这些运行实例已经部署。未来 PROD 只从相同代码、Contract、GitOps 模板与 PCS 独立实例化，始终使用独立入口、Session、组件和状态。

## 2. Umi Web 与 Session Bootstrap

批准的应用边界由同一 Umi Max、React、TypeScript 应用承载用户端和平台管理后台两个路由空间，共用 Design Token、Layout、API Client 与当前环境 Session；`/admin` 是路由前缀，不是第二个工程。目录边界为：

```text
src/
  pages/                         路由装配
  features/{auth,navigation,requirements,workflows,runs,agents,administration}/
  components/                    跨 Feature UI
  services/{generated,transport}/
  models/ hooks/ types/ utils/
```

依赖方向为 `pages → features → services/generated`；共享组件不得依赖具体业务 service，Feature 间只能使用公开入口。OpenAPI 生成客户端位于 `services/generated` 且不得手改；transport 将服务端错误归一为 Problem Details，页面不得依赖底层 HTTP 客户端异常。

状态边界如下：路由、筛选与对象标识使用 URL；服务端数据由 React Query 管理；当前用户、当前 Workspace 与轻量 UI 偏好使用 Umi Initial State/Model；表单使用 ProForm 或 Ant Design Form；临时交互状态保留在组件；SSE/WebSocket 更新必须携带实体版本，旧事件不得覆盖新状态。

Session Bootstrap 固定为：

```text
Secure + HttpOnly + SameSite Cookie
→ 当前环境 me（Principal、组织摘要、Workspace、有效 Capability）
→ navigation（预注册 routeKey、Capability、Scope、排序、元数据）
→ 静态 Route Registry
→ 受保护 API 的服务端实时授权
```

后端不能下发任意模块路径、脚本或 URL。Umi Access、菜单和按钮只控制用户体验；API 仍调用 [01 的当前授权判定](../01-identity-organization-authorization/identity-organization-authorization-detail.md)。浏览器不持有或直连数据库、消息系统、Kubernetes、Secret Manager、RGW 管理接口、Model Gateway 或基础设施凭据；对象读写仅可在授权后使用绑定精确 Object Version 的短期 Presigned Request。

## 3. Python Control Plane 与模块边界

目标 Control Plane 使用 Python 3.12、FastAPI、Pydantic 2、SQLAlchemy 2 与 Alembic；依赖及 PostgreSQL Driver 版本由锁文件固定。它是一个 Python 项目和一个业务部署单元的**模块化单体**，不是预先拆分的微服务。

```text
backend/control_plane/app/
  bootstrap/
  modules/{identity,organization,workspace,authorization,configuration,
           requirement_workflow,agent_run,audit}/
  shared/{api,db,events,observability,security}/
```

每个模块内部使用 `api/`（HTTP DTO、路由、鉴权声明）、`application/`（命令、查询、用例与事务）、`domain/`（实体、值对象、领域服务、事件）、`ports/`（Repository 与外部依赖接口）和 `adapters/`（SQL、Provider、Transport 实现）。模块拥有自己的领域模型、数据库 Schema、迁移目录、数据访问账号、配置 Schema 和 Audit 责任；`shared` 不得承载无主业务表或无主业务规则。

模块只能调用其他模块公开的 Application Facade 或消费领域事件，禁止导入其 ORM Model、Repository 或内部 Entity。每个本地事务只改写一个模块拥有的数据；跨模块动作通过 Facade 编排或 Transactional Outbox 收敛，禁止分布式事务。API 只返回显式 DTO，架构测试必须验证依赖方向和禁止导入规则。

模块未来可以连同 Domain、Application、Schema、Migration、Configuration、Audit 责任与公开 Contract 一起独立提取；在提取发生前，它们仍在同一模块化单体中运行。

## 4. Deployable 与 Port/Adapter

目标架构中 Control Plane 之外的独立 Deployable 按信任、高风险或独立扩缩容边界划分：

| Deployable | 责任 | 禁止拥有的事实 |
| --- | --- | --- |
| Platform Orchestrator Worker | Temporal Workflow、Timer、Activity 与 Agent 编排 | Requirement、用户与权限主数据 |
| Model Gateway | Model Catalog、能力映射、Route、配额、Usage 与 Provider 兼容 | Requirement Workflow |
| Sandbox Controller | Resource/Runtime Profile 的物化、Lease/Fencing、回收 | 业务审批 |
| GitLab Connector | SourceControlPort 的协议转换与外部效果收敛 | 平台 Capability 或业务状态 |
| File Security Worker | 文件检查与规范化 Verdict | Artifact 领域归属 |
| Operations Adapter | 受限查询与外部状态投影 | 基础设施 Desired State |

稳定 Port 至少包括 `SourceControlPort`、`ContainerRegistryPort`、`ModelProviderPort`、`WorkflowOrchestratorPort`、`EventBusPort`、`CachePort`、`SecretManagerPort`、`ObjectStoragePort`、`FileSecurityPort`、`ImageSecurityPort`、`ArtifactSignerPort`、`SandboxPort`、`ImageBuildPort`、`TelemetryPort`、Metrics/Log/Trace/Alert Query Port、`ConsoleAccessPort`、`OperationsStatusFeedPort`、`TrustBundlePort` 与 `ServiceIdentityPort`。领域 DTO 不泄露厂商 SDK 对象、Pod、消息、Token、Bucket Admin API 或 Cloud Resource ID。

Browser 的业务请求只经当前环境 `platform-gateway`；内部同步调用携带 Workload Identity、`traceparent`、request ID 与 correlation ID。TLS/mTLS 与业务授权分别校验。外部 Webhook 必须先验签、持久化与去重，之后异步处理。外部调用必须有 timeout、有限重试与 circuit breaker；没有幂等保证的外部效果进入 `UNKNOWN/RECONCILIATION`，不得虚构 exactly-once。

## 5. 同步、异步与一致性

同步调用适用于认证、查询、校验和命令受理；长任务同步只返回受理结果，状态通过 Query、SSE 或事件取得。Workflow 的编排事实由 [03](../03-agent-skill-model/agent-skill-model-detail.md)拥有，持久化约束由 [07](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有。

```text
单一模块领域写入 + Audit + Outbox
             └── 同一 PostgreSQL transaction
→ Relay 取得 EventBus 持久 ACK
→ 标记已发布
→ Consumer Inbox 以唯一键去重
→ Effect Ledger 完成外部副作用
→ 业务提交后 Ack
```

传输为 at-least-once；Outbox Relay 可重试，Inbox/Effect Ledger 必须将重复交付归并为相同业务效果。大对象仅传 Object Reference。命令使用稳定 Idempotency Key 与显式版本/并发条件；消息的 Schema 与主版本通过 Contract 演进，不允许消费者猜测未知字段或将传输顺序当作业务顺序。

Configuration 的 Catalog、Draft、Publish、Rollback、Effective Snapshot、Schema 演进与 DEV→PROD Promotion 生命周期只由 [Configuration Governance](../10-configuration-governance/configuration-governance-detail.md)拥有。本文只规定 Control Plane 如何通过稳定 Port 消费 Effective Configuration，并保持模块、Outbox、Adapter 与管理入口边界；各领域配置值的业务语义仍由对应领域 owner 定义。

## 6. External Provider Contract

External Provider Contract 只治理平台外的 Cloud/Operations Plane Binding：`CLOUD_FOUNDATION`、`BUSINESS_EDGE`、`CONTROL_PLANE_ENDPOINT`、`EGRESS`、`CONTROL_PLANE_RECOVERY`、`EXTERNAL_WATCHDOG`、`PROVIDER_AUDIT` 与 `EXTERNAL_PROVIDER_CONSOLE`。集群内 Grafana、Hubble、Temporal、OpenBao 的 Console 使用本地 Console Access Contract；GitLab、Model Provider 与安全公告 Feed 由各自 Connector/Source Adapter 管理。Jenkins 是用户手工使用的外部系统，当前架构基线不存在 Jenkins Adapter、Webhook 或状态投影。

运维/IaC拥有 Cloud Account、网络、外部 Edge、DNS、Egress、Cloud KMS、Cluster 外 Backup、Watchdog、Provider Audit 及其变更恢复；平台只拥有 gateway 之后的应用路由、认证、稳定 Infrastructure Port、状态 Feed 校验、只读 Projection、告警关联与受权 Console 入口。Super Admin 和平台 API 不跨越这个边界。

每个外部依赖必须有版本化、不可原地修改的 `ExternalProviderBinding` Generation，至少记录 Environment、Binding ID/Kind、Provider Mapping、逻辑 Endpoint/Resource Reference、方向/协议、Trust Profile、Desired IaC/PCS Revision、健康/失败 Contract、数据分类、Operations Owner、Runbook、Console Link 与生命周期。只允许保存 Secret Reference、证书 Fingerprint、Key ID 等非敏感标识；凭据和恢复材料由 [08](../08-security-audit-governance/security-audit-governance-detail.md) 管理。

权威链为：Cluster 外 IaC/PCS/`CloudEnvironmentBinding` 定义 Desired → Provider API/外部探针提供 Observed → Provider Audit 记录变更 → 平台保存已签名 Feed 的只读 Projection。Projection、页面颜色与人工备注不是 Desired State；Observed 偏离 Desired 时标记 `DRIFT` 并链接 Runbook，不从平台自动修复。

每个环境有一个位于目标 Kubernetes Cluster 外、由运维管理的 `Environment Operations Collector` 逻辑实例。它以彼此隔离的短期只读/探测身份读取本环境 Provider、IaC 摘要、Edge/Egress、外部 Backup、Watchdog 与 Audit；不持有业务数据库、平台用户、OpenBao 或 Kubernetes Admin 凭据，也不读取另一环境。写 Provider 的恢复工具与只读 Collector 必须是不同 Identity、Process 和 Audit 用途。

Collector 经 `OperationsStatusFeedPort` 推送 Canonical、签名、版本化的 `ExternalProviderStatusEnvelope`。Envelope 至少包含 Schema Version、Environment、Binding/Generation、Collector Lineage、全局 Envelope ID、Lineage 单调 Sequence、生成/到期时间、Coverage、Observed Health/Drift、Incident、IaC Revision、Payload Digest 与 Signing Key ID；不得包含 Access Key、Token、Cookie、完整账号标识、Secret 或敏感原始 Provider 响应。

Ingest 依次验证传输策略、环境与 Binding Generation、Schema、Signing Key 状态/Scope、签名与 Digest、Envelope ID、Sequence、时钟偏差与 `Valid Until`。High-water Mark 的键为 `(environment, binding, generation, collector lineage)`：同 Sequence 同 Digest 幂等成功、同 Sequence 不同 Digest 为安全冲突、低序号拒绝。未知、过期、重放、乱序、不兼容或签名错误均拒绝并产生结构化 Audit/Alert；恢复后不能静默清零 High-water Mark。成功只更新当前环境 Operations Read Model，保留非敏感收取证据。

External Watchdog 是 Cluster 外独立告警链，必须在 Kubernetes、Control Plane、PostgreSQL 和 Collector 均不可用时仍能通知失联；Collector 只能投影其结果。Feed 超过 `Valid Until`、签名无效或 Collector 不可用时状态为 `STALE/PARTIAL/UNKNOWN`，不保留旧绿色状态。

Collector、Feed 与 imported Projection 只改变运维可见性。它们不可用时，不得阻塞已经运行的 Requirement、数据库事务、Agent Attempt 或控制循环，除非该动作依据自身 Contract 确实同步依赖对应外部服务。`STALE/PARTIAL/UNKNOWN` 只表示导入状态不可证明，不等同于目标依赖已经失败；真实依赖失败始终按该依赖自己的同步调用、健康与失败 Contract 处理。

外部来源没有机器可读 API 或受控探针时，其集成状态必须为 `NOT_INTEGRATED`。运维可以提供有界有效期的签名 Operations Declaration；Projection 必须显示声明来源、Coverage 与到期时间，过期后回到 `UNKNOWN`，不能把人工声明当作持续机器观测或真实依赖健康证明。

## 7. Operations Read Model、Console 与安全公告

Operations Read Model 是当前环境的可重建只读投影，统一查询组件 Baseline、有效配置、Health、容量、性能、Backup/Restore、依赖、Alert、Gap、Drift 与趋势。它消费受限 Observability/Operations Adapter，不替代业务事实、Audit、IaC Desired State 或专业查询产品。页面层级固定为：

```text
全局概览 → 组件详情 → 实例 / 告警 / Gap / Drift / Runbook
```

管理后台按 Capability + Scope 展示当前环境的 Kubernetes、PostgreSQL、Valkey、NATS、Temporal、Object Storage、Agent/Sandbox、Model、GitLab 与外部 Provider 状态。`GITOPS_CONFIG`、PCS、Replica、Node、Ceph fullness 等基础设施值仅展示 Desired/Effective/Drift，不能从后台写入。任何投影 Lag、查询失败或 Coverage 不完整都必须显式显示，不得把部分结果伪装为健康。

`ConsoleAccessPort` 只接受预注册且允许列表内的 `consoleId/linkId`，服务端依据当前 Environment 解析目标；客户端、External Envelope 和用户均不能提交任意目标 URL。未注册 Link、Environment 不匹配、目标 Scheme/Host/Path 不符合注册值或可能形成 Open Redirect 的请求一律拒绝。Grafana、Hubble、Temporal、OpenBao 与外部 Provider Console 均在受控新标签页打开，不使用 iframe。

每次打开前都校验当前 Session、Capability、Scope 与目标 Link Policy。平台没有 SSO 时，目标系统继续执行自己的认证；Console Access 不得降低、跳过或替代目标认证，也不得向浏览器暴露 Data Source、Kubernetes、Cloud 或 Console Admin Credential。Audit 至少记录 actor、Environment、目标 console/link、授权结果与打开动作，不记录短期访问材料、目标 Session 或目标页面内容。

当前架构基线的安全公告由 Frontend 轮询 Backend API，不使用 WebSocket 或实时推送。Source Adapter 只访问批准的 CISA KEV、NVD API 2.0 与 OSV API 这三类官方机器可读来源，不抓取 HTML，也不接受任意 URL；各来源隔离 Endpoint、timeout、限流与凭据引用。

默认每周日 `02:00 Asia/Shanghai` 增量采集，每周一 `07:00 Asia/Shanghai` 自动发布。单个失败来源最多有界重试 3 次。调度、时区、来源允许列表、Endpoint、筛选条件、timeout、限流与重试值全部是注册的版本化配置，不硬编码在 Frontend、业务代码或任务脚本中。Technology Inventory 同样是平台级版本化配置；结果以 CVE 优先、来源 Advisory 与规范化指纹辅助去重，筛选匹配 Inventory 的 CISA KEV 与 High/Critical 漏洞。

部分来源失败时公告必须标识成功、失败与缺失的 Coverage；全部来源失败时保留上一期、不发布空公告并告警。公告、游标、来源摘要/Hash、去重、筛选、重试、生成与发布均可查询且可审计；可见性只由公告读取 Capability + Scope 判定。

## 8. 不变量

1. DEV 与 PROD 同源但完全独立实例化，绝不共享 Web、gateway、Session、Control Plane、数据库、凭据或运行时状态。
2. 目标 Control Plane 的交付边界始终是模块化单体；独立 Deployable 与未来可提取模块均不得被描述为已存在的领域微服务。
3. 领域模块只依赖公开 Contract；Adapter 可替换，领域语义与私有数据边界不可被 Adapter 绕过。
4. Frontend、脚本、旧缓存或 Operations Projection 不能自行决定 Effective Configuration。
5. 外部状态的唯一导入形式是已验证、可去重、受时效约束的只读 Envelope，平台不接受 IaC、Shell、Provider Mutation 或任意 Callback。
6. Configuration 生命周期只由 10 Configuration Governance 拥有；06 只消费 Effective Configuration，不建立平行 Draft、Publish、Rollback 或 Promotion 状态。
