# Sandbox Runtime 详细说明

> 文档层级：L2 规范事实源
> 对应主文：[Sandbox Runtime](./sandbox-runtime.md)
> 实施阶段、激活状态和 Release 验收见 [12 实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)。

## 1. 责任边界与逻辑模型

本文是 Sandbox Environment、Kata/KVM 物理隔离、Materialization、资源、网络、短期 Secret、Preview、Image Build 与清理语义的唯一规范事实源。Requirement、WorkItem、Gate、Decision、`RequirementIntegrationBaselineSelection` 和业务状态只由 [Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md)拥有；`IntegrationBaselineEvidence` 只由 [Source Control 与交付](../05-source-control-delivery/source-control-delivery-detail.md)拥有；Run、Attempt、Execution Binding、Child 状态与等待语义只由 [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)拥有。

`SandboxEnvironment` 是 Requirement 级逻辑环境，关联 WorkItem Checkout、Service Binding、Preview 和可重建证据。`PlatformEnvironment` 是独立账号、VPC、Cluster 与控制平面的部署边界；它可承载多个 Workspace 和 Sandbox Environment，但不使它们共享数据面、凭据或网络可见性。逻辑环境不承诺保留 Pod、Guest、Node 或本地磁盘。

`SandboxMaterialization` 是一个 Agent Attempt 或 Image Build Child Execution 的一次独立 Kata Guest。它只由已固定的 Execution Binding、有效 Capacity Lease 和 Controller 创建；物理字段只能用于诊断，不能作为 Workflow 业务主键。

| 对象 | 规范职责 |
| --- | --- |
| `SandboxEnvironment` | Requirement 级稳定关联与环境生命周期元数据 |
| `SandboxMaterialization` | 一次独立、可销毁的 Kata 执行实例 |
| `SandboxCapacityLease` | 带 Generation/Fencing Token 的原子 Capacity Unit 占用 |
| `ResourceProfile` | CPU、Memory、Ephemeral Storage、Runtime Binding 与 Unit Weight |
| `RuntimeProfile` | Kata Guest、VMM、安全配置和不可变运行时 Artifact 引用 |
| `RepositoryCheckout` | WorkItem 的不可变 Repository Branch Binding 与固定 Commit |
| `SecretLease` | 当前执行所需短期凭据的引用与有效期 |
| `SandboxCheckpoint` | 恢复所需结构化状态与 Artifact 引用 |

代码与分支以 GitLab 为准，Checkpoint、日志、测试与构建证据以 Artifact Store 为准，业务对象与 Lease 以 Control Plane 为准。Sandbox 不保存这些事实的唯一副本。

### 1.1 正式 Agent Capability Activation Gate

正式 Agent Capability 只有在下列条件同时具备并形成当前 Platform Environment 的可验证证据后才能激活：

| Gate | 必须证明的 Contract |
| --- | --- |
| 独立物理 Host 与 KVM/Kata | 使用独立物理 Sandbox Host/服务器作为专用 `sandbox-worker`，不承载 Platform、Storage 或 Control Plane 工作负载；通过 KVM/Node Gate，并以独立 Kata Guest 运行。共享物理 Host 上的独立 Kubernetes Node 或 VM 仍是同机联调，只能标记为 `LAB_ONLY`。 |
| Resource 与 Capacity | CPU、Memory、Ephemeral Storage 的 Request/Limit、Pod Overhead、Capacity Ledger 与当前有效 Capacity Profile 的物理 Ceiling 全部可验证。 |
| Deadline 与 Fencing | Binding Deadline 有效；Lease、Generation、Fencing Token、取消、超时和旧实例副作用能够安全收敛。 |
| Repository、Network 与 Secret | 只挂载绑定分支，Network default-deny 后按 Binding 放行，短期 Secret 只注入 `tmpfs` 且可吊销。 |
| Fail Closed 与恢复 | 任一隔离、容量、凭据、证据或清理条件未知时拒绝物化或安全停止；只能从权威 Git、Checkpoint 与 Artifact 重建。 |

