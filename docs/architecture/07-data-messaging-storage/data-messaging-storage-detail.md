# 数据、消息与存储详细说明

> 文档层级：L2 规范事实源
> 对应主文：[数据、消息与存储](./data-messaging-storage.md)

## 1. 责任边界与数据原则

本文是 PostgreSQL、Valkey、NATS JetStream、Temporal Persistence、Rook-Ceph RGW/Object Storage、Artifact 存储、应用级 Backup、Retention、跨组件一致性和组件故障语义的唯一规范事实源。

领域状态仍由对应领域 owner 拥有，应用调用、Port/Adapter 和 Outbox 使用边界由 [平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)拥有。本文不定义密钥、加密、Secret 或审计内容保护机制，统一链接 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)；不定义 Cluster、Node、SKU、总容量、组件精确版本或环境容量，统一链接 [基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)。

PostgreSQL 是业务、权限、配置、版本、Outbox/Inbox、Effect Ledger 和可重建投影的权威关系事实源。Valkey、NATS、Temporal、对象存储、普通日志与指标均不能替代它。每个 Platform Environment 都有独立的组件、数据、Backup、Bucket、证书和恢复链；DEV 与 PROD 只共享同源 Contract，不共享运行时状态。

## 2. PostgreSQL 与连接边界

每环境使用 CloudNativePG 的一个 Primary 与两个 Standby，并采用 quorum-based synchronous replication：`method=any`、`number=1`、`dataDurability=required`、`failoverQuorum=true`。两个 Standby 都不可用时，不得自动降级为异步写入；Failover 候选必须证明包含全部已确认事务。

业务流量经两个 PgBouncer Transaction Pooling Pod 进入数据库；所有连接池有界。只有 Alembic、DDL Job、DBA 或受控 Break-glass 可直连 rw service。模块拥有独立 Schema、迁移目录和数据访问账号，任何模块不得直接读写其他模块内部表。

CloudNativePG 通过 Barman Cloud Plugin、WAL Archive 与 S3-compatible `postgres-backup` Class 实现应用一致性 Backup/PITR。每个备份必须绑定环境、时间、版本、校验结果与恢复链；持续 WAL Archive 与 Base Backup 均需要可用 Headroom。恢复只能从经验证的 Base Backup + WAL 链进行，不能把任意 PVC/CSI Snapshot 声明为一致性数据库恢复源。恢复成功后需先验证数据与服务，再重新开放应用流量。

## 3. Valkey

每环境 Valkey 使用一个 Primary、两个 Replica 与三个 Sentinel（quorum=2），经 TLS/mTLS、ACL、Sentinel-aware Client 访问；禁止业务固定 Primary 地址或厂商私有配置。使用 `noeviction`、AOF everysec 与周期 RDB，以避免在内存回收时无提示丢弃关键热状态。

Valkey 仅保存可重建的 Session 热数据、撤销索引、缓存、限流、幂等键和短期锁。Session、安全和领域的权威事实始终保留在 PostgreSQL。缓存不可用、版本未知或安全写操作无法回源时，必须回查 PostgreSQL 或 Fail Closed；不得因 Valkey 故障放行陈旧授权、绕过撤销或将缓存内容升级为事实源。PVC 可用于快速恢复，但其丢失后的正确恢复方式是从权威事实重建。

## 4. NATS JetStream、Outbox 与 Inbox

NATS JetStream 每环境使用三个节点、File Storage、三副本；所有客户端与 Route 使用 TLS。每个 Deployable Unit 使用独立服务身份，按 Publish/Subscribe Subject Allowlist 最小授权；平台和系统账号隔离，Sandbox 不获得 NATS 网络或凭据。

事件为 CloudEvents Structured JSON，命令为平台 `CommandEnvelope`；Subject 为：

```text
platform.{command|event|dlq}.{domain}.{message}.v{major}
```

每条消息限制为 256 KiB，大对象使用 Object Reference。Command Stream 使用 WorkQueue 语义；Event 与 DLQ 使用有限的时间/容量保留。满容量行为必须显式显示为拒绝或有界淘汰，不能把 JetStream 当作无限历史库。DLQ 不自动 redrive；人工重放必须重新校验 Capability、Subject、Schema、目标 Consumer、Idempotency Request ID 和审计关系。

一致性流程固定为领域写入、Audit、Outbox 同一 PostgreSQL transaction 提交；Relay 收到 JetStream Persist ACK 后才标记发布；Consumer 先以 Inbox Unique Key 去重、成功提交业务效果后才 AckSync。传输是 at-least-once，Inbox 和 Effect Ledger 消除重复业务效果；外部副作用不确定时保留 `UNKNOWN/RECONCILIATION`，由 Reconciler 查询真实外部结果，禁止假设 exactly-once。

NATS 的权威恢复是应用一致性 Account Backup，而不是多个 PVC/CSI Snapshot。备份 Manifest 必须记录 Stream、消息/Consumer 配置与位置、Sequence 范围、Checksum、版本及对应 PostgreSQL Outbox Watermark。恢复先重建空集群并验证 Stream、Sequence、Consumer、Schema 与抽样 Payload，再从 Watermark 以安全重叠窗补发 Outbox，保留原 Envelope ID，由 Inbox/Effect Ledger 去重。

## 5. Temporal Persistence

