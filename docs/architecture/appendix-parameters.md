# 参数附录

> 本文是全部精确参数的唯一事实源：正文只写定性规则并链接到这里。
> 修改参数只改本文；新增参数必须归入下列章节之一。
> 收录范围：可调的容量、尺寸、并发、版本与调度数值；固定的安全底线与信任新鲜度语义值（如证书有效期、锁定期、密钥规格）留在 owner 正文。

## 容量与服务器规划

本节参数由 [12 实施路线图](./12-implementation-roadmap.md)在选择 Profile 时消费，由 [09 基础设施与运维](./09-infrastructure-operations.md)在验证物理放置、Aggregate Physical Ceiling 与 Provisioning Gate 时消费，由 [04 Sandbox Runtime](./04-sandbox-runtime.md)读取 Node 数、每环境 Ceiling 与磁盘容量，由 [07 数据、消息与存储](./07-data-messaging-storage.md)读取 Raw、Bucket Class、RWO、Stream 与 Backup 数值，由 [08 安全、审计与治理](./08-security-audit-governance.md)读取 OpenBao 与 Scanner 的资源、阈值与恢复数值。`### 1.` 到 `### 11.` 是容量与服务器规划本身；末尾的[组件资源包络](#组件资源包络)不属于容量场景，是从 07、08、09 迁入的组件级数值。

### 1. 文档目标

本节定义平台从 V0.1 开发起步到 V1.0 正式上线的渐进式服务器规划，并给出 10、20、30、40、50 名活跃研发用户的容量场景。目标是在不削弱身份、授权、Audit、Secret、Sandbox 隔离、容量准入和 Backup/Restore 底线的前提下，避免在开发初期一次性部署 Hardened Target Profile。

本节只拥有容量场景、Profile 数值和分阶段采购计划，不拥有版本 Capability Scope、实施状态或环境运行状态：

- Release 阶段与实施状态记录见[实施路线图](./12-implementation-roadmap.md)：它记录版本 Contract、实施状态、Environment Promotion 状态和 Profile 选择，只链接本节的选定 Profile，不复制服务器表；
- [基础设施与运维](./09-infrastructure-operations.md)只拥有容量不变量、准入方法和 Hardened Target Profile 的目标拓扑；
- 本节拥有人数容量场景、Profile 服务器数值、容量计算与版本阶段对应的采购计划；其中版本标签只是采购触发条件，不声明该版本已实现、已验收或已部署；
- GitOps、Platform Compatibility Set（PCS）和 Operations Read Model 证明某个环境实际部署的版本、拓扑和有效容量；
- DEV 与 PROD 是两个独立 Platform Environment，不能共享 Kubernetes Node、数据、凭据、Secret 或恢复材料。

### 2. 人员与负载口径

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

### 3. Node、Pod 与隔离原则

Kubernetes Server 称为 Node，Frontend、Python Control Plane、PostgreSQL 等以 Pod 运行。多个服务的 Pod 可以部署在同一个 Node；同一服务也可以使用多个 Replica 分散到不同 Node，以支持滚动发布和 Node 故障恢复。

Launch Profile 使用两类物理 Node：

| Node | 职责 | 首版隔离要求 |
| --- | --- | --- |
| `core` | Kubernetes Control Plane、平台应用、数据服务、基础 Observability 和首版 Storage | 开发初期允许融合部署；不得承载已通过正式验收的 Agent Sandbox |
| `sandbox-worker` | Kata/KVM Sandbox、受控代码执行和有界 Runtime Disk | 必须使用专用 Taint、RuntimeClass、NetworkPolicy 和支持 KVM 的 Host；不得承载平台、数据库或 Secret 服务 |

在单机实验阶段，如果 Host 本身支持 KVM，可以临时进行 Sandbox 功能联调，但必须标记为 `LAB_ONLY`。它不能通过 Sandbox 安全验收，也不能成为 V1.0 部署方式。

### 4. V0.x 渐进式采购与部署

| 阶段 | DEV 物理服务器 | 能力边界 | 进入下一阶段前的要求 |
| --- | --- | --- | --- |
| V0.1～V0.3 | `1 × core` | 平台骨架、身份授权、Requirement、SDD 和人工交付闭环；不执行 Agent 代码 | 完成基础备份、恢复和单节点容量测量 |
| V0.4 Work Package 1 | 原有 `1 × core` | Agent 控制链可以使用 Mock 或 `LAB_ONLY` 联调 | 不得将同机 Sandbox 声明为安全验收通过 |
| V0.4 Work Package 2 | `1 × core + 1 × sandbox-worker` | 单仓 `fix` Agent 真实执行闭环 | 完成 Kata、Network、Secret、Repository、资源和故障 Gate |
| V0.5 Production Candidate | `3 × core + 1 × sandbox-worker` | 多节点 DEV 验证、滚动发布、备份恢复、容量和故障演练 | 同一候选制品与配置通过 DEV Acceptance |
| V1.0 | 独立 PROD：`3 × core + 1 × sandbox-worker` | 首次正式发布，服务首批 10 人场景 | 发布 DEV 已验证的同一 Image Digest/Bundle，不重新构建 |

V1.0 后 DEV 仍保留 `3 × core + 1 × sandbox-worker`，用于开发、集成测试、升级和受控 Load Test；真实用户主要使用 PROD，因此不能把同一批用户同时计入 DEV 与 PROD 业务负载。

### 5. V0.1～V0.3 单节点基线

#### 5.1 推荐服务器

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

#### 5.2 单节点约束

- 环境必须显式标记为 `NON_HA`；该 Node 故障时允许 DEV 整体停止；
- 从第一天使用稳定 `controlPlaneEndpoint`，不得把 Node IP 固化为不可迁移的 Cluster Identity；
- 数据不得依赖 Pod 临时目录；PostgreSQL、etcd 和 OpenBao 必须具有 Cluster 外备份；
- 所有部署通过 GitOps 管理，后续增加 Node 不修改领域模块；
- V0.5 前必须完成三 Core Node 扩容和真实 Restore 验证。

### 6. V1.0 Compact Launch Profile

#### 6.1 Core Server

每个环境使用三个融合 `core` Server。V1.0 首版不物理拆分 Platform 与 Storage；达到 Evolution Trigger 后再迁移到独立 Node Pool。

| 项目 | 单台 Core 推荐值 | 每环境合计 |
| --- | ---: | ---: |
| Server | `16 vCPU / 64 GiB` | `48 vCPU / 192 GiB` |
| OS / etcd Disk | `256 GiB ESSD` | `768 GiB` |
| Object Storage Raw OSD | 独立 `1 TiB` SSD | `3 TiB Raw` |
| Stateful RWO PVC | 由逻辑 `stateful-rwo-lowlatency` StorageClass 提供 | DEV 初始约 `200 GiB`；PROD 初始约 `300 GiB`（Launch Profile 初始值；Hardened Target 各组件包络合计见[组件资源包络](#组件资源包络)） |
| Network | 按 PCS 验证；Storage Recovery 不得挤占平台 SLO | 三 Node 同一受控私网 |

三个 Core Node 承载相同逻辑组件，但通过 Replica、Anti-affinity、PDB、Resource Request/Limit 和 Capacity Gate 控制放置。Launch Profile 允许非关键组件先以单 Replica 运行；安全、授权、Audit、Secret、备份恢复和容量 Fail Closed 不能因此弱化。

#### 6.2 Sandbox 容量计算

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

#### 6.3 首批 10 人配置

首批按最多 `3` 个 Standard Agent Attempt 与 `1` 个 Image Build 同时运行；更多请求进入队列。

这里的 `1` 是 V1.0 已选择的首批 `IMAGE_BUILD` Capability 所需并纳入验收的物理 `maxActiveImageBuilds` Ceiling，不是未激活能力的空闲预留。V0.4 Image Build Capability Activation Gate 未通过时，有效 `agent.image_build.active_build_limit` 必须为 `0`；Gate 通过后也只能在 `0..1` 内选择，并继续受独立 Child Lease、Fencing 与 Capacity Admission 约束。Capacity Profile 本身不能把 Capability 标记为已启用或已部署。

| Node | 数量 | 单 Node 逻辑容量 | 说明 |
| --- | ---: | --- | --- |
| `core` | 3 | `16 vCPU / 64 GiB`；`256 GiB` OS；`1 TiB` Raw OSD | 平台、数据、Observability 与 Storage 融合部署 |
| `sandbox-worker` | 1 | 不低于 `16 vCPU / 64 GiB`；`100 GiB` OS；`500 GiB` Runtime | 3 Attempt + 1 Build；实际阿里云规格按支持 KVM/嵌套虚拟化的 SKU 向上映射 |

该 Sandbox 场景的计算下界约为 `14 vCPU / 52 GiB / 350 GiB`。逻辑 `16/64/500` 可以承载首批负载；若云厂商支持嵌套虚拟化的最小 SKU 更大，则采购更大 SKU 不代表平台必须消耗全部资源。

### 7. 10～50 人容量规划矩阵

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

### 8. Storage 规划

人数不能可靠预测 Object Storage。Artifact、附件、365 天 Audit WORM、PostgreSQL/NATS/OpenBao Backup、Log/Trace、Versioning、Object Lock、Multipart 和 GC 延迟共同决定容量。

V1.0 每环境以 `3 × 1 TiB Raw OSD` 起步。采用三副本并以 50% Raw 作为规划边界时，约有 `512 GiB` 规划逻辑容量。以下任一条件成立时必须扩容，而不是缩短 Audit Retention 或绕过 Object Lock：

- Cluster Raw 当前值或 30 天预测达到规划边界；
- 任一 Bucket Class 达到其 Warning Threshold；
- Backup Working Set 不能覆盖 Recovery Window；
- Recovery、Backfill 或容量压力开始影响平台 SLO。

优先在三个 Core Node 对称增加新 OSD；如果融合 Node 的 CPU、Memory、IO 或维护窗口不再满足 Gate，再将 Storage 迁移为独立 Node Pool。

### 9. Evolution Trigger

#### 9.1 Trigger 条件

满足下列任一条件时，应形成新的 Capacity Candidate，并评估增加 Sandbox Node、拆分 Platform/Storage 或进入 Hardened Target Profile：

- Agent Queue 等待时间持续越过已批准 SLO；
- `CAPACITY_UNAVAILABLE` 比例持续越过已批准阈值；
- Sandbox CPU、Memory 或 Runtime Disk 的滚动 p95 持续达到 70%；
- 单 Sandbox Node 故障造成的执行中断不再满足业务 SLO；
- Core CPU、Memory、数据库 IO 或 Ceph Recovery 明显影响平台 API 延迟；
- 融合 Node 无法保留滚动发布、升级或故障恢复所需 Headroom；
- Storage Capacity Gate 已触发且融合 Node 无法继续安全扩盘。

#### 9.2 Hardened Target 场景

下表是 Evolution Trigger 成立并形成新 Capacity Candidate 后的目标 Node 数量，不是 V1.0 默认 Release Gate、采购清单或 Deployed State：

| 环境 | `k8s-control-plane` | `platform-worker` | `sandbox-worker` | `storage-worker` | Node 总数校验 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV | 3 | 4 | 2 | 3 | **12** |
| PROD | 3 | 6 | 2 | 4 | **15** |

算术固定为 DEV `3 + 4 + 2 + 3 = 12`，PROD `3 + 6 + 2 + 4 = 15`。Hardened Target 保留四类 Node Role 拆分、Sandbox N+1、数据服务 HA、分布式 Observability 和更强 Cluster DR；Cluster 外 Operations Collector、External Watchdog 与 Backup Repository 不计入 Node 总数。

两个 `sandbox-worker` 只定义目标拓扑数量，不能单凭数量证明 N+1；必须使用新 Capacity Candidate 选定的单机 SKU、Unit Ceiling 与故障实测，证明失去一台后仍满足获准组合或按 Contract 安全降载。精确 SKU、磁盘、网络和 Provider Mapping 仍须重新通过 Provisioning、Load、故障、迁移、回退、安全与恢复 Gate。该场景是目标架构，不是 V0.1 或 V1.0 的无条件采购清单。

### 10. 上线前验证证据

任何人数档位进入 PROD 前，至少提供：

1. 对应并发 Attempt 与 Image Build 的持续 Load Test；
2. CPU、Memory、Runtime Disk、Queue 和外部 Model Quota 的测量结果；
3. Sandbox 越权、资源耗尽、取消、超时和 Node 故障的确定结果；
4. PostgreSQL、etcd、OpenBao 和关键配置的真实 Restore 证据；
5. Object Storage、Audit 和 Backup 的增长趋势与 30 天预测；
6. Upgrade、Rollback 和 Capacity Gate 验证；
7. GitOps Revision、PCS、Image Digest 和生效配置的绑定证据。

如果实测数据越过当前 Profile，必须在发布前向上选择 Profile；不得仅修改文档数字或放宽安全边界。

### 11. 参考资料

- [Kubernetes：Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes：Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Rook-Ceph Prerequisites](https://rook.io/docs/rook/latest-release/Getting-Started/Prerequisites/prerequisites/)
- [Kata Containers Virtualization](https://github.com/kata-containers/kata-containers/blob/main/docs/design/virtualization.md)
- [阿里云 ECS：开启嵌套虚拟化](https://help.aliyun.com/zh/ecs/user-guide/enable-nested-virtualization)

### 组件资源包络

来源：[07 数据、消息与存储](./07-data-messaging-storage.md)、[08 安全、审计与治理](./08-security-audit-governance.md)与[09 基础设施与运维](./09-infrastructure-operations.md)。下列数值默认描述 Hardened Target Profile 的组件级包络；Launch Profile 可按 [12 实施路线图](./12-implementation-roadmap.md)的选择降低副本与拓扑，但不得取消硬 Request/Limit、存储与队列上限、Cluster 外 Backup 与真实 Restore 验证。数据实例的 CPU/Memory Request 与 Limit 相等以保持 Guaranteed QoS；任何 Profile 都禁止无 Request/Limit 的 BestEffort 数据实例。

#### 数据服务资源与拓扑

| 组件/环境 | Replica | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit | 组件内存或存储上限 | 单 Pod 数据 PVC |
| --- | ---: | --- | --- | --- | ---: |
| PostgreSQL DEV | 3 | `500m / 500m` | `1 GiB / 1 GiB` | `shared_buffers=256 MB` | `40 GiB` |
| PostgreSQL PROD | 3 | `1 CPU / 1 CPU` | `2 GiB / 2 GiB` | `shared_buffers=512 MB` | `100 GiB` |
| PgBouncer DEV | 2 | `50m / 250m` | `64 MiB / 128 MiB` | — | 无 |
| PgBouncer PROD | 2 | `100m / 500m` | `128 MiB / 256 MiB` | — | 无 |
| Valkey DEV | 3 | `100m / 500m` | `256 MiB / 512 MiB` | `maxmemory=192 MiB` | `5 GiB` |
| Valkey PROD | 3 | `250m / 1 CPU` | `512 MiB / 1 GiB` | `maxmemory=384 MiB` | `10 GiB` |
| Valkey Sentinel DEV | 3（quorum 2） | `25m / 100m` | `32 MiB / 64 MiB` | — | 无 |
| Valkey Sentinel PROD | 3（quorum 2） | `50m / 200m` | `64 MiB / 128 MiB` | — | 无 |
| NATS DEV | 3 | `100m / 500m` | `256 MiB / 512 MiB` | Memory Store `128 MiB`；File Store `12 GiB` | `20 GiB` |
| NATS PROD | 3 | `250m / 1 CPU` | `512 MiB / 1 GiB` | Memory Store `128 MiB`；File Store `12 GiB` | `20 GiB` |

- 数据 PVC 合计：PostgreSQL DEV `120 GiB`、PROD `300 GiB`；Valkey DEV `15 GiB`、PROD `30 GiB`；NATS 两个环境均为 `60 GiB`。PgBouncer 与 Sentinel 是无状态层，不声明数据 PVC。
- `maxmemory` 必须低于 Pod Memory Limit，为复制、AOF、Client 与内存碎片保留余量；`20 GiB` NATS PVC 中最多 `12 GiB` 用于 File Store，其余保留给 RAFT、索引、Compaction、临时文件与恢复。Valkey 固定使用 `noeviction`、AOF everysec 与周期 RDB。
- Hardened Target 拓扑为：PostgreSQL 一个 Primary 与两个 Standby，quorum 同步复制固定 `method=any`、`number=1`、`dataDurability=required`、`failoverQuorum=true`；Valkey 一个 Primary、两个 Replica 与三个 Sentinel；NATS 三节点 File Storage 与三副本 Quorum。

#### 消息 Stream 与消息上限

| Stream | Retention Policy | 时间规则 | `MaxBytes` | 满容量行为 |
| --- | --- | --- | ---: | --- |
| `PLATFORM_COMMANDS` | `WorkQueuePolicy` | 成功 ACK 后删除；未完成消息最多 `7` 天 | `1 GiB` | `DiscardNew` 并告警 |
| `PLATFORM_EVENTS` | `LimitsPolicy` | 最多保留 `30` 天 | `5 GiB` | `DiscardOld`，删除最旧消息 |
| `PLATFORM_DLQ` | `LimitsPolicy` | 最多保留 `90` 天 | `2 GiB` | `DiscardNew` 并告警 |

时间与容量限制同时生效；单条消息上限为 `256 KiB`，超限内容只以 Object Reference 传递。

#### Temporal Server 与 Worker

| 组件 | 每环境 Replica | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit |
| --- | ---: | --- | --- |
| Frontend | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| History | 2 | `500m / 2 CPU` | `1 GiB / 2 GiB` |
| Matching | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Temporal System Worker | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Platform Orchestrator Worker | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Temporal UI / Console Access Adapter | 2 | `100m / 500m` | `256 MiB / 512 MiB` |

稳态 Request 合计约 `3.2 CPU / 6.5 GiB`，Limit 合计约 `13 CPU / 13 GiB`。上述组件均不声明独立数据 PVC，Durable Persistence 计入同环境 PostgreSQL，不在 ESSD BOM 中重复增加 Temporal 数据卷。发布还须为四类 Temporal Server Surge 预留约 `1.25 CPU / 2.5 GiB` Request，并为一整组新 Platform Orchestrator Worker 预留 `500m CPU / 1 GiB` Request。

#### 安全组件资源与阈值

| 组件/环境 | Replica | CPU Request / Limit | Memory Request / Limit | 其他上限 |
| --- | --- | --- | --- | --- |
| OpenBao Voting Server DEV | 3（quorum 2） | `250m / 1 CPU` | `512 MiB / 1 GiB` | Raft Data PVC `10 GiB`；Audit PVC `5 GiB` |
| OpenBao Voting Server PROD | 5（quorum 3） | `500m / 2 CPU` | `1 GiB / 2 GiB` | Raft Data PVC `10 GiB`；Audit PVC `10 GiB` |
| OpenBao Agent Injector DEV | 2 | `50m / 250m` | `128 MiB / 256 MiB` | 无 PVC |
| OpenBao Agent Injector PROD | 2 | `100m / 500m` | `256 MiB / 512 MiB` | 无 PVC |
| File Security（ClamAV + Worker） | 每环境 2 | ClamAV `1 / 2 CPU`；Worker `200m / 1 CPU` | ClamAV `3 / 6 GiB`；Worker `256 MiB / 1 GiB` | 每副本 Signature PVC `5 GiB`；`PDB minAvailable=1` |
| Image Security（Trivy） | 每环境 2 | `500m / 2 CPU` | `1 / 4 GiB` | Ephemeral `10 / 20 GiB`；每副本单并发 |

- OpenBao Voting Server 副本数固定为 DEV `3`、PROD `5` 且不使用 HPA；Raft 与 Audit PVC 使用率 `70%`/`85%` 为 Warning/Critical，只在线扩容不缩容；本地 Audit 缓冲默认保留 `7` 天。Hardened Target 中每个环境的 `pki-publication` 使用两个跨 Node 分散的无状态副本。
- File Security 并发固定为 `MaxThreads=2`、`MaxQueue=4`，单副本最多并发扫描 `2` 个对象、环境总并发 `4`，单副本故障时环境并发降至 `2`；引擎上限为 `MaxScanSize=400 MiB`、`MaxRecursion=17`、`MaxFiles=10000`、`MaxScanTime=120s`，单对象安全 Envelope 见本附录 [Platform Policy Key](#platform-policy-key) 的 Scanner 说明。
- `freshclam` 每 `2` 小时检查一次并对副本使用受控随机 Jitter；连续 `6`/`12`/`24` 小时未成功更新分别为 Warning/Critical/退出 Ready，超过 `24` 小时的副本不能返回 `CLEAN`。
- `trivy-data-sync` 每 `6` 小时更新 Vulnerability DB，每 `24` 小时更新 Java DB 与 Checks；Freshness Gate 的 Warning/Critical/Expired 为 Vulnerability DB `12`/`18`/`24` 小时、仅对相关镜像启用的 Java DB `36`/`48`/`72` 小时、Checks `48`/`72` 小时/`7` 天。

#### Flux GitOps 与 Observability 组件拓扑

来源：[09 基础设施与运维](./09-infrastructure-operations.md)。Flux Controller 的 Limit 不低于 `4× CPU Request` 与 `2× Memory Request`，并在 Platform 逻辑 Role 的有效 Capacity Profile 中为整套 Flux 保留至少 `1 CPU / 2 GiB` Rollout/Fault Headroom；低规模 Launch Profile 允许每个 Controller 为 `1` Replica，并以 `maxUnavailable=0`、`maxSurge=1` 完成滚动升级，由 Kubernetes 负责故障重启。

| Flux Controller | 单 Pod CPU / Memory Request |
| --- | --- |
| `source-controller` | `100m / 256Mi` |
| `kustomize-controller` | `250m / 512Mi` |
| `helm-controller` | `100m / 256Mi` |
| `notification-controller` | `50m / 128Mi` |

- 扩大 Repository、Application 或 Reconcile 并发前必须依据队列、Reconcile p95、OOM/Throttle 与 API Server 压力形成新 Capacity Candidate。
- Hardened Target 的 Observability 副本数为：Prometheus `2`（含 Thanos Sidecar 与 Thanos Query）、Alertmanager `3`、Grafana `2`、Loki `3` 与 Loki Gateway `2`、OpenTelemetry Gateway `2`、Tempo Monolithic Backend（`target=all`）、每 Node 的 Agent/Exporter/Canary，以及跨 Node 分散的 Hubble Relay 与只读 Hubble UI。Launch Profile 可降低副本与拓扑，但不得关闭 NetworkPolicy、安全日志、Deny 可见性与告警路径。

#### 组件 Backup、Retention 与恢复目标

| 组件 | Backup 调度 | Retention / Recovery Window | Cluster DR 目标 | Restore Drill |
| --- | --- | --- | --- | --- |
| Kubernetes etcd（来源 09） | PCS 锁定的 `etcdctl snapshot save`：DEV 每 `3` 小时、PROD 每 `30` 分钟；高风险变更前另生成 `BACKUP_VERIFIED` Pre-change Snapshot | DEV 保留 `7` 天；PROD 保留 `48` 小时周期点与 `30` 天每日点 | DEV `RPO ≤ 6h`、PROD `RPO ≤ 1h`，两者 `RTO ≤ 120min` | DEV 每月、PROD 每季度在隔离环境完整恢复 |
| PostgreSQL | 持续 WAL Archive（`archive_timeout=5min`）与每日 LZ4 Physical Base Backup | Recovery Window DEV `7` 天、PROD `30` 天 | PROD Candidate 在 `PGDATA <= 50 GiB` 时 `RPO <= 5min`、`RTO <= 60min` | DEV 每月、PROD 每季度完整 Restore |
| NATS | 每日 `04:00 Asia/Shanghai` 应用一致性 Account Backup | Backup Retention DEV `3` 天、PROD `7` 天；已发布 Outbox 至少保留 `30` 天 | `RPO <= 5min`、`RTO <= 60min` | DEV 每月、PROD 每季度完整 Restore |
| OpenBao | 应用一致性 Raft Snapshot：DEV 每 `6` 小时、PROD 每 `1` 小时；升级与高风险变更前另生成按需 Snapshot | DEV 保留 `7` 天；PROD 保留 `48` 小时周期点与 `30` 天每日点 | DEV `RPO ≤ 6h`、PROD `RPO ≤ 1h`，两者 `RTO ≤ 60min` | DEV 每月、PROD 每季度在隔离环境完整恢复 |

`postgres-backup` 的近期 Backup Object 与 `openbao-recovery` 对象默认使用 `7` 天 `GOVERNANCE` Object Lock；`nats-backup` 不使用统一默认值，其 `GOVERNANCE` Lock 覆盖所在环境的有效 Backup Retention（DEV `3` 天、PROD `7` 天），以便 Retention 到期时锁也已到期；`audit-worm` 的 Retention 期限由 [08 安全、审计与治理](./08-security-audit-governance.md)作为 Security Floor 拥有，不在本节调整。每日 Backup 周期不是消息 RPO。

#### Bucket Class 容量账本参数

每个 Bucket Class 的版本化容量参数至少包含 `operatingQuotaBytes`、`emergencyMarginBytes`、`admissionCeilingBytes`、各物理 Bucket 的互斥 `rgwMaxSizeBytes` 分区、基于对象分布证据生成的 `rgwMaxObjects` 以及 Desired/Effective Revision；同一 Class 的物理分区之和不得超过其 `admissionCeilingBytes`。各 Class 的当前有效数值与 Ceph Raw Envelope 由本节 [8. Storage 规划](#8-storage-规划)的规划边界与 Environment Capacity Profile 共同确定，[09 基础设施与运维](./09-infrastructure-operations.md)只验证其物理放置、Aggregate Ceiling 与 Headroom。

## Resource Profile

本节参数由 [04 Sandbox Runtime](./04-sandbox-runtime.md)的 Lease 准入与 Capacity Ledger 消费，由 [09 基础设施与运维](./09-infrastructure-operations.md)的一次性 Tool Job 与 Aggregate Physical Ceiling 验证消费；[12 实施路线图](./12-implementation-roadmap.md)在选择 Capacity Profile 时按本节的 Unit 与 Ceiling 计算。

### Sandbox Resource Profile

来源：[04 Sandbox Runtime](./04-sandbox-runtime.md)。Resource Profile 是不可变的 `GITOPS_CONFIG`，已形成的 Binding 始终使用原 Profile；变更 Request/Limit、Unit Weight 或 Runtime Binding 必须创建新的 Profile ID、Digest 与 Capacity Profile Candidate。

| Profile | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | Unit |
| --- | --- | --- | --- | ---: |
| `resource/standard-v1` | `2 / 4 vCPU` | `6 / 8 GiB` | `30 / 50 GiB` | 1 |
| `resource/image-build-v1` | `4 / 8 vCPU` | `12 / 16 GiB` | `60 / 100 GiB` | 2 |

### 一次性 Tool Job Resource Profile

来源：[09 基础设施与运维](./09-infrastructure-operations.md)。三个 Profile、并发、Deadline、TTL 和 Evaluation Ceiling 均是版本化 `GITOPS_CONFIG`/Capacity Profile；业务 Policy 只能在 Ceiling 内收紧。

| Job Profile | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | 最大并发 | Active Deadline |
| --- | --- | --- | --- | ---: | ---: |
| `tool/promptfoo-regression-v1` | `1 / 2 CPU` | `2 / 4 GiB` | `5 / 10 GiB` | 1 | 60 分钟 |
| `tool/evalscope-benchmark-v1` | `2 / 4 CPU` | `4 / 8 GiB` | `10 / 20 GiB` | 1 | 4 小时 |
| `tool/osv-scan-v1` | `500m / 2 CPU` | `1 / 4 GiB` | `5 / 10 GiB` | 1 | 60 分钟 |

- Scratch 使用有界 `emptyDir`；完成后结构化结果先固化到 Artifact，再由 `ttlSecondsAfterFinished=86400` 清理 Job/Pod。
- 两个 Evaluation Profile 共享 `maxActiveEvaluationJobs=1`，不能同时运行。
- 每个 Evaluation Job 在受理前必须固定 `maxRequests`、`maxInputTokens`、`maxOutputTokens`、`maxTotalTokens`、`maxCost` 与 Model Gateway Quota Snapshot。初始 Evaluation Ceiling 为每个 promptfoo Job `200 requests / 2,000,000 total tokens / 60min`、每个 EvalScope Job `1,000 requests / 10,000,000 total tokens / 4h`；`maxCost` 由当前币种与 Model Catalog 价格快照计算并且必须显式给出。

## Platform Policy Key

本节参数由 [04 Sandbox Runtime](./04-sandbox-runtime.md)的准入 Gate、[03 Agent、Skill 与 Model](./03-agent-skill-model.md)的 Child 收敛语义、[01 身份、组织与授权](./01-identity-organization-authorization.md)的认证与 Session 规则、[02 Requirement Workflow](./02-requirement-workflow.md)的 Artifact 额度、[06 平台应用与集成](./06-platform-application-integration.md)的安全公告采集与发布调度以及 [10 配置治理](./10-configuration-governance.md)的 Draft/Promotion 生命周期消费；有效值与发布生命周期由 10 拥有，物理 Maximum 受 [12](./12-implementation-roadmap.md)当前选择的 Capacity Profile 与 [09](./09-infrastructure-operations.md)已验证 Ceiling 约束。

### Sandbox 与 Image Build 准入 Policy

来源：[04 Sandbox Runtime](./04-sandbox-runtime.md)。Sandbox 先分别应用两个独立、版本化的 `PLATFORM_POLICY`，再执行共享 Capacity Ledger 与物理安全 Gate。

| Policy Key | Minimum | Maximum | 准入 Contract |
| --- | ---: | --- | --- |
| `agent.sandbox.active_attempt_limit` | `1` | 当前有效 Capacity Profile 的 `maxActiveSandboxAttempts` | 限制当前 Platform Environment 中同时持有 Agent Sandbox Lease 的 Attempt 数。达到上限时拒绝后续 Agent Lease，并返回包含 Policy Version 的 `POLICY_LIMIT_REACHED`。 |
| `agent.image_build.active_build_limit` | `0` | 当前有效 Capacity Profile 的 `maxActiveImageBuilds` | 限制当前 Platform Environment 中同时持有 Build Lease 的 Child 数及新 Build Handoff。值为 `0` 时拒绝新 Build Handoff，并返回包含 Policy Version 的 `POLICY_DISABLED`。 |

### 其他主题的版本化 `PLATFORM_POLICY` 参数

下列参数在各主题中被明确声明为版本化 `PLATFORM_POLICY`（Platform Policy），但未定义独立 Key 名；精确数值以本表为准。

| 参数 | 默认值 / 取值范围 | 生效与约束 | 来源主题 |
| --- | --- | --- | --- |
| 一次性临时密码有效期 | 默认 `24` 小时 | 由版本化 `PLATFORM_POLICY` 管理，不由客户端或脚本固定 | [01](./01-identity-organization-authorization.md) |
| 密码过期周期 | 永不过期、`90` 天、`180` 天或受约束的自定义周期 | 每个 Policy Version 自服务端成功发布并成为当前 Effective Policy 时生效 | [01](./01-identity-organization-authorization.md) |
| 同账号有效 Session 上限 | 默认 `3`，可在 `1～10` 范围内调整 | 密码重置、TOTP 重置、账号停用和安全事件都可以撤销 Session | [01](./01-identity-organization-authorization.md) |
| Agent 执行等待输入期限 | 默认 `24h` | 在 Binding 时保存有效值与 Policy Version；期限内答复回到 `QUEUED`，逾期经 `CANCELING` 进入 `TIMED_OUT` | [03](./03-agent-skill-model.md) |
| 用户附件额度 | 单文件 `50 MiB`；每 Requirement 合计 `200 MiB` | 使用量达到 `80%` 预警 | [02](./02-requirement-workflow.md) |
| Agent Artifact 额度 | 单 Object `100 MiB`；单 Attempt 合计 `500 MiB`；单 Requirement 全部 Attempt 合计 `1 GiB` | 超限时 Attempt 安全停止为 `FAILED`，记录 `failureCode=RESOURCE_EXHAUSTED` 与 `failureDimension=ARTIFACT_QUOTA`，不截断证据 | [02](./02-requirement-workflow.md) |
| Artifact Presigned Request 有效期 | 默认 `5min` | 只对应单一 Object Version，不持久化也不写入日志；Policy 可收紧但不得延长为长期可复用 URL | [02](./02-requirement-workflow.md) |
| Draft 自动归档等待期 | 默认连续 `30` 天无 Meaningful Activity | 由 Super Admin 修改并按 `NEXT_SCHEDULE` 生效，不得写死在 Frontend、任务或镜像 | [10](./10-configuration-governance.md) |
| Promotion Bundle 首次导入有效期 | 默认 `30` 天 | 按 `NEW_OBJECT` 只影响后续导出；PROD 当前 Import Policy 可缩短但不可越过签名覆盖的 `notAfter` | [10](./10-configuration-governance.md) |

Scanner 的 `100 MiB` 单对象安全 Envelope 是独立 Security Floor，不是产品额度，不能仅提高产品额度越过（[02](./02-requirement-workflow.md)）。

### 安全公告采集与发布调度

来源：[06 平台应用与集成](./06-platform-application-integration.md)。调度、时区、来源允许列表、Endpoint、扫描器版本/digest、筛选条件、timeout、限流与重试值全部是注册的版本化配置，不硬编码在 Frontend、业务代码或任务脚本中。

| 参数 | 默认值 | 生效与约束 |
| --- | --- | --- |
| 增量采集并运行 `OSV-Scanner` | 每周日 `02:00 Asia/Shanghai` | 调度与时区都是注册的版本化配置 |
| 公告自动发布 | 每周一 `07:00 Asia/Shanghai` | 必需来源失败或扫描为 `FAILED/EXPIRED` 时阻止本期自动发布并保留上一期 |
| 单个失败来源或扫描 Job 的重试 | 最多 `3` 次有界重试 | 超过上限后告警，不发布空公告 |

## 错误码

本节错误码由“产生模块”返回或记录，并由其消费方按结构化原因处理：Sandbox 准入与磁盘（[04](./04-sandbox-runtime.md)）、Agent/Child 收敛（[03](./03-agent-skill-model.md)）、Artifact 与扫描（[02](./02-requirement-workflow.md)）、存储准入（[07](./07-data-messaging-storage.md)）、Integration Baseline Evidence（[05](./05-source-control-delivery.md)）、Configuration Promotion（[10](./10-configuration-governance.md)）与 Operations 告警/扩容判定（[09](./09-infrastructure-operations.md)）。

| 错误码 | 语义 | 产生模块 |
| --- | --- | --- |
| `CAPACITY_UNAVAILABLE` | 产品并发限制、剩余 Unit、完整资源向量、Node Placement、Kata Gate、Runtime Disk 与安全余量任一不足时拒绝 Lease，并返回结构化维度；新 Lease 的磁盘投影不安全时同样返回。不排队、不抢占、不超卖，也不临时扩大配额。 | [04](./04-sandbox-runtime.md)（[09](./09-infrastructure-operations.md) 以其比例作为扩容判定与 Evolution Trigger 证据） |
| `POLICY_LIMIT_REACHED` | `agent.sandbox.active_attempt_limit` 达到上限，拒绝后续 Agent Lease；返回值包含 Policy Version，不撤销既有 Lease。 | [04](./04-sandbox-runtime.md) |
| `POLICY_DISABLED` | 有效 `agent.image_build.active_build_limit` 为 `0` 时拒绝新 Build Handoff；已完成 Handoff 但尚未取得 Build Lease 的排队 Child 也必须收到该原因码。返回值包含 Policy Version。 | [04](./04-sandbox-runtime.md)；[03](./03-agent-skill-model.md) 将 Child 收敛为 `CANCELED/POLICY_DISABLED` 结构化终态并唤醒 Parent |
| `RESOURCE_EXHAUSTED` | 资源耗尽类失败的 `failureCode`：Memory/Ephemeral 超限时安全终止并记录证据；超过 Agent Artifact 限额时 Attempt 安全停止为 `FAILED`。 | [03](./03-agent-skill-model.md)、[02](./02-requirement-workflow.md) |
| `RESOURCE_EXHAUSTED/MEMORY` | Memory 无 Swap，OOM 形成该维度。 | [04](./04-sandbox-runtime.md) |
| `RESOURCE_EXHAUSTED/EPHEMERAL_STORAGE` | Ephemeral Limit、DiskPressure、Eviction、Inode 或写满风险形成该维度。 | [04](./04-sandbox-runtime.md) |
| `ARTIFACT_QUOTA` | 产品维度：达到产品额度时返回的 `failureDimension`，不能与容量维度 `STORAGE_CAPACITY` 混同。 | [02](./02-requirement-workflow.md)、[07](./07-data-messaging-storage.md) |
| `STORAGE_CAPACITY` | 容量维度：Class Operating/Admission、物理 RGW Size/Object Guard、Cluster Raw 或最满 OSD Gate 任一失败时统一返回，保留失败 Gate、Class、Effective Revision 与 Reservation ID，并触发 Operations Incident。 | [07](./07-data-messaging-storage.md) |
| `UPLOAD_FAILED` | Artifact Version 在完成上传与完整性确认前失败的异常终态；该 Object Version 不可用、不进入 Workflow Gate，只能由调用方重新上传形成新的 Object Version。 | [02](./02-requirement-workflow.md) |
| `SCAN_FAILED` | 扫描投递的有界退避重试超过上限后的异常状态；告警后只能通过受控命令重新入队。 | [02](./02-requirement-workflow.md)（[08](./08-security-audit-governance.md) 只提供扫描 Contract） |
| `REQUIREMENT_SNAPSHOT_CONFLICT` | 生成 Integration Baseline Evidence 期间发现 Requirement/必需集合版本已变化，本次生成失败并重新获取快照，不发布部分覆盖或混合版本的 Evidence。 | [05](./05-source-control-delivery.md) |
| `SOURCE_SUPERSEDED` | Promotion 逐 Key 比较 High-water Mark 时源 Sequence 较小。 | [10](./10-configuration-governance.md) |
| `SOURCE_ALREADY_PUBLISHED` | 相同 Sequence + 相同 Intent Hash，返回既有来源链。 | [10](./10-configuration-governance.md) |
| `SOURCE_LINEAGE_CONFLICT` | 相同 Sequence + 不同 Intent Hash，Fail Closed。 | [10](./10-configuration-governance.md) |
| `EXTERNAL_WATCHDOG_NOT_READY` | External Watchdog/Alertmanager Deadman Receiver 未就绪时必须显示，不能声明具备 Cluster 失联告警能力。 | [09](./09-infrastructure-operations.md) |

生命周期状态名（例如 `QUEUED`、`CANCELING`、`CANCELED`、`QUARANTINED`、`MAPPING_REQUIRED`、`REBINDING`、`NOT_STARTED`）不是错误码，仍由各主题自己的状态机拥有。

## Port 方法清单

本节方法清单的业务语义由 [04 Sandbox Runtime](./04-sandbox-runtime.md)（`SandboxPort`）与 [05 Source Control 与交付](./05-source-control-delivery.md)（`SourceControlPort`）拥有，并由 [06 平台应用与集成](./06-platform-application-integration.md)的稳定 Port/Adapter 边界消费。

### `SandboxPort`

来源：[04 Sandbox Runtime](./04-sandbox-runtime.md)。Sandbox Controller 是 Execution Binding 到 Kubernetes Materialization 的唯一 Materializer，稳定 `SandboxPort` 仅提供：

```text
provisionMaterialization
getMaterializationStatus
publishPreview
collectArtifacts
checkpoint
cancelMaterialization
destroyMaterialization
reconcileLease
```

### `SourceControlPort`

来源：[05 Source Control 与交付](./05-source-control-delivery.md)。`SourceControlPort` 至少提供：

```text
listAuthorizedRepositories
getRepositoryProfile
getBranch / getCommit / compare
createTaskBranch
createIntegrationMergeRequest
mergeIntegrationMergeRequest
createFormalMergeRequest
getMergeRequest
mergeFormalMergeRequest
deleteSourceBranch
reconcileExternalEffect
```

## Runtime 组件清单

本节记录 Runtime 组件的角色与 Platform Compatibility Set（PCS）当前锁定的精确版本。PCS 的注册、Candidate、兼容与 Provisioning Gate 语义由 [09 基础设施与运维](./09-infrastructure-operations.md)拥有，本节只保存其锁定值；Sandbox 组件清单由 [04 Sandbox Runtime](./04-sandbox-runtime.md)的 KVM/Kata/Node Gate 与 Image Build 消费，Secret、Audit 与 PKI 语义由 [08 安全、审计与治理](./08-security-audit-governance.md)拥有。

### Sandbox Runtime 与 Node Image 组件

| 组件 | 角色 | 来源主题 |
| --- | --- | --- |
| Kata Containers | 社区 Kata Containers 是正式 Sandbox Runtime；每个 Sandbox Pod 必须使用独立 Kata Guest，Kata Runtime 启动失败时不得回退至 `runc`、ACK `runV` 或其他普通容器/VMM Runtime。 | [04](./04-sandbox-runtime.md) |
| `runtime-rs` | 正式 Runtime 的 Kata Runtime 组成部分。 | [04](./04-sandbox-runtime.md) |
| `containerd-shim-kata-v2` | 正式 Runtime 的 containerd Shim 组成部分。 | [04](./04-sandbox-runtime.md) |
| QEMU/KVM | 正式 Runtime 的虚拟化组成部分；Node 加入可调度 Pool 前 KVM Gate 必须验证 `/dev/kvm`、CPU virtualization、KVM module、`kata-runtime check`、Guest 创建/销毁、RuntimeClass、网络、CSI、MTU、性能、Reboot/Drain 与 Soak。 | [04](./04-sandbox-runtime.md) |
| 独立 Guest Kernel | 正式 Runtime 组成部分，使每个 Sandbox Pod 运行在独立 Kata Guest 中。 | [04](./04-sandbox-runtime.md) |
| virtiofsd | `sandbox-worker` 预烘焙不可变 Node Image 的受控组成部分；配置更新只能通过新的 Image、Runtime Profile 和受控逐 Node 替换生效。 | [04](./04-sandbox-runtime.md) |
| containerd | 同为不可变 Node Image 的受控组成部分；禁止在运行 Node 上补装或漂移修改。 | [04](./04-sandbox-runtime.md) |
| Rootless BuildKit | Image Build Child 的构建器；Child 使用独立 Kata Materialization、Rootless BuildKit、Binding、Credential、Workspace 和 Fencing Token。首批有界 `IMAGE_BUILD` Child Type 仅启用 Rootless BuildKit。 | [04](./04-sandbox-runtime.md)、[12](./12-implementation-roadmap.md) |
| OpenBao | 保存 Secret 与 Lease 事实；使用 Integrated Storage（Raft），不以 PostgreSQL 或业务数据服务作为 Storage Backend；精确版本/digest 按下表锁定，不得使用浮动 Tag。 | [04](./04-sandbox-runtime.md)、[08](./08-security-audit-governance.md) |
| OpenBao Agent Injector | 将当前执行的短期 Secret 写入 Pod `tmpfs` 内存文件，不写入 Deployment YAML、Environment Variable、镜像或持久磁盘。 | [04](./04-sandbox-runtime.md)、[08](./08-security-audit-governance.md) |

### Platform Compatibility Set 锁定版本

来源：[09 基础设施与运维](./09-infrastructure-operations.md)。下表是 Target Architecture 的初始兼容候选：每个制品仍须绑定 Artifact/Image Digest，禁止 `latest`、浮动 Tag 或启动时自动升级；精确 Patch、Chart、Operand、CRD 与 Image 组合是同一 PCS 不可分割的内容，任何变化都创建新 PCS Candidate。

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
| Security | Trivy | 0.73.x | v0.73.0；Vulnerability/Java DB 与 Checks 由独立 `trivy-data-sync` 按 [08](./08-security-audit-governance.md) 的 Freshness Gate 更新 |
| Security Tooling | OSV-Scanner | 2.3.x | v2.3.8 |
| Evaluation Tooling | promptfoo | 0.121.x | 0.121.15 |
| Evaluation Tooling | EvalScope | 1.9.x | v1.9.1 |
| Object Storage | Rook / Ceph | Rook 1.20 / Ceph 20.2 | Rook 1.20.2；Ceph 20.2.2 |
| Observability | kube-prometheus-stack | 88.1.x | Chart 88.1.5；Prometheus Operator 0.93.0；Prometheus 3.13.2-distroless；Alertmanager 0.33.1；Grafana Chart 12.10.3 / Grafana 13.1.2 |
| Observability | Thanos | 0.42.x | 0.42.4 |
| Observability | Loki | 3.7 | Chart 18.7.3；Loki 3.7.5 |
| Observability | OpenTelemetry Collector | Chart 0.168.x | Chart 0.168.0；默认 Operand 0.157.0 |
| Observability | Tempo | 3.0 | 3.0.2 Monolithic `target=all` |
