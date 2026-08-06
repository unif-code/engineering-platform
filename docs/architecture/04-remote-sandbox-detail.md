# 远程 Sandbox Runtime 详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[远程 Sandbox Runtime](./04-remote-sandbox.md)

## 1. 目标与边界

目标：

- 为 Product/Technical SDD、开发、测试、Review、Preview 和 Image Build 提供统一隔离环境；
- 隔离不同 Platform Environment、Workspace、Requirement、WorkItem、Repository 和 Attempt；
- 将逻辑 Sandbox Environment 与一次性物理 Materialization 分离；
- 通过 Git、Artifact 和 Checkpoint 支持故障后重建；
- 通过 `SandboxPort`、Resource Profile 和 KVM Capability Contract 隔离 Kubernetes、Kata 与 Provider 细节。

边界：

- Sandbox 不保存 Requirement/WorkItem 状态、代码、Artifact、Audit 或 Secret 的唯一事实；
- 不允许不同 Attempt 共享可写 Workspace、执行身份或短期凭据；
- 不替代 GitLab、Object Storage、Model Gateway 或独立 Jenkins；
- 不向 Agent 暴露 Kubernetes API、Host 管理能力或任意公网出口。

## 2. 逻辑与物理模型

业务上一个 Requirement 对应一个逻辑 `RequirementSandboxEnvironment`：

```text
RequirementSandboxEnvironment
├── WorkItem A → RepositoryBranchBinding A
├── WorkItem B → RepositoryBranchBinding B
├── Mock / Frontend / Backend Service Binding
├── Preview Endpoint
├── Agent Attempt Materialization（按活动 Attempt 创建）
└── Image Build Materialization（按 Child Execution 创建）
```

逻辑 Environment 只保存稳定关联和生命周期元数据，不承诺长期保留 Pod、VM、Node 或本地磁盘。每个持有有效 Sandbox Capacity Lease 的 Agent Attempt 或 Image Build 创建独立 `SandboxMaterialization`；进入等待、终态或安全清理后销毁，后续恢复重新创建。

物理实例丢失不能导致业务事实丢失：代码和分支以 GitLab 为准，Checkpoint/日志/测试/构建证据以 Artifact Store 为准，Assignment/Attempt/Lease/Audit 以 Control Plane 为准。

## 3. 核心实体

| 实体 | 职责 |
| --- | --- |
| `RequirementSandboxEnvironment` | Requirement 级逻辑环境和服务引用 |
| `SandboxMaterialization` | 一个 Agent Attempt 或 Build Execution 的物理 Kata Guest |
| `SandboxCapacityLease` | 带 Generation/Fencing Token 的原子容量占用 |
| `ResourceProfile` | 聚合 CPU、Memory、Ephemeral Storage 与 Unit Weight |
| `RuntimeProfile` | Kata/Guest/VMM、安全与 Runtime Artifact Contract |
| `ToolProfile` | 受签名、最小化的工具镜像、能力、资源与 Egress |
| `RepositoryCheckout` | WorkItem、Repository Branch Binding、Commit 与 Workspace 路径 |
| `ServiceBinding` | Mock、Frontend、Backend、Test 等进程与端口 |
| `PreviewEndpoint` | 经 Preview Gateway 保护的稳定访问引用 |
| `SecretLease` | OpenBao 中短期凭据的不可泄密引用 |
| `SandboxCheckpoint` | 恢复所需的结构化状态和 Artifact 引用 |

每个实体必须关联 Environment、Workspace、Requirement、WorkItem、Attempt/Build Execution 和 Correlation ID；物理 Pod/Node/RuntimeClass 只能作为实现与诊断字段，不能成为 Workflow 业务主键。

## 4. Kubernetes 与 KVM Compute 拓扑

每个 Platform Environment 在自己的 Kubernetes Cluster 内包含同构的专用 `sandbox-worker` Node Pool。当前只部署 DEV；未来 PROD 使用相同组件、GitOps 与 PCS Contract，在自己的账号、VPC、Cluster 和 Node 上独立实例化。

每个环境固定两个 `sandbox-worker` Node：

