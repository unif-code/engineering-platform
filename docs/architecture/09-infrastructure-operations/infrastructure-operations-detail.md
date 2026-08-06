# 基础设施与运维详细说明

> 文档层级：L2 规范事实源
> 对应主文：[基础设施与运维](./infrastructure-operations.md)

## 1. 责任边界与环境状态

本文是 Platform Environment、CloudEnvironmentBinding、PCS、Kubernetes、Node、网络、物理存储拓扑、可观测性、环境级 Cluster DR、容量与 TCO 的唯一规范事实源。它不定义身份、业务状态、Artifact 配额、数据服务恢复算法、Secret、加密、PKI 或 Audit 内容保护；这些分别链接[01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)、[02](../02-requirement-workflow/requirement-workflow-detail.md)、[07](../07-data-messaging-storage/data-messaging-storage-detail.md)和[08](../08-security-audit-governance/security-audit-governance-detail.md)。Operations Read Model、Console Access、External Status Feed 与公告流程由[06](../06-platform-application-integration/platform-application-integration-detail.md)拥有。

DEV 是当前唯一实例化的 Platform Environment，当前仓库仍是 Umi Max 前端模板。Python Control Plane、数据服务、基础设施和 PROD 是批准的目标架构，不表示已有对应运行实例。未来 PROD 以同源代码、Contract、GitOps 与 PCS 在独立 Account、VPC、Cluster 重新实例化，绝不共享 DEV 的运行实例、Session、数据、凭据、密钥或故障域。

## 2. Cloud Boundary 与 Environment Binding

每个 Platform Environment 有独立的 Resource Account、VPC、Kubernetes Cluster、IaC State、Identity、CIDR、NLB、证书、KMS、Backup 与 Audit 边界。`CloudEnvironmentBinding` 是不可变 Generation，绑定环境、Account、Region、单元素 Zone Set、CIDR、Provider Resource Mapping、入口和恢复 Repository；变更 Region、Zone、Account、CIDR 或核心 Mapping 必须创建新 Generation 并完成迁移和验证。

Management Account 不承载平台运行资源、平台数据或恢复材料。DEV 与未来 PROD 默认无网络互通，不跨环境复用 Session、数据库、Secret、Key、Bucket、Backup、Provider 信任或运行实例。治理面、GitOps 控制面或 TCO 读取失效不构成平台已运行请求的同步依赖。

当前环境拓扑是单 Region、Single-Zone。Region、Zone、vSwitch、CIDR、精确资源 ID、SKU、价格和折扣在 Binding 与部署输入中管理，不写死为本文的环境事实。Provisioning Gate 同时验证 Provider 的 Deployment Set/独立 Host、库存、Quota 和单 Node 故障替换余量；它们是 KVM、Storage 与故障域 Contract 的必要证据。

## 3. Platform Compatibility Set 与 Provisioning Gate

PCS 固定稳定技术系列：Kubernetes 1.36（candidate 1.36.3）、Ubuntu 24.04 LTS Minimal amd64、containerd 2.3 LTS、Kata 4.0.x、Cilium 1.20.x、Gateway API 1.6.x 与 cert-manager 1.21.x。精确 patch、image digest、Chart digest、Provider SKU 和镜像版本属于 PCS/部署输入，不是本文固定事实。

每次部署、升级或扩容都生成可验证证据：

```text
CloudEnvironmentBinding Generation
+ PCS Digest
+ Environment Capacity Profile Digest
+ Provisioning Gate 结果
```

Provisioning Gate 校验目标 Account/Region/Zone 的服务可用性、Quota、库存、故障替换余量、Node/Storage/Network 兼容性、证书、KMS、Backup Repository、Object Lock、调度、升级、故障和恢复条件。任一条件未通过时保持候选状态，不启动降级部署。

## 4. Kubernetes 与 Node Role

每个环境有 3 个专用 `k8s-control-plane` Node，使用 stacked etcd，quorum 为 2。Kubernetes API 通过 Cluster 外 Private L4 NLB 的 TCP 6443 passthrough 暴露，API Server 提供 TLS。Node 必须关闭 swap，禁止 `LimitedSwap` 与 `failSwapOn=false`。