Release Gate 不替代本 Gate，路线图选中 Agent Capability 也不表示自动激活。Gate 通过只允许在批准的 Environment、Scope、Binding 与有效 Capacity Profile 内运行；边界变化必须重新验证。

## 2. KVM、Kata 与 Node Gate

正式 Sandbox 在当前 Platform Environment 的独立 Kubernetes Cluster 中使用专用 `sandbox-worker` Pool；每个可调度 `sandbox-worker` Node 必须映射到独立物理 Sandbox Host/服务器。该物理服务器可以承载多个 Kata Guest，但不得同时承载 Platform、Storage 或 Control Plane 工作负载。Pool 继续使用专用 Label、Taint、Admission 与 RuntimeClass 防止跨 Node Role 调度，但这些逻辑隔离不能替代物理服务器边界：在共享物理 Host 上划分独立 Kubernetes Node 或 VM 仍只能标记为 `LAB_ONLY`，不得成为正式 Agent Activation Gate 或 Release 验收证据。具体 Release 是否选择并验收正式 Sandbox 只由 [12 实施路线图详细说明](../12-implementation-roadmap/implementation-roadmap-detail.md)记录。

正式 Runtime 为社区 Kata Containers、`runtime-rs`、`containerd-shim-kata-v2`、QEMU/KVM 与独立 Guest Kernel。每个 Sandbox Pod 必须使用独立 Kata Guest，且 Kata Runtime 启动失败时不得回退至 `runc`、ACK `runV` 或其他普通容器/VMM Runtime。

Node 加入可调度 Pool 前，KVM Gate 必须验证 `/dev/kvm`、CPU virtualization、KVM module、`kata-runtime check`、Guest 创建/销毁、RuntimeClass、网络、CSI、MTU、性能、Reboot/Drain 与 Soak。任一 Gate 失败，Node 保持不可调度；Provider 的型号、Region、Zone、SKU 与验证证据是部署输入，不写入本领域的业务 Contract。

`sandbox-worker` 必须使用预烘焙的不可变 Node Image。Kata、QEMU、Guest Kernel、RootFS、virtiofsd 与 containerd 配置更新，只能通过新的 Image、Runtime Profile 和受控逐 Node 替换生效，禁止在运行 Node 上补装或漂移修改。

Agent 与 Builder 默认 Non-root，禁止 Privileged、Host Namespace、HostPath、Host Socket、Device 与 Kubernetes ServiceAccount Token；使用只读 RootFS、`no_new_privs`、RuntimeDefault seccomp 和 `capabilities.drop=[ALL]`。受签名、受 Policy 约束的 Tool Profile 只能增加最小能力，不能成为 Host 权限的别名。

## 3. Controller Materialization 与恢复

Sandbox Controller 是 Execution Binding 到 Kubernetes Materialization 的唯一 Materializer。它不得接受用户、Agent 或 Workflow 对 Node、RuntimeClass、Host、Resource 或 Secret 的临时覆盖。稳定 `SandboxPort` 仅提供：

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

Controller 接收 Agent owner 已授权的 `ProvisionMaterialization` 请求后，依次校验 Binding Deadline，原子取得 Lease，校验 Binding/Runtime/Network/Secret，创建 Kata Materialization、Checkout 固定分支与 Commit、注入短期凭据、应用 Tool Policy 并健康检查。准备成功返回 `MaterializationReady`；Deadline 已过、输入不可满足或基础设施条件未知时 Fail Closed，返回带原因和诊断引用的 `MaterializationBlocked` 或 `MaterializationFailed`。Attempt 的排队、重试和状态转换不属于本领域。

收到 Agent owner 的 `CheckpointAndRelease`、`HandoffToChild`、`FinalizeExecution` 或 `CancelExecution` 命令时，Controller 必须先持久化 Commit、Checkpoint、日志与 Artifact，Fence 仍可能产生副作用的实例，吊销 Secret，再释放 Lease 与销毁 Materialization，并回报可审计的清理结果。恢复是否使用原 Binding、何时重试或是否创建新 Attempt 只由 Agent/Workflow owner 决定。

