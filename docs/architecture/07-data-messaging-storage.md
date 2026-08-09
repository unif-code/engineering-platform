# 数据、消息与存储

> 实施阶段、Capability 激活状态、Release 验收与 Capacity Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义 PostgreSQL、Valkey、NATS JetStream、Temporal Persistence 与 Rook-Ceph RGW/Object Storage 的事实源划分、数据流与跨组件一致性，以及 Artifact 对象与配额账本、应用级 Backup、Retention 执行和组件故障恢复语义。PostgreSQL 是业务、权限、配置、版本、Outbox/Inbox、Effect Ledger 与可重建投影的权威关系事实源；Valkey、NATS、Temporal、对象存储、日志与指标都不能替代它。每个 Platform Environment 拥有独立的组件、数据、Backup、Bucket 与恢复链，DEV 与 PROD 只共享同源 Contract，不共享运行时状态。

本文不拥有领域对象的状态机、应用调用与 Port/Adapter 边界、Typed Configuration 的生命周期与 Promotion、密钥/加密/Secret/Audit 保护机制，也不拥有 Cluster、Node、组件版本与总容量；它们分别属于 [01](./01-identity-organization-authorization.md)～[05](./05-source-control-delivery.md)、[06](./06-platform-application-integration.md)、[10](./10-configuration-governance.md)、[08](./08-security-audit-governance.md) 与 [09](./09-infrastructure-operations.md)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。本文只规定 Typed Configuration 的 PostgreSQL 持久化基线；数据服务的传输、工作负载身份与最小访问只消费 [08](./08-security-audit-governance.md) 的有效 Contract，本文只拥有拓扑、数据语义与恢复。

