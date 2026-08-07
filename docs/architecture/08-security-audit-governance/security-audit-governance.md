# 安全、审计与治理

> 文档层级：L1 架构地图
> 规范事实源：[安全、审计与治理详细说明](./security-audit-governance-detail.md)

## 目标与边界

本视图定义平台的安全 Trust Boundary、Secret、加密、PKI、供应链保护、不可篡改 Audit 与受限恢复控制。它为各业务模块和基础设施提供统一的安全 Contract，却不拥有人员、权限、Requirement、Agent、Sandbox、GitLab 或数据服务的领域状态。

DEV 是当前唯一实例化的 Platform Environment，当前仓库仍是 Umi Max 前端模板。Python Control Plane、数据服务、基础设施与 PROD 都是批准的目标架构，不表示已有对应运行实例。未来 PROD 使用同源代码、Contract、GitOps 与 PCS 在独立 Account、VPC 和 Cluster 中重新实例化；DEV 与 PROD 不共享运行实例、Session、数据、凭据、密钥或故障域。

身份、组织、Session、Capability 与 Super Admin 的业务语义由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有。应用 Console Access、External Provider Envelope 与公告流程由[平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)拥有；Configuration 生命周期和 Promotion 由 [Configuration Governance](../10-configuration-governance/configuration-governance-detail.md)拥有。数据服务恢复由[数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有；环境、Cluster 和运维基线由[基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)拥有。

## Security Floor

```text
Human / Workload Identity
  → 最小权限 Capability 或 Workload Policy
  → 短期凭据、受限网络与加密存储
  → 可验证的 Audit、告警与恢复证据
```

- 认证材料、Secret、Private Key、短期访问材料、Prompt 与源码正文不得进入 Frontend、日志、Trace、Metric Label 或 Audit 正文。
- Secret 只按工作负载、环境和用途最小化分发；业务代码、镜像、Git、Artifact、普通环境变量和持久卷不是 Secret 载体。
- 所有安全例外、恢复操作、Provider 信任材料变化和高权限动作都产生独立、追加式 Audit。
- 安全控制失去可信前提时，受保护操作 Fail Closed；诊断可见性不会被当作安全或业务事实。

## 控制域

| 控制域 | 目标能力 | 唯一事实源 |
| --- | --- | --- |
| 身份保护 | 密码验证材料、TOTP、Session 敏感值保护 | [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md) 与本文 detail |
| Secret 与 Workload Identity | OpenBao、Kubernetes Auth、Agent Injector、最小 Policy | 本文 detail |
| PKI 与传输信任 | 环境证书链、CRL、OCSP、Trust Bundle | 本文 detail |
| 数据服务访问 | PostgreSQL/PgBouncer、Valkey、NATS、Temporal 的传输、服务身份与最小访问 | 本文 detail |
| 数据静态加密 | Kubernetes Secret、Volume、Ceph/RGW Object 加密 | 本文 detail |
| 审计与供应链 | WORM Audit、文件扫描、镜像来源与签名 | 本文 detail |
| 环境与恢复 | Cluster、PCS、DR、容量和运维观测 | [09](../09-infrastructure-operations/infrastructure-operations-detail.md) |

## Audit 与治理

Audit 是独立于业务投影和 Telemetry 的追加式事实。它关联身份、时间、环境、目标、动作、结果、原因、版本与 Correlation ID，保留可验证的治理证据；它不承载可重放的认证材料或业务内容。

平台只读展示安全、配置、轮换、过期和恢复证据。Super Admin 的配置权限与带外恢复资格由 01 的授权 Contract 判定，Policy 发布过程由 [10](../10-configuration-governance/configuration-governance-detail.md)约束；平台管理后台不提供云资源、Kubernetes、Secret 或恢复材料的通用写入口。

## 信任与恢复顺序

环境的根信任、密钥环、恢复材料和数据恢复必须组成可验证链。恢复先恢复能够验证和解密控制面的外部材料，再恢复 OpenBao 与数据服务，最后开放工作负载；任何缺失的信任、密钥环、签名或 Audit 条件都会阻止受保护服务重新开放。

Provider 可观测状态和 Console 访问仅经受控 Contract 接入。Provider 的私钥不进入 Cluster；信任材料、回放防护证据和恢复验证由本文定义，Envelope 字段与 Ingest 算法仍由 06 定义。

## 不变量

1. 每个环境拥有独立的 Secret、PKI、加密材料、Audit、恢复包和信任边界。
2. 密码、TOTP、Token、Session、Private Key、完整 Presigned URL、Prompt 与源码正文永不进入不受保护的可观测性或 Audit 正文。
3. OpenBao Root、Break-glass、审计双写和加密恢复均以 Fail Closed 保护，不以便利性降低安全边界。
4. Audit 是独立追加式不可篡改事实；其 WORM 保存策略不由业务归档或对象逻辑删除替代。
5. Provider 信任材料与回放证据在灾难恢复后必须恢复并重新验证，不能重置为未知或空状态后继续接收数据。