Controller 使用 Execution ID、Generation、Fencing Token、唯一约束与 Reconciliation 防止重复启动。只有旧 Materialization、凭据与副作用已经停止或被 Fence 后才可回收 Lease；禁止以 Pod 数量推断容量。

## 4. Resource Profile、容量与有效 Profile

Resource Profile 是不可变的 `GITOPS_CONFIG`，已形成的 Binding 始终使用原 Profile。变更 Request/Limit、Unit Weight 或 Runtime Binding 必须创建新的 Profile ID、Digest 与 Capacity Profile Candidate；当前架构基线不向用户提供 Small/Large 自选规格。

| Profile | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | Unit |
| --- | --- | --- | --- | ---: |
| `resource/standard-v1` | `2 / 4 vCPU` | `6 / 8 GiB` | `30 / 50 GiB` | 1 |
| `resource/image-build-v1` | `4 / 8 vCPU` | `12 / 16 GiB` | `60 / 100 GiB` | 2 |

资源向量覆盖同一 Materialization 内 Agent/Builder、Init、Tool、Sidecar、Writable Layer、`emptyDir` 与受计量日志；Kata Pod Overhead、DaemonSet、OS/Kubernetes Reserved、镜像缓存和基础设施余量必须另行纳入 Capacity Profile，不得从执行预算偷扣。Capacity Unit 不是 Pod 数、CPU 时间、计费单位或用户配额。

Agent Attempt 与 Image Build 共享同一个 Fencing Domain 和 Capacity Ledger。一次请求必须原子取得完整 Unit；产品并发限制、剩余 Unit、完整资源向量、Node Placement、Kata Gate、Runtime Disk 与安全余量任一不足时，Controller 拒绝 Lease 并返回 `CAPACITY_UNAVAILABLE` 及结构化维度。它不排队、不抢占、不超卖，也不临时扩大配额；排队和后续动作由 Agent owner 决定。

### 4.1 Platform Policy 准入 Gate

Sandbox 先分别应用两个独立、版本化的 `PLATFORM_POLICY`，再执行共享 Capacity Ledger 与物理安全 Gate：

| Policy Key | Minimum | Maximum | 准入 Contract |
| --- | ---: | --- | --- |
| `agent.sandbox.active_attempt_limit` | `1` | 当前有效 Capacity Profile 的 `maxActiveSandboxAttempts` | 限制当前 Platform Environment 中同时持有 Agent Sandbox Lease 的 Attempt 数。达到上限时拒绝后续 Agent Lease，并返回包含 Policy Version 的 `POLICY_LIMIT_REACHED`。 |
| `agent.image_build.active_build_limit` | `0` | 当前有效 Capacity Profile 的 `maxActiveImageBuilds` | 限制当前 Platform Environment 中同时持有 Build Lease 的 Child 数及新 Build Handoff。值为 `0` 时拒绝新 Build Handoff，并返回包含 Policy Version 的 `POLICY_DISABLED`。 |

下调任一 Policy 只阻止后续 Lease 或 Handoff 并等待占用自然收敛，不撤销既有 Lease、不强杀已持有 Build Lease 的 Child，也不改写 Execution Binding。Build Limit 生效为 `0` 时，已完成 Handoff 但尚未取得 Build Lease 的排队 Child 必须收到 `POLICY_DISABLED`；[03 owner](../03-agent-skill-model/agent-skill-model-detail.md)将其收敛为 `CANCELED/POLICY_DISABLED` 结构化终态并唤醒 Parent，不能无限等待 Policy 恢复。两个 Key 彼此独立；任何准入还必须同时满足共享 Capacity Ledger、绑定 Resource Profile 的完整 Resource Vector、Placement、Kata Gate、Runtime Disk 与当前有效 Capacity Profile 的安全边界。业务配置不能扩大或突破物理 Capacity Envelope。

两个 Policy 的 Key、Minimum 与准入效果由本文拥有；有效值与物理 Maximum 必须读取 [12 当前选择的 Capacity Profile](../12-implementation-roadmap/implementation-roadmap-detail.md)，并受[基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)对该 Profile 已验证 Ceiling 的约束。Policy 发布与配置生命周期由 [Configuration Governance](../10-configuration-governance/configuration-governance-detail.md)拥有；发布权限与 Super Admin 边界由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有。Sandbox 只消费已生效的 Policy Snapshot，不复制配置工作流或 Profile 数值。

