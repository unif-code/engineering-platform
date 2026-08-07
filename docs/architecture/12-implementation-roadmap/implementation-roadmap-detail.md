# 实施路线图详细说明

> 文档层级：L2 版本与实施状态事实源
> 对应主文：[实施路线图](./implementation-roadmap.md)
> 容量事实源：[环境容量与服务器规划](./environment-capacity-plan.md)

## 1. 责任边界

本文唯一记录 V0.1～V1.0 的用户旅程、包含范围、不包含范围、前置依赖、Release Gate、验收证据、实现状态、Environment Promotion 状态和所选 Profile。00～11 仍唯一拥有目标架构与领域 Contract；本文只引用这些 Contract，不复制其状态机、参数或安全机制。

[环境容量与服务器规划](./environment-capacity-plan.md)唯一拥有容量场景、Profile 数值和采购计划。本文只选择并链接 Profile，不抄写服务器表。基础设施与运维（09）拥有容量不变量、准入方法和 Hardened Target Profile 的目标拓扑。

GitOps、PCS 与 Operations Read Model 是运行状态证据。本文的 Environment Promotion 状态必须由这些证据支持，不能根据版本名称、代码合并或页面显示推断实际部署。

## 2. 状态 Contract

固定里程碑顺序为：V0.1 可运行基础 → V0.2 访问治理闭环 → V0.3 人工交付闭环 → V0.4 Agent 纵向试点 → V0.5 Production Candidate → V1.0 首次正式发布。

### 2.1 实现状态

| 状态 | 含义 |
| --- | --- |
| `NOT_STARTED` | 尚无该版本范围内的受控实现活动。 |
| `IN_PROGRESS` | 已开始实现，但 Release Gate 尚未形成完整通过证据。 |
| `ACCEPTED` | 版本范围和验收证据已通过 Release Gate。 |
| `DEFERRED_POST_LAUNCH` | 目标能力保留在架构中，但明确推迟到首次发布后，并在启用前重新通过对应 Gate。 |
| `BLOCKED` | 已开始或计划开始，但明确的外部条件或失败 Gate 阻止继续。 |

实现状态只按 Gate 证据跃迁，不使用百分比。`ACCEPTED` 表示 Capability Release 已验收，不表示候选制品已部署到 DEV 或 PROD。

### 2.2 Environment Promotion 状态

Environment Promotion 不按版本保存。唯一状态载体是独立的 `ReleaseCandidatePromotion`；V0.5 与 V1.0 必须引用同一个 `candidateId`，不得分别创建 Promotion 状态记录。每条 Record 至少绑定：

```text
ReleaseCandidatePromotion
├── candidateId
├── imageDigest
├── bundleDigest
├── compatibleConfigurationRefs[]
├── pcsCompatibilityRef
├── sourceDevAcceptanceGateRef
├── targetEnvironmentId（固定指向独立 PROD）
└── state / stateVersion / evidenceRefs[]
```

Record 创建时绑定已存在且稳定的 source DEV Acceptance Case/Gate ID，不预填尚未形成的通过决定。`candidateId`、两个 Digest、兼容配置/PCS 引用、`sourceDevAcceptanceGateRef` 与 target PROD 在创建后不可原地改写；`NOT_DEPLOYED → DEV_ACCEPTED` 时把最终 `devAcceptanceDecisionRef` 及其 Evidence 追加到证据链。状态只能以预期 `stateVersion` 推进并形成 Audit。若任一不可变绑定改变，必须创建新 `ReleaseCandidatePromotion` 并重新从 DEV Acceptance 开始。

| 状态 | 含义 |
| --- | --- |
| `NOT_DEPLOYED` | 候选 Record 尚未通过其绑定的 source DEV acceptance。 |
| `DEV_ACCEPTED` | 精确 Image Digest/Bundle 与兼容配置已在 DEV 通过 Acceptance。 |
| `PROD_CANDIDATE` | DEV 已验收候选及 Promotion 证据包已获准进入 PROD 发布流程，但尚未完成 PROD Release。 |
| `PROD_RELEASED` | DEV 验收的同一 Image Digest/Bundle 已 Promotion 到独立 PROD 并通过 PROD Release Gate。 |

