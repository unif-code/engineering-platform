# 平台应用与集成详细说明

> 文档层级：L2 规范事实源
> 对应主文：[平台应用与集成](./platform-application-integration.md)

## 1. 责任边界

本文是前端应用边界、Control Plane 模块化单体、Deployable、Port/Adapter、Typed Configuration、应用通信、External Provider Contract、Operations Read Model、Console Access 与安全公告的唯一规范事实源。

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

## 6. Typed Configuration Contract

本节是 Typed Configuration 生命周期、兼容演进与跨环境 Promotion 的唯一 owner；其他领域只拥有本模块的 Namespace、Typed Schema、默认值、约束、Reader/Migrator、解析器和业务解释，并通过稳定 Port 消费 Effective Policy，不得另行定义 Draft、Publish、Rollback、Promotion 或 Divergence 状态。Configuration Catalog 只聚合已注册 Schema，禁止通用 Key/Value、任意 JSON、SQL、表达式或脚本编辑器。配置分类固定为：

| 分类 | 权威事实与通道 | 应用边界 |
| --- | --- | --- |
| `PLATFORM_POLICY` | 对应模块 PostgreSQL；受控后台发布 | 可产生 Effective Snapshot |
| `GITOPS_CONFIG` | Git/Helm/Manifest | 后台只读，变更走 GitOps |
| `SYSTEM_INVARIANT` | 代码、数据库约束、安全规则 | 只读且不可降级 |

分类不可通过 Catalog Metadata 降级或改写；Derived/Observed 值不是第四类配置。每项注册定义至少声明稳定 Key、模块、分类、Value Type、Unit/Timezone、Default/Initial Desired、Min/Max、Enum/Allowlist、依赖、允许 Scope、继承/合并、Source of Truth、Change Channel、Effect Semantics、Promotion Mode、Rollback Value、Redaction 与弃用迁移规则。Scope 只按 Schema 明示开放；Workspace 只能在 Platform 允许的边界内覆盖或收紧，不能假定任意 Key 自动支持多级覆盖。Effect Semantics 只能取 `IMMEDIATE`、`NEW_OBJECT`、`NEXT_SCHEDULE`、`NEW_ATTEMPT`、`RESTART`、`ROLLOUT`、`RECREATE` 等受控枚举；复杂 Object 由所属模块提供受约束编辑模型。Feature Toggle 只能控制已实现并注册的行为，不得用开关凭空建立新 Provider、Runtime、身份或信任边界。Secret、Token、密码、Access Key、TOTP Secret、Private Key 和可直接使用的认证材料不进入 Catalog、Draft、Bundle、Audit 或 PostgreSQL，只保存稳定用途、Reference、Fingerprint、版本、轮换与健康元数据。

只有当前有效 Super Admin 可通过 [01 的 `platform.configuration.manage`](../01-identity-organization-authorization/identity-organization-authorization-detail.md) 与 Platform 授权 Scope 管理 `PLATFORM_POLICY`；配置目标 Scope 可以是 Platform，也可以是 Typed Schema 明确允许的 Workspace，但管理权限始终是 Platform 级 Super Admin 权限。该能力不授予领域成员身份，也不绕过 Capability、Assignment、Human Gate、GitOps、OpenBao 或任何 `SYSTEM_INVARIANT`。`GITOPS_CONFIG` 只关联 Desired/Effective/Drift 与 Git/Helm Revision；`SYSTEM_INVARIANT` 不存在 Draft、Publish 或普通回滚入口。

### 6.1 Draft、Owner 与归档

`DRAFT` 是不参与运行时解析和 Effective Policy 的候选；创建、编辑、校验失败与归档均进入 Audit，不得记作已发布变化。相同模块 Namespace + Scope 可并存多个互不阻塞且不共享可变内容的 Draft；每个 Draft 固定记录独立 Draft ID、Base Active Policy Version、Schema Revision、Content Hash、Draft Revision/ETag、Owner 与 `lastMeaningfulActivityAt`。每个 Draft 同时只有一个 Owner，且只有仍有效的 Super Admin Owner 可编辑、手工归档、校验、Apply Rebase 或发起 Publish；任何写命令都校验 Draft Revision/ETag。