四类 Node Role 固定如下：

| Node Role | 职责 | 隔离要求 |
| --- | --- | --- |
| `k8s-control-plane` | API Server、Scheduler、Controller、etcd | 专用 Taint；不承载业务 Pod |
| `platform-worker` | 平台、数据服务、观测与 Operator | 与 Sandbox、Storage 分离 |
| `sandbox-worker` | Kata/KVM Guest | 专用 Taint、RuntimeClass 与 Egress Policy |
| `storage-worker` | Rook-Ceph MON/MGR/RGW/OSD | 专用 Taint、存储亲和与 Host 故障域 |

工作负载使用 PDB、Anti-affinity、Topology Spread、Resource Request/Limit、Namespace 和 NetworkPolicy 保持角色及故障域边界。Kubernetes Secret 加密、API Keyring 和恢复顺序由[08](../08-security-audit-governance/security-audit-governance-detail.md)定义。

## 5. Sandbox Worker 交付 Gate

`sandbox-worker` 使用预烘焙、不可变 Node Image。禁止 `kata-deploy`、cloud-init、SSH 或在线补装来改变已入池节点；新 Runtime、Kernel、Node Image 或 Runtime Profile 通过逐节点替换完成。

节点入池前必须全部通过：`/dev/kvm`、CPU virtualization、KVM module、kata-runtime check、Guest lifecycle、RuntimeClass、network、CSI、MTU、性能、reboot、drain 与 soak Gate。任一 Gate 失败时节点不能承载 Sandbox。Sandbox 生命周期、Lease、Execution Binding 与 Agent 语义只见[Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)。

## 6. Network 与 Gateway

Cilium 提供 eBPF kube-proxy replacement、cluster-pool IPAM、IPv4/VXLAN/WireGuard、Hubble Relay 两副本与 Hubble UI。`socketLB.hostNamespaceOnly=true`。各 Namespace 建立双向 default deny，再按工作负载、端口、身份和目的地精确放行。

Gateway API 是平台北向入口，接受 `DIRECT_OR_L4_TRANSPARENT` 流量模型，任何 forwarded headers 都是不可信输入，只有可信边界写入的标准化上下文可被后端使用。Browser 不能直连数据库、NATS、OpenBao、Kubernetes、Cloud、RGW 管理接口或 Model Gateway。

Sandbox 默认不得访问数据库、NATS、OpenBao、Kubernetes API、Cloud metadata、其他 Sandbox 或任意公网；仅由 Sandbox owner 的受控 Egress Policy 明确放行批准的 Model、Git、依赖或搜索目标。具体执行权限和网络意图由 03/04 Contract 约束。

## 7. Storage Physical Baseline

实时 Stateful Workload 只使用 `stateful-rwo-lowlatency`：RWO、`WaitForFirstConsumer`、`Retain`、online expansion、exclusive block，并禁止 Ceph fallback。该 StorageClass 承载 PostgreSQL、Valkey、NATS、Temporal、OpenBao 和可观测性所需实时卷；数据语义、Retention 和组件恢复由[07](../07-data-messaging-storage/data-messaging-storage-detail.md)定义。

Rook 1.20.2 与 Ceph 20.2.2 提供 RGW Object Storage。DEV 使用 3 个 OSD、未来 PROD 使用 4 个 OSD；每个 OSD 使用 1 TiB enterprise PLP SSD。Ceph 固定 `size=3`、`min_size=2`、`failureDomain=host`，并配置 3 MON、2 MGR、2 RGW。容量在 50% 使用率触发扩容评估，`nearfull/backfillfull/full` 阈值为 70/75/80。

每个 `storage-worker` 至少为 `8 vCPU / 32 GiB RAM`，使用独立 256 GiB enterprise SSD 作为 OS/MON 与独立 1 TiB Raw OSD；OS/Mon 盘与 OSD Raw Device 物理分离，节点内部东西向路径至少 10 Gbps。OSD 必须满足[08 的加密与恢复 Gate](../08-security-audit-governance/security-audit-governance-detail.md)，本文不重复其密钥或加密机制。

