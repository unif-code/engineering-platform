# Sandbox Runtime

> 实施阶段、激活状态和 Release 验收见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

Sandbox Runtime 为 Agent Attempt 和 Image Build 提供隔离、可重建、可审计的执行环境。它把 Requirement 级逻辑 Sandbox Environment 与短生命周期的物理 Materialization 分开，并通过稳定 `SandboxPort` 隔离 Workflow、Agent Runtime 与 Kubernetes、Kata、Compute Provider 的实现；本文定义 Sandbox Environment、Kata/KVM 物理隔离、Materialization、Capacity Lease 与账本、资源准入、网络、短期 Secret、Preview、Image Build 与清理语义。

它不拥有 Requirement、WorkItem、Gate、Decision 或 Attempt 的业务状态，也不保存代码、Artifact、Audit 或 Secret 的权威事实；这些分别属于 [Requirement Workflow](./02-requirement-workflow.md)、[Agent、Skill 与 Model](./03-agent-skill-model.md)、[Source Control 与交付](./05-source-control-delivery.md)、[数据、消息与存储](./07-data-messaging-storage.md) 与 [安全、审计与治理](./08-security-audit-governance.md) 的 Contract。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：资源向量与 Unit 权重见[参数附录](./appendix-parameters.md#resource-profile)，准入 Policy Key、Minimum 与物理 Maximum 见[参数附录](./appendix-parameters.md#platform-policy-key)，结构化原因码见[参数附录的错误码](./appendix-parameters.md#错误码)，`SandboxPort` 方法清单见[参数附录](./appendix-parameters.md#port-方法清单)，Runtime 组件与 KVM Gate 验证项见[参数附录](./appendix-parameters.md#runtime-组件清单)，Node 数、每环境 Ceiling 与磁盘容量见[参数附录的容量规划](./appendix-parameters.md#容量与服务器规划)。

## 核心模型

### 逻辑环境、物化与对象

`SandboxEnvironment` 是 Requirement 级逻辑环境，关联 WorkItem Checkout、Service Binding、Preview 和可重建证据。`PlatformEnvironment` 是独立账号、VPC、Cluster 与控制平面的部署边界；它可承载多个 Workspace 和 Sandbox Environment，但不使它们共享数据面、凭据或网络可见性。逻辑环境不承诺保留 Pod、Guest、Node 或本地磁盘。`SandboxMaterialization` 是一个 Agent Attempt 或 Image Build Child Execution 的一次独立 Kata Guest。

```text
Requirement Sandbox Environment
├── WorkItem checkout / service binding / Preview
├── Agent Attempt → Kata Materialization
└── Image Build Child Execution → 独立 Kata Materialization
```

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

代码与分支以 GitLab 为准，Checkpoint、日志、测试与构建证据以 Artifact Store 为准，业务对象与 Lease 以 Control Plane 为准；Sandbox 不是这些事实的权威保存方。

### 正式 Agent Capability Activation Gate

正式 Agent Capability 只有在下列条件同时具备并形成当前 Platform Environment 的可验证证据后才能激活：

| Gate | 必须证明的 Contract |
| --- | --- |
| 独立物理 Host 与 KVM/Kata | 使用独立物理 Sandbox Host/服务器作为专用 `sandbox-worker`，不承载 Platform、Storage 或 Control Plane 工作负载；通过 KVM/Node Gate，并以独立 Kata Guest 运行。共享物理 Host 上的独立 Kubernetes Node 或 VM 仍是同机联调，只能标记为 `LAB_ONLY`。 |
| Resource 与 Capacity | CPU、Memory、Ephemeral Storage 的 Request/Limit、Pod Overhead、Capacity Ledger 与当前有效 Capacity Profile 的物理 Ceiling 全部可验证。 |
| Deadline 与 Fencing | Binding Deadline 有效；Lease、Generation、Fencing Token、取消、超时和旧实例副作用能够安全收敛。 |
| Repository、Network 与 Secret | 只挂载绑定分支，Network default-deny 后按 Binding 放行，短期 Secret 只注入 `tmpfs` 且可吊销，Source Control 与 Registry 写凭据不入 Guest。 |
| Fail Closed 与恢复 | 任一隔离、容量、凭据、证据或清理条件未知时拒绝物化或安全停止；只能从权威 Git、Checkpoint 与 Artifact 重建。 |

Release Gate 不替代本 Gate，路线图选中 Agent Capability 也不表示自动激活。Gate 通过只允许在批准的 Environment、Scope、Binding 与有效 Capacity Profile 内运行；边界变化必须重新验证。

### 失败与清理处置

下表是本领域对失败与清理的处置语义，其结构化原因码见[参数附录的错误码](./appendix-parameters.md#错误码)：

| 场景 | Sandbox 处理 |
| --- | --- |
| KVM/Kata/PCS Gate 失败 | Node 不可调度；返回结构化物化失败，绝不降级 Runtime |
| Provision 失败 | Fence 未完成实例、吊销 Secret、保留诊断并有界重试 |
| Capacity、Placement 或磁盘不足 | 拒绝 Lease，返回结构化容量原因与可处置的阻塞维度 |
| Agent 或 Build Policy Gate 拒绝 | 返回带 Policy Version 的结构化准入原因，不撤销既有 Lease |
| Egress、依赖或 Connector 被拒绝或不可用 | 使用允许的缓存或有界重试，绝不扩大权限或网络 |
| Node 或 Materialization 丢失 | Fence 旧执行，从权威 Git、Checkpoint、Artifact 重建或结构化失败 |
| 清理失败 | 先断网、吊销凭据、标记隔离，由 Janitor/Reconciler 幂等清理 |
| 控制面与实例不一致 | 以防止重复副作用和安全关闭为先收敛 |

## 关键不变量

- `SandboxMaterialization` 仅由已固定的 Execution Binding、有效 Capacity Lease 与 Sandbox Controller 创建，其物理字段只能用于诊断，不能作为 Workflow 业务主键——物理实例是可销毁资源，把它当业务标识会让业务事实随实例消失。
- 逻辑 Sandbox Environment 不能成为可写执行实例的别名；不同 Attempt、Child 或 Workspace 不共享可写目录、执行身份或短期 Secret——共享任何一项都会让隔离退化为约定。
- 正式 Sandbox 使用专用 `sandbox-worker` Pool，每个可调度 Node 必须映射到独立物理 Sandbox Host；该物理服务器可承载多个 Kata Guest，但不得同时承载 Platform、Storage 或 Control Plane 工作负载。Pool 的专用 Label、Taint、Admission 与 RuntimeClass 只防止跨 Node Role 调度，不能替代物理服务器边界：共享物理 Host 上划分的独立 Kubernetes Node 或 VM 仍只能标记为 `LAB_ONLY`，不得成为正式 Agent Activation Gate 或 Release 验收证据——逻辑隔离无法阻断同机侧信道与故障域耦合。
- 每个 Sandbox Pod 必须使用独立 Kata Guest，Kata 启动失败时绝不回退至 `runc`、ACK `runV` 或其他普通容器/VMM Runtime（正式 Runtime 组件见[参数附录](./appendix-parameters.md#runtime-组件清单)）——隔离保证优先于可用性。
- Node 加入可调度 Pool 前必须通过 KVM Gate 的全部验证项（验证项清单见[参数附录](./appendix-parameters.md#runtime-组件清单)），任一项失败则 Node 保持不可调度；Provider 的型号、Region、Zone、SKU 与验证证据是部署输入，不写入本领域的业务 Contract——未验证的 Host 不得承载隔离执行，Provider 细节也不应固化进领域语义。
- `sandbox-worker` 必须使用预烘焙的不可变 Node Image，Runtime 组件及其配置的更新只能通过新的 Image、Runtime Profile 与受控逐 Node 替换生效，禁止在运行 Node 上补装或漂移修改——隔离保证只能由可验证、可回退的镜像事实支撑。
- Agent 与 Builder 默认 Non-root，禁止 Privileged、Host Namespace、HostPath、Host Socket、Device 与 Kubernetes ServiceAccount Token，并使用只读 RootFS、`no_new_privs`、RuntimeDefault seccomp 与 `capabilities.drop=[ALL]`；受签名、受 Policy 约束的 Tool Profile 只能增加最小能力，不能成为 Host 权限的别名——Sandbox 内的代码始终按不可信处理。
- Sandbox Controller 是 Execution Binding 到 Kubernetes Materialization 的唯一 Materializer，不得接受用户、Agent 或 Workflow 对 Node、RuntimeClass、Host、Resource 或 Secret 的临时覆盖，对外只暴露稳定 `SandboxPort`（方法清单见[参数附录](./appendix-parameters.md#port-方法清单)）——单一物化路径是隔离、容量与审计能同时成立的前提。
- Controller 收到已授权的 `ProvisionMaterialization` 后依次校验 Binding Deadline、原子取得 Lease、校验 Binding/Runtime/Network/Secret、创建 Kata Materialization、Checkout 固定分支与 Commit、注入短期凭据、应用 Tool Policy 并健康检查；准备成功返回 `MaterializationReady`，Deadline 已过、输入不可满足或基础设施条件未知时 Fail Closed 并返回带原因与诊断引用的 `MaterializationBlocked` 或 `MaterializationFailed`，Attempt 的排队、重试与状态转换不属于本领域——条件未知时拒绝物化比冒险启动更安全。
- 收到 `CheckpointAndRelease`、`HandoffToChild`、`FinalizeExecution` 或 `CancelExecution` 时，Controller 必须先持久化 Commit、Checkpoint、日志与 Artifact，Fence 仍可能产生副作用的实例，吊销 Secret，再释放 Lease 与销毁 Materialization，并回报可审计的清理结果；恢复是否使用原 Binding、何时重试或是否创建新 Attempt 由 Agent/Workflow owner 决定——统一清理顺序保证证据先落地、副作用后消失。
- Controller 使用 Execution ID、Generation、Fencing Token、唯一约束与 Reconciliation 防止重复启动；只有旧 Materialization、凭据与副作用已停止或被 Fence 后才可回收 Lease，禁止以 Pod 数量推断容量——被 Fence 之前回收容量等于允许两个实例同时写同一分支。
- Resource Profile 是不可变的 `GITOPS_CONFIG`，已形成的 Binding 始终使用原 Profile；变更 Request/Limit、Unit Weight 或 Runtime Binding 必须创建新的 Profile ID、Digest 与 Capacity Profile Candidate，当前架构基线不向用户提供 Small/Large 自选规格（资源向量与 Unit 权重见[参数附录](./appendix-parameters.md#resource-profile)）——用户可选规格会把容量准入变成可协商项。
- 资源向量必须覆盖同一 Materialization 内的 Agent/Builder、Init、Tool、Sidecar、Writable Layer、`emptyDir` 与受计量日志；Kata Pod Overhead、DaemonSet、OS/Kubernetes Reserved、镜像缓存与基础设施余量必须另行纳入 Capacity Profile，不得从执行预算偷扣；Capacity Unit 不是 Pod 数、CPU 时间、计费单位或用户配额——预算口径不完整时容量 Gate 会在真实峰值下失效。
- Agent Attempt 与 Image Build 共享同一个 Fencing Domain 与 Capacity Ledger，一次请求必须原子取得完整 Unit；产品并发限制、剩余 Unit、完整资源向量、Node Placement、Kata Gate、Runtime Disk 与安全余量任一不足时，Controller 拒绝 Lease 并返回结构化的容量原因与维度，不排队、不抢占、不超卖，也不临时扩大配额，排队与后续动作由 Agent owner 决定——账本必须是硬边界，否则并发上限只是建议值。
- Sandbox 先分别应用两个独立、版本化的 `PLATFORM_POLICY`（Agent Sandbox 并发上限与 Image Build 并发上限），再执行共享 Capacity Ledger 与物理安全 Gate；达到 Agent 上限时拒绝后续 Agent Lease，Build 上限生效为不允许新 Build 时拒绝新 Build Handoff，两类拒绝都返回包含 Policy Version 的结构化原因（Key 与取值见[参数附录](./appendix-parameters.md#platform-policy-key)）——业务并发是可治理配置，物理安全 Gate 是不可协商底线，两者必须分层判定。
- 下调任一 Policy 只阻止后续 Lease 或 Handoff 并等待占用自然收敛，不撤销既有 Lease、不强杀已持有 Build Lease 的 Child，也不改写 Execution Binding；已完成 Handoff 但尚未取得 Build Lease 的排队 Child 必须收到对应的结构化拒绝原因，并由 [Agent、Skill 与 Model](./03-agent-skill-model.md) 收敛为终态并唤醒 Parent——配置变更不应变成对运行中执行的强制中断，但等待中的请求必须有确定结果。
- 两个 Policy Key 彼此独立，任何准入还必须同时满足共享 Capacity Ledger、绑定 Resource Profile 的完整 Resource Vector、Placement、Kata Gate、Runtime Disk 与当前有效 Capacity Profile 的安全边界；业务配置不能扩大或突破物理 Capacity Envelope，Sandbox 只消费已生效的 Policy Snapshot，不复制配置工作流、发布权限或 Profile 数值（Policy 发布生命周期属于 [Configuration Governance](./10-configuration-governance.md)，发布资格与 Super Admin 边界属于[身份、组织与授权](./01-identity-organization-authorization.md)）——配置面与物理面各自独立收紧，才不会互相放宽。
- Sandbox N+1 是 Hardened Target Profile 的可靠性目标：任一 `sandbox-worker` Host 失效后，剩余故障域仍能承载该 Profile 获准的全部 Unit 组合；Launch Profile 不无条件承诺 N+1，Host 故障时必须 Fence 旧执行、拒绝超出剩余已验证容量的新 Lease，并从权威 Git、Checkpoint 与 Artifact 恢复或安全结束——没有实测证据的冗余承诺会在故障当天失效。
- 每个 Node 的 Runtime/Ephemeral 磁盘只存可再生的 Checkout、缓存、中间文件、Writable Layer 与有界临时日志，不提供备份或跨 Node 恢复承诺；CPU 达到 Limit 时 Throttle，Memory 无 Swap 且 OOM 与 Ephemeral 超限分别形成对应维度的资源耗尽终止，新 Lease 的磁盘投影不安全时拒绝 Lease，Node 丢失只能从 Git、Checkpoint 与 Artifact 重建——本地磁盘是缓存而不是存储，它的容量风险必须在准入时就拦住。
- Controller 仅按 Execution Binding 挂载当前 Requirement 的 WorkItem Checkout，每个 Checkout 固定 `repositoryId + branchName + baseCommitSha`；Agent 只能写自己的任务分支，同一 Repository Branch 同时最多一个写执行——并行写同一分支会产生无法归属的交付事实。
- Agent 产生的有效代码必须 Commit 并 Push 到当前 `RepositoryBranchBinding` 的任务分支；测试与 Review 以固定 Commit 创建只读 Materialization，Formal MR 只能使用 GitLab 中的 Commit/`headSha` 而不能依赖 Sandbox 本地快照；Controller 在确认销毁前必须把仍需保留却尚未提交的状态固化为受控 Patch/Checkpoint Artifact，恢复以 Git Commit 为主、Patch/Checkpoint 为辅，不得依赖旧 Pod、Node、本地目录或 Runtime Disk——权威代码在 GitLab，本地状态随时可能消失。
- Sandbox 的 NetworkPolicy 默认拒绝东西向与公网 Egress，只按 Binding 放行当前 GitLab Source/Registry、批准的依赖源与镜像源、Artifact Store、Model Gateway、必要平台 API 以及明确批准的测试服务或 Connector Endpoint；Sandbox 不能访问生产域名、生产数据库、NATS、Kubernetes API、Cloud Metadata/Admin API、其他环境或其他 Attempt——default-deny 是唯一能随 Binding 精确收紧的网络姿态。
- Deployment 原生的 Model Search Capability 与批准的 Search Connector 是独立受控路径，都不代表 Sandbox 获得任意 DNS、IP、HTTP Proxy 或公网出口；依赖源故障时只可使用已验证缓存或有界重试，不能关闭 NetworkPolicy 或扩大 Egress——可用性压力不能成为打开出口的理由。
- OpenBao 保存 Secret 与 Lease 事实，Agent Injector 只把当前执行的短期 Secret 写入 Pod `tmpfs` 内存文件；Secret Lease 必须绑定 Platform Environment、Attempt/Build、Repository/Branch、Tool、Scope 与有效期，禁止写入 Deployment YAML、Environment Variable、镜像、代码、Commit、Prompt、日志、Trace、Artifact、Cache 或持久磁盘，收到释放、结束、取消、归档或删除的清理命令即刻吊销；Source Control 的任务分支写凭据与 Registry 推送凭据都不注入 Guest，Git Push 经 Guest 外的 Credential Broker（Contract 见 [05](./05-source-control-delivery.md)）、镜像 Push 经 Guest 外的 Registry Broker（经 `ContainerRegistryPort` 的 Adapter 承担）完成——落盘或落日志的凭据无法被吊销，进入不可信执行面的写凭据等于交出交付事实。
- Preview 是受保护的稳定访问引用而不是 Pod 地址：浏览器应用使用 URL Preview，其他运行形态可由受控 Adapter 产出构建 Artifact、二维码或远程设备入口；Preview Gateway 在每次访问校验当前平台 Session、Capability、Scope、Workspace Membership 与 Requirement 访问权，并支持到期、撤销与审计——Preview 是一个受授权的平台入口，不是可分享的网络地址。
- Image Build 不是普通 Agent Container 内的 Privileged 操作：Parent 通过稳定 Idempotency Key 创建独立 Child Build Execution，并必须按统一清理顺序先固化 Checkpoint、日志与 Artifact，Fence 并吊销 Secret，再销毁自己的 Materialization 并释放 Agent Lease；只有能够证明 Parent Lease 已释放时，Child 才能取得自己的 Build Lease——特权构建会击穿 Sandbox 隔离，父子同时持有容量会突破已验证 Ceiling。
- Child 使用独立 Kata Materialization、Rootless BuildKit、Binding、Credential、Workspace 与 Fencing Token，收到结束或取消清理命令时先固化 Image Digest、SBOM、Provenance、扫描结果、日志与结构化结果再释放资源；Child 在 Guest 内只持有只读拉取凭据，镜像 Push 由 Guest 外 Registry Broker 以绑定 Child Execution、目标 Repository/Tag 与镜像 Digest 的单次用途凭据代理执行并记入 Effect Ledger；Handoff 成功后 Parent 不持有 Unit、不共享本地目录或凭据，同一 Parent 同时最多一个活动 Child，故障恢复前必须 Fence 旧 Builder，Parent/Child 的状态与后续调度由 Agent owner 定义——构建证据必须先落地，旧 Builder 必须先失效。
- 当 [Agent、Skill 与 Model](./03-agent-skill-model.md) 确认 Child Lease 可安全释放并请求创建 `ParentContinuationReservation` 时，Sandbox 必须在同一个 fenced、幂等的 Capacity Ledger 提交中释放 Child Lease，并按 Parent 原 Execution Binding 所绑定 Resource Profile 的 Unit Weight 物化 Reservation，不得为 Continuation 另设 Unit 默认值；收到释放请求时在同一账本语义下释放 Reservation 并通过 Reconciliation 收敛——释放与预留必须是一次原子账本事实，否则容量会凭空出现或消失。
- Reservation 不绕过 Agent Sandbox 并发上限 Policy、完整 Resource Vector、Placement、Kata Gate、Runtime Disk、当前有效 Capacity Profile 或其他物理准入 Gate——优先恢复只改变排序，不改变准入。
- 需持久化的执行证据包括固定 Commit、测试输出、Preview 元数据、Tool/Egress 记录、Template/Runtime/Profile Digest、资源峰值、失败诊断、Checkpoint/Patch、Image Digest、SBOM/Provenance 与校验 Hash——实例可以销毁，但销毁前必须留下足以复盘与追责的证据。
- Jenkins 是用户在独立外部平台手工触发、查看与处置的系统：Sandbox 不调用 Jenkins、不接收其 Webhook、不读取或投影其状态，也不把它建模为 Sandbox Child、Runtime 或系统 Gate——外部手工系统不能成为平台隔离链路的一环。

## 与其他模块的关系

下表是本模块自身视角：04 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链中受控执行的隔离资源语义 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | Sandbox 准入 Policy 等受保护配置命令的发布资格与 Super Admin 边界 | — |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement/WorkItem 的稳定标识与业务终止、归档、删除命令 | Requirement 级 Sandbox Environment、Preview 引用与可重建证据 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 不可变 Execution Binding、Attempt/Child 状态与等待语义、Continuation Queue 优先级与 Reservation TTL、`ParentContinuationReservation` 的创建与释放请求 | 隔离物化、Capacity Lease 与 Fencing、资源准入、网络、Preview、清理与恢复结果 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | `RepositoryBranchBinding`、分支创建与保护、MR 与 GitLab 外部对账 | 固定 Checkout 的挂载与写执行边界、Sandbox 内 Commit/Push 的清理与 Fence 事实 |
| [06 平台应用与集成](./06-platform-application-integration.md) | 平台应用入口、API 集成边界与稳定 Port/Adapter 装配 | `SandboxPort` 契约与 Preview Gateway 的访问校验要求 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | Artifact 对象与 Checkpoint、日志、构建证据的存储 Contract | 需持久化的执行证据及其校验 Hash |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Secret 与 Lease 事实、`tmpfs` 注入、供应链与扫描机制、Audit 保留与访问规则 | 本领域的 Audit Trigger（物化、Lease、Fence、凭据吊销、清理结果）与业务摘要 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Node Role、物理放置、已验证的 Aggregate Physical Ceiling、Provider Mapping 与准入验证方法 | 隔离执行对 Node、RuntimeClass、网络与磁盘的 Contract 要求 |
| [10 Configuration Governance](./10-configuration-governance.md) | 准入 Policy 与 Resource/Runtime Profile 的 Draft、发布、回滚与 Effective Snapshot 生命周期 | Sandbox Namespace 的 Schema、Policy Key、Minimum 与准入效果 |
| [12 实施路线图](./12-implementation-roadmap.md) | 当前阶段选定的有效 Capacity Profile，以及正式 Sandbox 的 Release 选择与验收记录 | Activation Gate 必须证明的 Contract，供 Release Gate 引用 |
| [参数附录](./appendix-parameters.md) | 资源向量与 Unit 权重、准入 Policy Key、错误码、`SandboxPort` 方法清单、Runtime 组件与容量规划数值 | 本文正文中的定性规则 |
