# 环境容量与服务器规划

## 1. 文档目标

本文定义平台从 V0.1 开发起步到 V1.0 正式上线的渐进式服务器规划，并给出 10、20、30、40、50 名活跃研发用户的容量场景。目标是在不削弱身份、授权、Audit、Secret、Sandbox 隔离、容量准入和 Backup/Restore 底线的前提下，避免在开发初期一次性部署 Hardened Target Profile。

本文只拥有容量场景、Profile 数值和分阶段采购计划，不拥有版本 Capability Scope、实施状态或环境运行状态：

- [实施路线图](./12-implementation-roadmap.md)提供三轴导航；[实施路线图详细说明](./12-implementation-roadmap.md)唯一拥有版本 Contract、实现状态、Environment Promotion 状态和 Profile 选择，并只链接本文的选定 Profile，不复制服务器表；
- [基础设施与运维](./09-infrastructure-operations.md)只拥有容量不变量、准入方法和 Hardened Target Profile 的目标拓扑；
- 本文拥有人数容量场景、Profile 服务器数值、容量计算与版本阶段对应的采购计划；其中版本标签只是采购触发条件，不声明该版本已实现、已验收或已部署；
- GitOps、Platform Compatibility Set（PCS）和 Operations Read Model 证明某个环境实际部署的版本、拓扑和有效容量；
- DEV 与 PROD 是两个独立 Platform Environment，不能共享 Kubernetes Node、数据、凭据、Secret 或恢复材料。

## 2. 人员与负载口径

首批已知活跃研发成员为 8 人：3 名产品、2 名前端开发和 3 名后端开发；按 10 人场景规划，预留 2 名活跃研发成员余量。

经理及其他只查看后台的账号不计入 Agent、Image Build 和研发数据增长系数，但其登录、Session、API 与 Audit 流量仍由固定平台容量覆盖。产品人员主要消耗 Chat、SDD 和外部 Model Provider Quota，不按完整 Sandbox 用户计算。

服务器容量不按账号数线性计算。主要驱动因素为：

```text
Environment Capacity
= 固定平台基础占用
+ 峰值并发 Agent Attempt
+ 峰值并发 Image Build
+ Artifact / Audit / Log / Backup 数据增长
+ Rollout、故障与测量 Headroom
```

其中：

- 一个正在 Sandbox 中执行代码修改、编译或测试的 Agent 任务占用一个 Active Agent Attempt；
- 每个 Active Agent Attempt 使用独立 Kata Sandbox，不与其他 Attempt 共用 Guest；
- 多个 Kata Sandbox 可以由同一个 `sandbox-worker` 承载，直到达到该 Node 和环境的物理容量 Ceiling；
- 登录、浏览、审批、查看日志、普通 Chat 和 SDD 生成不计为 Agent Attempt；
- 达到并发上限时，新 Attempt 必须排队或被明确拒绝，不能突破 Ceiling。

## 3. Node、Pod 与隔离原则

Kubernetes Server 称为 Node，Frontend、Python Control Plane、PostgreSQL 等以 Pod 运行。多个服务的 Pod 可以部署在同一个 Node；同一服务也可以使用多个 Replica 分散到不同 Node，以支持滚动发布和 Node 故障恢复。

Launch Profile 使用两类物理 Node：

| Node | 职责 | 首版隔离要求 |
| --- | --- | --- |
| `core` | Kubernetes Control Plane、平台应用、数据服务、基础 Observability 和首版 Storage | 开发初期允许融合部署；不得承载已通过正式验收的 Agent Sandbox |
| `sandbox-worker` | Kata/KVM Sandbox、受控代码执行和有界 Runtime Disk | 必须使用专用 Taint、RuntimeClass、NetworkPolicy 和支持 KVM 的 Host；不得承载平台、数据库或 Secret 服务 |

在单机实验阶段，如果 Host 本身支持 KVM，可以临时进行 Sandbox 功能联调，但必须标记为 `LAB_ONLY`。它不能通过 Sandbox 安全验收，也不能成为 V1.0 部署方式。

## 4. V0.x 渐进式采购与部署

