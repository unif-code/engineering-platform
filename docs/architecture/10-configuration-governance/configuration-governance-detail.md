# Configuration Governance 详细说明

> 文档层级：L2 规范事实源
> 对应主文：[Configuration Governance](./configuration-governance.md)

## 1. 目的与边界

本文是 Configuration Catalog、Typed Configuration 生命周期、兼容演进、Effective Snapshot 与跨环境 Promotion 的唯一规范事实源。它定义通用 Draft、Publish、Rollback、Rebase、Promotion、Lineage 与 Divergence 协议；各领域模块拥有本模块的 Namespace、Typed Schema、默认值、约束、Reader/Migrator、解析器、业务解释与对应 Policy 数据，不得另行建立平行配置协议。

Configuration 是 Python Control Plane 模块化单体中的独立领域模块，不是独立 Deployable 或既有微服务。Web、Control Plane 装配、Port/Adapter、External Provider、Operations Read Model、Console 与安全公告由[平台应用与集成](../06-platform-application-integration/platform-application-integration-detail.md)拥有；Super Admin、`platform.configuration.manage`、TOTP Challenge 与恢复资格由[身份、组织与授权](../01-identity-organization-authorization/identity-organization-authorization-detail.md)拥有；通用 Audit Envelope、WORM、Retention 与安全保护由[安全、审计与治理](../08-security-audit-governance/security-audit-governance-detail.md)拥有。

“唯一 owner”指 Catalog、通用生命周期协议、状态语义、跨环境治理和公开 Configuration Facade 只有一个事实来源，不表示把所有 Namespace 数据集中到一个数据库 Schema。每个领域模块仍在自己的模块 Schema 中拥有本 Namespace 的 Draft、Published Version、Active Pointer、Policy Snapshot 与迁移，并负责在本模块事务内完成校验、切换 Pointer、Outbox 与 Audit；Configuration 模块拥有 Catalog 注册元数据、跨模块索引以及 Promotion Case、Lineage、Rebind、Divergence 等治理数据，并只通过已注册的 Application Facade/Port 编排领域 owner。它不得直写其他模块表，跨模块或跨 Scope 的 ChangeSet 不形成全局事务。

## 2. Catalog、分类与 Schema

其他领域通过稳定 Port 消费 Effective Policy，不得另行定义 Draft、Publish、Rollback、Promotion 或 Divergence 状态。Configuration Catalog 只聚合已注册 Schema，禁止通用 Key/Value、任意 JSON、SQL、表达式或脚本编辑器。配置分类固定为：

| 分类 | 权威事实与通道 | 应用边界 |
| --- | --- | --- |
| `PLATFORM_POLICY` | 对应模块 PostgreSQL；受控后台发布 | 可产生 Effective Snapshot |
| `GITOPS_CONFIG` | Git/Helm/Manifest | 后台只读，变更走 GitOps |
| `SYSTEM_INVARIANT` | 代码、数据库约束、安全规则 | 只读且不可降级 |

分类不可通过 Catalog Metadata 降级或改写；Derived/Observed 值不是第四类配置。每项注册定义至少声明稳定 Key、模块、分类、Value Type、Unit/Timezone、Default/Initial Desired、Min/Max、Enum/Allowlist、依赖、允许 Scope、继承/合并、Source of Truth、Change Channel、Effect Semantics、Promotion Mode、Rollback Value、Redaction 与弃用迁移规则。Scope 只按 Schema 明示开放；Workspace 只能在 Platform 允许的边界内覆盖或收紧，不能假定任意 Key 自动支持多级覆盖。Effect Semantics 只能取 `IMMEDIATE`、`NEW_OBJECT`、`NEXT_SCHEDULE`、`NEW_ATTEMPT`、`RESTART`、`ROLLOUT`、`RECREATE` 等受控枚举；复杂 Object 由所属模块提供受约束编辑模型。Feature Toggle 只能控制已实现并注册的行为，不得用开关凭空建立新 Provider、Runtime、身份或信任边界。Secret、Token、密码、Access Key、TOTP Secret、Private Key 和可直接使用的认证材料不进入 Catalog、Draft、Bundle、Audit 或 PostgreSQL，只保存稳定用途、Reference、Fingerprint、版本、轮换与健康元数据。