其他有效 Super Admin 只能查看、比较、Clone，或填写原因并以 ETag 条件执行 Takeover。Clone 创建新 Draft ID、独立内容和新 Owner，保留来源 Draft/Version/Base，但不继承 Validation、Impact Preview 或 TOTP；Base 过期时仍须 Rebase。Takeover 原子切换 Owner、提升 Revision、使既有 Validation、Preview 与 Challenge 失效并写 Audit；旧 Owner 的旧 Revision 写入返回 Conflict。Owner 失效不会发布或删除 Draft，只能由相同 Takeover Contract 接管。

Draft 生命周期为 `DRAFT → ARCHIVED`，不物理删除或原地恢复。连续 30 天无 Meaningful Activity 自动归档；30 天是版本化 `PLATFORM_POLICY` 的默认值，由 Super Admin 修改并按 `NEXT_SCHEDULE` 生效，不得写死在 Frontend、任务或镜像。Meaningful Activity 仅包括创建/修改内容、Apply Rebase、Takeover 和重新执行服务端校验；查看、列表刷新、Diff/Preview 与健康检查不刷新时间。后台展示最后活动时间、按当前 Policy 计算的预计归档时间及归档来源。

Configuration 受控任务以 Workload Identity 执行幂等归档，并以 Draft ID、状态、Revision/ETag、Owner、`lastMeaningfulActivityAt` 做条件更新；扫描后发生有效活动即跳过本次归档，Policy Version、Cutoff 与处理结果进入 Audit。`ARCHIVED` 是不可变只读记录，禁止编辑、校验、Rebase、Takeover 或 Publish，并使 Validation、Preview、Content Hash Binding 与 Challenge 失效；归档不改变 Active Pointer，无需 Publish TOTP，但必须写 Outbox/Audit 并通知 Owner，Owner 不可用时通知当前 Super Admin。任何有效 Super Admin 只能从 Archived Draft Clone 新 Draft；`clonedFromArchivedDraftId`、来源 Revision/Base、全部 Draft Revision、Clone/Takeover/Rebase 链和 Audit 永久保留。`STALE` 表示 Base 过期，`ARCHIVED` 表示只读生命周期，管理后台分别筛选 Active、Stale 与 Archived。

### 6.2 ChangeSet、发布、快照与回滚

`Configuration ChangeSet` 是 `PLATFORM_POLICY` 的最小发布原子单位，只属于一个模块 Namespace 和一个 Scope，可包含多个已注册且允许用于该 Scope 的 Key。模块以当前 Active Policy 和 Scope 继承结果组装完整 Candidate，对跨字段约束统一校验；任一 Key 失败则整个 ChangeSet 不生效。跨模块或跨 Scope 使用独立 ChangeSet、版本与补偿结果，只可关联到同一运维记录，不形成全局事务。

所属模块必须执行服务端校验，至少覆盖类型、范围、Enum/Allowlist、Min/Max、跨字段依赖、Scope 继承、当前授权、Security Floor、Effect Semantics、Schema Compatibility 与基础设施 Envelope；Frontend 校验不是门禁。成功 Validation 绑定整个 ChangeSet 的 Draft Content Hash、Schema Revision、模块 + Scope Active Policy Version、上级 Scope/外部 Envelope 等依赖版本及结果；Candidate、Schema、Base 或依赖版本任一变化，Validation、Impact Preview、Divergence Review Decision 和待发布 Hash Binding 立即失效。Impact Preview 必须展示前后值、影响 Scope、继承与当前 Effective Value、受影响的后续对象/调度、运行中对象影响、缓存失效、传播范围及不可逆或额外处置，不得只给未解释 JSON Diff。

