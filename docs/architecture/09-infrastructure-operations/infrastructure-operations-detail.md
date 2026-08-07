# 基础设施与运维详细说明

> 文档层级：L2 规范事实源
> 对应主文：[基础设施与运维](./infrastructure-operations.md)

## 1. 责任边界

本文是完整 Target Architecture 中 Platform Environment、CloudEnvironmentBinding、Platform Compatibility Set（PCS）、GitOps、Kubernetes、逻辑 Node Role、物理放置、网络、存储物理拓扑、Observability、环境级 Cluster DR、容量准入与 TCO 的规范事实源。本文不声明任何环境已 Provision、已部署或已接收 Promotion。

Release 版本、Capability Scope、实现状态、Environment Promotion 与 Reliability/Capacity Profile 选择只由[实施路线图](../12-implementation-roadmap/implementation-roadmap-detail.md)拥有；分阶段采购、CPU/RAM/Disk、人数场景和服务器矩阵只由[环境容量与服务器规划](../12-implementation-roadmap/environment-capacity-plan.md)拥有。本文拥有 Profile 必须遵守的基础设施不变量、物理放置验证和 Hardened Target 拓扑，但不复制这些计划事实。

身份和业务状态分别属于 [01](../01-identity-organization-authorization/identity-organization-authorization-detail.md)与 [02](../02-requirement-workflow/requirement-workflow-detail.md)；组件数据、Artifact、Retention 和组件级恢复属于 [07](../07-data-messaging-storage/data-messaging-storage-detail.md)；Secret、加密、PKI 和 Audit 属于 [08](../08-security-audit-governance/security-audit-governance-detail.md)。Operations Read Model、Console Access、External Status Feed 与公告流程由 [06](../06-platform-application-integration/platform-application-integration-detail.md)拥有。

责任分工固定为：12 选择 Reliability/Capacity Profile；[10](../10-configuration-governance/configuration-governance-detail.md)拥有已发布 `PLATFORM_POLICY` 的 Effective Value、Snapshot 与生命周期；本文拥有基础设施 `GITOPS_CONFIG` Desired State，并读取 PCS、选定 Profile 与 Effective Policy，验证 Aggregate Physical Ceiling、调度放置、PDB、Rollout/Fault Headroom 和 Provisioning Gate。09 不产生或修改 Policy Effective Value，10 不声明物理容量，12 不复制配置生命周期。

## 2. Cloud Boundary 与环境实例

每个 Platform Environment 使用独立 Resource Account、VPC、Kubernetes Cluster、IaC State、Identity、CIDR、Gateway、Flux、证书、KMS、Backup 与 Audit 边界。`CloudEnvironmentBinding` 是不可变 Generation，绑定 Environment、Account、Region、Zone Set、CIDR、Provider Resource Mapping、入口和恢复 Repository；改变 Account、Region、Zone、CIDR 或核心 Mapping 必须建立新 Generation 并完成迁移、回退和验证。

DEV 与 PROD 使用同一组件模板、Contract、GitOps 模板与 PCS 兼容基线，各自在不同服务器、Cluster、域名和配置上部署独立实例。两者不共享 Gateway、Flux Controller、Git Credential、IaC State、数据库、对象、Session、Secret、Key、Backup、Provider Trust 或运行时资源；一个环境的资格、路径、MR 或 ServiceAccount 不能操作另一环境。Management Account 只承载治理，不承载平台工作负载、数据或恢复材料；治理面或 TCO 读取故障不是已运行请求的同步依赖。

Region、Zone、vSwitch、CIDR、精确资源 ID、SKU、价格和折扣是 Binding 与部署输入，不是本文声明的已部署事实。环境 Deployed State 只由该环境的 GitOps Desired State、PCS 和 Operations Read Model 运行证据证明；路线图选择的 Capacity Profile 不能替代这些证据。

## 3. Platform Compatibility Set 与 Provisioning Gate

PCS 是平台组件版本、Chart/Manifest、Image 与兼容关系的唯一注册表。Target Architecture 的初始兼容候选锁定以下稳定系列与精确版本；每个制品仍须绑定 Artifact/Image Digest，禁止 `latest`、浮动 Tag 或启动时自动升级：