| 阶段 | DEV 物理服务器 | 能力边界 | 进入下一阶段前的要求 |
| --- | --- | --- | --- |
| V0.1～V0.3 | `1 × core` | 平台骨架、身份授权、Requirement、SDD 和人工交付闭环；不执行 Agent 代码 | 完成基础备份、恢复和单节点容量测量 |
| V0.4 Work Package 1 | 原有 `1 × core` | Agent 控制链可以使用 Mock 或 `LAB_ONLY` 联调 | 不得将同机 Sandbox 声明为安全验收通过 |
| V0.4 Work Package 2 | `1 × core + 1 × sandbox-worker` | 单仓 `fix` Agent 真实执行闭环 | 完成 Kata、Network、Secret、Repository、资源和故障 Gate |
| V0.5 Production Candidate | `3 × core + 1 × sandbox-worker` | 多节点 DEV 验证、滚动发布、备份恢复、容量和故障演练 | 同一候选制品与配置通过 DEV Acceptance |
| V1.0 | 独立 PROD：`3 × core + 1 × sandbox-worker` | 首次正式发布，服务首批 10 人场景 | 发布 DEV 已验证的同一 Image Digest/Bundle，不重新构建 |

V1.0 后 DEV 仍保留 `3 × core + 1 × sandbox-worker`，用于开发、集成测试、升级和受控 Load Test；真实用户主要使用 PROD，因此不能把同一批用户同时计入 DEV 与 PROD 业务负载。

## 5. V0.1～V0.3 单节点基线

### 5.1 推荐服务器

| 资源 | 推荐值 |
| --- | --- |
| CPU | `16 vCPU` |
| Memory | `64 GiB` |
| OS / Runtime Disk | `200～256 GiB ESSD` |
| Stateful Data Disk | `500 GiB ESSD`，支持扩容 |
| Network | 私网至少 `1 Gbps` |
| OS | x86_64 Linux；关闭 Swap |
| GPU | 不需要；模型推理由外部百炼平台承担 |
| Backup | 写入当前 Cluster 和数据盘故障域之外的 OSS/S3-compatible Repository |

该 Node 允许部署：

- Kubernetes Control Plane 与 etcd；
- Umi Frontend、Python Control Plane 和基础 Worker；
- PostgreSQL、Valkey、OpenBao 的开发期单实例；
- Flux GitOps；
- 精简 Prometheus、Grafana、Loki 和 OpenTelemetry；
- GitLab、Model Provider 等外部系统的 Adapter。

该阶段不部署 Kata Sandbox、正式 Agent 执行、完整 Temporal/NATS 执行链、Rook-Ceph、Image Build、完整多副本 Observability 或全组件 HA。

`8 vCPU / 32 GiB` 只适合短期 V0.1 验证，进入身份、SDD、Model 和基础 Observability 集成后容易缺少 Rollout 与诊断余量。`16 vCPU / 64 GiB` 是 V0.1～V0.3 的选定基线；不应为尚未启用的 Sandbox 提前把 Core Node 购买为高价 KVM 规格。

### 5.2 单节点约束

- 环境必须显式标记为 `NON_HA`；该 Node 故障时允许 DEV 整体停止；
- 从第一天使用稳定 `controlPlaneEndpoint`，不得把 Node IP 固化为不可迁移的 Cluster Identity；
- 数据不得依赖 Pod 临时目录；PostgreSQL、etcd 和 OpenBao 必须具有 Cluster 外备份；
- 所有部署通过 GitOps 管理，后续增加 Node 不修改领域模块；
- V0.5 前必须完成三 Core Node 扩容和真实 Restore 验证。

## 6. V1.0 Compact Launch Profile

### 6.1 Core Server

每个环境使用三个融合 `core` Server。V1.0 首版不物理拆分 Platform 与 Storage；达到 Evolution Trigger 后再迁移到独立 Node Pool。

| 项目 | 单台 Core 推荐值 | 每环境合计 |
| --- | ---: | ---: |
| Server | `16 vCPU / 64 GiB` | `48 vCPU / 192 GiB` |
| OS / etcd Disk | `256 GiB ESSD` | `768 GiB` |
| Object Storage Raw OSD | 独立 `1 TiB` SSD | `3 TiB Raw` |
| Stateful RWO PVC | 由逻辑 `stateful-rwo-lowlatency` StorageClass 提供 | DEV 初始约 `200 GiB`；PROD 初始约 `300 GiB` |
| Network | 按 PCS 验证；Storage Recovery 不得挤占平台 SLO | 三 Node 同一受控私网 |

三个 Core Node 承载相同逻辑组件，但通过 Replica、Anti-affinity、PDB、Resource Request/Limit 和 Capacity Gate 控制放置。Launch Profile 允许非关键组件先以单 Replica 运行；安全、授权、Audit、Secret、备份恢复和容量 Fail Closed 不能因此弱化。

### 6.2 Sandbox 容量计算

当前 Sandbox Resource Profile 定义：

