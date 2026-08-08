# 基础设施与运维

> 文档层级：L1 架构地图
> 规范事实源：[基础设施与运维详细说明](./infrastructure-operations-detail.md)

## 目标与边界

本视图定义完整 Target Architecture 中的 Platform Environment、Cloud Boundary、Kubernetes、逻辑 Node Role、物理放置、网络、存储拓扑、Observability、Cluster DR、容量准入与 TCO Contract。它不记录环境已部署状态，也不拥有业务状态、Secret、加密、Audit、Artifact、数据服务恢复算法、Release 版本、Environment Promotion、Profile 选择或人数容量矩阵。

[实施路线图](./12-implementation-roadmap.md)唯一拥有 Release 版本、实施状态、Environment Promotion 和 Profile 选择；[环境容量与服务器规划](./environment-capacity-plan.md)唯一拥有分阶段采购、CPU/RAM/Disk 与人数服务器矩阵。环境实际 Deployed State 只能由本环境的 GitOps Desired State、PCS 与 Operations Read Model 证据证明，不能由本文推断。

安全、PKI、Secret、加密和 Audit 由[安全、审计与治理](./08-security-audit-governance.md)拥有；组件数据和恢复语义由[数据、消息与存储](./07-data-messaging-storage.md)拥有；运行状态投影、Console 和外部 Feed 由[平台应用与集成](./06-platform-application-integration.md)拥有。12 选择 Capacity Profile，[Configuration Governance](./10-configuration-governance.md)拥有已发布 `PLATFORM_POLICY` 的 Effective Value 与生命周期，本文只验证 Aggregate Physical Ceiling、调度放置、Headroom 与 Provisioning Gate。

## 环境与实例隔离

```text
DEV Platform Environment                 PROD Platform Environment
独立 Account / VPC / Cluster             独立 Account / VPC / Cluster
独立 Gateway / Flux / GitOps State       独立 Gateway / Flux / GitOps State
独立数据、Secret、备份与运行资源           独立数据、Secret、备份与运行资源
             同一组件模板、Contract 与 PCS 兼容基线
```

DEV 与 PROD 使用同一组件模板独立实例化，分别绑定服务器、Cluster、域名、配置、Credential 和恢复材料。“同一个组件”只表示同源模板与兼容 Contract，不表示共享同一个 Gateway、Flux、数据服务、Secret 或任何运行实例。每个环境绑定不可变 `CloudEnvironmentBinding` Generation；环境间无默认网络互通，Management Account 不承载平台运行资源或恢复材料。

## 逻辑 Role 与物理 Profile

Control Plane、Platform、Sandbox 与 Storage 始终是不同逻辑 Role 和隔离边界。Profile 只改变这些 Role 的物理放置和冗余，不合并其权限、Namespace、身份、网络、数据或容量账本。

- **Compact Launch Profile**：允许 Control Plane、Platform 与 Storage 逻辑 Role 融合放置到 `core` Node；允许 `NON_HA` 或较少 Replica，但已启用能力仍必须可观测、可备份恢复，并在故障时 Fail Closed。正式 Agent 验收起，Sandbox 必须使用独立物理 `sandbox-worker` 服务器；与 Platform、Storage 或 Control Plane 共享物理 Host 的 Sandbox 一律为 `LAB_ONLY`。
- **Hardened Target Profile**：将四个逻辑 Role 物理拆为 `k8s-control-plane`、`platform-worker`、`sandbox-worker`、`storage-worker` 专用 Node Pool，并增加 Sandbox N+1、组件 HA、完整 Observability 和更强 Cluster DR；它不是首次发布的默认 Release Gate。

精确阶段到 Profile 的映射与选择只见[实施路线图详细说明](./12-implementation-roadmap.md)，阶段对应的服务器数量、规格、人数与容量数值只见[环境容量与服务器规划](./environment-capacity-plan.md)。09 detail 只定义 Compact Launch/Hardened Target 的通用物理拓扑与准入 Contract，不建立阶段索引。

## GitOps、运维与可观测性