| 领域 | 组件 | 稳定系列 | PCS 精确版本 |
| --- | --- | --- | --- |
| Kubernetes | Kubernetes | 1.36 | 1.36.3 |
| Kubernetes | Ubuntu Server Minimal amd64 | 24.04 LTS | 24.04.4 |
| Kubernetes | containerd | 2.3 LTS | 2.3.1；CRI v1、config v4、cgroup v2 |
| Kubernetes | Kata Containers | 4.0.x | 4.0.0 |
| Kubernetes | Cilium | 1.20.x | 1.20.0 |
| Kubernetes | Gateway API | 1.6.x Standard | CRD v1.6.1 |
| Kubernetes | cert-manager | 1.21.x | v1.21.1 |
| GitOps | Flux | 2.9.x | v2.9.3 |
| Data | CloudNativePG | 1.30.x | 1.30.0 |
| Data | PostgreSQL | 18 | 18.4 |
| Data | PgBouncer | 1.25.x | 1.25.2 |
| Data | Barman Cloud Plugin | 0.13.x | 0.13.0 |
| Data | Valkey | 9.1 | 9.1.1-trixie |
| Messaging | NATS Server / Helm Chart | 2.14 | Server 2.14.4-scratch；Chart 2.14.2 |
| Workflow | Temporal | Server 1.31 | Chart 1.6.0；Server/Admin Tools 1.31.2；UI 2.52.0；Python SDK 1.30.0 |
| Security | OpenBao | 2.6 | Server 2.6.1；Chart 0.28.6 |
| Security | ClamAV | 1.5 | 1.5.3 |
| Security Tooling | OSV-Scanner | 2.3.x | v2.3.8 |
| Evaluation Tooling | promptfoo | 0.121.x | 0.121.15 |
| Evaluation Tooling | EvalScope | 1.9.x | v1.9.1 |
| Object Storage | Rook / Ceph | Rook 1.20 / Ceph 20.2 | Rook 1.20.2；Ceph 20.2.2 |
| Observability | kube-prometheus-stack | 88.1.x | Chart 88.1.5；Prometheus Operator 0.93.0；Prometheus 3.13.2-distroless；Alertmanager 0.33.1；Grafana Chart 12.10.3 / Grafana 13.1.2 |
| Observability | Thanos | 0.42.x | 0.42.4 |
| Observability | Loki | 3.7 | Chart 18.7.3；Loki 3.7.5 |
| Observability | OpenTelemetry Collector | Chart 0.168.x | Chart 0.168.0；默认 Operand 0.157.0 |
| Observability | Tempo | 3.0 | 3.0.2 Monolithic `target=all` |

精确 Patch、Chart、Operand、CRD 与 Image 组合是同一 PCS 的不可分割内容。任何安全更新、Patch、Digest 或兼容配置变化都创建新 PCS Candidate，并按 12 选定的 Promotion 与 Gate 验证；不能只升级 Chart 而不验证 Operand/CRD，也不能由领域文档建立第二份版本表。

每次部署、升级、扩容或物理拆分都生成可验证组合：

```text
CloudEnvironmentBinding Generation
+ PCS Digest
+ 12 选定的 Environment Capacity Profile Digest
+ 10 提供的 Effective Policy Revision
+ Provisioning Gate 结果
```

Provisioning Gate 校验目标 Account/Region/Zone 的服务可用性、Quota、库存、故障替换余量、Provider Host 隔离、Node/Storage/Network 兼容性、证书、KMS、Backup Repository、Object Lock、Aggregate Physical Ceiling、调度、PDB、Rollout/Fault Headroom、升级、故障和恢复条件。任一条件未通过时保持 Candidate，不启动降级部署，也不允许修改 Policy、临时超卖或移除安全控制来适配物理资源。

### 3.1 Flux GitOps Reconciler

每个 Platform Environment 在自己的 Kubernetes Cluster 内独立部署一套 Flux，固定启用 `source-controller`、`kustomize-controller`、`helm-controller` 与 `notification-controller`。Target Contract 不启用 `image-reflector-controller`、`image-automation-controller` 或其他自动写回 Git 的组件；Image/Chart/Manifest 升级仍必须经过 Git Review、PCS Candidate 和 Provisioning Gate。DEV 与 PROD 使用同一组件集合与模板，但绑定各自独立的 Git 路径、Credential、Kubernetes ServiceAccount、Namespace 和状态，不能由一个 Flux 实例跨环境 Reconcile。

Git 中经 Review 合并的 Manifest/Helm Revision 是 `GITOPS_CONFIG` Desired State；Flux CR Status、Inventory、Condition 和 Event 只是可重建的 Reconcile Observed State，不是业务、配置、权限、Audit 或恢复事实源。平台通过只读 Operations Adapter 投影 Desired/Effective/Drift，不向 Browser 暴露 Kubernetes 或 Flux 写接口，也不建立独立 Flux Console。Flux 无独立数据库和 PVC；Controller 不可用时暂停新 Reconcile 并告警，已经运行的业务工作负载继续运行，恢复后从 Git 与 Cluster 当前状态幂等收敛。

