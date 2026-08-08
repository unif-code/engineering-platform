# 数据、消息与存储

## 1. 责任边界与数据原则

本文是 PostgreSQL、Valkey、NATS JetStream、Temporal Persistence、Rook-Ceph RGW/Object Storage、Artifact 存储、应用级 Backup、Retention、跨组件一致性和组件故障语义的唯一规范事实源。

领域状态仍由对应领域 owner 拥有，应用调用、Port/Adapter 和 Outbox 使用边界由 [平台应用与集成](./06-platform-application-integration.md)拥有；Typed Configuration 的生命周期、Snapshot 与 Promotion 协议由 [Configuration Governance](./10-configuration-governance.md)拥有，本文只规定其 PostgreSQL 持久化基线。本文不定义密钥、加密、Secret 或审计内容保护机制，统一链接 [安全、审计与治理](./08-security-audit-governance.md)；不定义 Cluster、Node、SKU、总容量、组件精确版本或环境容量，统一链接 [基础设施与运维](./09-infrastructure-operations.md)。

本文描述完整 Target Architecture，不声明任何环境已经部署 CloudNativePG、Valkey、NATS、Temporal、Rook-Ceph RGW 或 Backup/Retention 组件。实施阶段、Capability 激活状态、Release 验收与 Capacity Profile 选择只见[实施路线图](./12-implementation-roadmap.md)；环境实际拓扑由 GitOps Desired State、PCS 与运行证据证明。

PostgreSQL 是业务、权限、配置、版本、Outbox/Inbox、Effect Ledger 和可重建投影的权威关系事实源。Valkey、NATS、Temporal、对象存储、普通日志与指标均不能替代它。每个 Platform Environment 都有独立的组件、数据、Backup、Bucket 与恢复链；DEV 与 PROD 只共享同源 Contract，不共享运行时状态。

### 目标与边界

本视图定义 PostgreSQL、Valkey、NATS、Temporal 与 Ceph/Object Storage 的事实源、数据流、一致性和恢复关系。它不定义领域对象的状态机、应用调用边界或 Configuration 生命周期；它们分别由 01–05 领域文档、[平台应用与集成](./06-platform-application-integration.md)与 [Configuration Governance](./10-configuration-governance.md)拥有。

### 目标事实源地图

| 组件 | 拥有的事实 | 不可替代为 |
| --- | --- | --- |
| PostgreSQL | 领域关系事实、授权投影、配置版本、Outbox/Inbox、Audit 索引及效果账本 | Cache、消息或诊断数据 |
| Valkey | 可重建 Session 热索引、撤销索引、缓存、限流、幂等键与短期锁 | 权威身份、安全或业务事实 |
| NATS JetStream | 可靠命令/事件传输、Consumer 位置与短期重放 | 永久业务主存储 |
| Temporal | Durable Workflow 进度、Timer、Activity 与编排历史 | Requirement、Attempt 或授权主数据 |
| Ceph RGW/Object Storage | 版本化 Artifact、WORM Audit、应用一致性 Backup 与诊断对象 | Stateful 实时数据库 PVC |

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

### 1.1 Capability 激活与 Profile Contract

PostgreSQL 作为最早被业务 Capability 消费的权威事实源优先激活。Valkey 只在 Session 热索引、撤销索引、缓存或限流需要独立服务时激活；NATS 只在持久异步传输首次被消费时激活；Temporal 只在 Durable Workflow 首次被消费时激活；Object Storage 只在附件、Artifact、WORM Audit、组件 Backup 或 Observability Object 首次消费时激活。未被消费的组件不部署，不以占位实例、空 Stream、空 Bucket 或 Feature Toggle 宣称能力可用。

Launch Profile 可以为已启用组件选择单实例或最小拓扑，但每个实例必须同时满足：TLS 和最小 Workload Identity、显式硬 Resource Request/Limit 与存储/队列上限、Cluster 外 Backup、真实 Restore 验证、容量不足时拒绝或背压、依赖不可证明时 Fail Closed。单实例故障允许受影响能力安全停止，不能丢失已确认事实、伪造成功证据或回退到明文、匿名、无限资源和未受保护存储。

Hardened Target Profile 在相同数据语义上增加 Replica、Standby、Sentinel、Quorum、跨 Node 分散和更高恢复频率。下文标注为 Hardened Target 的拓扑不构成无条件部署要求；Profile 由 12 选择，09 校验 Aggregate Physical Ceiling、放置、PDB、Rollout 与 Headroom，07 只拥有组件数据、故障和恢复 Contract。