Ceph Daemon 使用受控 Burstable 资源基线：

| Daemon | CPU Request | Memory Request | CPU Limit | Memory Limit |
| --- | ---: | ---: | --- | ---: |
| OSD | 2 | 4 GiB | 不设置 | 6 GiB |
| MON | 1 | 1 GiB | 不设置 | 2 GiB |
| MGR | 500m | 512 MiB | 不设置 | 1 GiB |
| RGW | 1 | 1 GiB | 不设置 | 2 GiB |
| Rook Operator | 200m | 128 MiB | 不设置 | 512 MiB |

OSD 的 `osd_memory_target=4 GiB`；CPU 不设 Limit，确保 Recovery、Backfill、Scrub 和故障切换不会被 CFS Throttling 截断。所有资源、阈值和 Operator 镜像均是 PCS/GitOps 冻结输入，变更需要经过 Provisioning Gate。

RGW 承载对象类存储，不承载实时 RBD/CephFS PVC。Bucket Class 业务配额、版本、Retention、Object Lock 与安全加密分别由 07 和 08 定义。

## 8. Observability 与 Operations

首版组件组为：Prometheus 双副本、Thanos Query 双副本、Alertmanager 三副本、Grafana 双副本、Loki monolithic 三副本加 Gateway 双副本、Tempo monolithic 单副本、每 Node OpenTelemetry Agent 加 Gateway 双副本、Hubble Relay 双副本与 UI。首版不包含 Mimir、Kafka、Thanos Object Store、distributed Loki 或 distributed Tempo。

Loki 入口 Gateway 必须清除客户端提交的 `X-Scope-OrgID`、认证和身份 Header，再根据当前环境的可信 mTLS Identity 注入固定 tenant；NetworkPolicy 禁止绕过 Gateway 访问 Loki。Tempo 固定 `multitenancy_enabled=false`。这两个规则防止 Browser、Pod 或转发链伪造观测租户。

Telemetry 只用于诊断，不得改写业务、授权、配置、Audit、Provider 状态或恢复事实。Operations Adapter 采集的数据经 06 的 Read Model 展示；管理后台只读显示 Baseline、有效配置、Health、容量、性能、告警、Gap、Drift、Backup/Restore、依赖和趋势，不能执行 restore write 或显示敏感材料。

`PrometheusRule + Alertmanager` 是唯一的告警计算与通知状态事实源，Grafana Managed Alerting 关闭。Loki 固定 `replication_factor=3`，三个 Replica 跨 Node 分散并设置 `PDB minAvailable=2`；写入 quorum 不足、Ring/WAL 或 RGW 异常时显式失败，由 OTel Queue 有界重试。Tempo 单 Replica 是可恢复的诊断 Backend，不宣称 HA；故障时 OTel Gateway 以每副本 10 GiB、目标 4 小时的有界 Queue 缓冲，时间或容量耗尽后允许丢弃诊断 Trace，但必须记录 Dropped Count、Gap 范围并告警，核心业务继续运行。