当 12 选择低规模 Launch Profile 时，每个 Controller 可为 1 Replica，使用 `maxUnavailable=0`、`maxSurge=1` 完成滚动升级；Kubernetes 负责故障重启。初始 Resource Envelope 为：`source-controller 100m/256Mi`、`kustomize-controller 250m/512Mi`、`helm-controller 100m/256Mi`、`notification-controller 50m/128Mi`，均保留不低于 `4× CPU Request` 和 `2× Memory Request` 的 Limit，并在 Platform 逻辑 Role 的有效 Capacity Profile 中为整套 Flux 保留至少 `1 CPU / 2 GiB` Rollout/Fault Headroom。扩大 Repository、Application 或 Reconcile 并发前必须依据队列、Reconcile p95、OOM/Throttle 和 API Server 压力形成新 Capacity Candidate。

每个环境的 `GITOPS_CONFIG` 使用独立 Git Repository 或受保护环境路径与受保护主分支，禁止 direct push。平台 Capability、Super Admin、GitLab Project Role 与 GitOps 合并资格互不继承；只有 GitOps/IaC Operations Owner 可提交变更，只有环境对应的 Operations Reviewer 可批准并合并。Cluster Foundation 路径由独立 CODEOWNERS/Review Gate 保护。合并证据至少绑定 Environment、MR、Commit SHA、目标路径、Reviewers、签名/校验结果、PCS/Capacity Profile Candidate 和时间，并进入 Provider/Git Audit；DEV 的资格、分支或 MR 不能批准 PROD 路径。

Flux 只允许读取当前环境批准的 Git/OCI/Helm 来源并访问本 Cluster Kubernetes API；Git Credential 只读、按环境隔离并遵循 08 的 Secret Contract。`kustomize-controller` 与 `helm-controller` 固定启用 `--no-cross-namespace-refs=true`；每个 `Kustomization`/`HelmRelease` 必须绑定显式 Reconcile ServiceAccount，并由 Admission/Git Validation 拒绝缺失身份、越权 Namespace/API Group 或未批准 Cluster-scoped Resource。普通 Namespace Bundle 不能继承 Cluster Admin，只有经过独立 Review 的 Cluster Foundation Bundle 可使用专用 Cluster-scoped Identity。Controller 自身身份、Reconcile Identity、业务 Workload 身份与人工运维身份必须分离，Controller 只获得执行显式 Impersonation/受控 Reconcile 所需的 Kubernetes RBAC。

默认使用有界轮询，不增加公网 Webhook 入口。Source Verification、Artifact Digest、Reconcile Failure、Suspended Resource、Drift、Stalled Condition 和版本不兼容必须进入 Observability；任何绕过 Git Review 的 `kubectl apply`、Flux 手工 Patch 或紧急修改都不能成为新的 Desired State，恢复操作只能依照受控 Runbook 回写 Git 并重新 Reconcile。

### 3.2 一次性 Tool Job Resource Profile

`promptfoo`、`EvalScope` 与 `OSV-Scanner` 只有在对应 Capability 被 12 选择且通过适用 Gate 后才部署为一次性 Job；能力未激活时不部署、不预热且不常驻。启用后，它们仅以版本锁定、无 PVC 的 Kubernetes Job 运行在 Platform 逻辑 Role；Launch Profile 物理放置到 `core`，Hardened Target 物理放置到 `platform-worker`。Scratch 使用有界 `emptyDir`，完成后结构化结果先固化到 Artifact，再由 `ttlSecondsAfterFinished=86400` 清理 Job/Pod。

三个 Profile 都使用 Non-root、只读 RootFS、禁用 Privilege/Host Namespace/HostPath，并设置 `automountServiceAccountToken=false`：主工具容器不得挂载默认 Token 或 Kubernetes API audience Token；确需短期服务身份时，仅 OpenBao Agent init/sidecar 可挂载短 TTL、`audience=openbao` 的 projected Token，并将短期 mTLS/Service Identity 写入 tmpfs，主工具容器只能读取该内存文件；不需要 Secret 的 Job 不启动 Injector。各 Job 按 03/06 Contract 设置独立 NetworkPolicy、Secret 和数据权限，OSV-Scanner 不得取得 Model Provider Credential。初始物理 Ceiling 为：

