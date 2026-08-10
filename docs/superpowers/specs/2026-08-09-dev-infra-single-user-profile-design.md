# V0.1 DEV 单用户 Kubernetes Profile 与决策登记重构设计

日期：2026-08-09
状态：已确认
范围：`engineering-platform` 架构决策文档与 `engineering-platform-gitops` DEV Desired State
前置设计：`docs/superpowers/specs/2026-08-09-dev-infra-v01-design.md`

## 背景

V0.1 DEV 仍采用 kubeadm 单节点 Kubernetes，并保留 Cilium、Flux、Gateway API、MinIO、CloudNativePG、基础 Observability、PostgreSQL/etcd 备份和真实恢复演练。实际使用者目前只有一人，目标服务器为 16C、约 62GiB 内存、根文件系统约 438GiB 可用空间，同时承载现有 Docker 工作负载。

原设计按较保守的共享 DEV 容量声明 MinIO 300Gi、PostgreSQL 100Gi、监控 45Gi，并要求独立数据盘和关闭 Swap。该包络不是 Kubernetes 的运行下限，也不适合当前单用户、共享主机的实际条件。本设计新增 DEV 专用最小 Profile，在不删除任何 V0.1 功能和验收项的前提下降低资源声明，并把偏差、保护措施和退出条件持久化为独立架构决策。

## 目标与非目标

### 目标

1. 保留原 V0.1 DEV 的完整功能、7 天保留期和验收证据。
2. 将可调整工作负载的稳态资源请求控制在 2 vCPU、6GiB 内存以内，并为突发任务保留适度上限。
3. 将平台稳态实际磁盘预算控制在 100GiB 内，恢复演练峰值控制在 130GiB 内，按当前服务器实测为其他程序保留约 300GiB。
4. 将每项架构决定或已批准偏差拆成独立文件，纳入架构基线校验，确保跨会话可发现、可追踪和可关闭。

### 非目标

- 不把 DEV 改为 Docker Compose、k3s 或多节点 Kubernetes。
- 不删除备份、恢复、Gateway、GitOps 或 Observability 功能。
- 不把本 Profile 推广到 PROD，也不改变目标架构的 HA、故障域和在线扩容要求。
- 不通过猜测补齐应用镜像 Digest、MinIO 供应链结论或服务器运行证据。
- 不对共享根文件系统执行分区、LVM 缩容或 filesystem quota 改造。

## 决策一：重构架构决策登记

### 目录与职责

删除单体 `docs/architecture/deviations.md`，改为：

```text
docs/decisions/
├── README.md
├── DEV-001-same-host-backup.md
└── DEV-002-single-user-kubernetes-profile.md
```

- `README.md` 是决策索引，只记录编号、标题、状态、适用范围和文件链接，不复制正文事实。
- `DEV-001` 迁移现有“同机备份与审计归档”偏差，保持批准日期、风险和关闭条件不变。
- `DEV-002` 记录本设计的单用户 Kubernetes Profile、共享磁盘、保留 Swap 和资源包络。
- 每项记录固定包含：状态、批准日期、范围、偏离条款、背景、决定、影响、风险、补偿控制、验证证据、演进触发器和关闭条件。
- 关闭的决定不删除，状态改为 `CLOSED`，并记录替代决定或关闭证据。

仓库内对旧文件和旧锚点的引用全部更新到新文件，不保留承载规范事实的兼容副本。GitOps 仓只引用决策编号和 canonical 路径，不复制决策正文。

### 架构基线

当前 `scripts/baseline.mjs` 只扫描 `docs/architecture` 顶层 Markdown。迁移时将基线输入明确扩展为：

- `docs/architecture/*.md`
- `docs/decisions/*.md`

`baseline-manifest.json` 的文件键改为相对 `docs/` 的稳定路径，例如 `architecture/09-infrastructure-operations.md` 和 `decisions/DEV-002-single-user-kubernetes-profile.md`，避免不同目录同名。迁移后运行 `pnpm baseline:update` 推进基线号，并由 `pnpm baseline:check` 验证新增、删除和内容变化。

## 决策二：单用户平衡最小 Profile

### 功能与运行拓扑

运行拓扑保持不变：kubeadm 单节点、去除 control-plane taint、Cilium kube-proxy replacement、Gateway API 单入口、Flux 单向 Reconcile、local-path 映射逻辑 StorageClass、单实例 MinIO、单实例 PostgreSQL、单副本监控栈。除下述节点关键路径例外外，所有长期容器、初始化任务、迁移任务、备份和恢复任务都必须显式声明 `resources.requests` 与 `resources.limits`。