Publish 是独立的单人受控命令。每次 Publish 或 Rollback 都重新检查当前 Super Admin、`platform.configuration.manage`、Platform Scope、账号状态、Base/依赖版本和并发条件，要求填写原因并完成全新的 TOTP Challenge；当前 Session 的既往 MFA 不可复用，Audit 只保存再认证结果、时间与强度。发布不使用管理员自标记的风险等级，也不要求第二人批准。

Publish 只支持立即激活。最终校验与 TOTP 通过后，所属模块在单个数据库事务内再次核对授权、Content Hash、Schema Revision、Base、依赖与全部约束，写入不可变 Published Version 和完整 ChangeSet，原子切换 Active Pointer，并写 Transactional Outbox 与 Audit；`publishedAt` 与 `activatedAt` 使用同一服务端事务时间。不存在已 Published 但未 Active 的中间版本、客户端生效时间或预约队列；事务失败不改变 Active Policy，重试必须重新检查全部门禁。立即激活只改变权威解析 Snapshot，实际对象影响仍由各 Key 的 Effect Semantics 决定。

Publish 使用 Optimistic Concurrency。每个模块 Namespace + Scope 同时只有一个 Active Published Policy Version，成功 ChangeSet 生成该边界单调递增的新版本；Base Active Policy Version 不再是当前版本时返回 Conflict 并保留 Draft，禁止后写覆盖先写。其他 Draft 不删除，但 Base 过期后标记 `STALE` 且不得复用旧 Validation。其他模块或 Scope 只在被声明为依赖时使校验失效。

Published Version 保存规范化、带 Snapshot Hash 的完整不可变 `Policy Snapshot`，运行时读取 Active Snapshot，不回放 Delta；历史同时保留 Schema Revision、ChangeSet、前后值、发布人、原因、Preview、Validation 与时间线。Platform Snapshot 物化该 Revision 下全部适用 Key 及解析后的默认值；Workspace Snapshot 则完整保存每个可覆盖 Key 的 `INHERIT` 或 `OVERRIDE(normalizedValue)`，以及校验时父 Platform Version。当前 Effective Policy 由 Active Platform Snapshot + Active Workspace Override Snapshot 解析，历史事实记录两者组成的 Composite Effective Revision。父版本变化触发 Workspace 缓存失效与重新解析，不伪造 Workspace Published Version。

需要冻结语义的 Requirement、Gate、Attempt、Artifact、Upload Session 或调度对象在建立时保存模块解析的 Effective Value/Snapshot 与 Composite Revision，后续发布不得改写。Outbox 驱动缓存失效并投影消费者已观察版本、传播延迟与异常；安全敏感写操作遇到未知、陈旧或不可解析版本时回源或拒绝。传播失败不修改 Published Version，也不得无 Audit 自动切回旧值。

Rollback 不移动旧 Active Pointer，也不编辑历史 Version；它以选定的不可变 Published Snapshot 创建带 `rollbackFromVersion` 的新 Draft，按当前 Schema 迁移后重新经历 Validation、Impact Preview、授权、全新 TOTP 与 Publish，形成更高版本。旧值不再满足 Schema、依赖或 Security Floor 时回滚必须拒绝。Policy 的 Publish/Rollback 只按 Effect Semantics 影响对象；Session 撤销、Model 停用、Attempt 取消或 Artifact 隔离使用各领域显式安全命令。

### 6.3 Stale Draft 与 Schema-aware Three-way Rebase

Stale Draft 只能在同一模块 Namespace + Scope 内由服务端进行 `Schema-aware Three-way Rebase`：以不可变 Base Snapshot、当前 Active Snapshot 和 Draft Candidate 分别计算 Base→Current 与 Base→Draft，并按 Typed Schema 稳定逻辑路径比较 Canonical Normalization。三者 Schema Revision 不同则先经模块注册的 Versioned Reader/Migrator 归一；缺少确定性迁移路径、Snapshot Hash 不匹配或任一输入不可解析时 Fail Closed。