| Job Profile | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | 最大并发 | Active Deadline |
| --- | --- | --- | --- | ---: | ---: |
| `tool/promptfoo-regression-v1` | `1 / 2 CPU` | `2 / 4 GiB` | `5 / 10 GiB` | 1 | 60 分钟 |
| `tool/evalscope-benchmark-v1` | `2 / 4 CPU` | `4 / 8 GiB` | `10 / 20 GiB` | 1 | 4 小时 |
| `tool/osv-scan-v1` | `500m / 2 CPU` | `1 / 4 GiB` | `5 / 10 GiB` | 1 | 60 分钟 |

两个 Evaluation Profile 共享 `maxActiveEvaluationJobs=1`，不能同时运行；每个 Job 必须在受理前固定 `maxRequests`、`maxInputTokens`、`maxOutputTokens`、`maxTotalTokens`、`maxCost` 与 Model Gateway Quota Snapshot，任一字段缺失、为 unlimited 或预测越过当前环境 Evaluation Ceiling 时拒绝启动。初始 Ceiling 为每个 promptfoo Job `200 requests / 2,000,000 total tokens / 60min`、每个 EvalScope Job `1,000 requests / 10,000,000 total tokens / 4h`；`maxCost` 由当前币种与 Model Catalog 价格快照计算并且必须显式给出，不能因价格未知而放行。超出任一预算立即取消剩余请求并形成不完整 Evidence，不自动扩大配额。

三个 Profile、并发、Deadline、TTL 和 Evaluation Ceiling 均是版本化 `GITOPS_CONFIG`/Capacity Profile；业务 Policy 只能在 Ceiling 内收紧。Job 调度还必须满足当前有效 Capacity Profile 的 Rollout/Fault Headroom、Model Provider Quota 与本环境成本预算，不能挤占数据库、消息、Audit、Flux 或 Observability 的保留资源；Hardened Target 还必须满足 `platform-worker` N+1。扩大 Profile 或并发必须以实测 p95、峰值 Scratch、Provider 限流、Token/成本和 Node 故障证据建立新 Capacity Candidate。

## 4. 部署 Profile Contract

本文只定义物理拓扑必须遵守的 Target Contract，不建立版本或阶段索引，也不声明实现、验收、Environment Promotion 或 Deployed State。精确 Release 到 Profile 的映射与选择只见[实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)，分阶段服务器数量、CPU/RAM/Disk 和人数容量场景只见[环境容量与服务器规划](../12-implementation-roadmap/environment-capacity-plan.md)。

| 部署 Profile Contract | 通用物理拓扑 | 可靠性边界 |
| --- | --- | --- |
| Compact Launch Profile | Control Plane、Platform 与 Storage 逻辑 Role 可融合放置到 `core` Node；正式 Agent Capability 激活时，Sandbox 必须放置到独立物理 `sandbox-worker` | 允许 `NON_HA` 或减少非关键 Replica；故障时安全停止、形成证据并从 Cluster 外 Backup 恢复 |
| Hardened Target Profile | Control Plane、Platform、Sandbox 与 Storage 分别使用四类专用 Node Pool | Sandbox N+1、组件 HA、完整 Observability 与增强 DR；具体节点数量与容量数值由 12 拥有 |

### 4.1 逻辑 Role 不变量

Control Plane、Platform、Sandbox、Storage 是稳定的逻辑 Role 与隔离边界，不等同于物理服务器类型：

| 逻辑 Role | 责任 | 无论物理 Profile 都必须保持的边界 |
| --- | --- | --- |
| Control Plane | Kubernetes API、Scheduler、Controller、etcd | 身份、Taint/RBAC、备份与恢复材料独立；不向业务或 Browser 开放管理写入口 |
| Platform | Web、Control Plane 应用、数据服务、Operator、GitOps 与 Observability | 与 Sandbox 的身份、网络、Runtime 和容量账本隔离 |
| Sandbox | Kata/KVM Guest 与受控代码执行 | 正式验收起使用独立物理 `sandbox-worker`；专用 Taint、RuntimeClass、Egress 与 Lease |
| Storage | RWO 数据盘、Rook-Ceph MON/MGR/RGW/OSD 与恢复流量 | 保留存储身份、设备、调度、加密和故障域边界，不与业务容量混算 |

Compact Launch 可把 Control Plane、Platform 与 Storage 的 Pod/Daemon 融合放置在 `core` Node，但不能合并 Namespace、ServiceAccount、NetworkPolicy、StorageClass、Resource Reservation、Audit 或恢复责任。`NON_HA` 或减少非关键 Replica 只改变可用性：依赖故障时必须停止受影响操作、形成告警和证据，并从 Cluster 外 Backup/Restore 恢复，不能伪造成功或降级到匿名、明文、无限资源或不受保护存储。