## 2. PostgreSQL 与连接边界

PostgreSQL 一经激活即使用独立 Schema/Role、有界连接、TLS、应用一致性 Backup/PITR、硬资源与存储 Ceiling，并在依赖或恢复链不可证明时 Fail Closed。Launch Profile 可使用单 Primary；其故障时停止数据库依赖能力，恢复验证完成前不开放写流量。

Hardened Target 使用 CloudNativePG 的一个 Primary 与两个 Standby，并采用 quorum-based synchronous replication：`method=any`、`number=1`、`dataDurability=required`、`failoverQuorum=true`。两个 Standby 都不可用时，不得自动降级为异步写入；Failover 候选必须证明包含全部已确认事务。

业务流量经 PgBouncer Transaction Pooling 进入数据库，Launch 可使用一个实例，Hardened Target 使用两个 Pod；所有连接池有界。只有 Alembic、DDL Job、DBA 或受控 Break-glass 可直连 rw service。模块拥有独立 Schema、迁移目录和数据访问账号，任何模块不得直接读写其他模块内部表。

CloudNativePG 通过 Barman Cloud Plugin、WAL Archive 与 S3-compatible `postgres-backup` Class 实现应用一致性 Backup/PITR。每个备份必须绑定环境、时间、版本、校验结果与恢复链；持续 WAL Archive 与 Base Backup 均需要可用 Headroom。恢复只能从经验证的 Base Backup + WAL 链进行，不能把任意 PVC/CSI Snapshot 声明为一致性数据库恢复源。恢复成功后需先验证数据与服务，再重新开放应用流量。

PostgreSQL 默认 `archive_timeout=5min`，每日执行 Physical Base Backup，使用 LZ4；DEV Recovery Window 为 7 天，PROD 为 30 天。PROD Cluster DR Candidate 在 `PGDATA <= 50 GiB` 时为 `RPO <= 5min`、`RTO <= 60min`。DEV 每月、PROD 每季度执行完整 Restore Drill，并以实测结果验证恢复链。Backup 的访问与保护机制只消费 [08 的有效 Security Contract](./08-security-audit-governance.md)。

PostgreSQL 与 PgBouncer 的 Hardened Target Component Envelope：

| 组件/环境 | Replica | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit | `shared_buffers` | 单 Pod PVC |
| --- | ---: | --- | --- | ---: | ---: |
| PostgreSQL DEV | 3 | 500m / 500m | 1 GiB / 1 GiB | 256 MB | 40 GiB |
| PostgreSQL PROD | 3 | 1 CPU / 1 CPU | 2 GiB / 2 GiB | 512 MB | 100 GiB |
| PgBouncer DEV | 2 | 50m / 250m | 64 MiB / 128 MiB | — | 无 |
| PgBouncer PROD | 2 | 100m / 500m | 128 MiB / 256 MiB | — | 无 |

Hardened Target 的三个 PostgreSQL Pod 在同一环境使用相同规格，CPU/Memory Request 与 Limit 相等以保持 Guaranteed QoS；三个 Data PVC 合计为 DEV `120 GiB`、PROD `300 GiB`。PgBouncer 是无状态连接层，不声明数据 PVC。Launch 与 Hardened 的有效 Resource Profile 均由 12 选择并进入 PCS，09 聚合验证物理 Ceiling、PDB 与 Rollout Headroom；任何 Profile 都禁止无 Request/Limit 的 BestEffort 数据实例。

## 3. Valkey

Valkey 只在对应 Capability Package 首次消费时激活。Launch Profile 可使用一个实例，但仍消费 [08 的有效 Data-Service Transport/Service Identity/Access Contract](./08-security-audit-governance.md)，使用 `noeviction`、AOF everysec、周期 RDB、硬 Memory Ceiling 与真实重建验证；实例故障时回源 PostgreSQL 或 Fail Closed。

Hardened Target 使用一个 Primary、两个 Replica 与三个 Sentinel（quorum=2）；业务仅使用 Sentinel-aware Client，禁止固定 Primary 地址或厂商私有配置。Replica/Sentinel 不改变 Valkey 仅保存可重建热数据的事实边界。