| 组件 | Replica | CPU Request / Limit | Memory Request / Limit | 单 Replica 持久化 |
| --- | ---: | --- | --- | ---: |
| Prometheus | 2 | 500m / 2 CPU | 1 GiB / 4 GiB | 50 GiB |
| Thanos Sidecar | 2 | 100m / 500m | 128 MiB / 512 MiB | 随 Prometheus |
| Thanos Query | 2 | 100m / 500m | 256 MiB / 512 MiB | 无 |
| Alertmanager | 3 | 50m / 500m | 128 MiB / 256 MiB | 5 GiB |
| Grafana | 2 | 100m / 1 CPU | 256 MiB / 1 GiB | 使用 PostgreSQL |
| Loki Monolithic | 3 | 250m / 2 CPU | 512 MiB / 2 GiB | 10 GiB WAL |
| Loki Gateway | 2 | 50m / 250m | 64 MiB / 256 MiB | 无 |
| Tempo Monolithic | 1 | 250m / 2 CPU | 512 MiB / 2 GiB | 10 GiB |
| OpenTelemetry Gateway | 2 | 250m / 1 CPU | 512 MiB / 1 GiB | 10 GiB Queue |
| Prometheus Operator | 1 | 100m / 500m | 128 MiB / 512 MiB | 无 |
| kube-state-metrics | 1 | 100m / 500m | 256 MiB / 512 MiB | 无 |
| Hubble Relay | 2 | 由 Cilium PCS Envelope 定义 | 由 Cilium PCS Envelope 定义 | 无 |
| Hubble UI | 1 | 由 Cilium PCS Envelope 定义 | 由 Cilium PCS Envelope 定义 | 无 |
| OpenTelemetry Agent | 每 Node 1 | 100m / 由 PCS 定义 | 256 MiB / 由 PCS 定义 | 仅受限 Checkpoint |
| node-exporter | 每 Node 1 | 50m / 由 PCS 定义 | 64 MiB / 由 PCS 定义 | 无 |
| Loki Canary | 每 Node 1 | 20m / 由 PCS 定义 | 32 MiB / 由 PCS 定义 | 无 |

Metrics 默认保留 30 天；普通 Log 14 天；受批准 Security/OpenBao Audit 热查 Log 30 天；Hubble Deny/异常 Drop 7 天；Trace 7 天。每个 OTel Gateway Queue 的目标时窗为 4 小时，Queue/PVC 使用率均以 70%/85% 发出 Warning/Critical。每个环境 Observability RWO PVC 合计 175 GiB：Prometheus 100 GiB、Alertmanager 15 GiB、Loki WAL 30 GiB、Tempo 10 GiB、OTel Gateway Queue 20 GiB。Grafana 状态计入 PostgreSQL，Loki/Tempo Object Data 计入 RGW Bucket Class，三者不重复计入同一种存储成本。

加上 Hubble Relay/UI、必要 Sidecar 与取整余量，每环境 Observability 固定 Pod 稳态 Request 约为 `4.1 CPU / 8 GiB`；每 Node 的 OpenTelemetry Agent、node-exporter 与 Loki Canary 额外约为 `170m CPU / 352 MiB`，并计入 Node Infrastructure Reserve。Capacity Profile 还必须保留至少 `1 CPU / 2 GiB` 固定 Rollout Headroom 与每 Node DaemonSet 升级开销。

### 8.1 Operations Collector 与 External Watchdog

每个环境的 Operations Collector 是位于目标 Cluster及其 Cluster 内依赖之外的逻辑实例，不占用任何 Kubernetes Node Pool，也不依赖 Kubernetes Admin Credential。它只消费 06 定义的受限身份与 External Status Feed Contract；本文不复制 Envelope 或 Ingest 算法。

External Watchdog/Alertmanager Deadman Receiver 进一步独立于目标 Cluster、platform API、PostgreSQL 和 Collector，且不持有 Cluster Admin Credential。未就绪时必须显示 `EXTERNAL_WATCHDOG_NOT_READY`，不能声明具备 Cluster 失联告警能力。DEV 每月、PROD 每季度的 DR Drill 必须验证 Cluster 全失联仍可告警、Collector/Feed 进入 `STALE/UNKNOWN`，并在恢复后完成 06 Feed 与 08 Trust/High-water 的联合验证。

扩展观察后端时，通过 OTLP、Adapter、新 PCS、Dual Write/Read、Query Parity、Retention/Backfill、故障和回退验证逐步迁移，不修改领域模块。

## 9. Cluster DR 与演练

当前只承诺同站点 Cluster HA 与 Cluster DR。DEV 不是 PROD standby，且没有 Zone、Region、Account 或 Site DR 承诺。Cluster 外恢复 Repository、etcd snapshot、recovery bundle 和 Watchdog 必须处于目标 Cluster 故障域之外。

环境级目标如下：