所有 Profile 都使用稳定 `controlPlaneEndpoint` 与 Cluster 外 Private L4 NLB 的 TCP 6443 passthrough，TLS 由 API Server 提供；不得把单个 Node IP 固化为 Cluster Identity。全部 Node 关闭 swap，禁止 `LimitedSwap` 与 `failSwapOn=false`。这些 Kubernetes 不变量不因 `NON_HA`、物理融合或较少 Replica 而放宽。

正式 Agent Capability Activation Gate 要求每个可调度 `sandbox-worker` Node 对应独立物理服务器，不承载 Control Plane、Platform 或 Storage 工作负载。在共享物理 Host 上划分 Kubernetes Node、VM、Taint 或 RuntimeClass 都只能标记为 `LAB_ONLY`，不得成为正式 Agent 安全或 Release 验收证据。

### 4.2 Hardened Target Profile

Hardened Target 将四个逻辑 Role 拆为四类专用 Node Pool：

- `k8s-control-plane` 承载 Kubernetes API、Scheduler、Controller 与 etcd；
- `platform-worker` 承载平台应用、数据服务、Operator、GitOps 与 Observability；
- `sandbox-worker` 承载 Kata/KVM Guest 与受控代码执行，并保持独立物理边界；
- `storage-worker` 承载 RWO 存储物理实现、Rook-Ceph 与恢复流量。

Control Plane 保持专用 Node、stacked etcd 与 quorum；Sandbox Pool 使用 Kata/KVM 并保留 N+1；Storage Pool 使用 Rook-Ceph 和 Host 故障域；Platform、数据、Secret 与 Observability 按各 owner 的 HA Contract 跨 Node 分散。精确节点数量、服务器规格、磁盘和 Capacity Ceiling 不在本文重复，统一链接[环境容量与服务器规划](../12-implementation-roadmap/environment-capacity-plan.md)。

Hardened Target 是稳定目标，不是首次正式 Launch 的默认 Release Gate。未达到 Evolution Trigger 时，不能仅因目标存在就要求提前物理拆分；若 Trigger 在发布前成立，相应增强按第 10 节成为 Release Blocker。

## 5. Sandbox Worker 交付 Gate

`sandbox-worker` 使用预烘焙、不可变 Node Image。禁止 `kata-deploy`、cloud-init、SSH 或在线补装改变已入池节点；新 Runtime、Kernel、Node Image 或 Runtime Profile 通过逐节点替换完成。

节点入池前必须全部通过 `/dev/kvm`、CPU virtualization、KVM module、`kata-runtime check`、Guest Lifecycle、RuntimeClass、Network、CSI、MTU、性能、Reboot、Drain 与 Soak Gate。任一 Gate 失败时节点不能承载 Sandbox，调度必须拒绝而非回退到 `runc`、共享 Host 或不满足隔离要求的 Runtime。Sandbox 生命周期、Lease、Execution Binding、Capacity Admission 与 Fail Closed 语义只见 [Sandbox Runtime](../04-sandbox-runtime/sandbox-runtime-detail.md)。

Launch 使用单台 Sandbox Server 时不承诺 N+1；节点故障必须停止新 Lease、Fence 受影响实例、形成可恢复证据，并按 04 Contract 安全结束或重试。Hardened Target 才要求 Sandbox N+1 与维护余量；其容量仍受 12 选定 Profile 约束。

## 6. Network 与 Gateway

Cilium 提供 eBPF kube-proxy replacement、cluster-pool IPAM、IPv4/VXLAN/WireGuard 与 Hubble；`socketLB.hostNamespaceOnly=true`。各 Namespace 建立双向 default deny，再按 Workload Identity、端口、协议和目标精确放行。Hardened Target 的 Hubble Relay 使用跨 Node Replica；Launch 可采用最小实例，但 NetworkPolicy、安全日志和 Deny 可见性不能关闭。

Gateway API 是平台北向入口，接受 `DIRECT_OR_L4_TRANSPARENT` 流量模型。任何 forwarded headers 都是不可信输入，只有可信边界写入的标准化上下文可被后端使用。Browser 不能直连数据库、NATS、OpenBao、Kubernetes、Cloud、RGW 管理接口或 Model Gateway。

Sandbox 默认不得访问数据库、NATS、OpenBao、Kubernetes API、Cloud Metadata、其他 Sandbox 或任意公网；仅由 03/04 owner 的受控 Egress Policy 放行批准的 Model、Git、依赖或搜索目标。DEV 与 PROD 没有共享 Gateway 或跨环境转发路径。

## 7. Storage Physical Profile