自动合并只接受可证明无冲突的结果：仅 Current 修改保留 Current，仅 Draft 修改保留 Draft，双方规范化结果相同采用该值；同一逻辑值在双方产生不同结果时必须由 Owner 选择 Current、Draft 或符合 Typed Schema 的新值，禁止 Last-write-wins 或强制覆盖。Boolean、Number、Enum、Duration 等按稳定 Key 比较；List、Allowlist 与复杂 Object 默认整 Key 原子，只有所属模块提供确定性 Typed Merger 时才允许细粒度合并。合并后仍须通过完整模块校验。

Rebase 分为只读 Preview 与显式 Apply。Preview 绑定 Base/Current/Draft Version、Snapshot/Content Hash、Schema Revision 和 Draft Revision/ETag，并逐项展示三方值、候选与冲突原因；Apply 再检查 Owner、Super Admin 状态、ETag 与 Current Active Version，任一输入变化都返回 Conflict。Apply 生成新 Draft Revision、把 Base 更新为当时 Current Version，保留自动合并、人工选择和前后 Base 的 Draft History/Audit，并使既有 Validation、Impact Preview、Content Hash Binding 与 TOTP 全部失效；Rebase 不修改 Active Policy，也不自动 Publish，Apply 后必须重新完成服务端校验、Impact Preview 与全新 Publish TOTP。若 Current 再变化，Draft 重新进入 `STALE`。

### 6.4 Configuration Schema 兼容演进

Configuration Schema、Policy Snapshot 与应用版本必须执行 `EXPAND → MIGRATE/PUBLISH → CONTRACT`：

1. `EXPAND`：先部署同时读取当前与目标 Schema Revision 的版本，只增加 Key、Alias、Reader、Validator 或确定性 Migrator，不删除旧 Key、不改变旧值语义；目标 Snapshot 发布前行为保持旧 Policy 语义。
2. `MIGRATE/PUBLISH`：模块从旧不可变 Snapshot 生成 Typed Migration Draft，展示 Key Mapping、新增值、弃用项、行为变化、目标 Revision 与 Diff；每个模块 + Scope 仍按普通 ChangeSet 完成完整校验、Preview、原因、TOTP、Publish 与 Audit。Platform Scope 先完成兼容迁移，Workspace Draft 绑定明确父 Platform Version；多 Workspace 可批次编排，但各自独立原子发布。
3. `CONTRACT`：只有全部 Active Platform/Workspace Snapshot 已迁移、全部运行消费者声明支持目标 Revision、传播/读取验证通过，且部署回滚不会启动不支持当前 Snapshot 的旧镜像后，才可删除旧 Reader、Alias、Validator 或 Key。历史 Snapshot 不改写，由版本化 Reader/Migrator 用于历史查询与受控回滚。

模块必须声明每个应用版本支持的 Schema Revision 范围；Configuration Publish Gate 与 Kubernetes Rollout Gate 同时核对 Active Snapshot、目标版本和回滚镜像的支持范围，不兼容即阻止并展示模块、Scope、Snapshot Version、Revision 与修复动作。启动、Readiness 与普通请求不得自动创建 Published Version、切换 Pointer 或写回迁移；自动化只能生成 Draft、只读扫描和建议。无法解析 Active Snapshot、Hash 不一致或 Revision 越界时 Fail Closed、Readiness 失败并告警，禁止回退代码默认值、旧缓存或部分 Key；滚动升级期间必须保留兼容实例。迁移、扫描、阻断、覆盖率与 Contract 清理进入 Audit/Observability。

### 6.5 DEV→PROD Promotion 与签名 Bundle