| 环境 | etcd Snapshot | 保留 | Cluster DR 目标 | Drill |
| --- | --- | --- | --- | --- |
| DEV | 每 3 小时 | 7 天 | RPO ≤ 6 小时；RTO ≤ 120 分钟 | 每月 |
| PROD | 每 30 分钟 | 48 小时周期点 + 30 天每日点 | RPO ≤ 1 小时；RTO ≤ 120 分钟 | 每季度 |

默认治理对象使用 7 天 `GOVERNANCE` lock。恢复只能由受控 Runbook 和具备权限的人员执行；管理后台仅显示恢复证据、状态和 Runbook，不提供恢复写操作或敏感恢复材料。恢复顺序先满足 08 的信任和解密链，再进行 07 的组件恢复，最后验证 Cluster、业务工作负载和可观测性。组件数据库 RTO 与端到端业务恢复时间分别记录，不能相互替代。

`kubernetes-etcd-backup` 是每环境独立、位于目标 Cluster/RGW 之外的 S3-compatible Control Plane Recovery Repository，不属于 RGW Bucket Class 或 Ceph Raw 容量。etcd Snapshot 使用锁定版本的 `etcdctl snapshot save` 与 `etcdutl snapshot status` 验证，不以 Member Data Directory、PVC/CSI Snapshot 或单节点文件复制充当权威恢复源。每个 Snapshot 绑定唯一 Manifest、匹配 Recovery Bundle、PCS/GitOps Revision、对象版本与校验值；变更 API EncryptionConfiguration、证书、Member、Control Plane Node 或其他破坏性维护前，必须先生成新的 Recovery Bundle 与 `BACKUP_VERIFIED` Pre-change Snapshot。

DEV 每月、PROD 每季度在隔离恢复环境完成 etcd/Control Plane Restore Drill。恢复使用已验证 Snapshot 重建三个 Member 与受控新 Membership/Cluster Identity，验证 etcd Hash/Revision/Quorum、API `/readyz`、Controller/Scheduler Lease、核心 API Object、Secret 加密可读性、Node/PVC/Operator 状态与 GitOps Reconciliation。恢复禁止使用 `--force-new-cluster`、旧 Member Data Directory 或未 Fence 的旧 Member。

## 10. Capacity Profile、BOM 与 TCO

DEV 12 个 Node、未来 PROD 15 个 Node：DEV 为 3 Control Plane + 4 Platform + 2 Sandbox + 3 Storage；PROD 为 3 Control Plane + 6 Platform + 2 Sandbox + 4 Storage。每个环境有 2 个 Sandbox Worker；Capacity Contract 为 DEV 5 Units、PROD 8 Units，并保留 N+1 故障余量。

| 环境 | Node Role | 数量 | 单 Node CPU / RAM | 单 Node 磁盘 | 角色 CPU / RAM 小计 |
| --- | --- | ---: | --- | --- | --- |
| DEV | `k8s-control-plane` | 3 | 2 vCPU / 4 GiB | 100 GiB OS/etcd | 6 vCPU / 12 GiB |
| DEV | `platform-worker` | 4 | 8 vCPU / 32 GiB | 100 GiB OS/Runtime | 32 vCPU / 128 GiB |
| DEV | `sandbox-worker` | 2 | Alibaba EBM Fallback Candidate：64 vCPU / 192 GiB | 100 GiB OS + 500 GiB Runtime | 128 vCPU / 384 GiB |
| DEV | `storage-worker` | 3 | 至少 8 vCPU / 32 GiB | 256 GiB OS/MON + 1 TiB Raw OSD | 至少 24 vCPU / 96 GiB |
| PROD | `k8s-control-plane` | 3 | 4 vCPU / 8 GiB | 100 GiB OS/etcd | 12 vCPU / 24 GiB |
| PROD | `platform-worker` | 6 | 8 vCPU / 32 GiB | 200 GiB OS/Runtime | 48 vCPU / 192 GiB |
| PROD | `sandbox-worker` | 2 | Alibaba EBM Fallback Candidate：64 vCPU / 192 GiB | 100 GiB OS + 800 GiB Runtime | 128 vCPU / 384 GiB |
| PROD | `storage-worker` | 4 | 至少 8 vCPU / 32 GiB | 256 GiB OS/MON + 1 TiB Raw OSD | 至少 32 vCPU / 128 GiB |