只有当前有效 Super Admin 可通过 [01 的 `platform.configuration.manage`](../01-identity-organization-authorization/identity-organization-authorization-detail.md) 与 Platform 授权 Scope 管理 `PLATFORM_POLICY`；配置目标 Scope 可以是 Platform，也可以是 Typed Schema 明确允许的 Workspace，但管理权限始终是 Platform 级 Super Admin 权限。该能力不授予领域成员身份，也不绕过 Capability、Assignment、Human Gate、GitOps、OpenBao 或任何 `SYSTEM_INVARIANT`。`GITOPS_CONFIG` 只关联 Desired/Effective/Drift 与 Git/Helm Revision；`SYSTEM_INVARIANT` 不存在 Draft、Publish 或普通回滚入口。

## 3. Draft、Owner 与归档

`DRAFT` 是不参与运行时解析和 Effective Policy 的候选；创建、编辑、校验失败与归档均进入 Audit，不得记作已发布变化。相同模块 Namespace + Scope 可并存多个互不阻塞且不共享可变内容的 Draft；每个 Draft 固定记录独立 Draft ID、Base Active Policy Version、Schema Revision、Content Hash、Draft Revision/ETag、Owner 与 `lastMeaningfulActivityAt`。每个 Draft 同时只有一个 Owner，且只有仍有效的 Super Admin Owner 可编辑、手工归档、校验、Apply Rebase 或发起 Publish；任何写命令都校验 Draft Revision/ETag。

其他有效 Super Admin 只能查看、比较、Clone，或填写原因并以 ETag 条件执行 Takeover。Clone 创建新 Draft ID、独立内容和新 Owner，保留来源 Draft/Version/Base，但不继承 Validation、Impact Preview 或 TOTP；Base 过期时仍须 Rebase。Takeover 原子切换 Owner、提升 Revision、使既有 Validation、Preview 与 Challenge 失效并写 Audit；旧 Owner 的旧 Revision 写入返回 Conflict。Owner 失效不会发布或删除 Draft，只能由相同 Takeover Contract 接管。

Draft 生命周期为 `DRAFT → ARCHIVED`，不物理删除或原地恢复。连续 30 天无 Meaningful Activity 自动归档；30 天是版本化 `PLATFORM_POLICY` 的默认值，由 Super Admin 修改并按 `NEXT_SCHEDULE` 生效，不得写死在 Frontend、任务或镜像。Meaningful Activity 仅包括创建/修改内容、Apply Rebase、Takeover 和重新执行服务端校验；查看、列表刷新、Diff/Preview 与健康检查不刷新时间。后台展示最后活动时间、按当前 Policy 计算的预计归档时间及归档来源。

Configuration 受控任务以 Workload Identity 执行幂等归档，并以 Draft ID、状态、Revision/ETag、Owner、`lastMeaningfulActivityAt` 做条件更新；扫描后发生有效活动即跳过本次归档，Policy Version、Cutoff 与处理结果进入 Audit。`ARCHIVED` 是不可变只读记录，禁止编辑、校验、Rebase、Takeover 或 Publish，并使 Validation、Preview、Content Hash Binding 与 Challenge 失效；归档不改变 Active Pointer，无需 Publish TOTP，但必须写 Outbox/Audit 并通知 Owner，Owner 不可用时通知当前 Super Admin。任何有效 Super Admin 只能从 Archived Draft Clone 新 Draft；`clonedFromArchivedDraftId`、来源 Revision/Base、全部 Draft Revision、Clone/Takeover/Rebase 链和 Audit 永久保留。`STALE` 表示 Base 过期，`ARCHIVED` 表示只读生命周期，管理后台分别筛选 Active、Stale 与 Archived。

## 4. ChangeSet、发布、快照与回滚

`Configuration ChangeSet` 是 `PLATFORM_POLICY` 的最小发布原子单位，只属于一个模块 Namespace 和一个 Scope，可包含多个已注册且允许用于该 Scope 的 Key。模块以当前 Active Policy 和 Scope 继承结果组装完整 Candidate，对跨字段约束统一校验；任一 Key 失败则整个 ChangeSet 不生效。跨模块或跨 Scope 使用独立 ChangeSet、版本与补偿结果，只可关联到同一运维记录，不形成全局事务。