| 工作负载 | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit |
| --- | --- | --- | --- |
| Standard Agent Attempt | `2 / 4 vCPU` | `6 / 8 GiB` | `30 / 50 GiB` |
| Image Build | `4 / 8 vCPU` | `12 / 16 GiB` | `60 / 100 GiB` |

规划时额外为每个 Kata Guest 预留 `0.5 vCPU / 1 GiB`，并为 Sandbox Node 自身保留 `2 vCPU / 8 GiB / 100 GiB`。若 `A` 为并发 Standard Attempt，`B` 为并发 Image Build，则单 Node 规划下界为：

```text
CPU  = 2 + 2.5 × A + 4.5 × B
RAM  = 8 + 9 × A + 17 × B
Disk = 100 + 50 × A + 100 × B
```

CPU 按受控可突发方式规划，Memory 和 Runtime Disk 按 Limit 侧规划；Provider Mapping 还必须满足 `/dev/kvm`、`kata-runtime check`、Guest Lifecycle、Network、CSI、MTU、性能、Reboot、Drain 与 Soak Gate。

### 6.3 首批 10 人配置

首批按最多 `3` 个 Standard Agent Attempt 与 `1` 个 Image Build 同时运行；更多请求进入队列。

这里的 `1` 是 V1.0 已选择的首批 `IMAGE_BUILD` Capability 所需并纳入验收的物理 `maxActiveImageBuilds` Ceiling，不是未激活能力的空闲预留。V0.4 Image Build Capability Activation Gate 未通过时，有效 `agent.image_build.active_build_limit` 必须为 `0`；Gate 通过后也只能在 `0..1` 内选择，并继续受独立 Child Lease、Fencing 与 Capacity Admission 约束。Capacity Profile 本身不能把 Capability 标记为已启用或已部署。

| Node | 数量 | 单 Node 逻辑容量 | 说明 |
| --- | ---: | --- | --- |
| `core` | 3 | `16 vCPU / 64 GiB`；`256 GiB` OS；`1 TiB` Raw OSD | 平台、数据、Observability 与 Storage 融合部署 |
| `sandbox-worker` | 1 | 不低于 `16 vCPU / 64 GiB`；`100 GiB` OS；`500 GiB` Runtime | 3 Attempt + 1 Build；实际阿里云规格按支持 KVM/嵌套虚拟化的 SKU 向上映射 |

该 Sandbox 场景的计算下界约为 `14 vCPU / 52 GiB / 350 GiB`。逻辑 `16/64/500` 可以承载首批负载；若云厂商支持嵌套虚拟化的最小 SKU 更大，则采购更大 SKU 不代表平台必须消耗全部资源。

## 7. 10～50 人容量规划矩阵

下表中的人数是活跃研发用户场景标签，不是服务器线性扩容公式。DEV 固定使用 10 人验证档，PROD 根据真实峰值选择 Profile。

| 活跃研发用户 | Standard Attempt Ceiling | Image Build Ceiling | PROD Core | PROD Sandbox | PROD Server 总数 |
| ---: | ---: | ---: | --- | --- | ---: |
| 10 | 3 | 1 | `3 × 16/64` | `1 × ≥16/64/500 GiB` | 4 |
| 20 | 5 | 1 | `3 × 16/64` | `1 × ≥24/96/1 TiB` | 4 |
| 30 | 8 | 1 | `3 × 16/64` | `1 × ≥32/128/1 TiB` | 4 |
| 40 | 10 | 1 | `3 × 16/64` | `2 × ≥32/128/1 TiB` | 5 |
| 50 | 12 | 1 | `3 × 16/64` | `2 × ≥32/128/1 TiB` | 5 |

`16/64` 表示 `16 vCPU / 64 GiB`，Sandbox 最后一个数值表示 Runtime Disk。20 人档的 `24/96` 是逻辑需求；若 Provider 没有满足 KVM Gate 的对应规格，应映射到 `32/128` 或通过验证的裸金属规格。

40～50 人档优先增加第二台 Sandbox Server，而不是把所有 Sandbox 继续堆到单台超大 Host。它提供容量分片和维护空间，但在未保留完整 N+1 前，不承诺一台 Sandbox Server 故障后仍维持全部并发额度。

正式上线后的总物理服务器数为：

| 场景 | DEV | PROD | DEV + PROD |
| ---: | ---: | ---: | ---: |
| 10～30 人 | 4 | 4 | 8 |
| 40～50 人 | 4 | 5 | 9 |

Cluster 外 Backup Repository、NLB、NAT/EIP、WAF、KMS、GitLab、Jenkins、VPN 和百炼平台不计入 Kubernetes Server 数量；其费用和故障域必须在 Environment TCO Snapshot 中单列。