Valkey 仅保存可重建的 Session 热数据、撤销索引、缓存、限流、幂等键和短期锁。Session、安全和领域的权威事实始终保留在 PostgreSQL。缓存不可用、版本未知或安全写操作无法回源时，必须回查 PostgreSQL 或 Fail Closed；不得因 Valkey 故障放行陈旧授权、绕过撤销或将缓存内容升级为事实源。PVC 可用于快速恢复，但其丢失后的正确恢复方式是从权威事实重建。

Valkey 与 Sentinel 的 Hardened Target Component Envelope：

| 组件/环境 | Replica | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit | `maxmemory` | 单 Pod PVC |
| --- | ---: | --- | --- | ---: | ---: |
| Valkey DEV | 3 | 100m / 500m | 256 MiB / 512 MiB | 192 MiB | 5 GiB |
| Valkey PROD | 3 | 250m / 1 CPU | 512 MiB / 1 GiB | 384 MiB | 10 GiB |
| Sentinel DEV | 3 | 25m / 100m | 32 MiB / 64 MiB | — | 无 |
| Sentinel PROD | 3 | 50m / 200m | 64 MiB / 128 MiB | — | 无 |

每个 Valkey 数据实例使用独立 PVC；合计为 DEV `15 GiB`、PROD `30 GiB`。Sentinel 无状态且不声明数据 PVC。`maxmemory` 必须低于 Pod Memory Limit，为复制、AOF、Client 和内存碎片保留余量；达到上限时按 `noeviction` 拒绝新写并告警。

## 4. NATS JetStream、Outbox 与 Inbox

NATS JetStream 只在持久异步传输被对应 Capability Package 首次消费时激活。Launch Profile 可使用单节点 File Storage，但仍必须消费 [08 的有效 Data-Service Transport/Service Identity/Access Contract](./08-security-audit-governance.md)，执行 Stream 硬上限、Persist ACK、应用一致性 Account Backup、真实 Restore 和 Outbox Watermark 对账；节点故障时发布保留在 Outbox 并背压，不静默丢消息。

Hardened Target 使用三个节点、File Storage 与三副本 Quorum。每个 Deployable Unit 按 Publish/Subscribe Subject Allowlist 获得最小访问；平台和系统账号隔离，Sandbox 不获得 NATS 访问。

事件为 CloudEvents Structured JSON，命令为平台 `CommandEnvelope`；Subject 为：

```text
platform.{command|event|dlq}.{domain}.{message}.v{major}
```

每条消息限制为 256 KiB，大对象使用 Object Reference。首个 Stream Contract 固定为：

| Stream | Retention Policy | 时间规则 | `MaxBytes` | 满容量行为 |
| --- | --- | --- | ---: | --- |
| `PLATFORM_COMMANDS` | `WorkQueuePolicy` | 成功 ACK 后删除；未完成消息最多 7 天 | 1 GiB | `DiscardNew` 并告警 |
| `PLATFORM_EVENTS` | `LimitsPolicy` | 最多保留 30 天 | 5 GiB | `DiscardOld`，删除最旧消息 |
| `PLATFORM_DLQ` | `LimitsPolicy` | 最多保留 90 天 | 2 GiB | `DiscardNew` 并告警 |

时间与容量限制同时生效。`PLATFORM_COMMANDS` 和 `PLATFORM_DLQ` 满容量时发布失败必须显式返回，不能静默丢弃命令或失败证据；`PLATFORM_EVENTS` 的有界淘汰只服务于恢复和受控重放，业务事实仍从 PostgreSQL 重建。JetStream 不是无限历史库，DLQ 不自动 redrive；人工重放必须重新校验 Capability、Subject、Schema、目标 Consumer、Idempotency Request ID 和审计关系。

一致性流程固定为领域写入、Audit、Outbox 同一 PostgreSQL transaction 提交；Relay 收到 JetStream Persist ACK 后才标记发布；Consumer 先以 Inbox Unique Key 去重、成功提交业务效果后才 AckSync。传输是 at-least-once，Inbox 和 Effect Ledger 消除重复业务效果；外部副作用不确定时保留 `UNKNOWN/RECONCILIATION`，由 Reconciler 查询真实外部结果，禁止假设 exactly-once。