Cilium Agent、Envoy、etcd 和 Kubernetes 控制面属于节点关键路径，不设置激进 CPU limit；Cilium Operator 使用单副本，Hubble 保持关闭。其余组件采用低 request、适度 limit，让调度器少预留资源，同时允许首次安装、升级、备份和恢复短时突发。

### Swap 与节点内存

保留现有固定大小 3.8GiB `/swap.img`，不新增 Swap。kubelet 使用：

```yaml
failSwapOn: false
memorySwap:
  swapBehavior: NoSwap
```

Kubernetes Pod 不使用 Swap；主机上的非 Kubernetes 进程可将其作为应急缓冲。该规则仅适用于当前 DEV 共享主机，PROD 不继承。

### 存储包络

| 对象 | PVC / 配额 | 保留规则 |
| --- | ---: | --- |
| MinIO | PVC 50Gi | 三个 bucket 均启用 Versioning 与 Object Lock |
| `postgres-backup` | bucket quota 30Gi | Barman retention 7d；每日 Base Backup + 连续 WAL |
| `etcd-backup` | bucket quota 5Gi | 每 3 小时快照，保留 7d |
| `audit-worm` | bucket quota 5Gi | V0.1 只验证 WORM；按对象 retention 执行 |
| MinIO 内部余量 | 10Gi | 供版本、元数据和短时波动使用 |
| PostgreSQL | PVC 20Gi | 单实例；数据库增长纳入容量观测 |
| PostgreSQL 恢复实例 | 临时 PVC 20Gi | 只在获准恢复演练期间存在 |
| Prometheus | PVC 10Gi | `retention: 7d` 且 `retentionSize: 8GB`，先到者生效 |
| Grafana | PVC 2Gi | 单副本 |
| Alertmanager | PVC 1Gi | 单副本 |

声明的稳态 PVC 合计 83Gi；一次 PostgreSQL 恢复演练时合计 103Gi。另为 Kubernetes 镜像、日志、etcd 临时快照和运行波动预留约 27Gi，因此平台规划峰值为 130Gi。

local-path-provisioner 不执行真实容量限制，PVC 数字不是文件系统硬配额。本 Profile 使用 MinIO bucket quota、Prometheus `retentionSize`、Namespace `ResourceQuota`、节点磁盘告警和运维 Stop Gate 组合保护磁盘；PostgreSQL 数据目录仍依赖监控与预留空间，不能伪装为硬隔离。PVC 申请额度分别为 `minio: 50Gi`、`monitoring: 13Gi`、`platform: 45Gi`，其中 `platform` 同时容纳 20Gi 主实例和至多一个 20Gi 恢复实例，并保留 5Gi 声明余量。

服务器基线不再要求独立 500Gi 数据盘，改为在部署前验证：

```text
根文件系统当前可用空间 - 130Gi 平台峰值预算 >= 300Gi 其他程序保留空间
```

以已回执的 438Gi 可用空间计算，余量为约 308Gi，满足该 DEV Profile。

### 容器资源包络

下表是实施时的起始值与组级上限；渲染后的清单必须由静态检查重新求和，不能只依赖人工计算。

| 组件 | 稳态 requests 目标 | limits 目标 | 说明 |
| --- | ---: | ---: | --- |
| Flux 四控制器 | 135m CPU / 416Mi | 1.3 CPU / 1408Mi | source、kustomize、helm、notification 分别显式配置 |
| cert-manager 长期组件 | 80m / 192Mi | 800m / 640Mi | startup API check 另用 10m / 32Mi 的瞬时预算 |
| local-path-provisioner | 20m / 32Mi | 100m / 96Mi | 单副本 |
| CNPG 与 Barman Controller | 100m / 256Mi | 600m / 512Mi | 各单副本 |
| PostgreSQL Primary | 250m / 512Mi | 2 CPU / 4Gi | 单实例，允许恢复或迁移时突发 |
| Barman Sidecar | 50m / 64Mi | 500m / 256Mi | 压缩并行度保持最小 |
| MinIO Server | 100m / 256Mi | 1 CPU / 2Gi | 单盘、单用户；为对象版本与备份突发保留内存余量 |
| Observability 长期组件 | 360m / 928Mi | 2.3 CPU / 约 3.2Gi | Prometheus、Grafana、Alertmanager、Operator、KSM、Node Exporter |
| metrics-server | 20m / 64Mi | 100m / 128Mi | 补齐 `kubectl top` 的 Metrics API 依赖，版本纳入 PCS |
| etcd 备份任务 | 调度有效值不超过 100m / 128Mi | 单步骤不超过 500m / 256Mi | snapshot、validate、upload 顺序执行 |
| frontend | 10m / 64Mi | 250m / 256Mi | 单副本起始值，待真实镜像实测 |
| backend | 100m / 256Mi | 1 CPU / 1Gi | 单副本起始值，待真实镜像实测 |
| migration Job | 100m / 256Mi | 1 CPU / 1Gi | 发布时瞬时资源，不计入稳态 |