所属模块必须执行服务端校验，至少覆盖类型、范围、Enum/Allowlist、Min/Max、跨字段依赖、Scope 继承、当前授权、Security Floor、Effect Semantics、Schema Compatibility 与基础设施 Envelope；Frontend 校验不是门禁。成功 Validation 绑定整个 ChangeSet 的 Draft Content Hash、Schema Revision、模块 + Scope Active Policy Version、上级 Scope/外部 Envelope 等依赖版本及结果；Candidate、Schema、Base 或依赖版本任一变化，Validation、Impact Preview、Divergence Review Decision 和待发布 Hash Binding 立即失效。Impact Preview 必须展示前后值、影响 Scope、继承与当前 Effective Value、受影响的后续对象/调度、运行中对象影响、缓存失效、传播范围及不可逆或额外处置，不得只给未解释 JSON Diff。

Publish 是独立的单人受控命令。每次 Publish 或 Rollback 都重新检查当前 Super Admin、`platform.configuration.manage`、Platform Scope、账号状态、Base/依赖版本和并发条件，要求填写原因并完成全新的 TOTP Challenge；当前 Session 的既往 MFA 不可复用，Audit 只保存再认证结果、时间与强度。发布不使用管理员自标记的风险等级，也不要求第二人批准。

Publish 只支持立即激活。最终校验与 TOTP 通过后，所属模块在单个数据库事务内再次核对授权、Content Hash、Schema Revision、Base、依赖与全部约束，写入不可变 Published Version 和完整 ChangeSet，原子切换 Active Pointer，并写 Transactional Outbox 与 Audit；`publishedAt` 与 `activatedAt` 使用同一服务端事务时间。不存在已 Published 但未 Active 的中间版本、客户端生效时间或预约队列；事务失败不改变 Active Policy，重试必须重新检查全部门禁。立即激活只改变权威解析 Snapshot，实际对象影响仍由各 Key 的 Effect Semantics 决定。

Publish 使用 Optimistic Concurrency。每个模块 Namespace + Scope 同时只有一个 Active Published Policy Version，成功 ChangeSet 生成该边界单调递增的新版本；Base Active Policy Version 不再是当前版本时返回 Conflict 并保留 Draft，禁止后写覆盖先写。其他 Draft 不删除，但 Base 过期后标记 `STALE` 且不得复用旧 Validation。其他模块或 Scope 只在被声明为依赖时使校验失效。

Published Version 保存规范化、带 Snapshot Hash 的完整不可变 `Policy Snapshot`，运行时读取 Active Snapshot，不回放 Delta；历史同时保留 Schema Revision、ChangeSet、前后值、发布人、原因、Preview、Validation 与时间线。Platform Snapshot 物化该 Revision 下全部适用 Key 及解析后的默认值；Workspace Snapshot 则完整保存每个可覆盖 Key 的 `INHERIT` 或 `OVERRIDE(normalizedValue)`，以及校验时父 Platform Version。当前 Effective Policy 由 Active Platform Snapshot + Active Workspace Override Snapshot 解析，历史事实记录两者组成的 Composite Effective Revision。父版本变化触发 Workspace 缓存失效与重新解析，不伪造 Workspace Published Version。

需要冻结语义的 Requirement、Gate、Attempt、Artifact、Upload Session 或调度对象在建立时保存模块解析的 Effective Value/Snapshot 与 Composite Revision，后续发布不得改写。Outbox 驱动缓存失效并投影消费者已观察版本、传播延迟与异常；安全敏感写操作遇到未知、陈旧或不可解析版本时回源或拒绝。传播失败不修改 Published Version，也不得无 Audit 自动切回旧值。

Rollback 不移动旧 Active Pointer，也不编辑历史 Version；它以选定的不可变 Published Snapshot 创建带 `rollbackFromVersion` 的新 Draft，按当前 Schema 迁移后重新经历 Validation、Impact Preview、授权、全新 TOTP 与 Publish，形成更高版本。旧值不再满足 Schema、依赖或 Security Floor 时回滚必须拒绝。Policy 的 Publish/Rollback 只按 Effect Semantics 影响对象；Session 撤销、Model 停用、Attempt 取消或 Artifact 隔离使用各领域显式安全命令。

## 5. Stale Draft、Rebase 与 Schema 演进

### 5.1 Schema-aware Three-way Rebase