实时 Stateful Workload 使用逻辑 `stateful-rwo-lowlatency`：RWO、`WaitForFirstConsumer`、`Retain`、online expansion、exclusive block，并禁止静默 Ceph fallback。它承载 PostgreSQL、Valkey、NATS、OpenBao、Scanner Signature 和 Observability 的实时卷；组件数据语义、单组件 Envelope、Retention 和恢复分别由 07/08 owner，本文只验证选定 Profile 的物理实现和 Aggregate Ceiling。

Compact Launch 允许 Storage 逻辑 Role 融合到 `core`，但必须保留独立设备/StorageClass、静态加密、Cluster 外 Backup、容量账本、恢复/扩容 Headroom 和故障可见性。Storage 或 Backup 链不可证明时依赖写入 Fail Closed。Launch 不因物理融合而把 RWO、Object、OS/etcd 或 Scratch 混作同一容量。

Hardened Target 使用专用 `storage-worker` Pool 和 PCS 锁定的 Rook-Ceph，提供 RGW Object Storage；Rook Operator、MON、MGR、RGW 与 OSD 跨 Host 分散，Ceph 使用三副本、`min_size=2` 与 `failureDomain=host`。OS/MON 与 Raw OSD 使用物理分离设备，Recovery、Backfill、Scrub 和故障切换保留独立 Headroom；OSD 必须满足 [08 的 dm-crypt/LUKS 与恢复 Gate](../08-security-audit-governance/security-audit-governance-detail.md)。RGW 只承载对象类存储，不承载实时 RBD/CephFS PVC；Bucket Class、Object Version、Retention、Object Lock 和双 Capacity Ledger 由 07/08 定义。

Raw、Bucket Class、RWO 与 Backup 的数值、阈值和扩容场景只在[环境容量与服务器规划](../12-implementation-roadmap/environment-capacity-plan.md)维护。09 通过 Provisioning Gate 验证它们可以落到所选物理设备、调度与恢复窗口，不建立第二份容量表。

## 8. Observability 与 Operations Health

OpenTelemetry 是统一遥测协议。Telemetry 只用于诊断，不得改写业务、授权、Configuration、Audit、Provider 状态或恢复事实。Operations Adapter 按 06 Contract 生成只读 Operations Read Model；管理端只读展示 Baseline、Effective Configuration、Health、容量、性能、告警、Gap、Drift、Backup/Restore、依赖、TCO、趋势和 Runbook。

### 8.1 Compact Launch Profile

Launch 必须具备最小 Metrics、Logs、Alert、Backup/Restore 和 Operations Health。Prometheus、Grafana、Loki 与 OpenTelemetry 可以使用较少 Replica，Alert 路径可以采用最小实例；被 12 选入的 Tempo、Hubble 或其他诊断能力同样可以采用最小拓扑。任何精简都必须满足：

1. 关键服务、容量拒绝、Flux Drift、Backup/Restore、Security Floor 和 Sandbox 隔离失败可被检测并告警；
2. Telemetry 不可用不放宽业务 Gate；诊断数据耗尽可有界丢弃，但必须记录 Dropped Count、Gap 与告警；
3. 单点故障可以导致受影响诊断能力停止，但不得阻断安全停止、Audit 可靠提交或真实恢复；
4. 管理端保持只读，不建立 Grafana/Flux/Kubernetes/Cloud 的嵌入式写控制面。

`PrometheusRule + Alertmanager` 是告警计算与通知状态事实源，Grafana Managed Alerting 关闭。Loki Gateway 必须清除调用方提供的 `X-Scope-OrgID` 以及所有可伪造的认证和身份 Header；完成可信入口认证授权后，再按当前 Platform Environment 注入固定 `X-Scope-OrgID`。该 Header 只作为 Tenant 路由与隔离标签，绝不能作为认证或授权证据；NetworkPolicy 必须禁止绕过 Gateway 直连 Loki。

Tempo 固定 `multitenancy_enabled=false`，但单租户不等于开放访问。Ingest 与 Query 入口仍必须分别执行 TLS/mTLS、Workload Identity、认证授权、证书用途、端口与 NetworkPolicy 隔离；Browser、普通 Pod 与 Sandbox 不得直连 Tempo 或其他 Observability Backend，也不能通过 Header 取得写入或查询资格。

### 8.2 Hardened Target Profile

Hardened Target 启用完整 Observability 拓扑：Prometheus 双 Replica 与 Thanos Sidecar/Query、Alertmanager 三 Replica、Grafana 双 Replica、Loki 三 Replica 与双 Gateway、Tempo Backend、双 OpenTelemetry Gateway、每 Node Agent/Exporter/Canary，以及跨 Node 的 Hubble Relay 与只读 Hubble UI。Prometheus、Alertmanager、Loki 等 Stateful/Quorum 组件使用 Anti-affinity、Topology Spread 与 PDB；完整 Replica、Queue、Retention 与 Object Backend 必须经故障和恢复 Gate 验证。

