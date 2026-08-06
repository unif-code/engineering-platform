# Sandbox Runtime

> 文档层级：L1 运行地图
> 规范事实源：[Sandbox Runtime 详细说明](./sandbox-runtime-detail.md)

## 目标与边界

Sandbox Runtime 为 Agent Attempt 和 Image Build 提供隔离、可重建、可审计的执行环境。它把逻辑 Sandbox Environment 与短生命周期的物理 Materialization 分开，并通过稳定 `SandboxPort` 隔离 Workflow、Agent Runtime 与 Kubernetes、Kata 和 Compute Provider 的实现。

它不拥有 Requirement、WorkItem、Gate、Decision 或 Attempt 的业务状态；这些由 [Requirement Workflow](../02-requirement-workflow/requirement-workflow-detail.md) 和 [Agent、Skill 与 Model](../03-agent-skill-model/agent-skill-model-detail.md) 定义。它也不保存代码、Artifact、Audit 或 Secret 的唯一事实，分别依赖 [Source Control 与交付](../05-source-control-delivery/source-control-delivery-detail.md)、[数据、消息与存储](../07-data-messaging-storage/data-messaging-storage-detail.md) 和 [安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md) 的 Contract。

## 逻辑环境与物化

一个 Requirement 对应一个逻辑 Sandbox Environment，它关联当前 WorkItem 的固定分支、服务、Preview 与可恢复证据；它不是长期运行的 Pod 或 VM。每个持有有效 Capacity Lease 的 Agent Attempt 或 Image Build 都创建独立的 Kata Materialization，等待、终态或安全清理后即销毁。

```text
Requirement Sandbox Environment
├── WorkItem checkout / service binding / Preview
├── Agent Attempt → Kata Materialization
└── Image Build Child Execution → 独立 Kata Materialization
```

物理实例丢失后，代码从 GitLab、Checkpoint 与证据从 Artifact Store、执行绑定与 Lease 从 Control Plane 重建；任何 Attempt 均不依赖旧 Node、本地磁盘或 Pod 身份恢复。

## 隔离、容量与生命周期

每个 Platform Environment 在独立 Kubernetes Cluster 中运行专用 `sandbox-worker` Pool。Sandbox 使用社区 Kata Containers 的 `runtime-rs` 和 QEMU/KVM；一个 Pod 对应一个独立 Guest，Kata 启动失败绝不降级为普通容器 Runtime。

Execution Binding 固定 Resource Profile、Runtime、Network、Secret、Repository Branch 与权限。Sandbox Controller 接收 Agent owner 发出的已授权物化请求，原子申请带 Fencing Token 的 Capacity Lease，并返回 `MaterializationReady`、结构化 `MaterializationBlocked` 或 `MaterializationFailed`；它不决定 Attempt 如何排队或转换。收到挂起、Child Handoff、结束或取消的物理清理命令时，Controller 固化事实、Fence 副作用、吊销凭据、释放 Lease 并销毁 Materialization。

Agent 与 Build 共享同一 Capacity Ledger，并分别受独立的版本化 Platform Policy 准入；Resource Profile、Capacity Unit、Policy Gate 与 `ParentContinuationReservation` 的物理账本 Contract 由[详细说明](./sandbox-runtime-detail.md)拥有。Build 是 Parent Attempt 的独立 Child Execution，Child 物化前必须完成 Parent 的物理资源交接。具体 Node、环境默认值、Ceiling 与基础设施容量由[基础设施与运维](../09-infrastructure-operations/infrastructure-operations.md)拥有。

## 网络、Secret、Preview 与镜像构建

Sandbox 默认拒绝东西向和公网 Egress，仅按 Binding 放行 GitLab、批准依赖源、Model Gateway、Artifact Store 与批准 Connector 目标。搜索通过 Model Search Capability 或受控 Search Connector，不等价于 Sandbox 任意联网。

短期 Secret 由 OpenBao 注入 `tmpfs` 内存文件，禁止进入环境变量、镜像、代码、Commit、Prompt、日志、Artifact 或持久磁盘。Preview 仅经受保护的 Gateway 暴露，并检查当前 Session、Capability、Scope、Membership 与 Requirement 访问权。

Image Build 使用独立 Kata Materialization 与 Rootless BuildKit，先固化 Image Digest、SBOM、Provenance、扫描结果和日志，再释放资源。Sandbox 不把 Jenkins 纳入运行链路：用户仅在独立外部 Jenkins 平台手工操作，平台不自动触发、调用、接收或投影 Jenkins 状态。

## 不变量与关系

- 逻辑 Sandbox Environment 不能成为可写执行实例的别名；不同 Attempt、Child 或 Workspace 不共享可写目录、执行身份或短期 Secret。
- 只有 Sandbox Controller 可以把已绑定的 Runtime Profile 物化为 Kata 执行；业务对象、用户与 Agent 都不能选择 Node、RuntimeClass 或 Host 权限。
- Agent 的有效代码必须 Commit 并 Push 到当前绑定的任务分支；Formal MR 不得依赖 Sandbox 本地快照，恢复也不得依赖旧 Node 或本地磁盘。
- 运行时安全、故障清理、证据与审计规则见[详细说明](./sandbox-runtime-detail.md)；平台应用入口与 API 集成边界见[平台应用与集成](../06-platform-application-integration/platform-application-integration.md)。