DEV→PROD 只传递从 DEV 不可变 `PLATFORM_POLICY` Published ChangeSet 选择出的签名 Typed Change Intent。Promotion 不复制 PostgreSQL、数据库备份、Draft、运行时缓存、业务数据或 Secret，不建立 DEV→PROD 数据库连接、内部写 API、共享凭据、运行时读取或自动同步；Super Admin 在同一管理应用的 DEV 实例导出 Canonical JSON Bundle，并在独立 PROD 实例主动导入。

Bundle Manifest 至少包含 Format Version、全局 Bundle ID、Source Environment、稳定且不可复用的 Source Lineage ID、导出人/原因/服务端 UTC 时间、源应用版本、`issuedAt`、`notAfter`、完整性与签名信息；Item 至少包含稳定 Item ID、模块 Namespace、Source Scope Selector、Source Published Version、事务生成的严格单调 Source Published Sequence、Schema Revision、Base/Result Snapshot Hash、ChangeSet、规范化 Changed Keys 与前后摘要。Bundle 只表达 Base→Published 的变更意图；PROD 以自身 Active Snapshot 为基线应用明确 Changed Keys，未触及 Key 保持 PROD 当前值，源 Snapshot 不得成为 PROD Active Pointer。

每个 Key 的 Promotion Mode 由模块 Schema 固定为：`PORTABLE` 携带规范化值；`TARGET_REQUIRED` 只携带逻辑用途和源值摘要，并要求 PROD Reference Mapping；`BLOCKED` 不进入 Bundle。Workspace、Model Deployment、Provider、Project、Repository、Connector、Secret Reference 等引用必须使用稳定逻辑标识，禁止传 DEV 数据库 ID 或假设两环境 ID 相同。尚未完成目标映射时 Item 为 `MAPPING_REQUIRED`；目标不存在、类型/Scope 不符或映射不唯一时保持 `BLOCKED`。Promotion 不自动创建资源、不把 Workspace Override 提升为 Platform Scope。Secret 仅可用 `TARGET_REQUIRED` 用途绑定 PROD 本地 OpenBao Reference，并校验存在性、最小权限与健康，不传源值、Version 或 Lease。

DEV 使用 OpenBao 中不可导出的专用非对称 Promotion Signing Key，对 Canonical Manifest 与 Items 整体签名；Bundle 记录 Key ID、算法、Public Key Fingerprint、Payload SHA-256 与 Signature。PROD 只通过版本化 `GITOPS_CONFIG` 信任 DEV Public Key/Key ID，不持有共享 HMAC。格式、Canonical Hash、Signature、Source Environment、Lineage 或信任链任一无效时，在创建 Draft 前 Fail Closed 并记录拒绝 Audit；OpenBao、Signer、Canonicalization 或签名 Audit 不可用时 DEV Export 同样 Fail Closed。

Bundle 首次导入有效期默认 30 天；该期限是版本化 `PLATFORM_POLICY`，按 `NEW_OBJECT` 只影响后续导出，PROD 当前 Import Policy 可缩短但不可越过签名覆盖的 `notAfter`。首次成功验签并创建 Promotion Case 必须发生在 `notAfter` 前；过期 Bundle 不得续期或改写。有效期内创建的 Case、Draft 或 Published Version 不因 Bundle 后续到期失效，分别继续遵循 Draft 归档、Stale/Rebase、Publish 与 PROD Rollback Contract。

Signing Key 生命周期为 `PENDING → ACTIVE → VERIFY_ONLY → RETIRED`，DEV 同时只有一个 Active Signer，PROD 可在轮换窗口信任多个未撤销 Public Key。轮换顺序固定为：DEV OpenBao 生成新 Key Version；GitOps 先加入 PROD Trust Store；验签 Canary；切换 DEV Active Signer；旧 Key 进入 `VERIFY_ONLY`；待其最后 Bundle 超过 `notAfter` 与允许时钟偏差后移出活动 Trust Set 并 `RETIRED`。Key ID 不得原地换 Material；Retired Key 的 Fingerprint、算法、有效期和撤销状态作为只读历史验证材料保留，但不接受新的首次导入。