Thanos、外部 Operations Collector 与 External Watchdog 属于 Hardened Target。Collector 位于目标 Cluster 及其 Cluster 内依赖之外，不占 Kubernetes Node Pool，也不持有 Kubernetes Admin Credential；它只消费 06 的受限 External Status Feed。External Watchdog/Alertmanager Deadman Receiver 进一步独立于 Cluster、Platform API、PostgreSQL 和 Collector，不持有 Cluster Admin Credential。未就绪时必须显示 `EXTERNAL_WATCHDOG_NOT_READY`，不能声明具备 Cluster 失联告警能力。

扩展 Observability Backend 只能通过 OTLP、Adapter、新 PCS、Dual Write/Read、Query Parity、Retention/Backfill、故障和回退验证迁移，不修改领域模块。

## 9. Backup、Restore 与 Cluster DR

Launch Profile 从首次启用持久事实起就必须具备 Cluster 外 Backup、真实 Restore、恢复材料版本绑定和只读恢复健康。单节点或较少 Replica 可以在故障时停止服务，但不能把同盘快照、Pod/PVC 存活或未演练备份声明为恢复能力。恢复顺序先满足 08 的信任和解密链，再执行 07 的组件恢复，最后验证 Cluster、业务工作负载和 Observability；组件恢复完成不等于端到端业务可用。

Hardened Target 提供单站点 Cluster HA 与增强 Cluster DR，不自动扩展为 Zone、Region、Account 或 Site DR；DEV 不是 PROD Standby。Cluster 外 `kubernetes-etcd-backup` Repository、Recovery Bundle 和 External Watchdog 位于目标 Cluster 故障域之外。目标恢复 Contract 为：DEV etcd Snapshot 每 3 小时、保留 7 天、RPO 不超过 6 小时、RTO 不超过 120 分钟并每月 Drill；PROD 每 30 分钟 Snapshot、保留 48 小时周期点与 30 天每日点、RPO 不超过 1 小时、RTO 不超过 120 分钟并每季度 Drill。

etcd Snapshot 使用 PCS 锁定的 `etcdctl snapshot save` 与 `etcdutl snapshot status` 验证，不以 Member Data Directory、PVC/CSI Snapshot 或单节点文件复制充当权威恢复源。每个 Snapshot 绑定唯一 Manifest、匹配 Recovery Bundle、PCS/GitOps Revision、对象版本与校验值；改变 API EncryptionConfiguration、证书、Member、Control Plane Node 或执行破坏性维护前先生成 `BACKUP_VERIFIED` Pre-change Snapshot。

Restore Drill 在隔离环境以已验证 Snapshot 重建受控 Membership/Cluster Identity，验证 etcd Hash/Revision/Quorum、API `/readyz`、Controller/Scheduler Lease、核心 API Object、Secret 可读性、Node/PVC/Operator 状态与 GitOps Reconcile。禁止使用未 Fence 的旧 Member、旧 Member Data Directory 或 `--force-new-cluster` 规避恢复验证。

## 10. Capacity、Evolution Trigger 与 Release Blocker

### 10.1 Capacity 与配置 owner

12 选择 Capacity Profile，并唯一维护分阶段采购、CPU/RAM/Disk、人数服务器矩阵和 Profile 数值；10 拥有已发布 Policy Effective Value、Snapshot 和生命周期；09 读取二者与 PCS，执行以下验证：

- Aggregate Request/Limit、Daemon/Operator、Tool Job、Storage、Rollout 与故障余量不越过物理 Ceiling；
- Logical Role、Taint、Affinity、PDB、Topology、RuntimeClass、StorageClass 和 NetworkPolicy 可以在所选拓扑上调度；
- Sandbox、Storage、Audit、Backup/Restore 与 Observability 的保留资源不能被低优先级工作负载挤占；
- Capacity Rejection、Queue、恢复窗口和 TCO 输入可以从 Desired/Effective/Observed 三类证据对账。

Policy 只能在物理 Ceiling 内收紧，不能扩大 Capacity Profile；09 不通过后台写入 Policy，10 不通过 Policy 声明新增服务器。所有运维参数在管理端只读展示；`PLATFORM_POLICY` 只有当前有效 Super Admin 可以按 10 发布，`GITOPS_CONFIG` 只能通过环境独立 Git Review 修改。

### 10.2 Evolution Trigger Contract