Stale Draft 只能在同一模块 Namespace + Scope 内由服务端进行 `Schema-aware Three-way Rebase`：以不可变 Base Snapshot、当前 Active Snapshot 和 Draft Candidate 分别计算 Base→Current 与 Base→Draft，并按 Typed Schema 稳定逻辑路径比较 Canonical Normalization。三者 Schema Revision 不同则先经模块注册的 Versioned Reader/Migrator 归一；缺少确定性迁移路径、Snapshot Hash 不匹配或任一输入不可解析时 Fail Closed。

自动合并只接受可证明无冲突的结果：仅 Current 修改保留 Current，仅 Draft 修改保留 Draft，双方规范化结果相同采用该值；同一逻辑值在双方产生不同结果时必须由 Owner 选择 Current、Draft 或符合 Typed Schema 的新值，禁止 Last-write-wins 或强制覆盖。Boolean、Number、Enum、Duration 等按稳定 Key 比较；List、Allowlist 与复杂 Object 默认整 Key 原子，只有所属模块提供确定性 Typed Merger 时才允许细粒度合并。合并后仍须通过完整模块校验。

Rebase 分为只读 Preview 与显式 Apply。Preview 绑定 Base/Current/Draft Version、Snapshot/Content Hash、Schema Revision 和 Draft Revision/ETag，并逐项展示三方值、候选与冲突原因；Apply 再检查 Owner、Super Admin 状态、ETag 与 Current Active Version，任一输入变化都返回 Conflict。Apply 生成新 Draft Revision、把 Base 更新为当时 Current Version，保留自动合并、人工选择和前后 Base 的 Draft History/Audit，并使既有 Validation、Impact Preview、Content Hash Binding 与 TOTP 全部失效；Rebase 不修改 Active Policy，也不自动 Publish，Apply 后必须重新完成服务端校验、Impact Preview 与全新 Publish TOTP。若 Current 再变化，Draft 重新进入 `STALE`。

### 5.2 Configuration Schema 兼容演进

Configuration Schema、Policy Snapshot 与应用版本必须执行 `EXPAND → MIGRATE/PUBLISH → CONTRACT`：

1. `EXPAND`：先部署同时读取当前与目标 Schema Revision 的版本，只增加 Key、Alias、Reader、Validator 或确定性 Migrator，不删除旧 Key、不改变旧值语义；目标 Snapshot 发布前行为保持旧 Policy 语义。
2. `MIGRATE/PUBLISH`：模块从旧不可变 Snapshot 生成 Typed Migration Draft，展示 Key Mapping、新增值、弃用项、行为变化、目标 Revision 与 Diff；每个模块 + Scope 仍按普通 ChangeSet 完成完整校验、Preview、原因、TOTP、Publish 与 Audit。Platform Scope 先完成兼容迁移，Workspace Draft 绑定明确父 Platform Version；多 Workspace 可批次编排，但各自独立原子发布。
3. `CONTRACT`：只有全部 Active Platform/Workspace Snapshot 已迁移、全部运行消费者声明支持目标 Revision、传播/读取验证通过，且部署回滚不会启动不支持当前 Snapshot 的旧镜像后，才可删除旧 Reader、Alias、Validator 或 Key。历史 Snapshot 不改写，由版本化 Reader/Migrator 用于历史查询与受控回滚。

模块必须声明每个应用版本支持的 Schema Revision 范围；Configuration Publish Gate 与 Kubernetes Rollout Gate 同时核对 Active Snapshot、目标版本和回滚镜像的支持范围，不兼容即阻止并展示模块、Scope、Snapshot Version、Revision 与修复动作。启动、Readiness 与普通请求不得自动创建 Published Version、切换 Pointer 或写回迁移；自动化只能生成 Draft、只读扫描和建议。无法解析 Active Snapshot、Hash 不一致或 Revision 越界时 Fail Closed、Readiness 失败并告警，禁止回退代码默认值、旧缓存或部分 Key；滚动升级期间必须保留兼容实例。迁移、扫描、阻断、覆盖率与 Contract 清理进入 Audit/Observability。

## 6. DEV→PROD Promotion

DEV→PROD 只传递从 DEV 不可变 `PLATFORM_POLICY` Published ChangeSet 选择出的签名 Typed Change Intent。Promotion 不复制 PostgreSQL、数据库备份、Draft、运行时缓存、业务数据或 Secret，不建立 DEV→PROD 数据库连接、内部写 API、共享凭据、运行时读取或自动同步；Super Admin 在同一管理应用的 DEV 实例导出 Canonical JSON Bundle，并在独立 PROD 实例主动导入。