可调整工作负载的稳态 requests 总目标不超过 2 CPU / 6Gi，非系统组件 limits 总目标约 10 CPU / 16Gi。limits 允许过量承诺，不代表固定占用；验收以 `kubectl top`、进程 RSS、磁盘实际使用和任务耗时为准。某组件无法在表内 limit 稳定运行时，只对该组件按实测上调，并同步更新 DEV-002 和容量证据，不整体恢复原保守规格。

### 磁盘保护与失败处置

- 根文件系统使用率达到 80% 时触发告警并要求容量复核。
- 达到 90% 时停止新的应用发布、PVC 创建/扩容和恢复演练；不自动删除数据库、WORM 对象或备份。
- 常规 PG/etcd 备份继续尝试，受 bucket quota 和实际剩余空间约束；失败必须告警，不能伪报成功。
- `ResourceQuota` 限制各 Namespace 可申请的 PVC 总量，但明确不把它描述成 local-path 的实际字节硬限制。
- 恢复演练开始前必须做容量 preflight；不满足 130Gi 峰值包络时安全停止并留下证据。
- 容量、OOM、CPU throttling 或备份超时只触发有证据的局部上调，不删除功能或缩短 7 天保留期。

## Desired State 与运行证据

`engineering-platform-gitops` 仍是 DEV Desired State 入口。资源值、PVC、quota、retention、告警和 kubelet 期望配置进入 Git 或受控【运维】命令清单；运行状态仍以服务器与集群回执为准。配置台的临时修改不能替代 GitOps 变更，Flux 管理的字段发生漂移时会被 Reconcile。

本次设计不关闭以下既有 Stop Gate：

1. 现有 Docker/containerd 2.2.5 与计划版本 2.3.1 的共存、升级和维护窗口仍需人工决策。
2. `dev-cp.unif.internal` 的稳定解析仍需确认并由【运维】落地。
3. MinIO 上游归档与已验证预构建镜像落后于最后修复版本的供应链风险仍需批准或替换为内部构建 Digest。
4. local-path 不支持在线扩容且无容量硬限制，仍是 DEV-only 偏差。
5. frontend/backend 尚无可验证发布镜像与真实 Digest，不生成伪 Desired State。

所有【运维】步骤继续遵守原执行约束：agent 只输出完整命令清单并停止，等待人工执行与回执，不跳过、不代跑。

## 实施范围

设计获书面确认后，实施计划分两批：

1. `engineering-platform`：创建 `docs/decisions/`，迁移 DEV-001，新增 DEV-002，更新内部链接，扩展并刷新架构基线。
2. `engineering-platform-gitops`：缩小资源与存储声明，增加 quota、容量告警和静态预算校验，更新 runbook、PCS 与恢复示例；不改 backend 仓。

两仓分别提交，不能把嵌套 GitOps 仓误加入 `engineering-platform` 提交。

## 验证与验收

### 静态验证

- `pnpm baseline:check` 覆盖 `docs/architecture` 与 `docs/decisions`。
- 全仓链接搜索不再引用旧 `docs/architecture/deviations.md`。
- GitOps validator 对 CPU、内存、PVC、bucket quota、保留期和磁盘阈值做确定性检查。
- Kustomize、Helm values、CRD Schema、安全扫描和镜像 Digest 校验继续通过。

### 运行验证

- 所有必需 Pod Ready，节点无 MemoryPressure、DiskPressure 或 PIDPressure。
- 至少 15 分钟稳态测量证明资源 request 包络有余量。
- PG 每日备份、WAL 归档、etcd 三小时快照和 7 天保留实际生效。
- PG 恢复与 etcd restore 演练成功，峰值磁盘使用不超过 130Gi 预算。
- 80% 告警规则和 90% Stop Gate 可通过安全方式验证，不制造真实磁盘耗尽。
- 整机重启后 Flux、数据服务、监控和应用按原验收要求自愈。

## 成功标准

1. DEV-001 与 DEV-002 都能从 `docs/decisions/README.md` 唯一定位，且属于架构基线。
2. V0.1 原有六项验收标准均保留，没有以“单用户”为由跳过功能或恢复证据。
3. 当前服务器通过新的容量算式，平台规划峰值不超过 130Gi，并为其他程序保留约 300Gi。
4. 可调整工作负载的稳态 requests 不超过 2 CPU / 6Gi，运行实测无持续 OOM、不可接受节流或任务超时。
5. 所有未关闭风险继续显示为 Stop Gate，不因文档重构或缩配被误标为完成。