## 8. Storage 规划

人数不能可靠预测 Object Storage。Artifact、附件、365 天 Audit WORM、PostgreSQL/NATS/OpenBao Backup、Log/Trace、Versioning、Object Lock、Multipart 和 GC 延迟共同决定容量。

V1.0 每环境以 `3 × 1 TiB Raw OSD` 起步。采用三副本并以 50% Raw 作为规划边界时，约有 `512 GiB` 规划逻辑容量。以下任一条件成立时必须扩容，而不是缩短 Audit Retention 或绕过 Object Lock：

- Cluster Raw 当前值或 30 天预测达到规划边界；
- 任一 Bucket Class 达到其 Warning Threshold；
- Backup Working Set 不能覆盖 Recovery Window；
- Recovery、Backfill 或容量压力开始影响平台 SLO。

优先在三个 Core Node 对称增加新 OSD；如果融合 Node 的 CPU、Memory、IO 或维护窗口不再满足 Gate，再将 Storage 迁移为独立 Node Pool。

## 9. Evolution Trigger

### 9.1 Trigger 条件

满足下列任一条件时，应形成新的 Capacity Candidate，并评估增加 Sandbox Node、拆分 Platform/Storage 或进入 Hardened Target Profile：

- Agent Queue 等待时间持续越过已批准 SLO；
- `CAPACITY_UNAVAILABLE` 比例持续越过已批准阈值；
- Sandbox CPU、Memory 或 Runtime Disk 的滚动 p95 持续达到 70%；
- 单 Sandbox Node 故障造成的执行中断不再满足业务 SLO；
- Core CPU、Memory、数据库 IO 或 Ceph Recovery 明显影响平台 API 延迟；
- 融合 Node 无法保留滚动发布、升级或故障恢复所需 Headroom；
- Storage Capacity Gate 已触发且融合 Node 无法继续安全扩盘。

### 9.2 Hardened Target 场景

下表是 Evolution Trigger 成立并形成新 Capacity Candidate 后的目标 Node 数量，不是 V1.0 默认 Release Gate、采购清单或 Deployed State：

| 环境 | `k8s-control-plane` | `platform-worker` | `sandbox-worker` | `storage-worker` | Node 总数校验 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV | 3 | 4 | 2 | 3 | **12** |
| PROD | 3 | 6 | 2 | 4 | **15** |

算术固定为 DEV `3 + 4 + 2 + 3 = 12`，PROD `3 + 6 + 2 + 4 = 15`。Hardened Target 保留四类 Node Role 拆分、Sandbox N+1、数据服务 HA、分布式 Observability 和更强 Cluster DR；Cluster 外 Operations Collector、External Watchdog 与 Backup Repository 不计入 Node 总数。

两个 `sandbox-worker` 只定义目标拓扑数量，不能单凭数量证明 N+1；必须使用新 Capacity Candidate 选定的单机 SKU、Unit Ceiling 与故障实测，证明失去一台后仍满足获准组合或按 Contract 安全降载。精确 SKU、磁盘、网络和 Provider Mapping 仍须重新通过 Provisioning、Load、故障、迁移、回退、安全与恢复 Gate。该场景是目标架构，不是 V0.1 或 V1.0 的无条件采购清单。

## 10. 上线前验证证据

任何人数档位进入 PROD 前，至少提供：

1. 对应并发 Attempt 与 Image Build 的持续 Load Test；
2. CPU、Memory、Runtime Disk、Queue 和外部 Model Quota 的测量结果；
3. Sandbox 越权、资源耗尽、取消、超时和 Node 故障的确定结果；
4. PostgreSQL、etcd、OpenBao 和关键配置的真实 Restore 证据；
5. Object Storage、Audit 和 Backup 的增长趋势与 30 天预测；
6. Upgrade、Rollback 和 Capacity Gate 验证；
7. GitOps Revision、PCS、Image Digest 和生效配置的绑定证据。

如果实测数据越过当前 Profile，必须在发布前向上选择 Profile；不得仅修改文档数字或放宽安全边界。

## 11. 参考资料

- [Kubernetes：Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes：Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Rook-Ceph Prerequisites](https://rook.io/docs/rook/latest-release/Getting-Started/Prerequisites/prerequisites/)
- [Kata Containers Virtualization](https://github.com/kata-containers/kata-containers/blob/main/docs/design/virtualization.md)
- [阿里云 ECS：开启嵌套虚拟化](https://help.aliyun.com/zh/ecs/user-guide/enable-nested-virtualization)
