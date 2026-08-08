# 基础设施与运维

> 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义完整 Target Architecture 中的 Platform Environment 与 `CloudEnvironmentBinding`、Platform Compatibility Set（PCS）、Flux GitOps Desired State、Kubernetes 与逻辑 Node Role、物理放置、网络与 Gateway、存储物理拓扑、Observability、Cluster DR、物理容量准入与 TCO Contract。本文只描述目标架构，不声明任何环境已 Provision、已部署或已接收 Promotion：环境 Deployed State 只能由该环境的 GitOps Desired State、PCS 与 Operations Read Model 运行证据证明，Region、Zone、vSwitch、CIDR、精确资源 ID、SKU、价格与折扣都只是 Binding 与部署输入，路线图选择的 Capacity Profile 不能替代运行证据。

本文拥有各 Profile 必须遵守的基础设施不变量、物理放置验证与 Hardened Target 目标拓扑，不拥有身份与业务状态、Secret/加密/PKI/Audit、组件数据与组件级恢复算法、Release 版本与 Environment Promotion、Profile 选择或人数容量矩阵；Operations Read Model、Console Access、External Status Feed 与公告流程属于 [06](./06-platform-application-integration.md)，Volume/Ceph/Object 的静态加密语义属于 [08](./08-security-audit-governance.md)，配置生命周期属于 [10](./10-configuration-governance.md)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：PCS 当前锁定的组件版本、Chart、Operand 与 Image 组合见[参数附录的 Runtime 组件清单](./appendix-parameters.md#runtime-组件清单)，服务器数量、SKU、CPU/RAM/Disk、Raw/RWO/Backup 数值与人数容量场景见[容量与服务器规划](./appendix-parameters.md#容量与服务器规划)，Flux 与 Observability 的组件资源、拓扑与 etcd DR 目标见[组件资源包络](./appendix-parameters.md#组件资源包络)，一次性 Tool Job 的资源、并发、Deadline、TTL 与 Evaluation Ceiling 见[Resource Profile](./appendix-parameters.md#resource-profile)，告警与扩容判定消费的结构化原因码见[错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 环境与实例隔离

```text
DEV Platform Environment                 PROD Platform Environment
独立 Account / VPC / Cluster             独立 Account / VPC / Cluster
独立 Gateway / Flux / GitOps State       独立 Gateway / Flux / GitOps State
独立数据、Secret、备份与运行资源           独立数据、Secret、备份与运行资源
             同一组件模板、Contract 与 PCS 兼容基线
```

每个 Platform Environment 使用独立 Resource Account、VPC、Kubernetes Cluster、IaC State、Identity、CIDR、Gateway、Flux、证书、KMS、Backup 与 Audit 边界。`CloudEnvironmentBinding` 是不可变 Generation，绑定 Environment、Account、Region、Zone Set、CIDR、Provider Resource Mapping、入口与恢复 Repository；改变 Account、Region、Zone、CIDR 或核心 Mapping 必须建立新 Generation 并完成迁移、回退与验证。“同一个组件”只表示同源模板与兼容 Contract，不表示共享同一个 Gateway、Flux、数据服务、Secret 或任何运行实例。

### 可验证部署组合

```text
CloudEnvironmentBinding Generation
+ PCS Digest
+ 12 选定的 Environment Capacity Profile Digest
+ 10 提供的 Effective Policy Revision
+ Provisioning Gate 结果
```

PCS 是平台组件版本、Chart/Manifest、Image 与兼容关系的注册表：每个制品绑定 Artifact/Image Digest，精确 Patch、Chart、Operand、CRD 与 Image 组合是同一 PCS 不可分割的内容。每次部署、升级、扩容或物理拆分都生成上述可验证组合；Provisioning Gate 校验目标 Account/Region/Zone 的服务可用性、Quota、库存、故障替换余量、Provider Host 隔离、Node/Storage/Network 兼容性、证书、KMS、Backup Repository、Object Lock、Aggregate Physical Ceiling、调度、PDB、Rollout/Fault Headroom、升级、故障与恢复条件。

### 部署 Profile 与逻辑 Role

| 部署 Profile Contract | 通用物理拓扑 | 可靠性边界 |
| --- | --- | --- |
| Compact Launch Profile | Control Plane、Platform 与 Storage 逻辑 Role 可融合放置到 `core` Node；正式 Agent Capability 激活时 Sandbox 必须放置到独立物理 `sandbox-worker` | 允许 `NON_HA` 或减少非关键 Replica；故障时安全停止、形成证据并从 Cluster 外 Backup 恢复 |
| Hardened Target Profile | 拆为 `k8s-control-plane`、`platform-worker`、`sandbox-worker`、`storage-worker` 四类专用 Node Pool | Control Plane 专用 Node 与 stacked etcd quorum、Sandbox N+1、组件 HA、完整 Observability 与增强 Cluster DR |

Control Plane、Platform、Sandbox、Storage 是稳定的逻辑 Role 与隔离边界，不等同于物理服务器类型：

| 逻辑 Role | 责任 | 无论物理 Profile 都必须保持的边界 |
| --- | --- | --- |
| Control Plane | Kubernetes API、Scheduler、Controller 与 etcd | 身份、Taint/RBAC、备份与恢复材料独立；不向业务或 Browser 开放管理写入口 |
| Platform | Web、Control Plane 应用、数据服务、Operator、GitOps 与 Observability | 与 Sandbox 的身份、网络、Runtime 与容量账本隔离 |
| Sandbox | Kata/KVM Guest 与受控代码执行 | 正式验收起使用独立物理 `sandbox-worker`；专用 Taint、RuntimeClass、Egress 与 Lease |
| Storage | RWO 数据盘、Rook-Ceph MON/MGR/RGW/OSD 与恢复流量 | 保留存储身份、设备、调度、加密与故障域边界，不与业务容量混算 |

Hardened Target 是稳定目标，不是首次正式 Launch 的默认 Release Gate；Platform、数据、Secret 与 Observability 按各 owner 的 HA Contract 跨 Node 分散。

### Evolution Trigger 证据域

Evolution Trigger 必须绑定 Environment、Profile/Policy Revision、观察窗口、样本覆盖、数据完整性、阈值、持续时间、重复次数、关联事件、趋势与候选影响，并至少评估下列证据域：

| 证据域 | 必须回答的问题 | 可触发的候选 |
| --- | --- | --- |
| Queue | Agent/Build/Tool Queue 等待是否在多个完整窗口持续越过已批准 SLO | 增加 Sandbox 或 Platform Capacity |
| 容量拒绝 | Lease、Storage 与 Audit 的准入拒绝比例是否持续越过已发布阈值 | 扩容或拆分对应物理 Role |
| Sandbox/Storage p95 | CPU、Memory、Runtime Disk、IO 与 Recovery/Backfill p95 是否持续逼近 Ceiling 并影响 Headroom | 增加 Sandbox、OSD 或独立 Storage Pool |
| SLO | Platform API、数据依赖、Flux Reconcile 与 Observability 缺口是否持续影响已批准 SLO | Replica、HA 或完整 Observability |
| 维护窗口 | Rollout、Upgrade、Drain、Scrub 与 Backup 是否无法在批准窗口内完成 | 专用 Pool、N+1 或额外 Headroom |
| Recovery | 实测 RPO/RTO、Node/Cluster 故障与 Restore Drill 是否不能满足 Contract | 增强 Backup、Quorum、External Watchdog 或 DR |
| TCO | 当前 Profile 的扩容、停机风险与运维成本是否持续高于拆分或替代方案 | 物理拆分或 Provider Mapping 演进 |

`Environment TCO Snapshot` 是版本化只读 Contract，引用 `CloudEnvironmentBinding`、PCS、Capacity Profile、Policy Revision 与报价有效期，记录 SKU、数量、购买方式、磁盘类型、NLB、KMS、外部 Backup、NAT/EIP/Egress、网络流量、恢复演练、币种、税费与折扣；DEV 与 PROD 独立估价，不共享购买，也不把一个环境的故障风险隐藏在另一个环境。

## 关键不变量

- DEV 与 PROD 是同一组件模板的独立实例，不共享 Gateway、Flux、GitOps State、Git Credential、IaC State、数据、Session、Secret、Key、Backup、Provider Trust 或任何运行资源，一个环境的资格、路径、MR 与 ServiceAccount 也不能操作另一环境——环境是可验证的故障域与信任域边界。
- 环境间没有默认网络互通，Management Account 只承载治理而不承载平台工作负载、数据或恢复材料，治理面与 TCO 读取故障也不是已运行请求的同步依赖——治理面故障不应放大成业务故障。
- 任何安全更新、Patch、Digest 或兼容配置变化都创建新 PCS Candidate 并按 [12](./12-implementation-roadmap.md) 选定的 Promotion 与 Gate 验证，禁止 `latest`、浮动 Tag、启动时自动升级或只升级 Chart 而不验证 Operand/CRD——版本组合只有整体验证过才可信。
- 领域文档不建立第二份版本表或容量表，本文也不复制路线图与附录的计划事实——同一数值只能有一个 owner，副本会静默分叉。
- Provisioning Gate 任一条件未通过时保持 Candidate，不启动降级部署，也不允许修改 Policy、临时超卖或移除安全控制来适配物理资源——不能用放宽规则换取部署成功。
- Git 中经 Review 合并的 Manifest/Helm Revision 是 `GITOPS_CONFIG` Desired State，Flux CR Status、Inventory、Condition 与 Event 只是可重建的 Reconcile Observed State——观测状态不能成为业务、配置、权限、Audit 或恢复事实源。
- 每个环境在自己的 Cluster 内独立部署一套 Flux（`source-controller`、`kustomize-controller`、`helm-controller`、`notification-controller`），不启用 `image-reflector-controller`、`image-automation-controller` 或任何自动写回 Git 的组件，也不由一个实例跨环境 Reconcile，Image/Chart/Manifest 升级仍须经过 Git Review、PCS Candidate 与 Provisioning Gate——单向 Reconcile 与环境隔离共同保证 Git 是唯一 Desired State 入口。
- 每个环境的 `GITOPS_CONFIG` 使用独立受保护 Repository 或环境路径与受保护主分支且禁止 direct push；平台 Capability、Super Admin、GitLab Project Role 与 GitOps 合并资格互不继承，只有 GitOps/IaC Operations Owner 可提交、只有本环境 Operations Reviewer 可批准合并，Cluster Foundation 路径另受独立 CODEOWNERS/Review Gate 保护——基础设施写权限必须与业务权限分离并按环境隔离。
- 合并证据至少绑定 Environment、MR、Commit SHA、目标路径、Reviewers、签名/校验结果、PCS 与 Capacity Profile Candidate 及时间并进入 Provider/Git Audit——Desired State 的每次变化都要可追责。
- Flux 只读取当前环境已批准的 Git/OCI/Helm 来源与本 Cluster Kubernetes API，Git Credential 只读且按环境隔离并遵循 [08](./08-security-audit-governance.md) 的 Secret Contract，`kustomize-controller` 与 `helm-controller` 固定启用 `--no-cross-namespace-refs=true`，每个 `Kustomization`/`HelmRelease` 必须绑定显式 Reconcile ServiceAccount 并由 Admission/Git Validation 拒绝缺失身份、越权 Namespace/API Group 或未批准 Cluster-scoped Resource——Reconcile 的权限面必须显式、最小且可枚举。
- 普通 Namespace Bundle 不能继承 Cluster Admin，只有经独立 Review 的 Cluster Foundation Bundle 可使用专用 Cluster-scoped Identity，且 Controller 自身身份、Reconcile 身份、业务 Workload 身份与人工运维身份彼此分离、Controller 只获得受控 Reconcile 与显式 Impersonation 所需的 Kubernetes RBAC——一个 Bundle 的失误不应升级为整个 Cluster 的写权限。
- 默认使用有界轮询而不增加公网 Webhook 入口，Source Verification、Artifact Digest、Reconcile Failure、Suspended Resource、Drift、Stalled Condition 与版本不兼容必须进入 Observability——GitOps 的沉默失败等于无声漂移。
- 任何绕过 Git Review 的 `kubectl apply`、Flux 手工 Patch 或紧急修改都不成为新的 Desired State，恢复只能按受控 Runbook 回写 Git 并重新 Reconcile——带外修改会在下一次 Reconcile 静默消失。
- Flux 没有独立数据库与 PVC；Controller 不可用时暂停新 Reconcile 并告警，已运行的业务工作负载继续运行并在恢复后从 Git 与 Cluster 当前状态幂等收敛——控制面故障不应中断已经生效的工作负载。
- 平台只通过只读 Operations Adapter 投影 Desired/Effective/Drift，不向 Browser 暴露 Kubernetes 或 Flux 写接口，也不建立独立 Flux Console——只读投影不应升级为基础设施管理面。
- `promptfoo`、`EvalScope` 与 `OSV-Scanner` 只在对应 Capability 被路线图选择且通过适用 Gate 后，作为版本锁定、无 PVC、Scratch 有界的一次性 Kubernetes Job 运行在 Platform 逻辑 Role（Launch 放置到 `core`，Hardened Target 放置到 `platform-worker`），结构化结果先固化到 Artifact 再按 TTL 清理 Job/Pod，能力未激活时不部署、不预热、不常驻——未启用的能力不应占用容量或扩大攻击面，证据也必须先落地再清理。
- 一次性 Job 使用 Non-root、只读 RootFS、禁用 Privilege/Host Namespace/HostPath 与 `automountServiceAccountToken=false`；只有 OpenBao Agent init/sidecar 可挂载短 TTL、`audience=openbao` 的 projected Token 并把短期 mTLS/Service Identity 写入 tmpfs 供主工具容器只读，不需要 Secret 的 Job 不启动 Injector——工具容器只应拿到本次执行必需的最小身份。
- 每个一次性 Job 按 [03](./03-agent-skill-model.md)/[06](./06-platform-application-integration.md) Contract 设置独立 NetworkPolicy、Secret 与数据权限，`OSV-Scanner` 不得取得 Model Provider Credential——扫描器的职责不包含调用模型。
- Evaluation Job 必须在受理前显式固定请求数、输入/输出/总 Token、成本上限与 Model Gateway Quota Snapshot，任一字段缺失、为 unlimited 或预测越过当前环境 Evaluation Ceiling 时拒绝启动，超出任一预算立即取消剩余请求并形成不完整 Evidence——预算未知的执行不能开始，也不能靠自动扩配额收尾。
- 一次性 Job 的 Profile、并发、Deadline、TTL 与 Ceiling 都是版本化 `GITOPS_CONFIG`/Capacity Profile，业务 Policy 只能在 Ceiling 内收紧，调度还必须满足 Rollout/Fault Headroom、Provider Quota 与成本预算且不挤占数据库、消息、Audit、Flux 或 Observability 的保留资源，Hardened Target 另须满足 `platform-worker` N+1，扩大 Profile 或并发必须以实测 p95、峰值 Scratch、Provider 限流、Token/成本与 Node 故障证据建立新 Capacity Candidate——诊断与评测工作负载不能挤掉它们要服务的系统。
- Compact Launch 只融合物理放置，不合并 Namespace、ServiceAccount、NetworkPolicy、StorageClass、Resource Reservation、Audit 或恢复责任——融合是成本选择，不是边界豁免。
- `NON_HA` 与减少非关键 Replica 只改变可用性：依赖故障时必须停止受影响操作、告警留证并从 Cluster 外 Backup/Restore 恢复，不得伪造成功或降级到匿名、明文、无限资源或不受保护存储——可用性可以降级，安全与正确性不可以。
- 所有 Profile 使用稳定 `controlPlaneEndpoint` 与 Cluster 外 Private L4 NLB 的 TCP 6443 passthrough 并由 API Server 提供 TLS，不把单个 Node IP 固化为 Cluster Identity，全部 Node 关闭 swap 且禁止 `LimitedSwap` 与 `failSwapOn=false`——这些 Kubernetes 不变量不因 `NON_HA`、物理融合或较少 Replica 而放宽。
- 正式 Agent Capability Activation Gate 要求每个可调度 `sandbox-worker` 对应独立物理服务器且不承载 Control Plane、Platform 或 Storage 工作负载，共享物理 Host 上划分的 Node、VM、Taint 或 RuntimeClass 只能标记 `LAB_ONLY`——共享 Host 无法证明 Kata Guest 之外的隔离，也不能充当安全或 Release 验收证据。
- `sandbox-worker` 使用预烘焙不可变 Node Image，禁止 `kata-deploy`、cloud-init、SSH 或在线补装改变已入池节点，新 Runtime、Kernel、Node Image 或 Runtime Profile 只经逐节点替换生效——可变节点会让隔离结论不可复现。
- 节点入池前必须全部通过 `/dev/kvm`、CPU virtualization、KVM module、`kata-runtime check`、Guest Lifecycle、RuntimeClass、Network、CSI、MTU、性能、Reboot、Drain 与 Soak Gate，任一 Gate 失败时调度必须拒绝而不回退到 `runc`、共享 Host 或不满足隔离要求的 Runtime——隔离保证优先于可用性，Lease 与执行语义仍以 [04](./04-sandbox-runtime.md) 为准。
- Launch 的单台 Sandbox Server 不承诺 N+1：节点故障必须停止新 Lease、Fence 受影响实例并形成可恢复证据——没有余量时正确的行为是安全停止而不是继续调度。
- Cilium 提供 eBPF kube-proxy replacement、cluster-pool IPAM、IPv4/VXLAN/WireGuard 与 Hubble 并固定 `socketLB.hostNamespaceOnly=true`；各 Namespace 建立双向 default deny 后再按 Workload Identity、端口、协议与目标精确放行，Launch 可采用最小实例但不得关闭 NetworkPolicy、安全日志与 Deny 可见性——最小拓扑不等于最小可见性。
- Gateway API 是唯一北向入口且接受 `DIRECT_OR_L4_TRANSPARENT` 流量模型，forwarded headers 一律不可信、只有可信边界写入的标准化上下文可被后端使用，Browser 也不能直连数据库、NATS、OpenBao、Kubernetes、Cloud、RGW 管理接口或 Model Gateway——入口之外不存在第二条可信路径。
- Sandbox 默认不得访问数据库、NATS、OpenBao、Kubernetes API、Cloud Metadata、其他 Sandbox 或任意公网，只能由 [03](./03-agent-skill-model.md)/[04](./04-sandbox-runtime.md) 的受控 Egress Policy 放行已批准目标，DEV 与 PROD 之间也没有共享 Gateway 或跨环境转发路径——不可信执行面的可达性必须逐条显式授予。
- 实时 Stateful Workload（PostgreSQL、Valkey、NATS、OpenBao、Scanner Signature 与 Observability 的实时卷）一律使用逻辑 `stateful-rwo-lowlatency`：RWO、`WaitForFirstConsumer`、`Retain`、在线扩容、exclusive block，且禁止静默 Ceph fallback——实时卷的性能与故障域必须确定。
- Compact Launch 融合 Storage 时仍须保留独立设备/StorageClass、静态加密、Cluster 外 Backup、容量账本、恢复与扩容 Headroom 及故障可见性，并且不把 RWO、Object、OS/etcd 与 Scratch 混作同一容量；Storage 或 Backup 链不可证明时依赖写入 Fail Closed——容量与恢复能力不能靠共享磁盘假装存在。
- Hardened Target 的 Rook-Ceph 使用专用 `storage-worker`、跨 Host 分散的 Operator/MON/MGR/RGW/OSD、三副本、`min_size=2` 与 `failureDomain=host`，OS/MON 与 Raw OSD 使用物理分离设备，并为 Recovery、Backfill、Scrub 与故障切换保留独立 Headroom——副本数只有在故障域相互独立时才提供耐久性。
- OSD 必须满足 [08](./08-security-audit-governance.md) 的 dm-crypt/LUKS 与恢复 Gate，RGW 只承载对象类存储而不承载实时 RBD/CephFS PVC，Bucket Class、Object Version、Retention 与容量账本仍以 [07](./07-data-messaging-storage.md) 为准——加密与用途边界各由其 owner 判定，本文只验证物理实现与 Aggregate Ceiling。
- OpenTelemetry 是统一遥测协议，Telemetry 只用于诊断，不得改写业务、授权、Configuration、Audit、Provider 状态或恢复事实——诊断可见性不是事实源。
- 关键服务、容量拒绝、Flux Drift、Backup/Restore、Security Floor 与 Sandbox 隔离失败在任何 Profile 下都必须可检测并告警——最小拓扑的下限是“故障能被发现”。
- Telemetry 不可用不放宽业务 Gate，诊断数据耗尽可有界丢弃但必须记录 Dropped Count、Gap 与告警，单点故障可以停止受影响诊断能力但不得阻断安全停止、Audit 可靠提交或真实恢复——可观测性降级不能升级为安全降级。
- `PrometheusRule + Alertmanager` 是告警计算与通知状态的事实源，Grafana Managed Alerting 关闭——告警结论只能有一个来源。
- Loki Gateway 必须清除调用方提供的 `X-Scope-OrgID` 与所有可伪造的认证、身份 Header，在完成可信入口认证授权后按当前 Platform Environment 注入固定值，该 Header 只作 Tenant 路由与隔离标签而绝不作为认证或授权证据，NetworkPolicy 也必须禁止绕过 Gateway 直连 Loki——可伪造的 Header 不能承担隔离责任。
- Tempo 固定 `multitenancy_enabled=false`，但 Ingest 与 Query 入口仍分别执行 TLS/mTLS、Workload Identity、认证授权、证书用途、端口与 NetworkPolicy 隔离，Browser、普通 Pod 与 Sandbox 都不得直连任何 Observability Backend，也不能通过 Header 取得写入或查询资格——单租户不等于开放访问。
- Stateful 与 Quorum 类 Observability 组件使用 Anti-affinity、Topology Spread 与 PDB，完整 Replica、Queue、Retention 与 Object Backend 必须经故障与恢复 Gate 验证——冗余只有被故障验证过才是冗余。
- 管理端只读展示 Baseline、Effective Configuration、Health、容量、性能、告警、Gap、Drift、Backup/Restore、依赖、TCO、趋势与 Runbook，不建立 Grafana、Flux、Kubernetes 或 Cloud 的嵌入式写控制面——运维可见性不应升级为管理面。
- 外部 Operations Collector 位于目标 Cluster 及其 Cluster 内依赖之外、不占用 Kubernetes Node Pool、不持有 Kubernetes Admin Credential，并只消费 [06](./06-platform-application-integration.md) 的受限 External Status Feed；External Watchdog 与 Alertmanager Deadman Receiver 进一步独立于 Cluster、Platform API、PostgreSQL 与 Collector，未就绪时必须显式暴露未就绪原因而不得声明具备 Cluster 失联告警能力——判断整个 Cluster 是否失联的组件不能依赖该 Cluster。
- 扩展 Observability Backend 只能通过 OTLP、Adapter、新 PCS、Dual Write/Read、Query Parity、Retention/Backfill、故障与回退验证迁移，不修改领域模块——后端替换是基础设施事项，不是领域变更。
- 从首次启用持久事实起就必须具备 Cluster 外 Backup、真实 Restore、恢复材料版本绑定与只读恢复健康；同盘快照、Pod/PVC 存活或未演练备份都不构成恢复能力——未被演练过的恢复能力不能被声明为存在。
- 恢复顺序固定为先满足 [08](./08-security-audit-governance.md) 的信任与解密链、再执行 [07](./07-data-messaging-storage.md) 的组件恢复、最后验证 Cluster、业务工作负载与 Observability，组件恢复完成不等于端到端业务可用——顺序错误会形成解密循环或假性恢复。
- Hardened Target 只提供单站点 Cluster HA 与增强 Cluster DR，不自动扩展为 Zone、Region、Account 或 Site DR，DEV 也不是 PROD Standby——恢复范围必须显式声明而不能靠推断。
- Cluster 外 `kubernetes-etcd-backup` Repository、Recovery Bundle 与 External Watchdog 必须位于目标 Cluster 故障域之外——与被保护对象同故障域的备份等于没有备份。
- etcd Snapshot 只以 PCS 锁定的 `etcdctl snapshot save` 生成并经 `etcdutl snapshot status` 验证，不以 Member Data Directory、PVC/CSI Snapshot 或单节点文件复制充当权威恢复源，每个 Snapshot 绑定唯一 Manifest、匹配的 Recovery Bundle、PCS/GitOps Revision、对象版本与校验值——应用一致性与材料绑定共同决定快照能否真的恢复。
- 改变 API EncryptionConfiguration、证书、Member、Control Plane Node 或执行破坏性维护前必须先生成并验证 `BACKUP_VERIFIED` Pre-change Snapshot——高风险变更的回退点必须先存在。
- Restore Drill 在隔离环境以已验证 Snapshot 重建受控 Membership/Cluster Identity，并验证 etcd Hash/Revision/Quorum、API `/readyz`、Controller/Scheduler Lease、核心 API Object、Secret 可读性、Node/PVC/Operator 状态与 GitOps Reconcile，禁止使用未 Fence 的旧 Member、旧 Member Data Directory 或 `--force-new-cluster` 规避验证——绕过验证的“恢复”只是把损坏状态重新上线。
- [12](./12-implementation-roadmap.md) 选择 Reliability/Capacity Profile 并记录该选择，容量场景、Profile 数值与分阶段采购计划由[参数附录](./appendix-parameters.md#容量与服务器规划)保存，[10](./10-configuration-governance.md) 拥有已发布 `PLATFORM_POLICY` 的 Effective Value、Snapshot 与生命周期，本文读取三者与 PCS 执行物理验证——三方不得形成平行事实源。
- 物理验证至少覆盖四件事：Aggregate Request/Limit 与 Daemon/Operator/Tool Job/Storage/Rollout/故障余量不越过物理 Ceiling；逻辑 Role、Taint、Affinity、PDB、Topology、RuntimeClass、StorageClass 与 NetworkPolicy 可在所选拓扑上调度；Sandbox、Storage、Audit、Backup/Restore 与 Observability 的保留资源不被低优先级工作负载挤占；容量拒绝、Queue、恢复窗口与 TCO 输入可从 Desired、Effective 与 Observed 三类证据对账——可调度且可对账才算容量成立。
- Policy 只能在物理 Ceiling 内收紧而不能扩大 Capacity Profile，本文不通过后台写入 Policy，配置治理也不通过 Policy 声明新增服务器——配置面与物理面各自独立收紧，才不会互相放宽。
- 运维参数在管理端只读展示：`PLATFORM_POLICY` 只能由当前有效 Super Admin 按 [10](./10-configuration-governance.md) 发布，`GITOPS_CONFIG` 只能经环境独立 Git Review 修改——两类配置的变更通道不可互换。
- 单个告警、一次负载峰值或不完整测量只创建调查与补充观测，不自动采购、迁移或启用能力；Trigger 未达到时 Compact Launch 无须提前拆分 Control Plane、Platform 或 Storage，正式 Sandbox 的独立物理边界不因此放宽——演进决策需要持续、完整且可关联的证据。
- Evolution Trigger 在某次发布前按 Published Policy 与完整证据成立时，受影响增强升级为该 Release 的 Release Blocker 并须以新 Capacity Candidate 完成兼容、迁移、回退、容量、安全、恢复、Observability 与 Provisioning Gate，但 Trigger 本身不修改 Release Scope、Policy、GitOps Desired State 或 Deployed State——阻断发布与自动部署是两件不同的事。
- TCO 只作为 Trigger 与决策证据，不能修改业务、Policy、Capacity Ceiling 或 Deployed State——成本模型不产生运行事实。

## 与其他模块的关系

下表是本模块自身视角：09 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链运行所需的 Platform Environment、GitOps Desired State、Kubernetes、网络、可观测性、物理容量准入与环境恢复 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 专业运维 Console 访问的人员资格判定 | Platform Environment 隔离边界 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | 隔离执行对 Node、RuntimeClass、网络与磁盘的 Contract 要求 | Node Role、物理放置、已验证的 Aggregate Physical Ceiling、Provider Mapping 与准入验证方法 |
| [06 平台应用与集成](./06-platform-application-integration.md) | Operations Read Model 的只读投影边界、Flux 单向 Reconcile 约束与告警关联 | Cluster、Node、组件版本、PCS、GitOps Desired State、可观测性与总容量事实 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | 组件数据、故障与恢复 Contract，以及 Bucket Class 与 Backup 的容量账本证据 | Cluster、Node、StorageClass Provider Mapping、物理放置与 Aggregate Physical Ceiling、Cluster DR 与 Log/Trace Retention |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Kubernetes API、Volume、Ceph 与 Object 的静态加密语义，Workload Identity、PKI 与供应链 Gate 的安全判定 | Platform Environment、Cluster、网络、PCS 锁定的组件版本/digest、物理容量与 Cluster DR 语义 |
| [10 Configuration Governance](./10-configuration-governance.md) | 已发布 `PLATFORM_POLICY` 的 Effective Value、Snapshot 与通用配置生命周期语义 | 基础设施 `GITOPS_CONFIG` Desired State，以及物理 Ceiling、放置与 Headroom 的校验结论 |
| [12 实施路线图](./12-implementation-roadmap.md) | 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择 | Provisioning Gate、物理不变量与恢复证据，供 Release Gate 与 Capability Activation Gate 引用 |
| [参数附录](./appendix-parameters.md) | PCS 锁定版本、容量与服务器矩阵、组件资源包络与一次性 Tool Job 数值 | 本文正文中的定性规则 |