- 两个 Node 必须分别落在两个可验证的独立物理 Host；
- 当前 Alibaba Cloud Mapping 通过环境独立 ECS Deployment Set 的 High Availability/host/`Affinity=1` 证明 Host 分散；
- `sandbox-worker` 使用专用 Label、Taint、RuntimeClass Scheduling 与 Admission；
- Sandbox 不能调度到 `platform-worker`、`storage-worker` 或 Control Plane；
- 一个 Node 故障或维护时，另一个 Node 必须在验证后的 Capacity Envelope 内承载本环境完整 Unit Ceiling；
- 自愿维护一次最多处理一个 Node，容量、Active Lease 或 Fence 未恢复前禁止处理中断第二个 Node。

Node Count 低于 2 会破坏 N+1 Contract，必须拒绝。增加 Node、替换规格或迁移独立 Sandbox Cluster 只创建新的 Compute Provider Mapping/Capacity Profile，不修改 Requirement、Attempt、Workflow 或 Sandbox Port。

## 5. Kata/KVM Runtime Contract

通用 Compute Contract 是 `KVM-capable Compute Pool`。正式 Runtime 基线为社区 Kata Containers `4.0.x Stable`、Rust `runtime-rs`、QEMU/KVM、`containerd-shim-kata-v2` 和独立 Guest Kernel；具体 Patch、Artifact 与 Digest 在 PCS 冻结时锁定。

每个 Sandbox Pod 使用独立 Kata Guest。Sandbox Controller 是 Runtime Profile 到 Kubernetes 的唯一 Materializer：

- RuntimeClass 名称和 Handler 属于 GitOps/PCS 实现事实，业务对象和用户不能选择或覆盖；
- Node 加入调度池前必须验证 `/dev/kvm`、CPU Virtualization、KVM Module、`kata-runtime check`、Guest 启停/清理、RuntimeClass、Cilium、CSI、MTU、性能、Reboot/Drain 和 Soak；
- 任一 Gate 失败时 Node 保持不可调度，Kata 启动失败不得回退到 `runc`、ACK `runV`、旧 Go Runtime 或其他 VMM；
- `sandbox-worker` 使用预烘焙不可变 Node Image，Kata/QEMU/Guest Kernel/RootFS/virtiofsd/containerd 配置更新通过新镜像和新 PCS 逐节点替换，不在运行节点补装；
- Agent Workload 默认 Non-root、禁止 Privileged/Host Namespace/HostPath/Host Socket/Device/Kubernetes ServiceAccount Token，并使用只读 RootFS、`no_new_privs`、RuntimeDefault seccomp 和 `capabilities.drop=[ALL]`；
- 只有经过签名和 PCS 验证的 Tool Profile 可以增加最小能力，不能成为开启 Host 权限的别名。

### 5.1 Alibaba Cloud Provider Mapping

Region/Zone 当前为 `UNASSIGNED`。在无法验证更小 KVM 规格可用性时，Alibaba Cloud ECS Elastic Bare Metal（EBM）`64 vCPU / 192 GiB` 作为保守 Fallback Candidate；它直接提供硬件虚拟化能力，不应描述为 Nested Virtualization。

EBM 规格不是架构硬下限，也不是按 30 DAU 推导出的需求。目标账号、Region 和 Zone 中正式 GA、可购且明确支持 Nested Virtualization 的较小 ECS，只要通过相同 KVM Provisioning Gate、实际 Allocatable、全 Unit 组合、N+1、启动峰值、I/O 与 Soak 验证，就可以成为 Effective Provider Mapping。邀测、灰度或仅凭 CPU 支持 VT-x/SVM 的普通 ECS 不能进入正式基线。

Provider Mapping 失败时保持 Capacity Profile 为 `CANDIDATE`，不能静默降低隔离级别或把 EBM Fallback 写成跨云固定最小规格。

## 6. Provisioning 与执行生命周期

Sandbox Materialization 与 Agent Attempt 状态一致：

```text
Attempt QUEUED
→ 原子获取 Capacity Lease
→ Attempt PROVISIONING
→ 校验 Binding / Runtime / Network / Secret
→ 创建 Kata Materialization
→ Checkout 固定 Repository Branch / Commit
→ 注入短期凭据和 Tool Policy
→ 健康检查
→ Attempt RUNNING
→ FINALIZING / WAITING_INPUT / WAITING_CHILD / CANCELING
→ 固化事实、Fence 副作用、吊销 Secret、释放 Lease、销毁 Materialization
```