精确参数不在正文：各组件的 Replica、CPU/Memory、PVC、Stream 与消息上限、Backup 调度、Retention Window、RPO/RTO 与 Restore Drill 周期见[参数附录的组件资源包络](./appendix-parameters.md#组件资源包络)，Bucket Class 容量参数与 Ceph Raw Envelope 见[参数附录的容量规划](./appendix-parameters.md#容量与服务器规划)，容量与配额维度的结构化错误码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 事实源地图

| 组件 | 拥有的事实 | 不可替代为 |
| --- | --- | --- |
| PostgreSQL | 领域关系事实、授权投影、配置版本、Outbox/Inbox、Audit 索引及效果账本 | Cache、消息或诊断数据 |
| Valkey | 可重建 Session 热索引、撤销索引、缓存、限流、幂等键与短期锁 | 权威身份、安全或业务事实 |
| NATS JetStream | 可靠命令/事件传输、Consumer 位置与短期重放 | 永久业务主存储 |
| Temporal | Durable Workflow 进度、Timer、Activity 与编排历史 | Requirement、Attempt 或授权主数据 |
| Object Storage（Cluster 外 Repository 与 Ceph RGW） | 版本化 Artifact、WORM Audit、应用一致性 Backup 与诊断对象 | Stateful 实时数据库 PVC |

### 数据流与一致性

```text
领域命令
→ PostgreSQL 单模块事务（领域事实 + Audit + Outbox）
→ NATS JetStream Persist ACK
→ Inbox / Effect Ledger 幂等消费
→ Temporal 或外部 Adapter 推进长任务

Artifact / Backup / Audit Object
→ Object Storage 版本化对象
→ 元数据、引用、配额与状态仍由 PostgreSQL 维护
```

事件为 CloudEvents Structured JSON，命令为平台 `CommandEnvelope`，Subject 固定为 `platform.{command|event|dlq}.{domain}.{message}.v{major}`；单条消息有硬上限，超限内容只以 Object Reference 传递。业务 Stream 固定为命令、事件与 DLQ 三类：`PLATFORM_COMMANDS` 使用 `WorkQueuePolicy` 并在成功 ACK 后删除，`PLATFORM_EVENTS` 与 `PLATFORM_DLQ` 使用 `LimitsPolicy` 的有界时间窗；时间与容量限制同时生效，命令与 DLQ 满容量按 `DiscardNew` 显式失败，事件 Stream 的 `DiscardOld` 只服务恢复与受控重放。

### Capability 激活与 Profile

PostgreSQL 作为最早被业务 Capability 消费的权威事实源优先激活；Valkey、NATS、Temporal 与 Object Storage 分别在 Session 热索引/撤销索引/缓存/限流、持久异步传输、Durable Workflow，以及附件/Artifact/WORM Audit/组件 Backup/Observability Object 首次被消费时激活。

Launch Profile 可以为已启用组件选择单实例或最小拓扑，Hardened Target 在相同数据语义上增加 Replica、Standby、Sentinel、Quorum、跨 Node 分散与更高恢复频率。有效 Profile 由 [12](./12-implementation-roadmap.md) 选择并进入 PCS，[09](./09-infrastructure-operations.md) 验证 Aggregate Physical Ceiling、放置、PDB、Rollout 与 Headroom。

### 组件恢复链

```text
PostgreSQL   经验证 Base Backup + 连续 WAL 链 → 数据与服务验证 → 重新开放写流量
NATS         应用一致性 Account Backup + Manifest → 空集群重建并验证 Stream / Sequence /
             Consumer / Schema / 抽样 Payload → 从 Outbox Watermark 安全重叠补发
             → 保留原 Envelope ID，由 Inbox / Effect Ledger 去重
Temporal     Fence 写入入口与全部 Worker → Default / Visibility Store 的 PostgreSQL PITR
             → 同 Server / Schema / Shard / Namespace 配置启动并验证 Visibility 与 Build ID
             → 依领域事实、Outbox、Inbox 与 Effect Ledger 对账外部效果 → 重新开放 Worker
Object       精确 Object Version + 经验证 Manifest → 引用、Lock 与保留资格判定 → 受控执行
```

每个 Backup Manifest 必须绑定环境、时间、版本、校验结果与恢复链引用；NATS Manifest 还绑定 Stream、消息/Consumer 配置与位置、Sequence 范围与对应 PostgreSQL Outbox Watermark。Backup 的访问与保护机制只消费 [08](./08-security-audit-governance.md) 的有效 Security Contract。

### Bucket Class 与对象保护

Object Storage 的目标实现是每环境的 Rook-Ceph RGW，职责仅限 S3-compatible 对象服务；实时 Stateful PVC 一律使用逻辑 StorageClass `stateful-rwo-lowlatency`，其 Provider Mapping、Node 与容量由 [09](./09-infrastructure-operations.md) 拥有。每个 Bucket Class 在每个环境绑定版本化 `StorageBinding`（`storageBindingId + generation`，绑定目标 Endpoint/Bucket、凭据引用、加密与 Object Lock 能力证明），对象元数据记录写入时的 Binding Generation，读取与删除按记录的 Binding 定位：`audit-worm` 与 Backup 类（`postgres-backup`、`nats-backup`、`openbao-recovery`）自 V0.1 起始终绑定 Cluster 外 OSS/S3-compatible Repository——Cluster 外 Backup 与 WORM 审计归档不因 Rook-Ceph 激活迁回集群内；`requirement-attachments` 与 `agent-artifacts` 在 Rook-Ceph 激活前同样绑定该 Cluster 外 Repository 作为受完整 Contract 约束的过渡 Primary（Observability Object 仍按 [09](./09-infrastructure-operations.md) 推迟），激活后以新 Binding Generation 写入环境内 RGW，既有对象按原 Binding 继续可读、可恢复而不自动回迁。无论处于哪个阶段与拓扑，S3-compatible API、精确 Object Version、独立 Bucket Class、TLS/身份、加密、硬 Quota/Capacity Ledger、Backup/Restore、Retention 与 Fail Closed Contract 都不变。Bucket Class 固定为下表八类，每类使用独立 Policy、Credential、Quota 与 Capacity Ledger：

| Bucket Class | Versioning / Object Lock | 保留与清理语义 |
| --- | --- | --- |
| `requirement-attachments` | 启用 Versioning；普通对象默认不加 Lock | 不物理清理已接受业务数据；只允许未完成 Multipart 与无业务引用 `ORPHANED` 精确 Version 的技术垃圾清理 |
| `agent-artifacts` | 启用 Versioning；绑定 Decision、Acceptance、Merge 或 Release 的精确版本使用 `GOVERNANCE` Lock | 同上 |
| `audit-worm` | 启用 Versioning；长期 `COMPLIANCE` Lock | Retention 期限、Legal Hold/调查冻结与策略级删除资格由 [08](./08-security-audit-governance.md) 判定；本模块只执行已获资格的精确 Version 操作 |
| `postgres-backup` | 启用 Versioning；近期 Backup Object 使用 `GOVERNANCE` Lock | 还须满足各环境 Recovery Window 与完整 Base Backup + WAL 恢复链 |
| `nats-backup` | 启用 Versioning；`GOVERNANCE` Lock 覆盖有效 Backup Retention | 仍须保留可恢复 Account Backup、Manifest 与 Outbox 对账链 |
| `openbao-recovery` | 启用 Versioning；`GOVERNANCE` Lock | 使用离线 OpenPGP；与对应 Shamir/Seal Generation、Manifest 和恢复演练共同判定 |
| `observability-logs` | 由 Loki Backend 管理对象版本与 Retention | Loki 索引一致性与 [09](./09-infrastructure-operations.md) 的 Log Retention 决定清理 |
| `observability-traces` | 由 Tempo Backend 管理对象版本与 Retention | Tempo Block/索引一致性与 [09](./09-infrastructure-operations.md) 的 Trace Retention 决定清理 |

### 一致性与故障语义

| 组件或场景 | 语义与处置 |
| --- | --- |
| PostgreSQL Standby/Failover 不满足同步确认 | 停止不安全写入；不降级异步确认 |
| PgBouncer 不可用 | 拒绝新业务连接，等待连接层恢复；不绕过连接边界 |
| Valkey 不可用 | 回源 PostgreSQL 或 Fail Closed；可重建热数据 |
| JetStream 投递重复/Relay 重试 | Inbox/Effect Ledger 幂等；保留原 Envelope 关系 |
| NATS 不可用或满容量 | Outbox 保留待发，受控告警/背压；不丢失已提交领域事实 |
| Consumer/外部 Effect 结果不确定 | 标记 `UNKNOWN/RECONCILIATION`，由 Reconciler 查询收敛 |
| Temporal 不可用 | 暂停长任务推进，恢复后依据 Durable History 与领域事实继续；不改写业务状态 |
| RGW 或其必需 Security Contract 不可用 | 对象读写 Fail Closed；不得产生未受保护或未版本化对象 |
| Backup Headroom/锁定对象不足 | 形成容量与 RPO 风险，阻止不安全备份，不删除受保护副本 |
| Retention Reconciler 失败 | 对象继续占用并告警，禁止乐观释放空间 |

## 关键不变量

- PostgreSQL 是唯一的业务权威关系事实源，Cache、消息、Workflow History、对象存储、日志与指标都不得承接跨领域主状态——只有单一权威关系事实才能给恢复与审计一个确定基准。
- 每个 Platform Environment 拥有独立组件、数据、Backup、Bucket 与恢复链，DEV 不是 PROD Standby，各环境独立执行 Backup、Restore 与 Drill——环境是可验证的故障域，共享任何运行状态都会让隔离失效。
- 组件只在对应 Capability Package 首次被消费时激活，未启用组件不部署，也不以占位实例、空 Stream、空 Bucket 或 Feature Toggle 宣称能力可用——半启用会让能力判定失去证据。
- 已启用组件无论 Profile 都必须具备 TLS 与最小 Workload Identity、显式硬 Request/Limit、存储与队列上限、Cluster 外 Backup、真实 Restore 验证、容量不足时拒绝或背压，以及依赖不可证明时 Fail Closed——Launch 的单实例只降低可用性目标，不降低安全与证据门槛。
- 单实例故障允许受影响能力安全停止，但不得丢失已确认事实、伪造成功证据或回退到明文、匿名、无限资源与未受保护存储——服务可以重启，被伪造的证据无法恢复。
- 业务流量经 PgBouncer Transaction Pooling 进入 PostgreSQL 且所有连接池有界，只有 Alembic、DDL Job、DBA 与受控 Break-glass 可直连 rw service——连接边界同时是资源保护与审计入口。
- 每个模块拥有独立 Schema、迁移目录与数据访问账号，任何模块不得直接读写其他模块内部表；Schema 迁移按 `EXPAND → MIGRATE → CONTRACT` 推进，回滚镜像必须仍能读取当前数据形态——数据边界是模块可提取性与责任归属的前提，先收缩的迁移会毁掉回退能力。
- Hardened Target 的 PostgreSQL 使用 quorum 同步复制，Standby 不足时不得自动降级为异步写入，Failover 候选必须证明包含全部已确认事务——降级确认等于悄悄放弃已经承诺的持久性。
- 数据库恢复只能来自经验证的 Base Backup 与连续 WAL 链，不得把任意 PVC/CSI Snapshot 声明为一致性数据库恢复源，且恢复后先验证数据与服务再开放应用流量——块级快照是崩溃一致而不是应用一致的。
- Valkey 只保存可重建的 Session 热索引、撤销索引、缓存、限流、幂等键与短期锁；缓存不可用、版本未知或安全写无法回源时必须回查 PostgreSQL 或 Fail Closed，绝不放行陈旧授权、绕过撤销或把缓存升级为事实源；内存达到上限时按 `noeviction` 拒绝新写并告警而不淘汰既有键——可重建数据一旦被当作权威，撤销与授权就会静默失效，而静默淘汰幂等键与短期锁会直接破坏一致性保证。
- 业务只使用 Sentinel-aware Client，不固定 Primary 地址或依赖厂商私有配置；PVC 可用于快速恢复，但其丢失后的正确恢复方式是从权威事实重建——拓扑冗余不应要求业务改写代码，也不应把缓存副本升级为备份。
- 领域写入、Audit 与待发布消息在同一 PostgreSQL 单模块事务原子提交，Relay 取得 JetStream Persist ACK 后才标记已发布，Consumer 先以 Inbox 唯一键去重并在业务效果提交后才 AckSync——事实与其证据必须同生同灭。
- 传输是 at-least-once，Inbox 与 Effect Ledger 负责消除重复业务效果，外部副作用不确定时保留 `UNKNOWN/RECONCILIATION` 并由 Reconciler 查询真实外部结果，禁止假设 exactly-once——未证明的外部效果按未完成处理。
- 跨组件不存在分布式事务，重复交付、外部不确定结果与重试只能由幂等键、Inbox、Effect Ledger 与 Reconciler 收敛——假设分布式原子性只会把不一致推迟到恢复时暴露。
- 命令与 DLQ Stream 满容量时发布失败必须显式返回，不得静默丢弃命令或失败证据；事件 Stream 的有界淘汰只服务恢复与受控重放，业务事实仍从 PostgreSQL 重建——JetStream 不是无限历史库。
- DLQ 不自动 redrive，人工重放必须重新校验 Capability、Subject、Schema、目标 Consumer、Idempotency Request ID 与审计关系——重放是一次新的受控动作，不是原动作的延续。
- NATS 的权威恢复是应用一致性 Account Backup 及其绑定 Outbox Watermark 的 Manifest，而不是多个 PVC/CSI Snapshot；补发使用安全重叠窗并保留原 Envelope ID——只有幂等去重成立时重叠补发才是安全的。
- 前次 Backup 未完成、完整性检查失败、空间不足或 Stream 配置正在变化时不得启动重叠 Backup 任务；每日 Backup 周期不是消息 RPO——半份备份与错误的 RPO 假设都会在真实恢复时失败。
- 每个 Deployable Unit 只按 Publish/Subscribe Subject Allowlist 获得最小消息访问，平台与系统账号隔离，Sandbox 不获得 NATS 访问（Contract 属 [08](./08-security-audit-governance.md)）——最小主题范围是消息面越权的唯一有效边界。
- Temporal 的 Default 与 Visibility Store 使用同环境 PostgreSQL 中隔离的 `temporal` 与 `temporal_visibility` 数据库，Runtime Role 只做 DML 而 Schema 由短生命周期 DDL Job 管理——编排存储不额外引入第二套持久化技术与权限模型。
- Temporal History 只保存 Workflow 的非敏感控制元数据，禁止写入源码、Prompt、Secret 或完整附件，Durable History 只解释编排推进而领域状态仍以其 owner 为准——编排历史不是业务事实的第二来源，也不是敏感内容的容器。
- Worker Build ID 与不可变应用镜像/Workflow Code 绑定，活动 Workflow 的版本演进只经显式兼容策略完成，不在发布期间静默替换——静默替换会让运行中的编排语义漂移。
- 组件恢复必须按上述恢复链执行，Persistence Database 的 RTO 不等于端到端 Workflow RTO，端到端恢复必须包含 Workflow/Visibility/Build ID/外部效果验证并通过完整 Restore Drill 形成实测结果——未对账就重新开放 Worker 会重复执行外部副作用。
- RGW 只提供对象服务，实时 Stateful RWO 数据一律使用 `stateful-rwo-lowlatency`，二者不混用——对象恢复与实时数据库延迟不能互相拖累。
- Environment Bucket-Class Capacity Ledger 是 Class 准入的权威运行账本，每个 Class 使用独立 Policy、Versioning、Retention、Quota 与版本化容量参数，其物理 Bucket 划分互斥配额且分区之和不得超过该 Class 的准入上限；Prefix 不能替代 Bucket 级隔离、Credential、加密或 Retention 边界——共享前缀会让任一越权读写扩散到全部类别，而超额分区会让准入 Gate 允许物理上放不下的写入。
- Class Usage 使用保守的 logical stored bytes 口径，聚合当前/非当前 Version、受 Lock 保护对象、Delete Marker/Index、已上传与已预占 Multipart、未完成 GC 的对象与标准化元数据估算；Ledger、RGW Stats、Cluster Raw 与最满 OSD 各自保留单位与阈值，任一 Gate 更危险时取更严格结果——挑选更宽松口径或混算 logical/raw bytes 会让容量准入失去意义。
- 每次写入或 Backup 预占依次验证 Product Quota（适用时）、Class Operating/Admission、物理 RGW Size/Object Guard、Cluster Raw 与最满 OSD Gate；Class 的 30 天预测按“当前全部占用 + p95/p99 预期写入 + Locked/Multipart 上界 − 已由权威 Reconciler 证明可安全释放的对象”计算，未验证 Backup、只有 Delete Marker 的 Version、失败 Reconcile 与未完成 GC 都不得计作可回收——乐观回收会在真实写入时耗尽容量。
- 容量维度失败与产品配额维度失败是两个不同错误码：容量失败保留失败 Gate、Class、Effective Revision 与 Reservation ID 并触发 Operations Incident，提高产品配额也不能突破 Environment Capacity、[08](./08-security-audit-governance.md) 的 Security Contract 或 File Security Scanner Envelope——把容量问题当作配额问题会让扩容决策失去依据。
- Requirement Attachment 与 Agent Artifact 在开始上传前，必须为精确 Object Version 在同一受控准入事务中同时预占 Product Quota Ledger 与 Environment Bucket-Class Capacity Ledger，任何一侧失败都不形成可用预占；两本账本由同一个存储准入 owner 在其自有 Schema 内持久化，因此该双账本预占是单模块本地事务而不违反[平台应用与集成](./06-platform-application-integration.md)的事务边界，额度与容量参数仍分别按其 Policy owner 的 Effective Snapshot 只读解析；物理 RGW native quota 只作为最后后备保护，不能替代双账本准入——两本账同时成立才能既守住产品承诺又守住物理容量，同 owner 持久化让它无需分布式事务，而后备保护无法产生可解释、可审计的业务拒绝原因。
- Artifact 以 PostgreSQL 保存元数据、引用、Object Version、访问状态与配额预占，以当前 `StorageBinding` 指向的对象存储保存对象本体；上传与下载只能由应用授权签发绑定精确版本的短期 Presigned Request——对象访问必须由业务授权判定，而不是由谁持有 URL 决定。
- 文件检查由应用 `FileSecurityPort` 处理，需要扫描的对象只有合格 Verdict 才可用，由 [02](./02-requirement-workflow.md)/[08](./08-security-audit-governance.md) 的版本化 Source/Media Policy 合法跳过扫描的受信内部纯文本可在完整性验证后不带 Verdict 进入可用状态；本模块不决定扫描分支、Verdict 或 Artifact 业务状态——存储执行与业务判定必须分属不同 owner。
- 归档、逻辑删除与 Requirement 恢复都不释放 Object Storage 容量，已被业务接受的附件与 Agent Artifact 不进入业务数据物理清理，只有未完成 Multipart Abort 与无业务引用的 `ORPHANED` 技术垃圾可按精确 Object Version 受控清理——逻辑状态变化不等于物理释放。
- `Object Retention Reconciler` 只清理 Audit 与 Backup 类 Bucket 中超过各自权威保留期的精确 Object Version：`audit-worm` 的策略级资格由 [08](./08-security-audit-governance.md) 产生且不得被重新解释或缩短，对象执行还须证明 Object Lock 已到期且无恢复/业务引用，Backup 类还须证明存在满足 Recovery Window 与恢复链的更新有效副本；Reconciler 使用专用最小权限身份，不具备 Retention Bypass、跨 Bucket 或通配 Prefix 删除能力；`GOVERNANCE` Lock 不授予普通服务 Retention Bypass，`COMPLIANCE` Lock 也不可由 Super Admin、Reconciler 或普通运维缩短——删除权限必须小于它可能造成的损失，可被绕过的保留期不是保留期。
- 无法完整证明资格、Manifest/索引不一致、删除失败或 GC 未验证时，对象继续计入容量并告警，不能仅因逻辑 Retention 到期扣减——账面释放会让容量 Gate 基于虚假余量放行。
- 对象 Backup Job 在上传前必须预检并原子预占目标 Bucket Class 的 working set 与 Version/Lock 放大，空间不足时形成 Backup/RPO Degraded Incident，不得上传半份"成功 Backup"、缩短恢复窗口或借用 Audit Emergency Margin——被削弱的备份比没有备份更危险，因为它看起来是绿色的。
- 目标默认恢复边界是单站点 Cluster DR，不提供 Zone、Region、Account 或 Site DR 保证——不承诺未经演练验证的恢复能力。
- 任何组件故障、恢复或重放都保留 Correlation ID、版本、影响范围与可审计结果；诊断数据可以有独立 Retention 与降级策略，但不得影响业务、Audit、Backup 或 Artifact 的权威事实——可观测性是辅助证据，不是事实源。
- Bucket Class Operating Quota、底层 Enforcement 与容量扩展由版本化 `GITOPS_CONFIG`/Environment Capacity Profile 约束，管理后台只读显示——运行时容量边界不能由业务后台改写。

## 与其他模块的关系

下表是本模块自身视角：07 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链中权威数据、消息、缓存与对象事实的持久化基线 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | Session、撤销索引与授权投影的领域语义及回源判定条件 | Session 热索引、撤销索引、缓存与限流的可重建承载，以及回源与 Fail Closed 的缓存基线 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Artifact 业务状态、扫描分支结果与对象引用条件 | Artifact 对象、Object Version、双账本预占、技术垃圾清理与 Retention 执行 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | Attempt 日志、评测与执行证据的 Artifact 引用条件 | Artifact 对象、消息投递与 Temporal/NATS 运行支撑 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 需持久化的执行证据及其校验 Hash | Artifact 对象与 Checkpoint、日志、构建证据的存储 Contract |
| [05 Source Control 与交付](./05-source-control-delivery.md) | Evidence 引用的 Artifact Hash 与外部 Effect 的可对账事实 | Artifact 对象与 Object Version、Inbox/Outbox 与 Effect Ledger 的持久化基线 |
| [06 平台应用与集成](./06-platform-application-integration.md) | 应用侧的单模块事务、Outbox/Inbox/Effect Ledger 一致性 Contract 与 Object Reference 传递约束 | PostgreSQL、Valkey、NATS、Temporal 与 Object Storage 的运行与恢复事实、Outbox/Inbox 持久化基线 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | 数据服务的传输/工作负载身份/最小访问 Contract、静态与对象加密、Object Lock 语义、Audit Retention 与 Legal Hold 资格 | 数据服务拓扑与恢复链、`audit-worm` 与 `openbao-recovery` 的对象版本、容量计入与精确删除执行 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Cluster、Node、StorageClass Provider Mapping、物理放置与 Aggregate Physical Ceiling、Cluster DR 与 Log/Trace Retention | 组件数据、故障与恢复 Contract，以及 Bucket Class 与 Backup 的容量账本证据 |
| [10 Configuration Governance](./10-configuration-governance.md) | Draft、Effective Snapshot 与 Promotion 的通用配置生命周期语义 | Typed Configuration、版本与 Activation Record 的 PostgreSQL 持久化基线 |
| [12 实施路线图](./12-implementation-roadmap.md) | 当前阶段的 Capability 激活状态、Release 验收记录与 Capacity Profile 选择 | 组件数据、一致性与恢复必须证明的 Contract，供 Release Gate 引用 |
| [参数附录](./appendix-parameters.md) | 组件资源包络、Bucket Class 容量参数与结构化错误码 | 本文正文中的定性规则 |
