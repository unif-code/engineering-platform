# 数据、消息与存储

> 文档层级：L1 架构地图
> 规范事实源：[数据、消息与存储详细说明](./data-messaging-storage-detail.md)

## 目标与边界

本视图定义 PostgreSQL、Valkey、NATS、Temporal 与 Ceph/Object Storage 的事实源、数据流、一致性和恢复关系。它不定义领域对象的状态机、应用调用边界或 Configuration 生命周期；它们分别由 01–05 领域文档、[平台应用与集成](./06-platform-application-integration.md)与 [Configuration Governance](./10-configuration-governance.md)拥有。

下述数据服务和恢复关系构成完整 Target Architecture，不声明任何环境中的实际组件或拓扑。实施阶段、Capability 激活状态、Release 验收与 Capacity Profile 选择只见[实施路线图](./12-implementation-roadmap.md)；环境实际运行状态由 GitOps Desired State、PCS 与运行证据证明。

安全密钥、加密和 Secret 机制只见 [安全、审计与治理](./08-security-audit-governance.md)。Cluster、Node、组件版本、存储容量与环境参数只见 [基础设施与运维](./09-infrastructure-operations.md)。

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

## 激活顺序与 Profile 边界

- PostgreSQL 是最早激活的权威事实源；任何业务 Capability 都不能以 Valkey、NATS、Temporal 或 Object Storage 替代其领域事实。
- Valkey、NATS、Temporal 与 Object Storage 只在对应 Capability Package 首次消费其 Contract 时激活；未被消费的组件不部署空实例，也不构造并行事实源。
- Launch Profile 允许已启用组件采用单实例或最小拓扑，但必须同时具备 Backup/Restore、TLS、最小 Workload Identity、硬 Resource Request/Limit 与容量上限、可验证恢复和 Fail Closed；单实例只降低无感连续性，不降低数据、安全和证据判定。
- Replica、Standby、Sentinel、Quorum、跨节点 Anti-affinity 和完整组件 HA 属于 Hardened Target Profile。何时选择 Profile 由 12 决定，09 只校验其物理 Ceiling、放置与 Headroom。

## Stateful 与恢复关系

- PostgreSQL 经有界连接层提供事务连接和应用一致性 PITR 恢复；Hardened Target 使用 CloudNativePG Standby 与 PgBouncer 冗余。
- Valkey 的热数据可从 PostgreSQL 与领域事实重建；它不承担唯一安全事实。
- NATS 以 Account Backup 恢复，再按 PostgreSQL Outbox watermark 安全重叠补发。
- Temporal 使用同环境 CloudNativePG 的独立持久化数据库；Workflow Code 与 Worker Build ID 维持版本兼容。
- Rook-Ceph RGW 提供 S3-compatible Bucket Class。PostgreSQL、Valkey、NATS 的实时数据卷统一使用 `stateful-rwo-lowlatency`，不使用 Ceph RBD/CephFS；Temporal Server 本身无独立数据 PVC，其 Durable Persistence 位于同环境 PostgreSQL。

DEV 与 PROD 使用同源 Contract，但每个环境独立部署、备份和恢复，绝不共享数据、Bucket 或运行状态。Launch Profile 不承诺单点故障下无感继续；Hardened Target 再提供完整组件 HA。目标默认恢复边界为单站点 Cluster DR，不提供 Site DR 保证。

## 不变量

1. 业务写入先持久化 PostgreSQL 事实，再发布事件；消息、缓存、Telemetry 都不能反向成为业务真相。
2. 跨组件不存在分布式事务；重复交付、外部不确定结果与重试必须由幂等键、Inbox、Effect Ledger 和 Reconciler 收敛。
3. Ceph RGW 只承载 Object Storage；实时 Stateful PVC 只能使用低延迟 RWO StorageClass。
4. 保留清理由权威 Retention Reconciler 按精确对象版本执行，不能以归档/逻辑删除或未验证 GC 虚报可用空间。
5. 任一组件恢复均保留其权威恢复链；组件故障不得静默降级为丢失安全、审计或领域事实。
6. 未被 Capability Package 首次消费的 Valkey、NATS、Temporal 或 Object Storage 保持未激活；一旦启用就必须满足该组件完整安全、容量与恢复 Contract。