`QUEUED`、已经完成清理的 `WAITING_INPUT` 和 `WAITING_CHILD` 不持有活动 Lease。恢复同一 Attempt 时保留原 Execution Binding 和 Checkpoint，重新进入 `QUEUED`；只有重新获得 Lease 后才能 Provision。终态 Attempt 不复活，业务重试创建新 Attempt。

Controller/Orchestrator 使用 Attempt/Build ID、Generation、Fencing Token、唯一约束和 Reconciliation 防止重复启动。只有在旧 Materialization、凭据和副作用已经停止或 Fence 后才能回收 Lease；不能通过“数 Pod”判断容量。

## 7. Capacity Unit 与 Resource Profile

### 7.1 Resource Profile

| Profile | Runtime Binding | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | Unit |
| --- | --- | --- | --- | --- | ---: |
| `resource/standard-v1` | `runtime/agent-standard-v1` | `2 / 4 vCPU` | `6 / 8 GiB` | `30 / 50 GiB` | 1 |
| `resource/image-build-v1` | `runtime/image-build-v1` | `4 / 8 vCPU` | `12 / 16 GiB` | `60 / 100 GiB` | 2 |

资源向量是一个 Materialization 内全部 Agent/Builder、Init、Tool、Sidecar、Writable Layer、`emptyDir` 和受计量日志的聚合预算，不是每个 Container 各获得一份。Kata `PodOverhead`、Node DaemonSet、OS/Kubernetes Reserved、Image Cache 和基础设施开销必须在 Capacity Profile 中额外计算，不能从用户执行预算偷扣。

Resource Profile 是不可变 `GITOPS_CONFIG`。修改 Request/Limit、Unit Weight 或 Runtime Binding 必须创建新 ID/Digest 和新 Capacity Profile Candidate；运行或等待中的 Attempt 永远使用 Binding 中原 Profile。首版不向用户暴露 Small/Large 选择，也不按岗位、类型、Model 或仓库写死规格。

### 7.2 Capacity Ledger

首个 Capacity Profile：

- DEV：`maxSandboxCapacityUnits=5`；
- PROD：`maxSandboxCapacityUnits=8`；
- `standard-v1` Lease 原子占 `1 Unit`；
- `image-build-v1` Lease 原子占 `2 Units`；
- Unit 不是 CPU 时间、Pod 数、计费单位或用户配额。

Agent 和 Build 使用同一个 Capacity Ledger/Fencing Domain。无 Build 时最多 DEV 5、PROD 8 个 standard Agent；一个 Build 活动时最多另有 DEV 3、PROD 6 个 standard Agent。任何请求必须一次获得完整 Unit，不允许先占一部分再等待剩余 Unit。

实际准入同时满足产品 Policy Limit、Profile 最大并发、剩余 Unit、完整 Resource Vector、Node Placement、Kata Gate、Runtime Disk 和实时安全余量。任一维度不足时保持持久 `QUEUED`，不抢占或取消已启动执行。

### 7.3 Product Policy 与只读容量事实

Super Admin 可以在物理 Capacity Envelope 内调整：

- `agent.sandbox.active_attempt_limit`：DEV 初始 5、PROD 初始 8；
- `agent.image_build.active_build_limit`：初始 1，可配置为 0 禁止新 Build。

降低上限不强杀已有 Lease，只阻止新准入并等待自然收敛。Unit Ceiling、Resource Profile、Lease、Node、Placement 和 Runtime Disk 水位属于 GitOps/Capacity 事实，管理后台只读，Super Admin 也不能从业务页面修改。

## 8. Image Build Child Execution

镜像构建不是普通 Agent Container 内的 Privileged 操作。Parent Attempt 通过稳定 Idempotency Key 创建一个独立 Child Build Execution：

1. Parent 固化 Checkpoint、日志和 Artifact，销毁 Materialization、吊销 Secret 并原子释放 `1 Unit`；
2. 只有 `parentLeaseReleased=true` 可证明时，Child 才能一次获取 `2 Units` Build Lease；
3. Child 使用独立 Kata Materialization、Rootless BuildKit、Binding、Credential、Workspace 和 Fencing Token；
4. Build 完成、失败、取消或超时后先固化 Image Digest、SBOM/Provenance、日志、扫描与结构化结果，再释放资源；
5. 仍有效的 Parent 通过 Continuation Reservation 回到 Agent Queue，重新获取 `1 Unit` 后恢复。

