# Configuration Governance

> 实施阶段、Capability 激活状态、Release 验收与 Reliability/Capacity Profile 选择见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题定义 Configuration Catalog、Typed Configuration 的通用生命周期（Draft、ChangeSet、Validation、Impact Preview、Publish、Rollback）、Schema 兼容演进、不可变 Effective Snapshot，以及 DEV→PROD Bundle Promotion、Source Lineage 与 Promotion Divergence 协议。Typed Schema、仅 Super Admin 管理、服务端 Validation、Publish、不可变 Effective Snapshot、可靠 Audit 与 Rollback 是基础生命周期；Draft Takeover、Schema-aware Three-way Rebase、DEV→PROD Bundle Promotion、Lineage High-water 与 Divergence Review 是增强 Contract，未启用增强能力时不得以简化实现绕过基础生命周期。

Configuration 位于 Control Plane 仓库（`engineering-platform-backend`）的 `control_plane/app/modules/configuration/`，是 Python Control Plane 模块化单体中的独立领域模块，不是独立 Deployable 或微服务。本文拥有 Catalog 注册元数据、跨模块索引、通用生命周期协议与状态语义，以及 Promotion Case、Lineage、Rebind、Divergence 等跨环境治理数据和公开 Configuration Facade；各领域模块拥有本 Namespace 的 Typed Schema、默认值、约束、Reader/Migrator、解析器、业务解释与 Policy 数据。Web 与 Control Plane 装配属于 [06](./06-platform-application-integration.md)，Super Admin 与命令资格属于 [01](./01-identity-organization-authorization.md)，Audit Envelope、WORM 与 Retention 属于 [08](./08-security-audit-governance.md)，Typed Configuration 的 PostgreSQL 持久化基线属于 [07](./07-data-messaging-storage.md)，物理容量与 `GITOPS_CONFIG` Desired State 属于 [09](./09-infrastructure-operations.md)。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)。