疑似泄露的 Key 立即停止签名并经紧急 GitOps 标记 `REVOKED`。PROD 拒绝该 Key 所有尚未首次导入的 Bundle；由其创建但未 Published 的 Case/Draft 转为安全阻断并要求用新 Key 从可信 DEV Version 重导。已 Published PROD Version 不自动回滚，而是产生 Critical 安全事件，列出 Bundle、Draft、发布人、Scope 与回滚入口。Key 创建、Trust Store 变更、Canary、切换、Verify-only、Retire、Revoke、过期拒绝和受影响 Case 都进入关联 Audit/Observability；Private Key Material 永不进入 PostgreSQL、Git、Bundle、日志或管理后台。

### 6.6 PROD Import、来源与顺序保护

当前有效 Super Admin 完成 Bundle 验证后创建 Promotion Case 并固化不可变 Manifest、Item、源 Hash 与签名证据，再按模块 Namespace + 目标 Scope 创建由导入人拥有的独立 PROD Draft；Bundle 可关联多个 Draft，但每个 Item 独立显示 Imported、Mapping Required、Blocked、Draft、Published 或 Failed，不形成跨模块/Scope 事务。Case 状态只能用带时间、操作者和原因的追加事件演进。Imported Draft 遵循普通 Owner、ETag、Takeover、Archive、Clone、Rebase、Validation、Preview、全新 Publish TOTP 与立即激活；Owner 可编辑目标 Schema 允许的已注册 `PLATFORM_POLICY` Key，但不得改写 Bundle/Item ID、Source Environment、Signature、Source Hash、模块 Namespace 或目标 Scope，不得注入未知 Key、Secret 明文、`GITOPS_CONFIG` 或 `SYSTEM_INVARIANT`，也不回写 DEV。改投 Scope 必须归档原 Draft，并从同一 Case 建立保留来源链的新 Item/Draft，重新做 Scope/Reference Mapping 与完整校验。

PROD Import 核对 Bundle Format、模块注册、Schema 支持范围、源应用兼容性、Promotion Mode、Scope/Reference Mapping、Item 完整性和当前基础设施 Envelope，再以 PROD Active Snapshot 生成 Candidate，并重新校验 PROD Schema、Security Floor、Scope 继承、跨字段约束、Reference Health 与 Effect Semantics；DEV Validation 不复用。Import、Mapping 与 Candidate 修正只产生 Draft，不改变 Active Policy，也不执行 Publish TOTP；全新 TOTP 只在最终 Publish 统一校验。管理后台并排展示 DEV Source、Imported Intent、PROD Current、Final Candidate、Origin Label、Override Reason 与预计影响。`Bundle ID + Item ID` 是幂等导入键，重复上传返回既有 Case 与结果；再次尝试只能从既有 Item 显式 Clone 新 Draft 并保留来源链，不得改写 ID 规避 Audit。签名/格式错误拒绝整包；已通过整包验证的 Bundle 中，单 Item 的 Schema、Mapping 或 Envelope 错误只阻断该 Item。

服务端按最终规范化 Candidate 计算不可由 Frontend 提交的逐 Key Origin Label：`PROMOTED_UNCHANGED` 表示 Portable Intent 未变，`TARGET_MAPPING` 表示 Target-required Reference 已在 PROD 解析，`PROD_OVERRIDE` 表示修改/移除 Portable Intent、选择不同 Current、加入 PROD-only/Blocked 后本地允许的非 Secret Key 或其他偏离。每个 `PROD_OVERRIDE` 在 Validation 前必须逐 Key 关联原因、操作者与时间；任何 Candidate 编辑使既有 Validation、Preview 与 Hash Binding 失效。Published Version 永久保存 Bundle/Item ID、DEV Source Version、Source Snapshot Hash、Origin Label 与 Override Reason；Clone/Rebase 继承来源链并重新计算 Label。

