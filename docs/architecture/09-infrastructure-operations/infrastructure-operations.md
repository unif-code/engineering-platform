# 基础设施与运维

> 文档层级：L1 架构地图
> 规范事实源：[基础设施与运维详细说明](./infrastructure-operations-detail.md)

## 目标与边界

本视图定义平台的 Cloud Environment、Kubernetes、Node、网络、存储拓扑、可观测性、Cluster DR、容量和 TCO Contract。它不拥有业务状态、Secret、加密、Audit、Artifact、数据服务恢复算法或外部状态导入算法。

DEV 是当前唯一实例化的 Platform Environment，当前仓库仍是 Umi Max 前端模板。Python Control Plane、数据服务、基础设施和 PROD 都是批准的目标架构，不表示已有对应运行实例。未来 PROD 从同源代码、Contract、GitOps 和 PCS 在独立 Account、VPC、Cluster 中重新实例化；DEV 与 PROD 不共享运行实例、Session、数据、凭据、密钥或故障域。

安全、PKI、Secret、加密和 Audit 由[安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)拥有；数据服务及组件恢复由[数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md)拥有；运行状态投影、Console 和外部 Feed 由[平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)拥有。

## 环境隔离

```text
DEV Environment                         Future PROD Environment
独立 Account / VPC / Cluster            独立 Account / VPC / Cluster
独立 GitOps/IaC State                   独立 GitOps/IaC State
独立入口、数据、密钥与备份               独立入口、数据、密钥与备份
          同源代码、Contract、GitOps 模板与 PCS
```

每个环境绑定不可变 `CloudEnvironmentBinding` Generation。Management Account 只承载治理，不承载平台运行资源、平台数据或恢复材料；环境间无默认网络互通。治理面异常不是已运行请求的同步依赖。

## Cluster 平台基线

每个环境使用自管 Kubernetes 和四类专用 Node Role：`k8s-control-plane`、`platform-worker`、`sandbox-worker` 与 `storage-worker`。Control Plane、数据服务、Sandbox、存储与观测工作负载通过 Taint、Affinity、PDB、Topology 和 NetworkPolicy 保持隔离。

平台北向入口使用 Gateway API；Kubernetes API 使用 Cluster 外 Private L4 NLB TCP 6443 passthrough，并由 API Server 自己提供 TLS。Sandbox 使用不可变的 Kata/KVM 专用节点，不能回退到不满足隔离要求的 Runtime。

## 运维与可观测性

OpenTelemetry 是统一遥测协议。Prometheus/Thanos Query、Alertmanager、Grafana、Loki、Tempo、Hubble 与 Operations Adapter 形成精简高可用后端；它们只产生诊断事实，不修改业务、授权、Audit、配置或恢复事实。

平台管理后台只读展示当前环境的 Baseline、有效配置、Health、容量、告警、Gap、Drift、Backup/Restore 和 Runbook。复杂查询通过 06 的受控新标签页 Console Access 打开，后台不提供恢复写操作、敏感材料或基础设施通用控制面。

## 高可用、DR 与容量

当前承诺为单站点 Cluster HA 与 Cluster DR，不承诺 Zone、Region、Account 或 Site DR；DEV 不是 PROD Standby。组件数据恢复以 07 为准，信任与解密恢复顺序以 08 为准。

首个环境容量 Contract 为 DEV 12 个 Node、未来 PROD 15 个 Node，并保留 Sandbox 的 N+1 余量。精确 Region、Zone、SKU、价格和折扣都是部署输入；它们在通过 PCS 与 Provisioning Gate 后才进入只读 TCO Snapshot。

## 不变量

1. 环境间不共享 Account、VPC、Cluster、IaC State、入口、数据、Session、凭据、密钥、备份或故障域。
2. 任何环境实施都以 `CloudEnvironmentBinding + PCS + Capacity Profile` 的可验证组合为准，不以页面或手工参数替代。
3. Cluster DR 是当前恢复边界；组件级数据、信任材料和 Cluster 级恢复分别遵循 07、08 与本文的 Contract。
4. 可观测性与管理看板是只读诊断面，不能反写业务事实、IaC Desired State、Secret 或恢复流程。
5. Region、Zone、SKU、价格和折扣是部署输入，不能被描述为已固化的业务架构事实。