Sandbox N+1 是 Hardened Target Profile 的可靠性目标：任一个 `sandbox-worker` Host 失效后，剩余故障域仍能承载该 Profile 获准的全部 Unit 组合。Launch Profile 不无条件承诺 N+1；Host 故障时必须 Fence 旧执行、拒绝超出剩余已验证容量的新 Lease，并从权威 Git、Checkpoint 与 Artifact 恢复或安全结束。Node 数、每环境 Ceiling、磁盘容量和总容量只由[环境容量与服务器规划](../12-implementation-roadmap/environment-capacity-plan.md)定义；Provider Mapping、通用物理拓扑和准入验证由[基础设施与运维](../09-infrastructure-operations/infrastructure-operations-detail.md)拥有。本领域仅消费 12 为当前阶段选择的有效 Capacity Profile。

每个 Node 的 Runtime/Ephemeral 磁盘只存可再生 Checkout、缓存、中间文件、Writable Layer 与有界临时日志，不提供备份或跨 Node 恢复承诺。CPU 达到 Limit 时 Throttle；Memory 无 Swap，OOM 形成 `RESOURCE_EXHAUSTED/MEMORY`；Ephemeral Limit、DiskPressure、Eviction、Inode 或写满风险形成 `RESOURCE_EXHAUSTED/EPHEMERAL_STORAGE`。新 Lease 的磁盘投影不安全时返回 `CAPACITY_UNAVAILABLE`，Node 丢失只能从 Git、Checkpoint 和 Artifact 重建。

## 5. Repository、网络与 Secret

Controller 仅按 Execution Binding 挂载当前 Requirement 的 WorkItem Checkout。每个 Checkout 固定 `repositoryId + branchName + baseCommitSha`；Agent 只能写自己的任务分支，同一 Repository Branch 同时最多一个写执行。Execution Binding 语义由 [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)拥有；分支创建、保护、MR 和外部 GitLab 对账由 [Source Control 与交付](../05-source-control-delivery/source-control-delivery-detail.md)拥有。

Agent 产生的有效代码必须 Commit 并 Push 到当前 `RepositoryBranchBinding` 的任务分支；测试和 Review 以固定 Commit 创建只读 Materialization，Formal MR 只能使用 GitLab 中的 Commit/`headSha`，不能依赖 Sandbox 本地快照。Controller 收到等待、结束、取消或清理命令后，在确认销毁前必须把仍需保留但尚未提交的状态固化为受控 Patch/Checkpoint Artifact。恢复以 Git Commit 为主、Patch/Checkpoint 为辅，不得依赖旧 Pod、Node、本地目录或 Runtime Disk。

Sandbox 使用 NetworkPolicy 默认拒绝东西向和公网 Egress，只按 Binding 放行：当前 GitLab Source/Registry、批准依赖源与镜像源、Artifact Store、Model Gateway、必要平台 API、明确批准的测试服务或 Connector Endpoint。Sandbox 不能访问生产域名、生产数据库、NATS、Kubernetes API、Cloud Metadata/Admin API、其他环境或其他 Attempt。

Deployment 原生 Model Search Capability 与批准的 Search Connector 是独立受控路径，均不代表 Sandbox 获得任意 DNS、IP、HTTP Proxy 或公网出口。依赖源故障仅可使用已验证缓存或有界重试，不能关闭 NetworkPolicy 或扩大 Egress。

OpenBao 保存 Secret 与 Lease 事实；Agent Injector 将当前执行的短期 Secret 写入 Pod `tmpfs` 内存文件。Secret Lease 必须绑定 Platform Environment、Attempt/Build、Repository/Branch、Tool、Scope 与有效期。禁止写入 Deployment YAML、Environment Variable、镜像、代码、Commit、Prompt、日志、Trace、Artifact、Cache 或持久磁盘；收到释放、结束、取消、归档或删除的清理命令即刻吊销。

