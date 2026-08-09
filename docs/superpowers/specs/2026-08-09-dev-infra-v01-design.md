# V0.1 DEV 基础设施设计

日期：2026-08-09
状态：已确认
范围：DEV 单服务器 + 新建 `engineering-platform-gitops` 仓库（GitHub unif-code）
依据：架构基线 `2026-08-09.2`、[09 基础设施与运维](../../architecture/09-infrastructure-operations.md)、[07 数据、消息与存储](../../architecture/07-data-messaging-storage.md)、[附录 5. 单节点基线](../../architecture/appendix-parameters.md#5-v01v03-单节点基线)与 PCS 锁定版本、治理例外 [DEV-001](../../architecture/deviations.md)

## 背景与定位

V0.1 三子项目之三。现状：一台约 16C/64G 的 Linux 服务器、无云资源。本子项目交付 V0.1 Gate 的环境侧证据：Flux 只从受保护 Git 路径 Reconcile、备份真实恢复、单节点容量测量、部署 ①② 的制品。执行分工：**控制台/SSH 手工步骤由运维同事按清单执行并留证**，GitOps 仓内容与清单文件由 agent 产出。

已确认的决策：

| 决策点 | 结论 |
| --- | --- |
| 对象存储 | 同机 MinIO 单实例充当过渡 Repository（`StorageBinding` gen-1）——**治理例外 DEV-001**，V0.5 前必须切换真实 Cluster 外存储关闭 |
| GitOps 仓 | GitHub unif-code 新仓 `engineering-platform-gitops`，受保护 main、禁止 direct push |
| 镜像仓库 | `ghcr.io/unif-code/*`；Dockerfile 与推送 CI 各归 ①② 应用仓（本 spec 定义规范，两仓各回补一个小任务） |
| 集群形态 | kubeadm 单节点（`NON_HA` 显式标记），版本按 PCS：Kubernetes 1.36.3、containerd 2.3.1、Cilium 1.20.0、Gateway API CRD 1.6.1、Flux v2.9.3、CloudNativePG 1.30.0/PostgreSQL 18.4 |

## 目标与非目标

**目标**：可重复重建的 DEV 单节点环境；GitOps 仓与 Flux 单向 Reconcile；①② 制品经 Flux 部署并可访问；PG/etcd 备份到 MinIO 且完成一次真实恢复演练；基础 Observability；单节点容量测量；首个 PCS Candidate 文件。

**非目标**：PROD、任何 HA、Sandbox/Kata（V0.4）、OpenBao/Temporal/NATS/Valkey（随 V0.2+ 能力激活）、Rook-Ceph（V0.5 拓扑）、外部对象存储（DEV-001 关闭时引入）。

## §1 服务器基线与集群

规格核验清单（运维执行，输出留证）：`nproc`（≥16）、`free -g`（≥62）、`lsblk`（系统盘 ≥200G、数据盘 ≥500G 或单盘划分独立数据目录）、`uname -m`（x86_64）、`swapon --show`（必须为空，`swapoff -a` + fstab 注释）、发行版为 systemd 的主流 Linux。

kubeadm 单节点：containerd 2.3.1（cgroup v2、CRI v1）→ kubeadm init（k8s 1.36.3，`controlPlaneEndpoint` 用稳定 DNS 名或 VIP 占位，不固化节点 IP）→ 去除 control-plane taint（单节点承载工作负载）→ Cilium 1.20.0（kube-proxy replacement、`socketLB.hostNamespaceOnly=true`）→ Gateway API CRD 1.6.1。环境显式标记 `NON_HA`。

## §2 GitOps 仓与 Flux

`engineering-platform-gitops` 仓结构：

```text
clusters/dev/            # Flux 入口（Kustomization 链）
infrastructure/          # Cilium、Gateway、MinIO、CNPG operator、observability
apps/                    # backend、frontend 的 Deployment/Service/HTTPRoute
pcs/candidate-1.md       # 首个 PCS Candidate：组件精确版本 + image digest 清单
```

Flux v2.9.3 只装四控制器（source/kustomize/helm/notification），不装 image-automation；`kustomize-controller`/`helm-controller` 固定 `--no-cross-namespace-refs=true`；每个 Kustomization/HelmRelease 绑定显式 Reconcile ServiceAccount；只读 Git 凭据。GitHub 仓开启保护：main 禁止 direct push、必须 PR。带外 `kubectl apply` 不成为 Desired State（09 铁律，写入 AGENTS/README）。

## §3 存储与备份（DEV-001 例外生效）

- 同机 MinIO 单实例：独立数据目录（数据盘路径）、TLS、启用 Versioning 与 Object Lock；创建 bucket：`postgres-backup`、`etcd-backup`、`audit-worm`（供 ② 后端 V0.2+ 归档使用，V0.1 先建好并验证 Lock）；每 bucket 独立 Access Key（最小策略）。此即 `StorageBinding` gen-1，例外与关闭条件见 [DEV-001](../../architecture/deviations.md)。
- 平台 PostgreSQL：CloudNativePG 1.30.0 单实例 Cluster（PG 18.4），Barman Cloud Plugin 0.13.0 推 Base Backup + 连续 WAL 到 MinIO `postgres-backup`；`archive_timeout=5min`、每日 Base Backup（附录包络的 DEV 口径）。
- etcd：cron 任务按 PCS 锁定的 `etcdctl snapshot save` 每 3 小时快照 + `etcdutl snapshot status` 验证，上传 MinIO `etcd-backup`，保留 7 天。
- **真实恢复演练（Gate 证据）**：PG 按 Base Backup + WAL 做一次 PITR 到临时 Cluster 并校验数据；etcd 快照在隔离环境（同机 kind 或二次 kubeadm dry-run 目录）restore 并验证。步骤与判定写入 runbook 目录。

## §4 应用部署与镜像契约

- 镜像规范（①②各回补一个任务）：多阶段 Dockerfile；backend 产出 `ghcr.io/unif-code/engineering-platform-backend`（uvicorn 运行 `create_app`），frontend 产出 `ghcr.io/unif-code/engineering-platform`（nginx 托管 `dist/`）；CI 在 main push 构建并以 `sha-<git-sha>` tag 推送，Release tag 另打版本 tag；镜像引用一律 digest 固定进 GitOps 仓（禁 latest/浮动 tag）。
- 部署：backend Deployment（env 注入 DB URL 的 k8s Secret——V0.1 手工创建并在 runbook 登记，OpenBao 随 V0.2 接管）+ Service + HTTPRoute；frontend Deployment + Service + HTTPRoute；Cilium Gateway 做唯一北向入口（06 的 `platform-gateway`），`/api/*` 路由 backend、其余路由 frontend。
- 迁移执行：backend 镜像内含 Alembic，以 Job 方式在发布时跑 `alembic upgrade head`（owner 账号连接串来自同一 Secret 机制）。

## §5 基础 Observability、容量测量与验收

- kube-prometheus-stack 88.1.5 最小拓扑（单副本 Prometheus/Alertmanager/Grafana），Grafana Managed Alerting 关闭（09）；关键告警规则：节点资源、Flux Reconcile 失败、CNPG 备份失败、MinIO 不可用。
- 单节点容量测量（Gate 证据）：部署完成后记录稳态 CPU/内存/磁盘占用与余量表，进 runbook。
- V0.1 Gate 对应：可重复部署（Flux 从受保护路径 Reconcile 全量重建）、备份真实恢复（§3 演练）、Web/API/DB Smoke（经 Gateway 访问 `/`、`/api/v1/me`、`/readyz`）、配置与 Secret 不泄漏（仓内无凭据）、未选能力关闭（不部署非 V0.1 组件）、容量测量。

## 验收标准

1. GitOps 仓受保护且 Flux 单向 Reconcile：直接 `kubectl apply` 的带外改动在下次 Reconcile 被纠正（演示留证）。
2. ①② 镜像以 digest 固定引用，经 Gateway 单入口可访问：`/` 渲染前端、`/api/v1/me` 返回 stub、`/readyz` ready。
3. PG PITR 与 etcd restore 演练各完成一次，runbook 记录命令、耗时与校验结果。
4. MinIO 三 bucket 的 Versioning 与 Object Lock 验证通过；DEV-001 例外在 runbook 首页醒目标注关闭期限。
5. PCS Candidate 文件与实际部署的版本/digest 一致（抽查比对）。
6. 容量测量表产出，且服务器重启后全栈自愈（重启演练一次）。
