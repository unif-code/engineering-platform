# 远程 Sandbox Runtime

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[远程 Sandbox Runtime 详细设计](./04-remote-sandbox-detail.md)

## 1. 模块目标

为 Agent Attempt 和受控 Image Build 提供隔离、可重建、可审计的远程执行环境。Sandbox 通过稳定 Port 与 Requirement Workflow 解耦，底层 Runtime 或 Compute Provider 变化不修改业务状态机。

## 2. 逻辑环境与物理执行

一个 Requirement 对应一个逻辑 Sandbox Environment，可以关联多个 WorkItem、Repository Branch Binding、Preview 和 Artifact。每个活动 Agent Attempt 或 Image Build 再创建一次独立物理 Materialization；逻辑环境不等于一个长期运行的 Pod 或 VM。

```text
Requirement Sandbox Environment
├── WorkItem Repository Checkout
├── Mock / Frontend / Backend Service
├── Preview Endpoint
├── Agent Attempt Materialization
└── Image Build Child Materialization
```

物理环境不是事实源。代码进入 GitLab，Checkpoint、日志、测试报告和构建产物进入 Artifact Store；等待、故障、归档或回收后都可以从权威事实重建。

## 3. Kata/KVM 隔离基线

每个 Platform Environment 在自己的 Kubernetes Cluster 中部署专用 `sandbox-worker` Node Pool，固定为两个分别位于独立物理 Host 的 Node。Sandbox 使用社区 Kata Containers、`runtime-rs` 与 QEMU/KVM，每个 Sandbox Pod 拥有独立 Guest Kernel；Runtime 失败时禁止静默回退到 `runc`、ACK `runV` 或普通容器。

通用契约是 `KVM-capable Compute Pool`，不是某个阿里云实例型号。Region/Zone 尚未确定时，`64 vCPU / 192 GiB` EBM 只是保守 Provider Fallback Candidate，不是架构硬下限；目标 Region 正式支持且通过 PCS/KVM/N+1 验证的较小 Nested-Virtualization ECS 可以替换它。

## 4. 容量与资源

Agent Attempt 与 Image Build 共享带 Fencing Token 的 Sandbox Capacity Ledger：

| Resource Profile | CPU Request / Limit | Memory Request / Limit | Ephemeral Request / Limit | Unit |
| --- | --- | --- | --- | ---: |
| `resource/standard-v1` | `2 / 4 vCPU` | `6 / 8 GiB` | `30 / 50 GiB` | 1 |
| `resource/image-build-v1` | `4 / 8 vCPU` | `12 / 16 GiB` | `60 / 100 GiB` | 2 |

DEV Ceiling 为 `5 Units`，PROD 为 `8 Units`。两个 Host 必须满足 N+1：任意一个 `sandbox-worker` 不可用时，剩余 Host 仍能承载本环境全部 Unit Ceiling 的获准组合。首版不向用户提供 Small/Large 自选规格。

## 5. 生命周期与恢复

Attempt 只有在获得原子 Capacity Lease 后才能进入 `PROVISIONING`。进入 `WAITING_INPUT` 或 `WAITING_CHILD` 前必须固化 Checkpoint、日志和 Artifact，释放物理 Materialization、Lease 与短期 Secret。恢复沿用原 Attempt 和 Execution Binding，重新进入持久队列；终态 Attempt 不复活，业务重试创建新 Attempt。

Image Build 是独立 Child Execution，使用独立 Kata Materialization 和 `2 Units` Build Lease。Parent 进入 `WAITING_CHILD` 并先释放自己的 `1 Unit`，不得让 Parent 与 Child 同时占用或共享执行身份。

## 6. 网络、Secret 与 Preview

- Sandbox 默认拒绝任意公网出口，只按 Execution Binding 放行 GitLab、批准的依赖源、Model Gateway、Artifact Store和明确的 Connector/Egress 目标；
- Agent 联网搜索优先通过 Model Gateway Search Capability 或批准的 Search Connector，不把浏览器式任意互联网访问隐含进 Sandbox；
- OpenBao Agent Injector 将短期 Secret 写入 Pod 的内存文件，禁止进入环境变量、镜像、代码、Commit、Prompt、日志、Artifact 或持久磁盘；
- Preview 只通过受保护的 Preview Gateway 暴露，不直接公开 Pod 地址，并校验当前 Session、Capability、Scope 和 Workspace Membership。

## 7. 与 Jenkins 的边界

Sandbox 负责 `main` 合并前的开发、Preview、测试和证据固化。首版 Jenkins 是独立平台，由开发人员手工操作；研发平台不调用 Jenkins、不读取其状态，也不把 Jenkins 作为 Sandbox、Agent Runtime 或系统 Gate。