Bundle Manifest 至少包含 Format Version、全局 Bundle ID、Source Environment、稳定且不可复用的 Source Lineage ID、导出人/原因/服务端 UTC 时间、源应用版本、`issuedAt`、`notAfter`、完整性与签名信息；Item 至少包含稳定 Item ID、模块 Namespace、Source Scope Selector、Source Published Version、事务生成的严格单调 Source Published Sequence、Schema Revision、Base/Result Snapshot Hash、ChangeSet、规范化 Changed Keys 与前后摘要。Bundle 只表达 Base→Published 的变更意图；PROD 以自身 Active Snapshot 为基线应用明确 Changed Keys，未触及 Key 保持 PROD 当前值，源 Snapshot 不得成为 PROD Active Pointer。

每个 Key 的 Promotion Mode 由模块 Schema 固定为：`PORTABLE` 携带规范化值；`TARGET_REQUIRED` 只携带逻辑用途和源值摘要，并要求 PROD Reference Mapping；`BLOCKED` 不进入 Bundle。Workspace、Model Deployment、Provider、Project、Repository、Connector、Secret Reference 等引用必须使用稳定逻辑标识，禁止传 DEV 数据库 ID 或假设两环境 ID 相同。尚未完成目标映射时 Item 为 `MAPPING_REQUIRED`；目标不存在、类型/Scope 不符或映射不唯一时保持 `BLOCKED`。Promotion 不自动创建资源、不把 Workspace Override 提升为 Platform Scope。Secret 仅可用 `TARGET_REQUIRED` 用途绑定 PROD 本地 OpenBao Reference，并校验存在性、最小权限与健康，不传源值、Version 或 Lease。

DEV 使用 OpenBao 中不可导出的专用非对称 Promotion Signing Key，对 Canonical Manifest 与 Items 整体签名；Bundle 记录 Key ID、算法、Public Key Fingerprint、Payload SHA-256 与 Signature。PROD 只通过版本化 `GITOPS_CONFIG` 信任 DEV Public Key/Key ID，不持有共享 HMAC。格式、Canonical Hash、Signature、Source Environment、Lineage 或信任链任一无效时，在创建 Draft 前 Fail Closed 并记录拒绝 Audit；OpenBao、Signer、Canonicalization 或签名 Audit 不可用时 DEV Export 同样 Fail Closed。

Bundle 首次导入有效期默认 30 天；该期限是版本化 `PLATFORM_POLICY`，按 `NEW_OBJECT` 只影响后续导出，PROD 当前 Import Policy 可缩短但不可越过签名覆盖的 `notAfter`。首次成功验签并创建 Promotion Case 必须发生在 `notAfter` 前；过期 Bundle 不得续期或改写。有效期内创建的 Case、Draft 或 Published Version 不因 Bundle 后续到期失效，分别继续遵循 Draft 归档、Stale/Rebase、Publish 与 PROD Rollback Contract。

Signing Key 生命周期为 `PENDING → ACTIVE → VERIFY_ONLY → RETIRED`，DEV 同时只有一个 Active Signer，PROD 可在轮换窗口信任多个未撤销 Public Key。轮换顺序固定为：DEV OpenBao 生成新 Key Version；GitOps 先加入 PROD Trust Store；验签 Canary；切换 DEV Active Signer；旧 Key 进入 `VERIFY_ONLY`；待其最后 Bundle 超过 `notAfter` 与允许时钟偏差后移出活动 Trust Set 并 `RETIRED`。Key ID 不得原地换 Material；Retired Key 的 Fingerprint、算法、有效期和撤销状态作为只读历史验证材料保留，但不接受新的首次导入。

疑似泄露的 Key 立即停止签名并经紧急 GitOps 标记 `REVOKED`。PROD 拒绝该 Key 所有尚未首次导入的 Bundle；由其创建但未 Published 的 Case/Draft 转为安全阻断并要求用新 Key 从可信 DEV Version 重导。已 Published PROD Version 不自动回滚，而是产生 Critical 安全事件，列出 Bundle、Draft、发布人、Scope 与回滚入口。Key 创建、Trust Store 变更、Canary、切换、Verify-only、Retire、Revoke、过期拒绝和受影响 Case 都进入关联 Audit/Observability；Private Key Material 永不进入 PostgreSQL、Git、Bundle、日志或管理后台。