NATS 的权威恢复是应用一致性 Account Backup，而不是多个 PVC/CSI Snapshot。备份 Manifest 必须记录 Stream、消息/Consumer 配置与位置、Sequence 范围、Checksum、版本及对应 PostgreSQL Outbox Watermark。恢复先重建空集群并验证 Stream、Sequence、Consumer、Schema 与抽样 Payload，再从 Watermark 以安全重叠窗补发 Outbox，保留原 Envelope ID，由 Inbox/Effect Ledger 去重。

NATS 默认每日 `04:00 Asia/Shanghai` 执行应用一致性 Account Backup；前次任务未完成、完整性检查失败、空间不足或 Stream 配置正在变化时不得启动重叠任务。Backup Retention 为 DEV 3 天、PROD 7 天，已发布 Outbox 至少保留 30 天。DEV 每月、PROD 每季度执行完整 Restore Drill。Cluster DR 目标为 `RPO <= 5min`、`RTO <= 60min`；每日 Backup 周期不是消息 RPO，消息恢复还依赖 Outbox Watermark、安全重叠补发与幂等消费。Backup 的访问与保护机制只消费 [08 的有效 Security Contract](./08-security-audit-governance.md)。

NATS 的 Hardened Target Component Envelope：

| 环境 | Replica | 单 Node CPU Request / Limit | 单 Node Memory Request / Limit | Memory Store 上限 | File Store 上限 | 单 Node PVC |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| DEV | 3 | 100m / 500m | 256 MiB / 512 MiB | 128 MiB | 12 GiB | 20 GiB |
| PROD | 3 | 250m / 1 CPU | 512 MiB / 1 GiB | 128 MiB | 12 GiB | 20 GiB |

三个 NATS Node 各自使用独立 PVC，两个环境均合计 `60 GiB`。业务 Stream 只使用 File Store；20 GiB PVC 中最多 12 GiB 用于 File Store，其余空间保留给 RAFT、索引、Compaction、临时文件与恢复。

## 5. Temporal Persistence

Temporal 只在 Durable Workflow 被对应 Capability Package 首次消费时激活。Launch Profile 可让各 Server Role 和 Platform Orchestrator Worker 使用单 Replica，但 Durable Persistence、TLS/身份授权、Worker Build ID、硬 Resource Limit、恢复 Fencing 与端到端对账不得省略；故障时暂停长任务推进。

Temporal Server 的 Default Store 与 Visibility Store 使用同环境 CloudNativePG 中隔离的 `temporal` 与 `temporal_visibility` 数据库。Temporal 仅使用 ClusterIP，并消费 [08 的有效 Data-Service Transport/Service Identity/Access Contract](./08-security-audit-governance.md)；普通浏览器和 Sandbox 不具有 Temporal 访问资格。

Runtime Role 只做 DML，Schema 由短生命周期 DDL Job 管理。History 只保存 Workflow 的非敏感控制元数据，禁止写入源码、Prompt、Secret 或完整附件。Worker Build ID 与不可变应用镜像/Workflow Code 绑定；活动 Workflow 的版本演进通过显式兼容策略完成，不在发布期间静默替换。Temporal 的 Durable History 只解释编排推进，领域状态仍以 PostgreSQL owner 为准。

Temporal Persistence 恢复顺序固定为：先 Fence Temporal 写入入口与全部 SDK Worker；再对 Default/Visibility Store 执行 PostgreSQL PITR；随后以相同 Server、Schema、Shard 与 Namespace 配置启动 Temporal，验证 Visibility 查询和 Worker Build ID 映射；最后依据 PostgreSQL 领域事实、Outbox、Inbox 与 Effect Ledger 对账外部效果，确认无重复或遗漏后才重新开放 Worker。Persistence Database 的 RTO 不等于端到端 Workflow RTO；端到端恢复必须包含 Workflow/Visibility/Build ID/外部效果验证，并通过完整 Restore Drill 形成实测结果。

Temporal 的 Hardened Target Component Envelope：

| 组件 | 每环境 Replica | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit | 数据 PVC |
| --- | ---: | --- | --- | --- |
| Frontend | 2 | 250m / 1 CPU | 512 MiB / 1 GiB | 无 |
| History | 2 | 500m / 2 CPU | 1 GiB / 2 GiB | 无 |
| Matching | 2 | 250m / 1 CPU | 512 MiB / 1 GiB | 无 |
| Temporal System Worker | 2 | 250m / 1 CPU | 512 MiB / 1 GiB | 无 |
| Platform Orchestrator Worker | 2 | 250m / 1 CPU | 512 MiB / 1 GiB | 无 |
| Temporal UI / Console Access Adapter | 2 | 100m / 500m | 256 MiB / 512 MiB | 无 |