精确参数不在正文：Draft 自动归档等待期与 Promotion Bundle 首次导入有效期见[参数附录的 Platform Policy Key](./appendix-parameters.md#platform-policy-key)，Promotion 顺序保护返回的结构化原因码见[参数附录的错误码](./appendix-parameters.md#错误码)。

## 核心模型

### 生命周期概览

```text
Typed Schema + Active Snapshot
→ Draft / Clone / Takeover
→ Validation + Impact Preview
→ Publish（不可变新版本并立即激活）
→ Effective Snapshot + Outbox

Base 过期 → Stale → Schema-aware Three-way Rebase
Rollback → 从历史 Snapshot 创建新 Draft → 重新发布更高版本
```

### 配置分类

| 分类 | 权威事实与通道 | 应用边界 |
| --- | --- | --- |
| `PLATFORM_POLICY` | 对应模块 PostgreSQL；受控后台发布 | 可产生 Effective Snapshot |
| `GITOPS_CONFIG` | Git/Helm/Manifest | 后台只读，变更走 GitOps |
| `SYSTEM_INVARIANT` | 代码、数据库约束、安全规则 | 只读且不可降级 |

每项注册定义至少声明稳定 Key、模块、分类、Value Type、Unit/Timezone、Default/Initial Desired、Min/Max、Enum/Allowlist、依赖、允许 Scope、继承/合并、Source of Truth、Change Channel、Effect Semantics、Promotion Mode、Rollback Value、Redaction 与弃用迁移规则。Effect Semantics 只能取 `IMMEDIATE`、`NEW_OBJECT`、`NEXT_SCHEDULE`、`NEW_ATTEMPT`、`RESTART`、`ROLLOUT`、`RECREATE` 等受控枚举；复杂 Object 由所属模块提供受约束编辑模型。

### 状态集

```text
Draft：            DRAFT → ARCHIVED（STALE 表示 Base 过期，不是生命周期终态）
Promotion Item：   Imported | Mapping Required | Blocked | Draft | Published | Failed
Promotion Signing Key： PENDING → ACTIVE → VERIFY_ONLY → RETIRED / REVOKED
Source Lineage：   PENDING → ACTIVE → RETIRED；Rebind 期间目标单元为 REBINDING
Divergence：       ACTIVE ↔ RESOLVED
```

### Promotion Mode 与 Origin Label

Promotion Mode 由模块 Schema 为每个 Key 固定，决定该 Key 能否进入 Bundle；Origin Label 由服务端按最终规范化 Candidate 逐 Key 计算，Frontend 不能提交：

| Promotion Mode | 含义 |
| --- | --- |
| `PORTABLE` | 携带规范化值 |
| `TARGET_REQUIRED` | 只携带逻辑用途与源值摘要，并要求 PROD Reference Mapping |
| `BLOCKED` | 不进入 Bundle |

| Origin Label | 含义 | 是否产生 Divergence |
| --- | --- | --- |
| `PROMOTED_UNCHANGED` | Portable Intent 未变 | 否 |
| `TARGET_MAPPING` | Target-required Reference 已在 PROD 解析 | 否（环境专属解析不算差异） |
| `PROD_OVERRIDE` | 修改/移除 Portable Intent、选择不同 Current，或加入 PROD-only 与 Blocked 后本地允许的非 Secret Key | 是（每个 Key 唯一当前 `ACTIVE` Divergence） |

## 关键不变量

- Configuration Catalog 只聚合已注册 Typed Schema，禁止通用 Key/Value、任意 JSON、SQL、表达式或脚本编辑器——只有类型化、可校验的配置才能作为受控输入。
- `PLATFORM_POLICY`、`GITOPS_CONFIG` 与 `SYSTEM_INVARIANT` 的分类、事实通道与可变性不能由 Catalog Metadata 降级或改写，Derived/Observed 值也不是第四类配置——分类决定了变更通道，能被改写的分类等于没有通道。
- Scope 只按 Schema 明示开放，Workspace 只能在 Platform 允许的边界内覆盖或收紧，不得假定任意 Key 自动支持多级覆盖——覆盖能力必须是显式设计而非默认继承。
- Feature Toggle 只能控制已实现并注册的行为，不得用开关凭空建立新 Provider、Runtime、身份或信任边界——开关不是实现，也不是授权。
- Secret、Token、密码、Access Key、TOTP Secret、Private Key 与可直接使用的认证材料不进入 Catalog、Draft、Bundle、Audit 或 PostgreSQL，只保存稳定用途、Reference、Fingerprint、版本、轮换与健康元数据——配置面一旦承载凭据就成为新的泄露面。
- 只有当前有效 Super Admin 可通过 [01](./01-identity-organization-authorization.md) 的 `platform.configuration.manage` 与 Platform 授权 Scope 管理 `PLATFORM_POLICY`；目标 Scope 可以是 Platform 或 Schema 明确允许的 Workspace，但管理权限始终是 Platform 级，且不授予领域成员身份，也不绕过 Capability、Assignment、Human Gate、GitOps、OpenBao 或任何 `SYSTEM_INVARIANT`——配置权限是治理权限，不是业务成员资格。
- `GITOPS_CONFIG` 只关联 Desired/Effective/Drift 与 Git/Helm Revision，`SYSTEM_INVARIANT` 不存在 Draft、Publish 或普通回滚入口——后台不能成为绕过 Git Review 与代码约束的第二通道。
- 其他领域只通过稳定 Port 消费 Effective Policy，不得另行定义 Draft、Publish、Rollback、Promotion 或 Divergence 状态——平行的配置协议会立刻产生第二事实源。
- 各领域模块在自己的模块 Schema 中保存本 Namespace 的 Draft、Published Version、Active Pointer、Policy Snapshot 与迁移，并在本模块事务内完成校验、切换 Pointer、Outbox 与 Audit；Configuration 只通过已注册 Application Facade/Port 编排领域 owner，不直写其他模块表；跨模块或跨 Scope 的 ChangeSet 使用独立版本与补偿结果，只可关联到同一运维记录，不形成全局事务——治理集中而数据分治，才不需要跨模块事务；分布式原子性不可伪造，只能显式补偿。
- `DRAFT` 不参与运行时解析与 Effective Policy；创建、编辑、校验失败与归档都进入 Audit，但不记作已发布变化——候选状态不得影响运行，也不得被误读为已生效。
- 相同模块 Namespace + Scope 可并存多个互不阻塞、不共享可变内容的 Draft，每个 Draft 固定记录 Draft ID、Base Active Policy Version、Schema Revision、Content Hash、Draft Revision/ETag、Owner 与 `lastMeaningfulActivityAt`——并行编辑必须靠版本标识而不是靠互斥锁。
- 每个 Draft 同时只有一个 Owner，只有仍有效的 Super Admin Owner 可编辑、归档、校验、Apply Rebase 或发起 Publish，任何写命令都校验 Draft Revision/ETag——所有写入都要能定位到一个当前有效的责任人。
- 其他有效 Super Admin 可查看、比较、Clone，或填写原因并以 ETag 条件执行 Takeover；Takeover 原子切换 Owner、提升 Revision，并使既有 Validation、Impact Preview 与 TOTP Challenge 失效，旧 Owner 的旧 Revision 写入返回 Conflict——接管必须留痕，且不得继承接管前的校验结论。
- Clone 创建新 Draft ID、独立内容与新 Owner 并保留来源 Draft/Version/Base，但不继承 Validation、Preview 或 TOTP，Base 过期时仍须 Rebase；Owner 失效不会自动发布或删除 Draft，只能由相同 Takeover Contract 接管——复制内容不等于复制已通过的门禁；账号变化不应产生未经审批的发布或静默丢失候选。
- Draft 生命周期为 `DRAFT → ARCHIVED`，不物理删除也不原地恢复；连续无 Meaningful Activity 达到 Policy 期限时自动归档，该期限是版本化 `PLATFORM_POLICY`（默认值见[参数附录](./appendix-parameters.md#platform-policy-key)）并按 `NEXT_SCHEDULE` 生效，不得写死在 Frontend、任务或镜像；后台展示最后活动时间、按当前 Policy 计算的预计归档时间与归档来源，并分别筛选 Active、Stale 与 Archived——归档是可审计的状态迁移，不是删除，其期限也必须可治理。
- Meaningful Activity 仅包括创建/修改内容、Apply Rebase、Takeover 与重新执行服务端校验；查看、列表刷新、Diff/Preview 与健康检查不刷新时间；归档由 Configuration 受控任务以 Workload Identity 幂等执行，并按 Draft ID、状态、Revision/ETag、Owner 与最后活动时间做条件更新，扫描后发生有效活动即跳过，Policy Version、Cutoff 与处理结果进入 Audit——浏览不应无限延长陈旧候选的寿命；后台任务不得与人工编辑竞态覆盖。
- `ARCHIVED` 是不可变只读记录，禁止编辑、校验、Rebase、Takeover 或 Publish，并使 Validation、Preview、Content Hash Binding 与 Challenge 失效；归档不改变 Active Pointer、无需 Publish TOTP，但必须写 Outbox/Audit 并通知 Owner 或当前 Super Admin；任何有效 Super Admin 只能从 Archived Draft Clone 新 Draft，`clonedFromArchivedDraftId`、来源 Revision/Base、全部 Draft Revision 与 Clone/Takeover/Rebase 链永久保留——只读终态加通知，才能既保留历史又不惊动运行配置；恢复工作必须走新候选，来源链不可断。
- `Configuration ChangeSet` 是 `PLATFORM_POLICY` 的最小发布原子单位，只属于一个模块 Namespace 与一个 Scope；模块以当前 Active Policy 和 Scope 继承结果组装完整 Candidate 并统一校验跨字段约束，任一 Key 失败则整个 ChangeSet 不生效——半生效的配置比未发布更危险。
- 服务端校验至少覆盖类型、范围、Enum/Allowlist、Min/Max、跨字段依赖、Scope 继承、当前授权、Security Floor、Effect Semantics、Schema Compatibility 与基础设施 Envelope，Frontend 校验不是门禁——客户端结论无法约束服务端写入。
- 控制 Capability 启用边界的 Feature Toggle 还必须核验其引用的当前有效 `CapabilityActivationRecord`（见[架构基线](./11-architecture-baseline.md)），Record 缺失或失效时发布失败——未通过 Activation Gate 的能力不能被一个开关打开。
- 成功 Validation 绑定 Draft Content Hash、Schema Revision、模块 + Scope Active Policy Version 与全部依赖版本；Candidate、Schema、Base 或依赖版本任一变化都立即使 Validation、Impact Preview、Divergence Review Decision 与待发布 Hash Binding 失效；Impact Preview 必须展示前后值、影响 Scope、继承与当前 Effective Value、受影响的后续对象与调度、运行中对象影响、缓存失效、传播范围及不可逆或额外处置，不得只给未解释的 JSON Diff——校验结论只对被校验过的那个组合成立；发布者要能预见后果才谈得上批准。
- Publish 与 Rollback 是独立的单人受控命令：每次都重新检查当前 Super Admin、`platform.configuration.manage`、Platform Scope、账号状态、Base/依赖版本与并发条件，要求填写原因并完成全新 TOTP Challenge，当前 Session 的既往 MFA 不可复用，Audit 只保存再认证结果、时间与强度；发布不使用管理员自标记的风险等级，也不要求第二人批准——高权限写入必须逐次证明“此刻仍是本人且仍被授权”；门禁由服务端规则决定，不由发布者自评。
- Publish 只支持立即激活：所属模块在单个数据库事务内再次核对授权、Content Hash、Schema Revision、Base、依赖与全部约束，写入不可变 Published Version 与完整 ChangeSet，原子切换 Active Pointer，并写 Transactional Outbox 与 Audit，`publishedAt` 与 `activatedAt` 使用同一事务时间；事务失败不改变 Active Policy，重试必须重新检查全部门禁；立即激活只改变权威解析 Snapshot，实际对象影响仍由各 Key 的 Effect Semantics 决定——不存在已 Published 但未 Active 的中间版本、客户端生效时间或预约队列；发布的原子性与生效语义是两件独立的事。
- Publish 使用 Optimistic Concurrency：每个模块 Namespace + Scope 同时只有一个 Active Published Policy Version，成功 ChangeSet 生成该边界内单调递增的新版本，Base 不再是当前版本时返回 Conflict 并保留 Draft，禁止后写覆盖先写；其他 Draft 不删除但标记 `STALE` 且不得复用旧 Validation，其他模块或 Scope 只在被声明为依赖时才使校验失效——并发发布只能靠版本比较解决，不能靠时间顺序。
- Published Version 保存规范化、带 Snapshot Hash 的完整不可变 `Policy Snapshot`，运行时读取 Active Snapshot 而不回放 Delta，历史同时保留 Schema Revision、ChangeSet、前后值、发布人、原因、Preview、Validation 与时间线——可回溯的完整快照才能支撑审计与回滚。
- Platform Snapshot 物化该 Revision 下全部适用 Key 与解析后的默认值，Workspace Snapshot 完整保存每个可覆盖 Key 的 `INHERIT` 或 `OVERRIDE(normalizedValue)` 及校验时的父 Platform Version；当前 Effective Policy 由两者解析，历史事实记录 Composite Effective Revision；父 Platform 版本变化触发 Workspace 缓存失效与重新解析，不伪造 Workspace Published Version——继承关系必须被显式记录，否则历史值无法重建；只有真实发布才产生版本。
- 需要冻结语义的 Requirement、Gate、Attempt、Artifact、Upload Session 与调度对象在建立时保存模块解析的 Effective Value/Snapshot 与 Composite Revision，后续发布不得改写——已经开始的工作必须按当时规则完成。
- Outbox 驱动缓存失效并投影消费者已观察版本、传播延迟与异常；安全敏感写操作遇到未知、陈旧或不可解析版本时回源或拒绝，传播失败不修改 Published Version，也不得无 Audit 自动切回旧值——异步传播只加速，不产生第二事实源。
- Rollback 不移动旧 Active Pointer，也不编辑历史 Version：它以选定的不可变 Published Snapshot 创建带 `rollbackFromVersion` 的新 Draft，按当前 Schema 迁移后重新经历 Validation、Impact Preview、授权、全新 TOTP 与 Publish，形成更高版本；旧值不再满足 Schema、依赖或 Security Floor 时回滚必须拒绝；Policy 的 Publish/Rollback 只按 Effect Semantics 影响对象，Session 撤销、Model 停用、Attempt 取消与 Artifact 隔离必须使用各领域显式安全命令——回滚是一次新的受审发布，不是把历史改回去；配置回滚不是应急止损开关。
- Stale Draft 只能由服务端在同一模块 Namespace + Scope 内执行 `Schema-aware Three-way Rebase`：以不可变 Base Snapshot、当前 Active Snapshot 与 Draft Candidate 计算 Base→Current 与 Base→Draft，并按 Typed Schema 稳定逻辑路径比较 Canonical Normalization；Schema Revision 不同时先经模块注册的 Versioned Reader/Migrator 归一，缺少确定性迁移路径、Snapshot Hash 不匹配或输入不可解析时 Fail Closed——无法确定语义的合并必须停下而不是猜。
- 自动合并只接受可证明无冲突的结果（仅一侧修改保留该侧、双方规范化结果相同采用该值），同一逻辑值产生不同结果时必须由 Owner 显式选择 Current、Draft 或符合 Schema 的新值，禁止 Last-write-wins 或强制覆盖；List、Allowlist 与复杂 Object 默认整 Key 原子，只有模块提供确定性 Typed Merger 时才允许细粒度合并——冲突要交给人，而不是交给时间戳。
- Rebase 分为只读 Preview 与显式 Apply：Preview 绑定三方版本、Snapshot/Content Hash、Schema Revision 与 Draft ETag 并逐项展示冲突原因，Apply 再检查 Owner、Super Admin 状态、ETag 与 Current Active Version，任一输入变化返回 Conflict；Apply 生成新 Draft Revision、把 Base 更新为当时 Current Version，保留自动合并与人工选择的 Draft History/Audit，并使既有 Validation、Preview、Hash Binding 与 TOTP 全部失效；Rebase 不修改 Active Policy 也不自动 Publish，若 Current 再变化则 Draft 重新进入 `STALE`——预览不是承诺，Apply 必须重新证明前提；合并后的候选是新对象，必须重新走完门禁。
- Configuration Schema、Policy Snapshot 与应用版本必须执行 `EXPAND → MIGRATE/PUBLISH → CONTRACT`：先部署同时读取当前与目标 Revision 且只增不删的版本（目标 Snapshot 发布前行为保持旧 Policy 语义），再由模块从旧不可变 Snapshot 生成 Typed Migration Draft 并展示 Key Mapping、新增值、弃用项、行为变化与 Diff，按普通 ChangeSet 完成校验、Preview、原因、TOTP、Publish 与 Audit，最后才在全部 Active Snapshot 已迁移、全部运行消费者声明支持目标 Revision、传播/读取验证通过且回滚镜像也支持当前 Snapshot 后删除旧 Reader、Alias、Validator 或 Key——先收缩后迁移会让回滚镜像读不到当前配置。
- Platform Scope 先完成兼容迁移，Workspace Draft 绑定明确父 Platform Version；多 Workspace 可批次编排但各自独立原子发布；历史 Snapshot 不改写，只能由版本化 Reader/Migrator 用于历史查询与受控回滚——继承链必须自上而下推进；迁移不得回溯篡改既有事实。
- 模块必须声明每个应用版本支持的 Schema Revision 范围，Configuration Publish Gate 与 Kubernetes Rollout Gate 同时核对 Active Snapshot、目标版本与回滚镜像的支持范围，不兼容即阻止并展示模块、Scope、Snapshot Version、Revision 与修复动作——配置与代码必须双向兼容才允许前进或回退。
- 启动、Readiness 与普通请求不得自动创建 Published Version、切换 Pointer 或写回迁移，自动化只能生成 Draft、只读扫描与建议；无法解析 Active Snapshot、Hash 不一致或 Revision 越界时 Fail Closed、Readiness 失败并告警，禁止回退代码默认值、旧缓存或部分 Key，滚动升级期间必须保留兼容实例——运行时不能悄悄改变权威配置；用默认值顶替未知配置等于用错误配置运行。
- DEV→PROD 只传递从 DEV 不可变 `PLATFORM_POLICY` Published ChangeSet 选出的签名 Typed Change Intent，不复制 PostgreSQL、备份、Draft、运行时缓存、业务数据或 Secret，也不建立 DEV→PROD 数据库连接、内部写 API、共享凭据、运行时读取或自动同步——Promotion 是一次带签名的意图搬运，不是环境互联。
- Bundle Manifest 至少包含 Format Version、Bundle ID、Source Environment、稳定且不可复用的 Source Lineage ID、导出人/原因/服务端 UTC 时间、源应用版本、`issuedAt`、`notAfter`、完整性与签名信息；Item 至少包含 Item ID、模块 Namespace、Source Scope Selector、Source Published Version、事务生成的严格单调 Source Published Sequence、Schema Revision、Base/Result Snapshot Hash、ChangeSet、规范化 Changed Keys 与前后摘要——只有自描述且可验证的 Bundle 才能跨环境被信任。
- Bundle 只表达 Base→Published 的变更意图：PROD 以自身 Active Snapshot 为基线应用明确 Changed Keys，未触及的 Key 保持 PROD 当前值，源 Snapshot 不得成为 PROD Active Pointer——两个环境的完整状态从不相等，只有变更意图可以迁移。
- Workspace、Model Deployment、Provider、Project、Repository、Connector 与 Secret Reference 等引用必须使用稳定逻辑标识，禁止传 DEV 数据库 ID 或假设两环境 ID 相同；尚未完成目标映射时 Item 为 `MAPPING_REQUIRED`，目标不存在、类型/Scope 不符或映射不唯一时保持 `BLOCKED`；Promotion 不自动创建资源，也不把 Workspace Override 提升为 Platform Scope；Secret 只能以 `TARGET_REQUIRED` 用途绑定 PROD 本地 OpenBao Reference 并校验存在性、最小权限与健康，不传源值、Version 或 Lease——跨环境引用只能显式映射，不能靠巧合对上；凭据永不跨环境流动。
- DEV 使用 OpenBao 中不可导出的专用非对称 Promotion Signing Key 对 Canonical Manifest 与 Items 整体签名并记录 Key ID、算法、Public Key Fingerprint、Payload SHA-256 与 Signature，PROD 只通过版本化 `GITOPS_CONFIG` 信任 DEV 公钥而不持有共享 HMAC——非对称签名让 PROD 只需验证能力，不需要签发能力。
- 格式、Canonical Hash、Signature、Source Environment、Lineage 或信任链任一无效时，在创建 Draft 前 Fail Closed 并记录拒绝 Audit；OpenBao、Signer、Canonicalization 或签名 Audit 不可用时 DEV Export 同样 Fail Closed——不可验证的 Bundle 不允许进入任何环境。
- Bundle 首次导入有效期是版本化 `PLATFORM_POLICY`（默认值见[参数附录](./appendix-parameters.md#platform-policy-key)），按 `NEW_OBJECT` 只影响后续导出，PROD 当前 Import Policy 可缩短但不可越过签名覆盖的 `notAfter`；过期 Bundle 不得续期或改写，有效期内已创建的 Case、Draft 与 Published Version 不因 Bundle 后续到期失效——签名覆盖的时间窗是硬边界，但已成立的事实不被追溯撤销。
- DEV 同时只有一个 Active Signer，PROD 可在轮换窗口信任多个未撤销公钥；轮换顺序固定为生成新 Key Version、先加入 PROD Trust Store、验签 Canary、切换 DEV Active Signer、旧 Key 进入 `VERIFY_ONLY`、待其最后 Bundle 超过 `notAfter` 与允许时钟偏差后移出活动 Trust Set 并 `RETIRED`；Key ID 不得原地换 Material——先信任后切换的重叠期让轮换既不中断验证也不放宽验证。
- 疑似泄露的 Key 立即停止签名并经紧急 GitOps 标记 `REVOKED`：PROD 拒绝其所有尚未首次导入的 Bundle，由其创建但未 Published 的 Case/Draft 转为安全阻断并要求用新 Key 从可信 DEV Version 重导，已 Published 的 PROD Version 不自动回滚而产生 Critical 安全事件并列出 Bundle、Draft、发布人、Scope 与回滚入口；Private Key Material 永不进入 PostgreSQL、Git、Bundle、日志或管理后台，Retired Key 只保留 Fingerprint、算法、有效期与撤销状态作为只读历史验证材料且不接受新的首次导入——撤销要立即阻断新影响，但不能用自动回滚制造第二次事故；历史可验证不需要保留签发能力。
- PROD Import 先核对 Bundle Format、模块注册、Schema 支持范围、源应用兼容性、Promotion Mode、Scope/Reference Mapping、Item 完整性与当前基础设施 Envelope，再以 PROD Active Snapshot 生成 Candidate 并重新校验 PROD Schema、Security Floor、Scope 继承、跨字段约束、Reference Health 与 Effect Semantics，DEV Validation 一律不复用——校验必须发生在将要生效的环境里。
- Import、Mapping 与 Candidate 修正只产生 Draft，不改变 Active Policy 也不执行 Publish TOTP，全新 TOTP 只在最终 Publish 统一校验；Imported Draft 遵循普通 Owner、ETag、Takeover、Archive、Clone、Rebase、Validation、Preview 与立即激活语义；Promotion Case 状态只能以带时间、操作者与原因的追加事件演进，管理后台并排展示 DEV Source、Imported Intent、PROD Current、Final Candidate、Origin Label、Override Reason 与预计影响——导入不是发布，Promotion 也不额外发明一套发布通道。
- Imported Draft 的 Owner 可编辑目标 Schema 允许的已注册 `PLATFORM_POLICY` Key，但不得改写 Bundle/Item ID、Source Environment、Signature、Source Hash、模块 Namespace 或目标 Scope，不得注入未知 Key、Secret 明文、`GITOPS_CONFIG` 或 `SYSTEM_INVARIANT`，也不回写 DEV；改投 Scope 必须归档原 Draft 并从同一 Case 建立保留来源链的新 Item/Draft——本地调整可以，但来源证据不可被改写。
- `Bundle ID + Item ID` 是幂等导入键：重复上传返回既有 Case 与结果，再次尝试只能从既有 Item 显式 Clone 新 Draft 并保留来源链，不得改写 ID 规避 Audit；签名/格式错误拒绝整包，而已通过整包验证的 Bundle 中单 Item 的 Schema、Mapping 或 Envelope 错误只阻断该 Item——幂等键把重试收敛为同一事实，故障隔离粒度则尽量小。
- 每个 `PROD_OVERRIDE` 在 Validation 前必须逐 Key 关联原因、操作者与时间，任何 Candidate 编辑都使既有 Validation、Preview 与 Hash Binding 失效；Published Version 永久保存 Bundle/Item ID、DEV Source Version、Source Snapshot Hash、Origin Label 与 Override Reason，Clone/Rebase 继承来源链并重新计算 Label——环境差异必须是有据可查的选择，而不是漂移。
- DEV 按 `Source Lineage ID + 模块 Namespace + Source Scope` 保存由 Published 事务生成的严格单调 Source Published Sequence 及 Source Version、Snapshot Hash 与逐 Key Intent Hash，它不是时间戳、导出顺序或用户编号；PROD 按目标模块 + Scope + Key 保存最近成功 Promotion Publish 的 Lineage High-water Mark，只有 PROD Publish 成功的事务事实可前移该可重建投影，Import、Draft、Validation 或失败 Publish 都不得前移，PROD Rollback 也不降低或重写它——只有事务生成的单调序列才能防重放与回退；高水位必须由已生效的事实推进，否则它保护不了任何顺序。
- 完成验签、Schema 与 Mapping 后逐 Key 比较 High-water Mark：更小 Sequence、相同 Sequence 与相同 Intent Hash、相同 Sequence 与不同 Intent Hash 分别返回对应结构化原因（见[参数附录的错误码](./appendix-parameters.md#错误码)），其中 Hash 冲突 Fail Closed；同一 Item 任一 Changed Key 命中即整体不可发布，不得裁掉冲突 Key，最终 Publish 事务内还必须再次比较最新 Mark 并使并发落后的 Validation、Preview、Review Decision 与 TOTP 失效；旧 Bundle 不能充当回滚通道，PROD Rollback 只使用本地不可变 Snapshot，不重新导入 DEV Bundle，也不反向修改 DEV——顺序保护只有在提交那一刻仍成立才有意义；回滚是本环境的行为，不是重新走一次跨环境流程。
- Source Lineage ID 在同一 DEV 世代的节点替换、升级、迁移、备份恢复、灾难恢复与 Signing Key 轮换中保持不变，Lineage、下一 Sequence 与 Published Version/Hash 的连续性进入加密备份与恢复演练，缺失、回退或不一致时 Export Fail Closed——静默重置的世系等于放弃全部顺序保护。
- 真正换源必须创建 `Source Lineage Rebind Case`：GitOps 声明旧/新 Lineage、授权模块与 Scope、旧 Mark 与新 Baseline 摘要、旧/新 Signer 与原因并先把新 Lineage/公钥加入 `PENDING` Trust，再由 PROD Super Admin 导入签名的完整非 Secret Baseline，按模块 + Scope 独立完成 Mapping、Schema、Security Floor、Hash、Divergence、Preview、全新 TOTP 与 Publish，成功后初始化新 Mark 并切换 `ACTIVE`——换源是受审的重建，不是把新序列接到旧世系上。
- Rebind 期间目标单元进入 `REBINDING`：旧 Lineage 未 Published 的 Item/Draft/Mapping/Validation/Review/TOTP 转为只读 `SOURCE_LINEAGE_RETIRED`，新 Lineage 在 Baseline Publish 前不得提交增量；计划迁移要求旧 Signer 的 Transition Statement 与新 Signer 对同一切换内容的签名，旧源确实不可用时才走记录恢复证据与安全原因的 Emergency Rebind 并完成全部目标单元的 Baseline Reconciliation；尚无单元切换成功时可经新 GitOps Review 取消 Rebind，但冻结的 Draft 不复活；已切换任一单元后只能完成剩余单元或创建新 Rebind Case，且历史 Version、Mark、Key、Divergence 与 Audit 不改写——切换窗口内只允许一条可验证的来源路径；半完成的换源必须向前收敛，不能回到含混状态。
- `Promotion Divergence Projection` 可从 Published Version、逐 Key Provenance 与 Outbox 重建，只是只读查询加速层，不是配置事实源、跨环境同步服务或独立领域状态；其 Lag 与 Build Failure 必须可见且可安全重建，且不影响 Active Policy 读取；比较基线 `Latest Published DEV Intent Known to PROD` 仅在有效 Bundle 对应 Item 已在 PROD 成功 Published 后前移，上传、Case、Mapping、Draft 或 Validation 都不改变它——投影可以落后，但不能被当成事实；“PROD 知道的 DEV 意图”只能由 PROD 的发布事实定义。
- 每次相关 Promotion、普通 PROD Publish 或 Rollback 都按 Canonical Normalization 与不可逆摘要重算 Divergence：等价则转 `RESOLVED`，否则保持或更新 `ACTIVE`，历史 Published Version、原因与演进不删除，Secret 与敏感 Reference 只显示 Redacted Metadata 或安全摘要——差异状态必须由当前值推导，历史必须完整保留。
- 新有效 DEV Intent 触及同 Key 的 `ACTIVE` Divergence 时该 Key 进入 `DIVERGENCE_REVIEW_REQUIRED`，任一 Key 未仲裁则 Item/Draft 同名阻断；Owner 必须逐 Key 基于 Previous Published DEV Intent、New Imported Intent、Current PROD Active Value、现有原因与版本差异显式选择 `ACCEPT_NEW_DEV`、`KEEP_CURRENT_PROD` 或 `SET_NEW_PROD_VALUE`，即使新 Intent 与当前值等价也必须显式选择，后两者要求针对本次 Intent 的新原因而不得静默继承旧原因——覆盖决定必须在每次新意图上重新作出。
- Review Decision 绑定 Previous/New Intent Hash、Current PROD Version/Value Hash、Schema Revision、Scope 与 Draft ETag，任一输入变化即失效并返回 Review Required；Review 只是 Draft 编辑而不额外要求 TOTP，全部仲裁只生成 Candidate，只有完整 PROD Validation、Impact Preview 与最终 Publish 成功后才更新 Provenance/Projection 并 `RESOLVED` 或刷新 `ACTIVE`，失败不改变现有 Divergence——仲裁结论与它所依据的版本绑定，未发布的仲裁不改变任何事实。
- `Promotion Divergence` 表示成功发布的有意环境差异，不等同 GitOps Drift、Reference Health、Kubernetes 故障或 Validation 失败，也不触发自动回滚、DEV 回写、双向同步或故障告警；`Configuration → Promotion → Environment Differences` 只向 Super Admin 提供只读查询，至少展示模块、Scope、Key、DEV Source Version、最近已知 DEV Intent、PROD Active Value、Override Reason、Published By、首次/最近变化时间与 `ACTIVE`/`RESOLVED`，Active 数量只作为信息状态且历史记录保留可筛选——有意的差异不是故障，不应被自动“修复”。
- `GITOPS_CONFIG` 继续通过 Git/Helm Review、Merge 与 Reconcile 提升，`SYSTEM_INVARIANT` 继续通过代码、数据库约束或受控架构变更演进，二者不得进入 Platform Policy Promotion Bundle——每类配置只走它自己的变更通道。
- Draft 创建/编辑/校验失败/Takeover/Clone/Archive、Publish 与 Rollback 的再认证结论与事务结果、Rebase 的前后 Base 与选择、Schema 迁移与阻断、以及 Promotion 的 Export/Import/Mapping/Draft/Rebase/Review/Publish/Reject/Rollback/Key 生命周期/High-water 冲突/Rebind 都必须通过 [08](./08-security-audit-governance.md) 的可靠 Audit Contract 记录，并以 Bundle ID、Item ID、Source Snapshot Hash 与 PROD Published Version 关联；成功 Validation 与 Impact Preview 作为最终 Published Version 的不可变发布证据保存，只读 Preview 不另行产生强制 Audit Trigger——治理动作的可追溯性由证据链而不是操作记忆保证。
- Audit 与业务摘要不得包含 Secret、Token、密码、Access Key、TOTP Secret、Private Key、完整敏感配置值或可直接使用的认证材料，只保存稳定标识、动作、结果、原因、前后版本、Policy/Schema Revision、Content/Snapshot Hash 与 Correlation ID；本模块也不能以 Projection、通知或普通应用日志代替安全 Audit——审计要能追责，但不能变成新的泄露面。
- Frontend、脚本、旧缓存或 Projection 都不能自行决定当前有效配置，Publish、Rollback、Rebase、Promotion、Rebind 与 Divergence 的权限、版本、并发、Hash 与安全门禁一律在服务端判定——客户端可以展示结论，但不能产生结论。
- [12](./12-implementation-roadmap.md) 选择 Reliability/Capacity Profile，本文拥有已发布 Policy 的有效值与生命周期，[09](./09-infrastructure-operations.md) 只校验物理 Ceiling 与放置；Policy 只能在物理 Ceiling 内收紧，不能声明新增服务器或扩大 Capacity Profile——配置面与物理面各自独立收紧，才不会互相放宽。

## 与其他模块的关系

下表是本模块自身视角：10 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链各环节共同遵守的配置分类、版本、Effective Snapshot、兼容性演进与 DEV→PROD Promotion 协议 |
| [01 身份、组织与授权](./01-identity-organization-authorization.md) | 受保护配置命令的发起资格、`platform.configuration.manage`、TOTP Challenge 与恢复资格判定 | Draft、ChangeSet、Effective Snapshot 与 Promotion 的通用配置生命周期语义 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Gate 与 Artifact Namespace 的 Schema、默认值与业务解释 | Gate Policy 与 Artifact Policy 的 Draft、发布、回滚与 Effective Snapshot 生命周期 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | Agent 与 Model Namespace 的 Schema、默认值与业务解释 | Model、Route、Tool/Context/Network Policy 与执行等待期限的 Draft、发布、回滚与 Effective Snapshot 生命周期 |
| [04 Sandbox Runtime](./04-sandbox-runtime.md) | Sandbox Namespace 的 Schema、Policy Key、Minimum 与准入效果 | 准入 Policy 与 Resource/Runtime Profile 的 Draft、发布、回滚与 Effective Snapshot 生命周期 |
| [06 平台应用与集成](./06-platform-application-integration.md) | Control Plane 内 Configuration 模块的装配边界与 Effective Configuration 的消费方式 | Catalog、Draft、Publish、Rollback、Effective Snapshot、Schema 演进与 Promotion 生命周期 |
| [07 数据、消息与存储](./07-data-messaging-storage.md) | Typed Configuration、版本与 Activation Record 的 PostgreSQL 持久化基线 | Draft、Effective Snapshot 与 Promotion 的通用配置生命周期语义 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | 配置命令与 Policy 发布的安全边界、Audit 与 Break-glass 约束 | Draft、Effective Snapshot 与 Promotion 的通用配置生命周期语义 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | 基础设施 `GITOPS_CONFIG` Desired State，以及物理 Ceiling、放置与 Headroom 的校验结论 | 已发布 `PLATFORM_POLICY` 的 Effective Value、Snapshot 与通用配置生命周期语义 |
| [12 实施路线图](./12-implementation-roadmap.md) | 实施阶段、Capability 激活状态、Release 验收与 Profile 选择 | Configuration Capability 必须证明的签名、Lineage、High-water、Divergence 与 Publish 验收 Contract，以及 `CapabilityActivationRecord` 的持久化 |
| [参数附录](./appendix-parameters.md) | Draft 自动归档等待期、Promotion Bundle 首次导入有效期与 Promotion 结构化原因码 | 本文正文中的定性规则 |