## 7. Import、Lineage、Rebind 与 Divergence

### 7.1 PROD Import、来源与顺序保护

当前有效 Super Admin 完成 Bundle 验证后创建 Promotion Case 并固化不可变 Manifest、Item、源 Hash 与签名证据，再按模块 Namespace + 目标 Scope 创建由导入人拥有的独立 PROD Draft；Bundle 可关联多个 Draft，但每个 Item 独立显示 Imported、Mapping Required、Blocked、Draft、Published 或 Failed，不形成跨模块/Scope 事务。Case 状态只能用带时间、操作者和原因的追加事件演进。Imported Draft 遵循普通 Owner、ETag、Takeover、Archive、Clone、Rebase、Validation、Preview、全新 Publish TOTP 与立即激活；Owner 可编辑目标 Schema 允许的已注册 `PLATFORM_POLICY` Key，但不得改写 Bundle/Item ID、Source Environment、Signature、Source Hash、模块 Namespace 或目标 Scope，不得注入未知 Key、Secret 明文、`GITOPS_CONFIG` 或 `SYSTEM_INVARIANT`，也不回写 DEV。改投 Scope 必须归档原 Draft，并从同一 Case 建立保留来源链的新 Item/Draft，重新做 Scope/Reference Mapping 与完整校验。

PROD Import 核对 Bundle Format、模块注册、Schema 支持范围、源应用兼容性、Promotion Mode、Scope/Reference Mapping、Item 完整性和当前基础设施 Envelope，再以 PROD Active Snapshot 生成 Candidate，并重新校验 PROD Schema、Security Floor、Scope 继承、跨字段约束、Reference Health 与 Effect Semantics；DEV Validation 不复用。Import、Mapping 与 Candidate 修正只产生 Draft，不改变 Active Policy，也不执行 Publish TOTP；全新 TOTP 只在最终 Publish 统一校验。管理后台并排展示 DEV Source、Imported Intent、PROD Current、Final Candidate、Origin Label、Override Reason 与预计影响。`Bundle ID + Item ID` 是幂等导入键，重复上传返回既有 Case 与结果；再次尝试只能从既有 Item 显式 Clone 新 Draft 并保留来源链，不得改写 ID 规避 Audit。签名/格式错误拒绝整包；已通过整包验证的 Bundle 中，单 Item 的 Schema、Mapping 或 Envelope 错误只阻断该 Item。

服务端按最终规范化 Candidate 计算不可由 Frontend 提交的逐 Key Origin Label：`PROMOTED_UNCHANGED` 表示 Portable Intent 未变，`TARGET_MAPPING` 表示 Target-required Reference 已在 PROD 解析，`PROD_OVERRIDE` 表示修改/移除 Portable Intent、选择不同 Current、加入 PROD-only/Blocked 后本地允许的非 Secret Key 或其他偏离。每个 `PROD_OVERRIDE` 在 Validation 前必须逐 Key 关联原因、操作者与时间；任何 Candidate 编辑使既有 Validation、Preview 与 Hash Binding 失效。Published Version 永久保存 Bundle/Item ID、DEV Source Version、Source Snapshot Hash、Origin Label 与 Override Reason；Clone/Rebase 继承来源链并重新计算 Label。

DEV 按 `Source Lineage ID + 模块 Namespace + Source Scope` 保存由 Published 事务生成的严格单调 Source Published Sequence，以及 Source Version、Snapshot Hash 和逐 Key Intent Hash；它不是时间戳、导出顺序或用户编号。PROD 按目标模块 + Scope + Key 保存最近成功 Promotion Publish 的 Lineage High-water Mark，包含 Lineage ID、Sequence、Source Version 与规范化 Intent Hash；只有 PROD Publish 成功的事务事实可前移该可重建投影，Import、Draft、Validation 或失败 Publish 不得前移。

完成验签、Schema 与 Mapping 后逐 Key 比较 High-water Mark：较小 Sequence 为 `SOURCE_SUPERSEDED`；相同 Sequence + 相同 Intent Hash 为 `SOURCE_ALREADY_PUBLISHED` 并返回既有来源链；相同 Sequence + 不同 Hash 为 `SOURCE_LINEAGE_CONFLICT` 并 Fail Closed；更大 Sequence 或无 Mark 才可继续。同一 Item 任一 Changed Key 命中前三种结果即整体不可发布，不得裁掉冲突 Key；在最终 Publish 事务内必须再次比较最新 Mark，并使并发落后的 Validation、Preview、Review Decision 与 TOTP 失效。PROD Rollback 不降低或重写 High-water Mark，旧 Bundle 不能充当回滚通道。

