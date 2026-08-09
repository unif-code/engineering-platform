# 实施路线图

> 容量事实源：[环境容量与服务器规划](./appendix-parameters.md#容量与服务器规划)

## 目标与边界

本主题记录 V0.1～V1.0 六个里程碑的用户旅程、Release Scope（包含与不包含范围）、前置依赖、Release Gate、验收证据、实施状态、Environment Promotion 状态与所选 Reliability/Capacity Profile，是 Capability Release、环境推广与 Launch Profile 的统一导航。固定里程碑顺序为 V0.1 可运行基础 → V0.2 访问治理闭环 → V0.3 人工交付闭环 → V0.4 Agent 纵向试点 → V0.5 Production Candidate → V1.0 首次正式发布；本文只决定哪些 Capability 进入哪个 Release、当前实施状态以及候选制品走到哪个 Promotion 阶段，不改变领域 owner 的业务、安全或运行规则。

00～11 拥有稳定的目标架构与领域 Contract，本文只引用它们，不复制其状态机、参数或安全机制：三类 Gate 的分类语义、验证维度与跨模块不变量属于[架构基线](./11-architecture-baseline.md)，`CapabilityActivationRecord` 的持久化属于 [Configuration Governance](./10-configuration-governance.md)，容量不变量、物理准入与 Hardened Target 目标拓扑属于[基础设施与运维](./09-infrastructure-operations.md)，容量场景、Profile 数值与分阶段采购计划属于[参数附录](./appendix-parameters.md#容量与服务器规划)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：人数容量场景、服务器矩阵、单机 SKU 与采购数值见[容量与服务器规划](./appendix-parameters.md#容量与服务器规划)，本文只做定性选择并链接选定 Profile，不抄写服务器表。GitOps Desired State、Platform Compatibility Set（PCS）与 Operations Read Model 是运行状态证据；本文记录的 Environment Promotion 状态只能由这些证据支持，不能根据版本名称、代码合并或页面显示推断实际部署，路线图状态也不替代运行证据。

## 核心模型

### 三条正交轴

Capability Release、Environment Promotion 与 Reliability/Capacity Profile 是三条互不推导、互不替代的轴：

| 轴 | 回答的问题 | 状态或选择 | 不代表 |
| --- | --- | --- | --- |
| Capability Release | 哪组用户旅程与 Capability Package 通过 Release Gate？ | V0.1、V0.2、V0.3、V0.4、V0.5、V1.0 及各自独立的实施状态 | 已部署到某个环境 |
| Environment Promotion | 独立 `ReleaseCandidatePromotion` 绑定的同一候选 Image Digest/Bundle 经验证后位于哪一推广阶段？ | `NOT_DEPLOYED`、`DEV_ACCEPTED`、`PROD_CANDIDATE`、`PROD_RELEASED` | 新增产品功能、创建新版本或为每个版本另建状态行 |
| Reliability/Capacity Profile | 当前验收选择哪一可靠性与容量场景？ | 单节点 DEV、分阶段 Agent Sandbox、Compact Launch 或触发后的 Hardened Target Profile | 某套拓扑已经实际运行 |

DEV 与 PROD 是彼此隔离的 Platform Environment，不是产品版本：一个版本实现完成不自动成为 `DEV_ACCEPTED`，候选制品在 DEV 验收通过也不自动成为 `PROD_RELEASED`；Profile 是验收与采购选择，不是 Observed State。

### 里程碑与依赖

```text
Capability Release

V0.1 可运行基础
  └──> V0.2 访问治理闭环
         └──> V0.3 人工交付闭环
                └──> V0.4 Agent 纵向试点
                       └──> V0.5 Production Candidate
                              └──> V1.0 首次正式发布
                                    （不增加功能）

V0.5 已在 DEV 验收的同一 Image Digest/Bundle
  └── DEV_ACCEPTED ──> PROD_CANDIDATE ──> PROD_RELEASED
                         V1.0 只执行 Promotion，不重新构建
```

V0.1～V0.5 依次形成可验收的纵向能力；V0.2 起，每个里程碑的前置依赖固定包含前一个里程碑 `ACCEPTED`，每个里程碑还固定要求本 Release 入选 Capability 的领域 Contract 已批准以及选定 Profile 的环境条件成立，各版本的额外前置见下方 Scope 表。V1.0 的 Capability Scope 与 V0.5 Production Candidate 相同，只把 DEV 已验收的候选制品与兼容配置 Promotion 到独立 PROD，并完成 PROD Release Gate。

### Release 状态与 Profile 选择

版本的纵向结果、实施状态与 Profile 选择按版本记录，但不携带 Environment Promotion 列：

| 版本 | 用户旅程与纵向结果 | 实施状态 | 选定 Profile |
| --- | --- | --- | --- |
| V0.1 可运行基础 | 实施团队从受控 Git 变更构建平台制品，经 Flux GitOps 在 DEV 重复部署 Umi Web 与 Python Control Plane 基础，查看健康与基础 Telemetry，并完成基础 Backup/Restore 验证；建立可部署、可观察、可备份恢复的平台基础。 | `IN_PROGRESS` | [V0.1～V0.3 单节点基线](./appendix-parameters.md#5-v01v03-单节点基线) |
| V0.2 访问治理闭环 | 用户以本地身份登录，在当前 Workspace 中只看到并执行被服务端授权的动作；Super Admin 受控管理组织、成员、角色与 Assignment，并可追溯授权、撤销与拒绝结果；建立身份、组织、Workspace、授权与 Audit 闭环。 | `NOT_STARTED` | [V0.1～V0.3 单节点基线](./appendix-parameters.md#5-v01v03-单节点基线) |
| V0.3 人工交付闭环 | 产品与研发人员在授权 Workspace 中创建并澄清 Requirement，形成 SDD、WorkItem、责任分配与人工 Gate；人员完成代码变更后绑定 Git/MR/Artifact 证据并完成 Acceptance 与交付；建立 Requirement、SDD、人工 Gate、Git/MR 与交付证据闭环。 | `NOT_STARTED` | [V0.1～V0.3 单节点基线](./appendix-parameters.md#5-v01v03-单节点基线) |
| V0.4 Agent 纵向试点 | 获授权研发人员从已批准 WorkItem 启动单仓 `fix` Agent；平台固定 Execution Binding，在专用 Kata Sandbox 中执行，可把一次镜像构建交接给首批有界 `IMAGE_BUILD` Child，Parent 在 Child 终态后恢复，最终由人员审核并进入现有 MR 与 Acceptance 流程。 | `NOT_STARTED` | [V0.4 分阶段 Profile](./appendix-parameters.md#4-v0x-渐进式采购与部署) |
| V0.5 Production Candidate | 首批用户在 DEV 以接近上线的完整配置重复执行访问治理、人工交付、Agent Attempt 与 `IMAGE_BUILD` Child 旅程；发布团队验收 Operations Read Model、安全公告、受控 Console 与 Configuration DEV→PROD Promotion，完成安全、容量、升级、故障与恢复演练，并冻结可 Promotion 的候选证据包。 | `NOT_STARTED` | [V1.0 Compact Launch Profile](./appendix-parameters.md#6-v10-compact-launch-profile) |
| V1.0 首次正式发布 | 首批 Launch 人群在独立 PROD 完成已于 DEV 验收的访问治理、人工交付、受控 Agent Attempt、`IMAGE_BUILD` Child、Operations/Console/公告与配置旅程；故障时平台安全停止受影响动作、保留证据，并可按 Runbook 恢复。 | `NOT_STARTED` | [V1.0 首批 Launch 配置](./appendix-parameters.md#63-首批-10-人配置) |

V0.1 的 `IN_PROGRESS` 表示仓库已有 Umi Max 前端基础，且 00～11 目标 Contract 已形成批准基线（见[架构基线](./11-architecture-baseline.md)）；该状态不构成 Release Gate 或部署通过证据。其余版本在前置版本 `ACCEPTED` 前保持 `NOT_STARTED`；若出现明确阻断条件，再基于证据改为 `BLOCKED`。

| 实施状态 | 含义 |
| --- | --- |
| `NOT_STARTED` | 尚无该版本范围内的受控实现活动。 |
| `IN_PROGRESS` | 已开始实现，但 Release Gate 尚未形成完整通过证据。 |
| `ACCEPTED` | 版本范围与验收证据已通过 Release Gate；不表示候选制品已部署到 DEV 或 PROD。 |
| `DEFERRED_POST_LAUNCH` | 目标能力保留在架构中，但明确推迟到首次发布后，并在启用前重新通过对应 Gate。 |
| `BLOCKED` | 已开始或计划开始，但明确的外部条件或失败 Gate 阻止继续。 |

### Release Scope 与验收

每个版本的包含范围、不包含范围、额外前置依赖、Release Gate 与验收证据如下；Gate 的具体判定仍回链 00～11 的规范 owner：

| 版本 | 包含范围 | 不包含范围 |
| --- | --- | --- |
| V0.1 | Umi Max Web 与统一 `/admin` 路由骨架；Python 模块化单体、公开 API 与 Adapter 骨架；PostgreSQL 等最小持久化基础；Flux GitOps Desired State/Reconcile 链；PCS、基础 Observability、Audit 接入（含 Cluster 外过渡对象存储上的 `audit-worm` WORM 归档）与备份恢复底座；未来能力的 Port 保留但默认关闭。 | 完整人员访问治理、Requirement/SDD 交付 Workflow、Agent 真实执行、正式 Sandbox、PROD、完整 HA 与 Hardened Target Profile。 |
| V0.2 | Identity、Organization、Membership、Workspace、Role、Capability、Scope、Assignment、Session；服务端授权与菜单投影；管理入口；配置发布授权；Secret/Audit 最小闭环；撤销、失效和恢复资格。 | Requirement 交付 Workflow、SDD 与 Git/MR 交付闭环、Agent Run、Sandbox 执行、PROD Promotion。 |
| V0.3 | Requirement、Route、WorkItem、Decision、Acceptance、Artifact 与人工 Gate（Artifact 对象落在 [07](./07-data-messaging-storage.md) 的过渡外部 Object Storage）；GitLab Repository/Branch/MR Binding 和 `IntegrationBaselineEvidence`；人工交付的外部效果与 Reconciliation；使用 `@ant-design/x` 组件的 Chat/SDD 体验；Model Gateway；用于 Chat/SDD Prompt 与 Model Route 回归证据的一次性 promptfoo Job。 | Agent 代码执行、Kata Sandbox、Agent 自动创建或推进业务 Decision、绕过人员审核的自动合并、PROD Promotion。 |
| V0.4 | 首批 `fix` Agent Definition、Skill/Runtime Bundle、Model Route、Run/Attempt、不可变 Execution Binding、异步编排、容量准入、专用 `sandbox-worker`、Kata/KVM 隔离、短期 Secret、受限 Network、Repository/Branch Boundary、取消/超时/恢复、Artifact 与 MR 回流；仅启用首批有界 `IMAGE_BUILD` Child Type（Rootless BuildKit）、`WAITING_CHILD`、独立 Child Binding/Lease/Fencing、Parent→Child 资源交接与安全释放、`ParentContinuationReservation`；promptfoo Agent 黑盒回归与 EvalScope 模型选型/性能基准证据。 | 除 `IMAGE_BUILD` 外的额外 Child Type、多仓或任意命令自动化、并行 Child、开放公网 Egress、共享 Sandbox、未审查 Plugin、Agent 代替人工业务 Decision、同机 Sandbox 的正式安全验收、PROD Release。 |
| V0.5 | V0.1～V0.4 已验收 Capability（包括首批有界 `IMAGE_BUILD` Child）的集成与硬化；Operations Read Model、安全公告、受控 Console 与 Configuration DEV→PROD Promotion 的首发验收；Compact Launch Profile 的 DEV 验收；滚动发布、Rollback、Backup/Restore、Standard Attempt + Image Build 组合容量与故障演练；供应链、SBOM、签名与一次性 OSV-Scanner 漏洞匹配证据；promptfoo/EvalScope 回归证据；Production Readiness、GitOps/PCS/Operations 绑定和 Promotion 证据包。 | 新的用户功能、未通过 Capability Activation Gate 的目标能力、PROD 正式流量、Hardened Target Profile、所有单点故障下无感继续。 |
| V1.0 | 将 V0.5 已在 DEV 验收的同一 `ReleaseCandidatePromotion`、Image Digest/Bundle 和 Capability 集合 Promotion 到 PROD；环境本地 PCS 与受控配置谱系验证；[V1.0 首批 Launch 配置](./appendix-parameters.md#63-首批-10-人配置)的 Launch Profile；发布 Smoke Test、Observability、Audit、Rollback、Backup/Restore 和运营交接。 | 重新构建候选制品、任何新增 Capability、跨环境共享数据/Secret/凭据、Hardened Target Profile、Site DR、所有单点故障下无感继续。 |

| 版本 | 额外前置依赖 | Release Gate 与验收证据 |
| --- | --- | --- |
| V0.1 | 已批准的 00～11 目标 Contract；DEV `CloudEnvironmentBinding`；版本锁定的构建输入。 | Gate：可重现构建；Flux 只从受保护 Git 路径 Reconcile；Web/API/数据库基本 Smoke Test 通过；配置、Secret 与环境边界不泄漏；基础备份、真实恢复和单节点容量测量形成证据；未选 Capability 保持关闭。证据：Source Commit、Image Digest/Bundle、GitOps Revision、PCS、Flux Inventory/Condition、API/页面 Smoke Test、数据库迁移记录、Telemetry、Backup/Restore 记录、容量测量与 Audit。 |
| V0.2 | 身份、授权、Configuration、安全和应用 Contract。 | Gate：登录与 Session 生命周期可验证；Capability/Scope/Assignment 在服务端 Fail Closed；权限撤销对新请求生效；跨 Workspace 与越权访问被拒绝；管理动作、拒绝和 Break-glass 形成可关联 Audit；备份恢复后授权事实一致。证据：Identity/Session 集成测试、授权矩阵、越权与撤销测试、管理操作记录、Configuration Publish Audit、恢复验证、Trace/Audit Correlation 与安全评审记录。 |
| V0.3 | Requirement、Source Control、Model、Artifact、Configuration 与一致性 Contract。 | Gate：Requirement 到人工交付的 Happy Path 与拒绝/撤销路径均可追溯；人工责任和 Gate 不能被 Model、GitLab 或 UI 替代；MR/Artifact 使用精确版本证据；外部结果未知时进入 Reconciliation；promptfoo 结果固定输入、路由、预算和 Coverage，证据不完整时不形成通过结论。证据：端到端用户旅程测试、Requirement/Decision/Acceptance 领域记录、GitLab Webhook 与 Reconciliation 记录、MR/Artifact Hash、promptfoo Evaluation Evidence、授权判定、Audit 与真实恢复记录。 |
| V0.4 | Agent、Sandbox、Workflow、Source Control、安全、容量和数据 Contract；按[V0.4 分阶段 Profile](./appendix-parameters.md#4-v0x-渐进式采购与部署)先完成控制链联调，再增加专用 Sandbox Worker。 | Gate：正式验收必须使用专用 `sandbox-worker`，同机联调只能标记 `LAB_ONLY`；Execution Binding 不可变；Kata、Network、Secret、Repository、资源 Ceiling、取消、超时、Node 故障与恢复 Gate 全部通过；Source Control 写凭据不入 Guest，Push 经 Credential Broker 校验 Attempt/分支/内容 Hash 绑定后单次执行；`IMAGE_BUILD` 还必须验证 Parent Handoff 与 Lease 释放、Child 独立资源和 Fencing、Build Digest/SBOM/Provenance/扫描证据、Child cancel/timeout/failure、Build Policy 关闭的[原因码](./appendix-parameters.md#错误码)收敛、`ParentContinuationReservation`、Parent resume、安全释放与容量 Gate；越权或关键证据未知时安全停止；Evaluation Job 固定版本、预算、路由与证据。证据：Run/Attempt/Binding 记录、Kata Runtime 与 Guest Lifecycle 结果、Network/Secret/Repository 隔离测试、恶意仓库/依赖的凭据外泄注入测试、Capacity Admission、取消/超时/故障注入、Artifact/MR Evidence；Child Execution/Binding/Lease/Fencing、Build Digest、SBOM、Provenance、扫描与结构化终态、Parent/Child/Reservation 恢复及资源释放记录；promptfoo/EvalScope Evaluation Evidence、Audit 与恢复记录。 |
| V0.5 | V0.1～V0.4 全部 Release Evidence；独立 PROD Environment 的 Provisioning Candidate 与 Promotion Runbook。 | Gate：首发用户旅程在 DEV 通过；Operations Read Model 的只读边界、安全公告的受控来源与失效语义、Console 的预注册/逐次授权/目标认证，以及 Configuration Promotion 的签名、Lineage、High-water、Divergence、TOTP 与 Publish 演练通过；安全、供应链、Evaluation、Standard Attempt + Image Build 组合容量、Load、升级、Rollback、Child/Parent 故障恢复、安全停止、证据保留和真实恢复 Gate 通过；OSV-Scanner 只扫描固化输入且不完整结果不能形成“无漏洞”结论；Image Digest/Bundle 与兼容配置/PCS 引用冻结并可追溯到全部验收证据。证据：DEV Acceptance Record 与 Approval、共享 `candidateId`、端到端旅程与组合负载测试、Child 取消/超时/失败与 Parent 恢复、Image/SBOM/Signature/Provenance、OSV-Scanner Evidence、promptfoo/EvalScope Evidence、Operations Read Model Snapshot、安全公告 Snapshot/Gap、Console Access Audit、Configuration Promotion 演练证据、故障注入、Backup/Restore、Upgrade/Rollback、Capacity、GitOps Revision 与 PCS。 |
| V1.0 | 同一 `ReleaseCandidatePromotion` 已为 `PROD_CANDIDATE`；独立 PROD `CloudEnvironmentBinding`、PCS 与 Provisioning Gate 通过；Promotion、Rollback 与恢复审批有效。 | Gate：PROD 的 `candidateId`、Image Digest/Bundle 与 DEV Accepted Candidate 完全一致；环境配置兼容且 Secret 独立；Flux Reconcile、PCS、健康、Smoke、授权、Agent Attempt + `IMAGE_BUILD` Child、Operations/Console/公告、Configuration Import/Publish、Audit、Observability、容量、Backup/Restore 与 Rollback 验证通过。证据：同一 `candidateId` 的 DEV Acceptance 与 PROD Promotion Record、Digest/Bundle 一致性、配置版本谱系、GitOps Revision、PCS、Flux Condition/Inventory、Operations Read Model、关键旅程 Smoke、Child/Parent 与 Build Evidence、Audit、公告/Console/Configuration Promotion Evidence、告警、容量、Backup/Restore、Rollback 与运营签署。 |

V0.4 的 Capability Activation Gate 分别控制 `fix` Agent 与首批 `IMAGE_BUILD` Child：Image Build Gate 未通过时有效 [Build 并发上限 Policy](./appendix-parameters.md#platform-policy-key)必须为零，且不影响已经通过 Gate 的 `fix` Agent；通过后也只允许该有界 Child Type，其他 Agent Definition、Child Type、Tool、Network 或 Repository 能力保持关闭。V0.5 只把首发集合完成集成硬化与 Production Readiness，并只新增 Capability Activation Matrix 列出的上线治理 Capability；V1.0 不新增任何 Capability。

### Environment Promotion 协议

Environment Promotion 不按版本保存，状态只承载于独立的 `ReleaseCandidatePromotion`；V0.5 与 V1.0 必须引用同一个 `candidateId`，版本行不拥有独立 Promotion 状态。每条 Record 至少绑定：

```text
ReleaseCandidatePromotion
├── candidateId
├── imageDigest
├── bundleDigest
├── compatibleConfigurationRefs[]
├── pcsCompatibilityRef
├── architectureBaselineRef
├── sourceDevAcceptanceGateRef
├── targetEnvironmentId（固定指向独立 PROD）
└── state / stateVersion / evidenceRefs[]
```

| 状态 | 含义 | 进入该状态的转换与推进 owner |
| --- | --- | --- |
| `NOT_DEPLOYED` | 候选 Record 尚未通过其绑定的 source DEV acceptance。 | Record 创建时的初始状态，在 V0.5 Release Gate 评估前创建并冻结。 |
| `DEV_ACCEPTED` | 精确 Image Digest/Bundle 与兼容配置已在 DEV 通过 Acceptance。 | V0.5 Release Gate 对该 Record 绑定的 source DEV acceptance 作出通过决定。 |
| `PROD_CANDIDATE` | DEV 已验收候选及 Promotion 证据包已获准进入 PROD 发布流程，但尚未完成 PROD Release。 | 独立 Production Promotion Approval 批准同一 Record 进入 PROD 发布流程；该转换不重新执行 V0.5 Release Gate。 |
| `PROD_RELEASED` | DEV 验收的同一 Image Digest/Bundle 已 Promotion 到独立 PROD 并通过 PROD Release Gate。 | V1.0 PROD Release Gate 验证同一 Record 后通过。 |

Production Promotion Approval 是独立人工决定：审批资格由[身份、组织与授权](./01-identity-organization-authorization.md)的 Capability 与 Scope Contract 判定；审批人宜与同一 Record 的 source DEV Acceptance 通过决定人为不同 Principal，无法满足时必须按治理例外记录原因。Approval 绑定 `candidateId`、`imageDigest`、`bundleDigest`、`pcsCompatibilityRef` 与预期 `stateVersion`，并记录审批 Principal、时间与原因后进入 Audit。

Record 及其状态历史持久化于受保护 Git 路径，版本化并经 Review 合并推进；它不存放在 DEV 或 PROD 的运行数据库中，任何 Platform Environment 只读引用其当前状态。`targetEnvironmentId` 随目标 PROD 的 `CloudEnvironmentBinding` 声明铸造，可先于物理 Provisioning 存在，但创建 Record 前该标识必须已声明。首次 Launch Promotion Track（V0.5 DEV Acceptance → V1.0 PROD Release，source DEV → target PROD）当前尚未实例化：V0.5 Gate 评估前创建并固定该 Track 仅有的 `candidateId`，Record 以 `NOT_DEPLOYED` 创建后本节只投影其实际状态，V0.5 与 V1.0 均引用同一条 Record。

### Capability Activation Matrix

本矩阵记录各 Capability Package 的阶段选择与 Activation 归属；00～11 继续拥有各 Capability 的完整 Target Contract。`V1.0 Scope` 表示首发是否包含，不能代替关联版本的实施状态、Release Gate 或环境部署证据。

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
| Hardened Target Profile | [Evolution Trigger](./appendix-parameters.md#9-evolution-trigger) | 不包含 | Triggered Evolution；形成新 Capacity Candidate 并通过容量、迁移、回退、安全与恢复 Gate 后才可选择。 |

V1.0 不拥有新的 Capability Activation 行，只 Promotion V0.5 已在 DEV 验收的上述 Launch 集合。

## 关键不变量

- Capability Release、Environment Promotion 与 Reliability/Capacity Profile 三条轴互不推导：实施状态不表示已部署，Promotion 状态不表示新增功能或新版本，Profile 选择不表示某套拓扑已运行——三者由不同证据支撑，混用会把交付决策当成运行事实。
- 实施状态只按 Gate 证据跃迁，不使用百分比或进度估算——只有可验证证据才能改变版本状态。
- 里程碑顺序固定且不可跳跃：后一里程碑在前一里程碑 `ACCEPTED` 前保持 `NOT_STARTED`，仅在明确阻断条件成立时基于证据改为 `BLOCKED`——纵向能力依赖前序验收结果，跳级会让 Gate 失去输入。
- Release Gate 只验收被本 Release 选入的 Capability，且每项入选 Capability 必须满足其领域 owner 的完整目标 Contract，不得重写或放宽授权、安全、隔离、证据、容量准入与恢复底线——Release 决策只选择做什么，不改变正确性标准。
- Release Gate 与 Capability Activation Gate 的决策对象不同：前者判断某个版本定义的用户旅程、范围与证据是否达到可接受状态，后者判断已实现能力是否满足其完整目标 Contract 并可在指定环境启用，一次 Release Gate 通过不自动打开全部入选 Capability——两类 Gate 的分类语义与组合规则由[架构基线](./11-architecture-baseline.md)定义，本文只记录具体 Release 的选择结果。
- 未被当前 Release 选入或未通过 Capability Activation Gate 的目标能力必须保持关闭，不得以半成品或降级安全边界的方式启用，也不得从 HTML、已存在 Port 或容量预留反向推断已启用——部分启用会把整条链路的安全边界降级。
- Environment Promotion 只沿 `NOT_DEPLOYED → DEV_ACCEPTED → PROD_CANDIDATE → PROD_RELEASED` 逐级推进，不得跳级、回退或由版本实施状态推导，也不得伪造占位 Digest、按版本创建空状态行或跳到任何 PROD 状态；没有 Record 就没有可推进的 Promotion 状态——每次转换都需要独立的验收或审批证据，空状态行会被误读为已部署。
- Record 的 `candidateId`、两个 Digest、兼容配置/PCS/架构基线引用、`sourceDevAcceptanceGateRef` 与 target PROD 在创建后不可原地改写，任一不可变绑定改变必须创建新 `ReleaseCandidatePromotion` 并重新从 DEV Acceptance 开始；Production Promotion Approval 的任一绑定或 `stateVersion` 变化同样即时失效并须重新批准——可改写的绑定会让“同一候选制品”失去意义，审批也只对被审批的那个精确候选与状态有效。
- Record 创建时绑定已存在且稳定的 source DEV Acceptance Case/Gate ID，不预填尚未形成的通过决定；`NOT_DEPLOYED → DEV_ACCEPTED` 时把最终 `devAcceptanceDecisionRef` 及其 Evidence 追加到证据链，状态只能以预期 `stateVersion` 推进并形成 Audit——预填结论等于伪造尚不存在的证据。
- Promotion 只推进同一候选制品，V1.0 不重新构建；任何需要改变 Capability Scope、Image 内容或 Bundle 的修复都必须生成新候选并重新回到 DEV Acceptance，不能继续沿用原 Promotion 记录——重建后的制品不再被原 DEV 验收证据覆盖。
- DEV 与 PROD 的数据、Secret、凭据和环境本地配置值保持独立，配置 Promotion 只传递受控版本谱系与兼容性、不复制环境 Secret，Promotion 治理也不使两个环境的运行联通——隔离是可验证的故障域与信任域边界。
- Gate 失败时版本不能标记为 `ACCEPTED`、候选制品不能进入下一 Promotion 阶段，平台停止推进或按 owner Contract 安全回退并保留失败与恢复证据，不通过重建候选或放宽 Gate 补救——安全停止比强行继续更可运营。
- 未进入 V1.0 Scope 的增强能力以及容量文档中的 Hardened Target Profile 当前为 `DEFERRED_POST_LAUNCH`，完整目标架构仍保留在 00～11——推迟是交付决策，不是从目标架构中删除。
- 上线后只有在明确业务需求或上线后的容量、可靠性、成本与运维证据使[容量 Evolution Trigger](./appendix-parameters.md#9-evolution-trigger)成立、形成新的 Capability/Capacity Candidate，并重新通过对应 Release Gate、Capability Activation Gate、兼容、迁移、回退、容量、安全和恢复验证后，才能改变当前 Release 或 Profile；在此之前保持当前已验证 Profile，并通过排队、拒绝或安全停止守住其 Ceiling，Operations Read Model 的告警与测量是触发证据，不是自动扩权或自动部署命令——测量信号是评估输入，不是批准。
- 本文只做定性 Profile 选择并链接[容量与服务器规划](./appendix-parameters.md#容量与服务器规划)，不复制服务器数量、SKU、人数档位或容量数值——参数只有单一来源才不会出现两套采购与验收口径。
- Promotion 与部署结论只能由 GitOps Desired State、PCS 与 Operations Read Model 证据支持，不能由版本名称、代码合并或页面显示推断——路线图状态是交付决策，不是运行证据。

## 与其他模块的关系

下表是本模块自身视角：12 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | System Context、模块边界、逻辑分层，以及 Core Platform / Launch Profile / Hardened Target / Future Evolution 的启用语义 | Release Scope、Release Gate 与验收证据、实施状态、环境 Promotion 与 Profile 选择 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 服务端授权判定、Session、Super Admin 与 Bootstrap 边界，以及 Production Promotion Approval 的审批资格 Contract | V0.2 访问治理闭环的 Release Scope、Release Gate、验收证据与激活边界 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement、WorkItem、人工 Gate、Decision、Acceptance 与 Artifact 业务状态 Contract | V0.3 人工交付闭环的 Release Scope、Release Gate、验收证据与激活边界 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 受控执行的目标 Contract：Run/Attempt、不可变 Execution Binding、Child 状态与评测工具链 | Child Type 与 Agent Capability 的阶段选择、激活状态与 Release 验收 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | Activation Gate 必须证明的隔离物化、fenced lease、容量准入与恢复 Contract | 当前阶段选定的有效 Capacity Profile，以及正式 Sandbox 的 Release 选择与验收记录 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | 交付链路必须证明的 GitLab Binding、MR 与 `IntegrationBaselineEvidence` Contract | 当前阶段的实施状态、Capability 激活状态与 Release 验收记录 |
| [06 平台应用与集成](./06-platform-application-integration.md) | Capability Activation Gate 必须证明的应用与集成 Contract：Operations Read Model、Console Access、安全公告与跨模块一致性 | 实施阶段、Capability 激活状态、Release 验收与 Profile 选择 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | 组件数据、一致性与恢复必须证明的 Contract | 当前阶段的 Capability 激活状态、Release 验收记录与 Capacity Profile 选择 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Capability Activation Gate 必须证明的 Security Floor、恢复顺序与 Restore 证据 | 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Provisioning Gate、物理不变量、容量准入与环境恢复证据 | 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择 |
| [10 Configuration Governance](./10-configuration-governance.md) | Configuration Capability 必须证明的签名、Lineage、High-water、Divergence 与 Publish 验收 Contract，以及 `CapabilityActivationRecord` 的持久化 | 实施阶段、Capability 激活状态、Release 验收与 Profile 选择 |
| [11 架构基线](./11-architecture-baseline.md) | Release Gate 与 Capability Activation Gate 的分类语义、验证维度与 Gate 失败处置规则 | 各 Release 的 Scope、前置依赖、验收证据、Promotion 结果与 Profile 选择 |
| [参数附录](./appendix-parameters.md) | 容量场景、Profile 数值、分阶段采购计划、Evolution Trigger 阈值与上线前验证证据清单 | 每个 Profile 的 Release 归属、选择时点与验收状态 |