DEV 按 `Source Lineage ID + 模块 Namespace + Source Scope` 保存由 Published 事务生成的严格单调 Source Published Sequence，以及 Source Version、Snapshot Hash 和逐 Key Intent Hash；它不是时间戳、导出顺序或用户编号。PROD 按目标模块 + Scope + Key 保存最近成功 Promotion Publish 的 Lineage High-water Mark，包含 Lineage ID、Sequence、Source Version 与规范化 Intent Hash；只有 PROD Publish 成功的事务事实可前移该可重建投影，Import、Draft、Validation 或失败 Publish 不得前移。

完成验签、Schema 与 Mapping 后逐 Key 比较 High-water Mark：较小 Sequence 为 `SOURCE_SUPERSEDED`；相同 Sequence + 相同 Intent Hash 为 `SOURCE_ALREADY_PUBLISHED` 并返回既有来源链；相同 Sequence + 不同 Hash 为 `SOURCE_LINEAGE_CONFLICT` 并 Fail Closed；更大 Sequence 或无 Mark 才可继续。同一 Item 任一 Changed Key 命中前三种结果即整体不可发布，不得裁掉冲突 Key；在最终 Publish 事务内必须再次比较最新 Mark，并使并发落后的 Validation、Preview、Review Decision 与 TOTP 失效。PROD Rollback 不降低或重写 High-water Mark，旧 Bundle 不能充当回滚通道。

Source Lineage ID 在同一 DEV 世代的节点替换、升级、迁移、备份恢复、灾难恢复与 Signing Key 轮换中保持不变；Lineage、下一 Sequence 与 Published Version/Hash 连续性进入加密备份和恢复演练，缺失、回退或不一致时 Export Fail Closed。真正换源必须创建 `Source Lineage Rebind Case`：GitOps 声明旧/新 Lineage、授权模块/Scope、旧 Mark 与新 Baseline 摘要、旧/新 Signer 和原因，先把新 Lineage/Public Key 加入 `PENDING` Trust；PROD Super Admin 再导入签名的完整非 Secret Baseline，按模块 + Scope 独立完成 Mapping、Schema、Security Floor、Hash、Divergence、Preview、全新 TOTP 与 Publish，成功后初始化新 Mark 并切换 `ACTIVE`。

Rebind 生效期间目标单元进入 `REBINDING`：旧 Lineage 未 Published 的 Item/Draft/Mapping/Validation/Review/TOTP 转为只读 `SOURCE_LINEAGE_RETIRED`，新 Lineage 在 Baseline Publish 前不得提交增量。计划迁移要求旧 Signer 的 Transition Statement 与新 Signer 对同一切换内容的签名；旧源确实不可用时走记录恢复证据和安全原因的 Emergency Rebind，并完成全部目标单元 Baseline Reconciliation。每个单元切换后旧 Lineage `RETIRED`、新 Lineage `ACTIVE`；历史 Version、Mark、Key、Divergence 与 Audit 不改写。尚无单元切换成功时可经新 GitOps Review 取消 Rebind，但冻结 Draft 不复活；已切换任一单元后只能完成剩余单元或创建新 Rebind Case。

### 6.7 Promotion Divergence Review

Configuration 模块维护可从 Published Version、逐 Key Provenance 与 Outbox 重建的 `Promotion Divergence Projection`，回答 PROD 当前值为何不同于 `Latest Published DEV Intent Known to PROD`。该比较基线仅在有效 Bundle 对应 Item 已在 PROD 成功 Published 后前移；上传、Case、Mapping、Draft 或 Validation 不改变它。Projection 是只读查询加速层，不是配置事实源、跨环境同步服务或独立领域状态；Lag/Build Failure 必须可见且可安全重建，不影响 Active Policy 读取。

