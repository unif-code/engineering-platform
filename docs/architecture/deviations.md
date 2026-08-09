# 治理例外记录

> 本文是已批准的目标契约偏差的唯一记录：目标契约（00～12 与附录）不因例外改写，每条例外必须写明偏离条款、实际做法、影响、关闭条件与状态，关闭后保留历史。新增或关闭例外后按 README 维护规则刷新架构基线清单。

## DEV-001：V0.1 DEV 备份与审计归档与集群同机

- **状态**：ACTIVE（2026-08-09 批准）
- **偏离条款**：[07](./07-data-messaging-storage.md) "`audit-worm` 与 Backup 类自 V0.1 起始终绑定 Cluster 外 OSS/S3-compatible Repository"；[09](./09-infrastructure-operations.md) "与被保护对象同故障域的备份等于没有备份"。
- **背景**：当前仅有一台 16C/64G 服务器、无云资源，外部对象存储尚未开通。
- **实际做法**：DEV 唯一服务器上以同机 MinIO 单实例充当过渡对象存储（`StorageBinding` gen-1：独立磁盘路径、启用 Versioning 与 Object Lock），承载组件 Backup 与 `audit-worm`。
- **影响**：S3 Contract、`StorageBinding`、备份与恢复机制照常实现并验证；唯一缺口是故障域隔离——服务器整机丢失时备份与审计归档随之丢失（DEV 无生产数据，风险已接受）。V0.1 Release Gate 的"备份真实恢复"按机制通过验收，故障域项以本例外记录。
- **对开发的影响**：无。应用只经 S3-compatible API 与 Binding 访问对象存储；纠偏时仅以新 Binding Generation 切换到真实 Cluster 外存储并迁移存量对象，代码与架构零改动。
- **关闭条件**：接入真实 Cluster 外 S3-compatible 存储（如阿里云 OSS）为 Binding gen-2，存量对象迁移或按保留策略自然到期；**最迟 V0.5 Production Candidate 验收前必须关闭，PROD 永不适用本例外**。