Source Lineage ID 在同一 DEV 世代的节点替换、升级、迁移、备份恢复、灾难恢复与 Signing Key 轮换中保持不变；Lineage、下一 Sequence 与 Published Version/Hash 连续性进入加密备份和恢复演练，缺失、回退或不一致时 Export Fail Closed。真正换源必须创建 `Source Lineage Rebind Case`：GitOps 声明旧/新 Lineage、授权模块/Scope、旧 Mark 与新 Baseline 摘要、旧/新 Signer 和原因，先把新 Lineage/Public Key 加入 `PENDING` Trust；PROD Super Admin 再导入签名的完整非 Secret Baseline，按模块 + Scope 独立完成 Mapping、Schema、Security Floor、Hash、Divergence、Preview、全新 TOTP 与 Publish，成功后初始化新 Mark 并切换 `ACTIVE`。

Rebind 生效期间目标单元进入 `REBINDING`：旧 Lineage 未 Published 的 Item/Draft/Mapping/Validation/Review/TOTP 转为只读 `SOURCE_LINEAGE_RETIRED`，新 Lineage 在 Baseline Publish 前不得提交增量。计划迁移要求旧 Signer 的 Transition Statement 与新 Signer 对同一切换内容的签名；旧源确实不可用时走记录恢复证据和安全原因的 Emergency Rebind，并完成全部目标单元 Baseline Reconciliation。每个单元切换后旧 Lineage `RETIRED`、新 Lineage `ACTIVE`；历史 Version、Mark、Key、Divergence 与 Audit 不改写。尚无单元切换成功时可经新 GitOps Review 取消 Rebind，但冻结 Draft 不复活；已切换任一单元后只能完成剩余单元或创建新 Rebind Case。

### 7.2 Promotion Divergence Review

Configuration 模块维护可从 Published Version、逐 Key Provenance 与 Outbox 重建的 `Promotion Divergence Projection`，回答 PROD 当前值为何不同于 `Latest Published DEV Intent Known to PROD`。该比较基线仅在有效 Bundle 对应 Item 已在 PROD 成功 Published 后前移；上传、Case、Mapping、Draft 或 Validation 不改变它。Projection 是只读查询加速层，不是配置事实源、跨环境同步服务或独立领域状态；Lag/Build Failure 必须可见且可安全重建，不影响 Active Policy 读取。

`PROMOTED_UNCHANGED` 不产生 Divergence，`TARGET_MAPPING` 的环境专属解析也不因目标 ID 或 Secret Reference 不同产生 Divergence；成功 Published 的 `PROD_OVERRIDE` 为相同模块 + Scope + Key 创建或更新唯一当前 `ACTIVE` Divergence，PROD-only/Blocked 后本地值使用 Absent/Non-portable 基线。每次相关 Promotion、普通 PROD Publish 或 Rollback 都按 Canonical Normalization/不可逆摘要重算：等价则转 `RESOLVED`，否则保持/更新 `ACTIVE`；历史 Published Version、原因和演进不删除。Secret 与敏感 Reference 仅显示 Redacted Metadata 或安全摘要。

新有效 DEV Intent 在完成 Scope/Reference Mapping 后触及同 Key 的 `ACTIVE` Divergence 时，该 Key 进入 `DIVERGENCE_REVIEW_REQUIRED`，任一 Key 未仲裁则 Item/Draft 同名阻断。Owner 必须逐 Key 基于 Previous Published DEV Intent、New Imported Intent、Current PROD Active Value、现有原因和版本差异显式选择：`ACCEPT_NEW_DEV`、`KEEP_CURRENT_PROD` 或 `SET_NEW_PROD_VALUE`。即使新 Intent 与 Current PROD 等价也必须显式选择；前者记录选择但不产生 Override Reason，后两者保持 `PROD_OVERRIDE` 并要求针对本次 Intent 的新原因，旧原因不得静默继承。