上述稳态 Request 合计约为 `3.2 CPU / 6.5 GiB`，Limit 合计约为 `13 CPU / 13 GiB`。四类 Temporal Server、Worker、UI 与 Adapter 均不声明独立数据 PVC；Durable Persistence 与 Grafana 状态一样计入同环境 PostgreSQL，不能在 ESSD BOM 中重复增加 Temporal 数据卷。发布还必须为四类 Server Surge 预留约 `1.25 CPU / 2.5 GiB` Request，并为一整组新 Platform Orchestrator Worker 预留 `500m CPU / 1 GiB` Request。

## 6. Object Storage、Bucket Class 与 Artifact

Object Storage 只在附件、Artifact、WORM Audit、组件 Backup 或 Observability Object 被对应 Capability Package 首次消费时激活。环境内 Object Storage 的目标实现即 Rook-Ceph RGW，Launch 与 Hardened Target 只在拓扑、副本与容量上不同；在 Rook-Ceph 尚未激活的早期单节点阶段，仅组件 Backup 允许使用 Cluster 外 OSS/S3-compatible Repository 作为过渡通道（阶段选择见[实施路线图](./12-implementation-roadmap.md)及其容量规划），该过渡通道不承载附件、Artifact、WORM Audit 或 Observability Object。Rook-Ceph 激活后新对象一律写入环境内 RGW；过渡 Repository 中的既有 Backup 按其保留策略继续可用于恢复，不自动回迁。无论处于哪个阶段与拓扑，S3-compatible API、版本化精确 Object Version、独立 Bucket Class、TLS/身份、加密、硬 Quota/Capacity Ledger、Backup/Restore、Retention 与 Fail Closed Contract 都不变；实现和拓扑不得降低已启用能力的证据判定。

Rook-Ceph RGW 是每环境的 S3-compatible Object Storage，职责仅限 Object Storage；它不为 PostgreSQL、Valkey、NATS、Temporal 或其他实时 Stateful Workload 提供 RBD/CephFS。实时 PVC 一律使用逻辑 StorageClass `stateful-rwo-lowlatency`，其 Provider Mapping、Node 和容量由 [09](./09-infrastructure-operations.md)拥有。

Bucket Class 固定为：

```text
requirement-attachments  agent-artifacts  audit-worm  postgres-backup
nats-backup              openbao-recovery observability-logs observability-traces
```

每个 Class 使用独立 Policy、Versioning、Retention、Quota 与 Capacity Ledger，并服从 [08 的权威 Security Contract](./08-security-audit-governance.md)。Prefix 不能替代 Bucket 级隔离；同一 Class 中的物理 Bucket 必须划分互斥配额，Class Usage 汇总当前/非当前 Version、Object Lock、Delete Marker、Multipart、GC 延迟和元数据估算。