Temporal Server 的 Default Store 与 Visibility Store 使用同环境 CloudNativePG 中隔离的 `temporal` 与 `temporal_visibility` 数据库。Temporal 仅使用 ClusterIP，服务间通信使用 mTLS；SDK Client 除证书外使用受控 Machine Identity，普通浏览器和 Sandbox 不持有 Temporal Credential。

Runtime Role 只做 DML，Schema 由短生命周期 DDL Job 管理。History 只保存 Workflow 的非敏感控制元数据，禁止写入源码、Prompt、Secret 或完整附件。Worker Build ID 与不可变应用镜像/Workflow Code 绑定；活动 Workflow 的版本演进通过显式兼容策略完成，不在发布期间静默替换。Temporal 的 Durable History 只解释编排推进，领域状态仍以 PostgreSQL owner 为准。

## 6. Object Storage、Bucket Class 与 Artifact

Rook-Ceph RGW 是每环境的 S3-compatible Object Storage，职责仅限 Object Storage；它不为 PostgreSQL、Valkey、NATS、Temporal 或其他实时 Stateful Workload 提供 RBD/CephFS。实时 PVC 一律使用逻辑 StorageClass `stateful-rwo-lowlatency`，其 Provider Mapping、Node 和容量由 [09](../09-infrastructure-operations/infrastructure-operations-detail.md)拥有。

Bucket Class 固定为：

```text
requirement-attachments  agent-artifacts  audit-worm  postgres-backup
nats-backup              openbao-recovery observability-logs observability-traces
```

每个 Class 使用独立 Credential、Policy、Versioning、Retention、Encryption、Quota 与 Capacity Ledger。Prefix 不能替代 Bucket 级隔离；同一 Class 中的物理 Bucket 必须划分互斥配额，Class Usage 汇总当前/非当前 Version、Object Lock、Delete Marker、Multipart、GC 延迟和元数据估算。安全凭据、Object 加密与 `openbao-recovery` 的恢复材料约束只见 [08](../08-security-audit-governance/security-audit-governance-detail.md)。

Artifact 以 PostgreSQL 保存元数据、引用、Object Version、访问状态与配额预占，以 RGW 保存对象本体。附件或 Agent Artifact 的归档、逻辑删除、Requirement 恢复状态变化都不释放对象容量；仅在其领域 owner 明确的引用、状态和保留条件满足后才可能改变存储引用。上传和下载仅能由应用授权签发短期、精确版本的 Presigned Request。文件检查由应用 `FileSecurityPort` 处理；只有合格 Verdict 的对象可进入可用业务状态，具体业务状态由其领域 owner 决定。

## 7. Backup、Retention 与 Reconciler

Backup 是组件自己的应用一致性恢复链：CloudNativePG 使用 Base Backup + WAL，NATS 使用 Account Backup + Outbox 对账，Temporal 随其 PostgreSQL Persistence 恢复。对象 Backup Job 在上传前必须预检并原子预占目标 Bucket Class 的 working set 与 Version/Lock 放大；空间不足时形成 Backup/RPO Degraded Incident，不得上传半份“成功 Backup”、缩短恢复窗口或借用 Audit Emergency Margin。

`Object Retention Reconciler` 只清理 `audit-worm`、`postgres-backup`、`nats-backup` 和 `openbao-recovery` 中超过各自权威保留期的精确 Object Version。删除前必须同时证明：Object Lock/Retention 到期、无 Legal Hold/调查/恢复/业务引用，且 Backup 类别仍有满足 Recovery Window 和恢复链的更新有效副本。每次判定、拒绝、删除、失败和 GC 验证均追加 Audit。Reconciler 使用专用最小权限身份，不具备 Retention Bypass、跨 Bucket 或通配 Prefix 删除能力。

无法完整证明资格、Manifest/索引不一致、删除失败或 GC 未验证时，对象继续计入容量，不能仅因逻辑 Retention 到期扣减。Loki/Tempo 的对象由各自 Backend Retention 清理，Reconciler 不得绕过其索引一致性。Bucket Class Operating Quota、底层 Enforcement 和容量扩展由版本化 `GITOPS_CONFIG`/Environment Capacity Profile 约束，管理后台只读显示。

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
| RGW/对象加密路径不可用 | 对象读写 Fail Closed；不得回退明文或未版本化写入 |
| Backup Headroom/锁定对象不足 | 形成容量与 RPO 风险，阻止不安全备份，不删除受保护副本 |
| Retention Reconciler 失败 | 对象继续占用并告警，禁止乐观释放空间 |

任何组件故障、恢复或重放必须保留 Correlation ID、版本、影响范围和可审计结果。诊断数据可以有其独立 Retention 和降级策略，但不得影响业务、Audit、Backup 或 Artifact 的权威事实。

## 9. 不变量

1. PostgreSQL 是唯一的业务权威关系事实；Cache、Bus、Workflow History、日志与指标都不是替代品。
2. 业务效果只在 Outbox/Inbox/Effect Ledger 能证明幂等时重试；不确定的外部结果不得被标记为成功。
3. Temporal、NATS 与 Object Storage 都只保存各自职责内的数据，不能承接跨领域主状态。
4. RGW 只提供对象服务，`stateful-rwo-lowlatency` 承载实时 Stateful RWO 数据；二者不混用。
5. Retention 与恢复始终以精确版本、经验证 Manifest 和有效恢复链判定，归档或逻辑删除从不等同于物理释放。