`PROMOTED_UNCHANGED` 不产生 Divergence，`TARGET_MAPPING` 的环境专属解析也不因目标 ID 或 Secret Reference 不同产生 Divergence；成功 Published 的 `PROD_OVERRIDE` 为相同模块 + Scope + Key 创建或更新唯一当前 `ACTIVE` Divergence，PROD-only/Blocked 后本地值使用 Absent/Non-portable 基线。每次相关 Promotion、普通 PROD Publish 或 Rollback 都按 Canonical Normalization/不可逆摘要重算：等价则转 `RESOLVED`，否则保持/更新 `ACTIVE`；历史 Published Version、原因和演进不删除。Secret 与敏感 Reference 仅显示 Redacted Metadata 或安全摘要。

新有效 DEV Intent 在完成 Scope/Reference Mapping 后触及同 Key 的 `ACTIVE` Divergence 时，该 Key 进入 `DIVERGENCE_REVIEW_REQUIRED`，任一 Key 未仲裁则 Item/Draft 同名阻断。Owner 必须逐 Key 基于 Previous Published DEV Intent、New Imported Intent、Current PROD Active Value、现有原因和版本差异显式选择：`ACCEPT_NEW_DEV`、`KEEP_CURRENT_PROD` 或 `SET_NEW_PROD_VALUE`。即使新 Intent 与 Current PROD 等价也必须显式选择；前者记录选择但不产生 Override Reason，后两者保持 `PROD_OVERRIDE` 并要求针对本次 Intent 的新原因，旧原因不得静默继承。

Review Decision 绑定 Previous/New Intent Hash、Current PROD Version/Value Hash、Schema Revision、Scope 和 Draft ETag；Bundle、PROD Publish/Rollback、Schema、Mapping、Rebase 或 Draft 内容任一变化都使 Decision 失效并返回 Review Required。Review 只是 Draft 编辑，不额外要求 TOTP；全部仲裁只生成 Candidate，只有完整 PROD Validation、Impact Preview 与最终 Publish 成功后才更新 Provenance/Projection 并 `RESOLVED` 或刷新 `ACTIVE`，失败不改变现有 Divergence。

`Promotion Divergence` 表示成功发布的有意环境差异，不等同 GitOps Drift、Reference Health、Kubernetes 故障或 Validation 失败，不触发自动回滚、DEV 回写、双向同步或故障告警。`Configuration → Promotion → Environment Differences` 仅向 Super Admin 提供只读查询，至少展示模块、Scope、Key、DEV Source Version、最近已知 DEV Intent、PROD Active Value、Override Reason、Published By、首次/最近变化时间与 `ACTIVE/RESOLVED`；Active 数量只能作为信息状态，历史记录保留可筛选。

`GITOPS_CONFIG` 继续通过 Git/Helm Review、Merge 与 Reconcile 提升，`SYSTEM_INVARIANT` 继续通过代码、数据库约束或受控架构变更演进；二者不得进入 Platform Policy Promotion Bundle。DEV Export 与 PROD Import、Mapping、Draft、Rebase、Review、Publish、Reject、Rollback 和 Rebind 分别记录 Audit，并通过 Bundle ID、Item ID、Source Snapshot Hash 与 PROD Published Version 关联；PROD Rollback 只使用本地不可变 Snapshot，不重新导入 DEV Bundle，也不反向修改 DEV。

## 7. External Provider Contract

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

## 8. Operations Read Model、Console 与安全公告

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

## 9. 不变量

1. DEV 与 PROD 同源但完全独立实例化，绝不共享 Web、gateway、Session、Control Plane、数据库、凭据或运行时状态。
2. 目标 Control Plane 的交付边界始终是模块化单体；独立 Deployable 与未来可提取模块均不得被描述为已存在的领域微服务。
3. 领域模块只依赖公开 Contract；Adapter 可替换，领域语义与私有数据边界不可被 Adapter 绕过。
4. Policy 发布权限、有效版本与快照可追溯；前端、脚本或旧缓存不能自行决定有效配置。
5. 外部状态的唯一导入形式是已验证、可去重、受时效约束的只读 Envelope，平台不接受 IaC、Shell、Provider Mutation 或任意 Callback。