每个 Platform Environment 在自己的 Cluster 内独立运行一套 Flux，只将本环境已 Review 的 Git Desired State 收敛到本 Cluster。Flux 不跨 DEV/PROD Reconcile，不提供平台业务写入口或独立 Console；Condition、Inventory 与 Drift 经 Operations Adapter 只读展示。Controller 不可用时暂停新 Reconcile 并告警，已运行工作负载不依赖 Flux 同步可用。

Launch Profile 提供最小 Metrics、Logs、Alert、Backup/Restore 和只读 Operations Health。Prometheus、Alertmanager、Loki 的完整 Replica 拓扑、Thanos、外部 Operations Collector、External Watchdog、完整故障余量与高级 DR 属于 Hardened Target。两类 Profile 的 Telemetry 都只产生诊断事实，不能修改业务、授权、Audit、配置或恢复事实。

平台管理端只读展示当前环境的 Baseline、Effective Configuration、Health、容量、告警、Gap、Drift、Backup/Restore、TCO 和 Runbook，不在该界面编辑任何运维参数，也不提供 Cloud、Kubernetes、Flux、Secret 或 Restore 通用写操作。`GITOPS_CONFIG` 仍通过环境独立的受保护 Git Review 管理；可动态发布的 `PLATFORM_POLICY` 只由具备当前有效资格的 Super Admin 按 10 的生命周期管理。

## 一次性 Tool Job

promptfoo、EvalScope 与 OSV-Scanner 只在对应 Capability 已被 12 选择且通过 Capability Activation Gate 与 Release Gate 时，以版本锁定、受限、无 PVC 的一次性 Kubernetes Job 运行；能力未激活时不部署，也不常驻。Job 固定 CPU、Memory、Scratch、Deadline、并发和模型 Token/成本 Ceiling，并遵守 Network、Secret、Artifact 与容量准入；“非驻留”不表示可以绕过任何 Gate。

## 容量、Evolution Trigger 与 Release Blocker

12 选择的 Capacity Profile 与 10 提供的 Effective Policy 一起进入 09 的物理验证。Provisioning Gate 必须证明目标 Binding、PCS、物理 Ceiling、调度放置、PDB、Rollout/Fault Headroom、Backup/Restore 和恢复条件可行；不能通过页面编辑、放宽 Policy 或临时超卖绕过。

Evolution Trigger 使用持续窗口和可关联证据评估 Agent Queue、`CAPACITY_UNAVAILABLE`、Sandbox/Storage p95、平台 SLO、维护窗口、Recovery 与 TCO。单个瞬时指标或孤立告警只触发调查，不能直接触发迁移。Trigger 未达到时不要求物理拆分；若在发布前已按 Published Policy 达到 Trigger，则对应的拆分、N+1、HA、Observability 或 DR 增强自动成为 Release Blocker，直到新的 Capacity Candidate 完成兼容、迁移、回退、安全、恢复与 Provisioning Gate。Trigger 本身不自动采购或部署。

## 不变量

1. DEV 与 PROD 使用同一组件模板的独立实例，不共享 Account、VPC、Cluster、Gateway、Flux、IaC State、数据、Session、Secret、备份或运行资源。
2. 逻辑 Control Plane、Platform、Sandbox、Storage 边界不随物理融合而消失；正式 Agent Sandbox 必须位于独立物理 `sandbox-worker`，共享 Host 仅为 `LAB_ONLY`。
3. Launch Profile 可以 `NON_HA` 或减少 Replica，但任何故障都必须可观测、Fail Closed、保留证据并可按已验证 Runbook 恢复。
4. Hardened Target 保留四类专用 Node Pool、Rook-Ceph、Kata/KVM、Sandbox N+1、HA、完整 Observability 与高级 DR；未达到 Trigger 时不把它们作为首次发布的无条件采购清单。
5. `CloudEnvironmentBinding + PCS + Capacity Profile + Provisioning Gate` 共同约束部署；09 不创建 Policy Effective Value，也不保存 12 拥有的状态或容量矩阵。
6. 所有运维参数在管理端只读；配置变更分别遵循 10 的 `PLATFORM_POLICY` 生命周期或环境独立的 GitOps Review。