Environment Bucket-Class Capacity Ledger 是 Class 准入的权威运行账本。每个 Class 的版本化参数至少包含 `operatingQuotaBytes`、`emergencyMarginBytes`、`admissionCeilingBytes`、各物理 Bucket 的互斥 `rgwMaxSizeBytes` 分区、基于对象分布证据生成的 `rgwMaxObjects` 以及 Desired/Effective Revision；同一 Class 的物理分区之和不得超过其 `admissionCeilingBytes`。精确数值和 Ceph Raw Envelope 由[环境容量与服务器规划](./appendix-parameters.md#容量与服务器规划)唯一拥有，[09](./09-infrastructure-operations.md)只验证其物理放置、Aggregate Ceiling 与 Headroom。

Class Usage 使用保守的 logical stored bytes 口径，聚合全部物理 Bucket/Cluster 实例的 Current Version、Noncurrent Version、受 Lock/Retention 保护对象、Delete Marker/Index、已上传和已预占 Multipart、尚未完成 GC 的对象与标准化 Metadata/Overhead 估算。Ledger、RGW Stats、Cluster Raw 平均值和最满 OSD 分别保留自身单位与阈值；任一 Gate 更危险时取更严格结果，禁止挑选更宽松口径或直接混算 logical/raw bytes。

每次写入或 Backup 预占依次验证 Product Quota（适用时）、Class Operating/Admission、物理 RGW Size/Object Guard、Cluster Raw 与最满 OSD Gate。Class 的 30 天预测按“当前全部占用 + p95/p99 预期写入 + Locked/Multipart 上界 - 已由权威 Reconciler 证明可安全释放的对象”计算；未验证 Backup、只有 Delete Marker 的 Version、失败 Reconcile 和未完成 GC 不得计作可回收。任一 Gate 失败统一返回容量维度 `STORAGE_CAPACITY`，保留失败 Gate、Class、Effective Revision 与 Reservation ID，并触发 Operations Incident；不能把它混同为产品维度 `ARTIFACT_QUOTA`。

Bucket Class 的对象保护矩阵固定为：

| Bucket Class | Versioning / Object Lock | 保留与清理语义 |
| --- | --- | --- |
| `requirement-attachments` | 启用 Versioning；普通对象默认不加 Lock | 当前不进行已接受业务数据的物理清理；只允许未完成 Multipart 与无业务引用 `ORPHANED` 精确 Version 的技术垃圾清理 |
| `agent-artifacts` | 启用 Versioning；绑定 Decision、Acceptance、Merge 或 Release 的精确版本使用 `GOVERNANCE` Lock | 当前不进行已接受业务数据的物理清理；只允许未完成 Multipart 与无业务引用 `ORPHANED` 精确 Version 的技术垃圾清理 |
| `audit-worm` | 启用 Versioning；365 天 `COMPLIANCE` Lock | 08 唯一定义 Retention、Legal Hold/调查冻结与策略级删除资格；本模块只执行已获资格的精确 Version 操作 |
| `postgres-backup` | 启用 Versioning；近期 Backup Object 默认 7 天 `GOVERNANCE` Lock | 还须满足 DEV 7 天、PROD 30 天 Recovery Window 与完整 Base Backup + WAL 恢复链 |
| `nats-backup` | 启用 Versioning；`GOVERNANCE` Lock 覆盖 DEV 3 天、PROD 7 天有效 Backup Retention | 仍须保留可恢复 Account Backup、Manifest 与 Outbox 对账链 |
| `openbao-recovery` | 启用 Versioning；默认 7 天 `GOVERNANCE` Lock | 使用离线 OpenPGP；保留与对应 Shamir/Seal Generation、Manifest 和恢复演练共同判定 |
| `observability-logs` | 由 Loki Backend 管理对象版本与 Retention，不使用通用 Reconciler 直接删除 | Loki 索引一致性与 09 的 Log Retention 决定清理 |
| `observability-traces` | 由 Tempo Backend 管理对象版本与 Retention，不使用通用 Reconciler 直接删除 | Tempo Block/索引一致性与 09 的 Trace Retention 决定清理 |

`GOVERNANCE` Lock 不授予普通服务 Retention Bypass；`COMPLIANCE` Lock 不可由 Super Admin、Reconciler 或普通运维缩短。任何 Class 的 Prefix 都不能替代独立 Bucket、Credential、Quota、Encryption 或 Retention Boundary。

Artifact 以 PostgreSQL 保存元数据、引用、Object Version、访问状态与配额预占，以 RGW 保存对象本体。附件或 Agent Artifact 的归档、逻辑删除、Requirement 恢复状态变化都不释放对象容量；仅在其领域 owner 明确的引用、状态和保留条件满足后才可能改变存储引用。上传和下载仅能由应用授权签发短期、精确版本的 Presigned Request。文件检查由应用 `FileSecurityPort` 处理：需要扫描的对象只有合格 Verdict 才可用；由 02/08 的版本化 Source/Media Policy 合法跳过扫描的受信内部纯文本可在完整性验证后不带 Verdict 进入 `AVAILABLE`。本模块不决定扫描分支、Verdict 或 Artifact 业务状态。

Requirement Attachment 与 Agent Artifact 在开始上传前，必须为精确 Object Version 在同一受控准入事务中同时预占 Product Quota Ledger 和 Environment Bucket-Class Capacity Ledger；任何一侧失败都不形成可用预占。两本账本由同一个存储准入 owner 模块在其自有 Schema 内持久化，双账本预占因此是该模块的单模块本地事务，不违反[平台应用与集成](./06-platform-application-integration.md)的单模块事务边界；Product Quota 额度值与 Bucket-Class 容量参数仍分别按其 Policy owner 的 Effective Snapshot 与容量 Contract 只读解析，预占事务不改写其他模块拥有的数据。物理 RGW native quota 只作为最后后备保护，不能替代双账本准入。达到产品额度返回 `ARTIFACT_QUOTA`；达到 Bucket Class 或 Raw Capacity 边界返回 `STORAGE_CAPACITY` 并创建 Operations Incident。提高产品配额不能突破 Environment Capacity、08 Security Contract 或 File Security Scanner Envelope。

## 7. Backup、Retention 与 Reconciler

Backup 是组件自己的应用一致性恢复链：CloudNativePG 使用 Base Backup + WAL，NATS 使用 Account Backup + Outbox 对账，Temporal 随其 PostgreSQL Persistence 恢复。对象 Backup Job 在上传前必须预检并原子预占目标 Bucket Class 的 working set 与 Version/Lock 放大；空间不足时形成 Backup/RPO Degraded Incident，不得上传半份“成功 Backup”、缩短恢复窗口或借用 Audit Emergency Margin。

目标默认恢复边界是单站点 Cluster DR，不提供 Zone、Region、Account 或 Site DR 保证。DEV 不是 PROD Standby；每个环境独立执行 Backup、Restore 与 Drill。

`Object Retention Reconciler` 只清理 `audit-worm`、`postgres-backup`、`nats-backup` 和 `openbao-recovery` 中超过各自权威保留期的精确 Object Version。对于 `audit-worm`，08 owner 先依据 Audit Retention、Legal Hold/调查冻结与 Security Floor 产生策略级资格，本模块不得重新解释或缩短；对象执行还必须证明 Object Lock 已到期且无恢复/业务引用。Backup 类别还须证明存在满足 Recovery Window 和恢复链的更新有效副本。每次判定、拒绝、删除、失败和 GC 验证均追加 Audit。Reconciler 使用专用最小权限身份，不具备 Retention Bypass、跨 Bucket 或通配 Prefix 删除能力。

无法完整证明资格、Manifest/索引不一致、删除失败或 GC 未验证时，对象继续计入容量，不能仅因逻辑 Retention 到期扣减。当前已经被业务接受的 `requirement-attachments` 与 `agent-artifacts` 只做归档、逻辑删除和引用治理，不进入业务数据物理清理；归档、逻辑删除或 Requirement 恢复均不释放 Object Storage 容量。未完成 Multipart Abort 与无业务引用的 `ORPHANED` 技术垃圾仍可按精确 Object Version 受控清理。Loki/Tempo 的对象由各自 Backend Retention 清理，Reconciler 不得绕过其索引一致性。Bucket Class Operating Quota、底层 Enforcement 和容量扩展由版本化 `GITOPS_CONFIG`/Environment Capacity Profile 约束，管理后台只读显示。

## 8. 一致性与故障语义

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

任何组件故障、恢复或重放必须保留 Correlation ID、版本、影响范围和可审计结果。诊断数据可以有其独立 Retention 和降级策略，但不得影响业务、Audit、Backup 或 Artifact 的权威事实。

## 9. 不变量

1. PostgreSQL 是唯一的业务权威关系事实；Cache、Bus、Workflow History、日志与指标都不是替代品。
2. 业务效果只在 Outbox/Inbox/Effect Ledger 能证明幂等时重试；不确定的外部结果不得被标记为成功。
3. Temporal、NATS 与 Object Storage 都只保存各自职责内的数据，不能承接跨领域主状态。
4. RGW 只提供对象服务，`stateful-rwo-lowlatency` 承载实时 Stateful RWO 数据；二者不混用。
5. Retention 与恢复始终以精确版本、经验证 Manifest 和有效恢复链判定，归档或逻辑删除从不等同于物理释放。
6. Valkey、NATS、Temporal 与 Object Storage 只在对应 Capability Package 首次消费时激活；未启用组件不部署，已启用组件不得省略 TLS、身份、硬资源上限、Backup/Restore 或 Fail Closed。
7. 跨组件不存在分布式事务；重复交付、外部不确定结果与重试必须由幂等键、Inbox、Effect Ledger 和 Reconciler 收敛。
8. 任一组件恢复均保留其权威恢复链；组件故障不得静默降级为丢失安全、审计或领域事实。