Review Decision 绑定 Previous/New Intent Hash、Current PROD Version/Value Hash、Schema Revision、Scope 和 Draft ETag；Bundle、PROD Publish/Rollback、Schema、Mapping、Rebase 或 Draft 内容任一变化都使 Decision 失效并返回 Review Required。Review 只是 Draft 编辑，不额外要求 TOTP；全部仲裁只生成 Candidate，只有完整 PROD Validation、Impact Preview 与最终 Publish 成功后才更新 Provenance/Projection 并 `RESOLVED` 或刷新 `ACTIVE`，失败不改变现有 Divergence。

`Promotion Divergence` 表示成功发布的有意环境差异，不等同 GitOps Drift、Reference Health、Kubernetes 故障或 Validation 失败，不触发自动回滚、DEV 回写、双向同步或故障告警。`Configuration → Promotion → Environment Differences` 仅向 Super Admin 提供只读查询，至少展示模块、Scope、Key、DEV Source Version、最近已知 DEV Intent、PROD Active Value、Override Reason、Published By、首次/最近变化时间与 `ACTIVE/RESOLVED`；Active 数量只能作为信息状态，历史记录保留可筛选。

`GITOPS_CONFIG` 继续通过 Git/Helm Review、Merge 与 Reconcile 提升，`SYSTEM_INVARIANT` 继续通过代码、数据库约束或受控架构变更演进；二者不得进入 Platform Policy Promotion Bundle。DEV Export 与 PROD Import、Mapping、Draft、Rebase、Review、Publish、Reject、Rollback 和 Rebind 分别记录 Audit，并通过 Bundle ID、Item ID、Source Snapshot Hash 与 PROD Published Version 关联；PROD Rollback 只使用本地不可变 Snapshot，不重新导入 DEV Bundle，也不反向修改 DEV。

## 8. Audit Trigger 与业务摘要

本节只汇总前述生命周期已经要求的 Audit Trigger，不新增独立审批或发布门禁。必须通过 08 的可靠 Audit Contract 记录 Draft 创建、编辑、校验失败、Takeover、Clone 与 Archive，Publish/Rollback 的再认证结论与事务结果，Rebase 的前后 Base 和选择，Schema 迁移、扫描、阻断、覆盖率与 Contract 清理，以及 Promotion Export/Import、Mapping、Draft、Rebase、Review、Publish、Reject、Rollback、Key 生命周期、High-water 冲突和 Rebind。成功 Validation 与 Impact Preview 作为最终 Published Version 的不可变发布证据保存；仅执行只读 Preview 不另行产生强制 Audit Trigger。业务摘要至少包含 Configuration/Draft/ChangeSet/Published Version/Bundle/Item/Scope 的稳定标识、动作、结果、原因、前后版本、Policy/Schema Revision、Content/Snapshot Hash 与关联 Correlation ID。

Audit 不得包含 Secret、Token、密码、Access Key、TOTP Secret、Private Key、完整敏感配置值或可直接使用的认证材料。01 owner 提供 Actor 的当前授权与再认证结论；08 owner 补充通用 Actor、Environment、时间、可靠提交、脱敏、WORM 与 Retention 语义。本模块不能以 Projection、通知或普通应用日志代替安全 Audit。

## 9. 不变量

1. Configuration Catalog 只聚合已注册 Typed Schema，禁止通用 Key/Value、任意 JSON、SQL、表达式或脚本编辑器。
2. `PLATFORM_POLICY`、`GITOPS_CONFIG` 与 `SYSTEM_INVARIANT` 的分类、事实通道和可变性不能由 Catalog Metadata 降级。
3. 每个 Published Version 与 Effective Snapshot 都不可变、可追溯并绑定准确 Schema、Scope、Hash 与发布事实；运行对象按 Contract 冻结适用 Snapshot。
4. Publish、Rollback、Rebase、Promotion、Rebind 与 Divergence 均使用服务端权限、版本、并发、Hash 和安全门禁，Frontend 不能形成权威结论。
5. DEV 与 PROD 不建立运行时配置同步、共享数据库、共享凭据或反向写入；Promotion 只传递签名、Typed、可验证的 Change Intent。
6. Source Lineage、High-water Mark、Signing Key 与 Divergence 历史不能因恢复、轮换、回滚或重新导入而静默重置或改写。
7. Configuration 始终是模块化单体中的独立领域模块；文档 owner 拆分不产生新的 Deployable 或微服务。