Parent 处于 `WAITING_CHILD` 时占 `0 Unit`，不能保留 Agent Lease等待 Build，也不能与 Child 共享凭据或本地目录。同一 Parent 首发任一时刻最多一个非终态 Child；Node 故障时必须先 Fence 旧 Builder，不能并发恢复两份构建。

## 9. Runtime Disk 与资源耗尽

每个 `sandbox-worker` 使用独立 Runtime/Ephemeral XFS Disk：DEV Candidate 为 `500 GiB`，PROD 为 `800 GiB`。每块盘必须在另一个 Node 故障后容纳完整 DEV `5 Units` 或 PROD `8 Units` 的任意批准组合及 Runtime/GC/Eviction 余量；本地盘不提供 Backup、Replication 或跨 Node 恢复承诺。

Ephemeral Storage 只保存可再生的 Checkout、依赖缓存、构建/测试中间文件、Writable Layer 和有界临时日志。Git Commit、Checkpoint、Artifact、Audit 和 Secret 不得只存在本地盘。

- CPU 超过 Request 可以在 Limit 内 Burst，达到 Limit 时 Throttle 并记录；
- Memory 不使用 Swap，OOM 使 Attempt 安全进入 `FAILED/RESOURCE_EXHAUSTED/MEMORY`；
- Ephemeral Limit、DiskPressure、Eviction 或写满风险使 Attempt 安全进入 `FAILED/RESOURCE_EXHAUSTED/EPHEMERAL_STORAGE`；
- 新 Lease 的 Disk/Inode/Reserve 投影不安全时保持排队，不临时扩大配额或调度到其他 Node Role；
- Node 丢失后从 Git、Checkpoint 和 Artifact 受控恢复，不复制一致性未知的 Runtime Directory。

## 10. Repository、Template 与并发

Sandbox Controller 根据 Execution Binding 挂载一个或多个当前 Requirement 的 WorkItem Checkout；每个 Checkout 固定 `repositoryId + branchName + baseCommitSha`。Agent 只能写自己绑定的任务分支，同一 Repository Branch 同时最多一个写执行；Test/Review 可以基于固定 Commit 创建只读 Materialization。

Agent 产生的有效代码必须 Commit 并 Push 到任务分支。进入等待、终态或清理前，未提交但需要保留的状态必须形成受控 Patch/Checkpoint Artifact；恢复以 Git Commit 为主，不依赖旧磁盘。

版本化 Template/Tool Profile 支持 React、Vue、Angular、React Native、UniApp、小程序、Java 等技术栈，并声明镜像 digest、命令、端口、缓存、健康检查、Tool Capability 与支持的 Preview 类型。Template 不能覆盖 Execution Binding 的 Resource/Runtime/Network/Security Profile。

## 11. Network 与 Egress

Sandbox 使用 Cilium/NetworkPolicy 默认拒绝东西向和公网访问，只按 Execution Binding 放行：

- 当前 WorkItem 的 GitLab Source/Registry Endpoint；
- 批准的内部依赖源、镜像源和 Artifact Store；
- Model Gateway；
- 平台控制的必要 API；
- 明确批准的测试服务或 Connector Endpoint。

联网搜索优先由 Model Gateway 调用 Deployment 原生 Search Capability；需要 Agent Tool 搜索时，必须通过批准的 Search Connector、目标 Allowlist、请求审计、Rate Limit 和响应清洗。两者都不等价于给 Sandbox 开放任意 DNS、IP、HTTP Proxy 或公网 Egress。

依赖源不可用时只允许使用经过验证的缓存或有界重试；不能临时关闭 NetworkPolicy。Sandbox 不得访问生产域名、生产数据库、NATS、Kubernetes API、Cloud Metadata/Admin API、其他环境或其他 Attempt。

## 12. Secret 与身份

OpenBao 保存 Secret 和 Lease 事实，Agent Injector 将短期 Secret 写入 Pod `tmpfs` 内存文件。允许的 Secret 仅限当前 Attempt 所需的 Git 分支、依赖源、测试服务、Model Gateway Run Token 和 Connector Credential。

禁止把 Secret 放入 Deployment YAML、Environment Variable、镜像、代码、Commit、Prompt、日志、Trace、Artifact、Cache 或持久磁盘。Secret Lease 必须绑定 Environment、Attempt/Build、Repository/Branch、Tool、Scope 和有效期；进入等待、Finalizing、Cancel、Failure、Timeout、归档或删除时立即吊销。

## 13. Preview 与 Artifact