## 6. Preview 与 Image Build

Preview 是受保护的稳定访问引用，而不是 Pod 地址。浏览器应用使用 URL Preview；其他运行形态可由受控 Adapter 产出构建 Artifact、二维码或远程设备入口。Preview Gateway 在每次访问校验当前平台 Session、Capability、Scope、Workspace Membership 与 Requirement 访问权，并支持到期、撤销和审计。

Image Build 不是普通 Agent Container 内的 Privileged 操作。Parent 通过稳定 Idempotency Key 创建独立 Child Build Execution，且必须先固化 Checkpoint、日志和 Artifact，销毁自己的 Materialization、吊销 Secret 并释放 Agent Lease。只有能够证明 Parent Lease 已释放时，Child 才能取得自己的 Build Lease。

Child 使用独立 Kata Materialization、Rootless BuildKit、Binding、Credential、Workspace 和 Fencing Token；收到其结束或取消清理命令时，先固化 Image Digest、SBOM、Provenance、扫描结果、日志与结构化结果，再释放资源。Child Handoff 成功后 Parent 不持有 Unit、不共享本地目录或凭据；同一 Parent 同时最多一个活动 Child，故障恢复前必须 Fence 旧 Builder。Parent/Child 的状态与后续调度由 Agent owner 定义。

当 [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md)确认 Child Lease 可以安全释放并请求创建 `ParentContinuationReservation` 时，Sandbox 必须在同一个 fenced、幂等的 Capacity Ledger 提交中释放 Child Lease，并按 Parent 原 Execution Binding 所绑定 Resource Profile 的 Unit Weight 物化 Reservation；不得为 Continuation 另设 Unit 默认值。收到 03 owner 的释放请求时，Sandbox 在同一账本语义下释放 Reservation，并通过 Reconciliation 收敛。

Sandbox 只拥有 Child Lease 与 Reservation 在 Capacity Ledger 中的原子物化、释放和 Fencing。Parent 是否仍有效、Continuation Queue 的优先级、Reservation TTL 与失效语义均由 03 owner 定义；Reservation 也不绕过 `agent.sandbox.active_attempt_limit`、完整 Resource Vector、Placement、Kata、Runtime Disk、当前有效 Capacity Profile 或其他物理准入 Gate。

## 7. 失败、清理与外部边界

| 场景 | Sandbox 处理 |
| --- | --- |
| KVM/Kata/PCS Gate 失败 | Node 不可调度；返回结构化物化失败，绝不降级 Runtime |
| Provision 失败 | Fence 未完成实例、吊销 Secret、保留诊断并有界重试 |
| Capacity、Placement 或磁盘不足 | 拒绝 Lease，返回 `CAPACITY_UNAVAILABLE` 与可处置阻塞原因 |
| Agent 或 Build Policy Gate 拒绝 | 返回 `POLICY_LIMIT_REACHED` 或 `POLICY_DISABLED` 及 Policy Version，不撤销既有 Lease |
| Egress/依赖/Connector 被拒绝或不可用 | 使用允许的缓存/重试，绝不扩大权限或网络 |
| Node 或 Materialization 丢失 | Fence 旧执行，从权威 Git、Checkpoint、Artifact 重建或结构化失败 |
| 清理失败 | 先断网、吊销凭据、标记隔离，由 Janitor/Reconciler 幂等清理 |
| 控制面与实例不一致 | 以防止重复副作用和安全关闭为先收敛 |

需持久化的执行证据包括固定 Commit、测试输出、Preview 元数据、Tool/Egress 记录、Template/Runtime/Profile Digest、资源峰值、失败诊断、Checkpoint/Patch、Image Digest、SBOM/Provenance 与校验 Hash。审计、保留和访问规则由[安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)拥有。

Jenkins 是用户在独立外部平台手工触发、查看和处置的系统。Sandbox 不调用 Jenkins、不接收 Jenkins Webhook、不读取或投影 Jenkins 状态，也不把 Jenkins 建模为 Sandbox Child、Runtime 或系统 Gate。