Evolution Trigger 必须绑定 Environment、Profile/Policy Revision、观察窗口、样本覆盖、数据完整性、阈值、持续时间、重复次数、关联事件、趋势和候选影响，不依据单个瞬时指标迁移。至少评估下列证据域：

| 证据域 | 必须回答的问题 | 可触发的候选 |
| --- | --- | --- |
| Queue | Agent/Build/Tool Queue 等待是否在多个完整窗口持续越过已批准 SLO | 增加 Sandbox 或 Platform Capacity |
| Capacity Rejection | `CAPACITY_UNAVAILABLE`、Storage/Audit Admission Rejection 是否持续越过已发布阈值 | 扩容或拆分对应物理 Role |
| Sandbox/Storage p95 | CPU、Memory、Runtime Disk、IO、Recovery/Backfill p95 是否持续逼近 Ceiling 并影响 Headroom | 增加 Sandbox、OSD 或独立 Storage Pool |
| SLO | Platform API、数据依赖、Flux Reconcile、Observability 缺口是否持续影响已批准 SLO | Replica、HA 或完整 Observability |
| 维护窗口 | Rollout、Upgrade、Drain、Scrub、Backup 是否无法在批准窗口内完成 | 专用 Pool、N+1 或额外 Headroom |
| Recovery | 实测 RPO/RTO、Node/Cluster 故障和 Restore Drill 是否不能满足 Contract | 增强 Backup、Quorum、External Watchdog 或 DR |
| TCO | 当前 Profile 的扩容、停机风险与运维成本是否持续高于拆分/替代方案 | 物理拆分或 Provider Mapping 演进 |

单个告警、一次负载峰值或不完整测量只创建调查和补充观测，不自动采购、迁移或启用。Trigger 未达到时，Compact Launch 无须为了 Hardened Target 的存在提前拆分 Control Plane、Platform 或 Storage；正式 Sandbox 的独立物理边界不受此规则放宽。

若 Trigger 在某次发布前按 Published Policy 与完整证据成立，受影响增强自动从演进候选升级为该 Release 的 Release Blocker：必须建立新的 Capacity Candidate，完成兼容、迁移、回退、容量、安全、恢复、Observability 和 Provisioning Gate，才能继续发布。Trigger 仍不自动修改 Release Scope、Policy、GitOps Desired State 或 Deployed State。

### 10.3 TCO Snapshot

`Environment TCO Snapshot` 是版本化只读 Contract，引用 CloudEnvironmentBinding、PCS、Capacity Profile、Policy Revision 与报价有效期，记录精确 SKU、数量、购买方式、磁盘类型、NLB、KMS、外部 Backup、NAT/EIP/Egress、网络流量、恢复演练、币种、税费与折扣。Region、Zone、SKU 和价格由部署输入填充；DEV 与 PROD 独立估价，不能共享购买或把一个环境的故障风险隐藏在另一个环境。

TCO 只作为 Trigger 与决策证据，不能修改业务、Policy、Capacity Ceiling 或 Deployed State。服务器与存储数值统一引用 [12 容量事实源](../12-implementation-roadmap/environment-capacity-plan.md)，不在本文建立副本。

## 11. 不变量

1. 本文描述完整 Target Architecture，不声明版本状态、环境 Promotion 或实际部署；这些只由 12 与 Deployed State 证据拥有。
2. DEV 与 PROD 使用同一组件模板的独立实例，不共享 Gateway、Flux、GitOps State、数据、Secret、Backup 或运行资源。
3. Control Plane、Platform、Sandbox、Storage 逻辑 Role 始终隔离；Compact Launch 只融合物理放置，正式 Sandbox 必须使用独立物理 `sandbox-worker`，共享 Host 仅 `LAB_ONLY`。
4. Launch 可以 `NON_HA` 或减少 Replica，但已启用能力必须 Fail Closed、可观测、保留证据并可恢复；Hardened Target 才无条件要求完整 Node Pool、N+1、HA、完整 Observability 与增强 DR。
5. Flux 每环境独立 Reconcile；promptfoo、EvalScope、OSV-Scanner 仅在能力激活时作为一次性受限 Job 运行，不常驻。
6. 12 选择 Capacity Profile，10 拥有 Policy Effective Value 与生命周期，09 验证物理 Ceiling、调度可行性和 Provisioning Gate；三者不得形成平行事实源。
7. 管理端只读展示运维参数；动态 Policy 仅 Super Admin 按 10 管理，GitOps 变更只经受保护 Git Review。
8. Evolution Trigger 需要持续、完整、可关联证据；未达到不要求物理拆分，发布前达到则对应增强成为 Release Blocker，但不自动部署。