在 Alibaba EBM Fallback Candidate 与最低 Storage Node 规格下，DEV 派生 Raw Compute 至少为 190 vCPU / 620 GiB RAM，未来 PROD 至少为 220 vCPU / 728 GiB RAM。它们是候选 Provider Mapping 的派生值，不是跨云架构常量；目标 Region/Zone 选择经 PCS 验证的其他 KVM Compute 后必须依据 Effective SKU 重算。

| 环境 | Node 系统类磁盘 | Sandbox Runtime 磁盘 | Ceph Raw OSD | Active ESSD PVC | TCO Nominal 总量 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV | 1,668 GiB | 1,000 GiB | 3 TiB = 3,072 GiB | 28 卷 / 425 GiB | 6,165 GiB ≈ 6.02 TiB |
| PROD | 2,724 GiB | 1,600 GiB | 4 TiB = 4,096 GiB | 32 卷 / 675 GiB | 9,095 GiB ≈ 8.88 TiB |

该 BOM 是计费输入，不等于可用业务容量、Kubernetes Allocatable 或故障后容量；Snapshot、Retain 遗留卷、演练临时卷、性能等级和文件系统保留量单列。Active ESSD PVC 已包含 PostgreSQL、Valkey、NATS、OpenBao Data/Audit、Scanner Signature 和 Observability RWO；Temporal 与 Grafana 的持久事实计入 PostgreSQL。Ceph Bucket Class、Audit Emergency Margin 与 Loki/Tempo Object Data 均在已计费的 Raw OSD 内，不能再次相加或按三副本再次乘算；在线 ESSD PVC 与其 Ceph Backup Object 是两类真实、用途不同的成本项。

`audit-worm` 的环境容量由本 Capacity Profile 唯一定义：DEV 正常 Operating Quota 64 GiB、专用 Emergency Margin 16 GiB、admission/native ceiling 80 GiB；未来 PROD 分别为 96 GiB、32 GiB 与 128 GiB。其他 Bucket Class 不得借用 Audit Emergency Margin。进入 Emergency Margin 后，平台优先拒绝 Attachment、普通 Artifact、Trace 等低优先级对象写入，并按 Audit p99 增长率与扩容 Lead Time 判断是否还能可靠提交必需 Audit；无法覆盖 Lead Time 时按 08 Security Contract Fail Closed。365 天 `COMPLIANCE` 保留不能通过缩短 Retention、删除 Version 或绕过 Object Lock 释放容量。

Cluster 外 `kubernetes-etcd-backup` Repository、外部 Watchdog/Collector、NLB、KMS、NAT/EIP/Egress 与恢复演练瞬时资源不在 Node/PVC 磁盘合计中，必须作为独立 TCO 项。`Environment TCO Snapshot` 是版本化只读 Contract，引用 Binding、PCS、Capacity Profile 与报价时间/有效期，并记录精确 SKU、数量、购买方式/期限、磁盘类型与性能、NLB、KMS、外部 Backup、NAT/EIP/Egress、网络/流量假设、币种、税费和折扣。Region、Zone、SKU 和价格由部署输入填充；先计算当前 DEV，未来 PROD 单独估价。

## 11. 不变量

1. 每个环境独立拥有 Cloud、Cluster、网络、存储、可观测性、恢复材料与运维数据。
2. `CloudEnvironmentBinding`、PCS 和 Capacity Profile 必须一起通过 Provisioning Gate 才能承载工作负载。
3. Sandbox Worker 只运行经验证的预烘焙不可变 Node Image 与 Kata/KVM Runtime。
4. `stateful-rwo-lowlatency` 与 RGW Object Storage 职责不混用；容量和物理拓扑不替代 07 的数据语义。
5. Observability 只能诊断，Loki tenant 与 Tempo 单租户规则不能被客户端 Header 绕过。
6. Cluster DR 不扩展为 Site DR；恢复操作始终以安全、组件和环境级证据共同验证。