| 唯一转换 | 推进 owner |
| --- | --- |
| `NOT_DEPLOYED → DEV_ACCEPTED` | V0.5 Release Gate 对该 Record 绑定的 source DEV acceptance 作出通过决定。 |
| `DEV_ACCEPTED → PROD_CANDIDATE` | 独立 Production Promotion Approval 批准同一 Record 进入 PROD 发布流程。 |
| `PROD_CANDIDATE → PROD_RELEASED` | V1.0 PROD Release Gate 验证同一 Record 后通过。 |

状态转换不得跳级、回退或由版本实现状态推导。Promotion 只能推进同一候选制品，不能在 V1.0 重新构建。DEV 与 PROD 的数据、Secret、凭据和环境本地配置值保持独立；配置 Promotion 传递受控版本谱系与兼容性，不复制环境 Secret。

### 2.3 当前状态

版本实现状态与 Profile 选择按版本记录，但不携带 Environment Promotion 列：

| 版本 | 实现状态 | 选定 Reliability/Capacity Profile |
| --- | --- | --- |
| V0.1 | `IN_PROGRESS` | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.2 | `NOT_STARTED` | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.3 | `NOT_STARTED` | [V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线) |
| V0.4 | `NOT_STARTED` | [V0.4 分阶段 Profile](./environment-capacity-plan.md#4-v0x-渐进式采购与部署) |
| V0.5 | `NOT_STARTED` | [V1.0 Compact Launch Profile](./environment-capacity-plan.md#6-v10-compact-launch-profile) |
| V1.0 | `NOT_STARTED` | [首批 10 人配置](./environment-capacity-plan.md#63-首批-10-人配置) |

V0.1 的 `IN_PROGRESS` 只表示仓库已有 Umi Max 前端基础并已开始形成目标架构文档，不构成 Release Gate 或部署通过证据。其余版本在前置版本 `ACCEPTED` 前保持 `NOT_STARTED`；若出现明确阻断条件，再基于证据改为 `BLOCKED`。

Environment Promotion 当前状态单独记录为共享投影：

| Promotion Track | 共享候选 Record | Source → Target | 当前 Record 状态 |
| --- | --- | --- | --- |
| 首次 Launch（V0.5 DEV Acceptance → V1.0 PROD Release） | 尚未实例化；V0.5 Gate 评估前创建并固定唯一 `candidateId` | DEV → PROD | —（当前无 Record） |

Record 以 `NOT_DEPLOYED` 初始状态创建后，该行只能投影其实际状态；V0.5 与 V1.0 均引用这同一行和同一 `candidateId`。当前没有 Record 就没有可推进的 Promotion 状态，不允许伪造占位 Digest、按版本创建空状态行或跳到任何 PROD 状态。

### 2.4 Capability Activation Matrix

本矩阵是 Capability Release 阶段选择与 Activation 归属的唯一事实源；00～11 继续拥有各 Capability 的完整 Target Contract。`V1.0 Scope` 表示首发是否包含，不能代替关联版本的实现状态、Release Gate 或环境部署证据。

| Capability Package | 首次 Release / Trigger owner | V1.0 Scope | Activation 边界 |
| --- | --- | --- | --- |
| 基础平台、GitOps、PCS、基础 Observability、Audit 与 Backup/Restore | V0.1 | Launch | 随 V0.1 Release Gate；未通过时保持关闭。 |
| 本地 Identity、Organization、Workspace、Authorization 与强制 TOTP | V0.2 | Launch | 随 V0.2 Release Gate；Passkey 不在此包。 |
| Requirement / SDD / Git / MR / Chat 与人工交付 | V0.3 | Launch | 随 V0.3 Release Gate；人工 Gate 不被 Agent 替代。 |
| 单仓 `fix` Agent Attempt + 首批有界 `IMAGE_BUILD` Child Type | V0.4 | Launch | 仅 Rootless BuildKit、`WAITING_CHILD`、Parent/Child Lease/Fencing 与 `ParentContinuationReservation` 通过完整 Gate 后启用。 |
| Operations Read Model、安全公告与受控 Console | V0.5 | Launch | 在 DEV 完成 06 完整 Contract、只读/授权/来源/失效与恢复验收后进入候选集合。 |
| Configuration DEV→PROD Promotion | V0.5 | Launch | 在 DEV 完成 10 的签名、Lineage、High-water、Divergence、TOTP 与 Publish 验收；这是 Configuration Capability，不是 `ReleaseCandidatePromotion` 状态机。 |
| Passkey/WebAuthn | 首发后独立 Capability Release | 不包含 | `DEFERRED_POST_LAUNCH`；完整注册、验证、恢复与 Audit Gate 前保持关闭。 |
| 额外 Child Type / 多仓 Agent | 首发后独立 Capability Release | 不包含 | `DEFERRED_POST_LAUNCH`；不得借首批 `IMAGE_BUILD` 的激活扩大类型、仓库或并发。 |
| Hardened Target Profile | [Evolution Trigger](./environment-capacity-plan.md#9-evolution-trigger) | 不包含 | Triggered Evolution；形成新 Capacity Candidate 并通过容量、迁移、回退、安全与恢复 Gate 后才可选择。 |

V1.0 不拥有新的 Capability Activation 行，只 Promotion V0.5 已在 DEV 验收的上述 Launch 集合。任何未列为 Launch 的目标能力都保持关闭，不得从 HTML、已存在 Port 或容量预留反向推断已启用。

## 3. V0.1 可运行基础

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 实施团队能够从受控 Git 变更构建平台制品，通过 Flux GitOps 在 DEV 重复部署 Umi Web 与 Python Control Plane 基础，查看健康与基础 Telemetry，并完成基础 Backup/Restore 验证。 |
| 包含范围 | Umi Max Web 与统一 `/admin` 路由骨架；Python 模块化单体、公开 API 与 Adapter 骨架；PostgreSQL 等最小持久化基础；Flux GitOps Desired State/Reconcile 链；PCS、基础 Observability、Audit 接入与备份恢复底座；未来能力的 Port 保留但默认关闭。 |
| 不包含范围 | 完整人员访问治理、Requirement/SDD 交付 Workflow、Agent 真实执行、正式 Sandbox、PROD、完整 HA 与 Hardened Target Profile。 |
| 前置依赖 | 已批准的 00～11 目标 Contract；DEV CloudEnvironmentBinding；版本锁定的构建输入；选定的[V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线)。 |
| Release Gate | 可重现构建；Flux 只从受保护 Git 路径 Reconcile；Web/API/数据库基本 Smoke Test 通过；配置、Secret 与环境边界不泄漏；基础备份、真实恢复和单节点容量测量形成证据；未选 Capability 保持关闭。 |
| 验收证据 | Source Commit、Image Digest/Bundle、GitOps Revision、PCS、Flux Inventory/Condition、API/页面 Smoke Test、数据库迁移记录、Telemetry、Backup/Restore 记录、容量测量与 Audit。 |
| 当前状态 | 实现 `IN_PROGRESS`。 |

## 4. V0.2 访问治理闭环

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 用户以本地身份登录，在当前 Workspace 中只看到并执行被服务端授权的动作；Super Admin 能受控管理组织、成员、角色和 Assignment，并可追溯授权、撤销和拒绝结果。 |
| 包含范围 | Identity、Organization、Membership、Workspace、Role、Capability、Scope、Assignment、Session；服务端授权与菜单投影；管理入口；配置发布授权；Secret/Audit 最小闭环；撤销、失效和恢复资格。 |
| 不包含范围 | Requirement 交付 Workflow、SDD 与 Git/MR 交付闭环、Agent Run、Sandbox 执行、PROD Promotion。 |
| 前置依赖 | V0.1 `ACCEPTED`；身份、授权、Configuration、安全和应用 Contract；继续使用[V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线)。 |
| Release Gate | 登录与 Session 生命周期可验证；Capability/Scope/Assignment 在服务端 Fail Closed；权限撤销对新请求生效；跨 Workspace 与越权访问被拒绝；管理动作、拒绝和 Break-glass 形成可关联 Audit；备份恢复后授权事实一致。 |
| 验收证据 | Identity/Session 集成测试、授权矩阵、越权与撤销测试、管理操作记录、Configuration Publish Audit、恢复验证、Trace/Audit Correlation 与安全评审记录。 |
| 当前状态 | 实现 `NOT_STARTED`。 |

## 5. V0.3 人工交付闭环

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 产品与研发人员在授权 Workspace 中创建并澄清 Requirement，形成 SDD、WorkItem、责任分配和人工 Gate；人员完成代码变更后绑定 Git/MR/Artifact 证据并完成 Acceptance 与交付。 |
| 包含范围 | Requirement、Route、WorkItem、Decision、Acceptance、Artifact 与人工 Gate；GitLab Repository/Branch/MR Binding 和 `IntegrationBaselineEvidence`；人工交付的外部效果与 Reconciliation；使用 `@ant-design/x` 组件的 Chat/SDD 体验；Model Gateway；用于 Chat/SDD Prompt 与 Model Route 回归证据的一次性 promptfoo Job。 |
| 不包含范围 | Agent 代码执行、Kata Sandbox、Agent 自动创建或推进业务 Decision、绕过人员审核的自动合并、PROD Promotion。 |
| 前置依赖 | V0.2 `ACCEPTED`；Requirement、Source Control、Model、Artifact、Configuration 与一致性 Contract；继续使用[V0.1～V0.3 单节点基线](./environment-capacity-plan.md#5-v01v03-单节点基线)。 |
| Release Gate | Requirement 到人工交付的 Happy Path 与拒绝/撤销路径均可追溯；人工责任和 Gate 不能被 Model、GitLab 或 UI 替代；MR/Artifact 使用精确版本证据；外部结果未知时进入 Reconciliation；promptfoo 结果固定输入、路由、预算和 Coverage，证据不完整时不形成通过结论。 |
| 验收证据 | 端到端用户旅程测试、Requirement/Decision/Acceptance 领域记录、GitLab Webhook 与 Reconciliation 记录、MR/Artifact Hash、promptfoo Evaluation Evidence、授权判定、Audit 与真实恢复记录。 |
| 当前状态 | 实现 `NOT_STARTED`。 |

## 6. V0.4 Agent 纵向试点

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 获授权研发人员从已批准 WorkItem 启动单仓 `fix` Agent；平台固定 Execution Binding，在专用 Kata Sandbox 中执行，并可把一次镜像构建交接给首批有界 `IMAGE_BUILD` Child，Parent 在 Child 终态后恢复，最终由人员审核并进入现有 MR 与 Acceptance 流程。 |
| 包含范围 | 首批 `fix` Agent Definition、Skill/Runtime Bundle、Model Route、Run/Attempt、不可变 Execution Binding、异步编排、容量准入、专用 `sandbox-worker`、Kata/KVM 隔离、短期 Secret、受限 Network、Repository/Branch Boundary、取消/超时/恢复、Artifact 与 MR 回流；仅启用首批有界 `IMAGE_BUILD` Child Type（Rootless BuildKit）、`WAITING_CHILD`、独立 Child Binding/Lease/Fencing、Parent→Child 资源交接与安全释放、`ParentContinuationReservation`；promptfoo Agent 黑盒回归与 EvalScope 模型选型/性能基准证据。 |
| 不包含范围 | 除 `IMAGE_BUILD` 外的额外 Child Type、多仓或任意命令自动化、并行 Child、开放公网 Egress、共享 Sandbox、未审查 Plugin、Agent 代替人工业务 Decision、同机 Sandbox 的正式安全验收、PROD Release。 |
| 前置依赖 | V0.3 `ACCEPTED`；Agent、Sandbox、Workflow、Source Control、安全、容量和数据 Contract；按[V0.4 分阶段 Profile](./environment-capacity-plan.md#4-v0x-渐进式采购与部署)先完成控制链联调，再增加专用 Sandbox Worker。 |
| Release Gate | 正式验收必须使用专用 `sandbox-worker`；同机联调只能标记 `LAB_ONLY`；Execution Binding 不可变；Kata、Network、Secret、Repository、资源 Ceiling、取消、超时、Node 故障与恢复 Gate 全部通过。`IMAGE_BUILD` 还必须验证 Parent Handoff 与 Lease 释放、Child 独立资源和 Fencing、Build Digest/SBOM/Provenance/扫描证据、Child cancel/timeout/failure、`POLICY_DISABLED` 收敛、`ParentContinuationReservation`、Parent resume、安全释放与容量 Gate；越权或关键证据未知时安全停止；Evaluation Job 固定版本、预算、路由与证据。 |
| 验收证据 | Run/Attempt/Binding 记录、Kata Runtime 与 Guest Lifecycle 结果、Network/Secret/Repository 隔离测试、Capacity Admission、取消/超时/故障注入、Artifact/MR Evidence；Child Execution/Binding/Lease/Fencing、Build Digest、SBOM、Provenance、扫描与结构化终态、Parent/Child/Reservation 恢复及资源释放记录；promptfoo/EvalScope Evaluation Evidence、Audit 与恢复记录。 |
| 当前状态 | 实现 `NOT_STARTED`。 |

V0.4 的 Capability Activation Gate 分别控制 `fix` Agent 与首批 `IMAGE_BUILD` Child；Image Build Gate 未通过时 `agent.image_build.active_build_limit=0`，不影响已经通过 Gate 的 `fix` Agent。通过后也只允许该有界 Child Type；其他 Agent Definition、Child Type、Tool、Network 或 Repository 能力保持关闭。

## 7. V0.5 Production Candidate

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 首批用户在 DEV 以接近上线的完整配置重复执行访问治理、人工交付、Agent Attempt 与 `IMAGE_BUILD` Child 旅程；发布团队验收 Operations Read Model、安全公告、受控 Console 与 Configuration DEV→PROD Promotion，并完成安全、容量、升级、故障与恢复演练，冻结可 Promotion 的候选证据包。 |
| 包含范围 | V0.1～V0.4 已验收 Capability（包括首批有界 `IMAGE_BUILD` Child）的集成与硬化；Operations Read Model、安全公告、受控 Console 与 Configuration DEV→PROD Promotion 的首发验收；Compact Launch Profile 的 DEV 验收；滚动发布、Rollback、Backup/Restore、Standard Attempt + Image Build 组合容量与故障演练；供应链、SBOM、签名与一次性 OSV-Scanner 漏洞匹配证据；promptfoo/EvalScope 回归证据；Production Readiness、GitOps/PCS/Operations 绑定和 Promotion 证据包。 |
| 不包含范围 | 新的用户功能、未通过 Capability Activation Gate 的目标能力、PROD 正式流量、Hardened Target Profile、所有单点故障下无感继续。 |
| 前置依赖 | V0.4 `ACCEPTED`；V0.1～V0.4 全部 Release Evidence；选定[V1.0 Compact Launch Profile](./environment-capacity-plan.md#6-v10-compact-launch-profile)；独立 PROD Environment 的 Provisioning Candidate 与 Promotion Runbook。 |
| Release Gate | 首发用户旅程在 DEV 通过；Operations Read Model 的只读边界、安全公告的受控来源与失效语义、Console 的预注册/逐次授权/目标认证，以及 Configuration Promotion 的签名、Lineage、High-water、Divergence、TOTP 与 Publish 演练通过；安全、供应链、Evaluation、Standard Attempt + Image Build 组合容量、Load、升级、Rollback、Child/Parent 故障恢复、安全停止、证据保留和真实恢复 Gate 通过；OSV-Scanner 只扫描固化输入且不完整结果不能形成“无漏洞”结论；Image Digest/Bundle 与兼容配置/PCS 引用冻结并可追溯到全部验收证据。该 Gate 只把同一 `ReleaseCandidatePromotion` 从 `NOT_DEPLOYED` 推进到 `DEV_ACCEPTED`。 |
| 验收证据 | DEV Acceptance Record 与 Approval、共享 `candidateId`、端到端旅程与 Standard Attempt + Image Build 组合负载测试、Child 取消/超时/失败与 Parent 恢复、Image/SBOM/Signature/Provenance、OSV-Scanner Evidence、promptfoo/EvalScope Evidence、Operations Read Model Snapshot、安全公告 Snapshot/Gap、Console Access Audit、Configuration Promotion 演练证据、故障注入、Backup/Restore、Upgrade/Rollback、Capacity、GitOps Revision 与 PCS。 |
| 当前状态 | 实现 `NOT_STARTED`；当前尚无 `ReleaseCandidatePromotion` Record，独立共享账本见 2.3。 |

V0.5 主要把首发集合完成集成硬化与 Production Readiness，并只新增 2.4 Matrix 明确列出的 Operations Read Model、安全公告、受控 Console 与 Configuration Promotion 上线治理 Capability；它不扩展其他业务 Capability。V1.0 仍不新增任何 Capability。

V0.5 Release Gate 评估前创建并冻结首发 `ReleaseCandidatePromotion`，初始为 `NOT_DEPLOYED`；Gate 通过只把该 Record 推进到 `DEV_ACCEPTED`。随后只有同一 `candidateId`、Image Digest、Bundle Digest 和兼容配置/PCS 引用的 Promotion 证据包通过独立 Production Promotion Approval，才从 `DEV_ACCEPTED` 推进到 `PROD_CANDIDATE`；该转换不重新执行 V0.5 Release Gate，也不新增 Capability。

## 8. V1.0 首次正式发布

| Contract 项 | 唯一记录 |
| --- | --- |
| 用户旅程 | 首批 10 人在独立 PROD 完成已于 DEV 验收的访问治理、人工交付、受控 Agent Attempt、首批有界 `IMAGE_BUILD` Child、Operations/Console/公告与配置旅程；故障时平台安全停止受影响动作、保留证据，并可按 Runbook 恢复。 |
| 包含范围 | 将 V0.5 已在 DEV 验收的同一 `ReleaseCandidatePromotion`、Image Digest/Bundle 和 Capability 集合 Promotion 到 PROD；环境本地 PCS 与受控配置谱系验证；首批 10 人 Launch Profile；发布 Smoke Test、Observability、Audit、Rollback、Backup/Restore 和运营交接。 |
| 不包含范围 | 重新构建候选制品、任何新增 Capability、跨环境共享数据/Secret/凭据、Hardened Target Profile、Site DR、所有单点故障下无感继续。 |
| 前置依赖 | V0.5 实现 `ACCEPTED` 且同一 `ReleaseCandidatePromotion` 已为 `PROD_CANDIDATE`；独立 PROD CloudEnvironmentBinding、PCS、Provisioning Gate 与[首批 10 人配置](./environment-capacity-plan.md#63-首批-10-人配置)通过；Promotion、Rollback 与恢复审批有效。 |
| Release Gate | PROD 的 `candidateId`、Image Digest/Bundle 与 DEV Accepted Candidate 完全一致；环境配置兼容且 Secret 独立；Flux Reconcile、PCS、健康、Smoke、授权、Agent Attempt + `IMAGE_BUILD` Child、Operations/Console/公告、Configuration Import/Publish、Audit、Observability、容量、Backup/Restore 与 Rollback 验证通过；失败时停止 Promotion 或安全回退，不通过重建或放宽 Gate 补救。Gate 只允许同一 Record 从 `PROD_CANDIDATE` 推进到 `PROD_RELEASED`。 |
| 验收证据 | 同一 `candidateId` 的 DEV Acceptance 与 PROD Promotion Record、Digest/Bundle 一致性、配置版本谱系、GitOps Revision、PCS、Flux Condition/Inventory、Operations Read Model、关键旅程 Smoke、Child/Parent 与 Build Evidence、Audit、公告/Console/Configuration Promotion Evidence、告警、容量、Backup/Restore、Rollback 与运营签署。 |
| 当前状态 | 实现 `NOT_STARTED`；无独立 Environment Promotion 状态，未来只复用 2.3 共享账本中的同一 `candidateId`。 |

V1.0 不增加功能。任何需要改变 Capability Scope、Image 内容或 Bundle 的修复都必须生成新的候选版本，重新回到 DEV Acceptance，不能继续沿用原 V1.0 Promotion 记录。

## 9. 首发后能力与 Evolution Trigger

完整目标架构仍保留在 00～11。未进入 V1.0 Scope 的增强能力，以及容量文档中的 Hardened Target Profile，当前实现状态为 `DEFERRED_POST_LAUNCH`，不得作为半成品启用。

上线后只有在明确的业务需求或[容量 Evolution Trigger](./environment-capacity-plan.md#9-evolution-trigger)成立、形成新的 Capability/Capacity Candidate，并重新通过对应 Release Gate、Capability Activation Gate、兼容、迁移、回退、容量、安全和恢复验证后，才能改变当前 Release 或 Profile。Operations Read Model 的告警与测量是触发证据，不是自动扩权或自动部署命令。