浏览器应用通过 URL Preview；RN、UniApp 和小程序可以通过 `PreviewAdapter` 生成构建 Artifact、二维码或专用远程设备入口。Preview Gateway 校验当前平台 Session、Capability、Scope、Workspace Membership 和 Requirement 访问权，不直接暴露 Pod 地址，并支持到期、撤销和访问审计。

必须持久化的证据包括固定 Commit、Build/Lint/Test 输出、覆盖率、Preview 元数据、Agent Tool 调用、Template/Runtime/Profile digest、资源峰值、网络访问、失败诊断、Checkpoint/Patch、Image Digest、SBOM/Provenance 和校验 Hash。Artifact 保存到 Object Storage，元数据由平台数据库管理。

## 14. Jenkins 边界

首版 Jenkins 是独立平台。Sandbox 负责 `main` 合并前的开发、Preview、Integration 与测试证据；开发人员在 Jenkins 中手工触发、查看和处置构建。研发平台不调用 Jenkins、不读取其状态、不接收其 Webhook，也不把 Jenkins 作为 Agent Runtime、Sandbox Child 或 Workflow Gate。

## 15. Port、事件与失败处理

稳定 `SandboxPort` 使用逻辑 ID：

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

Workflow 不调用 attach Pod、exec Node、选择 RuntimeClass 或修改 Resource。关键事件包括 `SandboxLeaseAcquired`、`SandboxProvisioned`、`SandboxReady`、`SandboxCheckpointed`、`PreviewPublished`、`SandboxQuarantined`、`SandboxDestroyed` 和 `SandboxLeaseReleased`。

| 场景 | 处理 |
| --- | --- |
| KVM/Kata/PCS Gate 失败 | Node 不可调度，Attempt 保持排队或结构化失败，不回退普通容器 |
| Provision 失败 | Fence 未完成的实例、吊销 Secret、保留诊断并有界重试 |
| 依赖源或 Connector 不可用 | 使用获批缓存/重试，不能扩大 Egress |
| Capacity/Placement/Disk 不足 | 保持 `QUEUED` 并记录 Block Reason |
| Memory/Ephemeral 超限 | 安全停止、固化证据、`RESOURCE_EXHAUSTED` |
| Node/Pod 丢失 | Fence 旧执行，从权威事实恢复或形成结构化失败 |
| 清理失败 | 断网、吊销凭据、标记 `QUARANTINED`，由 Janitor/Reconciler 重试 |
| 平台状态与实例不一致 | 以防止重复副作用和安全关闭为先幂等收敛 |

## 16. 可观测性与验收

管理后台在当前环境只读展示：两个独立 Host/Node 的 Desired/Effective Mapping、KVM/Kata/PCS Gate、EBM 或替代 ECS Mapping、Resource Profile/Unit、Active Lease、Queue、N+1 容量、CPU/Memory/Ephemeral 使用与峰值、Throttle/OOM/Eviction、Disk/Inode/GC、Network/Egress、Secret Lease 状态、Preview、Build Child、Drift、告警、Audit 和 Runbook。页面不得创建/删除/Drain Node、修改 Runtime/Profile/阈值或移动执行。

验收至少覆盖：

1. 两个 `sandbox-worker` 对应不同真实 Host，任一 Host 故障后剩余 Host 可承载完整 Unit Ceiling；
2. EBM 仅是 Region 未定时 Fallback，较小 ECS Mapping 必须以官方可用性和实机 PCS 证明；
3. Kata 启动失败不会降级到 `runc`、ACK `runV` 或其他 Runtime；
4. 两个 Requirement/Attempt 不能读取对方文件、Secret、网络或执行身份；
5. Agent 与 Build 在同一 Ledger 中分别原子占用 1/2 Units，不会超卖；
6. Parent 进入 `WAITING_CHILD` 后释放 Agent Lease，Child 完成后 Parent 可按原 Binding 恢复；
7. 默认拒绝公网，Model Search/Connector Egress 仅访问批准目标；
8. Secret 只以内存文件存在并在等待/终态立即吊销；
9. Node 或 Materialization 丢失后可从 Git、Checkpoint 和 Artifact 重建；
10. Jenkins 不出现在 Sandbox Port、状态机或平台 Gate 中；
11. 替换 Compute Provider、Runtime Adapter 或迁移独立 Sandbox Cluster不修改 Requirement Workflow。
