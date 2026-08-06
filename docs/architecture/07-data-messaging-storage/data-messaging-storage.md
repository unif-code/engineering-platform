# 数据、消息与存储

> 文档层级：L1 架构地图
> 规范事实源：[数据、消息与存储详细说明](./data-messaging-storage-detail.md)

## 目标与边界

本视图定义 PostgreSQL、Valkey、NATS、Temporal 与 Ceph/Object Storage 的事实源、数据流、一致性和恢复关系。它不定义领域对象的状态机，也不定义应用调用边界；前者由 01–05 领域文档拥有，后者由 [平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md) 拥有。

DEV 是当前唯一实例化的 Platform Environment，当前仓库是 Umi Max 前端模板。下述数据服务和恢复关系是已批准的目标架构，不表示 CloudNativePG、Valkey、NATS、Temporal 或 Rook-Ceph 运行实例已经存在；未来 PROD 使用同一 Contract 与模板独立实例化。

安全密钥、加密和 Secret 机制只见 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)。Cluster、Node、组件版本、存储容量与环境参数只见 [基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)。

## 目标事实源地图

| 组件 | 拥有的事实 | 不可替代为 |
| --- | --- | --- |
| PostgreSQL | 领域关系事实、授权投影、配置版本、Outbox/Inbox、Audit 索引及效果账本 | Cache、消息或诊断数据 |
| Valkey | 可重建 Session 热索引、撤销索引、缓存、限流、幂等键与短期锁 | 权威身份、安全或业务事实 |
| NATS JetStream | 可靠命令/事件传输、Consumer 位置与短期重放 | 永久业务主存储 |
| Temporal | Durable Workflow 进度、Timer、Activity 与编排历史 | Requirement、Attempt 或授权主数据 |
| Ceph RGW/Object Storage | 版本化 Artifact、WORM Audit、应用一致性 Backup 与诊断对象 | Stateful 实时数据库 PVC |

## 数据流与一致性

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

PostgreSQL 是平台业务事实源。Valkey 不可用时，安全/一致性操作回查 PostgreSQL 或 Fail Closed。NATS 的 at-least-once 交付以 Outbox、Inbox 与 Effect Ledger 去重；Temporal 只保存编排控制元数据。对象仅在受控元数据、版本与访问规则存在时可作为业务证据。

## Stateful 与恢复关系

- CloudNativePG 经 PgBouncer 提供有界事务连接和应用一致性 PITR 恢复。
- Valkey 的热数据可从 PostgreSQL 与领域事实重建；它不承担唯一安全事实。
- NATS 以 Account Backup 恢复，再按 PostgreSQL Outbox watermark 安全重叠补发。
- Temporal 使用同环境 CloudNativePG 的独立持久化数据库；Workflow Code 与 Worker Build ID 维持版本兼容。
- Rook-Ceph RGW 提供 S3-compatible Bucket Class。PostgreSQL、Valkey、NATS、Temporal 等实时数据卷统一使用 `stateful-rwo-lowlatency`，不使用 Ceph RBD/CephFS。

DEV 与未来 PROD 使用同源 Contract、同类复制与恢复语义，但每个环境独立部署、备份和恢复，绝不共享数据、Bucket 或运行状态。当前恢复边界仅为单站点 Cluster HA 与 Cluster DR，不提供 Site DR 保证。

## 不变量

1. 业务写入先持久化 PostgreSQL 事实，再发布事件；消息、缓存、Telemetry 都不能反向成为业务真相。
2. 跨组件不存在分布式事务；重复交付、外部不确定结果与重试必须由幂等键、Inbox、Effect Ledger 和 Reconciler 收敛。
3. Ceph RGW 只承载 Object Storage；实时 Stateful PVC 只能使用低延迟 RWO StorageClass。
4. 保留清理由权威 Retention Reconciler 按精确对象版本执行，不能以归档/逻辑删除或未验证 GC 虚报可用空间。
5. 任一组件恢复均保留其权威恢复链；组件故障不得静默降级为丢失安全、审计或领域事实。
