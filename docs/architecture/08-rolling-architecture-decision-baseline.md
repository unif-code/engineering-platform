# 完整架构决策基线

> 状态：完整架构基线（已批准，尚未进入开发 Spec / Plan）
> 版本：2026-08-06.173
> 最近更新：2026-08-06
> 适用范围：内部研发平台整体架构
> 目的：作为已批准的跨模块完整约束，供开发人员、运维人员与 Agent 准确理解目标架构

## 1. 使用方式与优先级

本文件是版本 `2026-08-06.173` 的已批准跨模块架构基线，不是后端开发 Spec、实施计划、API Schema 或数据库设计。

文档阅读与约束优先级为：

1. 本文件中的跨模块约束与细粒度 Contract；
2. `docs/architecture/00～07` 详细版中的模块内实施视图；
3. `docs/architecture/00～07` 精简版中的概要说明。

上述文档已经完成一致性审查。后续若再次出现冲突，应视为架构文档缺陷并阻止相关实施，先通过新版本统一修正；开发人员和 Agent 不得自行选择对自己方便的表述。

本版本只记录当前有效且已经批准的设计：

- 标为“已确认”的条目属于 `.173` 架构约束；
- 新提案、未决问题或实施期发现不得直接混入本版本成为事实，必须先形成新的受控架构修订并获得明确批准。

本文件以及其他架构 Markdown 只保留当前有效设计，不维护“旧规则 → 新规则”对照或废弃方案历史。跨模块约束以本文件集中表达，模块详版同步表达各自边界内的实现含义；任何后续架构变化都必须同时更新受影响文档并形成新的版本。

## 2. 跨模块治理模型

### 2.1 四层治理结构（已确认）

所有业务模块统一采用以下四层结构：

```text
System Invariant / Security Floor
→ Admin / Workspace Policy
→ Capability + Scope
→ Assignment
```

| 层级 | 作用 | 是否可由普通配置改变 |
| --- | --- | --- |
| System Invariant / Security Floor | 保护分支、审计不可篡改、Secret 隔离、人工 Gate 不可由 Agent 代签等系统底线 | 否 |
| Admin / Workspace Policy | 配置默认路由、候选范围、容量、保留期和允许的功能选项 | 只能在系统底线内调整 |
| Capability + Scope | 判断某个人是否有资格在某个资源范围执行动作 | 由有权管理员配置 |
| Assignment | 指定某项未完成责任当前由谁执行 | 可按规则显式转派 |

统一原则是：

> 可移交的是未完成责任，不是安全资格、系统事实或已经完成的动作。

### 2.2 岗位、Capability 与 Assignment（已确认）

- 经理、Leader、产品、前端、后端和管理员是组织岗位或人员分类，不是业务接口的直接授权条件。
- 岗位和组织关系可用于解析默认责任人、候选池或账号创建时的能力模板，但最终授权事实必须是 `Capability + Scope`。
- 账号创建界面可以按岗位预选能力，管理员最终通过勾选配置实际 Capability；岗位变化不得静默改写未完成 Assignment。
- Assignment 不授予 Capability。被指派人仍必须具备动作要求的 Capability、有效 Scope、Workspace Membership 和业务上下文条件。
- 当前责任人变化必须显式发生并写入 Audit；不能因为组织树或 Policy 改变而静默替换进行中的责任人。
- 已完成的 Decision、Approval、Attempt、Artifact 和 Audit 保留原 actor，不因后续转派或人员变动而改写。
- Agent、Webhook、定时任务、确定性检查等自动执行主体不使用 Human Assignment，也不能冒充人工审核人。

### 2.3 Policy 与历史版本（已确认）

- 默认分配策略必须版本化。
- Requirement、Gate 或 Attempt 创建时保存实际解析结果和 Policy 版本。
- Policy 更新默认只影响之后创建的对象，不静默改写已存在对象。
- Artifact version、bundle hash、Commit SHA 或 MR head SHA 变化时，与旧版本绑定的审核结果失效；历史记录仍保留。

### 2.4 Gate Policy 配置层级（已确认）

首版 Gate Policy 使用以下固定覆盖顺序：

```text
System Invariant
→ Platform Gate Policy
→ Workspace Gate Policy Override
→ Requirement Current Assignment
```

- Platform Policy 提供全平台默认值；只有 Super Admin 可以修改。
- Workspace 可以在系统允许范围内覆盖 Platform 默认值，但 Workspace Override 仍只能由 Super Admin 配置；Workspace Owner、受邀 Leader 和普通管理员不能自行修改。这里的 Workspace 表示 Policy 生效 Scope，不表示 Workspace 人员天然拥有配置权。
- Workspace 未配置覆盖时继承 Platform Policy，不复制一份静态配置。
- Requirement 不创建第三层 Policy，只保存 Policy 解析快照、默认责任人和可显式改派的 Current Assignment。
- 显式改派只影响该 Requirement 的未完成责任，不能修改 Platform/Workspace Policy，也不能绕过 Capability、Scope 或 System Invariant。
- 第一阶段不提供 Project Gate Policy；未来需要时可在相同解析契约中增加，不修改 Gate 或 Assignment 领域模型。

### 2.5 默认值、时间参数与配置边界（已确认）

- 本文件中所有使用“默认”描述的分钟、小时、天数、周期、TTL、Timeout、Grace Period、Retention、调度时间、重试次数和阈值都只是正式首发默认值，除非同一条明确标记为 System Invariant、协议硬约束或不可放宽的 Security Floor，否则都必须通过受控配置调整，禁止写死在领域代码、Frontend、镜像或临时脚本中。
- 产品行为参数由版本化 Typed Configuration Catalog 管理，并只允许 Super Admin 在平台管理后台调整；基础设施调度、Pod 资源、备份/Retention、安全阈值和组件原生参数由 Helm/GitOps 管理。平台动态 Policy 展示 Policy Version，GitOps 配置展示 Desired、Effective、Last Changed、Git/Helm Revision 与 Drift，不能把两种 Revision 混称为同一个 Policy Version；Super Admin 也不能通过平台后台直接修改 GitOps 配置或取得基础设施高权限凭据。两类可变配置都必须进入 Audit。
- 每个可配置参数必须声明 Unit、Default、Minimum、Maximum、依赖约束、作用范围、生效方式和回滚值；Duration 使用明确单位，Cron/Schedule 同时展示 UTC 与 `Asia/Shanghai`，禁止依赖容器或浏览器隐式时区。无效组合必须在发布或保存前拒绝，不能等运行时静默纠正。
- 配置变更必须版本化并记录操作者、原因、变更前后值与验证结果。默认只影响变更后新创建或新调度的对象；是否影响正在运行、已经进入 Retention、已签发 Token/URL 或已创建 Cleanup Eligibility 的对象，必须由该参数的明确生效语义决定，禁止无说明地追溯修改历史事实。
- Super Admin 只能在已批准范围内调整 `PLATFORM_POLICY`；突破 Scanner Envelope、缩短不可篡改保留期、放宽 Fail Closed、降低恢复目标或越过其他 Security Floor 的修改必须走受控架构/安全/GitOps 变更。管理后台即使展示这些值，也不能通过 Platform Policy 绕过底线。

### 2.6 Typed Configuration Catalog（已确认）

平台采用统一的 Typed Configuration Catalog 管理配置能力，但不建设可以任意填写 Key/Value 或自由编辑 JSON 的通用配置中心。统一表示统一的发现、展示、授权、版本、审计和生效语义；配置 Schema、默认值、校验和业务解释仍由所属领域模块负责。

Catalog 中的条目必须归入以下三类之一：

| 分类 | Source of Truth | 管理入口 | 典型内容 |
| --- | --- | --- | --- |
| `PLATFORM_POLICY` | 所属模块在 PostgreSQL 中拥有的版本化配置数据 | 仅 Super Admin 通过平台管理后台发布 | Session、Gate 路由、Artifact 配额与文件类型、Model/Agent Policy、公告调度等产品行为 |
| `GITOPS_CONFIG` | Git、Helm Values、Kubernetes Manifest 或组件声明式配置 | 平台管理后台只读展示，实际修改走受控 GitOps | Replica、CPU/Memory/PVC、备份与 Retention、Scanner Envelope、数据库/NATS/OpenBao/Ceph 参数等 |
| `SYSTEM_INVARIANT` | 领域代码、数据库约束、安全边界和经批准的架构规则 | 只展示名称、当前约束和理由，不提供编辑入口 | Capability 强制校验、Human Gate 不可代签、保护分支、Audit 不可篡改、Secret 隔离和 Fail Closed 等 |

- 分类本身不能由普通管理员修改。把一个条目从 `SYSTEM_INVARIANT` 降为可配置项，或把 `GITOPS_CONFIG` 改为平台直接写入，都属于架构与安全边界变更，必须重新评审，不能靠修改 Catalog Metadata 绕过。
- 本架构中的 Super Admin 是受保护的平台级管理身份，不是经理、Leader 或普通管理员等组织岗位，也不是业务接口中的字符串角色判断。配置命令统一校验只授予 Super Admin 的保留能力 `platform.configuration.manage` 与 Platform Scope；该能力不进入普通岗位模板、账号创建勾选项或一般 Capability 转授流程。模块不再为每类配置设计独立的 `*.policy.manage` 权限。
- `platform.configuration.manage` 只允许管理 `PLATFORM_POLICY`，不授予绕过 Capability、Assignment、Human Gate、业务状态 Guard、GitOps、OpenBao、Object Storage Break-glass 或其他 System Invariant 的万能权限。Super Admin 配置某个 Workspace Scope 的 Policy 时，仍然是在 Platform Scope 管理命令中指定生效范围，不会成为该 Workspace 的业务成员或责任人。
- `Derived/Observed` 值不是第四类配置。总容量、实测 RPO/RTO、资源合计、当前用量、健康状态和趋势等只读结果必须标记计算公式或数据来源，不允许把计算结果再作为一份可编辑配置形成双事实源。
- 每个模块拥有自己的配置 Namespace、Typed Schema、默认值、约束、解析器和验证器，例如 `identity.*`、`workflow.*`、`agent.*`、`artifact.*`。统一管理后台通过稳定的 Configuration Catalog Port 聚合描述与当前值，不跨模块解释或修改领域表。
- 简单 Boolean、Enum、Number、Duration、Schedule 和 String List 可以由管理后台根据 Schema 生成标准表单；复杂的 Gate Resolver、Model Route、File Type Policy 等由所属模块提供受约束的专用编辑模型。无论使用哪种界面，都不能退化为任意 JSON、SQL、表达式或脚本执行入口。
- 每个配置定义至少声明：稳定 Key、所属模块、Classification、Value Type、Unit/Timezone、Default 或 Initial Desired、Minimum、Maximum、Enum/Allowlist、依赖约束、允许 Scope、继承/合并方式、Source of Truth、Change Channel、Effect Semantics、Promotion Mode、Rollback Value、Redaction 标记和弃用迁移规则。`PLATFORM_POLICY` 的管理权限固定为 Super Admin，不再给每个 Key 配置可变的 Required Capability 或风险等级。
- Effect Semantics 必须从受控集合中明确选择，例如 `IMMEDIATE`、`NEW_OBJECT`、`NEXT_SCHEDULE`、`NEW_ATTEMPT`、`RESTART`、`ROLLOUT` 或 `RECREATE`；不能只写“动态生效”。需要保存历史解释能力的 Requirement、Gate、Attempt、Artifact、Upload Session 和调度任务必须记录解析后的 Effective Value 与 Revision/Policy Version。
- Platform Policy 的 Scope 由各配置 Schema 明确声明。首版多数产品配置只支持 Platform Scope；Gate 等已经确认需要覆盖的能力可以使用 Platform → Workspace 继承。Workspace 只能在 Platform 允许的边界内覆盖或收紧，不能假设每个配置都自动支持 Workspace/Project 多级覆盖。
- PostgreSQL 是 `PLATFORM_POLICY` 的权威事实源。运行时可以使用本地受限缓存，并通过 Transactional Outbox/事件通知使缓存失效；授权、安全或外部副作用写操作发现版本未知、缓存过期或配置不可解析时必须回源或拒绝，不能用陈旧值放宽权限。Frontend 返回的配置值、隐藏按钮或本地缓存永远不是授权事实。
- Feature Toggle 只能控制模块已经实现、注册并通过验证的行为；SSO、HR、Passkey、物理清除、Legal Hold、任意 Provider/Connector、任意 Runtime/Skill 等尚未实现或需要新信任边界的能力，不能通过添加一个开关假装可用。
- Secret、Token、Access Key、TOTP Secret、Private Key 和明文凭据不进入 Catalog。Catalog只保存稳定 Secret Reference、用途、版本、Fingerprint、轮换状态和健康元数据；正常在线 Workload Secret值继续由 OpenBao与对应 Workload Identity边界管理。已经明确为解除 Bootstrap/Recovery循环依赖而必须位于目标 Cluster外或离线保管的 OpenBao Share/Recovery Key、Ceph Recovery Bundle、Control Plane Recovery Bundle/Reader Identity/Private Key等材料继续服从各自更严格的恢复契约，不能为了“统一 Secret平台”重新塞回被保护 Cluster的 OpenBao；Catalog仍只能展示引用与健康状态。
- 配置发布、校验失败、生效、回滚、Drift、读取拒绝和迁移都必须记录操作者或 Workload Identity、原因、前后版本、影响 Scope 与验证结果。回滚创建新的版本指向已验证值，不删除或改写历史版本。
- 模块未来提取为独立微服务时，其 Configuration Schema、Policy 数据、解析器、验证器和 Audit 责任随模块一起迁移；管理后台仍通过同一 Catalog Contract 聚合，不要求其他业务模块或页面重新理解该模块的内部配置结构。

### 2.7 Platform Policy 发布与回滚（已确认）

`PLATFORM_POLICY` 采用受控单人发布模型，不使用“表单保存即生效”，第一阶段也不要求所有配置变化都经过双人审批。发布流程统一为：

```text
DRAFT
→ 服务端 Schema / 依赖 / Security Floor 校验
→ 影响预览与发布确认
→ PUBLISHED
```

- `DRAFT` 只表示尚未生效的候选版本，仅 Super Admin 可以创建、编辑和归档，不被运行时解析，也不能出现在 Effective Policy 中。Draft 的创建、编辑、校验失败和归档仍需 Audit，但不能伪装成已发布配置变化。
- 同一模块 Namespace + Scope 可以同时存在多个彼此独立的 Draft；每个 Draft 使用独立 ID、Base Active Policy Version、Schema Revision、Content Hash 和 Draft Revision/ETag，不设置“整个模块只能有一个 Draft”的全局锁。一个 Draft 不阻塞其他 Draft 的创建、编辑或发布，也不能共享可变内容。
- 每个 Draft 同时只能有一个当前 Owner，Draft Owner 是配置编辑责任人，不是 Workspace Owner 或组织岗位。除后述受控自动归档任务外，只有当前仍有效的 Super Admin Draft Owner 可以编辑、手工归档、校验和发起 Publish；其他 Super Admin 可以查看、比较或 Clone，但不能直接修改同一个 Draft。即使同一 Owner 在多个浏览器页编辑，每次写入也必须校验 Draft Revision/ETag，避免后写覆盖先写。
- Clone 创建新的 Draft ID 和新的独立内容副本，由执行 Clone 的 Super Admin 成为 Owner，并记录来源 Draft/Version；来源 Draft 的校验结果、影响预览和 TOTP Challenge 不得复制为有效凭据。Clone 保留来源 Base Version 以便准确比较；若该版本已经过期，新 Draft 必须先完成显式 Rebase 才能重新校验或发布。
- 其他有效 Super Admin 可以通过显式 Takeover 接管 Draft，但必须填写原因并通过 Draft Revision/ETag 并发校验。Takeover 原子切换 Owner、提升 Draft Revision、使既有校验/影响预览失效并写入 Audit；原 Owner 后续携带旧 Revision 的写入必须返回 Conflict。Takeover 本身不改变 Active Policy，因此不复用或替代 Publish 所要求的全新 TOTP Challenge。
- Draft Owner 失去 Super Admin 身份、账号被停用或不可用时，Draft 保留为不可编辑候选，不会自动发布或物理删除；另一个有效 Super Admin 可以通过相同 Takeover 流程接管。手工归档 Draft 只改变未生效候选的生命周期状态并记录 Audit，不影响任何 Published Snapshot、Active Pointer 或历史业务事实。
- Draft 生命周期首版使用 `DRAFT → ARCHIVED`，不设置超时物理删除。Draft 连续 30 天没有 Meaningful Activity 时自动转为 `ARCHIVED`，30 天是首发默认值；该期限属于版本化 `PLATFORM_POLICY`，只能由 Super Admin 修改，并遵循 `NEXT_SCHEDULE` 生效语义，禁止写死在 Frontend、定时脚本或镜像中。归档由 Configuration 模块的受控任务执行。
- Meaningful Activity 至少包括创建或修改候选内容、Apply Rebase、Takeover 以及重新执行服务端校验；只读查看、列表刷新、打开 Diff/Preview 或后台健康检查不刷新 `lastMeaningfulActivityAt`。管理后台必须展示最后有效活动时间、按当前 Policy 计算的预计归档时间和归档来源，避免通过页面轮询让废弃 Draft 永不归档。
- 自动归档必须以 Draft ID、状态、Draft Revision/ETag、Owner 和 `lastMeaningfulActivityAt` 做条件更新；扫描与提交之间发生任何编辑、Takeover、Rebase 或校验活动时必须跳过并在下次重新计算，不能归档正在被操作的新 Revision。任务必须幂等，并以 Workload Identity 记录 Policy Version、Cutoff、处理结果和 Audit。
- `ARCHIVED` Draft 是不可变只读记录，不能继续编辑、校验、Rebase、Takeover 或 Publish；归档会使此前的校验、影响预览、Content Hash 绑定和 TOTP Challenge 失效。归档不改变 Active Policy，因此手工或自动归档都不需要 Publish TOTP，但必须写入 Outbox/Audit，并通过平台消息能力通知原 Owner；Owner 已不可用时通知当前 Super Admin 列表。
- 首版不原地恢复 Archived Draft。任何有效 Super Admin 都可以从归档记录 Clone 新 Draft；新 Draft 使用新的 ID、Owner、Draft Revision 和校验生命周期，保留 `clonedFromArchivedDraftId` 与来源 Revision，并携带原候选内容及原 Base Version。若 Base 已过期，必须通过既定 Schema-aware Three-way Rebase 更新到当前 Active Version 后才能发布。
- Archived Draft、全部 Draft Revision、Rebase/Takeover/Clone 关系和 Audit 不因超时继续物理清除。Stale 表示 Base Version 已过期，Archived 表示生命周期只读，二者语义独立；管理后台分别筛选 Active、Stale 与 Archived Draft，不能把归档冒充发布、删除或校验成功。
- `PLATFORM_POLICY` 的最小发布单位是 `Configuration ChangeSet`，不是任意单个 Key。一个 ChangeSet 只能属于一个领域模块 Namespace 和一个目标 Scope，可以包含一个或多个相互关联的配置项；其中所有 Key 都必须已在该模块 Typed Schema 注册并允许用于该 Scope，禁止在同一 ChangeSet 中混合不同模块或不同 Scope。
- 同一模块、同一 Scope 内需要共同满足跨字段约束的配置应放入同一个 ChangeSet。所属模块以当前 Active Policy 和 Scope 继承结果为基线组装完整候选状态，对 ChangeSet 内所有变更统一校验、预览和发布；任一配置项失败时整个 ChangeSet 均不得生效，不能留下部分新值。
- 跨模块配置必须使用彼此独立的 ChangeSet 和版本分别发布，不提供跨模块数据库事务或伪装的全局原子发布。管理后台可以把相关 ChangeSet 关联到同一个运维变更记录并显示建议顺序，但必须明确展示每个模块的独立状态、失败与补偿结果，避免阻碍模块未来提取为微服务。
- 校验必须由所属模块在服务端执行，至少覆盖类型、范围、Enum/Allowlist、Min/Max、跨字段依赖、Scope 继承、Super Admin 当前授权、Security Floor、Effect Semantics 和当前基础设施 Envelope；Frontend 校验只改善体验，不能作为发布门禁。
- 每次成功校验都绑定整个 ChangeSet 的 Draft Content Hash、Schema Revision、当前模块与 Scope 的 Active Policy Version、依赖的上级 Scope/外部 Envelope Version 和校验结果。ChangeSet 内容、Schema 或任一依赖版本发生变化后，旧校验立即失效，必须重新校验，不能拿旧的“已通过”结果发布新内容。
- 影响预览必须明确展示配置前后值、影响 Scope、继承关系、当前 Effective Value、受影响的后续对象或调度、是否影响正在运行对象、是否需要缓存失效、预计传播范围以及不可逆或需额外处置的影响；不能只展示一段未解释的 JSON Diff。
- 所有 `PLATFORM_POLICY` 都由一个当前有效的 Super Admin 显式发布，不要求另一个人批准。创建 Draft 与发布可以是同一人，但 Publish 是独立命令，必须再次校验 `platform.configuration.manage`、Platform Scope、账号状态、当前版本和并发条件。
- 不设置 `NORMAL`、`SENSITIVE` 等配置风险等级，也不允许管理员自行标记风险。每次 Publish 和回滚都必须填写变更原因并完成一次新的 TOTP Challenge；不能仅凭当前 Session 中曾经完成过 MFA 就跳过本次再认证。TOTP Code、Secret 和完整认证材料不得写入配置或 Audit，只记录再认证结果、时间和认证强度。
- 首版 Publish 只支持立即激活，不支持预约发布时间、延迟激活或审批后等待维护窗口。通过最终校验、全新 TOTP Challenge 和确认后，Published Version 的创建与 Active Pointer 切换在同一事务提交时同时发生；首版不存在已经 `PUBLISHED` 但尚未 `ACTIVE` 的 Policy Version，也不创建 `PENDING_ACTIVATION`、`scheduledAt`、预约队列、定时 Job、API、UI 或占位字段。
- “立即激活”只表示新的 Snapshot 从事务提交起成为权威解析版本，不表示无条件追溯修改全部业务对象或强制重启运行中的任务。每个 Key 对已有对象、后续对象、下一次调度、下一次 Attempt 或需 Rollout 组件的实际影响，仍严格由其 Effect Semantics 决定；Cron、TTL、Retention 和其他业务时间参数是否可配置与 Policy 本身是否预约发布是两个独立概念。
- `publishedAt` 与 `activatedAt` 首版记录同一个服务端数据库事务时间，禁止由 Frontend 提交自定义生效时间、回填过去时间或以客户端时钟决定顺序。事务提交失败时 Active Pointer 保持不变，不得提前发送“已生效”响应或由后台任务补切 Pointer；重试必须重新检查 Base Version、依赖版本、授权、校验绑定和 TOTP Challenge。
- 发布使用 Optimistic Concurrency。Draft 必须记录其基于的模块 Namespace + Scope Active Policy Version；若同一模块、同一 Scope 已被其他 ChangeSet 先发布新版本，当前 Publish 返回明确 Conflict，保留 Draft 供比较或重新基线化，禁止后写覆盖先写。其他模块或其他 Scope 的独立发布不会无条件制造冲突，但其被声明为校验依赖时仍会使旧校验失效。
- 某个 Draft 发布成功后，只有该 Draft 转为 Published 历史来源；同一模块与 Scope 的其他 Draft 仍保留为 `DRAFT`，但其 Base Version 过期后必须在管理后台明确标记 Conflict/Stale，不自动删除、不自动 Rebase，也不能继续使用旧验证结果发布。
- Stale Draft 采用服务端 `Schema-aware Three-way Rebase`，同时比较不可变 Base Snapshot、当前 Active Snapshot 和 Draft Candidate。Base → Current 表示其他已发布变更，Base → Draft 表示 Draft Owner 的真实修改意图；禁止只比较 Current 与 Draft，因为无法区分 Draft 中未改动的旧值和 Owner 有意恢复的值。
- Rebase 只在同一模块 Namespace + Scope 内进行，并按 Typed Schema 的稳定逻辑路径比较规范化值，不对任意 JSON 或文本执行通用 Merge。若三份输入的 Schema Revision 不同，必须先通过该模块已注册的 Versioned Reader/Migrator 归一到受支持的目标 Schema；缺少确定性迁移路径、Snapshot Hash 不匹配或任何输入不可解析时 Fail Closed。
- 自动合并仅限可证明无冲突的情况：只有 Current 修改则保留 Current，只有 Draft 修改则保留 Draft，双方得到相同规范化结果则采用该结果。双方把同一逻辑配置改为不同值时必须标记 Conflict，不采用 Last-write-wins、Draft-wins、Current-wins 或强制覆盖。
- Boolean、Number、Enum、Duration 等简单值按稳定 Key 处理。List、Allowlist 和复杂 Object 首版默认把整个 Key 视为原子值；Gate Resolver、Model Route、File Type Policy 等领域配置只有所属模块提供确定、可验证的 Typed Merger 时才能细粒度自动合并，否则任何双方修改都进入人工 Conflict，禁止由通用 Catalog 猜测语义。
- 即使不同 Key 可以结构化合并，合并结果仍必须重新执行完整模块校验；Min/Max、跨字段依赖、Scope 继承、Security Floor、Effect Semantics、Schema Compatibility 或基础设施 Envelope 任一失败时，Rebase 不得被标记为可发布，Owner 必须调整冲突或候选值。
- Rebase 分为只读 Preview 与显式 Apply。Preview 绑定 Base/Current/Draft Version、Snapshot/Content Hash、Schema Revision 和 Draft Revision/ETag，管理后台按配置项展示 Base、Current、Draft、候选结果与冲突原因；Apply 必须再次校验 Draft Owner、Super Admin 状态、ETag 和 Current Active Version，任一输入变化都返回 Conflict 并要求重新生成 Preview。
- 所有冲突必须由 Draft Owner 明确选择 Current、Draft 或输入满足 Typed Schema 的新值；解决完成后 Apply Rebase 生成新的 Draft Revision，将 Base Version 更新为当时的 Current Active Version，并使此前的校验、影响预览、Content Hash 绑定和 TOTP Challenge 全部失效。原 Draft Revision、自动合并项、人工选择和前后 Base Version 保留在 Draft 历史与 Audit 中，Rebase 本身不修改 Active Policy，也不会自动 Publish。
- Rebase 完成后必须重新执行服务端校验、影响预览和新的 Publish TOTP Challenge。若处理期间又产生新的 Active Version，Draft 再次成为 Stale 并重复上述流程；系统不得为了结束冲突而锁住整个模块、删除他人 Draft 或绕过 Optimistic Concurrency。
- Publish 必须在所属模块的单个数据库事务中原子完成：再次校验授权、整个 ChangeSet 的 Content Hash、Schema Revision、Base Version、依赖版本与约束，写入不可变 Published Version，原子激活 ChangeSet 中全部配置变化，切换该模块与 Scope 的 Active Pointer，并写入 Transactional Outbox 和 Audit。任一步失败都不改变 Active Policy，不能出现部分 Key 已生效，或配置已生效但没有版本、Outbox、Audit 的结果。
- 每个模块 Namespace + Scope 同时只能有一个 Active Published Policy Version；每次成功发布一个 ChangeSet 都生成该边界内新的单调递增版本，并使 ChangeSet 内所有变化共享同一 Published Version。已经发布的版本不可编辑；后续版本激活后，旧版本进入只读历史，但仍保留不可变 Policy Snapshot、完整 ChangeSet、各配置前后值、Schema Revision、发布人、原因、影响预览、验证结果和时间线。
- 每个 Published Policy Version 都保存该模块与 Scope 的完整不可变 `Policy Snapshot`，运行时直接读取 Active Snapshot，不通过回放历史 ChangeSet 或 Delta 重建当前状态。ChangeSet 与前后 Diff 用于解释、审核和 Audit，不是运行时事实源；Snapshot 必须保存规范化内容和 Snapshot Hash，写入后禁止原地修改。
- Platform Scope 的 Snapshot 按其 Schema Revision 物化所有当前适用 Key 的规范化值，包括由模块默认值解析出的结果，避免未来默认值或 Schema 变化重新解释旧版本。新增、弃用或迁移 Key 时必须生成新 Schema Revision，并通过受控迁移或下一次 Publish 形成新 Snapshot，不能静默改写历史 Snapshot。
- Workspace Scope 的 Snapshot 保存该模块所有可覆盖 Key 的完整 Override 状态：每个 Key 明确为 `INHERIT` 或 `OVERRIDE(normalizedValue)`，不复制当时从 Platform 继承到的值。这样未覆盖项会继续跟随当前 Active Platform Snapshot，覆盖项仍由 Workspace Snapshot 固定；删除覆盖等价于发布新的 `INHERIT` 状态，不删除历史记录。
- Workspace Snapshot 必须记录发布校验时使用的父 Platform Policy Version。运行时 Effective Policy 由当前 Active Platform Snapshot 与当前 Active Workspace Override Snapshot 解析，父 Platform 发布新版本时不伪造新的 Workspace Published Version，但必须触发相关 Workspace 缓存失效与重新解析。管理后台和需要历史解释的业务事实记录由 Platform Version + Workspace Override Version 构成的 Composite Effective Revision；重现历史时使用当时记录的版本组合，不能拿当前父版本解释旧事实。
- Published 表示该版本已经成为权威解析版本，不代表所有进程缓存已经瞬间一致。Outbox Event 驱动消费者失效缓存，管理后台展示 Published Version、各消费者已观察到的 Effective Version、传播延迟与异常；安全敏感写操作发现版本陈旧时必须回源或拒绝。
- 普通传播延迟或单个消费者暂时不可用不会静默修改 Published Version，也不会自动改写已经按新版本创建的业务事实。传播长期失败必须告警并允许显式处置；禁止在没有 Audit 的情况下由后台任务悄悄切回旧版本。
- 回滚不恢复或编辑旧 Active Pointer，而是由 Super Admin 以选定历史 Published Version 的不可变 Snapshot 为来源创建一个新的 Draft，按当前 Schema 执行必要迁移，再重新执行校验、影响预览、授权、TOTP 再认证和 Publish，形成新的更高版本并记录 `rollbackFromVersion`。这样 Schema 已演进、依赖已变化或旧值已不安全时，回滚可以被正确拒绝。
- Publish 或回滚只按配置声明的 Effect Semantics 影响对象。`NEW_OBJECT`、`NEW_ATTEMPT`、`NEXT_SCHEDULE` 等不会追溯改写既有 Gate、Attempt、Artifact、已签发 Presigned URL 或已形成 Cleanup Eligibility；需要紧急撤销 Session、停用 Model、取消 Attempt 或隔离 Artifact 时，必须使用对应领域的显式安全命令，不能把 Policy 回滚冒充业务补偿。
- 未来确有预约发布需求时，可以在现有不可变 Snapshot 与 ChangeSet 之前增加独立的 Scheduled Activation Coordinator，在到达生效时间后重新校验版本、Schema、授权边界和基础设施 Envelope，再原子创建并激活 Published Version；该扩展不得改变当前 Snapshot、Active Pointer 或领域模块的读取契约。首版不为此预建空状态机或无行为开关。
- `GITOPS_CONFIG` 不使用上述 PostgreSQL Draft/Publish 流程，其候选变更、评审、合并、Reconcile 与回滚继续由 GitOps 负责，平台只读关联 Git/Helm Revision、Desired、Effective 与 Drift；`SYSTEM_INVARIANT` 不存在 Draft、Publish 或普通回滚入口。

### 2.8 Configuration Schema 兼容演进（已确认）

Configuration Schema、Policy Snapshot 与应用版本采用 `Expand → Migrate/Publish → Contract` 的兼容演进流程，避免滚动升级期间新旧 Pod 对同一 Active Policy 产生不同解释：

1. `EXPAND`：先部署能够同时读取当前旧 Schema Revision 和目标新 Schema Revision 的模块版本。此阶段只增加新 Key、Alias、Reader、Validator 或确定性迁移器，不删除旧 Key、不改变旧值语义，也不要求启动中的服务自动写入配置；在新 Snapshot 正式发布前，平台行为必须保持与旧 Policy 一致。
2. `MIGRATE/PUBLISH`：所属模块基于旧的不可变 Snapshot 生成 Typed Migration Draft，明确展示 Key 映射、新增值、弃用项、行为变化、目标 Schema Revision 和前后 Diff。Super Admin 仍按普通 Configuration ChangeSet 流程完成服务端校验、影响预览、原因、全新 TOTP Challenge 与 Publish；迁移不能绕过现有授权、Scope 原子边界或 Audit。
3. `CONTRACT`：只有所有 Active Platform/Workspace Snapshot 都已迁移、所有运行消费者均报告支持目标 Schema、传播与读取验证通过，并且部署回滚方案不会重新启动不支持当前 Snapshot 的旧版本后，后续版本才允许删除旧 Reader、Alias、Validator 或 Key。历史 Snapshot 保持原样，由版本化 Reader/Migrator 在历史查询与受控回滚时解释，不能为了清理旧 Schema 改写历史。

- 模块必须声明每个应用版本支持的 Schema Revision 范围。发布和 Kubernetes Rollout Gate 同时核对 Active Snapshot Revision、目标应用支持范围与回滚镜像支持范围；不兼容时阻止发布或 Rollout，并在平台管理后台显示受影响模块、Scope、Snapshot Version、当前/目标 Schema Revision 和修复动作。
- 同一模块存在多个 Workspace Scope 时，每个 Scope 仍以独立 ChangeSet 原子迁移；管理后台可以提供批次编排和总体进度，但不能把多个 Scope 伪装成一个数据库事务。Platform Scope 应先完成兼容迁移，Workspace Migration Draft 再基于明确的父 Platform Version 生成和校验。
- 服务启动、Readiness 或普通请求路径不得自动创建 Published Version、切换 Active Pointer、写回迁移结果或直接修改领域表。自动化可以生成 Draft、执行只读兼容扫描和给出迁移建议，但真正生效仍必须由 Super Admin 显式 Publish。
- 任何 Pod 无法解析当前 Active Snapshot、Snapshot Hash 不一致或遇到超出声明支持范围的 Schema Revision 时必须 Fail Closed：Readiness 失败并告警，不得静默回退到代码默认值、旧缓存或部分 Key。滚动升级期间必须保证仍有兼容实例可服务，不能让不兼容实例接收流量。
- Schema Migration、兼容扫描、被阻止的 Publish/Rollout、迁移覆盖率和 Contract 清理结果均进入 Audit/Observability。模块未来提取为微服务时，其 Schema Compatibility Contract、Versioned Reader/Migrator 和 Migration Gate 随模块迁移，不要求其他领域模块参与解释。

### 2.9 DEV → PROD Typed Configuration Promotion（已确认）

首版只支持把 DEV 中选定的 `PLATFORM_POLICY` Published ChangeSet 以签名的 Typed Change Intent 提升到 PROD。Promotion 不是 PostgreSQL 复制、数据库备份、跨环境配置同步或自动发布；DEV 与 PROD 不建立为此服务的数据库连接、内部写 API、共享凭据或运行时信任通道。传输方式是 Super Admin 先从同一“平台管理后台”发布物在 DEV Cluster 中实例化的当前环境后台导出版本化 Canonical JSON Bundle，再上传到该发布物在 PROD Cluster 中实例化的当前环境后台；这是同一管理产品的两个环境实例，不是两套后台产品。

- DEV 只能从不可变 Published Policy Version 选择一个或多个 ChangeSet 导出，不能导出未发布 Draft、Archived Draft、运行时缓存、普通业务数据或任意手写 JSON。Bundle Manifest 至少记录 Format Version、全局唯一 Bundle ID、Source Environment、Source Lineage ID、导出人、导出原因、导出时间、源应用版本和完整性信息；每个 Item 记录稳定 Item ID、模块 Namespace、Scope Selector、Source Published Version、Source Published Sequence、Schema Revision、Base/Result Snapshot Hash、ChangeSet、规范化 Changed Keys 与前后值摘要。
- Bundle 传递 Base → Published 的 Typed Change Intent，不使用完整 DEV Snapshot 无条件覆盖 PROD。PROD 以自身当前 Active Snapshot 为基线，只应用 Bundle 中明确选择的变更；Bundle 未修改的 PROD Key 保持当前值。完整源 Version/Hash 只用于来源证明、比较和 Audit，不能充当 PROD Active Pointer。
- 每个可提升 Key 的 Promotion Mode 由所属模块 Typed Schema 固定声明为 `PORTABLE`、`TARGET_REQUIRED` 或 `BLOCKED`：`PORTABLE` 可以携带规范化值；`TARGET_REQUIRED` 只能携带逻辑用途和源值摘要，导入时必须显式选择 PROD 对应值；`BLOCKED` 不得进入 Bundle。Promotion Mode 不能由 Super Admin 在导出时临时修改，也不能用 Catalog Metadata 绕过。
- Workspace、Model Deployment、Provider、Project、Repository、Connector、Secret Reference 等环境相关引用不得携带 DEV 数据库主键或假设 DEV/PROD 环境实例中对应资源的 ID 相同，必须使用稳定逻辑标识并在 PROD 显式映射。目标不存在、类型不符、Scope 不允许或映射不唯一时对应 Item 保持 Blocked；Promotion 不自动创建 Workspace、账号、组织关系、Model、Connector、Secret 或其他目标资源，也不把 Workspace Override 降级为 Platform Scope。
- Secret、Token、密码、Access Key、TOTP Secret、Private Key、OpenBao 路径中的明文值和任何可直接使用的认证材料永不进入 Bundle。允许提升的只是已声明为 `TARGET_REQUIRED` 的稳定 Secret Reference 用途；PROD 必须绑定其本地 OpenBao Reference，并验证目标存在、权限最小化和健康状态，DEV Secret 值、Version 或 Lease 不跨环境传输。
- DEV 使用专用非对称 Promotion Signing Key 对 Canonical Bundle Manifest 与 Items 整体签名；Private Key 由 DEV OpenBao 管理且不可导出，Bundle 记录 Key ID、算法、Public Key Fingerprint、Payload SHA-256 与 Signature。PROD 只通过 GitOps 配置受信任的 DEV Public Key/Key ID，不持有共享 HMAC Secret；格式、Hash、Signature、Source Environment 或信任链任一无效时，在创建任何 Draft 前 Fail Closed 并记录拒绝 Audit。
- Bundle Manifest 必须使用服务端 UTC 时间记录 `issuedAt` 和签名覆盖的 `notAfter`。首次导入有效期首发默认 30 天并属于版本化 `PLATFORM_POLICY`，只能由 Super Admin 修改；该参数使用 `NEW_OBJECT` 生效语义，只影响之后导出的 Bundle，不能延长、缩短或重签已经生成的不可变 Bundle。PROD 可以按其当前 Import Policy 进一步缩短接受窗口，但不能越过 Bundle 自身 `notAfter`。
- Bundle 必须在 `notAfter` 前完成第一次成功验签并创建 Promotion Case；过期后首次上传一律拒绝并要求从当前 DEV Published Version 重新导出，不能修改客户端时间、Manifest 或 Bundle ID 续期。已在有效期内创建的 Promotion Case、Draft 或 Published Version 不因 Bundle 后续到期自动失效，其后分别遵循 Draft 30 天归档、Stale/Rebase、Publish 和 PROD 回滚规则。
- Promotion Signing Key 使用版本化 Key ID 和 `PENDING → ACTIVE → VERIFY_ONLY → RETIRED` 生命周期。DEV 同一时刻只允许一个 Active Signing Key，PROD Trust Store 可以在受控轮换窗口同时接受多个非撤销 Public Key；Key 状态、算法、Fingerprint、启停时间和信任来源都必须可查询，但任何 Private Key Material 不进入 PostgreSQL、Git、Bundle、日志或管理后台。
- 常规轮换顺序固定为：在 DEV OpenBao 生成不可导出的新 Key Version；通过受控 GitOps 先把新 Public Key/Key ID 加入 PROD Trust Store；完成验签 Canary 后把 DEV Active Signer 切到新 Key；旧 Key 停止签名并进入 `VERIFY_ONLY`；等待旧 Key 签发的最后一个 Bundle 超过 `notAfter` 和允许时钟偏差后，再从活动 Import Trust Set 移除并标记 `RETIRED`。禁止先切换 Signer 再补 PROD Public Key，也禁止原地复用同一个 Key ID 替换 Key Material。
- Retired Public Key、Fingerprint、算法、有效期和撤销状态必须作为只读历史验证材料保留，以便复验既有 Bundle、Promotion Case 与 Audit，但 Retired Key 不能再接受新的首次导入。Public Key 不是 Secret；其活动信任配置属于 `GITOPS_CONFIG`，不能由 Platform Policy、Bundle 或 Super Admin 页面直接加入、恢复或删除。
- Private Key 疑似泄露时走紧急 Revoke，不等待 30 天：立即停止 DEV Signer、通过紧急 GitOps 变更将对应 Key ID 标记 `REVOKED`，并使 PROD 拒绝该 Key 签发的所有尚未首次导入 Bundle。由该 Key 创建但尚未 Published 的 Promotion Case/Draft 必须转为安全阻断状态并要求使用新 Key 从可信 DEV Version 重新导出；已经 Published 的 PROD Version 不自动回滚，而是产生 Critical 安全事件，列出 Bundle、Draft、发布人、影响 Scope 与回滚入口，由 Super Admin 按事件调查结果显式处置。
- DEV OpenBao、Signer、Canonicalization 或签名 Audit 任一不可用时，Export 必须 Fail Closed，不得生成无签名 Bundle、临时使用本地私钥或退化为共享 HMAC。Key 创建、Trust Store 变更、Canary、Signer 切换、Verify-only、Retire、Revoke、过期拒绝和受影响 Promotion Case 都进入 GitOps/Kubernetes/OpenBao 与平台关联 Audit，并在平台管理后台展示当前 Active Key、受信任 Verify Key、最近轮换、到期 Bundle 和异常。
- PROD 导入由当前有效的 Super Admin 主动发起。验证 Bundle 后创建 Promotion Case 并固化不可变来源证据，再按模块 Namespace + 目标 Scope 分别创建由导入人拥有的独立 Draft；一个 Bundle 可以关联多个 Draft，但不形成跨模块或跨 Scope 数据库事务，也不保证全部 Item 同时成功。管理后台分别显示 Imported、Mapping Required、Blocked、Draft、Published 和 Failed 结果及总体进度，不能把部分成功显示成全量发布。
- 签名 Bundle、Manifest、Item、源 Hash 和 Promotion Case 的来源证据在导入后保持不可变；Case 的处理状态可以演进，但只能通过带时间、操作者和原因的状态事件追加记录。导入产生的 PROD Draft 则是目标环境中的普通可编辑 Draft，继续遵循既定 Owner、ETag、Takeover、Archive、Clone 和 Schema-aware Rebase 规则；编辑 Draft 不得改写或重新签名 Bundle，也不会把变更反向同步到 DEV。
- Imported Draft Owner 可以编辑该模块 Namespace + 目标 Scope 的 Typed Schema 所允许的全部已注册 `PLATFORM_POLICY` Key，包括调整已提升的 Portable 值、完成目标映射，以及增加或移除仅在 PROD 需要的值；这不会赋予超出 Super Admin 和原有 Scope 的新权限。Draft 不得原地修改 Bundle ID、Item ID、Source Environment、Source Signature、Source Hash、模块 Namespace 或目标 Scope，不得注入未知 Key、写入 Secret 明文，亦不得越过 `GITOPS_CONFIG` 或 `SYSTEM_INVARIANT` 边界。
- `BLOCKED` 仅表示该 Key 不能通过 Promotion Bundle 传递；如果它本身是非 Secret、且目标 Typed Schema 正常允许在 PROD 直接配置的 `PLATFORM_POLICY` Key，Super Admin 仍可在 Imported Draft 中按 PROD 本地规则填写，并由系统标记为 `PROD_OVERRIDE`。Secret 值和可直接使用的认证材料在任何情况下都不能借此进入 Draft、Bundle、Audit 或 PostgreSQL。
- 服务端必须按最终规范化 Candidate 逐 Key 计算只读来源标签，前端不得自行提交或伪造：`PROMOTED_UNCHANGED` 表示最终值仍与 Bundle 中的 `PORTABLE` Change Intent 一致；`TARGET_MAPPING` 表示 `TARGET_REQUIRED` 逻辑引用已在 PROD 显式解析；`PROD_OVERRIDE` 表示 Portable 意图被修改或移除、Rebase 时选择了不同 Current 值、增加了 PROD-only Key，或最终值以其他方式偏离 Bundle 意图。
- 每个 `PROD_OVERRIDE` 都必须填写明确原因后才可进入验证与发布。界面可让同一次编辑中的多个 Key 共用一条原因，但服务端必须把原因、Key、操作者和时间分别关联；任何 Candidate 编辑都会使先前的 Validation、Impact Preview 和待发布 Hash Binding 失效并要求重新生成。来源标签和 Override 原因不替代权限校验、完整 PROD 验证或 Publish TOTP。
- Promotion Draft 页面至少并排展示 DEV Source、Imported Intent、PROD Current、Final Candidate、Origin Label 和 Override Reason。最终 PROD Published Version 必须保留 Bundle ID、Item ID、DEV Source Published Version、Source Snapshot Hash，以及逐 Key 的来源标签和 Override 原因，使后续 Audit 能准确区分原样提升、目标映射和 PROD 主动偏离。
- Item Draft 创建后目标 Scope 不可原地修改。确需改投其他 Scope 时，必须归档原 Draft，并从同一 Promotion Case 创建一个保留来源链的新 Item/Draft，重新执行 Scope Mapping、Reference Mapping 和完整校验；不得通过编辑 Scope 绕过 Workspace 隔离。Clone 或 Rebase 必须继承 Bundle 溯源，选择 Current 或其他不同值时由服务端重新判定为 `PROD_OVERRIDE`。
- Configuration 模块必须维护可查询的 `Promotion Divergence Projection`，用于回答“当前 PROD 为什么与最近一次已在 PROD 成功发布的 DEV Change Intent 不同”。它是 Published Policy Version 与逐 Key Promotion Provenance 的可重建 Read Model，不是新的配置事实来源、跨环境同步服务或独立微服务；首版可以在 PostgreSQL 中持久化查询投影，并在未来提取 Configuration 微服务时随模块迁移。
- PROD 不连接或实时读取 DEV。Projection 中的比较基线必须明确命名为 `Latest Published DEV Intent Known to PROD`：只取最近一次通过有效签名 Bundle 进入 PROD、且已经成功 Published 并包含该模块 + Scope + Key 的规范化 DEV Intent。仅上传 Bundle、创建 Promotion Case、完成 Mapping 或保存 Draft 都不改变比较基线，也不能提前把差异标记为已解决。
- `PROMOTED_UNCHANGED` 不产生 Active Divergence；`TARGET_MAPPING` 是预期的环境专属解析，也不因 PROD 资源 ID 或 Secret Reference 不同而产生 Divergence；成功 Published 的 `PROD_OVERRIDE` 必须为相同模块 + Scope + Key 创建或更新 Active Divergence。对于 PROD-only 或 `BLOCKED` 后在 PROD 本地填写的 Key，比较基线使用明确的 Absent/Non-portable 语义标记，不伪造 DEV 值，也不暴露 Secret。
- 同一模块 + Scope + Key 同时最多存在一个当前 `ACTIVE` Projection。每次相关 PROD Publish 或 Rollback 都按 Typed Schema 的 Canonical Normalization 重新计算：当前 PROD 值与最近已知 DEV Intent 等价时自动转为 `RESOLVED`；仍不相等时保持或更新为 `ACTIVE`；新的 Override 取代当前 Active 视图时，旧 Published Version、旧原因和完整演进历史继续不可变保留。普通 PROD 本地发布也必须触发重算；没有任何已知 DEV Intent 的纯 PROD Key 不凭空生成跨环境差异。
- 当新的有效 DEV Bundle 在完成目标 Scope/Reference Mapping 后触及一个当前存在 `ACTIVE` Divergence 的相同模块 + Scope + Key 时，该 Key 必须进入 `DIVERGENCE_REVIEW_REQUIRED`；只要任一 Key 尚未完成仲裁，对应 Item/Draft 就保持同名聚合阻断状态。系统不得默认采用新 DEV 值、默认保留 PROD 值、沿用旧选择或根据时间自动替用户决定；Mapping 尚未完成时先保持 `MAPPING_REQUIRED`，待 Key 身份确定后再执行 Divergence 检测。
- Review 页面必须同时展示 Previous Published DEV Intent、New Imported DEV Intent、Current PROD Active Value、现有 Divergence 原因、相关 Source/PROD Version 与规范化差异。Draft Owner 必须逐 Key 显式选择：`ACCEPT_NEW_DEV`，把新 DEV Intent 作为 Candidate；`KEEP_CURRENT_PROD`，保留当前 PROD 值；或 `SET_NEW_PROD_VALUE`，按目标 Typed Schema 填写第三个值。界面可以提供受控批量操作，但服务端仍须为每个 Key 固化独立选择、输入摘要、操作者和时间。
- `ACCEPT_NEW_DEV` 不产生新的 Override Reason，但选择事件必须进入 Draft History/Audit；即使 New DEV Intent 已经等于 Current PROD，也必须显式选择后才能建立新的 Promotion Provenance。`KEEP_CURRENT_PROD` 和 `SET_NEW_PROD_VALUE` 都继续判定为 `PROD_OVERRIDE`，必须填写针对本次 New DEV Intent 的当前原因；旧原因只能作为只读参考，不得被服务端静默继承，管理员可以在确认仍适用后重新提交相同文字。
- Review Decision 必须绑定 Previous Intent Hash、New Intent Hash、Current PROD Version/Value Hash、Schema Revision、Scope 和 Draft ETag。任一输入因新 Bundle、PROD Publish/Rollback、Schema 变化、Mapping 调整、Rebase 或 Draft 编辑而改变时，旧 Decision 立即失效，Key 返回 `DIVERGENCE_REVIEW_REQUIRED`；不得使用过期选择进入最终 Validation、Impact Preview 或 Publish。Review 属于 Draft 编辑，不额外要求 TOTP，既定全新 TOTP 仍在最终 Publish 时统一校验。
- 完成全部 Key 仲裁只会生成新的 PROD Candidate，不修改 Active Policy、现有 Divergence 或签名 Bundle。只有成功 Publish 后才更新 Projection：`ACCEPT_NEW_DEV` 且最终规范化值相同则把旧 Active Divergence 标记为 `RESOLVED`；保留或设置不同 PROD 值则以新的 DEV Source Version、当前原因和 Published Version 更新 Active Divergence。Validation 或 Publish 失败时，现有 Active Divergence 保持原状。
- Projection 的比较使用规范化值或不可逆摘要，避免把 `60m` 与等价的 `3600s` 错判为差异。Secret、Token、认证材料和敏感 Reference 在 Projection、API、日志与管理后台中继续只允许 Redacted Metadata 或安全摘要；Projection 不得成为绕过 OpenBao 的副本。
- `Promotion Divergence` 表示经过权限、Typed Schema、Security Floor、Impact Preview 和 TOTP 后成功发布的有意环境差异，不等同于 GitOps Desired/Effective Drift、Kubernetes 异常或配置校验失败。它本身不触发故障告警、自动回滚、发布阻断、DEV 回写或双向同步；真正的 GitOps Drift 和 Reference Health 故障继续走既定 Observability、告警与处置流程。
- 平台管理后台在 `Configuration → Promotion → Environment Differences` 提供只读查询，仅 Super Admin 可见。至少展示模块、Scope、Key、DEV Source Version、Latest Published DEV Intent Known to PROD、PROD Active Value、Override Reason、Published By、First Detected At、Last Changed At 和 `ACTIVE/RESOLVED` 状态；首页可以展示 Active 数量和入口，但必须使用信息状态，不混入平台 Health 故障数量。历史 Resolved 记录保留并可筛选，不物理删除。
- Published Policy Version 与逐 Key Provenance 是不可变事实，Projection 只是当前查询加速层；发布/回滚事务必须产生足够的版本化事实和 Outbox 事件，使 Projection 更新具备幂等性并可以从 Published Version 历史重建。Projection 短暂不可用不得影响 Active Policy 读取或运行中业务，但必须暴露自身 Lag/Build Failure 并允许安全重建，禁止通过人工改写 Projection 改变真实配置。
- PROD Import 必须核对 Bundle Format、模块是否注册、Schema Revision 支持范围、源应用兼容性、Promotion Mode、目标 Scope Mapping 和 Item 完整性，再使用 PROD 当前 Active Snapshot 生成 Candidate。管理后台展示 DEV Source、PROD Current、PROD Candidate、环境专属映射和预计影响；PROD 的 Schema、Security Floor、Scope 继承、跨字段约束、基础设施 Envelope、Reference Health 和 Effect Semantics 全部重新校验，DEV 已验证结果不在 PROD 复用。
- Import、映射或修正只产生 PROD Draft，不需要 Publish TOTP，也不改变 Active Policy。每个 Draft 仍必须独立完成影响预览、当前 Base Version/ETag 校验、全新 TOTP Challenge 和立即 Publish；导入后 PROD Active Version 变化时，该 Draft 按普通 Stale Draft 进入既定 Schema-aware Three-way Rebase，不能重新上传 Bundle 强制覆盖。
- DEV 必须为每个受信任 Source Lineage ID + 模块 Namespace + Source Scope 维护由 Published Policy Version 事务生成的严格单调 `Source Published Sequence`；它不是时间戳、Bundle 导出顺序或用户可编辑编号，并与 Source Version、Snapshot Hash 和逐 Key Intent Hash 一起纳入签名。比较只允许发生在同一个已受信任 Source Lineage ID 内；未知或变化的 Lineage ID 必须 Fail Closed，不能通过重置 Sequence 绕过乱序保护。
- PROD 按目标模块 + Scope + Key 维护最近一次成功 Promotion Publish 的 Source Lineage High-water Mark，至少包含 Source Lineage ID、Source Published Sequence、Source Version 与规范化 Intent Hash。High-water Mark 只在 PROD Publish 成功的同一事务事实中前移；上传、验签、创建 Case/Draft、Validation 通过或发布失败都不得前移。该 Mark 是 Published Promotion Provenance 的可重建投影，不是可由管理员直接编辑的配置。
- Bundle 完成验签、Schema 检查和目标 Mapping 后，服务端逐 Key 与 High-water Mark 比较：Sequence 更小则标记 `SOURCE_SUPERSEDED`；Sequence 相同且 Intent Hash 相同则标记 `SOURCE_ALREADY_PUBLISHED`，返回既有来源链且不重复创建可发布 Draft；Sequence 相同但 Intent Hash 不同则视为 `SOURCE_LINEAGE_CONFLICT`，Fail Closed 并产生安全 Audit；Sequence 更大或该 Key 尚无 High-water Mark 时才可继续生成 Candidate。不得使用客户端时间、Bundle 上传时间或 Bundle ID 判断新旧。
- ChangeSet 仍以模块 Namespace + 目标 Scope 为原子发布单元；同一 Item 中任一 Changed Key 为 `SOURCE_SUPERSEDED`、`SOURCE_ALREADY_PUBLISHED` 或 `SOURCE_LINEAGE_CONFLICT` 时，该 Item 不得裁掉冲突 Key 后部分发布，也不创建可发布 Draft。合法 Bundle/Promotion Case 和逐 Key 判定作为不可变证据保留，Bundle 中其他独立 Item 仍可按既定隔离边界继续处理；Super Admin 不能通过修改 Draft、Clone、Rebase、重新上传或更换 Bundle ID 解除该阻断。
- 乱序检查必须在 Import/Candidate 阶段执行，并在最终 Publish 事务内针对最新 High-water Mark 再执行一次，以覆盖两个 Draft 并发竞争。较新 Source Sequence 先成功发布后，任何已经存在但 Source Sequence 较旧或相同的 Draft 都必须转为 `SOURCE_SUPERSEDED` 或 `SOURCE_ALREADY_PUBLISHED`，使旧 Validation、Impact Preview、Review Decision 和 TOTP Challenge 失效；不能只依赖 Draft 创建时的检查结果。
- PROD Rollback 只改变 PROD Active Snapshot 与 Divergence 状态，不降低、删除或重写已接受的 Source Lineage High-water Mark。确需恢复旧值时，首选在 DEV 基于当前版本创建一个新的单调 Published Version 再 Promotion；也可以按权限使用 PROD 自己的不可变回滚或本地 Draft，但由此产生的环境差异继续进入 `PROD_OVERRIDE`、Promotion Divergence 与 Audit。旧 Bundle 不能充当回滚通道。
- Source Lineage ID 是服务端生成、稳定且永不复用的源世代标识，不使用域名、IP、数据库主键或可变环境名称。正常 DEV 节点替换、应用升级、数据库迁移、备份恢复和同一环境灾难恢复必须恢复原 Lineage ID、各模块/Scope 的下一 Sequence 与 Published Version/Hash 连续性；Signing Key 常规轮换也不改变 Lineage。上述状态必须进入加密备份与恢复演练，缺失、回退或校验不一致时 DEV Promotion Export Fail Closed，不得启动时自动生成新 Lineage 掩盖断链。
- 只有确实替换 DEV Source 世代时才允许创建 `Source Lineage Rebind Case`。新 Lineage 的信任授权属于版本化 `GITOPS_CONFIG`：Git 变更必须声明旧/新 Lineage ID、Source Environment、允许的模块与 Scope、旧 High-water Mark 摘要、新 Baseline Snapshot 摘要、旧/新 Signer Key ID、变更原因和外部变更记录；平台管理后台只读展示 Desired/Effective 状态，Super Admin 不能通过 `PLATFORM_POLICY`、数据库修改或普通页面直接新增、重置、激活或删除 Lineage Trust。
- Rebind 采用两道独立 Gate：GitOps Review 先把新 Lineage 与 Public Key 加入 `PENDING` Trust；随后 PROD Super Admin 导入由新 Lineage 签名的完整非 Secret Baseline Bundle，按模块 Namespace + 目标 Scope 重新执行 Schema、Mapping、Reference Health、Security Floor、Canonical Hash、当前 PROD 差异和 Impact Validation，并使用全新 TOTP 显式接受。Baseline 不自动覆盖 PROD，也不复制 Secret；差异继续按 `PROMOTED_UNCHANGED`、`TARGET_MAPPING`、`PROD_OVERRIDE`、Override Reason 与 Divergence 规则仲裁。
- Baseline Acceptance 仍以模块 Namespace + Scope 为独立原子单元，不伪装成跨模块事务。Rebind Case 可以显示逐单元进度，但某个单元在成功 Baseline Publish 前必须阻止该新 Lineage 的普通增量 Promotion；成功后才以该 Baseline Source Sequence 初始化该单元逐 Key High-water Mark，并把新 Lineage 对该单元转为 `ACTIVE`。验证或发布失败只保持 `PENDING/BLOCKED`，不得改变 PROD Active Policy、旧 High-water Mark 或其他已完成单元。
- 计划迁移且旧 DEV 仍可用时，Rebind Case 必须携带由旧受信任 Signer 签发的 Lineage Transition Statement，并由新 Signer 对同一 Old/New Lineage、Baseline Hash 和切换目的进行签名。旧 DEV 或旧 Private Key 因灾难确实不可用时，必须走显式 Emergency Rebind：GitOps 记录连续性证明不可用、恢复证据和安全处置原因，PROD 对全部目标单元执行完整 Baseline Reconciliation；不得伪造旧签名、跳过 Baseline 或把“仍由受信任 Key 签名”单独视为 Lineage 连续性证明。
- GitOps `PENDING` Trust 在 PROD 生效后，全部目标模块 + Scope 单元先进入 `REBINDING` 冻结状态：旧 Lineage 不再接受这些单元的新首次导入，其所有尚未 Published 的 Promotion Case Item、Draft、Mapping、Validation、Review Decision 和 TOTP Challenge 转为不可发布的 `SOURCE_LINEAGE_RETIRED`，保留只读证据并要求从新 Lineage 重新导出；不得 Clone/Rebase 到新 Lineage。新 Lineage 在对应单元 Baseline Publish 成功前也只能提交 Baseline，不能提交普通增量，从而禁止同一单元由两条 Lineage 同时写入。
- 每个单元 Baseline Publish 成功后，旧 Lineage 对该单元进入 `RETIRED`，新 Lineage 对该单元进入 `ACTIVE`；旧 Lineage 已 Published Version、High-water Mark、Public Key 验证材料、Divergence 和 Audit 永久保留为历史，不能清空、改写或假装属于新 Lineage。若尚无任何单元切换成功，可以通过新的 GitOps Review 取消 Rebind 并恢复旧 Lineage 接受新导出，但已冻结 Draft 不复活；任一单元已经切换后不得整体取消或仅回滚 Git Commit 恢复旧世代，必须完成剩余单元或创建新的 Rebind Case。
- Rebind 全部目标单元切换完成后，旧 Lineage 在该授权范围内完成 Retirement；Public Key 是否仍用于验证历史 Bundle 继续遵循既定 Key Lifecycle。已 Active 的 Lineage 不得降低 Sequence，确需再次换源必须创建新的 Rebind Case。Rebind 状态、Baseline 差异、被冻结 Draft、各单元 Active Lineage 与最近演练结果必须进入 Audit、Observability 和平台管理后台。
- Bundle ID + Item ID 在 PROD 作为幂等导入键；重复上传返回已有 Promotion Case 和 Draft/结果，不重复创建候选。确需再次尝试时必须从既有 Item 显式 Clone 新 Draft 并保留来源链，不能通过改写 Bundle ID 规避 Audit。签名/格式错误拒绝整个 Bundle；合法 Bundle 中单个 Item 的 Schema、Mapping 或 Envelope 错误只阻止该 Item，其他 Item 仍按独立边界处理。
- PROD 回滚只使用 PROD 自己的不可变 Published Snapshot 和正常回滚流程，不依赖重新导入 DEV Bundle，也不会反向修改 DEV。DEV Export 与 PROD Import、Mapping、Draft、Rebase、Publish、Reject 和 Rollback 分别进入两侧 Audit，并通过 Bundle ID、Item ID、Source Snapshot Hash 和 PROD Published Version 关联；平台保存不可变的非 Secret Bundle/Case 证据，不把 Bundle 当作长期 Secret 或业务 Artifact。
- `GITOPS_CONFIG` 继续通过 Git/Helm Review、Merge 和 Reconcile 提升，`SYSTEM_INVARIANT` 继续通过代码、数据库约束或受控架构变更演进；两者均不得塞入 Platform Policy Promotion Bundle。未来将 Configuration 模块提取为微服务时，Bundle Schema、Signer/Verifier、Promotion Case 与 Import Port 随模块迁移，不改变各领域模块的 Typed Schema 或 Publish Contract。

## 3. Identity 与 Session

### 3.1 认证来源（已确认）

- 第一阶段不接入 SSO，也不接入 HR。
- 平台自行实现本地账号、密码、Session 和 TOTP MFA。
- 账号只允许由具备相应 Capability 的管理员创建，第一阶段不提供自助注册。
- 平台内部维护组织关系，外部 HR 组织树不是事实源，也不建设占位式 HR Adapter。

### 3.2 员工编号与密码（已确认）

- 登录账号统一使用员工编号。
- 员工编号必须是恰好 8 位数字，允许以 `0` 开头，因此按字符串保存和校验。
- 创建新账号时，由平台使用密码学安全随机数为该账号生成唯一的一次性临时密码；不同账号不得共享临时密码。
- 临时密码默认 24 小时有效，仅在创建或重置完成页展示一次，平台之后不可查询其明文。
- 第一次成功使用临时密码时必须原子消费该凭据，只签发短期且受限的 Bootstrap Session；该 Session 仅允许设置正式密码、完成或校验 TOTP 等初始化操作，不能进入其他业务能力。
- 初始化流程中断后不得继续使用已经消费的临时密码，必须由具备对应 Identity Capability 的管理员重新签发。
- 管理员重置密码时，立即使旧密码和未使用的旧临时密码失效、撤销已有 Session，并生成新的唯一临时密码和新的默认 24 小时有效期；TOTP 是否重置仍是独立操作。
- 正式密码长度为 15～32 位，必须包含大写字母、小写字母和至少一个特殊字符。
- 继续拒绝常见弱密码、已知泄露密码以及包含员工编号等账号上下文的密码。
- 密码使用 Argon2id、每账号独立 salt，并通过 OpenBao 管理的 pepper 加固；数据库不保存明文密码。
- 密码过期策略由平台配置，支持永不过期、90 天、180 天和自定义周期，不通过修改代码调整。

### 3.3 TOTP MFA（已确认）

- 所有用户必须绑定 TOTP，不能只对管理员或所谓高风险账号强制。
- Enrollment 可显示二维码和一次性 Secret，用户可使用手机或桌面 2FA 工具保存。
- 第一阶段不提供恢复码。
- 忘记或丢失 TOTP 时，由具备对应 Identity Capability 的管理员核验账号后重置。
- MFA 重置必须撤销已有 Session、要求重新绑定并写入安全 Audit。

### 3.4 Passkey/WebAuthn 演进边界（已确认）

- 第一阶段只提供“员工编号 + 密码 + 强制 TOTP”，不实现 Passkey/WebAuthn 专用的数据表、API、UI 或无实际行为的占位能力。
- Identity 模块使用稳定且与具体认证方式无关的 Authenticator Port/Contract 隔离认证器实现；该边界必须由第一阶段的密码和 TOTP 流程实际使用，不为 Passkey 创建未使用的字段或空 Adapter。
- 后续版本可将 Passkey 作为具备抗钓鱼能力的替代登录路径接入。一次满足平台策略的 Passkey 登录可以同时替代该次密码和 TOTP，不再额外要求用户输入 TOTP。
- Passkey 验证必须要求用户验证，即 WebAuthn `userVerification=required`；服务端必须验证 assertion 的 UV 标志、Challenge、Origin、RP ID 和重放条件，不能只相信客户端参数。
- 注册新 Passkey 必须在正式密码和 TOTP 初始化完成后，通过当前密码和 TOTP 验证；遗失认证器时只能进入具备专用 Identity Override Capability、有效 Scope、人工身份核验、Session 撤销和安全 Audit 的受控恢复流程。
- 管理员恢复只能签发短期受限的恢复资格或 Bootstrap Session，实际 Passkey 注册仍由用户设备完成；管理员和平台均不得接触私钥，也不能把该流程实现成隐式恢复码。
- TOTP 在 Passkey 迁移期继续作为回退登录方式；是否允许账号停用 TOTP 必须由未来独立的认证策略明确决定，不能因绑定 Passkey 自动关闭。
- TOTP 回退路径本身不具备 Passkey 的抗钓鱼属性，因此绑定 Passkey 不代表账号的全部登录路径都已经抗钓鱼。
- Passkey 私钥和生物特征不得上传到平台；平台只保存完成 WebAuthn 验证所需的公钥凭据、签名计数器和关联元数据。
- 未来接入 Passkey 时通过新的 Authenticator Adapter 扩展，不改变 Session 生命周期、Authorization、Capability 或业务 Workflow 的语义；Session 和 Audit 仍需记录本次认证方式及认证强度。

### 3.5 Session（已确认）

- 使用服务端可撤销 Session 与安全 Cookie，不把认证事实仅放在前端或不可撤销 Token 中。
- 连续 60 分钟无用户操作后 Session 失效。服务端以受认证 API 活动或受控心跳更新 `lastActivityAt`，后台 Agent 运行本身不能刷新人的 Session。
- 同一账号默认最多保留 3 个有效 Session，允许在 1～10 范围内动态配置。
- 密码重置、MFA 重置、账号停用或安全事件可以统一撤销现有 Session。
- 人员退出登录、Session 失效或用户控制权限变化，不会终止已经启动的 Agent Attempt；Attempt 按启动时不可变 Binding 继续运行。
- 用户对运行中任务的查看、取消、重试等控制权限按当前 Capability 立即重新计算。

### 3.6 Super Admin 生命周期（已确认）

- 同一个版本化 Bootstrap 实现在每个环境实例中仅允许成功执行一次，用于创建该环境的首个 Super Admin。Bootstrap 只允许在当前环境尚不存在 Super Admin 且未完成初始化时执行；首次成功后写入不可逆的本地初始化事实并关闭常规 Bootstrap 入口，不能通过重复部署再创建隐蔽的 Super Admin。初始化状态、账号与凭据不跨环境共享。
- 首个 Super Admin 仍使用本平台的 8 位员工编号、本地账号、密码和强制 TOTP，不建设共享 Root 账号。平台为其生成唯一随机临时密码并沿用一次展示、默认 24 小时有效、首次使用原子消费和 Bootstrap Session 限制；完成正式密码与 TOTP Enrollment 前，Super Admin 管理能力不得激活。
- Super Admin 是受保护的平台身份事实，同时拥有不可通过普通 Grant 分配的 Platform Scope 保留能力 `platform.configuration.manage` 与 `platform.super_admin.manage`。它不出现在岗位模板、普通账号 Capability 勾选项、Workspace Policy 或一般转授流程中，也不会因为成为经理、Leader、Workspace Owner 或普通管理员而自动获得。
- 初始化完成后，只有当前账号有效且已经重新通过 TOTP Challenge 的现有 Super Admin，才能使用 `platform.super_admin.manage` 增加或移除其他 Super Admin；每次操作必须填写原因并写入安全 Audit。普通管理员、运维 Workload、Agent、数据库脚本和业务模块都不能通过常规接口授予该身份。
- 被晋升人员必须已经是启用状态的本地实名员工账号，完成正式密码设置和 TOTP Enrollment，且不处于受限 Bootstrap Session。晋升命令不得顺带重置密码、替换 TOTP、修改组织关系或赋予 Workspace Membership。
- 晋升成功后立即提升 Authorization Version 并撤销目标账号的既有 Session，要求其使用正式密码和 TOTP 重新登录后才能执行 Super Admin 命令；Frontend 菜单变化或旧 Session 中缓存的 Capability 不能代表晋升已经安全生效。
- 移除 Super Admin 身份、停用该账号或执行会使其暂时失去完整认证能力的密码/TOTP 恢复操作前，必须在同一数据库事务和并发锁定范围内确认操作完成后仍至少存在一个其他有效 Super Admin。有效表示账号启用、初始化完成、TOTP 已绑定且 Super Admin 身份未被撤销。
- 平台始终要求 `activeSuperAdminCount >= 1`。最后一个有效 Super Admin 不得被移除、降级、停用或逻辑删除，也不能通过并发请求分别通过旧计数校验；不满足条件的命令必须 Fail Closed，并指引使用独立的紧急恢复流程，而不是绕过约束。
- Super Admin 可以移除自己的身份，但只有在另一个有效 Super Admin 已经存在时才允许。移除成功后立即提升 Authorization Version、撤销被移除账号的全部 Session，并使其所有新的配置、Super Admin 管理和其他受保护命令失败。
- Super Admin 身份变化不终止该人员此前作为 Human Owner 或普通用户发起的 Agent Attempt；已启动 Attempt 继续遵循不可变 Execution Binding。其后查看、取消、重试、配置和管理操作均按变化后的当前 Capability 重新校验。
- Bootstrap、晋升、拒绝晋升、移除、并发冲突、最后一人保护、Session 撤销和 Authorization Version 变化都必须进入追加式 Audit，并在平台管理后台显示当前 Super Admin 列表、账号状态、初始化/TOTP 状态、最近变更人和最近变更时间，但不展示任何密码、TOTP Secret 或认证材料。

### 3.7 Super Admin 紧急恢复（已确认）

- 当最后一个可用 Super Admin 因密码、TOTP、账号认证状态或人员不可达而无法完成正常恢复时，采用独立的带外 Break-glass Recovery Job/CLI；不允许普通管理员代为重置，也不允许运维人员直接执行 SQL 修改 PostgreSQL 身份、Capability 或 Super Admin 数据。
- Recovery 不通过 Web 页面、Ingress、普通平台 API 或长期运行的服务暴露。正式恢复工具使用 GitOps 锁定版本与镜像 Digest，平时不运行、不保留常驻高权限 ServiceAccount、Token 或数据库凭据；只在明确维护窗口内通过 Kubernetes 运维通道创建一次性 Job 或执行受控 CLI。
- 每次恢复通过临时专用 ServiceAccount、最小 RBAC、NetworkPolicy 和短生命周期执行身份调用 Control Plane 内部的 Super Admin Recovery Port。该身份只允许创建一个恢复 Case，不能读取或修改 Platform Policy、Workspace、Requirement、Assignment、Artifact、Audit 历史或其他业务数据，也不能直连 PostgreSQL、OpenBao 或 Object Storage 管理接口。
- 首版不生成、不保存、不校验平台专用的 Super Admin Recovery Key、分片或离线 Secret，也不创建对应的数据库表、API、管理页面或占位配置。恢复授权事实来自当前环境既有的 Kubernetes/GitOps 运维身份、已批准的 Git Revision 或变更记录、临时 ServiceAccount/RoleBinding 以及 Kubernetes Audit；不依赖此时可能已不可用的平台 Session 或 Super Admin 登录身份。
- Kubernetes/GitOps 运维身份是 Recovery 的基础设施信任边界，但不代表允许运维人员任意执行 Cluster Admin 命令或直接修改数据库。唯一受支持的恢复路径是运行版本与 Digest 锁定的 Recovery 工具，并通过内部 Super Admin Recovery Port 执行其受限命令。
- OpenBao Shamir 分片、OpenPGP Recovery Key、Root Token、用户 TOTP Secret 或其他系统 Secret 均不得复用为平台 Recovery Key，避免不同信任域相互耦合。未来若需要多人授权或外部信任源，可在 Recovery Port 前增加可替换的 Recovery Authorization Adapter 或额外离线凭据校验，不改变 Identity 与 Super Admin 状态模型；首版不预建空占位。
- 恢复发起时必须提供当前环境、8 位目标员工编号、操作人身份、原因和关联运维记录。目标必须是平台中已经存在且未被逻辑删除的本地实名员工账号；首版 Recovery 不创建任意新账号、不改变组织上下级、不授予 Workspace Membership，也不删除或降级原 Super Admin。
- 同一环境同时只允许一个活动 Recovery Case。Recovery Port 在单个数据库事务中撤销目标账号的既有 Session、旧临时凭据和旧恢复资格，提升 Authorization Version，并签发一次性受限 Bootstrap 资格；目标在完成正式密码设置和新的 TOTP Enrollment 前，不能进入普通业务页面或执行 Super Admin 命令。
- 如果目标原本不是 Super Admin，恢复流程只创建与该 Recovery Case 绑定的 Pending Super Admin Grant；只有一次性资格被原子消费、正式密码与 TOTP 初始化成功后才激活 Super Admin 身份。恢复过期、失败或被取消时 Pending Grant 自动失效，不能留下半激活的高权限账号。
- 一次性恢复资格沿用 Identity 模块的受控临时凭据 Policy、一次展示和有限有效期，但不得写入 Kubernetes Event、Pod/Job Log、Git、普通 Secret、ConfigMap、平台 Audit 正文或 Observability。无法通过批准的受控终端安全交付时必须中止恢复，不能为了方便打印明文凭据。
- 恢复成功后必须立即消费并销毁一次性资格，撤销 Recovery 执行身份，删除临时 RoleBinding/Job，确认新 Super Admin 能以正式密码和 TOTP 登录，再由其通过正常 Super Admin 流程处理旧账号。Recovery 工具本身不能直接发布配置、绕过 Human Gate 或保留后门 Session。
- Recovery Case 创建、目标校验、Session 撤销、Pending Grant、临时执行身份、成功、失败、过期、清理和重试必须同时关联 Kubernetes Audit/GitOps Revision 与平台追加式 Audit；任一必要 Audit 无法写入时 Fail Closed。平台管理后台只展示恢复编号、状态、操作者、目标员工编号、原因、时间线和清理结果，不展示恢复凭据。

## 4. Organization、Workspace 与 Authorization

### 4.1 组织层级（已确认）

平台当前只支持一层 Leader 和一层直属普通员工：

```text
经理
└── Leader（一个经理可有多个 Leader）
    └── 普通员工（产品、前端或后端）
```

- 创建 Leader 时必须选择其经理。
- 创建普通产品、前端或后端员工时必须选择其直属 Leader。
- 产品与开发可以属于不同经理和不同组织链，不要求共同经理。
- 第一阶段不支持 Leader 下再嵌套 Leader，也不支持普通员工拥有下属。
- 开发人员是否能创建 Requirement 由 Capability 决定，与产品/开发岗位本身不冲突。

### 4.2 Workspace 治理（已确认）

- 创建 Workspace 的 Leader 成为唯一 `Workspace Owner`。
- Owner 可以邀请或移除其他 Leader，并可以转让 Owner。
- 被邀请 Leader可以参与 Workspace 业务，但不能继续邀请、移除其他 Leader，也不能转让 Owner。
- Owner 治理能力是明确例外：除 Capability 校验外，命令还必须校验当前 Owner 事实，普通 Grant 不能绕过。
- Owner 无法操作时，可由具有专用 Override Capability 的平台管理员执行受审计的强制转让。

### 4.3 正式成员投影（已确认）

Workspace 正式成员为：

```text
当前 Owner
UNION 受邀 Leaders
UNION 上述每个 Leader 当前直属的普通员工
```

- 直属员工自动进入相应 Workspace，是组织关系影响 Membership/Scope 的明确例外。
- 经理不会仅因管理某个 Leader 自动成为 Workspace 正式成员。
- 被移除 Leader及其直属员工退出当前成员投影，但历史 Requirement、Assignment、Decision 和 Audit 不删除。
- Membership 只决定进入 Workspace 边界；具体动作仍需要 Capability + Scope。

### 4.4 授权校验（已确认）

- 菜单由后端根据当前有效 Capability 动态返回；前端隐藏按钮只改善体验，不是安全边界。
- 每个受保护 API 都必须重新校验当前 Principal、Capability、Scope、Membership、Assignment 和资源状态。
- 授权投影可缓存，但 PostgreSQL 中的当前版本是事实源；检测到版本过期必须回源或拒绝，不能使用陈旧权限完成写操作。
- 权限撤销优先保证安全；已启动 Attempt 按不可变 Binding 继续，但新的用户控制动作立即使用新权限。

## 5. Requirement 数据与生命周期

### 5.1 类型与执行对象（已确认）

- Requirement 类型为 `feat`、`fix`、`refactor` 和 `chore`，创建后类型不静默改写。
- Requirement、WorkItem、Agent Attempt和 Child Build Execution使用相互关联但独立的状态机，不能把 Agent或 Build失败直接当作 WorkItem/Requirement终态；Build终态是 Parent可消费的结构化 Child结果。
- 一个 Requirement 可以逐步产生多个 WorkItem；每个 WorkItem 只绑定一个 GitLab Project/Repository 和自己的任务分支。

### 5.2 归档、恢复与逻辑删除（已确认）

- Requirement 归档后从普通任务列表隐藏，在独立归档视图中只读展示。
- 归档进行中的 Requirement 时，平台先安全停止相关 Agent Run及其全部非终态 Child Execution，完成 Fence、Credential/Lease回收和结果固化；不得让 Parent或 Child在用户不可见状态继续产生变更。
- 归档可以恢复。恢复 Requirement 只恢复业务记录和可继续入口，不自动复活旧 Attempt。
- 用户要求继续时，平台基于原 Requirement 状态、最新 Commit 和已有 Artifact 创建新的 Attempt 或继续动作。
- 删除 Requirement 采用逻辑删除，进入独立 Deleted 视图；第一阶段不做物理清除。
- 第一阶段不实现 Legal Hold，也不为物理清除或 Legal Hold 创建无实际行为的占位表、占位字段、API 或模块。
- 在未来引入物理清除时，必须将数据保留期限、Legal Hold、清除资格、人工审批、级联范围、备份影响和销毁证明作为同一个数据治理能力整体设计；不能单独增加一个删除按钮。
- 删除、查看 Deleted 和恢复分别受 Capability + Scope 控制。已经明确使用 `requirement.deleted.read`、`requirement.deleted.restore` 等细粒度能力；创建人也不能绕过能力校验。
- Audit 是独立的追加式事实，不因 Requirement 归档、删除或恢复而删除或改写。

### 5.3 Artifact 与附件（已确认）

- Spec、Plan、测试报告、日志、截图及用户附件都通过统一 Artifact 元数据管理，并支持上传与下载。
- 用户上传的每个附件默认最大 `50 MiB`，同一 Requirement 的用户附件总量默认最大 `200 MiB`；这两个值是产品配额，不改变 Scanner 的 `100 MiB` 单对象安全 Envelope。
- 单附件上限和 Requirement 用户附件总额度都采用平台级全局动态配置，不通过修改代码调整。界面必须展示当前用量与剩余额度，达到总额度 80% 时预警；超过额度只拒绝新的上传初始化，不影响已有文件、历史下载或 Workflow。降低配置不得使已经合规上传的附件失效。
- `200 MiB` 总额度按仍被平台实际保留的用户附件数据计算，而不是只统计普通界面当前可见文件；`AVAILABLE`、待校验/待扫描、`QUARANTINED`、归档、逻辑删除及其他仍存在 Object Version 的用户附件都占用额度，只有未来经过正式物理清除流程确认对象已经删除后才能释放。这样不能通过反复上传、归档或逻辑删除绕过真实存储成本。
- 上传初始化必须在 PostgreSQL 中原子预占声明大小后才能签发 Presigned Request，多个并发上传共享同一 Requirement Quota 并受同一锁定/并发控制；没有产生对象且 Upload Session 到期的预占自动释放。若对象已经写入 RGW，即使完成回调失败，也必须先由对账确认对象是否仍被保留，再决定计入额度或释放，不能只相信 Frontend 状态。
- Product Quota Ledger 必须能够按 Requirement/Attempt 对账 PostgreSQL Artifact Metadata 与 Object Storage 的实际 Object Version/Size，差异、长期预占、孤立对象和统计延迟进入 Metrics、Alert、Audit 与平台管理后台。它只负责单 Object、Attempt、Requirement等产品额度；环境 Bucket Class总容量由独立 Environment Bucket-Class Capacity Ledger负责。上传初始化必须在同一受控事务/Reservation流程中同时满足并预占两类 Ledger，任一失败都不签发 Presigned Request；完成、失败、过期和对账按同一精确 Version分别调账，不能把释放产品额度误写为底层 Version已经 GC，也不能通过直接修改累计数字掩盖对象泄漏。
- Upload Session 到期后进入技术垃圾对账：默认等待 1 小时仍没有任何 RGW Object 时标记 `EXPIRED` 并释放预占；如果 RGW 已有 Object Version 但 PostgreSQL 没有有效 Artifact 引用，则标记 `ORPHANED`，默认保留 7 天供幂等回调、自动修复和人工排障。1 小时与 7 天都是版本化、受校验的 Cleanup Policy 默认值，可配置但不写死代码。
- `ORPHANED` 保留期到达后必须再次以精确 Bucket、Object Key 与 Version ID 交叉校验 Artifact、Quota、Object Lock/Retention 和业务引用；只有仍未被任何业务对象接受且不受锁定保护的技术垃圾才能物理删除。删除前后记录 Policy Version、两次对账证据、大小、Checksum、原因和结果；失败必须重试并告警，禁止按 Prefix、模糊条件或普通列表批量删除。
- 未完成 Multipart Upload 默认 24 小时后由 Bucket Lifecycle Abort，该时间同样是版本化可配置参数。`AVAILABLE`、`QUARANTINED`、归档、逻辑删除、关键 Artifact、Audit 与 Backup 永远不进入该自动清理流程；因此技术垃圾清理不等于第一阶段尚未实施的业务数据物理清除。
- Cleanup Policy 缩短时不得让既有 `ORPHANED` Object 立即跨越原定保护窗口；既有对象保留创建 Eligibility 时的 Policy Version，除非经过显式重新评估与审计。清理候选数、对象大小、最老年龄、删除/跳过/失败原因、Multipart Abort 和释放额度进入平台管理后台、Metrics 与 Alert。
- 平台生成的 Spec、Plan、测试报告、日志和 Agent Artifact 使用独立容量策略，不计入用户附件的 `200 MiB` 总额度；大型 Build、视频或其他超过附件定位的产物必须进入独立 Artifact 策略，不能通过拆分文件绕过 Requirement Attachment 配额。
- Agent Artifact 采用独立的三级全局默认额度：单个 Object 最大 `100 MiB`，单次 Attempt 所有 Agent Artifact 合计最大 `500 MiB`，同一 Requirement 下全部 Attempt 合计最大 `1 GiB`；三层均按实际仍保留的 Object Version 计算，并在上传/写入前原子预占。达到任一层 80% 时预警，超过任一层不得继续创建新的 Agent Artifact。
- Agent Artifact 超额时，相关 Attempt 必须安全停止并进入 `FAILED`，同时记录统一 `failureCode=RESOURCE_EXHAUSTED`、`failureDimension=ARTIFACT_QUOTA`、命中的 Object/Attempt/Requirement 配额层级及实际用量；已产生的 Artifact、日志、Checkpoint、额度证据和 Audit 必须保留。禁止静默截断 Spec、Plan、测试报告或验证证据，也不能把资源超限伪装成未分类的普通执行失败。额度调整采用平台级全局动态配置，降低额度不使既有 Artifact 失效。
- Git Working Tree、源码和 Commit 的权威副本保留在 GitLab，不打包复制到 Object Storage。大型 Build、Container Image、安装包及专业 CI 产物由 Jenkins、GitLab Package/Container Registry 或未来可替换的 Artifact Registry 保存；平台只通过 Adapter 记录稳定 URL/External ID、版本、SHA-256、大小、来源、生成时间和验证状态，不把外部大对象重复复制进 `agent-artifacts` Bucket。
- Agent Artifact Quota、实际用量、预占、增长趋势、80% 预警、Attempt/Requirement Top Consumer、External Artifact Reference 健康与对账差异必须进入平台管理后台；提高单 Object 上限超过 Scanner `100 MiB` Envelope 时必须同步调整并验证 File Security 与 Kubernetes 容量，不能只修改产品配置。
- 第一阶段只需要平台级全局动态配置，不必先实现 Workspace/Project 多级覆盖。
- Requirement Attachment 与普通 Agent Artifact 默认只启用 Versioning，不自动施加 Object Lock。与已完成 SDD Decision、最终验收、Merge、发布或其他正式证据绑定的 Artifact Version 标记为关键 Artifact，并使用 `GOVERNANCE` Object Lock；只有独立授予、必须填写原因且完整审计的 Object Storage Break-glass 权限可以在到期前绕过，普通平台管理员不默认拥有该权限。
- 浏览器上传、下载统一采用“Backend 授权 + 短期 Presigned Request”：Frontend 必须先调用平台 API，Backend 按当前用户的 Capability、Scope、Workspace/Requirement 关系、文件类型、单文件上限和总配额完成实时授权；Frontend 不直接连接 RGW Admin API，也永远不能取得 Bucket Access Key、Secret Key 或可列举 Bucket 的临时身份。
- 上传初始化时，Backend 先创建不可变 Artifact Version 元数据并生成不含用户文件名的服务端 Object Key，将其状态置为 `PENDING_UPLOAD`，然后签发只绑定当前 Bucket、Object Key、上传操作、预期大小、MIME 与 SHA-256 的 Presigned Request。默认有效期为 5 分钟，可通过受校验的全局配置调整；到期、签名不匹配、超限或校验不一致时必须 Fail Closed，不能把对象标记为可用。
- 上传完成后 Frontend 只提交完成确认，不自行声明成功。Backend 将对应 Artifact Version 从 `PENDING_UPLOAD` 转为 `PENDING_VERIFICATION`，再通过 Object Storage Adapter 读取 Object Metadata/Version ID，确认 RGW 已校验的 SHA-256、实际大小与 MIME 均符合初始化记录。相同 Upload ID 与结果的完成重试必须幂等；缺失对象、校验失败、冲突结果或越权完成进入 `UPLOAD_FAILED` 并产生 Audit。需要安全扫描的对象校验通过后进入 `PENDING_SCAN`，只有扫描结论为安全时才转为 `AVAILABLE`；任何非 `AVAILABLE` Artifact 都不能获得下载地址或进入 Workflow Gate。
- 下载时 Backend 每次重新校验当前权限与 Artifact 状态，再签发只允许读取该 Object Version 的短期 Presigned GET，默认有效期同样为 5 分钟并可配置。原始文件名仅作为经过安全编码的展示元数据和 `Content-Disposition` 使用，不参与 Object Key；Presigned URL 属于短期敏感信息，Backend、Frontend、Ingress、Audit 与 Observability 均不得持久化或记录其完整 Query String。
- PostgreSQL 只保存稳定引用和业务元数据，包括 Bucket Logical ID、Object Key、Version ID、SHA-256、实际大小、声明/检测 MIME、原始文件名、Artifact 状态、Owner、Requirement/Attempt 关联与时间戳，不保存 Presigned URL 或 S3 Secret。Requirement 归档、逻辑删除或恢复只改变平台元数据与可见性，第一阶段不据此删除对象、创建删除标记或绕过已生效的 Versioning/Object Lock。
- Requirement Attachment 使用版本化的全局 `Artifact File Policy` 管理文件类型，不在 Frontend 或领域代码中用扩展名 `if/else` 写死。首发默认允许普通无宏文档、图片、纯文本/源码片段和可完整检查的非加密压缩包；默认禁止可执行文件、安装包、动态链接库、含宏文档以及加密或密码保护的容器。Build、Container Image、安装包等交付产物继续使用外部 Artifact Registry，不通过普通 Requirement Attachment 绕过该边界。
- 平台管理后台按已知 File Type Category 提供允许/禁止勾选，并显示该类别对应的扩展名、声明 MIME、内容识别类型、安全限制、预览方式和当前 Policy Version；只有 Super Admin 可以通过统一 `platform.configuration.manage` 发布变更。上传初始化先按文件名和声明 MIME 做前置拒绝，上传完成后仍必须以内容特征、实际 MIME 和扫描结论再次校验；扩展名、声明 MIME 与内容不一致时 Fail Closed，不能只相信任一客户端字段。
- 可配置的是“当前安全能力已经能够完整识别和检查的已知类别是否接受”，不是允许管理员用任意扩展名声明一种新的安全格式。未知格式、新增解析器或当前 Scanner 无法完整检查的类别必须保持不可用并显示原因；加密/密码保护内容在首版不能通过勾选绕过完整检查。未来 FileSecurity Adapter 声明并通过兼容性 Gate 证明具备完整检查能力后，才可在不修改 Artifact 领域模块的前提下把对应类别纳入可配置目录。
- 即使默认禁止但可完整检查的类别由 Super Admin 改为允许，也必须继续执行内容识别与恶意文件扫描，并强制使用下载附件方式而不是浏览器内联预览或执行；`scanRequired`、Fail Closed、Private Bucket、短期 Presigned Request 和禁止公开执行均属于不可关闭的 Security Floor。
- Upload Session 和 Artifact Version 必须保存命中的 File Type Category 与 `Artifact File Policy` 版本。Policy 变更默认只影响之后初始化的上传和显式发起的重新扫描，不追溯把既有 `AVAILABLE` Artifact 改成可疑、也不使既有拒绝结果自动转为可用；配置发布、回滚、命中、拒绝和内容类型不一致都进入 Audit、Metrics 与平台管理后台。
- 用户上传、外部 Connector 作为 Artifact 导入以及其他包含外部二进制内容的对象必须异步安全扫描；平台内部受信流程生成且经类型约束的纯文本 Spec、Plan、日志等可以按版本化 Policy 跳过扫描。是否扫描由 Artifact Source、Media Type 与 Policy Version 决定，不能由 Frontend 或调用者自行声明“可信”。
- 扫描范围包括上传或导入的 PDF、Office 文档、图片、压缩包、日志、JSON、用户自定义 Spec/Plan 及其他可下载文件，也包括包含外部内容的 Agent 二进制产物。Git Repository 的源码 Checkout、Sandbox 工作目录与依赖安装不属于 Artifact 文件扫描链路，由 Sandbox Isolation、Source/Dependency Security 和 CI 验证分别负责；PostgreSQL/NATS/OpenBao Backup、Audit WORM、Prompt、聊天消息及普通 API Payload 也不进入该文件扫描链路。
- Artifact 模块只依赖可替换的 `FileSecurity Port`，具体扫描引擎通过 Adapter 接入，不把厂商 API、Signature Format 或扫描进程状态写入领域模型。完整性校验成功时，Backend 在同一事务中写入 `PENDING_SCAN` 与 Outbox Event；异步 Worker 消费后按 Artifact Version、SHA-256 和 Scan Policy Version 幂等调用 Adapter，避免重复投递产生不同业务结果。
- 扫描结论统一归一化为 `CLEAN`、`MALICIOUS`、`SUSPICIOUS` 或 `ERROR`，并记录基于文件内容检测的 MIME：`CLEAN` 才能使 Artifact 进入 `AVAILABLE`；`MALICIOUS`/`SUSPICIOUS` 进入 `QUARANTINED`。引擎不可用、Signature 过期、超时或解析失败必须保持 `PENDING_SCAN` 并按可配置的有上限退避策略重试；超过最大次数后进入 `SCAN_FAILED`、告警并允许引擎恢复后受控重新入队，始终不可下载。扫描故障必须 Fail Closed，但不能影响已经处于 `AVAILABLE` 的既有安全 Artifact。
- `QUARANTINED` 对象继续保存在 Private Bucket 中，普通用户、普通管理员、Workflow 与 Agent 均不能获得其 Presigned Download；界面只展示经过脱敏的隔离状态与处理编号。第一阶段不自动物理删除，也不提供任何人工绕过或放行能力；误报只能在 Signature/Policy 更新后重新扫描并得到 `CLEAN`，或者由用户重新上传。原始对象、Scan Result、Policy/Signature Version、时间线与操作者保留 Audit，后续物理处置必须纳入统一数据治理设计。
- File Security Worker 使用独立 Workload Identity，只具备读取待扫描 Attachment/Artifact Object Version 和写回结构化扫描结果所需的最小权限，不具备 Bucket List、Put/Delete、Retention Bypass 或跨环境访问权限；文件内容不得发送到 Model Provider、外部 SaaS 或日志。扫描队列积压、最老等待时间、吞吐/延迟、各 Verdict 数量、失败重试、引擎健康以及 Signature Version/Age 必须进入平台管理后台、Metrics 与 Alert。
- 正式首版 File Security Engine 固定采用 ClamAV `1.5.3`，许可证为 GPLv2；平台通过独立进程/容器和 `FileSecurity Adapter` 调用，不把 ClamAV Library、内部数据结构或协议扩散到领域模块。YARA-X 只保留为未来自定义规则补充层，不作为 ClamAV 的首版替代或当前必装组件。
- 部署使用官方 Debian multi-arch `clamav/clamav-debian:1.5.3_base` 镜像，在每个目标 CPU Architecture 上把实际 Image Digest、SBOM 与漏洞扫描结果固化到 GitOps；禁止使用 `latest`、`stable`、`1.5` 等浮动 Tag。Digest 锁定用于可复现部署，但不能替代安全升级；ClamAV Patch/Image 重建必须经过 DEV 兼容、恶意/正常样本、压缩包限制、并发扫描、Signature Reload、故障回退和资源峰值验证后再提升到 PROD。
- ClamAV Engine Image 与 Virus Signature Database 使用独立生命周期：`freshclam` 从经批准的官方更新源增量更新并验证 Signature，数据库持久化在 `/var/lib/clamav`，Pod 重启不能每次重新全量下载。Signature Version、发布时间、最近成功更新时间、下载/校验/Reload 结果和各副本一致性必须可观测；超出有效时限时 Scanner 退出 Ready，新的 Artifact 保持 `PENDING_SCAN` 并告警，不能使用过期 Signature 返回 `CLEAN`。
- ClamAV 必须启用受限的递归归档扫描和资源保护；达到最大文件大小、总展开大小、递归深度、文件数量、扫描时间，或遇到无法检查的加密归档时，Adapter 必须归一化为 `SUSPICIOUS`/`ERROR`，禁止把“未完整扫描”解释为 `CLEAN`。Adapter 还负责使用内容特征检测实际 MIME 并与声明类型比较，ClamAV Verdict 不能替代完整的 MIME Policy。
- `clamd` 扫描接口不得通过 Ingress、NodePort、LoadBalancer 或公网暴露，也不能供普通业务 Pod 任意访问；后续无论选择同 Pod 本地调用还是独立 Service，都必须通过 Namespace/ServiceAccount NetworkPolicy、最小客户端范围和连接超时限制保护。扫描文件只在内存或受限临时空间中处理，禁止持久化第二份明文副本。
- File Security 采用一体化 Scanner StatefulSet：每个 Pod 固定包含 `File Security Worker` 与 `clamd/freshclam` 两个 Container，并通过 Pod 内共享 Unix Socket 调用，不创建可被其他 Pod 访问的 ClamAV Network Service。DEV 与 PROD 均使用 2 个 Replica，并通过同一个 Manifest/Component Shape、HA Contract 和环境化 GitOps 模板实例化；单 Replica 资源容量可以由 Environment Capacity Profile 调整，但不得把任一正式环境降为单副本。
- 每个 Scanner Replica 使用独立 `5 GiB`、RWO Signature PVC 持久化 `/var/lib/clamav`，禁止多个 `freshclam` 实例并发写同一数据库目录；PVC 只保存 Virus Signature，不保存待扫描 Artifact 或第二份业务文件。每个 Replica 独立更新、验证和 Reload Signature，只有本副本 Engine/Database 健康且版本未过期时才能进入 Ready。
- 单个 Scanner Pod 的 ClamAV Container 资源基线为 Request `1 CPU / 3 GiB RAM`、Limit `2 CPU / 6 GiB RAM`；File Security Worker Container 为 Request `200m CPU / 256 MiB RAM`、Limit `1 CPU / 1 GiB RAM`。该资源必须计入普通 Kubernetes Worker Node 的可调度容量与故障余量，不得调度到专用 Ceph Storage Node，也不得因低日活省略 Signature Reload 和归档扫描的内存峰值余量。
- 每个环境的两个 Scanner Pod 必须通过 Required Pod Anti-Affinity/Topology Spread 分布在不同普通 Worker Node，并配置 `PodDisruptionBudget minAvailable=1`。首版使用固定 Replica，不启用 HPA；未来吞吐或队列等待超过 SLO 时，可通过 GitOps 增加完整 Scanner Replica，不改变 Artifact、Outbox、FileSecurity Port 或 Workflow。
- 任一 Scanner Pod 故障、升级或 Signature Reload 时，未完成任务由异步队列重新投递到健康副本；全部 Scanner 不可用时，新文件保持不可下载并积压、立即告警，既有 `AVAILABLE` Artifact 不受影响。滚动升级必须先确认本环境另一副本 Ready、Signature 有效且能够消费扫描任务，任何时刻不得同时中断本环境的两个 Scanner。
- 首版每个 Scanner Replica 直接通过受控 Egress 从 ClamAV 官方 `database.clamav.net` 更新 Signature，不额外部署 Private Mirror；`freshclam` 固定每天检查 12 次，即每 2 小时一次，并为不同 Replica 注入受控随机 Jitter，避免同时下载、校验和 Reload。只有 Scanner 数量、Cluster 数量、带宽或出口策略达到独立演进阈值后才引入 Private Mirror，更新源切换不改变 FileSecurity Port、Artifact 状态机或业务代码。
- `freshclam` 保持 `TestDatabases=yes`，新数据库必须先通过数字签名、完整性与 Engine Load Test，成功后才通知本 Pod 的 `clamd` 执行 Concurrent Database Reload；任一步骤失败都保留 Last-known-good Database，禁止用损坏或未验证数据库替换当前可用版本。同一环境不同 Scanner Replica 的 Signature Version 差异超过一个更新周期必须告警。
- Signature Freshness 同时依据数据库发布时间和最近一次成功更新/验证时间判定：连续 6 小时未成功更新触发 Warning，12 小时触发 Critical，超过 24 小时则该 Scanner 退出 Ready、停止返回 `CLEAN`，新对象保持 `PENDING_SCAN` 并等待健康副本或后续重试。更新故障不得删除既有 Database，也不得影响已经 `AVAILABLE` 的 Artifact。
- 更新频率、Jitter、6/12/24 小时阈值、当前 Signature Version/Age、各副本一致性、最近成功/失败原因、下载字节、验证与 Reload 时间都由版本化 GitOps 配置并展示在平台管理后台；允许收紧阈值，放宽超过当前安全基线必须经过受控架构/安全变更，不能由普通平台配置绕过 Fail Closed。
- ClamAV 扫描基础设施使用独立于产品上传配额的安全 Envelope：`StreamMaxLength/MaxFileSize=100 MiB`、`MaxScanSize=400 MiB`、`MaxRecursion=17`、`MaxFiles=10000`、`MaxScanTime=120s`。100 MiB 是 Scanner 能够接收的单对象硬上限，不代表普通用户自动获得 100 MiB 单文件额度；产品额度必须小于或等于该上限。
- 每个 Scanner Replica 固定 `MaxThreads=2`、`MaxQueue=4`，File Security Worker 同时最多向本 Pod 的 `clamd` 提交 2 个任务；其余任务留在持久化异步队列中，不在 Pod 内堆积大文件。DEV 与 PROD 在两个 Replica 均健康时的首版总扫描并发均为 4；单副本故障时降为 2，并由持久化异步队列承接积压。重投递继续使用 Artifact Version、SHA-256 与 Policy Version 保证幂等。
- 必须启用 `AlertExceedsMax` 以及加密归档/文档告警；达到输入大小、展开总量、嵌套深度、文件数量或扫描时间上限，以及无法完整检查的加密内容，都归一化为 `SUSPICIOUS`/`ERROR` 并 Fail Closed，禁止因达到 ClamAV Limit 就返回 `CLEAN`。
- 扫描大小、解包限制、线程和本地队列均为版本化 GitOps 运维配置并展示在平台管理后台；提高任一上限或并发必须先验证 ClamAV/Worker CPU、RAM、临时空间、队列等待、恶意压缩包和超时行为，并同步调整 Pod/Node 容量，不能通过普通产品配置突破 Scanner Envelope。

### 5.4 Requirement 最终验收（已确认）

- Requirement 最终验收默认责任人为 Requirement 创建人。
- 最终验收与 SDD Confirmation、WorkItem 执行和 MR Review 是彼此独立的责任，不能因为其中一项由某人完成就自动继承另一项权限或结论。
- 创建人可以按统一 Assignment 规则异步改派实际验收人。
- 实际验收人必须是当前 Acceptance Assignment 的 assignee，并具备最终验收要求的 Capability、Scope 和有效 Membership。
- 创建人缺少验收资格时不能直接验收，只能改派给合格候选人。
- 验收 Decision 必须绑定明确的 Requirement 版本、验收标准和交付基线；相关内容变化后旧结论失效但历史保留。
- 最终验收发生在合并 `main` 之前。所有必需 WorkItem 完成 `dev` 集成、测试和独立 Jenkins 人工验证后，平台先冻结 Requirement Integration Baseline，再进入最终验收。
- Integration Baseline 必须记录每个必需 WorkItem 的仓库、任务分支 Commit SHA、`dev` 集成结果、Artifact hash 和验证证据；不能只绑定会继续变化的 `dev` HEAD。
- 最终验收通过且 Decision 对当前 Integration Baseline 仍有效，才允许为各 WorkItem 创建 Formal MR。
- 验收不通过时，相关 WorkItem 回到实现阶段或增加修正 WorkItem；未通过的交付不能进入 `main`。
- Requirement 只有在最终验收有效且所有必需 WorkItem 的 Formal MR 均已合并 `main` 后才能进入 `COMPLETED`。

### 5.5 WorkItem 分配（已确认）

WorkItem 必须区分以下事实：

- `createdBy`：创建 WorkItem 的人员，只表示审计事实；
- `humanOwnerId`：对该 WorkItem 最终负责的人；
- `executorType` / `executorId`：实际执行者，可以是 Human 或 Agent；
- `requiredCapabilities`：执行该 WorkItem 必须满足的能力集合。

创建 WorkItem 时按以下规则处理：

```text
创建人具备 requiredCapabilities + Scope + Membership
  → humanOwnerId = 创建人
  → executor = 创建人
  → ASSIGNED

创建人不具备执行资格
  → UNASSIGNED
  → 发布 WorkItemAssignmentRequired
  → 等待异步分配
```

- `createdBy` 不自动授予执行能力；产品创建开发 WorkItem 时，如果没有代码执行资格，WorkItem 必须保持 `UNASSIGNED`。
- 只有具备 `work_item.assign` 和对应 Scope 的人员可以分配；候选人必须是有效 Workspace 成员，并满足 WorkItem 执行、仓库访问和资源状态要求。
- 多人并发分配时使用版本校验，只接受第一笔基于当前版本的有效写入。
- `UNASSIGNED` 可以保存、展示和通知，但不能启动 Agent、修改代码或创建 Formal MR。
- 系统可以提醒或升级长期未分配事项，但不能随机选择执行者。
- Human 执行时，`humanOwnerId` 与 Human executor 通常相同。
- Agent 执行时仍必须指定 `humanOwnerId`；Agent 是执行者，不是 SDD、MR 或最终验收的人工责任人。
- WorkItem 启动前至少必须完成：执行者分配、人类负责人设置、仓库绑定、任务分支创建、必要 Gate 满足，以及执行者资格的实时复核。
- 尚未启动的 WorkItem 可以直接受控改派；运行中的 WorkItem不能把既有 Attempt 静默换人，应先安全停止或等待当前 Attempt 结束，保留 Commit、Artifact 和日志，再基于新 Assignment 创建新 Attempt。
- 创建、自动分配、人工分配、改派、并发冲突、阻塞和启动均写入 Audit。

### 5.6 WorkItem 主状态机（已确认）

WorkItem 主状态只表达业务交付进度：

```text
DRAFT
→ READY
→ IN_PROGRESS
→ VERIFYING
→ AWAITING_MERGE
→ COMPLETED

终止状态：
CANCELED | SUPERSEDED
```

- `DRAFT`：WorkItem 已创建，但负责人、执行者、仓库、分支或前置 Gate 可能尚未就绪。
- `READY`：启动所需的 Assignment、Repository Branch Binding、Gate 和权限 Guard 全部满足。
- `IN_PROGRESS`：Human 或 Agent 正在实现；要求修改时也回到该状态继续原 WorkItem。
- `VERIFYING`：实现完成并进入 `dev` 集成、测试及独立 Jenkins 人工验证阶段。
- `AWAITING_MERGE`：Requirement 最终验收已通过且 Formal MR 已创建，等待 Review、Approval 或 Merge。
- `COMPLETED`：Formal MR 已合并 `main`。Source branch 后续自动清理失败不回退已完成的业务事实，而是产生独立运维待办。
- `CANCELED`：用户按 Capability主动取消且相关 Attempt及其非终态 Child均已安全停止、Fence并释放 Lease。
- `SUPERSEDED`：WorkItem 被新的替代 WorkItem 接管，不再计入 Requirement 完成条件。

以下内容不进入 WorkItem 主状态，使用独立维度表示：

```text
assignmentState = UNASSIGNED | ASSIGNED
repositoryState = WAITING_REPOSITORY | BOUND
blockedReasons[]
Attempt.status = CREATED | BINDING | QUEUED | PROVISIONING | RUNNING | WAITING_INPUT | WAITING_CHILD | FINALIZING | SUCCEEDED | CANCELING | CANCELED | FAILED | TIMED_OUT
BuildExecution.status = CREATED | QUEUED | PROVISIONING | RUNNING | FINALIZING | SUCCEEDED | CANCELING | CANCELED | FAILED | TIMED_OUT
```

- `UNASSIGNED`、`WAITING_REPOSITORY`、`WAITING_GATE`、外部服务不可用等是准备条件或阻塞原因，不能制造主状态组合爆炸。
- Attempt 失败、超时或取消不会把 WorkItem 直接变成失败终态；只要 WorkItem 未取消或被替代，就可以在问题处理后创建新 Attempt。
- MR 要求修改时，WorkItem 从 `AWAITING_MERGE` 回到 `IN_PROGRESS`；旧 Review Decision 按 head SHA 失效，历史保留。
- WorkItem 从 `VERIFYING` 进入 `AWAITING_MERGE` 前，必须校验其所属 Requirement 对当前 Integration Baseline 的最终验收仍然有效。
- 所有状态转换使用版本校验、业务 Guard 和 Audit，不允许客户端直接覆盖状态字段。

### 5.7 Requirement 主状态机（已确认）

所有 Requirement 类型共用同一主状态机；类型差异由 Route、Artifact 和 Gate 表达：

```text
CREATED
→ PREPARING
→ AWAITING_CONFIRMATION
→ READY
→ IN_PROGRESS
→ VERIFYING
→ AWAITING_ACCEPTANCE
→ AWAITING_MERGE
→ COMPLETED

终止状态：
CANCELED
```

- `CREATED`：Requirement 已持久化，正在初始化首个 GitLab Project、WorkItem 和必要外部绑定。
- `PREPARING`：执行需求澄清，并按类型生成 SDD、Debug Baseline 或技术计划。
- `AWAITING_CONFIRMATION`：等待当前 Route 实际要求的 SDD/Baseline Human Gate。
- `READY`：受控 Baseline 已确认，可以完成 WorkItem 拆分、分配和启动准备。
- `IN_PROGRESS`：至少一个必需 WorkItem 正在实现，或验收/MR 退回后正在返工。
- `VERIFYING`：所有必需 WorkItem 已进入集成、测试和独立 Jenkins 人工验证阶段。
- `AWAITING_ACCEPTANCE`：Requirement Integration Baseline 已冻结，等待最终验收。
- `AWAITING_MERGE`：最终验收已通过，各必需 WorkItem 的 Formal MR 正在审核或合并。
- `COMPLETED`：最终验收对当前 Baseline 仍有效，且所有必需 Formal MR 均已合并 `main`。
- `CANCELED`：Requirement被具备 Capability的人员主动取消，运行中的 Attempt及其非终态 Child均已安全停止、Fence并释放 Lease；历史 Artifact、Commit、Decision和 Audit保留。

以下内容不进入 Requirement 主状态：

```text
blockedReasons[]
recordState = ACTIVE | ARCHIVED | DELETED
WorkItem.status
Attempt.status
MR.status
```

- 归档或逻辑删除只改变 `recordState`。恢复后回到归档/删除前的 Requirement 主状态，不复活旧 Attempt。
- Attempt、Sandbox、Model 或 Adapter 失败只产生阻塞原因和可恢复操作，不把 Requirement 直接改成 `FAILED`。
- 最终验收拒绝时回到 `IN_PROGRESS`，通过修正 WorkItem 继续；范围扩大时另建关联 `feat` Requirement。
- Formal MR 要求修改或代码变化导致 Integration Baseline 失效时，Requirement 回到 `IN_PROGRESS` 或 `VERIFYING`，旧 Acceptance/Review Decision 失效但历史保留。
- 多仓部分合并时 Requirement 保持 `AWAITING_MERGE` 并进入显式处置流程，不能错误标记 `COMPLETED`。
- 所有状态转换由后端命令、版本校验和 Guard 驱动，并写入 Audit。

## 6. SDD、Human Gate 与审核人路由

### 6.1 SDD 路由（已确认）

- `feat` 进入完整 SDD 路由。
- `fix` 不重复完整 Product SDD，使用 Superpowers 的 `systematic-debugging`、TDD、验证和代码评审流程。
- 第一阶段使用 Superpowers Runtime Bundle，不接入 `grill-me`，也不在平台重复实现 Superpowers 已提供的方法。
- 无论 Product、Backend 还是 Frontend，只要 Workflow 实际启用了某个 SDD，该 SDD 都必须经过人工确认 Gate。

### 6.2 Human Gate 模型（已确认）

所有人工 Gate 统一建模为：

```text
GatePolicy
→ GateInstance(subject + version/hash)
→ Current Assignment
→ Decision
```

- Gate 类型描述业务责任，不把“产品 Leader”“开发 Leader”等岗位编码进 Approval 类型。
- 实际审核人必须同时是 Gate 当前 assignee，并具备所需 Capability、Scope 和有效 Membership。
- 允许自审：创建人或产物作者只要是当前 assignee 且资格有效，就可以审核自己创建的内容。
- Agent、AI Review、确定性检查和系统管理员不能伪造普通人工 Decision。
- Decision 完成后封存；后续人员变化不改写原 Decision。
- Artifact、bundle hash 或 Commit 变化时，旧 Decision 失效并保留历史，必须针对新版本重新确认。

### 6.3 SDD 默认审核人（已确认）

所有 Requirement 类型的 SDD 都采用同一条平台基线规则：默认审核人为 Requirement 创建人。

| Requirement 类型 | 当前默认审核人解析规则 |
| --- | --- |
| `feat` | Requirement 创建人 |
| `fix` | Requirement 创建人 |
| `refactor` | Requirement 创建人 |
| `chore` | Requirement 创建人 |

所有类型仍可按统一 Assignment 规则异步改派。该默认值只作用于 SDD Confirmation，不决定正式 MR 的审核人。

Super Admin 可以通过版本化 Gate Policy 调整某个 Scope 的默认解析规则，但系统出厂配置和未覆盖时的回退值始终是 `CREATOR`，不在业务代码中按类型写死不同岗位。Workspace Owner、Leader 和普通管理员不能修改 Gate Policy，只能在 Assignment 规则允许时处理具体 Requirement 的未完成责任。

默认创建人不代表系统自动授予 SDD 审核资格。如果创建人缺少该 Gate 要求的 Capability、Scope 或 Membership，Gate 必须阻塞，创建人只能把实际审核人改派给合格候选人，不能直接确认。

### 6.4 异步设置审核人（已确认）

- Requirement 创建与人工选择审核人解耦，创建请求不等待后续人工分配。
- 创建 Requirement 时，系统根据当时有效的版本化 Gate Policy 解析并保存 `defaultReviewerId`；未配置覆盖时该值就是创建人，同时初始化 `currentReviewerId = defaultReviewerId`。
- 如果默认审核人不做任何改派，其本人就是实际审核人，因此不会出现无审核人的空状态。
- 默认审核人可在 Requirement 创建后异步选择或修改实际审核人。
- 正常路径中只有 `defaultReviewerId` 对应人员可修改 `currentReviewerId`；被选中的实际审核人只负责审核，不能继续转派，除非其同时就是默认审核人。
- 候选人必须具备该 Gate 要求的 Capability + Scope；Assignment 本身不能补足资格。
- 审核人设置可以晚于 Artifact 生成，但 Workflow 到达对应 SDD Confirmation Gate 后必须等待 `currentReviewerId` 完成确认。
- Gate 已经形成最终 Decision 后，不再允许改审核人；新 Artifact 版本创建新的 Gate/Decision 关系。
- 默认审核人离职、停用或失去有效 Scope 时，正常用户不能绕过。具备 `sdd.reviewer.override` 的管理员可填写原因后强制改派，操作必须完整写入 Audit。
- `sdd.reviewer.override` 只用于默认审核人不可用的恢复场景，不能绕过 SDD 必须确认、审核资格、Artifact 版本绑定或已经完成的 Decision。

### 6.5 审核职责边界（已确认）

- 所有 Requirement 类型的 SDD 均采用 `CREATOR` 基线 Policy、单个 Current Reviewer 和 Current Assignment；第一阶段不实现 quorum 或固定双签。
- SDD Confirmation 与 Formal MR Review 使用彼此独立的 Policy、Assignment 和 Decision，不共享审核结论。
- Formal MR 审核人按 MR Review Policy 和 WorkItem 人类负责人解析，并允许按统一资格规则受控改派。
- Leader 可以作为默认路由解析来源，但不是硬编码执行人；实际审核始终由当前合格 assignee 完成。

### 6.6 状态与 Gate 枚举命名（已确认）

- API、Schema、Event和 Audit中的业务枚举不得使用 `DEV_*`表达“开发/研发岗位”，也不得把 `PRODUCT_LEADER`、`DEV_LEADER`或其他默认路由岗位编码进 Gate Type。Gate Type只描述被确认的业务责任；默认审核人、实际审核人和历史解析证据分别由 GatePolicy、Assignment与 Decision Snapshot表达。
- Requirement需要等待当前人工责任确认时使用统一主状态`AWAITING_CONFIRMATION`。Product SDD、Technical SDD、Debug Baseline或技术计划的差异由Route、Artifact Type、Gate Subject与Policy表达，不通过岗位化主状态制造分支状态机。
- SDD与其他Route Baseline统一使用`REQUIREMENT_BASELINE_CONFIRMATION`；具体被确认对象由GateInstance的`subjectType`、`subjectId`、`subjectVersion/hash`和Route Snapshot区分。第一阶段只有一个Current Reviewer与一个最终Decision。
- 最终验收使用`REQUIREMENT_ACCEPTANCE`，表达对当前Requirement Integration Baseline的验收责任，不假设验收人岗位。
- Formal MR人工Review使用`FORMAL_MR_REVIEW`并绑定准确`headSha`；实际审核人按MR Review Policy、Current Assignment、`merge_request.review` Capability与Scope解析，可以是Leader、其他合格开发或作者本人。
- Decision结果使用独立、稳定的`APPROVED`、`CHANGES_REQUESTED`、`REJECTED`等枚举，不能把Reviewer岗位混入结果名称。当前没有为废弃命名提供Alias、双写或运行时兼容分支。
- `DEV`、`PROD`、`DEV_VALIDATED`、`PROD_APPROVED`等确实表示 Platform Environment或 PCS Promotion阶段的枚举继续保留；本规则只清理把 `DEV`误作“Developer/Engineering”的业务命名，不能把真实环境枚举机械改为 `ENGINEERING_*`。

## 7. GitLab Project、分支与 MR

### 7.1 Project 与仓库绑定（已确认）

- 平台中的 Project 直接对应 GitLab Project，不重复建设另一套代码项目实体。
- 创建 Requirement 时必须选择且只选择一个初始仓库，不能创建无仓库 Requirement。
- Requirement 的第一个 WorkItem 自动继承并绑定该初始仓库。
- 产品创建的 Requirement通常选择前端仓库；纯后端需求也必须选择后端仓库。
- 前端或后端开发自行创建 Requirement 时选择自己实际工作的仓库。
- 后续拆分出的 WorkItem 可以先创建和分配人类负责人，暂时处于 `WAITING_REPOSITORY`，不要求产品或上游人员提前猜测开发仓库。
- 后续 WorkItem 的人类负责人确定后，由人类负责人从 Workspace 已授权的 GitLab Project 中选择对应仓库；实际操作仍需仓库绑定 Capability 和有效 Scope。
- 每个 WorkItem 最终必须且只能绑定一个仓库。仓库未绑定前不能创建任务分支、启动 Human/Agent 执行或创建 MR。
- Agent 可以提供仓库建议，但不能代替人类负责人作出仓库绑定决定。
- 仓库选择、修改尝试、失败和最终绑定结果必须写入 Audit。
- 因此，一个 Requirement 可以通过多个 WorkItem 最终覆盖多个仓库。
- 同一仓库存在前端、后端等多个 WorkItem 时，每个 WorkItem 使用独立任务分支。
- 任务分支创建前，人类负责人可以在权限允许范围内修改 WorkItem 仓库选择。
- 任务分支创建成功后，`repositoryId + baseCommitSha + branchName` 构成不可变 Repository Branch Binding，不允许在原 WorkItem 上切换仓库。
- 分支创建后发现仓库选错时，原 WorkItem 标记为 `SUPERSEDED` 并保留仓库、分支、Commit、Attempt、Artifact 和 Audit 历史；平台创建新的替代 WorkItem、新的全局编号和新的任务分支。
- 新旧 WorkItem 通过 `supersedesWorkItemId`/等价关系关联；被替代 WorkItem 不计入 Requirement 完成条件。
- 不通过搬运 Commit、修改历史绑定或覆盖 Audit 的方式伪装成原 WorkItem 从一开始就在新仓库。

### 7.2 分支规则（已确认）

- 所有任务分支从对应仓库的 `main` 当前基线创建。
- 分支命名为 `type/wi-<全局递增号>-<semantic-slug>`，例如 `feat/wi-1024-user-profile`；编号不是日期。
- `main` 是受保护分支，任何人和 Agent 都不得直接 Push，只能通过正式 MR 合并。
- Agent 只能操作 Execution Binding 授权的仓库和任务分支。

### 7.3 `dev` 集成与正式 MR（已确认）

交付顺序为：

```text
task branch（from main）
→ Integration MR: task branch → dev
→ 开发人员在独立 Jenkins 中手工构建/测试
→ 一键创建 Formal MR: task branch → main
→ 人工审核
→ 合并 main
```

- Integration MR 不需要 Leader 人工审核，开发人员可自行合并，但仍受 GitLab 确定性检查和分支保护规则约束。
- `dev` 使用 merge commit 保留集成上下文。
- 首版 Jenkins 是独立平台：用户手动触发和查看，研发平台不调用 Jenkins、不读取 Jenkins 状态，也不把 Jenkins 作为平台 Gate。
- 开发人员确认外部测试完成后，在平台点击“一键创建 MR”。
- Model 生成 MR title/description；GitLab Connector 实际创建 `task branch → main` MR。无须先展示 Modal 预览。
- 创建 MR 命令必须幂等；重复点击返回已有 MR。
- `main` 正式 MR 使用 squash merge。
- 正式 MR 合并后自动删除 source branch；Commit、MR、Approval 和 Audit 历史保留。
- 不需要建立固定的 `main → dev` 同步步骤；同一任务分支依次进入 `dev` 和 `main`，`dev` 可以同时包含尚未进入 `main` 的其他工作。

### 7.4 正式 MR 审核与合并（已确认）

- Formal MR 不依据 GitLab Bot、Connector Service Account 或 Agent 身份解析人工审核人，而是依据 WorkItem 当前的人类负责人（`humanOwnerId`）。
- 人类负责人是普通开发人员时，默认审核人为其直属 Leader；人类负责人本身是 Leader 时，默认审核人为其本人。
- Agent 可以作为 WorkItem 执行者，但 WorkItem 仍必须保存人类负责人；Agent 创建 MR 时沿用该人类负责人的审核路由，Agent 自身不能成为人工审核人。
- Formal MR 创建时保存实际默认审核人、Policy 版本和解析快照；无法解析合格人类审核人时 Gate 阻塞，等待受控改派。
- 默认 Leader 可把实际审核人改派给任何具备 `merge_request.review` 和有效 Scope 的候选人，包括 MR 作者本人。
- Leader 是默认路由来源，不是不可替换的硬编码审批岗位；最终 Decision 仍由 Current Review Assignment 的 assignee 作出。
- `merge_request.review` 表示审核资格；只有该 MR 当前 Review Assignment 的 assignee 可以作出 Decision。
- 审核人可以是开发本人，包括作者本人，只要 Assignment、Capability 和 Scope 均满足。
- 审核人要求修改时继续使用同一个分支和同一个 MR，不自动新建 `fix` Requirement。
- Approval 必须绑定准确 `headSha`；批准前 head 变化会使旧检查/审批失效并重新审核。
- MR 批准后冻结 source branch，禁止继续 Push；需要新改动时按新的 `fix` 或 `feat` 处理。
- `merge_request.merge` 是与 Review 分离的 Capability；有审核权不自动拥有合并权。

## 8. Agent、Model 与 Sandbox

### 8.1 Control Plane 与执行平面（已确认）

- Control Plane 是一个 Python 项目的模块化单体部署单元，内部模块包括 Identity、Organization、Workspace、Authorization、Requirement Workflow、Agent Run 和 Audit。
- Agent Orchestrator、Model Gateway、Sandbox Controller/Worker 独立部署，隔离高风险执行面并支持单独扩缩容。
- 模块通过明确 Application Port、领域事件和独立数据所有权协作；禁止跨模块直接读取或修改对方数据表。
- 后续拆分微服务时，应能提取单个模块而不重新设计其他业务模块。

### 8.2 Agent Run 与 Execution Binding（已确认）

- Run 表示业务执行目标，Attempt 表示一次具体执行；重试创建新 Attempt，不覆盖旧记录。
- 每个 Attempt 固定 Agent Definition、Runtime 镜像 digest、Superpowers Bundle hash、Skill、Model Deployment、Tool Policy、Context Policy、Runtime Permission、仓库和分支。
- Attempt 运行中不得静默更换 Model、Skill、Runtime 或 Policy；任何更换都创建新 Attempt。
- 用户 Session 或控制权限变化不会中断已经启动的 Attempt，但会立即影响之后的查看、取消、重试和新 Run。
- 归档 Requirement 时属于显式业务取消，必须安全停止相关运行并吊销临时凭据。

### 8.3 Attempt 主状态机（已确认）

```text
CREATED
→ BINDING
→ QUEUED
→ PROVISIONING
→ RUNNING
→ FINALIZING
→ SUCCEEDED

交互恢复路径：
RUNNING → WAITING_INPUT → QUEUED → PROVISIONING → RUNNING

异步子执行恢复路径：
RUNNING → WAITING_CHILD → QUEUED → PROVISIONING → RUNNING

取消路径：
任意活动状态 → CANCELING → CANCELED

超时路径：
任意活动状态 → CANCELING → TIMED_OUT

其他终态：
FAILED | TIMED_OUT
```

- `CREATED`：已创建 Attempt 记录，尚未形成不可变 Execution Binding。
- `BINDING`：解析并固定 Model、Skill、Runtime、Tool、Context、权限、仓库和分支等执行输入。
- `QUEUED`：Execution Binding 已持久化并通过校验，等待 Orchestrator 调度。
- `PROVISIONING`：创建或恢复 Sandbox、挂载代码并获取短期 Secret Lease。
- `RUNNING`：Agent 正在执行。
- `WAITING_INPUT`：Agent 已发出结构化交互请求，等待用户补充信息；它不表示 SDD、MR 或 Requirement 的 Human Gate，后者仍由 Workflow 管理。
- `WAITING_CHILD`：Agent 已提交并绑定一个其后续执行所依赖的异步 Child Execution，Checkpoint已固化且 Agent Sandbox已释放，正在等待子执行的持久化终态结果；首发 Child Type为 Image Build。它不是用户审批、Human Gate、新 Attempt或 Parent Attempt终态。
- `FINALIZING`：固化 Artifact、日志和 Checkpoint，记录执行结果，清理计算资源并吊销短期凭据。
- `SUCCEEDED`：本次 Attempt 成功结束。
- `CANCELING`：已进入幂等安全终止流程，`terminationCause`明确记录用户取消、Parent/Requirement级联取消、归档/删除或 Deadline；正在停止 Parent及非终态 Child、保存可保存状态、Fence副作用并吊销临时凭据。不得从活动状态直接跳到 `CANCELED`或 `TIMED_OUT`。
- `CANCELED`：安全取消已经完成。
- `FAILED`：本次执行因不可恢复错误失败。
- `TIMED_OUT`：本次执行超过允许时限，完成安全终止后进入该终态。

状态转换 Guard：

- `CREATED → BINDING` 前必须已经关联 Run、WorkItem 和当前有效 Assignment，并具备形成 Execution Binding 所需的业务输入。
- `BINDING → QUEUED` 前必须完成不可变 Binding 的持久化、校验和 Audit；解析失败进入 `FAILED`。
- `QUEUED → PROVISIONING` 必须由 Orchestrator 获得唯一且带 Fencing Token 的 Sandbox Capacity Lease，避免同一 Attempt 被重复启动或并发上限被超卖。
- `PROVISIONING → RUNNING` 前必须确认 Sandbox 就绪、代码和分支绑定正确、网络策略已生效且所需短期 Secret Lease 可用。
- `RUNNING → WAITING_INPUT` 只允许在结构化问题、截止时间、Checkpoint 和 Correlation ID 已持久化，并完成计算资源与短期 Secret 释放后发生。用户有效答复不直接恢复 `RUNNING`，而是使同一个 Attempt 在 Execution Binding 不变的前提下进入 `QUEUED`，重新获得 Sandbox Capacity Lease 后再执行 `QUEUED → PROVISIONING → RUNNING`。
- `RUNNING → WAITING_CHILD`只允许通过持久化 Handoff完成：以稳定 Idempotency Key创建或确认唯一 Child Execution及不可变 Child Binding，持久化 Parent Checkpoint、日志/Artifact位置、Correlation/Causation ID和恢复点，安全停止 Parent Materialization、吊销其短期 Secret并原子释放1个 Agent Unit；Child在 `parentLeaseReleased=true`被可靠证明前只能保持 `QUEUED`，不得获取 Build Lease。上述步骤使用同库事务加 Outbox或 Temporal Saga/Reconciliation实现，不假设跨进程分布式事务，也不得因重试创建第二个 Child。
- Child终态结果完成持久化和 Finalization后，仍处于 `WAITING_CHILD`且未被取消、归档或超时的 Parent Attempt才可进入 `QUEUED`；它沿用原 Execution Binding、Attempt ID、Checkpoint和审计链，重新获得1个 Agent Unit后再恢复。Child成功、失败、取消或超时都形成结构化结果；Child失败本身不自动终结 Parent，Parent恢复后可按既定 Tool/Workflow Policy处理，只有 Parent自身不可恢复错误或 Deadline触发其终态。
- 正常执行结束必须先进入 `FINALIZING`；Artifact、日志、Checkpoint、资源清理和 Secret 吊销结果均须记录，不能直接进入 `SUCCEEDED`。
- 安全终止必须幂等；活动 Attempt接受取消或发生 Deadline后统一经过 `CANCELING`，完成 Parent/Child停止、Fence、Lease/Credential释放和清理后，按不可变 `terminationCause`分别进入 `CANCELED`或 `TIMED_OUT`。

Attempt 终态不可逆：

- 已进入 `SUCCEEDED`、`CANCELED`、`FAILED` 或 `TIMED_OUT` 的 Attempt 不得重新进入活动状态。
- 业务重试创建新的有序 Attempt，并记录来源 Attempt 和重试原因；旧 Attempt 及其 Binding、日志和结果保持不变。
- Temporal Activity 可以在同一 Attempt 内对瞬时基础设施错误做有限重试，但不得改变 Execution Binding；更换 Model、Runtime、Skill 或 Policy 必须创建新 Attempt。
- Attempt 的 `FAILED`、`TIMED_OUT` 或 `CANCELED` 不会自动把 WorkItem 或 Requirement 置为业务终态，由上层 Workflow 决定重试、阻塞、取消或继续。
- 每次状态变化、Guard 失败、取消、超时和重试关系都必须写入 Audit，并贯穿 Run、Attempt、WorkItem 和 Requirement 的 Correlation ID。

`WAITING_INPUT` 采用“挂起并释放资源”策略：

- 等待期限由平台策略动态配置，默认 24 小时，不写死在业务代码中。
- Attempt 创建 Execution Binding 时解析当前有效等待期限，并保存配置值和 Policy 版本；之后修改配置只影响新 Attempt，不追溯改变已运行 Attempt 的截止时间。
- 进入 `WAITING_INPUT` 时，必须持久化结构化问题、Checkpoint、已有日志和 Artifact；释放活动计算资源并吊销短期 Secret Lease，但保留可恢复所需的逻辑 Sandbox 元数据和受生命周期策略保护的数据。
- 用户在截止时间前回复时，系统重新校验其当前访问权限、WorkItem Assignment 和控制 Capability；校验通过后把同一个 Attempt 送回 `QUEUED`。只有重新获得 Sandbox Capacity Lease 后才能进入 `PROVISIONING`、申请 Sandbox 资源与短期 Secret Lease，并在 Execution Binding 不变的前提下恢复执行。
- 等待超时后经 `CANCELING`完成安全清理并将 Attempt置为 `TIMED_OUT`；WorkItem不自动进入业务终态，而是记录可处理的阻塞原因。
- 超时后的迟到回复不得复活原 Attempt；如需继续，基于原 Attempt 的 Checkpoint 创建新 Attempt，并保留完整关联关系。

`WAITING_CHILD`采用“持久化 Handoff、挂起 Parent、独立执行 Child”策略：

- 同一 Parent Attempt首发任一时刻最多关联1个非终态 Child Execution；允许顺序创建多个 Child，但前一个必须已经终态并将结果交付 Parent，不能并行拆分来绕过 Build上限或 Capacity Ledger。
- Parent进入该状态后不持有 Agent Sandbox Capacity Lease、活动 Sandbox、短期 Model/Git/Secret Credential或本地唯一状态，因此不计入 Agent活动并发；Child使用独立 Binding、Execution ID、Build Lease、Credential、Workspace和 Fencing Token，并通过 Parent Attempt ID保持关联。
- Child结果必须先固化不可变结果或结构化错误、日志/Artifact Reference、结束原因与 Audit，再释放 Child资源。Parent恢复前重新校验 Parent尚未终态、Requirement未归档/删除、没有显式取消或 Fence、原 Binding/Checkpoint仍可用以及结果确属绑定 Child；用户 Session退出或普通查看权限变化不改变此前已确认的“已启动 Attempt继续”语义。
- Child完成 Finalization并证明2-Unit Build Lease可释放时，若 Parent通过上述恢复校验且当前 Agent Policy允许其继续，Ledger必须在同一受控提交中释放 Child的2 Units并从中建立专属于该 Parent的 `1-Unit Continuation Reservation`；Parent进入 Agent Continuation Queue并优先用该 Reservation重新获得 Agent Lease，剩余 Unit才对普通新 Agent或下一个 Build开放。Reservation不绕过 `agent.sandbox.active_attempt_limit`、Resource Vector、Placement或安全 Gate，不抢占已有执行，并使用可配置 TTL与 Reconciliation；Parent失效、取消、超时或恢复 Gate失败时立即释放，不能永久占住容量。
- Parent与 Child各自使用在 Binding中固化的可配置 Queue/Execution/Overall Deadline；进入 `WAITING_CHILD`不会复用 `WAITING_INPUT`默认24小时、重置或无限延长 Parent Deadline。Parent取消、Requirement归档/删除或 Parent Deadline到期时必须级联取消仍非终态的 Child，并经 `CANCELING`完成 Fence和清理后使 Parent进入对应 `CANCELED`或 `TIMED_OUT`；随后到达的 Child结果只能审计，不得复活 Parent。
- Controller/Temporal重启、Outbox重复投递、Child先完成或清理回执延迟时，都由 Parent ID、Child ID、Idempotency Key、Generation和 Fencing Token幂等收敛。无法证明 Parent Lease已释放时不启动 Child；无法证明 Child Lease及副作用已停止时不重复 Build或恢复 Parent。

Sandbox 活动并发与排队采用以下统一基线：

- 首发定义 Platform Scope 的版本化 `PLATFORM_POLICY` Key `agent.sandbox.active_attempt_limit`，Value Type 为正整数、Minimum 为 `1`、Maximum 动态取当前 Active Capacity Profile 已验证的上限，Initial Desired 为 DEV `5`、PROD `8`，Promotion Mode 为 `TARGET_REQUIRED`。只有 Super Admin 可以通过既定 Configuration ChangeSet 发布流程调整；Frontend、Agent、Workspace Owner、Leader、普通管理员和单个 Requirement 不能覆盖。它限制的是本环境同时持有 Sandbox Capacity Lease 的 Attempt 数量，不是账号数、DAU、Requirement 数、Pod 数或队列长度。
- Image Build另使用 Platform Scope的版本化 `PLATFORM_POLICY` Key `agent.image_build.active_build_limit`，Value Type为非负整数、Minimum为 `0`、Maximum动态取当前 Active Capacity Profile已验证上限，首发两个环境的 Initial Desired和 Maximum均为 `1`，Promotion Mode为 `TARGET_REQUIRED`。发布为0拒绝新的 Build Handoff；已持有 Build Lease的执行不被强杀，已完成 Handoff但尚未取得 Lease的排队 Child则形成结构化 `CANCELED/POLICY_DISABLED`安全终态并唤醒 Parent，不能无限等待策略恢复。该 Key只能在物理 Capacity Envelope内降低或恢复产品上限，不能把 Build变成不占 Sandbox资源的后台任务。
- 两个 Key都使用 `IMMEDIATE` Effect Semantics。降低 Agent Limit只阻止超出新值的 Agent Lease获取，既有 Agent自然运行并收敛；降低 Build Limit立即拒绝新的 Build Handoff，已持有 Build Lease的执行自然完成，已 Handoff但尚未取得 Lease且超出新值的 Child则以结构化 Policy终态恢复 Parent。任何下调都不强杀已持有对应 Lease的执行，也不修改其 Binding。共享 Capacity Unit、完整 Resource Vector、逐 Node Placement与实时安全 Gate仍同时约束两类 Lease，但降低一个产品上限不能无条件冻结另一类 Lease。
- `QUEUED` Attempt以及已经完成挂起清理的 `WAITING_INPUT`/`WAITING_CHILD` Attempt不持有 Agent Sandbox Capacity Lease，因此不计入活动并发；`PROVISIONING`、`RUNNING`、`FINALIZING`、`CANCELING`是否计入不能仅凭状态名称推断，以实际仍持有的唯一 Lease为准。资源完全释放或安全清理完成后必须原子释放 Lease；同一 Agent Attempt任一时刻最多持有一个有效 Agent Lease，子级 Image Build以独立 Build Execution ID持有自己的 Build Lease，不能把两者误建成同一 Attempt的两个 Agent Lease。
- 用户在有效期限内答复 `WAITING_INPUT` 后，系统先完成既定权限、Assignment 与 Binding 校验，再把同一个 Attempt 送回持久化 `QUEUED`。无可用 Lease 时继续排队且不创建 Sandbox、不签发短期 Secret；获得 Lease 后才进入 `PROVISIONING`。这不是业务重试，不创建新 Attempt，也不改变原 Attempt 的超时历史、Checkpoint、Correlation ID 或 Execution Binding。
- Orchestrator 的多个 Replica 必须通过原子 Compare-and-set/唯一约束或等价的 Fenced Lease Contract 获取容量，禁止先数 Pod 再启动造成超卖。Lease 必须关联 Environment、`ownerKind=AGENT_ATTEMPT|IMAGE_BUILD`、Owner Execution ID、可选 Parent Attempt、Generation/Fencing Token、Resource Profile、获得时间和最近续约事实；Controller 重启、Pod 丢失、Provisioning 失败、超时与取消后通过 Reconciliation 证明资源已停止再回收，不能因过早复用槽位导致两个 Sandbox 同时持有同一执行身份。
- Sandbox Capacity Ledger使用内部加权 `Capacity Unit`作为首发准入单位：Resource Profile `resource/standard-v1=1 Unit`，Resource Profile `resource/image-build-v1=2 Units`；Unit不是 CPU时间、计费单位、用户配额或两个 Pod，只是把已经锁定的 Resource Vector映射到同一原子容量账本。首个 Environment Capacity Profile的 `maxSandboxCapacityUnits`为 DEV `5`、PROD `8`，Build Lease与 Agent Lease必须在同一事务/CAS及同一 Fencing域内一次性获得其完整 Unit，禁止先拿1 Unit再等待第二个造成死锁或超卖。
- 实际可授予 Agent Attempt数同时受 `agent.sandbox.active_attempt_limit`、当前 Profile的 `maxActiveSandboxAttempts`、剩余 Capacity Unit和实时安全可调度资源约束。没有 Build时最多为 DEV `5`、PROD `8`；存在1个 Build时它占用2 Units，因此可同时持有 Agent Lease的其他 Attempt最多为 DEV `3`、PROD `6`，处于 `WAITING_CHILD`的 Parent不在其中且占用0 Unit。Build实际上限同时受 `agent.image_build.active_build_limit`、Profile的 `maxActiveImageBuilds=1`、剩余至少2 Units和实时资源约束；任何维度不足都保持对应请求排队，不抢占或取消已启动执行。
- Super Admin只能在 Capacity Envelope内设置产品上限，不能借 `PLATFORM_POLICY`超过物理容量、N+1、Kata Runtime、Ephemeral Storage或故障余量。降低任一 Policy Limit不撤销既有 Lease，只停止对应 Kind的新 Lease并等待自然收敛；容量事实不可验证、发生多重故障或安全调度余量不足时，共享安全 Gate可以暂停两类准入并告警，而不是超卖、强杀无关执行或调度到其他 Node Role。
- DEV和 PROD的首个 Capacity Profile必须证明：在扣除 OS/Kubernetes Reserved、DaemonSet、Kata `PodOverhead`、镜像/日志/临时存储和其他 Runtime Overhead，并移除任意一个最大 `sandbox-worker` Host后，仍可安全承载不超过本环境 `5/8 Units`的任意批准组合，包括全 Agent、1个 Build加其余 Agent以及故障后重建。当前 Node和磁盘仍只是 Capacity Candidate；真实 Agent/Build、Runtime Overhead、Allocatable和故障验证完成前，不能宣称 Sandbox Capacity Profile已经 `VALIDATED`或 `ACTIVE`。
- 平台管理后台必须在当前环境展示 Agent/Build Desired Policy Limit、Profile `maxSandboxCapacityUnits`、实时 Effective/Free/Consumed Units、Build Pending Reservation与 Parent Continuation Reservation、各 Profile Unit Weight、Active Agent/Build Lease、普通 Agent/Agent Continuation/Build三个 Queue的 Length/Age、`WAITING_INPUT`/`WAITING_CHILD` Parent、Parent/Child Handoff阶段、Lease获取失败/泄漏/回收、Node故障后的可承载组合、Throttle、趋势、Alert、Audit和 Runbook。只有两个 Policy Limit通过 Configuration模块供 Super Admin受控编辑；Unit Ceiling、Weight、Lease、Reservation、Node和调度事实均只读，DEV不读取或控制 PROD，PROD亦然。

Sandbox Resource Profile 采用以下正式基线：

- 首发普通 Agent只启用一个不可变 Resource Profile `resource/standard-v1`，下文可简称 `standard-v1`；它必须显式绑定安全章节的 Runtime/Guest Profile `runtime/agent-standard-v1`，二者是不同类型的版本化记录，不能仅凭相似名称推断。逻辑 Sandbox Environment仍归属于 Requirement；该 Resource Profile为其中单个持有 Sandbox Capacity Lease的 Attempt的一次活动物理 Materialization提供聚合执行预算：CPU Request `2 vCPU`、CPU Limit `4 vCPU`、Memory Request `6 GiB`、Memory Limit `8 GiB`、Ephemeral Storage Request `30 GiB`、Ephemeral Storage Limit `50 GiB`，映射为 `1 Capacity Unit`。数值不是每个 Pod或 Container各自获得一份；全部 Agent控制 Pod、Init Container、Tool Container、普通 Container、Writable Layer、受计量日志和 `emptyDir`必须聚合计入同一 Profile，禁止通过拆 Pod、重启或 Sidecar绕过。
- `resource/image-build-v1`是独立、不可变的 Build Resource Profile，下文可简称 `image-build-v1`；它必须显式绑定 `runtime/image-build-v1`和对应 Tool Profile，Typed ID/Digest分别记录，不能把同名短标签当成同一个对象。一次 Build只创建1个独立 Kata Materialization，但固定映射为 `2 Capacity Units`；聚合 CPU Request/Limit为 `4/8 vCPU`，Memory Request/Limit为 `12/16 GiB`，Ephemeral Storage Request/Limit为 `60/100 GiB`。该预算覆盖 Rootless BuildKit、受信 Init/Tool Container、Container Layer、Context、Build Scratch与受计量日志，不是给每个 Container重复一份；Build不得拆成多个 Lease、借父 Agent的剩余资源或通过远程 Cache绕过 Unit和 Ephemeral Limit。
- Build Lease必须绑定 Environment、Build Execution ID、Parent Requirement/WorkItem/Attempt、Profile ID/Digest、`unitWeight=2`、Generation/Fencing Token和资源向量。Parent只有在完成前述 Handoff并释放自己的1 Unit后，Child才有资格原子获取完整2 Units；Parent保持 `WAITING_CHILD`且占用0 Unit，禁止保留 Parent Lease等待 Build，也不能把已释放的1 Unit直接冒充 Build的部分 Lease。Build完成、取消、超时或故障后先固化 Digest、日志、SBOM/Provenance和必要 Artifact，再销毁 Guest、撤销 Credential并原子释放2 Units；Node故障导致 Build中断时先 Fence旧执行，再进入有界重试或持久队列，不能并发恢复两份 Builder。
- `standard-v1` 是版本化 `GITOPS_CONFIG`，至少记录稳定 Profile ID、Manifest Digest、Resource Vector、适用 Runtime/PCS、QoS/Enforcement Contract、Ephemeral Storage 口径和验证证据；PCS 声明可接受的 Resource Profile Schema 与 Minimum/Maximum Envelope，Environment Capacity Profile 引用其精确 ID/Digest 并据此计算节点容量。修改任何 Request/Limit 都创建新的 Profile ID/Digest 和新的 Capacity Profile Candidate，不原地修改 `standard-v1`，也不通过 `PLATFORM_POLICY`、Frontend、Agent 或普通 Helm Value 覆盖。
- 每个 Attempt 的 Execution Binding 必须固化 Resource Profile ID、Digest 和解析后的完整 Resource Vector，Sandbox Capacity Lease 绑定同一事实。运行中或从 `WAITING_INPUT`/`WAITING_CHILD`恢复的同一 Attempt始终使用原 Profile；Child使用其独立不可变 Build Binding。新 Profile只影响新 Attempt或新 Child，仍被非终态 Parent/Child引用的 Profile/Runtime Artifact不得 Retire或删除，确保等待恢复不会因 GitOps更新而静默换规格或无法重建。
- 上述 Request/Limit 是 Agent 可控制执行负载的聚合预算；Kata `PodOverhead`、Sandbox Controller 注入的受信 Sidecar/Agent、Pause/CNI、Node DaemonSet、OS/Kubernetes Reserved、Image Cache 和日志/安全基础设施开销不从这份预算中偷扣，也不对用户重复显示成可用资源。这些固定或实测 Overhead 必须按 Runtime Version/Pod Shape 进入 PCS 和 Capacity Profile，并在 Scheduler Request、N+1、单 Node 故障和 DiskPressure 验算时额外相加。
- Sandbox Controller 是 Resource Profile 到 Kubernetes Runtime 的唯一受控 Materializer。它必须使用 ResourceQuota/LimitRange、Admission Policy、Pod Overhead 和等价 Runtime 约束，确保每个 Container 声明资源且整个逻辑 Sandbox 的 Request/Limit 不超过 Binding；Agent、Sandbox 内进程、用户 Manifest 和 Tool 不得自行增加 Pod 数、修改 Resource、选择其他 RuntimeClass、切换 Node Role 或删除配额对象。Workflow 只依赖 Resource Profile Port，不依赖 Kubernetes Namespace、ResourceQuota 或 Kata 私有字段。
- CPU 在 Request 以上、Limit 以下可以受控 Burst，达到 CPU Limit 时由 Runtime Throttle 并记录 CPU Throttling/Duration；单纯 Throttle 不自动把 Attempt 判为失败，但仍受执行 Deadline。Memory 不使用 Swap，达到 Memory Limit 并发生 OOM 时必须安全终止本次执行；Ephemeral Storage 达到 Limit、Local Eviction 或写满风险时必须停止新增写入并进入安全清理。两类不可继续错误都使 Attempt 进入 `FAILED`，记录 `failureCode=RESOURCE_EXHAUSTED` 以及 `failureDimension=MEMORY` 或 `EPHEMERAL_STORAGE`、容器/Pod/Node、Request/Limit、Peak、Eviction/OOM 证据和可重试建议，不能无限原地重启。
- Ephemeral Storage 只保存可重新生成的 Repository Checkout、Dependency Cache、Build/Test 中间文件、Container Writable Layer 和有界临时日志，不是 Git、Artifact、Checkpoint、Audit、Secret 或业务事实源。进入 `WAITING_INPUT`、`WAITING_CHILD`、Finalizing、Cancel、Failure和 Sandbox回收前，必须先把需要保留的 Commit、结构化 Checkpoint、日志和 Artifact按各自权威链路固化；本地临时目录随后可幂等清理，Node丢失不能成为丢失唯一业务事实的原因。
- 首版不向用户暴露 Small/Large 自选规格，也不按岗位、Requirement 类型、Model 或仓库写死不同资源。未来可以在相同 Resource Profile Port、Execution/Build Binding、Capacity Lease 和 Admission Contract 下增加新的已验证 Profile，并由版本化 Agent Policy选择。每个新 Resource Profile必须声明不可变 `unitWeight`和完整 Resource Vector，由 PCS/Capacity Profile验证映射后共享 Ledger才可按 Weight原子扣减；真实 CPU/Memory/Ephemeral/Overhead/Placement Gate仍逐次执行。更大 Profile可能降低同时可调度数量，DEV `5 Units`、PROD `8 Units`不是任何 Profile下固定可运行5/8个 Materialization。
- 平台管理后台必须在当前环境只读展示 `resource/standard-v1`、`resource/image-build-v1`及其显式 Runtime/Tool Binding的 Desired/Effective Typed ID/Digest、Unit Weight、Request/Limit、Runtime/PCS、Kata/Sidecar/Node Overhead、逐 Agent Attempt/Build Execution实际 CPU/Memory/Ephemeral Usage与 Peak、Throttle、OOM、Eviction、DiskPressure、Quota/Admission拒绝、`RESOURCE_EXHAUSTED`维度、Active Lease、N+1验证、Drift、Alert、Audit和 Runbook。页面不得修改 Profile、Runtime、Pod Resource、Quota或 Node容量；DEV只展示 DEV Binding与用量，PROD只展示 PROD。

### 8.4 Model Gateway（已确认）

- 首版接入阿里云百炼 `compatible-mode`，通过兼容接口统一访问。
- 当前使用的 qwen、deepseek 和 kimi 等名称必须作为可配置 Model Deployment/alias，业务 Workflow 不绑定厂商或具体版本。
- 当前DEV首个Model Catalog Candidate登记`qwen3.8-max`、`deepseek-v4-flash`、`deepseek-v4-pro`和`kimi-3`四个Provider配置名/alias；它们是可替换的环境配置Seed，不是业务代码常量。激活前必须由Model Adapter读取Provider实际Model ID、Capability、Context、搜索/思考支持、Quota、价格和健康状态并形成验证证据；某个Deployment不可用时只影响对应Route/Allowlist，不修改Workflow。
- 用户对话区使用的 Chat Model 与 Agent 实际开发使用的 Execution Model 分开配置和治理。
- 用户是否能选择某个 Model 由 Model Policy 和 Allowlist 决定；Agent Workflow 请求逻辑能力，再由 Model Route Policy 解析实际 Deployment。
- 联网搜索和深度思考是 Model Deployment 的能力元数据。UI 仅在当前 Model 支持时显示对应开关。
- 百炼等 Provider 的 `enable_search`、thinking 参数通过 Provider Adapter 映射；非 OpenAI 标准字段不得泄漏到 Requirement Workflow。
- Agent 开发允许使用联网搜索，但通过受控的 Model Search Capability 或批准的 Connector；不能因此给 Sandbox 开放无限制公网访问。

### 8.5 Sandbox（已确认）

- Sandbox 使用独立 Kubernetes Sandbox Node Pool，并采用 Kata Containers 等强隔离 Runtime。
- 一个 Requirement 对应一个逻辑 Sandbox Environment；物理上可以包含多个 Pod，环境不是代码或业务事实源。
- Sandbox Controller 只暴露稳定 Sandbox Port；Workflow 不依赖 Pod、Node 或具体 Runtime 标识。
- Sandbox 网络、文件、计算、Secret 和工具权限按 Attempt 最小授权。
- 需要访问依赖源、GitLab、Model Gateway 或搜索能力时通过 Allowlist/Connector 放行，不开放任意公网出口。
- Agent Injector 将短期 Secret 写入 Pod 的内存文件；Secret 不进入镜像、代码、Commit、日志、Prompt、Artifact 或持久化磁盘。

## 9. 平台技术与基础设施

### 9.1 架构准则（已确认）

采用“可替换基础设施 + 可提取模块化单体”：

- 业务模块依赖内部 Port，不依赖某个基础设施厂商 SDK。
- PostgreSQL、Valkey/Redis-compatible、Event Bus、Secret Manager、Object Storage、Model Provider 和 Source Control 均由 Adapter 隔离。
- 替换某一基础设施时，可以独立部署、迁移、测试和回滚，不要求同步重构其他能力模块。
- 相同协议不等于完全无差异；迁移仍需 Adapter Contract、兼容性测试、数据迁移和故障切换验证。

### 9.2 规模与部署环境（已确认）

- 首年员工账号少于 50，峰值日活按不超过 30 人设计。
- 即使规模较小，也按照正式生产安全、审计、备份和高可用基线设计，不把 Demo 方案当作目标架构。
- DEV 和 PROD 是同一平台架构在不同服务器与独立 Kubernetes Cluster 中的两个环境实例，不使用 k3s，也不以 Docker Compose 作为正式开发环境基线。这里的“独立”只表示运行实例和故障域隔离，不表示维护两套组件设计、技术选型或实现代码。
- DEV 与 PROD 必须同源使用相同的组件清单、逻辑角色与 HA/复制机制、接口 Contract、GitOps 模板和 PCS；每个 Cluster 根据同一声明独立实例化本环境组件。Environment Capacity Profile 可以参数化 Node/Replica 数、资源容量与由此形成的故障余量，但不能删除逻辑角色、改变 Quorum/复制协议、使用不同组件实现或形成不同业务代码；数据、入口地址、域名、证书、凭据、密钥、Cluster ID、状态和故障域事实保持环境隔离。
- 当前只部署 DEV，因此现阶段只存在 DEV 的运行实例；未来建设 PROD 时使用相同版本和模板在 PROD Cluster 中重新实例化，而不是让一个运行中的 Kubernetes Resource、Pod、Gateway、数据库或有状态组件跨两个 Cluster 共享。文档中的“DEV/PROD 各自部署”“分别部署”均按此语义理解：同源定义、环境独立实例，不是两套架构。
- 两个环境实例都按同一 Node Role/GitOps Contract 包含平台服务、正式基础设施和专用 `sandbox-worker` Node Pool；对应 Node、Pod、运行状态与故障域不跨环境共享。
- 当前通过环境域名或入口地址自然区分部署；管理产品统一叫“平台管理后台”，页面不做同时切换 DEV/PROD 的跨环境控制台。
- 当前用户访问平台的北向入口可先使用 IP，域名、Edge Load Balancer、WAF、DDoS和公网边界由既有运维体系负责；已有 VPN不纳入平台开发范围。这里的 Edge Load Balancer不包括 Kubernetes API的 Private L4 HA Endpoint：后者属于每个 Cluster独立的 Control Plane基础设施基线，不能与公网 WAF、业务 Gateway、Ingress或用户入口 LB复用。
- Cloud Foundation的环境隔离下限固定为“独立 Cloud Account + 独立 VPC”。当前 Alibaba Cloud Provider Mapping使用一个专用、无业务 Workload的 Resource Directory Management Account治理成员账号；当前 DEV绑定在 Resource Directory内新建且禁用 Root User的独立 DEV Resource Account与独立非默认 Custom VPC，未来部署 PROD时再新建同类的独立 PROD Resource Account与独立非默认 Custom VPC。Management Account、DEV Account与PROD Account是治理/运行边界，不是三套平台产品；DEV与PROD继续消费同源代码、IaC Module、GitOps模板、PCS和 Contract，只用环境参数生成彼此隔离的实例。保留 Root User的既有 Enterprise Cloud Account不作为正式 DEV/PROD运行边界；若已有资源，只能通过受审计迁移项目迁入目标 Resource Account并在 Cutover后退出运行路径，不能把两种账号安全语义当作等价 Provider Mapping。
- Resource Directory Management Account不部署 Kubernetes、ECS、NLB、数据库、OpenBao、Object Storage、Model Connector、业务 Gateway、平台 Backend或任何 DEV/PROD运行资源，也不保存平台用户、业务数据、Runtime Credential、Workload Secret、Unseal Share或 Recovery Private Key。它只承担 Resource Directory、成员账号生命周期、组织级 Guardrail、受控委派与集中治理元数据；日常业务和平台请求不得调用 Management Account API。Management Account Root/最高权限只用于受审计 Break-glass，必须使用强 MFA、离线恢复与最小人员范围，普通运维通过短期受控身份执行，不创建日常使用的长期 Root Access Key。
- 每个 Platform Environment的权威 Cloud Boundary由版本化、不可原地改写的 `CloudEnvironmentBinding` Generation标识；新账号、VPC、Region或拓扑替换必须创建新 Generation并保留旧 Binding与迁移证据。Binding至少包含 Environment ID、Resource Directory Member ID、Cloud Account UID Fingerprint、VPC ID、Region、Zone Set（当前 Single-Zone为一元素集合）、IaC State/Revision、按需 Private DNS状态以及 Provider Mapping；具体账号 UID、VPC/vSwitch/CIDR、Route Table、Security Group、NLB、NAT/EIP和 Provider Resource ID不得进入业务领域对象、Frontend常量或通用 Helm Contract。模块只能消费当前 Environment解析后的逻辑 Endpoint、StorageClass、Workload Identity与 Infrastructure Port，未来切换云账号、VPC或云厂商只替换 Binding、Provider Adapter、IaC和迁移证据，不修改 Requirement、Workflow、Agent或 Authorization代码。
- DEV与PROD必须使用不同的 IaC State、State Encryption/Lock、Provisioning Identity、Resource Directory Member、VPC、vSwitch、Route Table、Security Group、NLB、Kubernetes Cluster、Registry/Artifact授权、KMS/CMK、Backup Identity与 Provider Audit Stream；Private DNS、NAT/Egress等只有在当前环境确实需要时才创建，一旦存在也必须按环境独立，未启用时 Binding明确记录 `ABSENT/NOT_APPLICABLE`。禁止用一个 IaC Workspace、一个 Cloud Role、一个 Access Key、一个 Security Group或共享 VPC Prefix承载两个环境。模板复用不允许把环境参数放入同一个可误操作的批量 Apply事务；Promotion、变更和 Destroy必须按 Environment形成独立 Plan、Approval、Execution与 Audit。
- 两个环境的 VPC、vSwitch、Node、Pod与Service等目标 CIDR必须全局不重叠，并在 Provisioning前与企业网络及 VPN Source Pool通过权威 IP Address Plan执行冲突校验；同一企业 VPN Client/Source CIDR可以服务两个环境，但不得与任一目标网段重叠，且必须由运维为 DEV与PROD分别发布最小 Route、目标、端口、身份与 ACL。DEV与PROD不共享 VPC、vSwitch、Route Table、Security Group、ENI、Kubernetes API NLB或已启用的 Private DNS Zone，也不默认建立 VPC Peering、CEN、Shared VPC或可互相路由的 Transit；VPN存在不代表 DEV与PROD可以互访。若未来确需跨环境或共享服务通信，必须创建带明确 Producer/Consumer、方向、协议、身份、数据分类、流量限制、Audit、Failure Semantics与撤销路径的 External Connectivity Contract，默认优先 PrivateLink式单服务暴露，不能直接放开整段 CIDR双向互通。
- Cloud IAM以 Environment为最小运行信任域：DEV Workload、CI/CD、IaC Runner、Backup、Watchdog与Operations Identity只能访问 DEV Account内批准的 Resource和 API，未来 PROD使用另一套只属于 PROD的身份与 Policy；两个成员账号之间不建立默认 Role Trust，DEV Identity不能 Assume PROD Role，PROD Secret也不复制到 DEV。确需由中央运维自动化进入成员账号时，每个 Environment分别提供最小权限、短时会话、强审计且不能横向链式 Assume的受控 Operations Role；一次任务显式选择一个 Environment，禁止组织级 Wildcard Credential直接修改两个环境。
- Alibaba Cloud会在每个 Resource Directory Member自动创建信任 Management Account并默认附带 `AdministratorAccess`的 `ResourceDirectoryAccountAccessRole`；该 Provider事实不能被忽略，也不能未经兼容验证盲目删除。首版将其定义为组织级 Break-glass Channel：任何日常 IaC、CI/CD、Collector或普通运维均不得 Assume；Management Account侧只有最小人数的专用应急身份在工单/双人批准、强 MFA、短 Session、显式 Environment与完整 ActionTrail条件下可以使用，每次 Assume及后续 API都实时告警并进入不可变 Audit。是否缩小/卸载默认 Policy或删除该 Role只能在验证 Resource Directory依赖、替代恢复路径与官方行为后通过独立 Cloud Foundation变更完成；在此之前必须在调用方权限边界阻止普通身份取得 `sts:AssumeRole`，不能把这个全管通道伪装成最小权限 Operations Role。
- Resource Directory Guardrail、成员账号基线、Region/Service Allowlist、Provider Audit/Cloud Config、关键 KMS/Backup/Log保护与高风险 API限制均由 Cluster外版本化 Cloud Foundation IaC/Policy管理，并在创建 DEV或PROD资源前通过 Conformance Gate。平台 Super Admin、普通管理员、Agent、Sandbox和业务 Backend都无权创建/迁移成员账号、退出 Resource Directory、修改组织 Guardrail、建立跨环境网络、切换 VPC、授予 Cloud IAM或关闭 Provider Audit；这些基础设施事实在平台管理后台只读展示，写操作继续属于受控运维流程。
- 当前 `kubernetes-etcd-backup`、Cluster外 Watchdog与 Provider/IAM Audit只要求位于目标 Kubernetes Cluster及其 Cluster内依赖之外，可以继续部署在对应 Environment Member Account的 Cluster外托管资源中；账号/VPC隔离不自动把它们提升为 Account DR、Region DR或 Site DR。首版不额外创建共享 Security/Log/Recovery Member Account，也不把恢复对象放入 Resource Directory Management Account；未来若需要抵御整个成员账号失陷，必须通过新的 Account-level DR设计迁移到独立 Recovery Account/Region并验证跨账号 Object Lock、KMS、Reader、Audit与恢复链路。
- 单个 DEV Member Account、DEV VPC或DEV Cloud Identity故障不得影响未来 PROD运行面，反之亦然；Resource Directory/Management Account控制面暂时不可用时可以阻塞账号治理、新资源创建和高风险变更，但不能成为已运行平台业务请求、Kubernetes控制循环、数据库事务、Secret读取或 Agent执行的同步依赖。任何共享计费、组织视图或集中治理服务都不能被误报为运行时共享；Account/VPC隔离仍不防同一 Region、Provider Control Plane、企业 VPN或共同软件/IaC缺陷，Site DR边界保持不变。
- 平台管理后台通过 Cluster外 `Environment Operations Collector`生成的签名、版本化、非敏感 Read Model，在当前环境只读显示该环境的 `CloudEnvironmentBinding`、Account Alias/脱敏UID、Resource Directory Membership/Guardrail Conformance、VPC/vSwitch/Route/Security Group/NLB引用、CIDR冲突检查、IaC Revision/Drift、Provider Audit与相关 Alert/Runbook；平台 Pod不持有 Management Account Credential，也不直接调用其高权限 API。Read Model超过版本化 Freshness Window、签名无效或 Collector不可用时页面明确显示 `STALE/PARTIAL`并告警，不能继续显示绿色旧状态。DEV后台只读取 DEV事实，未来 PROD后台只读取 PROD事实，不提供跨账号资源浏览器或环境切换器。页面不得展示 Cloud Credential、Root身份、完整 Account UID、Recovery Material，也不得提供创建账号/VPC、修改 Route/Security Group、建立 Peering/CEN、Assume Role、Apply/Destroy IaC或迁移资源的 UI/API。
- Cloud Account与VPC本身，以及未来任何跨账号审计、PrivateLink/CEN/NAT/Egress或恢复服务，都必须作为独立 Provider Mapping与报价输入进入环境 TCO；统一企业账单或 Resource Directory汇总不等于资源共享，也不能把 DEV费用算入PROD或反向重复计费。当前成本只计算已部署的 DEV Member Account资源，未来长期双环境口径再分别计算 DEV与PROD后汇总。
- 上述 Cloud Foundation治理身份属于云基础设施运维边界，不改变平台已经确认的本地员工编号登录、密码、TOTP MFA、Session或 Capability模型，也不要求把 Alibaba Cloud SSO接入平台用户认证。未来云运维身份体系升级只修改 External Cloud Identity Contract，不得静默成为平台业务账号来源。

#### 9.2.1 External Provider Contract（已确认）

- External Provider Contract只治理平台边界之外的 Cloud/Operations Plane，包括 `CLOUD_FOUNDATION`、北向 `BUSINESS_EDGE`、`CONTROL_PLANE_ENDPOINT`、`EGRESS`、`CONTROL_PLANE_RECOVERY`、`EXTERNAL_WATCHDOG`、`PROVIDER_AUDIT`和 `EXTERNAL_PROVIDER_CONSOLE`八类 Binding。Grafana、Hubble、Temporal、OpenBao等位于当前 Cluster或平台信任域内的专业控制台不属于 `EXTERNAL_PROVIDER_CONSOLE`，继续使用既有 Console Access Contract；Model Provider、GitLab与安全公告 Feed继续由各自已经确认的领域 Connector/Source Adapter治理，并可把已验证健康状态投影到统一运维页面。Jenkins完全位于平台外部，首版不存在 Jenkins Adapter、Webhook或状态投影，用户只提交外部验证证据。上述系统都不得被重新包装成 Cloud Admin接口或与本 Contract重复实现。
- 责任边界固定为：运维/IaC负责 Cloud Account、Resource Directory、VPC/vSwitch、Route/Security Group、Private L4 API NLB、外部 Edge LB/WAF/DDoS、DNS/IP、VPN、NAT/EIP/Egress Proxy、Cloud KMS、Cluster外 Backup Repository、外部 Watchdog、Provider Audit与其创建、修改、恢复和销毁；平台负责 `platform-gateway`之后的应用路由、认证、Session、Capability、领域服务、稳定 Infrastructure Port、状态 Feed校验、只读投影、告警关联和受权 Console入口。Super Admin权限不跨越该边界，平台 API与 Web都不提供基础设施 Admin操作。
- 每个外部依赖使用版本化、不可原地改写的 `ExternalProviderBinding` Generation描述，至少包含 Environment ID、Binding ID/Kind、Provider Mapping、逻辑 Endpoint或 Resource Reference、Direction/Protocol、Trust Profile、Desired IaC/PCS Revision、Health/Failure Contract、Data Classification、Operations Owner、Runbook ID、Console Link ID与生命周期状态；只保存 Secret Reference、Certificate Fingerprint、Key ID等非敏感标识，不保存 Credential、Private Key、Passphrase、Recovery Material或可直接使用的 Presigned URL。Provider替换创建新 Generation并完成并行验证/Cutover，业务模块继续只消费稳定 Port和逻辑 Binding。
- 权威链固定为“Cluster外 IaC/PCS/`CloudEnvironmentBinding`定义 Desired → Provider API/外部探针产生 Observed → Provider Audit记录变更事实 → 平台保存签名 Feed的只读 Projection”。平台 PostgreSQL中的 External Status Projection、Dashboard颜色或人工备注都不是 Cloud Desired State，不能反向覆盖 IaC、Provider、Audit或 Recovery事实；Observed与 Desired不一致时显示 `DRIFT`并关联 Runbook，不能自动从平台修复。
- 每个 Environment部署一个位于目标 Kubernetes Cluster之外、由运维管理的 `Environment Operations Collector`逻辑实例；首版可以是受控定时 Job/Runner而不是常驻微服务。Collector按 Source使用彼此分离的短时只读或最小探测身份，读取本环境 Provider API、IaC State摘要、API NLB/Edge/Egress状态、外部 Backup、Watchdog与 Provider Audit结果；不得持有业务数据库、OpenBao、Kubernetes Admin或平台用户 Credential，不得使用 `ResourceDirectoryAccountAccessRole`，也不得读取另一环境。需要写 Provider状态的恢复/变更工具与只读 Collector必须是不同 Identity、Process和 Audit用途。
- External Watchdog仍是独立故障检测链：它直接接收 Deadman/Probe并通过 Cluster外通知渠道告警，即使 Kubernetes、平台 API、PostgreSQL或 Collector全部不可用也能报告失联。Collector可以读取或引用 Watchdog结果供平台恢复后展示，但不能替代 Watchdog Receiver、把告警闭环重新依赖被监控 Cluster，或因 Feed投递成功就宣称外部通知已经送达。
- Collector把观测结果规范化为 Canonical、签名、版本化 `ExternalProviderStatusEnvelope`；签名正文至少包含 Schema Version、Environment ID、Binding ID、Binding Generation、Collector Lineage ID、全局唯一 Envelope ID/Idempotency Key、该 Lineage内单调 Sequence、Generated At、Valid Until、Source Coverage、Observed Health/Drift、Alert/Incident Reference、IaC Revision、Payload Digest和 Signing Key ID。Envelope禁止包含 Access Key、Token、Cookie、完整 Account UID、Secret Value、Private URL Credential或原始敏感 Provider响应。
- Status Trust Store必须把每个 Signing Key ID绑定到唯一 Environment、Collector Lineage与允许上报的 Binding Kind/ID Scope，合法 Key不能越权为其他环境、Collector或 Binding签名。Key生命周期固定为 `ADD_NEW → CANARY → ACTIVE → VERIFY_ONLY → RETIRED/REVOKED`：新旧 Public Key在受控重叠窗共同验证，新 Key通过 Canary和 Sequence连续性后才写入 Active Envelope，旧 Key只保留验证到最后一个 Envelope超过 Valid Until；Private Key保持在 Cluster外受控密钥边界，平台只获得版本化 Public Trust Material。Key撤销、连续签名失败或 Feed持续拒收必须通过 Cluster外运维链告警，平台旧绿色状态最多保留到原 Envelope的 Valid Until，之后转为 `STALE/UNKNOWN`，不能人工延长。
- 稳定 `OperationsStatusFeedPort`隔离传输实现。首版 Provider Mapping由 Collector从当前环境获批的 VPN/Operations Source，经 `platform-gateway`专用 HTTPS Route把签名 Envelope推送到平台管理 Backend Ingest Handler；Gateway终止 TLS并执行 Source Allowlist、独立 Rate Limit、Body Size和 Content-Type限制，NetworkPolicy禁止外部流量绕过 Gateway直连 Backend。TLS只负责服务器身份与传输加密，Source IP/Allowlist只负责缩小入口面，均不充当 Collector身份；Envelope Signature/Signing Key Scope才证明内容来源与完整性。首版不把尚未完成 Gateway PCS验证的 Client Certificate Authentication写成既成事实，未来若启用 mTLS只替换 Trust Profile和 Transport Adapter。Ingest API只接收 Observed Status，不接收 IaC Plan、Shell Command、Provider Mutation或任意 Callback，也不把平台 Credential返回给 Collector；它是状态导入通道，不是基础设施写控制面。
- Ingest必须依次校验 Source/Transport Policy、Environment/Binding/Generation、Schema兼容、Signing Key状态与授权 Scope、Signature、Payload Digest、Envelope ID、Sequence、时间偏差、Valid Until与 Idempotency。Sequence High-water Mark固定作用于 `(Environment ID, Binding ID, Binding Generation, Collector Lineage ID)`：同 Sequence同 Digest按幂等成功处理，同 Sequence不同 Digest视为安全冲突并告警，低于 High-water Mark的 Envelope拒绝；Binding Generation或 Collector Lineage只有先通过 GitOps/Trust Store激活才可建立新 Sequence空间，平台恢复时必须恢复 High-water Mark，无法证明时保持 Feed `UNKNOWN`并通过受控新 Lineage切换，禁止静默清零绕过 Replay。错误环境、未知 Binding、签名无效、过期、Replay、乱序回退或不兼容 Schema一律拒绝并产生结构化 Audit/Alert。成功后只更新当前 Environment的规范化 Operations Read Model，并记录 Envelope Digest、Coverage、Source Time、Receive Time与 Signing Key/Collector Identity；不得把失败 Payload或 Secret写入日志。
- 每类 Source在版本化 GitOps Contract中声明 Poll Interval、Valid Until/Freshness Window、Timeout、Retry、Coverage与 `UNKNOWN`语义，时间值不写死在业务代码，也不由平台 Super Admin后台编辑。页面统一使用 `HEALTHY / DEGRADED / UNAVAILABLE / UNKNOWN / STALE / PARTIAL / DRIFT`；超过 Freshness Window、签名/Schema异常、Collector失联或部分 Source失败时必须显示对应 `STALE/PARTIAL/UNKNOWN`并告警，禁止继续沿用最后一次绿色状态。没有机器可读接口的既有外部系统显示 `NOT_INTEGRATED`或带有效期的签名 Operations Attestation，不能伪装成实时健康。
- Collector或 Status Feed不可用只降低平台对外部基础设施的可见性，不得阻塞已经运行的 Requirement、数据库事务、Agent或 Kubernetes控制循环；被保护的 Edge、NLB、Egress、KMS、Backup等真实依赖本身失败时，仍按各自 Contract降级或 Fail Closed，不能因为状态 Feed陈旧就假设依赖健康。Cluster不可达期间 Collector可以有界重试并保留最新 Incident摘要，平台恢复后重新发送最新 Snapshot与尚未确认的 Incident Reference；不要求把全部 Provider高频原始事件复制进平台数据库。
- 北向 Edge继续遵循已确认的 `DIRECT_OR_L4_TRANSPARENT`与未来受控 `EDGE_TLS_REENCRYPT` Trust Mode；运维管理的 IP/Domain/DNS/WAF/DDoS/External LB只能连接当前环境获批的 `platform-gateway`入口，不能旁路 Gateway、伪造 Client Identity或把明文回源包装成正常。Egress由运维提供 NAT/EIP/Proxy/Firewall等 Provider能力，平台通过 Cilium/GitOps Egress Policy、Connector Allowlist和 Workload Identity消费；平台不得为方便联网向 Sandbox、Agent或业务 Backend下发 Cloud Network Admin权限。
- 所有专业控制台与外部运维入口继续作为“平台管理后台菜单中的受权入口、在新标签页打开”，不 iframe嵌入、不由 Web保存长期登录 Credential，也不把菜单可见等同于目标系统授权。每次打开都必须先校验当前环境的平台本地 Session、Capability与 Scope；外部 Provider Console由 `ExternalProviderBinding` + `ConsoleAccessAdapter`解析预注册的 Console Link ID、允许域名/Origin、最小 Path和可选短期受控跳转，Cluster内 Grafana/Hubble/Temporal/OpenBao等则继续走既有 ConsoleAccessPort及其 Auth Proxy、短期只读身份或目标系统独立登录 Contract，不因本节改写为外部 Provider。Envelope、用户输入或告警文本不得提供任意 URL，防止 Open Redirect、跨环境跳转和钓鱼；不接入平台 SSO不等于取消目标控制台认证/RBAC。平台记录 Access Decision、Actor、Environment与目标 Binding/Console Audit，但不记录短期 Credential或目标 Session内容。
- 平台管理 Backend和 Web均不持有 Management Account Credential、Cloud Admin Access Key、Provider Mutation Token或 `ResourceDirectoryAccountAccessRole`会话。运行时确需读取 Cluster内 Kubernetes/Observability/组件状态时继续使用现有最小权限 Observability/Operations Adapter；Cluster外 Cloud状态只消费上述签名 Feed。ExternalProviderBinding、Feed Trust、Collector Identity、Console Allowlist或 Ingest Schema变化必须经过版本化 GitOps/PCS、DEV Contract Test和 Audit，不能作为业务级动态配置在线修改。
- Contract Test至少覆盖正确/错误 Environment、合法/过期/撤销 Signing Key、Signature/Digest篡改、Replay/乱序、Clock Skew、未知 Schema/Binding、部分 Source失败、Collector/平台断连、Provider返回异常、Watchdog独立告警、Deep Link Allowlist、Credential/敏感字段泄漏检测以及 Provider Adapter替换。任一实现只有证明“状态可读、基础设施不可写、Cluster失联仍有外部告警、替换 Provider不改领域代码”后才能激活。
- 当前只实例化 DEV Collector、DEV Signing/Client Identity、DEV Binding与 DEV Status Projection；未来 PROD使用同一 Contract/Schema/实现创建完全独立的实例、Key、Sequence和信任材料。任何 Envelope不得跨环境导入或由一个 Collector批量修改两环境；Collector、外部 Receiver、状态传输、Provider API调用与相关托管服务的资源/请求/流量成本分别进入本环境 TCO，不能因代码复用而漏计或重复计费。

### 9.3 正式组件与 Platform Compatibility Set 基线（已确认，精确版本继续逐项固定）

- 基础设施版本管理单位统一为不可变的 `Platform Compatibility Set`（PCS），由 GitOps 保存并使用稳定 Set ID、Parent Set ID、Manifest Digest、创建原因和生命周期状态识别。PCS 是经过联合验证的版本 BOM/Compatibility Contract，不是把若干“看起来最新”的组件版本临时拼在一起；同一个 Set ID 的内容永远不能原地修改，任何修正、Patch 或安全更新都必须生成新 Set。
- PCS 采用保守的受支持版本策略，不自动追随最新版本，也不长期冻结在已停止维护的版本。Kubernetes 默认从仍受上游支持且具备足够剩余维护窗口的稳定 Minor 中选择，通常采用最新稳定 Minor 的前一个 Minor，并锁定经过 DEV 验证的精确 Patch；若该 Minor 已接近停止维护，则必须前移到维护窗口充足的版本。其他组件只能选择其官方 Compatibility Matrix 明确支持、且仍处于安全维护期的精确版本，不能为满足统一的“新旧程度”强行组合不兼容版本。
- 常规版本与 EOL 状态默认按季度复审，复审周期作为受控 GitOps/运维治理参数管理，不写死在业务代码中；严重漏洞、供应链事件或上游紧急安全公告不等待常规窗口，基于当前 Active Set 创建 Hotfix Set，仍需完成可审计的兼容校验、DEV Gate 和受控 PROD Promotion。任何复审、加急或 Patch 更新都不得绕过 PCS 不可变、精确锁定和禁止 `latest` 的规则。
- 首个 PCS 的 Kubernetes 目标 Minor 确认为 `1.36`，当前精确 Patch Candidate 为 `v1.36.3`。选择 `1.36` 是因为讨论时严格 N-1 的 `1.35` 剩余标准维护窗口不足，并非建立“永远采用最新 Minor”的例外；在 PCS 正式冻结前必须重新读取 Kubernetes 官方 `stable-1.36` 发布标记并完成 Release Note、安全、弃用 API 与下游 Compatibility Matrix 检查，锁定届时最新且验证通过的 `1.36.x` Patch、Artifact 和 Image Digest。冻结后不得跟随发布标记自动升级，任何新 Patch 都创建新的不可变 PCS 并重新经过 DEV Validation 与 PROD Promotion。
- 所有 Kubernetes Node 的首个 Node OS 基线统一采用 `Ubuntu Server 24.04 LTS Minimal (amd64)`，当前 Point Release Candidate 为 `24.04.4 LTS`；不使用 Alibaba Cloud Linux 等云厂商专用发行版作为平台基线，保持跨云镜像构建、加固、升级和排障流程可迁移。PCS 必须锁定实际 Cloud Image ID、Canonical/镜像来源、Point Release、Kernel/Package Snapshot 与 Image Digest，禁止只写宽泛的 `Ubuntu 24.04`、启动时滚动到未验证 HWE Kernel 或让不同 Node Role 使用未声明的 OS/Kernel 组合。安全更新通过新 Node Image 和滚动替换验证，不在运行中静默改变 PCS；Sandbox Node 还必须单独证明目标 ECS 规格暴露 Kata 所需的 KVM/虚拟化能力，选择 Ubuntu 本身不代表 Kata 已可运行。
- 首个 Container Runtime 基线采用 `containerd 2.3 LTS`，当前精确 Patch Candidate 为 `v2.3.1`；使用 CRI v1、containerd config schema v4、cgroup v2，并让 kubelet 与 containerd 统一使用 `systemd` cgroup driver。普通 Workload 使用 Runtime v2 的 `runc` shim，Sandbox 通过后续锁定的 `containerd-shim-kata-v2` RuntimeClass 接入；不安装 Docker Engine，不使用 `cri-dockerd`，也不允许业务流程依赖不稳定的 `ctr` CLI。PCS 冻结前重新核对最新受支持的 `2.3.x` Patch、Kubernetes/Kata Compatibility 与安全公告，并锁定 containerd、runc、CNI Plugin Binary、配置 Schema、上游签名/校验和及实际 Artifact Digest；冻结后的 Patch 变化必须创建新 PCS。
- Sandbox 的正式强隔离 Contract 固定为社区 Kata Containers 运行于 `KVM-capable Compute Pool`：每个 Sandbox Pod 使用独立 Guest Kernel，并通过受控 `RuntimeClass`、`containerd-shim-kata-v2` 和专用 `sandbox-worker` 调度。`KVM-capable` 是可替换的基础设施能力契约，不是 Alibaba Cloud 实例型号；未来迁移其他云或独立 Sandbox Cluster 时，只需替换并重新验证 Compute Provider Mapping、Node Image 与 PCS，不改变 Requirement、Attempt、Workflow、Agent 或 Sandbox Controller 的领域契约。
- 当前 Alibaba Cloud Provider Mapping 在 Region/Zone 未选定时使用 ECS Elastic Bare Metal（EBM）作为保守 Fallback Candidate：EBM直接把硬件虚拟化能力提供给实例，不应描述成“普通虚拟机内再嵌套一层”的 Nested Virtualization。普通 ECS 不得仅因 CPU 支持 VT-x/SVM就假定 Guest可使用KVM；只有阿里云在目标账号、Region和Zone正式GA开放、可购并明确支持 Nested Virtualization，且完成实机 PCS的规格才能成为更小的替代 Mapping，邀测、灰度或未普遍开放的规格只能用于PoC。EBM与普通ECS都必须通过同一KVM Provisioning Gate，不能仅凭产品名称判定合格。ACK Sandboxed-Container的`runV`不是社区Kata，且其Kubernetes、Node OS与CNI支持边界不符合当前自管Kubernetes `1.36`、Ubuntu、Cilium基线，因此不作为本架构的隐式替代或降级路径。
- `sandbox-worker` 加入可调度池前必须通过 KVM Provisioning Gate：验证 `/dev/kvm`、CPU Virtualization Flag、KVM Kernel Module、`kata-runtime check`、Guest 启停与清理、Node Reboot/Drain、RuntimeClass、Cilium、CSI、MTU、性能与隔离测试，并把精确实例规格、Firmware/CPU 能力、Node Image、Kernel、Kata/VMM Artifact 与 Digest 锁入 PCS。任一条件失败时 Node 保持不可调度并告警；Kata 创建失败不得静默回退到 runc、ACK runV 或普通容器。具体 Kata 版本、VMM 以及首个 KVM Compute Capacity Profile 继续逐项确认。
- 首个 PCS 的 Kata Runtime 目标版本确认为 `Kata Containers 4.0.x Stable`，当前精确 Patch Candidate 为 `4.0.0`；只使用 4.x 默认且已声明可用于生产的 Rust `runtime-rs`，不建立已经进入弃用方向的旧 Go Runtime 基线，也不允许 Runtime 失败后切换旧实现。PCS 冻结前必须重新核对届时最新受支持的 `4.0.x` Patch、安全公告、Release Note、Artifact Provenance 与上游依赖锁定；若出现新 Patch，只能在完整 DEV Validation 通过后成为新 Candidate，不能因版本号更新自动替换当前结果。
- Kata 首条正式 VMM 基线固定为 QEMU/KVM。QEMU、Guest Kernel、RootFS/Image、Firmware、Shim、Virtiofsd 与其他 Runtime 组件必须使用目标 Kata Release 明确锁定并经过联合验证的 Artifact/Version/Digest，不得混用 OS 软件仓库中的漂移版本；Cloud Hypervisor 只保留为未来经过独立性能、兼容和安全验证的新 PCS 候选，不能作为每次 Attempt 可切换的普通平台选项。旧 Go Runtime、Cloud Hypervisor 或其他 VMM 均不得成为 QEMU 启动失败时的静默 Fallback。
- 正式环境的 Kata Runtime 采用预烘焙、不可变的专用 `sandbox-worker` Node Image：在受控 Image Build Pipeline 中把目标 PCS 锁定的 Shim、QEMU、Guest Kernel、Guest RootFS/Image、Firmware、Virtiofsd、Kata 配置、containerd Runtime Handler 与所需 Host 依赖写入镜像，并关联上游来源、版本、校验和、签名/Provenance、SBOM、漏洞扫描和最终 Cloud Image ID/Digest。这里的“不可变”表示节点加入集群后不做原地包升级或 Runtime 替换；不是永不更新，而是每次更新都构建新 Node Image、生成新 PCS/Capacity Candidate 并逐节点 Reprovision/Replace。
- DEV 与 PROD 的 `sandbox-worker` 均不运行会通过 HostPath 写入 Host、替换二进制或修改 containerd 配置的 `kata-deploy` 安装 DaemonSet，也不允许 Cloud-init、启动脚本、包管理器或人工 SSH 在节点启动后补装漂移组件。Kata 官方 Release Artifact、`kata-deploy`/Packaging 脚本可以在隔离的 Build/Validation Pipeline 中作为受版本锁定的来源和参考，但不能成为正式 Cluster Node 的第二套期望状态；Kubernetes 中只部署经过 GitOps 管理的 RuntimeClass、Scheduling/Admission 与只读验证资源。
- Node Bootstrap 必须先校验 Node Image/PCS Binding、KVM Gate、Runtime Artifact Digest、containerd 配置和 Kata Smoke Test，全部通过后才移除专用 Scheduling Taint；Desired/Effective Image、Runtime Artifact、验证结果和 Drift 在平台管理后台只读展示。升级一次最多替换一个 `sandbox-worker`，先 Drain/Fence、验证剩余容量与 Active Attempt，再用新镜像重建并通过 Gate；旧镜像只在仍满足安全与数据兼容条件时用于受控节点级回退，禁止在原节点上卸载或覆盖 Runtime 伪造回退。
- Kata Guest 启动载荷固定使用与目标 Kata Release 匹配的最小 RootFS Disk Image，不使用 Initrd；首个 `4.0.0` Candidate 沿用 QEMU `runtime-rs` 的 RootFS Image/默认 ext4 路径，并把 Guest Kernel、RootFS Image 及其中的 `kata-agent` 作为彼此兼容的单一 Artifact Set 锁入 PCS。RootFS Image 与 Initrd 不能同时启用；首版不启用依赖 Initrd 的 VM Factory/Templating，未来只有在启动密度与兼容性基准证明有必要后，才能通过新 Runtime Profile、Node Image 与 PCS 引入，不能在线切换既有 Node。
- Guest RootFS 是 Kata 轻量 VM 的最小系统层，不是 Agent 的工作容器镜像。生产 RootFS 不额外加入 Python、Node.js、Git、编译器、包管理器、SSH Server、交互式调试 Console 或日常排障工具，也不允许运行中安装软件；Agent 开发工具链、项目依赖与业务文件全部位于经过签名和扫描的上层 Workload Image 或受控 Workspace Volume。若因上游运行依赖必须保留基础二进制，必须随 RootFS Manifest 与 SBOM 明确记录且不对 Sandbox 暴露 Host/Guest 管理入口。
- RootFS Image 只能来自目标 Kata Release 的受验证 Artifact，或由锁定 Source、osbuilder/Builder Image、Package Snapshot 和 Reproducible Build Pipeline 生成的等价最小 Image；最终 File/Artifact Digest、Filesystem Type、Guest Distribution、Kernel Parameter、Agent Config、启用的 Integrity Mode 与漏洞扫描结果进入 PCS。Guest RootFS 更新必须随新 Node Image 和 PCS 逐节点替换，不允许原地写入或让不同 `sandbox-worker` 使用未声明的 Guest Image。
- 普通 Agent 与 Image Builder 不共用一个能力并集式 Guest Profile。首版固定使用两个平台签名、版本化并由 PCS 分别验证的 Runtime/Guest Profile：`runtime/agent-standard-v1` 面向普通开发 Agent，只保留其运行所需的最小 Guest Kernel、RootFS、Kernel Parameter、Seccomp 与 Namespace 能力；`runtime/image-build-v1` 面向一次性 Rootless BuildKit Sandbox，只增加 BuildKit 经验证确实必需的 User Namespace、Mount 与最小 Seccomp/AppArmor 能力。它们分别由前述 Typed Resource Profile显式引用；Build Runtime的任何例外不得自动进入普通 Agent Runtime。
- 两个 Profile 仍来源于同一套锁定的 `Kata 4.0.x + runtime-rs + QEMU/KVM` 基线，但分别拥有不可变的 Guest Kernel/Config、RootFS、Runtime Config、Artifact Digest、dm-verity Root Hash、SBOM、漏洞扫描与测试证据。`agent-standard-v1` 默认关闭运行时 Kernel Module 加载、Guest Debug Console、`debugfs`、`kexec`、非特权 eBPF、Perf 及非必要 Device/Filesystem Driver；必须内建的驱动或普通 Agent 确有需要的调试能力只能通过最小 Kernel Config 或经批准的新 Tool/Runtime Profile引入，不能在运行中放宽整个 Profile。
- Sandbox Controller 根据已批准的 Execution/Tool Binding 自动解析 Profile 与对应 RuntimeClass；用户、Agent、Requirement、Workspace 配置和普通管理员均不能选择、覆盖或把 `image-build-v1` 用作普通 Agent 的提权入口。Profile 之间不得静默 Fallback，任一 Artifact、Kernel Config、Root Hash 或 Runtime Binding 不匹配时 Sandbox Fail Closed；安全修复和能力调整必须生成新 Artifact、Profile Version、Node Image 与 PCS，并经过独立的 Agent/Builder DEV Gate 后受控滚动。
- Guest RootFS 完整性固定采用只读 ext4 Image + `dm-verity`。受控 Build Pipeline 必须为 RootFS 生成 Hash Tree/Metadata 与 Root Hash，并把 Data Image Digest、Hash Image/Tree Digest、Root Hash、Salt、Block Size、Partition/GPT/VMDK Layout、Guest Kernel dm-verity 能力和 Kernel Command Line 作为同一不可拆分 Artifact Set 锁入 PCS；启动时任何 Artifact、参数或数据块校验失败都必须阻止 Guest/Sandbox Ready，产生结构化 Runtime Integrity Alert，不得切换为 Plain ext4、重新生成 Root Hash 或继续执行 Attempt。
- dm-verity Guest RootFS 的首个 QEMU Transport固定使用 `virtio-blk-pci`：Verified RootFS Image作为只读虚拟 Block Device呈现给 Guest，由锁定的 Data Partition、Hash Tree/Partition与 Kernel Verity参数建立 `/dev/dm-0`，并从该 Verified Device只读挂载 `/`。首版不使用 `virtio-pmem`承载 Verified Guest RootFS，也不为单一固定 RootFS引入 `virtio-scsi` Controller/Hotplug；QEMU或 Device初始化失败不得切换 Transport、跳过 Verity或从未校验 Data Partition直接启动。
- Guest RootFS Block Transport与 Workload文件共享是正交边界：`virtio-blk-pci + dm-verity`只承载 Guest Mini-OS，已确认的 `virtio-fs`继续承载 Workload Container RootFS、Workspace和批准的临时 Volume；Agent、用户与 Container Image均不得发现、挂载、重分区或写入 Guest RootFS Block Device，也不得通过 `virtio-fs`覆盖 Guest系统路径。Block Device、Hash Device、Mapper、Mount与 Virtiofs Share必须使用不同生命周期/清理检查，不能把任一方残留复用到新 Attempt。
- PCS必须验证 Guest实际 Root Source为预期 `/dev/dm-*`、Filesystem为 ext4且只读，Data/Hash Device与 Root Hash匹配，并覆盖正常启动、并发启动、块损坏、错误 Partition/Layout、QEMU/Agent/Node重启、强制终止、Device Hot-unplug拒绝、Unmount/Mapper/QEMU清理和长时间 Soak。`virtio-pmem`/DAX与 `virtio-scsi`只保留为未来经独立启动延迟、CPU/Memory/IO、完整性和清理基准后的新 Runtime Profile/PCS候选，不能作为后台开关或故障 Fallback。
- dm-verity 保护的 Guest RootFS 不承载运行时写入。Kata Agent 和 Guest 所需的 `/run`、`/tmp`、日志缓冲及其他明确可写路径只能使用有界 Tmpfs 或 Sandbox Controller 声明的临时 Volume，并计入 Kata `PodOverhead`、Memory/Ephemeral Storage 与清理验证；Workload Workspace 继续通过已批准的 `virtio-fs` Share 提供。任何 Guest 写路径都不得覆盖 RootFS、持久保存 Secret、跨 Attempt 复用或绕过 `ephemeral-storage` 限制。
- dm-verity 只提供 Guest RootFS 的逐块完整性与防漂移能力，不提供加密、机密性、Host 身份证明或 Confidential Computing；在当前普通 KVM Trust Model 中，完全失陷的 Host 仍位于信任边界之外，平台不得把 dm-verity 状态宣传为远程 Attestation。Plain ext4 不作为正式 Fallback；EROFS/EROFS Snapshotter 只保留为未来分别验证 Guest/Workload Image 语义、性能与供应链后的新 PCS 候选，不能通过平台开关替换现有 Runtime。
- PCS 必须执行 Data/Hash/Root Hash/Kernel Parameter 篡改、单块损坏、截断、错误 Image 组合、重启与节点替换测试，验证均为 Fail Closed；同时覆盖只读 RootFS、Tmpfs/Volume 写入、容量/OOM、日志和故障收集路径，确保完整性失败不会泄露 RootFS 内容、复用旧 Guest 或把失败 Attempt 静默重建为无保护 Sandbox。平台管理后台只读展示 Desired/Effective Integrity Mode、Artifact/Root Hash 标识、最近验证、失败事件、Drift 与 Runbook，不展示任何 Secret，也不提供关闭校验或接受新 Root Hash 的按钮。
- Kata Host–Guest 文件共享的首条正式基线固定为 `virtio-fs`，并使用目标 Kata Release 锁定、签名/校验和验证且预烘焙进 Node Image 的 `virtiofsd`；不启用旧 `9p` 共享，也不在首版为全部 Workload 引入 Device Mapper/Block-based Container RootFS。`virtio-fs` 只是单次 Sandbox 的受控文件传输边界，不是共享存储、Artifact Store、跨 Attempt Cache 或持久化恢复机制，Agent/Workflow 不直接依赖其实现细节。
- Sandbox Controller 是 Host–Guest Share Manifest 的唯一 Materializer，只允许把该 Attempt 的 Workload Container RootFS、受控 Workspace 与已批准的 Disk-backed `emptyDir` 映射进对应 Guest；禁止任意 `hostPath`、Host Root、Container Runtime/Kubelet Socket、Kubernetes Credential、Node Device、其他 Attempt 目录或未声明 Mount。Admission 必须拒绝用户、Agent、Workload Image 或 Tool 自行增加 Host Share、改变 Source Path、提升 Mount Propagation 或绕过 Workspace/`ephemeral-storage` 边界；即使调用者拥有普通 Kubernetes 能力，也不能跳过 Sandbox Controller Contract。
- `virtiofsd` 必须按目标 Release 支持的最小权限、Namespace/Seccomp/Sandboxing 与只读/可写 Mount Contract 运行，并受 cgroup、进程数、文件描述符和资源预算约束；具体 Cache/DAX/Queue 等参数属于 PCS，而不是用户或后台动态开关。DEV Gate 必须覆盖 Git Checkout、Node/Python 依赖树、小文件/大文件、chmod/chown、Symlink/Hardlink、xattr、文件锁、mmap、inotify、并发 Build/Test、超限写入、Guest/Container/Node 重启、异常终止、Unmount 与路径穿越；不支持的语义必须显式拒绝或记录限制，不能静默产生不一致结果。
- Attempt 结束、取消、超时、Eviction 或 Node Fence 时，Sandbox Controller 必须先停止新副作用，再销毁 Guest、卸载 Share、回收 Mount/Socket/`virtiofsd`/Shim 与临时目录，并验证没有跨 Attempt 残留；清理失败时 Node/Runtime 进入隔离与 Repair Gate，不得把同一路径分配给新 Attempt。需要保留的 Git Commit、Artifact、Checkpoint、日志与 Audit 必须在 Finalization 中进入各自权威存储，不能依赖 `virtio-fs` 或旧 Runtime Disk 恢复。
- `Kata 4.0.x + runtime-rs + QEMU/KVM + containerd 2.3.x + Kubernetes 1.36.x + Ubuntu 24.04 + Cilium 1.20.x` 必须作为一个完整组合进入 PCS，而不能用各组件分别兼容来推导端到端兼容。DEV Gate 至少覆盖 Sandbox 创建/删除/exec/log/stream、并发启动、滚动升级、Containerd 与 Node 重启、驱逐/OOM、Shim/VM/Virtiofsd 泄漏、PVC/ConfigMap/Secret/emptyDir/subPath、Kata 与 runc 同/跨 Node 网络、NetworkPolicy/Hubble、VXLAN + WireGuard MTU、大包/长连接、资源 `PodOverhead`、单 Node 故障与持续 Soak；任何关键项失败都不得提升到 PROD。
- Kata 只通过 Sandbox Controller 解析的版本化 RuntimeClass 进入 Kubernetes：RuntimeClass 的对象名与 Runtime Handler 属于 PCS/GitOps 实现事实，Requirement、Attempt、Workflow、Agent 和用户提交不得保存、选择或覆盖具体名称。RuntimeClass 必须绑定 `runtime-rs + QEMU/KVM` Handler，并通过 `scheduling.nodeSelector` 只选择已通过 KVM/PCS Gate 的 `sandbox-worker`，同时只附加进入专用 Sandbox Taint 所需的最小 Toleration；Pod 自身 Selector 与 RuntimeClass 冲突、节点能力标签缺失或 Handler 不存在时 Admission/调度 Fail Closed，不允许落到其他 Node Role 或 runc。
- 首版 Kata 使用启动前静态 Sandbox Resource Sizing：Sandbox Controller 根据不可变 Execution Binding 中的 Resource Profile 汇总全部 Workload/Sidecar/Init Container 的 CPU、Memory、Ephemeral Storage Request/Limit，并结合目标 Runtime Profile 的 Guest/VMM 约束生成唯一受控 Pod；Kata 在 Guest 启动前确定 vCPU、RAM 和允许的 Runtime 资源。首版不启用运行中 CPU/Memory Hotplug、Balloon、自动纵向扩缩或由 Workload Annotation 改变 VM Shape；未来引入这些能力必须创建新 Runtime Profile/PCS 并重新验证调度、回收、故障和计费语义。
- RuntimeClass 的 `overhead.podFixed` 必须覆盖该 PCS/Runtime Profile 下每个 Pod 固定产生的 QEMU、Guest Kernel/OS、Kata Agent、Shim、Virtiofsd、受信 Init 与其他 Sandbox Infrastructure 开销，并由 DEV 在空载、并发启动、稳态、峰值、异常终止和长时间 Soak 中实测后锁定，不能复制 Kubernetes 示例值或凭经验填写。若不同 Resource Profile 的固定开销不能由同一个保守且有效的 Overhead 表达，则为其生成独立版本化 RuntimeClass/Runtime Profile，由 Controller 解析，不能低报开销或让用户选择更便宜的 Class。
- Kubernetes Scheduler/Quota/kubelet 必须计算 Workload Request + RuntimeClass PodOverhead；Sandbox Capacity Lease 还必须按当前策略校验 Workload Limit、Guest/VMM 峰值、Node Allocatable、单 Node 故障和 Reserve，不能因为 Kubernetes 仅按 Request 可调度就超卖 Memory/Ephemeral Storage。Actual Usage 与峰值只作为 Observed Evidence，不自动回写 Overhead；实测偏离 Envelope 时停止新 Lease、告警并创建新的 Runtime/Capacity Candidate，不能在 Active RuntimeClass 上静默改值。
- Admission 必须拒绝用户、Agent 或 Workload 通过 Pod Annotation、OCI Hook、Environment、Mount 或 API 修改 vCPU、Memory、VMM、Kernel Parameter、Firmware、RootFS、Shared FS、Confidential Guest、Device、Runtime Handler、PodOverhead、Node Selector/Toleration 或其他 Hypervisor Setting。平台管理后台只读展示 RuntimeClass/Handler/Runtime Profile 的 Desired/Effective Version 与 Digest、Static Sizing 输入/结果、PodOverhead Desired/Observed、Node Binding、Drift、拒绝事件、Alert 与 Runbook，不提供切换 Runtime、启用 Hotplug 或编辑 Overhead 的入口。
- Agent/Sandbox Workload 固定执行严格受限的 Pod/Container Security Baseline：禁止 `privileged`、`hostNetwork`、`hostPID`、`hostIPC`、`hostUsers` 放宽、任意 Host Namespace、`hostPath`、Host Device/Device Plugin、Docker/containerd/CRI/Kubelet Socket 与 Kubernetes ServiceAccount Token；`automountServiceAccountToken=false`，Sandbox 不获得 Kubernetes API 身份。Kata 的 Guest Kernel 是第二层隔离，不构成允许 Privileged Workload 的理由；即使某项权限只在 Guest 内生效，也必须经过显式最小化和验证。
- Agent 与普通 Tool Container 默认使用平台分配的非 Root UID/GID、`runAsNonRoot=true`、`allowPrivilegeEscalation=false`、`no_new_privs`、`seccompProfile=RuntimeDefault`，并默认 `capabilities.drop=[ALL]`；Container RootFS 默认只读，写入只允许发生在该 Attempt 的 `/workspace`、有界 `/tmp` 和批准的 Cache/`emptyDir`。Workload Image 不得通过 Setuid/Setgid Binary、User Namespace、Proc/Sys Mount、Kernel Module、Raw Socket、FUSE/Device 或其他路径恢复被禁止的 Host/Guest 管理能力；不兼容任务必须被明确拒绝或走受控 Tool Profile，不能静默放宽整个 Sandbox。
- 额外 Capability、Writable Path、Seccomp Rule 或专用 Sidecar 只能由平台签名、版本化并经过 PCS 的 Tool Profile 声明，由 Sandbox Controller 根据批准的 Tool Capability 解析并生成；用户、Agent、Requirement 字段或 Workspace 配置不能提交任意 SecurityContext，也不能把 Profile 变成“开启 Privileged”的别名。每个 Profile 必须列出用途、最小权限、Image Digest、资源、网络/Secret Scope、兼容 Runtime、测试证据和撤销路径；普通 Tool Profile 仍不得获得 Host Namespace、Host Socket、Kubernetes Identity 或绕过 Kata/NetworkPolicy。
- 已确认的 MTU Init Container 是基础设施级特例：它只在对应 Guest/Pod Network Namespace 内短暂持有 `CAP_NET_ADMIN`，完成路由设置后退出，能力不传递给 Agent。除此之外，首版没有默认 Capability 例外；Container Image 构建使用后续单独确认的 Rootless Build Path，不开放 Host Docker Socket或 Docker-in-Docker Privileged Daemon。确需内核、设备或系统级能力且无法落入既有安全底线的任务，必须通过独立 Tool Connector/新 Runtime Profile/PCS 设计，不能由 Super Admin 页面即时勾选绕过。
- Admission 必须同时执行 Kubernetes Pod Security `restricted` 等价规则和平台更严格的 Sandbox Policy，并校验最终渲染后的全部 Init/Sidecar/Workload Container，而不是只检查用户输入；拒绝事件记录具体字段、Profile、Attempt、Actor 与 Policy Version。平台管理后台只读展示 Desired/Effective Security Profile、UID/GID、Capabilities、Seccomp、Writable Mount、ServiceAccount/Host Access 检查、Tool Profile、Policy Deny、Drift、Alert 与 Runbook，不提供 Privileged、Capability 或 Seccomp 编辑入口。
- Container Image Build 不在主 Agent Guest 中运行，也不通过 Docker-in-Docker、Host Docker/containerd Socket 或共享 Build Daemon实现。Agent只能通过稳定的 Image Build Port/API提交受控 Build Request；Orchestrator以稳定 Idempotency Key创建独立 Child Build Execution，并驱动 Parent完成 Checkpoint、Sandbox/Secret清理、1 Unit释放和 `WAITING_CHILD` Handoff后，Build Controller才可为 Child创建一次性的 Kata Image Build Sandbox。Child关联 Parent Requirement/WorkItem/Attempt、Actor、Parent/Build Binding与 Audit；领域 Workflow只依赖 Build Port、Build Execution状态和不可变结果，不依赖 BuildKit、Kubernetes Pod或 Registry厂商字段。
- Image Build Port在 Parent释放资源前先同步校验请求 Schema、Capability/Scope、Project/Repository、不可变 Commit、Provider Readiness和当前 Build Policy；永久拒绝时向仍在 `RUNNING`的 Parent返回结构化错误，不进入 `WAITING_CHILD`。校验通过后 Build Execution执行独立状态机：

  ```text
  CREATED → QUEUED → PROVISIONING → RUNNING → FINALIZING → SUCCEEDED

  取消路径：
  任意非终态 → CANCELING → CANCELED

  其他安全终态：
  FAILED | TIMED_OUT
  ```

- Build `CREATED`表示请求、不可变 Build Binding与父子关联已持久化，但 Parent Handoff尚未完成，持有0 Unit且不可调度；`QUEUED`只在 Parent已进入 `WAITING_CHILD`并证明1-Unit Agent Lease释放后成立，继续持有0 Unit并等待完整2 Units；`PROVISIONING`获取唯一2-Unit Fenced Build Lease并创建 Guest，`RUNNING`执行 Build，`FINALIZING`固化结果并停止副作用。失败、取消和超时也必须执行等价的 Credential撤销、Guest/Workspace清理、Lease释放和结果固化，只有这些步骤完成后的 `SUCCEEDED/CANCELED/FAILED/TIMED_OUT`才是可以唤醒 Parent的安全终态。
- Build Queue/Execution/Overall Deadline、Retry和 Backoff都是绑定时固化的版本化可配置策略；Queue Deadline到达、永久 Gate失败，或 Build Limit在其取得 Lease前降为0时，Child不得继续占住 Parent，而应形成带 `QUEUE_TIMEOUT`、`POLICY_DISABLED`或具体 Gate Code的安全终态并唤醒 Parent。已取得 Lease的 Build不因普通 Policy下调被强杀；安全事件需要停止时使用独立的显式级联取消/Fence命令与 Audit。
- 首个 Image Builder 实现采用 Rootless BuildKit，并由平台签名、版本化的 `image-build-v1` Tool/Runtime Profile 在独立 Kata Guest 中运行。Profile 可以在 Guest 边界内声明 BuildKit 必需且经 PCS 验证的 User Namespace、Mount 与最小 Seccomp/AppArmor Rule，但仍禁止 Host Namespace、Host Device、Host Socket、Kubernetes ServiceAccount Token、Host Privileged 和访问主 Agent Guest；不能把 `seccomp=unconfined`、`--oci-worker-no-process-sandbox` 或其他上游示例参数直接视为安全基线，最终 Effective 权限必须逐项验证并锁定。若目标 Kata/Guest Kernel 无法在不获得 Host 权限的前提下工作，Image Build Capability 保持未激活并告警，不回退到 Privileged 或 Host Docker。
- Build Request 首版只接受不可变 Git Commit SHA、已批准 Repository/Project Binding、Workspace 内 Dockerfile/Context Path、受 Schema 限制的 Target/Build Args 和 `linux/amd64` Platform；Controller 必须重新从权威 Git Source 获取或校验 Content Manifest/Digest，禁止把主 Agent 的任意 Host Path、Runtime Directory、SSH Agent、环境变量全集或未声明文件直接挂入 Builder。Build Secret 只能通过专用 Secret Reference 解析为单次短期 Mount/Lease，不得放入 Build Arg、Layer、日志、Cache Metadata 或最终 Image；Builder 不获得主 Agent 的模型、Git Write、OpenBao 或平台通用 Credential。
- 每个 Image Build Sandbox 使用独立 Resource/Network/Secret Profile、Capacity Lease、Workspace 和生命周期；只允许访问批准的 Source Registry、Base Image Registry、Dependency Source、目标 Registry、Scanner/Attestation Connector 与必要 DNS，不访问 PostgreSQL、NATS、OpenBao API、Kubernetes API、Node Metadata或其他 Sandbox。Parent取消、超时、Requirement归档/删除、Parent Fence、Node故障或 Build结束时必须按原因停止/终结 Build、撤销 Registry/Secret Lease、Finalize可验证结果并销毁 Guest/Workspace；Child自身失败或用户仅取消 Child时，结构化终态结果交付仍存活的 Parent并使其重新排队处理。清理失败的 Node/Runtime进入 Repair Gate，不能把可写状态复用于下一次 Build。
- Build成功结果至少包含 Image Manifest/List Digest、目标 Platform、Source Commit/Dockerfile/Context Digest、Builder/Frontend/Base Image Digest、标准化参数、SBOM、Provenance/Attestation、Cache输入/输出标识、开始/结束时间和日志/Artifact Reference；同时只记录当前独立 Image Security状态及可选 Scan Execution Reference，允许为 `PENDING_SCAN`，不得把 Build终态伪装成漏洞扫描已通过。任何 Tag只是 Registry Alias，不能替代 Digest成为 Requirement、Attempt、Release或 Audit的事实主键。失败、取消或超时的 Child也必须保存 Build Execution ID、Terminal Status/Code、日志/Artifact Reference、Lease Released At与安全清理证据，但不发布“成功”Image或复用部分产物伪造完成。
- Remote Build Cache 只能使用受控、Content-addressed、按 Environment/Project/Profile 隔离且不含 Secret 的 Registry/Object Cache；默认不跨 DEV/PROD、Project 或不兼容 PCS 共享可写 Cache，Cache Hit 也必须验证 Manifest/Digest、Platform、Builder Policy 与来源，不能跳过扫描和 Attestation。Image Build 使用独立、带 Fencing Token 的 Build Capacity Lease，但必须与 Agent Sandbox Lease原子占用同一个加权 Sandbox Capacity Ledger；`image-build-v1`固定消耗2个 Capacity Unit，每个环境最多1个 Active Build。共享 Ledger的 Effective Free Units少于2，或 Build完整 Resource Vector、逐 Node Placement、Runtime/Disk Reserve与实时安全 Gate任一不满足时，Build保持在持久队列，不创建 Guest、不签发 Secret或 Registry Lease；不得把 DEV `5 Units`、PROD `8 Units`总 Ceiling解释为 Agent之外的额外免费 Build容量。
- 为避免 Parent释放1 Unit后仍被连续新 Agent抢占造成 Build饥饿，每个环境只允许最老的一个“已完成 Parent Handoff、除容量外全部 Gate通过”的 Build进入 Pending Reservation。Reservation不分段占有1 Unit，也不创建 Guest；它只临时阻止会使 Free Units无法累积到2的新增 Agent Lease。现有 Agent不被抢占或取消，待自然释放使完整2 Units和逐 Node资源同时可用后，Build一次性原子获得2-Unit Lease；Build失效、取消、超时、Gate漂移或 Reservation TTL/Reconciliation失败时立即清除。其他 Build按持久 FIFO加 Aging排队，不能用用户等级或重复提交插队。
- Build完成后，前述 Parent Continuation Reservation优先于普通 Agent Queue和下一个 Build Pending Reservation，确保同一 Attempt能消费 Child结果而不被持续新请求饿死；它只保留1 Unit且不赋予用户跨 Requirement优先级。Parent成功获得 Agent Lease或 Reservation被安全撤销后，下一个合格 Build才可建立自己的 Pending Reservation。所有 Queue/Reservation决策必须记录原因、年龄、Owner、Unit、TTL和 Audit，不能依赖 Pod创建先后碰运气。
- Parent恢复后若再次请求新的 Build，必须创建新的 Child ID/Wait Generation并回到普通 Build FIFO尾部；不得沿用上一次 Continuation优先级连续霸占 Build Slot。Pending Reservation TTL或瞬时 Gate失败不得重置原 Queue Age；达到绑定的 Queue Deadline则按结构化超时终结 Child并恢复 Parent，不能只反复清除 Reservation让 `WAITING_CHILD`无限挂起。
- 平台管理后台只读展示 Image Build Execution、Parent Attempt及 `WAITING_CHILD`/Handoff、Profile/Builder Version与 Digest、Queue Age/Pending Reservation/Lease、Source/Context/Base/Result Digest、Resource/Network、Cache、SBOM/Provenance/Scan、Registry Publication、失败原因、Parent恢复、清理状态、Alert、Audit与 Runbook；用户在业务页面只能通过受授权的 Workflow Action发起/取消属于自己的 Build，不获得 BuildKit Socket、Kubernetes Pod Exec、Registry Admin或安全配置写入口。
- `Cancel Build`与 `Cancel Parent Attempt`是两个显式 Command：前者只使 Child安全终止并把结构化取消结果交给仍存活 Parent，后者级联终止 Parent及其非终态 Child且 Parent不再恢复。两者分别执行当前 Capability/Scope、资源归属、幂等键、确认文案与 Audit校验，不能由一个含义模糊的“取消任务”按钮或接口猜测目标。
- 首个 Container Registry Provider 固定为现有 GitLab 对应的 GitLab Container Registry，并通过稳定 `ContainerRegistryPort` 与 `GitLabContainerRegistryAdapter` 接入；Registry Repository Namespace 必须从已经绑定的 GitLab Project Identity/Path 解析，不在平台复制第二套“镜像项目”或让用户填写任意 Registry Path。Requirement、Attempt、Image Build、Workflow 与 Audit 只保存逻辑 Registry Binding、Project ID、OCI Repository、Manifest/List Digest 和受控 Tag Fact，不依赖 GitLab API 私有响应；未来替换 Harbor、Alibaba Cloud ACR 或其他 OCI-compatible Registry 时更换 Adapter/Provider Mapping 与 PCS，不修改领域状态机。
- Image Build 只能先发布到当前 GitLab Project 的受控 Build/Quarantine Repository Path；Manifest/List Digest 是平台、扫描、签名、MR/Release Reference 与 Audit 的唯一不可变 Image Identity，Tag 只是可移动的 Display/Discovery Alias。首版禁止 `latest` 和用户自定义覆盖受保护 Tag，默认 Tag 由 Controller 根据 Attempt/Commit 等稳定事实生成并校验冲突；任何 Tag 移动、删除、Retention 或 Promotion 都必须保留旧/新 Digest、Actor、原因和 Registry Audit，不能把 Tag 当前指向当作历史事实。
- Registry Credential 由 Build/Registry Connector 使用保存在 OpenBao 的 Project-scoped 最小权限 Credential向 GitLab Token Realm 换取短期、Repository-scoped Pull/Push JWT；Builder 只在单次 Lease 内获得目标 Project Build Path 所需的 Pull/Push Scope，Base Image 默认只有批准 Repository 的 Pull Scope，不获得 GitLab API、Source Write、Registry Admin、Delete、其他 Project 或 Tag Protection 管理权限。Credential/JWT 不进入 Build Arg、Layer、Cache、日志、SBOM、Provenance 或 Artifact，Build Finalization/取消/超时后立即撤销本地 Lease 与认证材料。
- GitLab Container Registry Readiness 必须验证 Registry 已启用、TLS/Auth Token Realm、Project Mapping、OCI Manifest/Referrer 能力、Push/Pull、Digest Round-trip、权限隔离、Tag Protection、Retention/GC、存储容量、备份/恢复、Audit、限流与故障行为；任一关键条件失败时 `container_image.build/publish` Capability 保持不可用并在当前环境管理后台显示 Readiness Error，不自动部署 Harbor、回退匿名 Registry 或改推其他 Provider。Registry Artifact Storage、HA 与容量继续纳入 GitLab/运维边界及最终统一核算，平台不把 Artifact Layer复制到 PostgreSQL或本地 Workspace长期保存。
- Registry Build Publication 与 Deployment/Release 解耦：Build 成功、扫描或签名不会自动部署到 Kubernetes、触发 Jenkins、合并 MR 或移动正式 Release Tag；Jenkins 继续沿用已确认的独立人工流程。后续若引入 Image Promotion/Deployment，必须通过新的显式 Workflow Gate、Capability、Artifact Digest Binding 和 Adapter Contract 设计，不能复用“Build Completed”隐式触发外部副作用。
- OCI Image 与 Build Provenance 的首个签名实现固定采用 Cosign + OpenBao Transit/KMS，并通过稳定 `ArtifactSignerPort` 与 `CosignOpenBaoSignerAdapter` 接入。Rootless Builder 不持有、读取或挂载 Signing Private Key；Build Finalization 把精确 Image Digest、Source/Context/Builder/Base Digest、标准化参数与 Provenance交给独立受信 Signer，由 Signer 使用最小权限、短期 OpenBao Identity调用指定 Transit Key完成签名。Private Key在 OpenBao 内生成、标记不可导出且不进入 Kubernetes Secret、Node Disk、Environment Variable、日志、Backup 明文或 Builder；未来替换 Cloud KMS/HSM时只更换 Signer Adapter/Provider Mapping 与 PCS。
- Build Signature、SBOM Attestation、Provenance Attestation、Vulnerability Scan Attestation 与未来 Release/Promotion Attestation 是绑定同一 Manifest/List Digest 的独立声明，不能用“已签名”推导“无漏洞/已审批/可部署”，也不能把扫描通过伪装成构建者身份。Cosign Artifact 使用 GitLab Container Registry 支持且经 Readiness验证的 OCI 1.1 `subject`/Referrer-compatible 方式关联；由于 GitLab 对完整 Referrers API 的支持边界需按实际版本验证，PCS 必须锁定 Cosign、Registry Metadata Database/Schema、Publication/Discovery/GC/Copy 行为和 Artifact Digest，不能只因 UI显示图标就视为验证成功。
- 签名输入必须使用 Registry Read-back 后确认的 Digest而不是可移动 Tag；Signer校验 Build Execution状态、Project/Repository Binding、Environment、Builder/Policy Version、Provenance Digest与调用身份后才签名，并把 Signature/Certificate or Public Key ID、Transit Key Name/Version、Cosign Version、Payload/Bundle Digest、Registry Reference、时间与 Audit Event返回平台。用户、Agent、Builder、GitLab普通角色和 Super Admin页面均不能调用任意 Digest签名、选择 Key、关闭验证或伪造 Attestation；授权只通过受控 Build/Promotion Workflow与专用 Service Identity。
- DEV 与 PROD 均由同一 `ArtifactSignerPort`、`CosignOpenBaoSignerAdapter`、组件版本和 GitOps 模板实例化 Signer，运行实例、Key、Identity 与 Attestation 用途按环境隔离。首版采用环境/用途分离的 Signing Policy：当前 DEV Build使用 DEV Build Signing Key/Identity；未来 PROD Release不重新构建已验证 Image，而是在明确 Promotion Gate通过后对同一 Digest增加独立 PROD Release Attestation/Signature。DEV Key不能产生 PROD Release声明，PROD Signer也不接受未满足 Promotion Policy的任意 Digest。Key Rotation创建新 Key Version并保留历史 Public Key/Version、Policy与验证资料，使旧 Artifact继续可验证；Compromise、Revoke、Trust Store更新和历史影响评估必须有独立 Runbook与 Audit，不能删除旧 Key掩盖事件。
- Verification必须使用受版本控制的 Trust Policy校验 Image Digest、Signature、Key/Identity、Attestation Predicate/Schema、Environment/Project/Builder Binding与有效/撤销状态；单纯 `cosign verify`进程退出 0不等于满足平台 Policy。平台管理后台只读展示 Artifact Digest、各类 Attestation状态、Signer/Key Version、Trust Policy、Verification Evidence、Rotation/Revocation、Registry Referrer健康、Drift、Alert、Audit与 Runbook，不展示 OpenBao Token或 Private Key，也不提供人工“标记已签名/已验证”入口。Keyless Sigstore/Fulcio/Rekor保留为未来经独立信任根、OIDC、Transparency Log和可用性设计后的 Signer Adapter候选，首版不依赖公共服务。
- OCI Image Security 的首个实现固定采用独立 Trivy Scanner，并通过稳定 `ImageSecurityPort` 与 `TrivyImageSecurityAdapter` 接入；它不依赖 GitLab CI Pipeline、GitLab Runner、Jenkins 或 GitLab Edition私有 Workflow，也不复用负责用户附件恶意文件检查的 ClamAV/FileSecurity Port。Image Build发布到 Quarantine后必须由 Scanner使用只读、Repository-scoped Registry Credential按 Manifest/List Digest拉取并扫描，不能扫描可移动 Tag后把结果错误绑定到另一个 Image。
- Trivy首版覆盖 OS Package、Language Library、Known Vulnerability、Embedded Secret、Container/Dockerfile Misconfiguration、Base OS EOL与 License/SBOM事实；对当前 `linux/amd64` Image生成 CycloneDX JSON与 SPDX-compatible SBOM，并把 Scanner Engine/Plugin/Check Schema、DB Schema/Version、Java DB、Checks Bundle、配置、目标 Platform、Image/Layer/Base Digest、扫描范围、跳过/未覆盖项与结果 Digest记录在结构化 Scan Execution/Attestation中。不能因为某个 Scanner不支持特定 Layer、压缩、Package Manager或文件类型就默认为 Clean；Coverage不完整必须显式为 `INCOMPLETE/ERROR`并 Fail Closed。
- Trivy Engine/Container Image、CLI/API、Parser与 Policy Schema作为 PCS组件精确锁定版本和 Image Digest；Vulnerability DB、Java DB与 Checks Bundle使用独立安全数据生命周期，不因 Engine冻结而停止更新，也不在每个 Scan Job中无界重复下载。Java DB不是平台业务数据库或独立数据库服务，而是 Trivy扫描 Maven/Gradle依赖及 JAR/WAR等 Java制品所需的漏洞数据包；平台扫描的业务代码包含 Java，因此保留该数据包，但只有扫描范围实际包含 Java制品时才把其 Freshness纳入本次结果的有效性判断，非 Java制品不因 Java DB状态被误阻断。
- 每个环境由同一 GitOps模板实例化专用 `trivy-data-sync` Scheduled Job。Vulnerability DB默认每 `6h`同步一次；Java DB和 Checks Bundle默认每 `24h`同步一次。同步器只从 PCS批准的上游 OCI Repository获取候选 Artifact，验证 Registry来源、Manifest/Layer Digest、Schema兼容性、上游生成时间、完整解压以及最小 Smoke Scan；验证通过后才按不可变 Digest镜像到本环境 GitLab Container Registry并原子切换 Active版本。Scanner只消费内部镜像的已验证 Digest，不直接拉取浮动 `latest`；候选失败时继续使用最后一个已验证版本，但 Freshness年龄继续按其上游生成时间增长，不能用本地重新 Pull时间伪造新鲜。
- Scanner GitOps Policy默认使用三段 Freshness阈值：Vulnerability DB在超过 `12h`时 Warning、`18h`时 Critical、`24h`时 Fail Closed；Java DB在相关 Java制品扫描中超过 `36h`时 Warning、`48h`时 Critical、`72h`时 Fail Closed；Checks Bundle超过 `48h`时 Warning、`72h`时 Critical、`7d`时 Fail Closed。阈值可以通过新版本 Policy收紧；确需放宽必须经过 GitOps审查、TOTP确认和 Audit，且 Fail-closed上限分别不得超过 Vulnerability DB `48h`、Java DB `96h`、Checks Bundle `7d`。平台业务后台不提供修改或绕过入口。
- 每类安全数据保留最近 `3`个验证通过的不可变版本用于兼容验证和受控回退；Schema不兼容、Digest/来源校验失败或 Smoke Scan失败的候选不得激活。超过 Fail-closed阈值后，Scanner不得新产生 `CLEAN/PASSED`，新 Image继续留在 Quarantine；仍受当前 Gate约束的既有 Image在重评估时转为 `EXPIRED`并阻止新的 Promotion/Deployment，但不会因此强杀已经运行的业务或 Attempt。有效数据恢复后按风险和等待队列优先级触发重新扫描/重评估，只有新结果通过才能恢复可用状态；历史 Scan、Attestation和旧状态变化全部保留。
- `trivy-data-sync`的最近上游生成时间、内部 Digest、Active/Previous版本、同步/验证结果、失败原因、Freshness状态、受影响制品数、队列和 Runbook必须进入当前环境管理后台只读展示并接入告警。任何内置/随 Engine发布的旧检查只能用于诊断或恢复验证，不能在数据超过不可放宽上限后继续签发通过结论；DB过期、更新校验失败、Schema不兼容或所有 Scanner不可用时统一 Fail Closed。
- Scanner必须支持按 Digest幂等扫描、并发去重、失败重试、超时/资源上限、分层/内容缓存和 DB版本感知；相同 Image Digest只有在 Scanner/Policy/DB/Coverage版本完全匹配时才能复用结果。Vulnerability DB或 Policy更新后，平台可按受控优先级重新评估/扫描仍在 Retention内的既有 Digest，无需重新 Build；新发现可以让当前 Security Status从 `PASSED`变为 `BLOCKED/EXPIRED`，但不得修改旧 Scan事实、Build Signature或历史 Attestation，必须追加新版本结果和 Audit。
- Scanner读取 Registry与写入 Scan Result/Attestation使用分离的最小权限 Identity，不获得 Image Push/Delete、Git Source、Build Secret、OpenBao通用访问或 Kubernetes管理权限；不执行 Image Entrypoint、RUN Script或 Container Payload。扫描临时层、SBOM与 Cache使用有界加密临时空间并在完成/失败后清理，需要长期保存的结构化 Finding、Evidence与 Attestation进入权威数据库/Object/OCI Artifact，不能依赖 Scanner Pod本地目录。
- Image Security Scan Execution、Queue、Engine/DB/Check Version、DB Freshness、Coverage、SBOM/License、Finding Severity/Fix/Source、Rescan变化、Status、Attestation、Cache、资源、失败原因和 Runbook必须进入当前环境管理后台；业务页面按 Capability展示与当前 Requirement/Attempt/Image相关的可理解结果，基础设施参数保持只读。任何用户、Agent或 Super Admin页面都不能跳过扫描、把 `ERROR/INCOMPLETE`标成 Clean、改 DB版本或删除历史 Finding；具体 Security Gate与 Exception语义继续逐项确认。
- Image Build状态与 Image Security Status严格分离：Build可以成功产生并签署 Digest，但该 Digest在 Quarantine中必须经过 `PENDING_SCAN → PASSED | BLOCKED | ERROR | EXPIRED` 状态机，只有当前 Policy Version下为 `PASSED`或持有仍有效且允许的精确 Exception，才可进入后续 Ready/Promotion候选。`ERROR/INCOMPLETE`、Scanner/DB过期或不可用统一 Fail Closed；不能把 Build Signature、旧 Scan、Tag、人工备注或“开发环境”当作绕过当前 Gate的依据。
- `WAITING_CHILD` Parent的 `IMAGE_BUILD` Child只等待 Build Execution安全终态，不隐式等待 Image Security变为 `PASSED`。若 Agent后续动作确实依赖 Scan结果，首发在恢复后通过稳定 Image Security Port读取已完成事实；仍未终态时结束本轮 Agent计算并由 Requirement Workflow等待独立 Security Gate，不能继续占用 Sandbox轮询。未来若要让同一 Attempt自动等待 Scan，必须新增经过独立资源、Deadline和取消语义验证的 Child Kind，不能延长原 Build Lease、复用旧 Child ID或把 Build与 Scan合并成一个不可区分状态。
- 首版 Image Security Floor固定阻止以下结果：Signature/Provenance或 Trust Policy验证失败；扫描 Coverage不完整；发现 Embedded Secret；Base OS已 EOL；命中 CISA KEV等已确认在野利用目录；存在任意 `CRITICAL` Vulnerability。上述类别不允许 Security Exception。`HIGH` Finding默认阻止；`MEDIUM`、`LOW`和 `UNKNOWN`默认产生可见告警但不单独阻止，Policy可以通过新版本收紧而不能低于前述不可绕过 Floor。Fix Availability、Vendor Severity、CVSS与 Exploit Evidence都必须保留为 Finding事实，但“暂时没有 Fix”不会自动把 Blocked变成 Passed。
- 首版只有 `HIGH` Vulnerability允许创建限时 Security Exception，且必须精确绑定 Environment、Project/Repository、Image Digest、Finding/CVE ID、Scanner/DB/Policy Version、责任人、业务原因、补救措施和到期时间；Tag、Base Image名称、Package通配符、整个 Project或未来 Build均不能继承 Exception。Exception是独立受治理的风险接受事实，不修改原 Scan Finding/Attestation，也不把结果标成 Clean；创建、批准、撤销和到期均保留 Audit，只有 Super Admin可批准，Agent、创建人、普通管理员或 GitLab角色不能自批。
- Exception默认/最大有效期和提醒时间由版本化 Security Policy在架构允许范围内配置，不能设置永不过期；到期、撤销、Digest变化、Finding升级为 Critical/KEV、Signature/Provenance失效、Coverage/DB失效或 Policy不再允许时立即停止生效，并将当前 Status重新评估为 `BLOCKED/ERROR/EXPIRED`。Rebuild产生的新 Digest必须重新扫描并重新申请，不自动复制旧 Exception；平台不得因 Exception即将到期自动续期。
- `BLOCKED/ERROR/EXPIRED` Image及其 Layer、SBOM、Signature、Provenance、Scan、Exception和 Audit不会因 Gate结果立即删除，但只能留在 Quarantine且不得创建 Ready/Release声明、受保护 Tag或部署触发。当前 Jenkins仍在平台外独立手工运行，平台不虚假宣称可以阻止拥有 Registry/Jenkins越权凭据的人直接操作；运维必须通过 GitLab Registry最小权限与 Tag/Path Protection收敛旁路，未来接入 Deployment时再以 Digest Verification/Admission Gate强制执行。
- Image Security Policy、Status、阻断原因、Fix/No-fix、KEV、Exception详情/倒计时、重新扫描变化和修复建议必须在当前环境平台管理后台与授权业务页面可见；页面可以提供受 Capability控制的 Exception申请/审批命令，但不能编辑原 Finding、伪造 Scan、改变 Severity、跳过 Gate或修改不可绕过 Floor。所有外部消费接口返回当前 Status、Policy Version、Evidence Digest与评估时间，禁止只返回容易被误解的布尔 `safe=true`。
- 首个 PCS 的 Cilium 目标版本确认为 `1.20.x Stable`，当前精确 Patch Candidate 为 2026-07-29 正式发布的 `v1.20.0`；该 Release 官方更新至 Kubernetes `1.36`、Gateway API `v1.6.1` 与 Envoy `1.37.x`。由于 `v1.20.0` 仍是新 Minor 的首个 Patch，它只能作为 Candidate：PCS 正式冻结前必须重新核对最新受支持的 `1.20.x` 安全 Patch、Release Note、Upgrade Guide 与 Artifact Provenance，并完成 Ubuntu/Kernel、containerd、Kata、Gateway API、NetworkPolicy、升级/回退、性能和持续 Soak；通过后锁定 Helm Chart、CRD Schema、Cilium/Operator/Envoy/Hubble 等全部镜像 Digest，不能自动追随 `latest`、RC、开发分支或未经联合验证的新 Patch。
- Cilium 采用完整 eBPF `kube-proxy replacement`，Kubernetes bootstrap 不安装 `kube-proxy`，并以 `kubeProxyReplacement=true` Fail Fast；由 Cilium 统一处理 ClusterIP、NodePort、LoadBalancer、ExternalIP 和 HostPort，Kernel/eBPF、cgroup v2、设备或 API Server 直连条件不满足时不得静默退回不完整模式。由于 Sandbox 使用 Kata，必须设置 `socketLB.hostNamespaceOnly=true`，让 Pod Namespace 绕过不兼容的 Socket-level LB 并在 TC eBPF 路径完成 Service Translation；该设置及 Kata、普通 runc Pod、CoreDNS、Kubernetes API HA、Ceph/CSI、NetworkPolicy 和节点滚动升级必须进入 PCS 联合验证。首版使用 SNAT Load-balancing，不启用 DSR、Hybrid DSR、XDP Acceleration 或按 Service 自定义 LB 算法；这些属于后续新 PCS 能力，不作为后台动态开关。
- Cilium L7 Proxy 固定使用独立 `cilium-envoy` DaemonSet，设置 `envoy.enabled=true`，不把 Envoy 进程嵌入 `cilium-agent` Pod。每个运行 Cilium Agent 的 Linux Node 都按同一 GitOps/PCS Contract运行一个与目标 Cilium Release配套的最小化 Cilium Envoy Image，并锁定 Image Digest、Bootstrap/xDS Contract、Security Context、Probe和资源配置；不替换为通用 Envoy Image或独立 Envoy Gateway。Envoy CPU/Memory、日志、Socket和滚动 Surge/Unavailable必须计入各 Node Role的 DaemonSet Reserved与最终 Capacity Profile，不能把它当作无成本 Side Process。
- 独立 Envoy 与 Cilium Agent 分别拥有进程生命周期、Resource Request/Limit、Health Probe、日志和升级 Gate；Agent 滚动或重启不得无条件终止仍健康 Envoy上的既有 L7连接，Envoy Patch升级也不得要求同步重启 Agent。两者仍通过 Cilium 受控 Unix Domain Socket和 xDS Contract协作，不因此把 Envoy变成可脱离 Cilium独立管理的通用 Proxy；任一版本、Socket、xDS或 Policy状态不兼容时对应 L7/Gateway路径 Fail Closed并告警，不回退到未代理明文或绕过 Policy。
- 首版 Gateway继续采用 `LoadBalancer` Service或受控 NodePort接入，不启用 Cilium Gateway Host Network模式，因此不为 Envoy额外保留低端口绑定能力或授予 `NET_BIND_SERVICE`。Envoy Admin/Debug Interface和生产 Debug Logging保持关闭；Access Log只记录经过 Schema批准且完成脱敏的 Method、Route、Status、Latency、Client/Trace标识摘要，不记录密码、Authorization、Cookie、TOTP、Token、请求/响应正文或完整敏感 Query String。
- `cilium-envoy` DaemonSet使用 Readiness/Liveness/Startup Gate与受控 RollingUpdate，一次最多使 1 个 Envoy Pod不可用；更新前后必须验证其余 Gateway路径、L7 Policy、连接排空、xDS一致性和入口健康，失败时停止继续 Rollout。单 Node Envoy故障只降低该节点 L7/Gateway能力并触发流量避让/告警，不能使 Cilium L3/L4数据面自动放宽 Policy；全部可用 Envoy路径失败时北向业务入口保持不可用而非旁路直达 Backend。
- Cilium Pod 网络采用 `ipam.mode=cluster-pool`、`routingMode=tunnel` 和 `tunnelProtocol=vxlan`，首版只启用 IPv4；Node Underlay 必须允许集群节点之间的 VXLAN `UDP/8472`，不引入 Alibaba Cloud 专用 IPAM、VPC Route、BGP、Native Routing 或 Dual-stack。DEV 与 PROD 使用各自独立的 Pod CIDR，且必须在部署前与当前环境的 VPC、VPN、Service CIDR、Node CIDR 和企业网络地址计划执行服务端/流水线冲突校验，存在重叠时 Fail Closed；具体地址段不是业务后台配置，也不能由应用代码推断。每 Node Mask Size 在最终 Pod 密度与故障余量计算后进入 Environment Capacity Profile；Effective MTU 必须结合 ECS NIC Underlay、VXLAN 约 50 Byte 封装开销和 Kata 内外两层网络进行 Path MTU/大包/跨 Node 实测后锁入 PCS/Node Network Profile，不直接假定为 `1450`。IPAM 或 Routing Mode 的切换属于高影响基础设施迁移，需要新 PCS、受控迁移或新 Cluster，不能作为运行时开关。
- Kata Sandbox 的 Guest Route MTU 采用受信 Init Container 注入方案。Sandbox Controller 必须在 Agent/用户 Workload 之前自动注入平台签名且按 Digest 锁定的 Init Image，由它仅在对应 Kata Guest/Pod Network Namespace 内临时获得 `CAP_NET_ADMIN`，把默认路由及 PCS 明确要求的相关 Route 设置为当前 Environment Node Network Profile 中经过 Path MTU 实测的 Effective Value，读回校验成功后立即退出；不能把 `1450`、Underlay MTU 或其他环境的结果写死在 Image、业务代码或 Workflow 中。
- MTU Init Container、命令、Capability、Route Scope 与 Expected Value 由 Sandbox Controller/Admission 生成和校验，用户、Agent、Workload Image 与普通管理员均不得删除、覆盖、重排、伪造成功或自行增加 `NET_ADMIN`。Agent 与全部业务 Container 始终不持有 `NET_ADMIN`；Init Container 的 Capability 不得触达 Host Network Namespace、Cilium Agent、其他 Pod 或 Node Device。设置或读回验证失败时 Sandbox 保持未 Ready，Attempt 记录结构化 `SANDBOX_NETWORK_MTU_INIT_FAILED` 并进入既定安全重试/失败路径，不得用默认 MTU 继续运行。
- DEV/PCS 必须针对实际 Underlay + VXLAN + WireGuard + Kata 组合执行 DF Ping、边界尺寸、TCP/HTTP 大包、Git Clone/Push、依赖下载、长连接、跨 Node、Kata↔runc、Node 重启与滚动升级测试，并记录 Outer Device MTU、Cilium Route MTU、Guest Route MTU 和验证证据；测试失败时调整新的 Node Network Profile Candidate 或修复实现，不全局压低所有 Cilium Workload MTU掩盖问题，也不引入自维护 Kata/CNI Patch。平台管理后台只读展示 Desired/Effective/Observed MTU、Init 结果、Drop/Fragment/Hubble 证据、Drift、Alert 与 Runbook，不提供手工修改入口。
- Cilium 同时启用 Hubble Network Observability：每个 Node 由现有 Cilium Agent 提供 Flow 可见性，每个环境部署 2 个 Hubble Relay 汇总 Cluster 视图，并部署 Hubble UI；Hubble UI 作为平台管理后台中的受控外部控制台入口在新标签页打开，不直接暴露公网，浏览器也不获得 Kubernetes/Cilium 凭据。平台聚合后端通过 Observability Adapter/Prometheus 读取 Hubble 指标，默认覆盖 Flow、Drop、TCP、ICMP、DNS 和 NetworkPolicy Deny；首版不默认启用 HTTP L7 内容观测或为观察目的给普通流量注入额外 L7 Proxy。原始 Flow 只使用有界内存 Buffer，不永久保存全量网络流量；仅将拒绝、异常 Drop 等批准的排障/安全事件选择性输出到 Loki，默认保留 `7d`。任何采集与导出不得包含请求正文、Secret、Token 或业务 Payload；Hubble Relay、UI、Metrics 或 Exporter 故障只能降低可观测性，不得影响 Cilium 数据转发或放宽 NetworkPolicy。
- Cilium 对跨 Node 的 Cilium-managed Pod 流量启用 WireGuard Transparent Encryption，固定 `encryption.enabled=true`、`encryption.type=wireguard`，并要求 Node Underlay 允许集群节点之间的 `UDP/51871`；同一 Node 内流量不经过 WireGuard，Host/Control Plane/HostNetwork 流量继续使用各协议已有的 TLS/mTLS。首版不启用仍具启动依赖且已进入废弃方向的 `encryption.nodeEncryption`，也不采用 IPsec 或 Beta ztunnel；WireGuard 不能替代 PostgreSQL、Valkey、NATS、OpenBao、Kubernetes API 等应用层身份认证与加密。VXLAN + WireGuard 的双重封装必须进入 MTU、分片、Kata 大包、Ceph Recovery/Backfill 吞吐、Node CPU、Key/Peer 重建和滚动升级 Gate，验证失败时 PCS Fail Closed，不能静默关闭加密。端点尚未传播时的潜在未加密窗口通过默认拒绝 Egress、批准的 CIDR/FQDN/Connector Allowlist 和 Sandbox 出口控制收敛；Node 自动生成的 WireGuard Private Key 只留在对应 Node 受保护状态中，Public Key 才通过 CiliumNode 发布，任何 Key/Peer 异常必须进入 Hubble/平台告警。
- 所有业务与基础设施 Workload Namespace 默认执行双向拒绝的 NetworkPolicy Baseline：没有显式 Allow Policy 时同时拒绝 Ingress 与 Egress。可移植规则优先使用标准 Kubernetes `NetworkPolicy`；只有标准 API 无法表达的 FQDN Egress、Cilium Identity/Host Policy 等场景才允许使用版本化 `CiliumNetworkPolicy`/`CiliumClusterwideNetworkPolicy`，领域模块不得直接生成或依赖 Cilium CRD。内部放行优先使用 Namespace、ServiceAccount 与稳定 Workload Label 身份，不依赖易变化的 Pod IP；DNS 只放行至批准的 CoreDNS，Platform Backend、PostgreSQL/PgBouncer、Valkey/Sentinel、NATS、Temporal、OpenBao、Observability、Scanner、Ceph/RGW 和备份 Job 必须分别维护显式最小通信矩阵。Sandbox 默认禁止访问 PostgreSQL、NATS、OpenBao、Kubernetes API、Node Metadata、其他 Sandbox 和未批准公网，只能通过 Requirement/Attempt 授权的 GitLab、Model Gateway、依赖源、搜索 Connector 与 FQDN/CIDR Allowlist 出口。普通 NetworkPolicy 不覆盖的 HostNetwork、Node、Control Plane 和 Ceph Host 流量必须由 Cilium Host Policy、主机防火墙与云 Security Group 补齐。Policy 属于 GitOps/PCS Contract，必须先在 DEV 验证 Allow/Drop、DNS、故障切换和升级结果再进入 PROD；平台管理后台只读展示 Desired/Effective Policy、Drift、被拒绝 Flow、受影响 Workload、Hubble 证据和 Runbook，任何角色都不能从业务后台临时关闭或绕过默认拒绝。
- Kubernetes 北向入口统一采用标准 Gateway API Contract，首个 PCS 使用已选 Cilium 提供的 Gateway Controller/Data Plane，不额外部署 Envoy Gateway，也不新建已经停止维护的 ingress-nginx。平台路由优先只使用标准 `Gateway`、`HTTPRoute`、`GRPCRoute` 与 `ReferenceGrant`；Cilium 私有的 Gateway 配置只能位于基础设施 GitOps/Provider Mapping 层，Requirement、Workspace、业务模块和 Route 数据不得依赖 Cilium 私有字段。未来替换 Gateway 实现时通过新 `GatewayClass`、Provider Mapping 与 PCS 完成，不修改业务 API 或领域状态机。
- 首个 Gateway API 目标版本固定为 `v1.6.x Standard Channel`，当前精确 CRD Candidate 为 `v1.6.1`，与 Cilium `v1.20.0` 声明采用的版本一致。Standard CRD Bundle、Schema、Conversion、ValidatingAdmissionPolicy、安装 Manifest 与 Digest 由单一独立 GitOps 单元拥有，必须先于 Cilium Gateway Controller 和 cert-manager 安装并达到 Established/StoredVersion Gate；Cilium、cert-manager 或其他 Helm Chart 不得并行创建、覆盖或使用不同版本的同名 CRD。升级必须先验证 Stored Version、Conversion、Route/Certificate兼容和回退约束，禁止直接覆盖未知 CRD 状态。
- 首版只使用 `Gateway`、`GatewayClass`、`HTTPRoute`、按需 `GRPCRoute` 与 `ReferenceGrant` 的已确认标准能力；不安装 Experimental Channel Bundle，也不启用 ListenerSet 自助委派、TLSRoute、TCPRoute、UDPRoute、Experimental Authentication 或其他当前无需求功能。某项 CRD 即使存在于 Standard Bundle，也只有在 Cilium Conformance、权限边界、NetworkPolicy、升级/回退与业务需求独立确认后才能被平台使用，不能因升级 CRD 自动暴露新能力。
- 首个 cert-manager 目标版本固定为 `1.21.x Stable`，当前精确 Patch Candidate 为 `v1.21.1`；官方支持并测试 Kubernetes `1.33–1.36`，且该 Patch 修复 `v1.21.0` 的 Controller Panic、Secret Informer 事件丢失、Issuer 卡死与 Gateway API 配置示例问题。Helm Chart、CRD、Controller、Webhook、cainjector、startupapicheck 及其他实际镜像必须锁定精确 Version/Digest，并在 PCS 冻结前重新检查最新受支持的 `1.21.x` Patch和安全公告；任何 Patch 更新均生成新 PCS Candidate并经过 DEV 验证，不自动替换。
- cert-manager 使用版本化文件配置启用 `gatewayAPI.enabled=true`，但当前 IP 入口仍通过显式 `Certificate.spec.ipAddresses` 与同 Namespace TLS Secret管理，不依赖 Gateway Annotation自动生成 Certificate。ListenerSet Feature Gate和其他 Alpha/Experimental Feature Gate首版保持关闭；Controller/Webhook RBAC、NetworkPolicy、Leader Election、Availability、Upgrade、Backup/Restore无状态假设、OpenBao Issuer认证、签发/续期、Secret Rotation与 Gateway Reload必须进入联合 DEV Gate，任一关键链路失败时证书状态 Fail Closed且不得回退手工证书或明文入口。
- `platform-gateway` 表示 DEV/PROD 共用的逻辑组件名称与同源 GitOps 定义，不表示一个跨 Cluster 运行的共享 Gateway 实例。当前只在 DEV Cluster 实例化；未来 PROD 使用相同模板和 PCS 在 PROD Cluster 独立实例化。Gateway、Service 和 Route Reference 均以所在 Cluster 为边界；两个环境的入口 IP/域名、TLS Certificate、Route 状态与故障域相互隔离，任何一个环境的发布、回滚或故障都不能依赖或改变另一个环境。
- 运维侧既有 WAF/External Load Balancer 通过受控 `LoadBalancer` Service 或在尚无 LB Controller 时通过受控 NodePort 接入当前环境的 Cilium Gateway；Host Network 仅保留为前两种方式不可用且经 PCS 验证后的 Provider Mapping，不作为默认路径。当前使用 IP 与未来切换域名沿用同一 Gateway 结构，只调整环境 Listener、Certificate、DNS/入口映射和受控 Route 配置，不修改平台业务代码。
- 当前北向 Edge Trust Mode 固定为 `DIRECT_OR_L4_TRANSPARENT`：没有 External Load Balancer 时由受控入口直接连接 `platform-gateway`；存在 External Load Balancer 时它只做 L4 TCP 转发并保持 TLS 字节流透明，客户端 TLS 始终在 `platform-gateway` 终止，看到的也是 Gateway 当前 Certificate。这里不是 Gateway API `TLSRoute` 到业务 Backend 的 TLS Passthrough；任何 Edge/LB 都不得在外层解密后以明文 HTTP、私有 Header 或旁路 Service 连接 Backend。
- 当前 Gateway 明确设置并验证 `trusted hops=0`/Remote Address语义，不信任外部请求自带的 `Forwarded`、`X-Forwarded-For`、`X-Real-IP`、`X-Envoy-External-Address` 或同类 Client IP Header；Cilium/Envoy 只以实际 TCP Source Address建立规范化 Client Address并重新生成受控转发上下文。Provider LB若执行 SNAT而无法保留 Source IP，平台必须如实记录 Edge Peer而不能从不可信 Header猜测客户端；Source Preserve、SNAT行为、IPv4、健康检查、跨 Node转发和故障切换必须进入该 Provider Mapping的 PCS验证。
- 北向 TLS最低允许 `TLS 1.2` 并优先协商 `TLS 1.3`，禁用 TLS 1.0/1.1、弱 Cipher、TLS Compression、不安全 Renegotiation和未经 PCS批准的 Algorithm；TLS Version、Cipher/Curve、ALPN、HTTP/1.1/HTTP/2行为与实际扫描证据进入 Gateway Security Profile。到期、证书/Chain不匹配、协商低于 Floor或配置 Drift时 Fail Closed，不得为兼容旧客户端临时开启弱协议；HTTP仍只保留已经确认的 Redirect/PKI Publication例外。
- 未来确需 L7 WAF时，通过新 PCS Provider Mapping引入独立 `EDGE_TLS_REENCRYPT` Mode：WAF可以终止 Client-facing TLS，但 WAF到 `platform-gateway` 必须重新建立满足同一 TLS Floor且校验 Gateway身份的 TLS连接，禁止明文回源；Gateway只接受版本化 Allowlist中的 WAF Source CIDR/Network Path，并仅在该路径下启用精确 Trusted Hop Count。WAF必须删除外部传入的 Forwarded/Client-IP Header并写入自己的规范化结果，Gateway再次校验并同时记录实际 Edge Peer与派生 Client Address；若目标 Cilium/Gateway版本对 Frontend Client Certificate Validation完成 PCS验证，可以进一步启用 Edge mTLS，否则不得用未支持扩展伪装已经具备 mTLS。
- Platform Backend只消费 Gateway生成且标明 Trust Mode/Peer/Derived Source的规范化 Request Context，原始 Client IP Header不进入身份认证事实；Client Address只用于审计、限流、异常检测和调查，不能代替账号、Session、TOTP、Capability或 Workload Identity。Access Log/Audit保留 Edge Mode、Peer、Derived Client Address摘要和配置版本但继续执行敏感信息脱敏。WAF/LB厂商控制台与实例配置由运维负责，平台业务代码只依赖该 Edge Trust Contract；更换供应商只替换 Provider Mapping、Gateway/GitOps配置和验证证据。
- 当前使用 IP 的北向入口由 `platform-gateway` 终止 TLS，并由 cert-manager 通过 OpenBao PKI 自动签发包含明确 `ipAddresses` SAN 的叶子证书；不使用依赖 DNS `hostname` 的 Gateway 自动注解路径，也不接受 Common Name 代替 SAN。Certificate、Gateway TLS Listener 与引用的 `kubernetes.io/tls` Secret 位于同一受控 Gateway Namespace，Listener 在 IP 阶段不声明虚假的域名。HTTP 明文入口只允许执行受控 HTTPS Redirect 或未来 ACME Challenge，不承载登录、Session 或业务 API 明文流量。
- cert-manager 使用专用 ServiceAccount 的短期 Token 通过 Kubernetes Auth 调用 OpenBao Vault-compatible Issuer/PKI Sign Path，不保存长期 OpenBao Token、Root Token、AppRole SecretID 或通用 PKI 权限。OpenBao PKI Role 只允许当前环境批准的入口 IP/CIDR、Key Usage、TTL 与证书用途，并拒绝任意 IP、其他环境地址、CA Certificate 或未授权 SAN；Issuer/Role、认证 Mount、ServiceAccount、Certificate 与 Secret 均按环境独立实例化，接口和 GitOps 模板保持相同。
- CA/Issuer Private Key 保持在受控 PKI 信任边界内，不进入 Gateway Pod、Git、Helm Values、平台数据库或普通 Kubernetes Secret；Cilium Gateway 为完成 TLS 终止所需的叶子 Private Key 只能存在于上述专用 TLS Secret，并受 Namespace RBAC、etcd 静态加密、Secret Watch/Read 最小化、自动轮换与 Audit 保护。证书签发、续期、Secret 更新、Gateway Reload、到期、失败和信任链健康必须可观测并 Fail Closed，禁止到期后回退 HTTP、自签临时证书或忽略校验。
- 使用内部 IP SAN 证书时，受控客户端必须预先信任平台 Root CA；未安装 Trust Anchor 的浏览器出现信任警告属于预期阻断，平台不得指导用户点击绕过。未来启用正式域名时，可以通过新的 Issuer/Certificate Policy 切换到公共 ACME 或其他受信 CA，只修改 Gateway Listener、Certificate、DNS/入口映射与环境配置，不修改业务 `HTTPRoute`、Control Plane API 或领域模型；Public ACME IP Certificate 不作为当前 VPN/私网入口的默认方案。
- 内部 PKI 固定采用一个离线 Organization Root CA 与环境隔离的 Issuing Intermediate CA 层级：Root CA 只签署、更新或撤销 Intermediate CA，不直接签发 Gateway、Workload 或用户叶子证书；DEV Intermediate CA 只存在于 DEV OpenBao，未来 PROD Intermediate CA 只存在于 PROD OpenBao。两个环境共享的是公开 Root Certificate/Trust Anchor 和同源 PKI Contract，不共享在线 Private Key、PKI Mount、Issuer ID、Serial、CRL、签发记录、Role、Token、Lease 或运行状态。
- Organization Root CA Private Key 必须离线生成并采用受控加密介质、分离备份、访问记录和恢复演练保管，永不进入 OpenBao、Kubernetes、Cloud Server、平台数据库、Git、CI/CD、普通运维工作站或即时通信。Root Certificate、Fingerprint、Algorithm、Validity、Policy OID、签署过的 Intermediate Certificate、CRL/Revocation 事实和轮换 Runbook可以公开、版本化并进入 Trust Distribution；任何 Root 签名操作必须离线、显式、可审计，不能由 cert-manager、OpenBao 自动调用或形成常驻网络服务。
- 每个环境的 Intermediate CA Key 在本环境 OpenBao PKI 内生成并保持不可导出，使用独立 PKI Mount/Issuer、Kubernetes Auth Role、签发 Role、允许的 IP/CIDR/DNS Namespace、Key Usage、TTL、CRL/AIA 与 Audit；Role Policy 与可行的 X.509 Name Constraints 必须共同限制环境用途。即使使用同一 Root Trust Anchor，DEV 身份也不能调用 PROD Sign Path，DEV Intermediate 不得按正常 Policy签发 PROD 地址或名称，反之亦然；跨环境签发、复制 Intermediate Key 或让一个 OpenBao 远程承担两个环境在线 CA 均被禁止。
- Intermediate 更新、轮换或疑似泄露时，只撤销并替换受影响环境的 Intermediate，保留另一环境在线签发链；客户端 Trust Store 继续以 Organization Root 为锚，并通过有效 Chain、CRL/Revocation 与策略验证拒绝旧 Issuer。Root Rotation 属于独立高风险 Ceremony，必须采用新旧 Trust Anchor 受控重叠、客户端 Trust Distribution、Intermediate 重签、全链验证和旧 Root 退役流程，不能原地替换同名 Root 或只覆盖证书文件。
- Organization Root CA 默认有效期为 10 年，并最迟在到期前 2 年启动下一代 Root 的离线生成、Trust Distribution、新旧 Trust Anchor 重叠、环境 Intermediate 重签和旧 Root 退役流程；不能等到临近到期才开始客户端迁移。DEV 与 PROD 的 Issuing Intermediate CA 各自默认有效期为 3 年，并最迟在到期前 6 个月于对应环境创建新 Issuer、生成全新不可导出的 CA Private Key、取得离线 Root 签名并进入新旧 Chain 并行过渡；不得续用旧 CA Key 只延长 Certificate，也不得让两个环境共享轮换后的 Intermediate Key。
- Root/Intermediate 有效期和提前窗口属于版本化 PKI/GitOps Policy；Policy 变化只影响后续签发或触发受控重新签发，不能原地改写已经存在的 X.509 Validity。Private Key 疑似泄露、算法失效、约束越权或 Issuer 完整性失守时必须立即进入撤销、换钥、重签和信任更新的紧急流程，不得等待正常到期或提前轮换窗口；平台管理后台展示当前/下一代 CA、有效期、轮换阶段、Chain 覆盖率与告警，但不持有或操作离线 Root Private Key。
- 内部 PKI 首版使用单一 ECDSA 信任层级：离线 Organization Root CA 使用 ECDSA P-384 与 SHA-384；DEV/PROD Issuing Intermediate CA 各自使用 ECDSA P-256，其 Certificate 由 Root 以 ECDSA/SHA-384 签名，随后由 Intermediate 以 ECDSA/SHA-256 签发 Gateway、Workload 和其他叶子证书；叶子 Private Key 默认统一为 ECDSA P-256。Algorithm、Curve、Signature Algorithm 与用途约束进入版本化 PKI Policy 和 PCS，不写死在业务代码、SDK 或领域模型中。
- 首版不建立并行 RSA CA，也不把 Ed25519 用于 TLS PKI。若经真实 Client Inventory、Handshake Test 与兼容性证据确认存在无法支持该 ECDSA Chain 的受控旧客户端，必须通过新 PCS 引入隔离的 RSA Compatibility Profile、独立 Issuer/Role、Certificate/Listener 映射、轮换与退役策略；不得静默把现有 ECDSA Root 或 Intermediate 原地改为 RSA，也不得让普通用户或应用请求任意算法。兼容 Profile 上线前仍以不兼容连接 Fail Closed为准。
- 每个环境的 OpenBao PKI Mount 同时启用完整 CRL 与内置 OCSP Responder，不另外部署第三方 OCSP 产品；CRL 默认 `expiry=24h`、`auto_rebuild=true`、`auto_rebuild_grace_period=6h`，OCSP 默认 `ocsp_disable=false`、`ocsp_expiry=4h`，首版设置 `enable_delta=false`，不为当前规模引入 Delta CRL。DEV 与 PROD 分别拥有自己的 Issuer、Serial、CRL、OCSP、吊销记录和状态 URL，禁止合并或跨环境查询在线吊销状态。
- 普通周期由 OpenBao 自动重建完整 CRL；紧急吊销事务必须在成功记录 Revocation 后显式触发并验证 CRL Rotate，不能因启用 Auto Rebuild 而等待下一个周期。Certificate、CRL 与 OCSP Response 的 Signature、Issuer、ThisUpdate/NextUpdate、Serial Status和实际发布内容必须被持续探测；过期、签名不匹配、状态陈旧或发布内容与 OpenBao 当前状态不一致时告警并对依赖吊销状态的受控 Workload/mTLS Client Fail Closed。浏览器是否执行 OCSP/CRL检查受 Client实现影响，因此平台不得把浏览器端吊销检查作为唯一的泄露防线。
- Intermediate 轮换后，旧 Issuer 立即移除 `issuing-certificates` 用途，只保留 `read-only,crl-signing,ocsp-signing`，继续为其历史叶证书提供吊销状态；只有在该 Issuer 签发的全部 Certificate 均已过期、CRL/OCSP缓存窗口和版本化安全缓冲期结束且证据验证无消费者后，才能进一步冻结或退役。吊销 API 仅对最小权限运维身份开放并完整 Audit；CRL/OCSP只读发布入口不授予签发、吊销、Issuer配置或任何 Secret访问权限。
- 每个环境使用同源 GitOps/PCS Contract 独立部署一个轻量只读 `pki-publication` Adapter，稳定状态运行 2 个跨 Node 分散的无状态副本；DEV 实例只代理 DEV PKI 状态，未来 PROD 实例只代理 PROD PKI 状态。Adapter 不持有 OpenBao Token、Kubernetes Secret、CA/Leaf Private Key 或签发/吊销权限，只能经 NetworkPolicy 访问本环境 OpenBao 明确允许的公开 Issuer Certificate、完整 CRL 与 OCSP Read Endpoint；OpenBao Service、Management API 和其他 `/v1/*` Path 不直接暴露给入口网络。
- 当前环境 `platform-gateway` 在 HTTP Listener 上仅为 `/.well-known/pki/` 下版本化且精确匹配的状态 Path 建立到 `pki-publication` 的例外 Route：CA/CRL 只允许 `GET`，OCSP 只允许协议规定的 `GET/POST`，其余 Method、Path Traversal、编码绕过、超限 Request、异常 Content-Type 与未知 Issuer 均拒绝。使用 HTTP 是因为返回的 Certificate、CRL 和 OCSP Response 已由对应 CA 签名，并可避免为验证 Gateway HTTPS Certificate 而先依赖另一个待验证 HTTPS Certificate 的循环；该例外不携带账号、Cookie、Authorization、Session 或业务数据，除批准的 PKI 状态 Path 外，所有 HTTP 请求仍执行既定 HTTPS Redirect 或拒绝。
- `pki-publication` 必须限制 Request/Response Size、并发、Rate、Timeout 和 Upstream Connection，验证返回 Signature/Issuer/Validity/NextUpdate 后才允许缓存，且不得超过签名对象的 NextUpdate 或版本化更短上限；不得记录 OCSP Request/Response Body、完整 Serial、Certificate、Header Secret 或原始二进制内容。健康检查同时验证两个副本、Gateway Route、OpenBao Upstream 与实际外部响应，全部路径不可用或状态陈旧时触发告警，依赖在线吊销状态的受控 Client 按既定规则 Fail Closed。
- Certificate AIA/CRL Distribution Point 固定引用当前环境稳定的 Publication URL，不能引用 Pod IP、ClusterIP、OpenBao Pod 名或临时 Port-forward。未来入口由 IP 切换为域名时，新签 Certificate 使用新 URL，但旧 IP Publication Route 必须保持可用，直到所有仍引用旧 URL 的 Certificate 均已过期、CRL/OCSP缓存窗口与安全缓冲期结束并验证无消费者；禁止覆盖 URL 后立即拆除旧入口。该迁移只调整 PKI/Gateway/GitOps配置，不修改业务代码或跨环境共享 Publisher。
- 平台定义稳定的 `TrustBundlePort` 负责向 Kubernetes Workload、Cluster Node/平台 Server 和员工终端分发公开 Organization Root Trust Bundle；领域代码只依赖 Bundle Version/Fingerprint Contract，不依赖 trust-manager、MDM、特定 OS 或人工脚本。首版的权威 Bundle 作为独立、版本化且带 Digest/Review Evidence 的 GitOps PKI Artifact 管理，只包含被明确批准的 Organization Root Trust Anchor；Intermediate、Leaf Certificate、Private Key 和任意第三方 CA 不得进入该权威 Root Bundle。
- Kubernetes 内首版由 GitOps `TrustBundleAdapter` 把权威 PEM 以独立只读 ConfigMap 投影到显式批准并带 Trust Label 的 Namespace，Workload 挂载该 Bundle，而不得从 Server/Client TLS Secret 的 `ca.crt` 或包含 Private Key 的 Secret 获取信任根。Kubernetes Node 与平台 Server 通过版本化 Node Image/Bootstrap Adapter 安装到 OS Trust Store；任何 Bundle 变更必须验证 Node、Pod、Java/Node/Python/OpenSSL 等实际 Runtime 均加载了目标版本，不能只检查 ConfigMap 已创建。
- 员工终端首版由 IT/既有可信渠道提供 Root Certificate、Fingerprint 与 Windows/macOS/Linux及独立 Browser Trust Store 的受控安装说明；首次信任必须通过与下载路径独立的可信渠道核对 SHA-256 Fingerprint。`pki-publication` 可以公开下载 Root Certificate，平台管理后台也可展示 Version、Fingerprint、Validity、轮换阶段和已知覆盖情况，但二者都不能单独证明首次下载内容真实，不能自动把任意 CA 写入员工 OS，也不提供上传或编辑 Trust Anchor 的后台开关。
- Root 轮换时权威 Bundle 先同时包含新旧 Root，经 DEV 验证、终端/Node/Workload分发和覆盖证据确认后才允许切换新 Intermediate/Leaf Chain；旧 Root 只有在全部依赖 Chain、缓存和安全缓冲期结束后才能从 Bundle 移除。当前 Kubernetes 原生 ClusterTrustBundle 仍依赖显式 Feature Gate，trust-manager Resource又处于 `Bundle` 向 `ClusterBundle` 演进阶段，因此首个 PCS 不把它们设为唯一分发依赖；未来其稳定性通过 PCS 后只替换 `TrustBundleAdapter`，不改变业务 API、PKI层级或客户端身份模型。
- `platform-gateway` 叶子证书默认有效期为 30 天，并由 cert-manager 在到期前 10 天开始自动续签；每次重签设置 `privateKey.rotationPolicy=Always`，生成新的叶子 Private Key，默认算法为 ECDSA P-256。证书签发、Secret 更新、Gateway 热加载与新证书实际生效必须形成可观测闭环，不能只把 Certificate 标记为 Ready 而不验证入口当前提供的证书 Serial、SAN、Chain 与有效期。
- 进入续签窗口后仍未成功时，到期前 7 天触发 Warning、到期前 72 小时升级为 Critical，并持续通知当前环境平台管理后台与运维告警链路；到期后对应 HTTPS Listener 必须 Fail Closed，不允许回退 HTTP、复用已过期证书、自动生成临时自签证书或绕过客户端校验。上述时间默认值允许通过版本化 PKI/GitOps Policy 调整，但叶子证书有效期不得超过 90 天，且调整不能关闭自动续签、每次换钥或到期阻断等安全 Floor；平台管理后台只展示 Effective Policy、证书状态与告警，不直接编辑或绕过基础设施 Policy。
- PCS 必须锁定 Kubernetes Control Plane/Node 版本、Node OS Image、Kernel/关键内核能力、Container Runtime/CRI、Kata Runtime、Cilium/CNI、CSI/Storage Driver、cert-manager、Ingress/Gateway 组件，以及 CloudNativePG/PgBouncer、Valkey、NATS、Temporal、OpenBao、Rook/Ceph、Observability、Scanner、Backup Plugin 等 Operator、CRD、Helm Chart 和 Container Image 的精确版本与 Artifact/Image Digest。禁止 `latest`、浮动 Minor/Patch、启动时自动更新和只记录 Chart 不记录 Operand Image。
- PCS Manifest 还必须记录每个组件的配置/CRD Schema Revision、启用的 Feature Gate、关键协议或存储格式、官方支持/EOL 信息、已验证依赖范围和来源证据；Secret Value、环境凭据、域名、Bucket、数据库数据、`PLATFORM_POLICY` 运行值和其他环境事实不得进入 PCS。环境容量与资源值可以不同，但不能借容量差异让 DEV/PROD 使用未经声明的不同组件版本或接口形态。
- DEV 与 PROD 在稳定状态使用同一个 PCS ID、相同 Component Shape 和兼容 Contract。升级期间 DEV 可以先处于 Target Set，而 PROD 继续使用 Current Set；这属于受控 Promotion Window，不代表允许长期版本分叉。平台管理后台必须分别显示当前环境的 Desired Set、Effective Set、Target Set、各组件实际版本/Digest 和差异，不提供跨环境直接切换或写入能力。
- PCS 生命周期使用 `CANDIDATE → DEV_VALIDATED → PROD_APPROVED → ACTIVE → RETIRED`。Candidate 只能通过 GitOps Review 创建；DEV Validation 证据与 Manifest Digest 绑定，任何版本、Digest、CRD、Feature Gate 或关键配置变化都会产生新 Set 并使旧证据失效。PROD 只能选择已经 `DEV_VALIDATED` 且内容完全相同的 Set，不得在部署时临时替换镜像、Chart 或版本。
- DEV Validation 至少覆盖官方 Compatibility Matrix、API/CRD Conversion 与 Deprecation、安装和逐步升级、证书轮换、NetworkPolicy、Kata/Sandbox 隔离、数据库与消息兼容、Leader/Failover、Backup/Restore、Observability、应用 Adapter Contract，以及可执行的 Rollback/Forward-fix 路径。Release Notes、Artifact Provenance/Signature、SBOM 或等价组件清单、漏洞扫描、测试结果、已知限制和 Runbook 必须关联到 Set Evidence；未经官方矩阵与 DEV 实测共同证明的组合不得标记为 `DEV_VALIDATED`。
- 平台应用 Release 与 PCS 分开版本化，避免普通业务发布被迫创建新基础设施 Set；但每个 Control Plane、Worker、Agent Runtime 和管理前端 Release 必须声明支持的 PCS 范围、Schema/API Contract 与最低依赖。Kubernetes Rollout Gate 同时校验 Application Release 和当前/目标 PCS，超出支持范围时阻止部署；应用代码继续只依赖 Port/Adapter，不直接依赖 PCS 内的厂商实现。
- PCS 是版本与兼容发布单元，不是跨 Kubernetes、数据库、消息、Secret Manager 和 Object Storage 的分布式事务。实际升级必须按声明的 Dependency DAG 和逐组件 Gate 执行，Set 在完成前显示 `TRANSITIONING`；每一步验证健康、数据兼容、备份检查点和下游契约后才继续，失败立即停止后续步骤。管理后台不能在部分完成时显示整个 Set 已 Active，也不能把预期 Transition 混同为未受控 Drift。
- Stateful 组件的回退受数据格式、CRD Conversion、Schema Migration 和 Quorum 状态约束。每个 PCS 必须逐组件声明 `ROLLBACK_SAFE`、`FORWARD_FIX_ONLY` 或需要 Restore/Migration 的恢复路径；禁止假设整体 Set 可以一次性回滚，也禁止为匹配旧 Set 盲目降级已经写入新格式的数据。前一个 Set 的 Manifest、Evidence 和仍在批准回退窗口内的 Artifact 必须保留可验证性。
- Desired/Effective 版本只允许落在 Current Set、Target Set 或明确的过渡步骤中；出现不属于这三者的版本、Digest、CRD 或 Feature Gate 时视为 `COMPATIBILITY_DRIFT` 并告警。紧急安全修复也不得原地篡改 Active Set，必须基于当前 Set 创建精确锁定的 Hotfix Set，执行与紧急程度相称但仍可审计的 DEV Gate 后再提升 PROD。
- PCS 属于 `GITOPS_CONFIG`，平台管理后台仅提供只读 Inventory、Compatibility、Lifecycle、Drift、EOL/Security Advisory、DEV Evidence、PROD Rollout 和 Runbook 入口；Super Admin 不能通过 `PLATFORM_POLICY` 或普通页面编辑 Set。未来替换云托管 PostgreSQL、Redis-compatible、Secret Manager、Object Storage 或拆分微服务时，创建包含新 Adapter/依赖契约的 PCS，不改变领域模型和业务 Workflow。
- 环境容量统一由不可变、版本化的 `Environment Capacity Profile` 管理。每个 Profile 记录稳定 Profile ID、Parent Profile ID、Manifest Digest、目标 Environment/Environment Class、兼容 PCS ID、变更原因和证据；DEV 与 PROD 使用同一 Typed Capacity Schema 但关联各自独立的 Profile ID。Profile 属于 `GITOPS_CONFIG`，同一 Profile ID 不得原地修改，任何扩容、缩容或阈值调整都创建新版本。
- 每个环境同时只有一个 Current Active Profile；受控变更期间可以同时声明 Target Profile 并显示 `TRANSITIONING`。Profile 使用按组件注册的 Typed Section，至少覆盖 Node Pool/故障域、Replica、CPU/Memory Request 与 Limit、Ephemeral Storage、PVC/StorageClass、连接预算、并发/Queue/Stream 容量、PDB/Topology、升级 Surge、系统预留、故障余量和容量告警阈值；禁止退化为可任意填写的 Helm Key/Value、自由 JSON 或脚本入口，也不保存 Secret、Credential 和业务数据。
- PCS 为每个组件和 Environment Class 发布不可绕过的 `Minimum Capacity Envelope` 与 Capacity Schema，约束最小 Replica/Quorum、最低 Request、最小 PVC、允许的 StorageClass/拓扑、最大安全连接或并发范围、必须保留的故障与升级余量，以及哪些字段支持在线调整、Rollout、Restart 或 Recreate。Capacity Profile 只能在当前 PCS 声明的范围内取值；未知字段、低于 Envelope 或破坏 HA/Security Floor 的组合在 GitOps Merge 与 Reconcile 前 Fail Closed，不能靠 Super Admin、Helm Override 或直接 Patch 绕过。
- 仅改变 Envelope 内的容量值通常只生成新 Capacity Profile，不创建新 PCS；改变基础设施实现、协议、Operator/CRD、分片模式、Quorum 架构、Storage Backend、Node Runtime、组件 Shape 或使用当前 PCS 未声明的容量字段时，必须先生成并验证新 PCS。Profile 必须明确绑定兼容 PCS，PCS 切换时需重新验证当前 Profile，不能假设旧 Profile 自动兼容新版本集。
- Capacity Profile 生命周期使用 `CANDIDATE → VALIDATED → ACTIVE → RETIRED`。Validation 至少执行 Schema/Envelope、PCS Binding、Kubernetes Schedulability、ResourceQuota、PDB/Topology、PVC 扩容能力、连接与队列预算、故障域丢失、滚动升级 Surge、备份/恢复空间和相关 SLO/告警阈值检查；证据与 Profile Digest 绑定，任一值变化都使旧验证失效。只有 GitOps 可以批准和应用 Profile，平台管理后台保持只读。
- 调度容量按 Kubernetes Allocatable 扣除 OS/Kubernetes Reserved、DaemonSet、日志/监控/安全 Agent 与 Storage/System Overhead 后计算；Profile 必须同时容纳稳态 Request、允许的 Rollout Surge，以及当前架构要求的最大单一故障余量。Stateful Quorum、Ceph Recovery/Backfill、Sandbox 峰值和不能共置的专用 Node Pool 分别按其故障模型校验，不能只用全 Cluster CPU/Memory 总和证明可调度。任一必需余量不足时拒绝激活，而不是依赖发生故障后临时扩容。
- Profile 激活不是跨全部 Workload 的原子事务。Reconciler 必须按依赖顺序逐组件应用并持续比较 Desired/Effective；全部目标值生效、Pod/Quorum/PVC/连接和健康 Gate 通过后才把 Target Profile 标记 `ACTIVE`。部分完成时保持 `TRANSITIONING`，失败停止后续步骤，并按字段声明执行安全回退或 Forward-fix；管理后台不得把部分应用显示成完整成功。
- PVC 默认只允许在线扩容，不把缩容写成可逆操作；Stateful Replica、Quorum、分片、连接池和 Retention 下调必须经过数据迁移/Drain、容量趋势、恢复余量和回退路径验证。HPA/VPA 只有在 PCS 的组件 Capacity Schema 明确允许时才能使用，数据库、Raft、Ceph 等已经固定为受控扩缩容的组件不得因低负载自动减配。任何自动建议都只能生成 Candidate Profile，不能直接写入 GitOps 或修改 Effective Capacity。
- 当前使用量、峰值、增长趋势、预测耗尽时间、实测 RPO/RTO、调度碎片和真实故障恢复消耗属于 `Derived/Observed`，不是 Profile Desired Value。Observability 可以基于这些数据提出带来源的扩容建议，但不能把观测结果自动回写为配置；人工批准后的新 Profile 必须保留采用或拒绝建议的原因，使 Desired 与 Observed 始终只有各自一个事实源。
- 平台管理后台必须关联显示当前 PCS、Current/Target Capacity Profile、逐组件 Desired/Effective、总量/Allocatable/Reserved/Requested/实际使用、故障和 Surge 余量、PVC/对象容量、连接/队列预算、趋势预测、Envelope 校验、`CAPACITY_DRIFT`、最近变更与 Runbook。Profile 值只能只读展示；环境间不做直接复制，DEV/PROD 的容量差异由各自 Profile 自然表达。
- 未来切换云托管服务时，Capacity Schema 可以通过对应 Infrastructure Adapter 使用实例规格、服务 Tier、IOPS、连接上限或存储配额等目标侧原生单位，不强行伪装成 Kubernetes CPU/PVC；基础设施替换仍先通过新 PCS 验证 Adapter 与兼容 Contract，再迁移到新的环境 Profile，不修改领域模块。
- 本章已经确认的 PostgreSQL、Valkey、NATS、OpenBao、Rook-Ceph、Scanner 等容量表共同构成首个 DEV/PROD Profile 的目标输入，不在其他数据库或页面复制第二份可编辑值；只有全部组件和 Node Pool 汇总值完成确认并通过上述 Validation 后，才形成可激活的首个 Capacity Profile。
- Kubernetes Node Role 固定划分为 `k8s-control-plane`、`platform-worker`、`sandbox-worker` 和 `storage-worker` 四类，DEV 与 PROD 使用相同角色分类、调度 Contract 和安全边界；各角色的 Node 数量、实例/硬件规格、Zone/Host 分布和 Allocatable 属于各环境 Capacity Profile。角色定义、允许的 Runtime/Workload 类别、Label/Taint Contract 与 Admission 约束属于 PCS；不能仅修改 Capacity Profile 创造第五种未验证角色。
- `k8s-control-plane` 只承载 Kubernetes API Server、Scheduler、Controller Manager、etcd 和维持节点可管理性所必需的受控 CNI/监控/日志/安全 DaemonSet，使用 Control Plane Taint 禁止平台业务、数据库、Agent、Sandbox 和 Ceph Workload 调度。etcd 数据、证书、备份、Quorum 与升级独立纳入 Kubernetes Control Plane 基线，不能因为节点 CPU 空闲而把它当作普通 Worker 容量。
- `platform-worker` 承载平台 Control Plane/Worker、管理前端 Backend、PostgreSQL/PgBouncer、Valkey/Sentinel、NATS、Temporal、OpenBao、Observability、Scanner 及其他可信平台 Workload。首版不再为数据库、消息或 Secret Manager 分拆专用 Node Pool；它们必须通过 Resource Request/Limit、PriorityClass、Namespace/ServiceAccount、Pod Anti-Affinity、Topology Spread、PDB 和 NetworkPolicy 隔离，且 Capacity Profile 必须证明竞争、故障与滚动升级时仍满足各组件 Envelope。
- `platform-worker` 首年节点数量采用 N+1 故障域基线：DEV 使用 4 个 Node，PROD 使用 6 个 Node，并分别映射到 4 个和 6 个可验证的真实 Host/Failure Domain。DEV 的 3 个 OpenBao Voting Server、PROD 的 5 个 Voting Server 必须分别跨不同 Node/故障域放置；额外 1 个故障域用于任意单 Node 故障、受控维护或逐节点升级后仍具备恢复完整 3/5 Server 分布的可调度位置，而不是为某个组件额外增加一个无意义 Replica。
- `platform-worker` 首年单 Node 工程容量统一为 `8 vCPU / 32 GiB RAM`：DEV 使用 4 个 Node，PROD 使用 6 个 Node。两个环境复用相同的 Node Shape 与容量 Schema，仅通过环境独立的 Capacity Profile 表达 Node 数量、系统盘和实际 Allocatable 差异；同一环境的 Node 保持同规格，避免调度、故障模拟和维护窗口被隐藏的异构容量扭曲。这些数值是首个 Environment Capacity Profile Candidate 的 Desired Input，不是 Kubernetes 官方通用最小值，也不得写死在领域模块、业务代码或安装程序中。
- 对应 Raw Capacity 为 DEV `32 vCPU / 128 GiB RAM`、PROD `48 vCPU / 192 GiB RAM`；移除任意 1 个同规格 Node 后的 Raw Capacity 分别为 `24 vCPU / 96 GiB RAM` 与 `40 vCPU / 160 GiB RAM`。Raw Capacity 不是 Kubernetes 可承诺调度容量，Capacity Profile 必须继续扣除 OS/Kubernetes Reserved、Eviction Reserve、DaemonSet、CNI/CSI、日志/监控/安全 Agent、Runtime 和其他 Node Overhead 后计算逐 Node 与 Cluster Allocatable，禁止把未扣减总量直接展示成可用余量。
- 当前已经给出明确资源数字的 DEV 固定 Pod 与已确认 Observability Node DaemonSet，稳态 Request 约为 `13.505 CPU / 28.844 GiB RAM`；移除 1 个 `platform-worker` 后，按剩余 3 个 Node 重新计算 DaemonSet仍需约 `13.335 CPU / 28.5 GiB RAM`。该数字只用于证明当前 Raw Candidate 具有继续完成 N+1 验证的基础，不包含平台 Backend、Cilium/Envoy、CSI、Operator、OpenBao Agent Sidecar、OS/Kubernetes Reserved、Job和 Rollout Surge，因此不得据此直接把 Profile标记为 `VALIDATED`或 `ACTIVE`；这些缺口必须在后续容量汇总中逐项补齐并通过真实调度验证。
- 平台自有常驻服务采用下表首发 Resource Envelope，DEV 与 PROD 使用相同 Replica、Request/Limit和 Deployment Shape；容量差异由 Node Count与环境独立 Capacity Profile表达。每个 Replica必须跨可用 `platform-worker`执行 Topology Spread，双副本服务配置 `PDB minAvailable=1`，首版不启用 HPA/VPA；实际压测需要扩容时创建新 Capacity Profile Candidate，不能在运行时静默覆盖。

  | Deployment | Replica | 单 Replica CPU Request / Limit | 单 Replica Memory Request / Limit | 单 Replica Ephemeral Storage Request / Limit |
  | --- | ---: | --- | --- | --- |
  | Platform Web | 2 | `100m / 500m` | `256 MiB / 512 MiB` | `256 MiB / 1 GiB` |
  | Python Control Plane | 2 | `500m / 2 CPU` | `1 GiB / 2 GiB` | `1 GiB / 2 GiB` |
  | Model Gateway | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` | `1 GiB / 2 GiB` |
  | Sandbox Controller | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` | `1 GiB / 2 GiB` |
  | Artifact Signer | 2 | `100m / 500m` | `256 MiB / 512 MiB` | `512 MiB / 1 GiB` |
  | PKI Publication | 2 | `50m / 250m` | `128 MiB / 256 MiB` | `256 MiB / 512 MiB` |
  | Trivy Image Scanner | 2 | `500m / 2 CPU` | `1 GiB / 4 GiB` | `10 GiB / 20 GiB` |

- 上表稳态合计 Request为 `3.5 CPU / 7.25 GiB RAM / 28 GiB Ephemeral Storage`；CPU/Memory Limit合计为 `14.5 CPU / 18.5 GiB RAM`，但 Limit只是单 Workload隔离与受控 Burst边界，不能简单相加为常驻服务器占用。Trivy每个 Replica首版最多同时执行 1个 Image Scan，超出进入持久队列；临时 Layer、SBOM和 Cache不成为权威事实，完成、失败或超时后必须清理。Agent Orchestrator就是 Temporal章节已经计入的 `Platform Orchestrator Worker`，不是第二个 Deployment；Temporal UI/Console Access Adapter、Hubble与 Observability Sidecar也继续只在各自既有 Envelope中计算，禁止重复计费。
- 每个 `platform-worker` 的首发 `Node Infrastructure Reserve`固定为 `1 CPU / 3 GiB RAM`，聚合覆盖 OS/Kubernetes Reserved、Eviction Reserve、Cilium Agent、`cilium-envoy`、CSI Node Plugin、OpenTelemetry Agent、node-exporter、Loki Canary及其他已批准的 Node DaemonSet。该值是 Capacity Accounting Envelope，不是一个虚构 Pod，也不替代各组件在 Manifest中声明真实 Request/Limit；Validation必须逐项汇总并使用 `max(聚合 Reserve, 实际 Reserved + DaemonSet Request)`，实际值超过 Envelope时拒绝激活并调整 Profile。Observability章节已经显式列出的每 Node `170m CPU / 352 MiB`属于该 Reserve的一部分，汇总时必须从增量 Reserve中扣除，不能再加第二遍。
- OpenBao Agent Sidecar首发单实例 Request为 `25m CPU / 64 MiB RAM`、Limit为 `100m CPU / 128 MiB RAM`；是否注入仍由 Secret Contract决定，不能为了节省容量关闭。每个环境首个 Profile为最多 `40`个同时运行的注入 Sidecar预留 `1 CPU / 2.5 GiB RAM` Request；这只是容量 Envelope而不是允许少注入的安全上限，实际 Desired Pod Shape超过40个时必须先增加 Profile容量并重新验证，不能拒绝必要的 Secret续期或把 Secret改放环境变量。
- 每个环境额外保留一个容量密集型受控运维 Job Slot，Request为 `1 CPU / 2 GiB RAM`、Limit为 `2 CPU / 4 GiB RAM`、Ephemeral Storage Request/Limit为 `20/40 GiB`。`trivy-data-sync`、Schema/Migration、NATS/OpenBao Backup和同类 Job必须声明各自更小或等于该 Slot的资源，并通过持久化 Lease保证同一环境最多一个占用该 Slot；小型常规 Controller Job不因此取得无界资源。
- Rollout、Temporal Worker Versioning、Stateful维护和容量密集型运维 Job由环境级 Maintenance/Capacity Lease分 Wave协调。首发共享 Headroom按当前最大已确认的 Temporal Server Wave `1.25 CPU / 2.5 GiB RAM`保留；运维 Job Slot为 `1 CPU / 2 GiB`，二者不能同时消费同一份 Headroom。已有单 Node/Replica故障、Quorum/PDB异常或实际 Headroom不足时停止新的自愿 Rollout/Job；安全紧急事件若不能等待，必须先形成包含额外容量的受控 Candidate或明确进入降级处置，不能超卖。
- 按上述 Envelope重新派生：DEV移除1个 `platform-worker`后，在恢复固定 Replica、保留40个 Sidecar预算、剩余3个 Node Infrastructure Reserve并容纳最大单一 Wave时，Candidate约需 `21.575 CPU / 48.719 GiB RAM`，低于剩余 Raw `24 CPU / 96 GiB`；PROD对应约需 `28 CPU / 63.188 GiB RAM`，低于剩余 Raw `40 CPU / 160 GiB`。这只证明聚合 Raw Envelope不再自相矛盾；Profile仍必须通过真实 Allocatable、逐 Node碎片、Anti-affinity/PDB、RWO Attach、Ephemeral Storage、实际 Manifest与故障/升级演练后才能进入 `VALIDATED`。
- `platform-worker` 首年 OS/Runtime Disk 采用环境差异化方案：DEV 每个 Node 使用 `100 GiB` 企业级 SSD，PROD 每个 Node 使用 `200 GiB` 企业级 SSD；同一环境保持同规格。该磁盘只承载 Node OS、Container Runtime Metadata/Image Cache、Container Writable Layer、kubelet Ephemeral Storage、受控 Node/Container Log 和有界临时文件，是 Environment Capacity Profile Candidate 的 Node Ephemeral Capacity Input，不是 Stateful PVC、业务 Artifact、备份或共享存储容量。
- DEV 四块系统盘的派生 Raw 总量为 `400 GiB`，PROD 六块为 `1,200 GiB（约 1.17 TiB）`，但这些容量属于各 Node 独立故障域，不构成可跨节点池化的可用空间；某个 Node 的 Disk/Inode/IOPS 余量必须独立满足调度、Image Pull、Rolling Surge、日志缓冲和最大单 Node 故障后的重调度需求，禁止用其他 Node 的空闲系统盘抵扣本节点不足，也不得把派生总量复制成第二份可编辑配置。
- PostgreSQL、Valkey、NATS、OpenBao、Scanner Signature以及 Prometheus、Alertmanager、Loki WAL、Tempo本地恢复数据和 OpenTelemetry Gateway Queue等持久化组件，必须使用各自声明的独立 RWO PVC/Data Volume和逻辑 StorageClass Contract，不得落入 Root Filesystem、Container Writable Layer、非受控 `hostPath`或未受管目录；各组件已经确认的 PVC容量继续作为 Capacity Profile输入。OpenTelemetry Node Agent为读取 Kubernetes Container Log与保存采集 Checkpoint使用经过 PCS批准的最小 HostPath例外，只能只读挂载批准的日志路径并写入专用有界 Checkpoint目录，不能读取其他 Host文件或把 HostPath用作 Backend持久存储。Temporal Frontend/History/Matching/System Worker本身保持无状态且不声明独立 PVC，其 Durable State只保存在同环境 CloudNativePG内隔离的 `temporal`/`temporal_visibility`数据库并继承 PostgreSQL Volume/Backup Contract。Rook-Ceph继续只承担已确认的 RGW Object Storage，不因系统盘容量增加而转为通用 Stateful Storage。
- 首版统一定义逻辑 StorageClass Contract `stateful-rwo-lowlatency`，作为 Stateful Workload 对低延迟、独占读写、加密、可观测、可扩容和拓扑感知 Block Storage 的稳定依赖。业务模块、Operator Values 和应用 Helm Contract 只能引用这个逻辑名称及其声明能力，不得出现 Alibaba Cloud Disk Type、ESSD SKU、CSI Driver Name、Cloud Disk ID、Region/Zone ID、RAM Role 或其他供应商私有字段。
- DEV 与 PROD 当前都把 `stateful-rwo-lowlatency` 映射到 Alibaba Cloud ESSD，并通过 Alibaba Cloud Disk CSI 完成 Dynamic Provision、Attach/Detach、Mount、Expansion 与状态上报。Logical Contract、Provider Mapping、StorageClass Manifest、CSI/Sidecar 精确版本与 Image Digest、CRD/API、Feature Gate、Kubernetes/OS/CRI 兼容矩阵、最小 RAM Permission 和已验证限制必须进入 PCS/GitOps；平台领域模块和 `PLATFORM_POLICY` 不感知或修改该映射。
- 由于当前是运行在 Alibaba Cloud ECS 上的自管 Kubernetes，而不是直接假设 ACK 已托管全部集成，ESSD CSI 只能在 DEV 通过 Provider ID、Zone Label、RAM Role/Workload Identity、API/Network、Disk Type/库存、单实例挂盘上限、Dynamic Provision、Attach/Detach/Fence、Node 故障、Expansion、Encryption、Snapshot/Restore、升级与回退验证后进入 PCS。任一准入条件失败时 Profile/PCS Fail Closed，不自动回退到 Local PV、Ceph RBD、NAS 或未加密云盘，也不能把 ACK 环境的测试结论直接当作本集群证据。
- `stateful-rwo-lowlatency` 首版固定使用 `ReadWriteOnce`、`volumeBindingMode=WaitForFirstConsumer`、`reclaimPolicy=Retain`、`allowVolumeExpansion=true` 和服务端静态数据加密（Encryption at Rest）；每个 Stateful Replica 独占一个 PVC/PV/ESSD，不共享数据盘，不启用 Multi-Attach/RWX，也不把同一云盘同时挂给两个 Node。任何未加密 Volume 都不得进入 Ready。
- 当前 Alibaba Cloud ESSD Provider Mapping 使用 KMS生成的软件保护型 `Aliyun_AES_256` Customer-managed Key，不使用默认 Service Key、BYOK、External Key/XKI或 Hardware KMS作为首版 Stateful Volume密钥。DEV和未来 PROD分别创建只属于本环境 `stateful-rwo-lowlatency` 用途的独立 CMK/Key ID与 Alias，禁止跨环境复用；Node OS/Runtime Disk、Ceph、Object/Backup或其他用途也不得复用该 Stateful CMK。Provider Key ID只存在于受控 ESSD CSI/StorageClass Provider Mapping和 GitOps Secret Reference中，业务模块、领域数据库、Frontend、Agent和普通 Helm Contract继续只引用逻辑 StorageClass。
- 每个 Stateful CMK启用 Deletion Protection，普通 RAM User/Role、Kubernetes Workload、平台 Super Admin、OpenBao和应用 ServiceAccount都无权 Disable、Schedule Deletion、关闭保护或修改 Key Policy；ECS只能通过受控 `AliyunECSDiskEncryptDefaultRole`及 Key/RAM Policy使用批准的本环境 Key执行云盘信封加密。账号/Region同时启用 EBS默认加密和防止创建未加密 Disk的 RAM/Control Policy；CSI请求未声明 Encryption、解析到错误环境 Key、Key不可用或 Provider返回未加密结果时 Provision/Ready Gate Fail Closed。
- Disable或删除 CMK会使仍依赖它的 Disk、Snapshot和 Image不可用，因而常规运维禁止该操作。只有 Dependency Inventory证明不存在任何 Live/Retained/Orphan/Backup/Restore/Investigation引用，完成 Snapshot/Restore与数据迁移验证、两人基础设施变更评审、GitOps/Audit和最终 Provider资源复核后，才能先解除 Deletion Protection并进入至少 90 天 Scheduled Deletion；调度删除前不得仍有业务依赖，因为 Pending Deletion本身可能使 Key不可用于解密。平台管理后台只读展示 Key Alias/ID摘要、Environment/Purpose、Enabled/Deletion Protection、关联资源数、Rotation/Drift、ActionTrail/Audit与 Runbook，不提供 Key写操作或 Key Material。
- ECS为每块 Cloud Disk创建独立 Data Key，CMK保护该 Data Key；CMK版本轮换不会重新生成或替换既有 Disk已经使用的 Data Key。周期轮换可以影响后续 Key Operation/新资源，但不得被宣传为已对存量云盘完成 Re-encryption；已有 Volume若需要真正换 CMK，必须通过加密 Snapshot/Copy、新 Key创建新 Volume、应用一致性/Checksum验证、受控 Attach/Cutover和回退窗口迁移，不能原地修改 StorageClass或 Key ID。只要任一 Disk、Snapshot或 Image仍引用旧 Key/Version，相关解密材料就必须保持可用。
- Encrypted Snapshot默认继承源 Disk的加密关系，跨 Region、跨账号、Provider迁移或未来 PROD恢复必须显式验证目标 KMS Key、RAM授权、Snapshot Copy/Re-encryption、CSI行为与恢复数据完整性，不能假设复制对象即自动迁移密钥。该 Alibaba KMS CMK只属于 Block Storage Provider Mapping，不能被平台业务调用，也不自动成为 OpenBao Auto-unseal信任根；OpenBao继续使用已确认的环境独立 Shamir Seal，未来 Auto-unseal必须使用独立 Key/Policy和新的 Seal Provider PCS。
- `WaitForFirstConsumer` 必须让 Scheduler 先综合 Pod Resource、Taint/Toleration、Anti-Affinity、Topology Spread、PDB 与可用 Zone，再在兼容 Topology 中创建 Volume，避免 PVC 先落到 Pod 无法运行的 Zone。Standard Zonal ESSD 只能在兼容 Zone 内 Attach；在 Regional/Zone-redundant ESSD 尚未通过本集群 PCS 验证前，不宣称单卷能够跨 Zone 漂移，应用级 Replica、Quorum、Backup 与 Member Replace 继续承担 Zone/Volume 故障恢复。
- Node 故障后的云盘重挂必须先证明旧 Node/旧 Pod 已停止写入并完成安全 Detach/Fence，再允许新 Node Attach；Attach 状态不确定、旧 Node 可能仍在写、CSI/Cloud API 失联或 Volume Health 不明时必须 Fail Closed，禁止 Force Attach、双写或通过 Multi-Attach 绕过。若云盘自身不可用，优先由仍健康的应用 Replica 在新独立 Volume 上受控重建 Member；不能满足 Quorum/数据完整性时使用已经确认的应用级 Backup/Restore Runbook。
- `reclaimPolicy=Retain` 表示删除 PVC 不会自动销毁真实 ESSD，并不表示云盘永久无人治理。Released/Orphan PV 与 Cloud Disk 必须进入 Reconciliation、容量和费用告警；只有在精确验证无 Pod/PVC/Member/Backup/Restore/Retention/Investigation 引用，并完成受控运维审批、Audit 和 Provider 侧对象核对后才可销毁。平台管理 UI/API 不提供 PVC/PV/Cloud Disk 创建、删除、扩容、重挂、Snapshot 或 Reclaim 写入口。
- CSI Volume Snapshot 只能作为经组件验证的维护辅助检查点，不能替代 PostgreSQL PITR/Barman、NATS Account Backup、OpenBao Raft Snapshot 或其他应用一致性备份；禁止把 Crash-consistent Block Snapshot 自动宣称为可恢复的跨副本应用备份。Snapshot、Clone、Expansion 和 Restore 必须分别声明支持矩阵、Quiesce/Consistency、容量、加密、Retention 与恢复演练证据。
- `stateful-rwo-lowlatency` 的 Provider Mapping 只决定新建 Volume 使用的实现，修改映射不会也不得静默改变既有 PV。未来迁移到其他 Cloud Block Storage、Local PV/LVM 或独立 Storage Backend 时，必须通过新 PCS、Target Capacity Profile、双写/复制或 Backup/Restore、Checksum/一致性验证、逐组件 Cutover 与回退窗口迁移数据；完成后再 Retirement 旧 Volume，领域模型和业务 Workflow 保持不变。
- 平台管理后台必须在当前环境只读展示逻辑 StorageClass、Desired/Effective Provider Mapping、CSI/Sidecar Version/Digest、Compatibility/Validation、逐 PVC/PV/Cloud Disk 的组件/Replica Owner、Capacity/Usage、StorageClass、Zone/Node、Encryption、Attach/Mount/Health、IOPS/Throughput/Latency、Expansion、Snapshot/Backup 关联、Reclaim/Orphan/费用状态、Drift、故障与 Runbook。Cloud Credential、Encryption Key Material 和敏感 Provider Token 永不展示；DEV 只显示 DEV Volume，PROD 只显示 PROD Volume，所有写操作继续只允许受控 GitOps/运维流程执行。
- Node Image 与 GitOps 必须能够从空白 OS/Runtime Disk 重建 `platform-worker`；系统盘不保存任何只能从本节点恢复的业务事实、长期 Secret、OpenBao Share、数据库唯一副本或权威 Audit。Node 替换前只需安全停止/迁移 Workload、处理仍引用本节点的受控临时数据并撤销 Node Identity，随后按既定 Reprovision/Replace Gate 重建；禁止把整盘克隆或复制 Runtime Directory 当作 Stateful 恢复方法。
- 每个 Workload 必须声明 `ephemeral-storage` Request/Limit，Scanner、Backup/Restore/Migration、Image Build 或其他临时 I/O Workload 还必须声明临时空间上限和清理语义；未声明或可能无界增长的 Workload 不得进入 Active Profile。Image/Log/Temporary Cleanup 只能清理可再生且满足 Retention 的对象，不得删除 PVC、Artifact、备份、Audit、证据或正在使用的 Container Layer 来伪造恢复。
- Disk/Inode/IOPS/Latency、Image Filesystem 与 Node Filesystem 的 Eviction/Image GC/Log Rotation 阈值属于版本化 GitOps/Capacity Schema，并必须在 DEV 经过 DiskPressure、Image Pull、日志突增、重启和逐节点升级验证。达到受控阈值时先告警并阻止新增高风险调度，随后按 kubelet Eviction 与 Node Repair Runbook 处置；不得等待 Root Filesystem 写满，也不得通过临时调高阈值、关闭告警或删除受保护数据继续运行。
- 当前已确认的 PostgreSQL/PgBouncer、Valkey/Sentinel、NATS、Temporal、OpenBao/Injector、Scanner、Observability与平台自有 Deployment Request只是容量汇总输入；在实际 Manifest、Ingress/Gateway、全部 Operator、OpenBao Sidecar实际数量、Backup/Restore/Migration Job、Rollout Surge、DaemonSet、Reserved和逐 Node调度完成验证前，DEV/PROD的 `8 vCPU / 32 GiB` Node规格仍只能标记为 Candidate，不能宣称首个 Capacity Profile已可激活。验证失败时通过新 Candidate Profile调整规格或 Node数，不修改业务模块。
- CPU 可以在 PCS 允许的范围内基于 Request 进行受控 Overcommit，但 Capacity Validation 仍必须覆盖已批准的 Burst、Throttle 和延迟 SLO；RAM 在全节点关闭 Swap 的前提下不得依赖 Overcommit 掩盖容量不足，必须同时校验 Request、核心 Workload 的 Limit/Working Set、Eviction、OOM、单 Node 故障与 Surge。任何通过降低 Request 伪造可调度、让 Stateful 核心组件进入不受控 Burstable，或假设所有 Limit 永不同时出现的配置都不得通过验证。
- N+1 Node 可以在稳态承载符合 `platform-worker` Contract 的其他 Workload，但不能被填满后再把它称作故障余量。Capacity Validation 必须模拟移除资源容量最大的任意 1 个 `platform-worker`，在扣除 OS/Kubernetes Reserved、DaemonSet、Storage/Runtime Overhead 和不可迁移约束后，证明剩余 Node 仍可承载所需稳态 Request、Quorum、PDB/Topology、必要 Rollout Surge、核心服务优先级和恢复完整副本分布所需余量；不满足时拒绝激活 Profile。
- 单个 `platform-worker` 故障后，已有 Quorum 组件按自身故障切换语义继续服务，并在剩余故障域中受控恢复目标 Replica；额外 Node 只提供故障域和算力位置，不承诺 Local PV、RWO PVC 或有状态 Member 可以无条件瞬时漂移。实际恢复必须遵循对应 CSI/Local PV、Detach/Attach、Member Replace、Data Catch-up 与健康 Gate；无法安全迁移的 Workload 保持降级并告警，不能复制旧数据目录、绕过 Quorum 或把 Pod Running 误报为数据已经追平。
- `platform-worker` 自愿维护、Drain、Reimage、升级和规格替换一次最多影响 1 个 Node；已有任意 Node/故障域不可用、关键组件未恢复目标 Replica、PDB/Quorum 不健康或 N+1 余量不足时，禁止开始下一项自愿中断。当前 4/6 Node 都处于同一站点边界，因此提供 Cluster HA 与维护余量，不宣称 Site DR。
- DEV 4 Node、PROD 6 Node 是首个 Environment Capacity Profile 的 Desired Node Count，不写死在领域模块或业务代码中；在保持当前 PCS Node Role Contract 和 Minimum Capacity Envelope 的前提下，后续扩容通过新 Capacity Profile 增加 Node。缩减到低于 4/6 会破坏当前 N+1 基线并被 Validation 拒绝；未来若云托管服务或新 PCS 改变 OpenBao/Stateful 拓扑，必须基于新故障模型重新验证，而不能直接沿用或临时绕过当前数量。
- `platform-worker` 垂直扩容或规格替换必须通过新 Capacity Profile 和受控 Reprovision/Replace 流程逐 Node 执行，沿用一次最多影响 1 个 Node、恢复健康后再继续的 Gate；不得在原 Profile 内静默修改 VM/Host 规格，也不得同时替换整个 Pool。规格变化后的 Effective Allocatable、CPU/Memory 性能、NUMA/虚拟化差异和 Stateful/Scanner 基准必须重新验证，回退同样使用受控节点替换而非假设原地缩容安全。
- 平台管理后台必须在当前环境只读展示 `platform-worker` Desired/Effective Node Count 与单 Node CPU/RAM/OS Disk、Raw/Allocatable/Reserved/Requested/Limits/Working Set/Available、Filesystem/Inode/Image/Log/Ephemeral Storage/IOPS/Latency、DiskPressure/Eviction/Image GC、逐 Node Ready/Unreachable/Cordoned 状态、真实故障域、最大单 Node 故障前后容量、N+1 Headroom、PDB/Topology/Quorum、待恢复 Replica、PVC/Member 迁移阻塞、Candidate Validation、当前维护与关联 Alert/Audit/Runbook。页面和管理端 API 均不得新增/删除 Node、Drain、清理磁盘、修改规格/阈值或调整 Profile；DEV 只显示自身 4 Node × 8/32/100 GiB 基线，PROD 只显示自身 6 Node × 8/32/200 GiB 基线。
- `sandbox-worker` 只承载通过 Sandbox Controller 创建的 Agent/Sandbox Execution Pod 以及该节点正常工作所必需的 Node Agent，固定使用独立 Taint、Node Affinity 和已验证的 Kata RuntimeClass。平台服务、Stateful 数据组件、OpenBao、Ceph 和普通运维 Pod 不得容忍该 Taint；Sandbox 不获得 PostgreSQL、NATS、OpenBao 或 Kubernetes 管理身份，网络与 Secret 继续执行既定最小授权和 Egress Allowlist。
- DEV与PROD的首个`sandbox-worker` Capacity Candidate都固定为`2`个KVM-capable Node，并分别落在本环境Deployment Set内两个可验证的独立物理Host。架构不变量是：社区Kata + QEMU/KVM、两个独立Host，以及移除任意一个Node后仍可承载DEV `5 Units`或PROD `8 Units`的全部获准组合与Runtime Overhead；具体云实例家族和CPU/RAM不是领域模型常量。Region/Zone未选定时，Alibaba Cloud Fallback Candidate使用每Node `64 vCPU / 192 GiB RAM`的EBM保守参考规格；该规格不是跨Provider硬下限，也不代表阿里云所有Region的最小可购SKU。目标Region/Zone若存在官方正式开放、可购且通过PCS的较小Nested-Virtualization ECS，可以通过新的Compute Provider Mapping与Capacity Profile替换EBM，不改变Node Count、Kata、安全、磁盘或N+1 Contract；未通过时继续使用EBM Fallback，禁止回退到不支持KVM的普通ECS或runc。
- 在当前EBM Fallback Mapping下，每个环境的Sandbox派生Raw Compute为`128 vCPU / 384 GiB RAM`，移除任意1个Node后仍为`64 vCPU / 192 GiB RAM`；采用其他已验证Mapping时必须按Effective SKU重新派生，不能继续展示这组数字。两节点不是Active/Standby：正常情况下都承载Sandbox Materialization；Pod级Topology Spread保持Materialization Count `maxSkew=1`，Controller还必须按不可拆分的Profile Unit Weight选择可实现的最小Unit Skew。全为`standard-v1`且满载时，DEV 5个Agent的目标分布为`3+2`，PROD 8个为`4+4`；存在1个Build且满载时，DEV的`2-Unit Build + 3 Agents`应形成`3 Units + 2 Units`，PROD的`2-Unit Build + 6 Agents`应形成`4 Units + 4 Units`。单节点故障并完成Fence后，剩余Node必须能够承载本环境全部DEV `5 Units`、PROD `8 Units`及当前获准组合的Materialization。按四类Node Role汇总，首发环境总Node Count相应为DEV `12`、PROD `15`；当前只部署DEV的12个Node，未来PROD的15个Node独立创建，不共享任何运行实例。
- 已确认的Sandbox磁盘职责与隔离结构保持不变：每个`sandbox-worker`使用独立`100 GiB` OS Disk；DEV每个Node使用`500 GiB` Runtime/Ephemeral Disk，PROD每个Node使用`800 GiB` Runtime/Ephemeral Disk。两个Disk必须是独立加密Block Device而不是同盘Partition；DEV Runtime Raw合计为`1,000 GiB`，PROD为`1,600 GiB`，但它们按Node独立故障域管理，不能池化或跨Node抵扣。
- OS Disk只承载受控 Node OS、Bootstrap、系统服务和必须落在根文件系统的最小 Node Agent状态；Container Runtime Metadata/Image、Container Writable Layer、kubelet Pod/Volume/Log、Sandbox Repository/Dependency/Build/Test临时数据必须落在独立 Runtime/Ephemeral Disk。OS Disk必须能从锁定版本/Digest的 Node Image与 GitOps重建，不保存唯一 Node Identity、长期 Secret、业务事实或只能从本机恢复的数据。OS Disk与 Runtime Disk各自设置 Filesystem/Inode/Reserved Space、IOPS/Latency、Pressure/Eviction和告警边界，Runtime写满不得直接占满根文件系统，OS盘空闲也不能被计算为 Sandbox Ephemeral Capacity。
- 两个 Disk都必须启用 Provider侧 Encryption at Rest，并由 Node Provisioning/PCS验证 Disk Identity、Role、Size、Type、Encryption、Zone、Attach、Filesystem、Mount与性能基线后才允许 kubelet加入可调度池。当前 Provider Mapping使用 Alibaba Cloud加密企业级 Cloud Disk/ESSD；逻辑 Disk Role、Mount Contract和 Capacity Schema不依赖 Alibaba私有 ID/SKU，未来替换其他云 Block Storage时通过新 Provider Mapping、PCS与 Capacity Profile独立验证，Agent/Workflow不改变。
- Runtime/Ephemeral Disk是 Node Infrastructure，不是 PVC、PV、`stateful-rwo-lowlatency` StorageClass、Artifact Store或可供业务声明的 `hostPath`。它只服务当前 Node的 Sandbox Ephemeral Workload；Agent、Sandbox内进程、用户 Manifest和普通 Helm Chart不得发现裸 Block Device、挂载任意 Host Path、重新格式化、创建 Snapshot、修改 Mount或绕过 `ephemeral-storage` ResourceQuota/Limit。
- Runtime Disk上的数据没有 Backup、Replication、Versioning、Object Lock或跨 Node Attach恢复承诺。Node故障、Reimage或 Identity Replace时不得把旧 Runtime Directory当作恢复源，也不得把未验证的旧 Runtime Disk直接挂到新 Node Identity；需要保留的 Git Commit、Artifact、Checkpoint、日志和 Audit必须先进入各自权威存储。旧 Disk只有在 Node/Attempt/Lease已 Fence、调查保留需求已处理并完成受控清理/销毁审计后才能 Release，平台管理 UI/API不提供 Attach、Detach、Snapshot、Format、Wipe或 Release写入口。
- 每个环境的单 Node Runtime Disk都按“剩余一个 Node时承载完整 Unit Ceiling任意批准组合”的最坏故障 Envelope设计：DEV `500 GiB = 250 GiB Execution Envelope + 150 GiB Runtime Operational Budget + 100 GiB Emergency/Eviction Reserve`；PROD `800 GiB = 400 GiB Execution Envelope + 240 GiB Runtime Operational Budget + 160 GiB Emergency/Eviction Reserve`。三段只是同一 XFS上的 Capacity Accounting/Admission Envelope，不是 Partition、LVM Logical Volume、Subvolume、目录硬配额或三个独立 Filesystem，也不产生业务可声明的 StorageClass、Volume或 Host Path。
- Execution Envelope分别覆盖 DEV `5 Capacity Units`与 PROD `8 Capacity Units`的任意已批准组合。由于 `standard-v1`每 Unit的 Ephemeral Request/Limit为 `30/50 GiB`，`image-build-v1`固定为其2倍，满 Unit Ceiling时任何组合的聚合 Request/Limit都分别为 DEV `150/250 GiB`、PROD `240/400 GiB`；全 Agent的 `5/8 × 50 GiB`与1个 Build加 `3/6`个 Agent得到相同上界。Runtime Operational Budget共同承载 Container Image Cache、kubelet/Container Runtime State、Kata Temporary Data、Node/Container Log、GC/Staging和其他已声明 Node Overhead，不保证任一目录独占固定容量。它不因执行向量按 Unit线性就自动视为线性：PCS必须分别验证全 Agent，以及1个 Build加 `3/6`个 Agent在单 Node故障、Image Pull、Build Cache/Layer/Staging、日志峰值与 GC下的 Node级 Working Set；实际 XFS格式化差异或任一场景无法落入预算时，必须增大 Disk或优化可再生缓存，不能挪用 Reserve、降低 Sandbox Limit或把数据迁到 OS Disk。
- Emergency/Eviction Reserve固定为 Nominal Raw的 `20%`，即 DEV `100 GiB`、PROD `160 GiB`，不计入 Sandbox Allocatable，也不得用于新 Lease、Image Prefetch、普通缓存增长或提高用户额度。它只为突发写入、GC、日志收尾、Attempt Finalization、受控 Eviction与 Node Repair保留停止和恢复空间；实际 Available触及 Reserve/Pressure Gate时立即停止本 Node的新 Lease Admission并产生 `SANDBOX_DISK_PRESSURE`，已有 Attempt仍受绑定 Limit、kubelet Eviction与安全终止规则约束。
- Runtime Filesystem沿用百分比一致、绝对容量按环境派生的四级水位：

  | Gate | DEV 500 GiB | PROD 800 GiB | 行为 |
  | --- | ---: | ---: | --- |
  | Image GC High / Low | Used `300 / 250 GiB` | Used `480 / 400 GiB` | `60%`开始清理未使用 Image，回落到 `50%` |
  | New Lease Block / Recover | Available `150 / 175 GiB` | Available `240 / 280 GiB` | 低于 `30%`阻止，恢复到 `35%`并稳定后开放 |
  | Soft Eviction | Available `<100 GiB` | Available `<160 GiB` | 低于 `20%`且持续2分钟 |
  | Hard Eviction | Available `<50 GiB` | Available `<80 GiB` | 低于 `10%`立即执行 |

- Image GC只能删除 Container Runtime确认未被 Running/Provisioning Pod使用且满足最小年龄的可再生 Image，不得删除 Active Layer、Writable Layer、Repository、Artifact、Checkpoint、Audit、受保留日志或业务事实。GC无法回落到 Low Watermark时继续进入 Admission/Pressure流程，不能循环删除受保护数据或把失败伪装为恢复。
- 新 Lease Admission还在 Inodes Free低于 `15%`、存在 `DiskPressure`/Filesystem Health Drift，或按待调度 Profile的完整 Ephemeral Limit投影后会侵入本环境最低 Reserve时 Fail Closed；当前 `standard-v1`投影 `50 GiB`，`image-build-v1`投影 `100 GiB`，不得统一按较小值估算。对应执行保持在持久 `QUEUED`并记录结构化 Block Reason。只有 Available恢复到 `35%`、Inodes Free至少 `20%`、Working Set回到预算内、`DiskPressure`解除且连续稳定 `5分钟`后才重新接纳。Soft Eviction同时在 Inodes Free低于 `10%`并持续 `2分钟`时触发，`evictionMaxPodGracePeriod=60秒`；Hard Eviction同时在 Inodes Free低于 `5%`时立即触发。全部 Memory、Filesystem与 Inode Signal及 Default Merge语义必须由目标 kubelet版本验证，不能因自定义一个 Signal意外清零其他防线。
- 上述 `60/50`、`30/15`、`35/20/5分钟`、`20/10/2分钟/60秒`和 `10/5`水位属于版本化 GitOps/Capacity Schema，不是平台后台动态配置。平台管理后台只读显示每个 Node的 Desired/Effective Threshold、当前 Used/Available/Inode、GC/Reclaim、Admission Block/Recovery Stability、Soft/Hard Eviction、受影响 Attempt、Drift、Alert、Audit与 Runbook，不提供临时放宽、关闭或手工驱逐入口。
- 每块 Runtime/Ephemeral Disk统一格式化为一个 XFS Filesystem，整盘作为一个 Kubernetes Local Ephemeral Storage Failure/Capacity Domain；盘内不使用 LVM、额外 Partition、固定大小 Subvolume或按用途硬切容量。Container Image Cache、Writable Layer、Disk-backed `emptyDir`、Pod/Container Log、Repository Checkout、Dependency Cache、Build/Test Scratch和 Kata Temporary Data只做目录与所有权逻辑隔离，共享 Filesystem的可用空间、Inode、IOPS与 Pressure边界。
- Node Image、kubelet、Container Runtime与 Kata必须采用并验证 Kubernetes支持的 Single-filesystem Local Ephemeral Storage Layout；Mount Point、kubelet Root/Log Directory、Container Runtime Root/State、Observed `nodefs`/`imagefs`/`containerfs` Mapping和 Filesystem Device Identity由 PCS/GitOps锁定。不得在 kubelet、Pod Log或 Container Runtime目录下追加会使 kubelet漏算 Usage的未声明 Mount；DEV Accounting/Eviction Conformance未通过时 Node Fail Closed。
- 每个 Sandbox Materialization的全部 Container必须声明 `ephemeral-storage` Request/Limit，每个 Disk-backed `emptyDir`必须声明 `sizeLimit`；Sandbox Controller以 Agent Execution Binding或 Build Execution Binding解析出的精确 Resource Profile聚合值校验生成结果。首版继续使用 kubelet稳定目录扫描路径，不启用 `LocalStorageCapacityIsolationFSQuotaMonitoring`/XFS Project Quota；未来切换计量实现必须创建新 PCS并验证，不能替代 ResourceQuota、Admission、Image GC或 Eviction。
- 满DEV `5 Units`或PROD `8 Units`时，任意已批准Agent/Build组合的执行负载Request/Limit均分别为DEV `10/20 vCPU`、`30/40 GiB RAM`、`150/250 GiB Ephemeral Storage`，PROD `16/32 vCPU`、`48/64 GiB RAM`、`240/400 GiB Ephemeral Storage`。每个活动Materialization，无论普通Agent还是Image Build，另保留最高`500m CPU / 1 GiB RAM`的Kata `PodOverhead`与受信Sidecar Request Envelope，并为每个`sandbox-worker`保留`4 CPU / 16 GiB RAM` Node Infrastructure Reserve；实际RuntimeClass `overhead.podFixed`和Sidecar Request必须按Profile/目标Kata Artifact实测并进入PCS，任一Profile超过Envelope时调整Candidate，不能压低声明或从用户Execution Budget偷扣。全Agent组合产生最多Materialization，因此也是该Overhead的保守上界。
- 在单Node故障后的最坏密度下，按全Agent的最大Materialization Overhead计算，剩余Node的Candidate Request上界约为DEV `16.5 CPU / 51 GiB RAM`、PROD `24 CPU / 72 GiB RAM`，执行负载Limit分别为`20 CPU / 40 GiB`与`32 CPU / 64 GiB`。当前EBM Fallback的单Node参考规格`64 CPU / 192 GiB RAM`具有明显余量；任何较小替代Mapping都必须以实际Allocatable重新证明上述Request、Limit、Kata/Sidecar/DaemonSet Overhead、全部5/8 Units组合、启动峰值和Soak，而不能只比较名义vCPU/RAM。因为Build的执行向量严格等于2 Units且一个Build只产生1个Materialization，该上界覆盖当前任意获准混合；但算术证明不能替代真实Kata启动、Build/Test、CPU Throttle、Memory Peak、MTU、I/O和长时间Soak验证。
- Sandbox Controller必须按两个真实Host执行Pod级Topology Spread `maxSkew=1`，并在Admission/Placement中额外校验按Profile Weight计算的Unit分布，选择不可拆分条件下的最小可实现Unit Skew；全Agent满载时目标才是DEV `3+2`、PROD `4+4`。单Node故障后允许经Fence把全部DEV `5 Units`、PROD `8 Units`对应的当前Materialization调度到剩余KVM-capable Node；不能为保持低Skew而调度到`platform-worker`、`storage-worker`或Control Plane。
- N+1只保证一个`sandbox-worker`/物理Host不可用后仍有受验证的调度容量，不保证故障Node上的进程、内存态或本地Ephemeral Storage无中断迁移。受影响Agent Attempt或Build Execution必须分别通过Node/Pod/Fenced Lease Reconciliation防止旧执行继续产生副作用，再按各自Checkpoint、Git Commit、Artifact和瞬时基础设施重试语义受控恢复或进入结构化失败；Build在同一Child Execution内有界重试期间Parent保持`WAITING_CHILD`，只有Child形成安全终态才可唤醒。禁止复制未知一致性的Runtime Directory、复用旧Secret Lease、在旧Builder未Fence时启动第二份Build或并发恢复Parent。
- `sandbox-worker`自愿维护、Drain、Reimage、Runtime/Kernel升级和规格替换一次最多影响1个Node。已有任一`sandbox-worker`不可用、Active Lease无法安全停止、故障后DEV `5 Units`/PROD `8 Units`容量目标尚未恢复、实时Capacity Ceiling低于Policy Limit或新Candidate未验证时，禁止开始下一项自愿中断；维护期间可以暂停新Lease Admission，但不得伪造可用容量或强制取消无关执行。
- 任何Provider规格扩容或替换都必须创建新Capacity Profile，并通过Reprovision/Replace逐Node执行；EBM通常不能原地调整Instance Type只是当前Provider特性，不进入通用Sandbox Contract。Deployment Set对实例族的支持、Region/Zone库存、购买配额、Host Placement与替换余量属于Provisioning Gate；价格进入独立TCO Snapshot，不进入PCS Digest。Node Count低于2会破坏当前N+1并被拒绝；未来增加Node或更换其他KVM Provider只改变Provider Mapping与Capacity Profile，不修改Requirement、Attempt、Workflow、Agent或Sandbox Port。
- 平台管理后台必须在当前环境只读展示`sandbox-worker` Desired/Effective Node Count `2`、KVM/Runtime Gate、精确KVM Compute Provider Mapping、单Node CPU/RAM/OS/Runtime Disk、Raw/Allocatable/Reserved/Requested/Limits/Working Set/Available、逐Node Active Agent/Build Lease与Unit Weight、全Agent满载时的`3+2`/`4+4`参考分布、当前Materialization及加权Unit的实际Distribution/Skew、Kata/Sidecar/DaemonSet Overhead、Filesystem/Inode/IOPS/Latency、单Node故障前后DEV `5 Units`/PROD `8 Units`容量、Drain/Maintenance、Candidate Validation、库存/配额、TCO Snapshot引用、Drift、Alert、Audit和Runbook。页面与API不得创建/删除/Drain Node、修改规格/磁盘/阈值、移动执行或调整Capacity Profile；DEV和PROD分别只显示本环境事实。
- `storage-worker` 只承载 Rook-Ceph OSD/MON/MGR/RGW/Operator 允许落置的组件及 Kubernetes 必需的 CNI、监控、日志和安全 Node Agent，沿用专用 Taint、Raw Device、10 Gbps、故障域与禁止普通 Workload 共置的既定规则。Ceph 节点的剩余 CPU/Memory 或磁盘空间不得被 Profile 统计为 `platform-worker` 或 `sandbox-worker` 可调度余量。
- DEV 与 PROD 的全部 Linux Node，包括 `k8s-control-plane`、`platform-worker`、`sandbox-worker` 和 `storage-worker`，统一不配置可用的 OS Swap Partition/Swap File；重启后也不得由 `/etc/fstab`、systemd、Cloud-init 或其他 Provisioning 流程重新启用。Node OS/kubelet Contract 保持无 Swap 基线，不启用 `LimitedSwap`，也不得通过 `failSwapOn: false` 容忍节点存在未受控 Swap；该约束属于 PCS，而不是可由平台页面修改的 `PLATFORM_POLICY` 或普通 Capacity 参数。
- Node Bootstrap、Join、Reprovision 和持续 Conformance 必须验证实际 Swap Capacity/Usage 为 0；任何角色出现 Swap 时统一标记 `NODE_SWAP_DRIFT`，新节点不得加入可调度池，已加入节点停止后续滚动维护并进入 Cordon/Drain/修复 Runbook，不得直接忽略或仅关闭告警。
- 关闭 Swap 不等于忽略内存不足。每类 Node 的 Capacity Profile 必须显式扣除 OS/Kubernetes Reserved、DaemonSet 与 Runtime Overhead，并配置 Workload Request/Limit、PriorityClass、QoS、Memory Pressure/Eviction 阈值、单节点故障余量和告警；内存不足时通过受控回收、按优先级 Eviction、OOM 与扩容处理，禁止把磁盘虚拟内存当作未申报容量。`platform-worker` 上的 Stateful/核心组件必须获得高于普通平台 Workload 的资源与优先级保护，不能依赖 Swap 维持 Quorum 或掩盖容量竞争。
- `sandbox-worker` 上的 Sandbox 只能使用 Attempt/Execution Binding 获得的有界 RAM；超过 Limit 而被终止时，Agent Run 必须记录 `RESOURCE_EXHAUSTED`、`OOMKilled`、节点与容量证据，并按既定可重试边界由用户或 Orchestrator 创建新 Attempt，禁止在原 Attempt 中无限重启或借 Host Swap 继续执行。`storage-worker` 继续执行已确认的 Ceph 无 Swap 约束，Memory Pressure、OSD/MON/MGR Eviction 或 OOM 必须按 Storage Health Incident 告警，不能作为正常降级。
- 平台管理后台必须在当前环境的 Node/Capacity/Incident 只读视图中展示全部相关事实：逐节点 Role、Swap Desired/Effective 与实际 Capacity/Usage，Memory Total/Allocatable/Reserved/Requested/Limits/Working Set/Available，Memory Pressure、Eviction Threshold/Event、OOM/OOMKilled、Sandbox `RESOURCE_EXHAUSTED`、Stateful/核心组件余量、`NODE_SWAP_DRIFT`、最近 Conformance、关联 Alert/Audit 与 Runbook。数据分别来自 PCS、Capacity Profile、Kubernetes/Node Metrics、Agent Run 与 Audit 等权威来源，页面不得复制形成第二份可编辑值；管理端 UI 和 API 均不得提供 `swapon`、Swap Mode、Reserved/Threshold、Node 配置、Cordon/Drain、例外开关或其他底层写操作，DEV 只显示 DEV，PROD 只显示 PROD。
- 未来若某类特殊 Workload 确有 Swap 需求，不能在现有 PCS 或单个 Node 上临时开启；必须创建包含 Node OS、kubelet/CRI、Scheduling、Security、Encryption、I/O Isolation、Observability 和 Failure Semantics 的新 PCS，在 DEV 完成压力与故障验证后再决定是否引入新的受控 Node Role。不得用 Capacity Profile 或 Super Admin 配置绕过当前全节点无 Swap Contract。
- Node Label、Taint、Toleration、Node Affinity、RuntimeClass 和允许的 Namespace/ServiceAccount 组合必须由 GitOps 与 Admission Policy 校验。普通业务 Manifest、用户输入、Agent、Sandbox 内进程和未经批准的 Helm Chart 不得自行设置 `nodeName`、角色 Toleration、特权 Runtime 或跨角色 Affinity；发现不符合角色 Contract 的 Pod 或 Node 时标记 `NODE_PLACEMENT_DRIFT`，阻止新调度并进入告警与处置流程。
- Pod Anti-Affinity 只有在 Node 背后属于不同真实 Host/Zone/Failure Domain 时才算满足 HA；同一物理 Host 上创建多个 VM/Node 不能伪装成多个故障域。Capacity Profile 必须记录可验证的 Topology Label 与底层故障域映射，并分别校验 Control Plane Quorum、各 Stateful Quorum、Sandbox 可用容量和 Ceph Host Failure，不能用跨角色闲置容量抵扣某一角色的故障余量。
- DEV 与 PROD 复用同一个 Single-Zone 基础设施拓扑模板与 Alibaba Cloud Provider Mapping，并在各自 Cluster 独立实例化；每个环境拥有自己的 Zone、ECS Deployment Set、Node、ESSD 与故障域事实，运行资源不跨环境共享。该边界只承诺同一 Zone 内的 Cluster HA 和单物理宿主机故障容忍，不宣称 Availability Zone DR 或 Site DR；未来扩展为 Multi-Zone 必须创建新的 PCS、Environment Capacity Profile、Storage Topology 与恢复验证，不能把本条静默改成跨 Zone 调度。
- 每个环境当前必须创建一个独立 ECS Deployment Set，并使用 `High Availability` Strategy、`host` Deployment Type 与 `Affinity=1`。该环境当前 Capacity Profile 中的全部 `k8s-control-plane`、`platform-worker`、`sandbox-worker` 和 `storage-worker` ECS Node 都必须属于这个 Deployment Set，使当前每个 Kubernetes Node 对应一个互不共置的物理 Host 故障域；禁止使用 `Low Latency`、提高 Affinity 允许共置，或把不同 Node Pool 拆进彼此无法证明 Host 隔离的多个 Deployment Set 后仍宣称满足同一 HA 基线。
- Deployment Set 是 Alibaba Cloud Provider Placement Mapping，不是领域模块或业务 Workflow 配置。Deployment Set ID、Region/Zone、Strategy、Type、Affinity、支持的 ECS Instance Family、当前 Provider 实例数量上限和 Placement Capacity 必须进入 PCS/GitOps 与 Capacity Validation；应用 Manifest 只消费经过验证的 Kubernetes Topology Contract，不出现 Provider ID，也不能由 `PLATFORM_POLICY`、Super Admin 页面或普通 Helm Value 修改。
- Node Bootstrap、Join、Reprovision、规格替换和持续 Conformance 必须通过 Alibaba Cloud API/可信 Provider Metadata 验证 ECS Instance、Deployment Set Membership、Strategy/Type/Affinity、Region/Zone 与 Node Identity 的一一对应。未加入目标 Deployment Set、Provider 状态不可验证、实例类型不支持、独立 Host 容量不足或 Desired/Effective Placement 不一致时 Fail Closed：新 Node 不得加入可调度池，既有 Drift Node 不计入 Quorum、N+1 或故障域余量，并进入 Cordon/Replace Runbook；不得退化为普通 ECS 放置或仅依赖人工填写 Label。
- 在上述 Provider Attestation 有效时，`kubernetes.io/hostname` 才可作为当前单 Zone 内“一 Node 对应一物理 Host”的调度故障域；所有 Node 的 `topology.kubernetes.io/zone` 相同，不能仅靠 Zone Label 证明副本已经隔离。由平台定义的 Failure Domain Label 必须由受控 Provisioning 根据已验证事实写入并由 Admission 防篡改，普通用户、Agent、Workload ServiceAccount 和非受控 Helm Chart 不得伪造或覆盖。
- Deployment Set 只降低单个物理 Host 故障同时带走多个 ECS Node 的风险，不防整个 Zone、Region、账号/VPC、Provider Control Plane、共享网络或软件配置故障。Zonal ESSD 仍只能在兼容 Zone 内受控 Attach；Host 故障后的 Stateful 恢复继续执行 Fence、Detach/Attach、应用级 Quorum/Member Replace 与 Backup/Restore，不能因为 ECS 已分散物理 Host 就宣称数据卷具备跨 Zone 漂移或 Site DR。
- 当前环境的 Kubernetes Node Desired Count 必须连同 Provider 实时 Limit/Capacity 一起通过 Capacity Validation；若未来扩容超过单个 Deployment Set、单 Zone 或 `Affinity=1` 可满足的范围，必须先设计并验证新的 Multi-Zone/多故障域拓扑，再激活新的 Capacity Profile，不能通过提高 Affinity、删除 Node 或拆分 Deployment Set 静默降低隔离等级。
- 平台管理后台必须在当前环境的只读 Node/Capacity/Topology 视图展示 Availability Zone、Deployment Set ID、Desired/Effective Strategy/Type/Affinity、逐 Node ECS/Role/Membership、Provider Attestation、Failure Domain、Placement Limit/Usage/Headroom、Drift、最近验证、关联 Alert/Audit/Runbook；不得展示 Cloud Credential，也不得提供创建/修改 Deployment Set、迁移 ECS、调整 Affinity、改写 Failure Domain Label 或跨 Zone 调度的 UI/API 写入口。
- Node Role 不能通过在线改 Label/Taint 直接互换。`sandbox-worker`、`storage-worker` 或其他角色之间转换时必须先 Drain、确认 PDB/Quorum、撤销 Node/Workload Credential、清理本地 Secret/临时数据或 Raw Device 状态，再通过受控 Reprovision/Reimage 建立新 Node Identity 并重新执行 PCS/Capacity Validation；无法证明清理和可信启动时不得加入目标角色。
- 四类角色并不替代 Workload 内部的权限隔离，也不承诺所有故障都能自动恢复；它们提供的是调度、资源和信任域边界。未来容量或合规要求需要单独的 Database/Event Bus/Secret Manager Pool 时，必须创建包含新 Node Role Contract 的 PCS，并迁移到相应 Capacity Profile，而不是临时添加 Taint 绕过当前架构。
- DEV 与 PROD 都固定使用 3 个专用 `k8s-control-plane` Node，并采用 Stacked etcd：每个 Control Plane Node 同时运行一组 Kubernetes Control Plane 组件和 1 个本地 etcd Voting Member，不额外部署 3 个独立 External etcd Node。三个 Node 使用完全相同的 Kubernetes/etcd 版本与配置 Contract，环境只允许通过 Capacity Profile 调整 CPU、Memory、磁盘等容量。
- 三个 Control Plane/etcd Member 必须落在三个可验证的独立 Host/Failure Domain，etcd Quorum 为 2，可容忍任意 1 个 Member/Node 故障；把三个 VM 放在同一物理 Host 不满足该基线。当前仍处于单站点边界，因此该拓扑提供 Cluster HA，不宣称 Site DR。
- Kubernetes API的权威 HA Control Plane Endpoint固定采用目标 Cluster外、Provider-managed HA、Private-only的 L4 Load Balancer；当前 Alibaba Cloud Provider Mapping使用 internal-facing NLB，其他云托管或既有运维 Private L4 LB只有通过同一 Contract/PCS并证明 LB自身无单实例故障点后才能替换。当前只为 DEV Cluster创建一个 DEV NLB；未来部署 PROD时由同源 IaC/PCS模板创建独立 PROD NLB。两环境不共享 LB Instance、VIP、Listener、Backend Group、Credential、配置状态或故障域，但这仍是一种组件和架构，不是两套实现。当前 Control Plane与 Backend仍在单 Zone，托管 NLB的 Provider HA不把本架构升级为 Multi-Zone或 Site DR。
- API NLB必须由 Cluster外 IaC在 `kubeadm init`和 CNI安装前创建，不能由尚未存在的 Kubernetes `LoadBalancer` Service、Cloud Controller、Cilium Gateway或平台业务模块反向创建。首发按已确认的 IP阶段使用 NLB稳定 Private VIP与 `6443`端口作为 `kubeadm controlPlaneEndpoint`，所有 Control Plane/Worker Join、kubeconfig、Controller、运维工具和恢复流程都使用该共享 Endpoint，不长期绑定任一 Control Plane Node IP。未来引入内部 DNS时必须先把新名称加入 API Server Certificate SAN并验证解析/连通，再迁移 kubeconfig、Join/Bootstrap与运维引用，旧 VIP保持可用到全部消费者切换完成。
- NLB只配置 Private TCP `6443` Listener并执行 L4字节流透传，三个 `k8s-control-plane` Node的 Private IP:`6443`全部加入独立 Backend Server Group；TLS始终由 kube-apiserver终止，NLB不持有 Kubernetes TLS Private Key、不终止或重加密 API TLS，也不启用 kube-apiserver无法解析的 Proxy Protocol。公网 EIP、HTTP Listener、WAF、`platform-gateway`、Gateway API、Ingress、NodePort和业务 Service均不得进入 Kubernetes API路径。
- Backend Health Check首版使用 kubeadm正式 HA路径对应的 TCP `6443`检查；Interval、Timeout、Healthy/Unhealthy Threshold、Connection Draining与 Provider Fail-open语义由 PCS锁定并通过故障演练验证。TCP端口可连接只证明 Listener可达，不等于 API/etcd健康，因此 Cluster外受控 Prober还必须通过受信客户端身份校验共享 Endpoint的 `/readyz`、TLS Chain/SAN与实际请求，并关联 etcd Quorum、Controller/Scheduler Lease。若 Provider在全部 Backend不健康时仍 Best-effort转发，平台必须继续显示 `CONTROL_PLANE_ENDPOINT_UNAVAILABLE`，不得把转发尝试伪装为健康或绕过 Kubernetes自身 Fail Closed。
- NLB Frontend只允许当前环境 VPC中的 Cluster Node、受控 Provisioning/Operations Runner及既有 VPN管理来源访问；Control Plane Node的 Security Group、Host Firewall与 Cilium Host Policy只允许 NLB健康检查/转发所需来源和批准的本地管理路径访问 `6443`，etcd `2379/2380`永不经过 NLB。Sandbox、普通 Workload、其他环境、互联网和未批准 VPC/CIDR默认拒绝；不得依赖 NLB是“内网实例”就省略 Network ACL、Security Group、Host Policy或 Audit。Client Source IP是否被 SNAT只影响观测字段，不能代替 TLS Client Identity、RBAC或 Kubernetes Audit Actor。直接访问单个 Node API IP只允许在 Endpoint故障处置中的受审计本地 Break-glass，普通 kubeconfig、Join、监控和自动化不得把它作为回退地址。
- kube-apiserver Certificate必须包含 NLB稳定 Private VIP，以及启用后对应的 Private DNS和各自必要 Node地址作为显式 SAN；Common Name不能替代 SAN。三个 API Server使用同一 Cluster Trust但各自节点身份，Certificate签发/轮换、NLB VIP或 DNS迁移、Backend替换和 SAN变化必须一次只处理一个 Control Plane Node，并在每步验证共享 Endpoint、剩余 Backend、etcd Quorum和全部 Client。NLB本身不持有该 Certificate，避免形成第二个 TLS终止与密钥面。
- 单个 Control Plane Node/API Server故障时，NLB停止向该 Backend发送新连接，剩余两个 Backend继续服务；计划维护或 Backend替换时先受控 Drain，只有 API `/readyz`、TLS/SAN、etcd Member Health/Catch-up和共享 Endpoint请求均通过后才重新启用该 Backend。NLB只解决 API Server入口高可用，不能创造或绕过 etcd Quorum。两个 etcd Member不可用、全部 API Server不 Ready、TLS/SAN不匹配或 NLB无健康 Backend时，Kubernetes管理写入保持 Fail Closed，不能自动回退公网 WAF、业务 Gateway或固定 Node IP；已运行 Workload的有限存活语义继续沿用既定规则。
- NLB Instance、VIP、Listener、Server Group、Backend Membership、Health Check、Network ACL/Security Group引用、Deletion Protection、Provider Service Role与外部 IaC State都必须在目标 Cluster外受控保存并可在 Kubernetes完全不可用时读取/恢复；禁止只把 Desired状态保存在 Cluster内 CRD、ConfigMap、Secret或平台数据库。Control Plane Recovery Bundle绑定 Endpoint/VIP/SAN、Listener、Backend/Probe/Network Contract、Bootstrap/Retirement顺序与对应 IaC Revision；完整恢复时先由独立最小权限 Operations Identity恢复/确认 NLB并注册新 Control Plane Backend，再执行共享 Endpoint与 Control Plane验证，不能要求失效 Cluster里的 Controller先修复自己的入口。Cluster正式退役时 NLB必须在全部 Client、Node、Recovery与 Audit事实完成迁移/封存后最后删除，不能先删入口再尝试清理 Cluster。
- NLB变更采用版本化 IaC/PCS并至少验证 Create/Import、Backend Add/Remove、单 Backend故障、全部 Backend故障、Connection Drain、Control Plane逐节点升级、Certificate Rotation、VIP/DNS迁移、Cluster全量 Restore、Provider API不可用与回滚。运行时平台业务代码不调用 NLB Admin API；未来替换 Provider只改变 `ControlPlaneEndpointProvider` Mapping、IaC、Identity和验证证据，不修改业务模块、Kubernetes API Client Contract或 etcd拓扑。
- API NLB是每环境独立的固定外部基础设施成本项：当前 DEV TCO计1个 internal-facing NLB，未来 PROD另计1个，不与北向 Edge LB、`platform-gateway` Service或其他 LoadBalancer重复合并。具体 Zone/vSwitch、NLB Edition、LCU/CU、带宽、计费模式、Private DNS和单价属于 Provider Mapping/报价输入；未获得正式报价前只记录数量与 Contract，不猜月费。
- Kubernetes API写入 etcd前的 Data-at-rest Encryption首版固定采用 Control Plane本地 `secretbox` `EncryptionConfiguration` Keyring；不把现有 ESSD CMK、Cluster内 OpenBao、Snapshot OpenPGP或 Object Storage SSE误认为这一层加密。`secretbox`使 Catalog内且已经完成 Rewrite/验证的 API对象不以明文存储于 etcd，并且不增加在线外部 KMS依赖，但 Key Material仍可被取得 Control Plane Host Root权限的攻击者读取；因此它不能替代 Node加固、最小化运维权限、Control Plane磁盘静态加密、Audit与外部 Recovery Bundle。
- 首版加密资源安全下限固定包含 Kubernetes `secrets`与 `configmaps`，并由 PCS中的版本化 `Sensitive API Resource Catalog`显式加入确实存放敏感 Payload的 CRD Resource。Catalog只能使用 EncryptionConfiguration官方精确资源标识：小写复数 `resource`或 `resource.group`，例如 `secrets`与 `widgets.example.io`，不得保存 Kind、API Version或模糊业务名；CRD安装/升级前必须完成数据分类、API Discovery与资源标识校验。Controller、Operator与平台扩展默认只能在 CRD中保存不可逆 Fingerprint或 Kubernetes Secret Reference，禁止内联 Credential、Private Key、Token或恢复材料；确有技术约束的 CRD必须在安装前完成数据分类并加入 Catalog。首版不使用未经审查的全资源 `*.*` Wildcard，也不由 Super Admin后台动态修改 Resource List；Catalog、CRD或 Encryption Provider变化都属于新 PCS/GitOps变更。
- 每个环境使用 CSPRNG生成独立、恰好32 raw bytes的 `secretbox` Key，并仅在 `EncryptionConfiguration.secret`字段中以 Base64编码表达；Base64文本不是另一把 Key。DEV与PROD不得复用 Key、Key Name、Keyring、Configuration或 Recovery Bundle。Key Name只表达 Environment、Generation与不可变标识，不包含 Secret；明文 Key只能存在于三个 Control Plane Host受限的 EncryptionConfiguration，以及获批 Bundle构建/恢复时的内存或受控临时区。Host文件必须最小权限、只读挂载给 kube-apiserver并位于启用 Provider-side Encryption at Rest的 Control Plane磁盘，禁止进入 Git、Kubernetes Secret/ConfigMap、Cluster内 OpenBao、平台数据库、Container Image、Environment Variable、日志、Trace、普通 Backup或即时通信。
- 三个 kube-apiserver的稳定 Desired `EncryptionConfiguration`必须使用同一 Schema、Resource Catalog、Provider顺序、完整 Read Keyring、Active Write Key和字节级 Content Hash；Bootstrap、Join、Reprovision与持续 Conformance均验证 Revision/Hash。新写入只允许由列表首位 `secretbox` Active Key加密；全新 Cluster从创建首个受保护对象起不配置 `identity`。若既有 Cluster确有未加密存量，`identity`只能在受审计迁移窗作为最后一个临时 Read Fallback，永远不得位于首位，并在完成全量 Rewrite与 Raw etcd验证后立即移除。
- Key Rotation执行无停机两阶段协议：先生成新 Key，将它放入同一 `secretbox.keys`数组的第二位；这不是独立“只读模式”，而是 Kubernetes“首 Key写入、全部 Key按顺序尝试解密”语义下的 Read Candidate。全部 Control Plane逐节点验证都能读取新旧格式后，才把新 Key调到第一位成为 Active Writer并再次逐节点切换。首版不启用 `--encryption-provider-config-automatic-reload`，每次通过原子替换 Host文件并受控重启一个 kube-apiserver生效；任一阶段一次只 Drain/更新/恢复一个 API Backend，临时并存的 Configuration Generation必须拥有相同完整 Read Keyring且通过跨节点读写兼容 Gate，每轮结束后三个节点重新收敛到同一 Content Hash。禁止在尚有 API Server不认识新 Key时让其他 Server使用它写入。
- 每次 EncryptionConfiguration、Catalog或 Key变化前必须先生成 `BACKUP_VERIFIED` Pre-change etcd Snapshot，并让它只绑定变更前当时 Effective的有序 Provider/Key列表、Active Writer、Catalog与 Config Hash对应的不可变 Recovery Bundle；包含新 Key或下一阶段顺序的 Candidate Bundle必须使用不同 Bundle ID并明确标记 Pending，不能反过来伪装成该 Pre-change Snapshot的 Effective配置。每个阶段生效后都生成新的不可变 Bundle/State Manifest，后续 Snapshot只绑定其生成时实际 Effective的精确世代，使任一保留 Snapshot都能确定性重建完整解密 Keyring。
- 新 Key成为 Active Writer后，必须对 Catalog内每个精确 Resource逐类型执行幂等 Migrator、分页、冲突重试与全量 Rewrite，不假设一条通用 `kubectl replace`能安全处理 CRD、Immutable Object和 Admission副作用；随后同时验证 API读取、逐 Backend Canary写入、Raw etcd中不输出 Payload的 `k8s:enc:secretbox:v1:<keyName>:` Envelope前缀、对象总数与错误率。验证未完成时不得删除 `identity` Fallback或旧 Read Key。旧 Key可在 Live Configuration完成 Rewrite后移除，但只要任一保留中的 Snapshot/Object Version仍依赖它，Key Material就必须继续封存在该 Snapshot绑定的不可变 Recovery Bundle与离线 Recovery Kit中，并由恢复演练证明可读，禁止按当前 Live Keyring误删历史恢复能力。
- Encryption Configuration、启动参数或文件缺失，Schema不是 `apiserver.config.k8s.io/v1`，文件权限不合规，未知 Key、Resource Catalog Drift、三节点 Read Keyring不兼容、受保护对象无法解密或迁移验证失败时必须 Fail Closed。Node Bootstrap与 kube-apiserver Pre-start Gate必须先校验 `--encryption-provider-config` Flag、受控文件、Schema、Catalog/Config Hash、权限和 Key Generation，失败时不启动 kube-apiserver、不把该 Node注册为 API Backend；不能依赖省略 Flag后仍可能正常的 `/readyz`。每个 Backend加入 NLB前还必须从受控 Cluster外 Prober直连该 Node执行 TLS、`/readyz`和最小权限受保护 Canary读写，不能只经共享 NLB抽样；运行期出现 Drift时外部 Watchdog立即标记 Incident并由受控 IaC/Ops流程 Drain该 Backend。任何情况下都不能回退明文、把 `identity`移到首位、跳过损坏对象或直接删除 etcd Key。
- 平台管理后台只读展示当前环境的 Data-at-rest Provider、受保护 Resource Catalog Revision、Active Key Generation/非敏感 Fingerprint、三个 API Server的 Desired/Effective Config Hash、Keyring Drift、最近 Rotation/Rewrite/Raw etcd验证、Recovery Bundle绑定、Restore Drill与相关 Alert/Runbook；不得显示 Key Material、完整 EncryptionConfiguration、Recovery Kit或提供生成、轮换、下载、回退、启停加密的 UI/API。未来若已有经过验证的 Cluster外 KMS Provider，只允许通过新的稳定 KMS `apiVersion: v2` PCS与 Provider Mapping替换本地 Keyring，禁止引入已废弃 KMS v1；KMS Plugin部署在每个 Control Plane Host并通过 Unix Domain Socket连接 kube-apiserver，只有 KEK及远端 KMS服务位于 Cluster外。迁移时先以 KMS v2作为首位 Writer、`secretbox`作为 Read Fallback，完成全量 Rewrite与恢复验证后才移除本地 Key，不引入 `identity`；它不是运行时开关，也不能使用 Cluster内 OpenBao形成 Control Plane恢复循环。
- 一个 Control Plane Node 故障时，剩余 2 个 etcd Member 继续形成 Quorum，API 写入、调度和控制循环可以继续；两个 Member 不可用或无法证明数据多数派时，etcd/Kubernetes 管理写入必须 Fail Closed，不得强制把单个旧 Member 启动成新 Cluster、重置 Cluster ID 或假装 Quorum 正常。已经在 Worker 上运行的 Pod 可能继续运行，但新调度、状态协调、Lease、故障恢复和平台运维能力会受限，不能宣称平台完整可用。
- Control Plane 自愿维护、Kubernetes/etcd 升级、证书轮换和 Node 替换一次最多处理 1 个 Node。每一步前后必须确认 etcd Endpoint Health、Member List、Leader、Applied Index/Lag、Alarm、API `/readyz`、Controller/Scheduler Lease 与剩余 Quorum；当前 Node 未恢复健康和追平前禁止继续下一个 Node，也禁止同时 Reboot、Drain 或 Reimage 两个 Control Plane Node。
- 永久故障 Member 的替换必须使用受控 etcd Member Remove/Add 与新 Node Identity 流程，在仍有 Quorum 时移除旧 Member、重新 Provision 节点并让新 Member 从健康多数派同步；禁止复制旧 Member Data Directory、复用冲突 Member ID 或通过清空多数派状态快速重建。失去 Quorum 时只能走经过验证的 etcd Snapshot Restore/Control Plane Recovery Runbook，不能按普通节点替换处理。
- etcd Data Directory 必须位于低延迟、可靠的本地 SSD 文件系统，不使用 Rook-Ceph RBD/CephFS、NFS 或平台业务数据库作为实时 Backend。Snapshot 不能替代三个实时 Member，也不能只留在对应 Control Plane Node本地磁盘。
- 每个 Platform Environment建立独立的 `kubernetes-etcd-backup` Control Plane Backup Repository；其权威恢复副本必须位于目标 Kubernetes Cluster及其 Rook-Ceph/RGW之外，由运维通过独立 IaC/GitOps管理的 S3-compatible Repository承载。DEV与PROD使用不同的物理 Bucket、Repository Identity、Credential、Encryption Key与 Object Namespace，禁止共享 Bucket、Prefix、Version、恢复凭据或运行时信任。
- “Cluster外”是恢复依赖而不只是资源标签：在目标 Kubernetes API、etcd Quorum、CNI、CoreDNS、Ingress、平台 Control Plane、Cluster内 OpenBao与 RGW全部不可用时，获批的恢复终端仍必须通过受控带外网络取得 Snapshot、Manifest、解密材料与恢复工具。仅把对象写到 Cluster内 Service、依赖 Cluster内 DNS/Secret/OpenBao才能读取，或把另一块 Control Plane本地盘称为备份，都不满足该 Contract。
- `kubernetes-etcd-backup`是独立的 Control Plane Recovery Class，不加入 Rook-Ceph八类 Bucket Class、Ceph 50%-Raw Planning Envelope或 RGW Operating Quota；其容量、Object Count、Request、Retention、Encryption、流量与固定服务费用作为每环境单独的 External Backup Repository成本项进入 Capacity Profile/TCO。容量 Candidate必须按 Snapshot p95、PROD至少7天内约336个30分钟周期点或 DEV约56个3小时周期点、每日点、Pre-change/On-demand点、Recovery Bundle、Manifest、Locked/Noncurrent Version、Working Set与30天增长共同计算，不先猜固定 GiB。当前 Repository仍位于同一站点边界，只解除 Cluster恢复对同 Cluster Ceph的依赖，不宣称 Site DR；未来迁移到异地或跨 Region Repository必须通过新 DR Design、复制一致性和恢复演练批准。
- Backup Repository通过稳定的 `ControlPlaneBackupRepository` Infrastructure Contract接入；Endpoint、Region、Bucket、Object Key规则、Path-style/Virtual-host-style、TLS Trust、Identity Adapter、Encryption、Versioning、Object Lock、Retention、Timeout与 Retry全部由环境化 IaC/GitOps配置，Control Plane模块和业务领域代码不得调用 Provider Admin API或硬编码 Alibaba Cloud产品。当前 Provider Mapping、未来云托管 S3或其他 S3-compatible实现只能替换 Adapter与配置，Snapshot Manifest和 Restore Runbook保持兼容。
- etcd Snapshot使用与当前 etcd Major/Minor兼容并锁定 digest/version的原生 `etcdctl snapshot save`从一个健康 Endpoint生成，随后使用匹配的 `etcdutl snapshot status`校验 Hash、Revision、Total Keys与 Size；禁止把正在使用的 `member/snap/db`普通文件复制、单节点 Data Directory或 Crash-consistent Volume Snapshot冒充权威 Snapshot。调度必须保证每个 Environment/时间点只有一个有效逻辑备份，重试以稳定 Backup ID幂等，不能并发生成多份后全部标记成功。
- Snapshot包含完整 Kubernetes状态和敏感信息，上传前必须使用当前环境专用、与 OpenBao Recovery及其他用途不复用的 OpenPGP Recovery Public Key进行客户端加密；Repository只保存密文并继续启用 TLS、服务端加密、Versioning与 `GOVERNANCE` Object Lock。Public Key与 Fingerprint可由 GitOps只读分发；Private Key及 Passphrase只能进入受控离线 Control Plane Recovery Kit，不得进入目标 Kubernetes、OpenBao、Ceph、平台数据库、Git、日志或在线 Secret。Key轮换必须保留仍受 Retention约束的历史 Snapshot所需 Private Key，并同时演练新旧 Recipient恢复。
- etcd Snapshot之外必须维护独立、同样位于 Cluster外且客户端加密的 `Control Plane Recovery Bundle`。Bundle至少包含匹配的 kubeadm/Control Plane Configuration、PCS与 Artifact/Image Digest清单、Kubernetes Root/etcd/front-proxy CA及所需 Private Key、ServiceAccount Signing Key、API Server Encryption Configuration、Sensitive API Resource Catalog与该 Snapshot仍需的完整 Active/Historical `secretbox` Keyring、HA Endpoint/SAN、Trust Bundle和非 Secret Bootstrap Metadata；不得把 Git中可重建的公开配置误写成足以替代这些不可重建材料。Snapshot Manifest必须绑定唯一 Bundle ID、Object Version、Plaintext/Ciphertext Hash、Encryption Configuration Hash与 Key Generation，缺少匹配 Bundle或解密材料时不能标记可恢复。
- Control Plane恢复时必须先在 Cluster外解密并核验 Snapshot绑定的精确 Recovery Bundle；在任何 kube-apiserver连接恢复后的 etcd之前，把该 Bundle的 Effective `EncryptionConfiguration`、有序完整 Keyring与 Catalog安全落置到全部 Control Plane Host并验证字节级 Hash和 Pre-start Gate。随后恢复 etcd Quorum，再逐个启动 API Backend并从 Cluster外直连完成 TLS、`/readyz`、受保护对象读取与 Canary写入；只有验证通过的 Backend才加入 NLB，最后才恢复共享 Endpoint流量。禁止先用无 Key或错误世代的 API Server接触 etcd后再补配置，也禁止让恢复过程依赖 Cluster内 OpenBao。
- Snapshot与 Recovery Bundle使用不同物理 Bucket/Identity/Policy，Prefix不能代替隔离。正常 `snapshot-writer`优先使用 Repository/Cloud颁发的短期 Workload/Instance Identity，只能创建 Snapshot/Manifest并完成必要 Multipart与精确对象复验；受控 `bundle-writer`只在 PKI、Signing Key、Encryption Configuration/Key、Endpoint/SAN或其他 Bundle事实变化时生成新不可变 Bundle；两者都不能 Delete、改写 Retention、跨环境访问或取得 Admin权限。Cluster外 `restore-reader`与 Writer身份分离，默认禁用且只能在获批 Break-glass恢复窗从受控终端读取指定 Version；`retention-cleaner`另行最小授权。Restore所需 Identity、CA Trust、Endpoint、Public Metadata与离线解密材料不能只保存在目标 Cluster或其 OpenBao中，且任何恢复凭据不得通过平台管理后台展示或下发。
- Repository必须在目标 Cluster外记录不可变的 Provider/IAM Audit，覆盖 Writer、Bundle变更、Reader启停/读取、Cleanup、Object Lock/Retention、Bucket Policy、Encryption、失败与 Break-glass，并与 Environment、Backup/Bundle ID、Object Version、操作者或 Workload Identity、原因和外部变更记录关联；Audit不得记录 Snapshot/Bundle明文、Private Key、Credential或完整敏感 URL。Cluster内平台恢复后可以通过只读 Operations Adapter聚合这些状态，但外部备份审计与告警不能只依赖被保护 Cluster自身的 Audit/Observability。
- 每个 Snapshot使用不可变唯一 Object Key并生成不可变校验 Manifest，至少记录 Environment、Cluster ID、Backup ID、Snapshot Time、源 Member/Endpoint、Kubernetes/etcd及工具精确版本、Hash、Revision、Total Keys、Size、Plaintext/Ciphertext SHA-256、Encryption Recipient/Fingerprint、Repository Object Version ID、Recovery Bundle ID/Version/Hash、Reason（Scheduled/Pre-change/On-demand）与 GitOps/PCS Revision。正常 Backup Job先对明文执行 `etcdutl snapshot status`和 Plaintext Hash，再加密、上传、按精确 Version回读密文并核对 Ciphertext Hash、Manifest及 Bundle引用后标记 `BACKUP_VERIFIED`；它不持有离线 Private Key，不能在日常任务中假装完成解密验证。只有获批 Restore Drill使用离线 Private Key完成 Snapshot与 Bundle解密、Hash及实际 Restore后，才能更新独立的 `RESTORE_VERIFIED`证据。本地临时明文必须位于受限加密工作目录并在成功或失败后安全清理。
- PROD默认每30分钟生成一次 Snapshot，全部周期点默认保留48小时、每日点默认保留30天，Control Plane Recovery Point目标为 `RPO <= 1h`；DEV默认每3小时生成一次并保留7天，目标为 `RPO <= 6h`，以调度间隔小于目标为失败重试、上传和告警留出余量。Kubernetes/etcd升级、证书与 Encryption Configuration变更、Member增删/替换、Control Plane Node重建以及其他可能破坏状态的维护前必须先生成匹配的新 Recovery Bundle（如相关事实变化），再额外生成并验证按需 Snapshot；没有最新 `BACKUP_VERIFIED` Pre-change Snapshot时禁止继续变更。Pre-change点至少保留30天，且变更超过30天仍未关闭时继续保留到变更关闭并再经过7天。
- 所有 etcd Snapshot与 Recovery Bundle默认使用7天 `GOVERNANCE` Object Lock；因此PROD周期点即使逻辑保留48小时，也必须按至少7天共存量计算 Repository容量，任何 Bundle还必须保留到引用它的最后一个 Snapshot到期并通过后继 Bundle恢复验证。调度、Jitter、周期/每日 Retention、Object Lock、容量阈值、工具版本、恢复演练周期与 RPO/RTO均属于版本化 `GITOPS_CONFIG`，平台管理后台只读展示 Desired/Effective/Revision/Drift；时间值可通过新 Capacity/DR Candidate调整，但不得让已存在 Object提前跨越创建时的保护窗口，也不能为了节省成本静默放宽 Recovery目标。Repository侧受控 Retention Reconciler只能在 Lock到期、恢复链完整、没有调查/恢复引用且精确 Version资格验证通过后清理，普通 Backup Writer不具备删除权。
- DEV每月、未来PROD每季度在隔离恢复环境执行完整 Control Plane Restore Drill；恢复使用一个已验证 Snapshot为三个成员生成新的 Data Directory与受控新 Membership/Cluster Identity，并按目标 etcd版本支持情况执行 Revision Bump与 `mark-compacted`使 Kubernetes Watch/Informer缓存失效。禁止使用 `--force-new-cluster`捷径、复用旧 Member ID/Data Directory或让未 Fence的旧 Member重新加入；恢复后必须验证 etcd Hash/Revision/Quorum、API `/readyz`、Controller/Scheduler Lease、核心 API Object、Secret Encryption可读性、Node/PVC/Operator状态、GitOps Reconciliation与关键平台健康。
- 首年完整 Control Plane Recovery目标为 DEV/PROD `RTO <= 120min`，从宣告 Quorum不可恢复并批准 Restore开始，到三个新 Member形成 Quorum、HA API Endpoint恢复且关键控制循环验证通过为止；该目标必须由演练实测，不能只用下载或单 Member Restore耗时替代。Snapshot/Upload/Verification/Retention失败、RPO Gap、Repository/Identity/Recovery Kit不可用或 Drill超出目标都进入 Control Plane DR Incident并阻止相关高风险维护。
- DEV 保持与 PROD 相同的 3 Node、Stacked etcd、Endpoint、逐节点维护和恢复流程，用较小 Capacity Profile 控制成本，以便真实验证 Quorum、升级和 Snapshot Restore；DEV/PROD 的 etcd Cluster ID、证书、Snapshot、Endpoint 和 Credential 完全隔离，禁止复制 DEV etcd 数据初始化 PROD。
- Control Plane 首年工程容量基线采用环境差异化方案：DEV 每个 `k8s-control-plane` Node 为 `2 vCPU / 4 GiB RAM / 100 GiB 本地企业级 SSD`，PROD 每个 Node 为 `4 vCPU / 8 GiB RAM / 100 GiB 本地企业级 SSD`。这些值是首个 Environment Capacity Profile 的 Desired Input，不宣称为 Kubernetes 官方通用最小值，也不得写死在应用代码、安装脚本或领域模块中；后续只通过新的 Capacity Profile 版本独立调整，并继续满足 PCS 的 Minimum Capacity Envelope、Quorum、故障与升级余量。
- 每个 Control Plane Node 的 `/var/lib/etcd` 必须位于上述低延迟 SSD 上的独立文件系统或分区，与 OS、Container Image、日志和临时文件建立明确容量边界；独立文件系统或分区不等于首版必须再购买一块物理盘。具体分区容量、Filesystem/Mount Option、Reserved Space 与延迟阈值在 Node OS/etcd Capacity Schema 中锁定并经 DEV 验证，任何磁盘写满、FSync 延迟或 Filesystem Read-only 状态都必须在影响 Quorum 前告警。
- Control Plane Node 继承上述全节点无 Swap Contract，并额外保证 Capacity Profile 为 API Server、Scheduler、Controller Manager、etcd、kubelet 和系统进程保留明确内存余量；不得通过开启 Swap 解决 Control Plane 容量或 etcd 延迟问题。
- 当前不引入 External etcd，避免为 30 DAU 规模额外增加 3 个高权限 Stateful Node、网络故障面和独立升级链路。未来只有在 Control Plane/etcd 性能、合规或故障隔离需求经过实测证明后，才通过新 PCS 和 Capacity Profile 迁移为 External etcd，不能在现有 Set 内临时改变拓扑。
- 平台管理后台必须只读展示 Control Plane Endpoint/NLB Provider与 Private VIP引用、Listener/Server Group、三个 API Backend的 Desired/Effective Membership和 TCP/Authenticated Readiness、TLS Chain/SAN、IaC/PCS Revision、Deletion Protection、Network Policy/Drift、Provider告警，以及3个 API Server/etcd Member、Leader、Quorum、Version/Digest、证书到期、DB Size、WAL/FSync延迟、Member Lag、Alarm、故障域与最近维护；同时展示外部 Backup Repository Provider/Endpoint引用、Desired/Effective Retention与 Object Lock、当前用量/对象数/30天预测、最近 `BACKUP_VERIFIED`与 `RESTORE_VERIFIED`、RPO Gap、Recovery Kit/Reader Identity就绪状态和实测 RTO。页面不得展示 Snapshot内容、Credential、Private Key或 Passphrase；任何 Endpoint无健康 Backend、全部 Backend Best-effort转发、TLS/SAN异常、失去 Quorum、Member长期不同步、Snapshot/Repository失败、Recovery Kit不可用或 Restore Drill过期都必须关联 Alert和 Runbook。Endpoint/NLB的外部 Probe与告警必须由 Cluster外 Watchdog/运维监控独立产生，不能只依赖可能已失联的 Cluster内 Prometheus/Alertmanager。页面不提供 NLB/Backend/Security Group修改、etcd Member增删、`--force-new-cluster`、Snapshot下载、Credential下发或 Restore写操作。
- 平台管理后台必须只读展示每个 Node 的 Role、Runtime、版本、Taint/Label、真实故障域、Desired/Effective Profile、Allocatable/Requested/Observed、可调度余量、错误放置 Pod、角色 Drift 和 Drain/Reprovision 状态，并关联 Kubernetes/Grafana 控制台与 Runbook；页面不能下发 Node Label、Taint、Drain 或角色转换命令。

- DEV 与 PROD 共同使用 CloudNativePG 管理的同一 HA 拓扑模板：每个环境实例均为 1 个 Primary + 2 个 Standby。
- PostgreSQL 复制固定使用 Quorum-based Synchronous Replication：`method=any`、`number=1`、`dataDurability=required`、`failoverQuorum=true`。
- 事务 Commit 只有在 WAL 已写入 Primary 和任意 1 个合格 Standby 后才向应用返回成功；禁止在 Standby 不足时自动降级为异步复制。
- 两个 Standby 均不可用时，Primary 必须暂停不能满足同步耐久条件的写入，而不是继续写入并把潜在数据丢失隐藏为正常成功。
- 自动 Failover 前必须通过 Failover Quorum 证明候选 Standby 包含全部已确认同步事务；无法证明时拒绝自动提升，优先保护已确认数据。
- 强制绕过 Failover Quorum 只能作为 Break-glass 操作，由具备专用基础设施管理权限的人员明确接受潜在数据丢失后执行，并完整记录操作人、证据、理由、时间线和结果。
- 应用必须为同步复制暂停、连接中断和 Commit 结果不确定设置明确超时与幂等恢复边界；不得因为客户端超时就盲目重复非幂等事务。
- PostgreSQL 固定使用 `18` 大版本，首次部署基线为 `18.4`；CloudNativePG 固定使用 `1.30.x` 版本线，首次部署基线为 `1.30.0`。
- PostgreSQL Operand、CloudNativePG Operator 和 Helm Chart/Manifest 都必须在 GitOps 中锁定完整版本及镜像 digest，禁止使用 `latest`、浮动 tag 或启动时自动追随新版本。
- PostgreSQL `18.x` 补丁升级和 CloudNativePG 支持版本升级必须先核对 Release Notes，在 DEV 完成备份恢复、复制、Switchover/Failover、连接恢复和回滚验证，再通过受控 GitOps 变更发布到 PROD。
- CloudNativePG 必须始终处于官方支持窗口内；版本维护不能长期停留在已停止安全修复的分支。
- PostgreSQL 大版本继续固定为 `18`，不随补丁维护自动跨大版本。未来升级 PostgreSQL 大版本时必须作为独立迁移项目，明确扩展兼容、备份、恢复、停机或逻辑复制路径以及回滚验收。
- 后续确定 Kubernetes 版本时，必须落在所选 CloudNativePG 版本的官方支持矩阵内；不能独立升级 Kubernetes 后再假设数据库 Operator 仍兼容。
- DEV 与 PROD 均使用 CloudNativePG `Pooler` 管理的 2 个 PgBouncer Pod，采用 Transaction Pooling；PgBouncer 首次部署基线为 `1.25.2`，通过 Image Catalog/GitOps 锁定完整版本和镜像 digest。
- 普通平台业务流量统一连接 PgBouncer Service；Alembic/DDL Migration Job、受控 DBA 操作和 Break-glass 通道才允许直连 CloudNativePG `rw` Service，并通过独立 ServiceAccount、NetworkPolicy 和 Audit 限制。
- PgBouncer 两个 Pod 必须跨 Node 调度，配置 Pod Anti-Affinity、Topology Spread、PodDisruptionBudget、Readiness 和 TLS；Pooler 与 PostgreSQL Cluster 生命周期独立，必须分别纳入 GitOps、监控、告警、升级与恢复验证。
- 使用 Transaction Pooling 的业务代码不得依赖连接级 Session 状态，包括持久化 `SET/RESET`、`LISTEN`、Session Advisory Lock、保留型临时表、`WITH HOLD` Cursor 或 SQL 级 `PREPARE`；协议级 Prepared Statement 必须结合驱动和 `max_prepared_statements` 做兼容测试。
- 应用侧连接池仍必须有界；PgBouncer 服务端连接预算按 Pooler Pod、Database 和 User 的组合汇总，并为复制、监控、迁移和受控管理连接预留余量。
- PgBouncer Pod 故障、PostgreSQL Switchover/Failover 或滚动升级仍可能断开现有连接并终止进行中事务；应用必须重新连接，只有满足幂等边界的事务才可自动重试。
- DDL 变更后必须按兼容性验证结果刷新 PgBouncer 或应用连接，避免复用失效的 Prepared Plan；不得把连接池视为数据库故障屏蔽层。

PostgreSQL 与 PgBouncer 首年容量基线：

| 组件/环境 | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit | `shared_buffers` | 单 Pod PVC |
| --- | --- | --- | --- | --- |
| PostgreSQL DEV | 500m / 500m | 1 GiB / 1 GiB | 256 MB | 40 GiB |
| PostgreSQL PROD | 1 CPU / 1 CPU | 2 GiB / 2 GiB | 512 MB | 100 GiB |
| PgBouncer DEV | 50m / 250m | 64 MiB / 128 MiB | — | — |
| PgBouncer PROD | 100m / 500m | 128 MiB / 256 MiB | — | — |

- 上述数值均为单 Pod 配额；每个环境固定包含 3 个同规格 PostgreSQL Pod 和 2 个 PgBouncer Pod，Primary 与 Standby 不允许使用不同规格。
- PostgreSQL 三个 Data PVC 的首发合计容量为 DEV `120 GiB`、PROD `300 GiB`。PROD 在 `PGDATA <= 50 GiB` 的恢复与 RTO 验证边界下，目标数据约占单卷 Nominal Capacity 的 50%，其余空间用于 WAL、文件系统开销、短期增长和在 70% 扩容水位触发后完成受控扩容；不得把空闲空间解释为允许绕过容量预测继续无界增长。DEV 的 40 GiB 单卷同样保留扩容处理空间，但不冒充能够直接承载 PROD 50 GiB 数据集的长期恢复目标。
- PostgreSQL 的 CPU、Memory Request 与 Limit 必须分别相等，使数据库 Pod 处于 Kubernetes `Guaranteed` QoS；PgBouncer 是无状态连接层，可以使用受控的 Burstable 配额。
- PostgreSQL `max_connections`首年固定为 `100`。Temporal八个 Server Process对 Default/Visibility Store采用受限直连，每个 Process/Store首年 `maxConns=2`、`maxIdleConns=1`、`maxConnLifetime=1h`，理论上限为 `32`个 Runtime Connection；两个 Grafana Replica共享独立 `grafana`数据库与最小权限 Role，每个实例 `max_open_conn=5`、`max_idle_conn=2`，直连理论上限为 `10`；两个 PgBouncer Pod合计最多占用 `40`个普通平台业务 Backend Connection，剩余至少 `18`个连接预算保留给复制、监控、Schema Migration、备份、受控管理和故障操作。任何组件不得照抄上游宽松默认值后突破总预算。
- 每个 PgBouncer 的 `max_client_conn`首年为 `200`、`default_pool_size`初始为 `5`；最终配置必须根据实际 `(database, user)` Pool数反推，并由部署校验保证两个 Pod的普通平台业务理论 Backend Connection总量不超过 `40`。如果后续拟让 Temporal经过 PgBouncer，必须先在 PCS中验证 `postgres12_pgx`与 Transaction Pooling的 Prepared Statement、事务状态、Reconnect及 CloudNativePG Failover兼容性；验证不过继续使用上述受限直连，不得默认 Connection Pooler可以透明替换。
- 首版不配置独立 WAL PVC；WAL 与 PGDATA 使用同一加密 SSD/RWO PVC。StorageClass 必须支持 Volume Snapshot、在线扩容并经过 `fio` 与数据库基准验证。
- PostgreSQL PVC 只能通过受控 GitOps 扩容，不能依赖缩容。使用率达到 70% 或预测 30 天内超过 80% 时进入扩容流程；归档积压、复制槽保留 WAL 或持续 I/O 竞争必须先诊断根因，只有确认长期需要隔离时才增加独立 WAL PVC。
- Primary CPU 或 Memory、Backend Connection、PgBouncer Waiting Client/Pool 使用率持续达到约 70% 且伴随延迟上升时，先排查查询、连接泄漏和 Pool 划分，再在 DEV 基准测试后垂直扩容；不得直接在 PROD 自动修改数据库资源。
- 每个环境的 Kubernetes 数据库调度容量必须额外保留至少 1 个该环境当前 Capacity Profile 下的完整 PostgreSQL Pod及系统开销，使节点故障、滚动升级和 Pod 重建时仍能恢复三实例拓扑；整套 Node 规格仍在所有组件汇总后统一确定。

PostgreSQL 备份与 PITR 基线：

- 使用官方 Barman Cloud Plugin `0.13.0` 通过 CNPG-I 执行备份、WAL 归档、恢复和 PITR；Plugin Manifest 与镜像 digest 必须锁定，禁止使用已经废弃的 CloudNativePG 内置 Barman Object Store 路径。
- Barman Cloud Plugin 与 CloudNativePG Operator 之间使用 cert-manager 签发和轮换的 TLS 证书；cert-manager 因此属于 DEV、PROD Kubernetes 平台共同基线组件。
- 同一 Barman `ObjectStore`/GitOps 模板在每个环境的 PostgreSQL Cluster 中分别实例化；生成的 ObjectStore Resource、专用 S3-compatible 备份 Bucket、凭据和恢复目录不跨环境共享。Prefix 只能用于同一备份域内的对象组织，不能充当环境、Cluster、权限、加密或 Retention 隔离边界。
- 持续 WAL 归档使用 `archive_timeout=5min`。在备份存储和归档链路健康的前提下，PROD Cluster 级灾难恢复目标为 `RPO <= 5min`。
- 每天执行一次在线 Physical Base Backup，目标使用 `prefer-standby`；没有可用 Standby 时允许回退 Primary，但必须监控对业务 I/O 的影响。
- 统一将备份调度器运行时区固定为 UTC。北京时间每天 `02:30` 对应六段 Go Cron `0 30 18 * * *`；文档和管理后台同时显示 UTC 与 `Asia/Shanghai` 时间，不能依赖容器隐式本地时区。
- PROD 使用 30 天 Recovery Window，DEV 使用 7 天 Recovery Window；Retention 由 Barman Cloud Plugin `ObjectStore` 管理，不能再写入已废弃的 Cluster 内置备份字段。
- Barman Cloud Plugin 对 Base Backup 与 WAL Archive 统一启用 `LZ4` 压缩，在当前规模下优先降低对象存储与网络占用，同时避免 `gzip` 等高 CPU 压缩显著拉长备份窗口；压缩算法属于版本化 `ObjectStore` 运维配置，不写入平台业务代码。
- `LZ4` 不能替代容量规划。平台必须根据实际压缩后 Base Backup、WAL 生成率、30 天/7 天 Recovery Window、Versioning 与 Object Lock 统计未来容量；预计超出 `postgres-backup` Bucket Class Operating Quota或 Cluster 50%-Raw Planning Boundary时必须先扩容或经过受控架构变更，禁止静默缩短 Recovery Window、删除仍受保留策略保护的对象或把压缩率当作固定保证。
- 备份 Bucket 必须使用 TLS、服务端加密和 Versioning；近期备份对象使用默认 7 天 `GOVERNANCE` Object Lock。备份 Workload 的最小权限凭据由 OpenBao 管理，不授予绕过保留锁或跨环境访问权限。
- 按当前不超过 50 GiB PGDATA 的容量基线，PROD Cluster 级恢复目标为 `RTO <= 60min`；该目标必须由实际恢复演练测量，数据量、网络或对象存储性能变化后重新校准。
- 高风险 Schema Migration、PostgreSQL 升级、存储维护或可能破坏数据的运维动作前必须创建并验证按需备份；第一阶段不增加周期性 CSI Snapshot，只在上述高风险操作前按需使用。
- DEV 每月执行一次完整恢复验证；PROD 每季度把备份恢复到网络隔离的临时恢复环境，校验 PITR、数据库一致性、关键业务查询和实测 RPO/RTO，保存结果与 Audit 后销毁临时环境。
- WAL 归档延迟超过 RPO、Base Backup 失败、Recovery Window 不完整、Object Lock/Versioning 异常或恢复演练失败必须立即告警；不能只依据 `Backup` 对象创建成功就宣称备份可恢复。
- 当前备份只覆盖同一站点内的 Cluster 级故障；备份 Bucket 与 Object Storage 本身遭遇站点级损毁时不承诺恢复，Site DR 仍属于未来独立演进能力。

- 缓存使用 Valkey/Redis-compatible 协议；Valkey 只保存 Session 热数据与撤销索引、短期缓存、限流计数、幂等键、短期锁等可重建状态，不保存文件或不可替代的业务事实。
- Valkey 固定使用 `9.1` 版本线，首次部署版本为官方 `9.1.1-trixie` 镜像；镜像必须在 GitOps 中锁定 digest，禁止使用 Alpine、`latest` 或其他浮动 tag。
- `9.1.x` 补丁升级必须先在 DEV 验证 RESP Client、Sentinel Discovery、ACL、TLS、AOF/RDB 加载和 Failover，再发布到 PROD。
- Valkey 滚动升级顺序固定为 Replica 优先、Primary 最后；先升级 Replica 并等待复制追平，再通过受控 Sentinel Switchover 切换 Primary，最后升级原 Primary。
- Valkey 不自动跨 `9.1` 版本线；未来 Minor/Major 升级必须独立验证命令、RESP、复制协议、Sentinel、AOF/RDB 格式、Client 和回滚兼容性。
- 首版 Valkey HA 拓扑固定为 1 个 Primary、2 个 Replica 和 3 个 Sentinel，Sentinel quorum 为 2；当前规模不启用数据分片。
- Valkey、Replica 和 Sentinel 必须通过 Pod Anti-Affinity、Topology Spread、PodDisruptionBudget 和独立故障域调度，避免单个 Node 故障同时破坏多数派。
- 首版不使用 Valkey Operator；使用版本与镜像 digest 锁定的 Helm/GitOps 清单部署，升级前必须在 DEV 验证故障切换和回滚。
- Valkey 数据连接、Primary/Replica 复制和 Sentinel 通信全部只开放 TLS 端口；关闭明文数据端口，启用 TLS Replication，任何 TLS、身份认证或 ACL 校验失败都必须 Fail Closed。
- Valkey 启用双向 TLS，所有应用 Client、Replica、Sentinel 和监控 Client 都必须提交受信任的客户端证书；证书信任根、签发策略和吊销由 OpenBao PKI 管理，cert-manager 负责 Kubernetes 内的申请、短周期轮换和到期续签。
- 工作负载优先以内存文件接收证书和私钥；cert-manager 或基础设施组件因技术约束必须使用 Kubernetes TLS Secret 时，只允许在专用 Namespace 中以最小 RBAC 访问，并启用 etcd 静态加密、短有效期和自动轮换，禁止把私钥写入 Git、Helm Values、普通 YAML、镜像或日志。
- Valkey 同时启用 ACL 并关闭 `default` User；ACL 凭据由 OpenBao 管理，以内存文件注入，不通过环境变量、源码或部署清单传递。
- 每个可独立部署的服务、复制链路、Sentinel、监控和 Break-glass 运维用途使用独立身份；同一进程内的领域模块不伪造独立 ACL User，而由该 Deployable Unit 的 Cache Adapter 统一访问。
- 普通服务身份只允许其业务所需命令和 Key Prefix；禁止 `CONFIG`、`MODULE`、`DEBUG`、`FLUSHALL`、`FLUSHDB`、`SHUTDOWN`、`REPLICAOF` 和 ACL 管理等高风险能力。Break-glass 身份默认禁用，不保留长期高权限凭据，启用、使用和回收必须审计。
- NetworkPolicy 只允许已批准的应用、Valkey、Sentinel、监控和证书管理 Workload 访问对应 TLS 端口；证书轮换采用新旧证书短时重叠和自动重载，不能依赖人工重启完成常规续签。
- 客户端证书临近到期、自动续签失败、TLS 握手异常、认证失败、ACL 拒绝和异常高权限命令尝试必须进入统一 Metrics、Alert 与 Audit。
- 应用只能通过 Cache Port/Adapter 和 Sentinel-aware Client 发现当前 Primary，不得在业务模块中写死实例地址、Sentinel Master Name 或供应商连接方式。
- Sentinel 使用异步复制，故障窗口内允许丢失少量可重建缓存状态；PostgreSQL 继续保存 Session、安全和业务权威事实，文件由 Object Storage 保存。
- Valkey 使用 `maxmemory-policy=noeviction`；所有由平台写入的 Session 热数据、撤销索引、缓存、限流、幂等和锁 Key 都必须设置与业务语义一致的 TTL，禁止依赖内存压力静默淘汰。
- `maxmemory` 必须显式设置并低于 Pod Memory Limit，为进程、复制、AOF、客户端和内存碎片预留余量；达到上限时拒绝新增写入并立即告警。
- Valkey 开启 AOF，使用 `appendfsync everysec`，同时生成周期性 RDB；每个数据实例使用独立 PVC。AOF/RDB 用于缩短重启和 Cluster 级恢复时间，不成为业务权威备份。
- Valkey 在数据发生变化时每小时生成一次 RDB，PVC 只保留当前有效 RDB 并持续保留 AOF；不为 Valkey 建立独立的长期历史备份集。
- Cluster 级备份可以包含 Valkey PVC，但恢复流程不得依赖该副本；当快照不可用、损坏或过旧时直接从 PostgreSQL 和领域事实重建。
- 普通缓存读取失败时允许回源 PostgreSQL；涉及 Session 撤销、限流、幂等和锁的安全或一致性操作在 Valkey 写入失败时必须 Fail Closed 或进入明确降级状态，不能静默放行。
- Valkey 完全丢失时从 PostgreSQL 和领域事实重建；Session 与撤销校验在缓存不可用期间必须回查权威数据，不得把“缓存不存在”解释为“允许访问”。
- 未来需要容量分片或迁移云服务时，可在 Cache Adapter 后独立切换 Valkey Cluster 或云 Redis-compatible 服务。

Valkey 首年容量基线：

| 环境 | 单个 Valkey 数据实例 Request | 单个 Valkey 数据实例 Limit | `maxmemory` | 单实例 PVC |
| --- | --- | --- | --- | --- |
| DEV | 100m CPU / 256 MiB | 500m CPU / 512 MiB | 192 MiB | 5 GiB |
| PROD | 250m CPU / 512 MiB | 1 CPU / 1 GiB | 384 MiB | 10 GiB |

- DEV 与 PROD 均保持 3 个 Valkey 数据实例和 3 个 Sentinel，只调整容量。
- PROD 每个 Sentinel 的 Request 为 50m CPU / 64 MiB，Limit 为 200m CPU / 128 MiB；DEV 对应数值减半。
- PROD 三个 Valkey 数据实例合计 Request 为 0.75 CPU / 1.5 GiB、Limit 为 3 CPU / 3 GiB、PVC 为 30 GiB；Sentinel 资源另计。
- 上述数值是 Kubernetes Pod/Container 配额，不是物理服务器或 Kubernetes Node 规格。整套 Cluster Node 容量必须在汇总 PostgreSQL、NATS、Temporal、OpenBao、Object Storage、Observability、平台服务和 Sandbox 后另行计算，并保留系统与故障切换余量。
- 资源调整属于 Helm/GitOps 部署配置，不修改业务代码；扩容前后必须验证 Sentinel failover、AOF Rewrite、延迟和内存告警。

- 可靠事件使用 NATS JetStream；业务事实仍在 PostgreSQL，JetStream 不做永久主存储。
- Secret Manager 使用 OpenBao。
- Object Storage 使用 S3-compatible 接口；具体实现可独立替换。
- Workflow 编排采用 Temporal，领域事实仍由 Control Plane 保存。
- 全链路使用 OpenTelemetry 标准；日志与 Metrics 使用精简但 HA 的生产后端。Trace 首版采用正式的可恢复部署，但明确不宣称 Tempo Backend HA；Trace 是诊断数据，不是业务、Audit、Attempt Log 或 Artifact 的权威事实源。
- 首版不部署 Mimir、Kafka 或全分布式 Loki/Tempo；文档必须保留扩展到分布式 Observability 的替换步骤。Tempo 3.x Monolithic `target=all` 在每个环境只运行 `1`个 Replica，不通过复制不受支持的 Monolithic Pod 冒充 HA；其 Trace Block写入本环境独立的 S3-compatible Object Storage，历史 Trace在 Tempo恢复后继续可查。
- Tempo不可用时，本环境的双副本 OpenTelemetry Gateway通过各自独立 `10 GiB` RWO有界持久 Queue继续接收并重试 Trace，按已验证峰值提供默认 `4h`缓冲目标；Tempo恢复后自动 Replay，故障期间 Trace查询允许不可用。时间或容量任一先耗尽即达到边界，之后允许丢弃诊断 Trace，但必须计数、告警并显示缺口，不能阻塞平台核心业务，也不能宣称零丢失；完整规则以 9.10为准。
- 未来需要 Trace Backend HA时，通过 Observability Adapter、OTLP和 Grafana Data Source Contract切换到 Tempo Microservices与经批准的 Kafka-compatible持久队列；迁移必须新增 PCS、Dual Write/Query Parity、容量、故障与回退验证，不修改领域模块。
- Kubernetes 网络和 Sandbox 隔离按 Cilium/NetworkPolicy、Kata Runtime 等正式基线设计。

### 9.4 Temporal（已确认）

- Workflow Orchestration通过稳定 `WorkflowOrchestratorPort`接入 Temporal；Requirement、WorkItem、Attempt、Gate、Assignment、Artifact、Audit和外部 Effect Ledger等领域事实仍由 Control Plane/PostgreSQL保存。Temporal History只保存 Workflow执行所需的 ID、Version、Timer和非敏感控制元数据，不保存源码、Prompt、Model Token、Secret、完整附件或可替代领域数据库的业务对象；Activity按 ID经授权 Adapter读取当前事实。
- 截至本轮确认的首个 PCS Candidate固定采用官方 Temporal Helm Chart `1.6.0`、Temporal Server/Admin Tools `1.31.2`、Temporal UI `2.52.0`和 Python SDK `1.30.0`，全部锁定 Chart/Artifact/Image Digest。PCS冻结前仍按既定规则复核安全 Patch、Release Note、Provenance和 Compatibility，不能自动追随浮动版本。Chart `1.6.0`搭配 Server `1.31.2`时必须显式设置 `shims.dockerize=false`、`shims.elasticsearchTool=false`，不能照抄为旧 Server保留的兼容默认值。
- DEV与PROD复用同一 Helm/GitOps拓扑模板并在各自 Cluster独立实例化：Frontend、History、Matching和 Temporal System Worker各 `2`个 Replica；`internal-frontend=false`，不保留绕过外部 Authorizer的内部管理入口。四类 Server Service使用 Required Pod Anti-Affinity、Topology Spread、独立 ServiceAccount、PriorityClass和 `PDB minAvailable=1`，Deployment固定 `maxUnavailable=0`、`maxSurge=1`；任一环境已有 Node/Replica故障或无法保持双副本时停止自愿升级，先恢复 HA。
- Temporal System Worker是 Server内部后台服务，不等同于承载平台 Workflow/Activity代码的 Platform Orchestrator Worker。Platform Orchestrator Worker作为独立 Deployable Unit稳态同样使用 `2`个 Replica、专用 ServiceAccount/Task Queue/Identity和 NetworkPolicy；Sandbox/Agent仍按 Execution Binding在隔离 Runtime执行，不能把用户代码塞进 Temporal Server Pod。
- 首个 Cluster固定 `numHistoryShards=512`，两个环境保持相同；该值在建立 Persistence后不可原地修改，也不能用“30 DAU”直接推导为官方容量结论。PCS Activation必须以预期峰值至少 `2x`的 Workflow Start/s、Task/s、Open Workflow、History Event/Bytes、Timer、Activity Heartbeat、Visibility List/Filter QPS和数据库延迟完成业务模型压测；不能只看员工数或 Pod Running。
- Helm Chart的默认单副本、空 Resources/PDB/Topology和永久 Admin Tools都不是生产配置。常驻 Admin Tools关闭，建库、Namespace、Schema、诊断和恢复只使用精确版本、短生命周期、受 NetworkPolicy和 Audit约束的 Job；Server `1.30+`在 mTLS场景保留 TCP Readiness Probe，不切换为目标 Kubernetes尚不支持 TLS的 gRPC Probe。

Temporal Persistence与 Visibility：

- 每个环境在现有 CloudNativePG HA Cluster中建立相互隔离的 `temporal`与 `temporal_visibility`数据库；两库使用 `postgres12_pgx` Schema/Driver Family、独立 Runtime Role和 Credential。该名称表示 PostgreSQL `12+`兼容族，不表示把已确认的 PostgreSQL `18.4`降级为 12；PCS必须验证目标 Temporal Patch、PG18.4、TLS、Failover和 Schema组合。
- Runtime Identity只具备目标数据库所需 DML权限，按照上文 `32`连接总预算直连本环境 CloudNativePG `rw` Service；建库和 core/visibility Schema变更由独立临时 DDL Identity直连执行。Helm设置 `createDatabase=false`、`manageSchema=false`，Schema Job必须在 Server Rollout前成功并保存版本/Evidence，Runtime Identity不能自动改 Schema。
- 数据库静态最小权限凭据沿用既定首版策略，由 OpenBao Agent Injector写入 Pod `tmpfs`文件；Temporal `1.31`通过受控 `passwordCommand`读取，不把密码写进 Helm Values、ConfigMap、Environment Variable或日志。Credential Rotation、连接重建与 CloudNativePG Switchover必须在 DEV验证，失败时 Fail Closed。
- 首版 Default Store与 Advanced Visibility都使用 PostgreSQL，不部署 Cassandra、Elasticsearch或 OpenSearch。PostgreSQL Visibility是官方支持但面向当前小规模的 Compact Profile，不宣称为所有吞吐规模的通用最优方案；`executions_visibility`必须启用经验证的积极 Autovacuum、表/索引/Bloat/Dead Tuple监控，并为 `REINDEX ... CONCURRENTLY`预留至少一个目标索引大小的临时空间。
- Visibility List/Filter p95持续 `15min`超过 `500ms`、错误率持续超过 `1%`、Visibility负载持续占用 PostgreSQL CPU或 I/O预算 `30%`以上、索引 Bloat维护后仍超过 `30%`，或 30天增长预测突破当前数据库容量安全水位时，进入 `VISIBILITY_SCALE_REVIEW`并阻止继续宣称当前 Profile有余量。确认是 Backend瓶颈后，通过新 PCS引入 OpenSearch `2+`、Temporal Dual Visibility、Backfill/Checksum/Query Parity和受控 Cutover；切换只替换 Visibility Store Mapping，不修改领域模块，也不自动部署新集群。

Temporal Security与 Console：

- Temporal全部 Service仅使用 ClusterIP且不直接暴露公网。Internode与 Frontend分别启用由当前 PKI签发的 mTLS，开启证书主机名校验，Frontend `requireClientAuth=true`；Cilium/NetworkPolicy只允许 Temporal Server成员、Platform Orchestrator Worker、平台只读 Operations Adapter和受控 Job访问对应端口。
- Frontend明确启用 `claimMapper=default`、`authorizer=default`，禁止 `noopAuthorizer/nopAuthority`。mTLS只验证传输和客户端证书，不自动产生 Temporal Permission Claim；Identity模块通过稳定 `ServiceIdentityPort`提供内部 Machine JWT Issuer/JWKS，Signing Key由 OpenBao Transit保护，SDK通过 Authorization Metadata提交短期 Token。Token默认 TTL `10min`、在半程前刷新、最大 TTL `30min`，不可配置为永不过期；Issuer、Audience、Subject、JTI、Expiry和 `<namespace>:read|write|worker|admin` Claim全部校验失败即拒绝。
- 两个环境均显式创建逻辑名为 `engineering-platform`的本地 Temporal Namespace，不依赖 `default`；物理 Cluster、Namespace ID、JWT Issuer/Audience、证书、数据库和状态不跨环境共享。Orchestrator Client、SDK Worker、只读 Operations Adapter和一次性 Admin Job使用不同身份，分别仅获得 `write`、`worker`、`read`和受控 `admin`权限；用户、Agent或 Sandbox不直接持有 Temporal Client Credential。
- Temporal UI使用 `2`个无状态 Replica，并通过平台管理后台的受控入口在新标签页打开；`platform-gateway`先校验当前平台 Session、`temporal.console.read` Capability和 Scope，再由 Console Access Adapter使用只读 Temporal服务身份访问。浏览器不获得 mTLS私钥、Machine JWT或 Admin权限，Temporal UI的写入/批处理/终止操作被 Authorizer拒绝；需要管理写操作时只能走平台受 Capability、TOTP、原因和 Audit约束的命令或短期 Job。

Temporal Workflow、Retention与版本发布：

- Namespace中已关闭 Workflow History默认保留 `30d`；Super Admin可以在平台级 `7–90d`范围内通过 Impact Preview、容量校验、TOTP和 Audit发布新值。变更只影响新值生效后关闭的 Workflow，不重写已有 Closed Workflow的 Cleanup Timer；Active Workflow不受 Closed Retention清理。平台业务事实、Artifact和 Audit继续遵循各自更长的 Retention，Temporal清理不能级联删除它们。
- 首版同时关闭 History Archival和 Visibility Archival；截至当前官方仍将 Archival标记为 Experimental，且它不等于活动集群 Backup/PITR。未来确需长期保存原始 Workflow History时，必须先以新 PCS验证 S3 Archiver、Ceph RGW、不可变 URI、恢复/查询、容量、安全和版本兼容；不得把首版写成后台开关即可无迁移启用。
- Platform Orchestrator使用 Temporal `1.31` GA Worker Deployment/Worker Deployment Version语义，不使用将在后续 Server移除的旧 Version Sets/Assignment Rules。每个 Worker Build ID绑定不可变 Application Image Digest、SDK/Workflow Code/Skill/Policy兼容资料；普通 Kubernetes Rolling Deployment不能替代 Worker Versioning。
- Worker发布采用同一 Deployment Name下 Current + Ramping并行的 Blue/Green/Rainbow语义：新 Workflow受控进入 Ramping Version，通过 Replay、Smoke、Error/Latency和业务 Gate后再提升 Current；Attempt Workflow默认 Pinned到开始时的 Worker Version，不能在执行中静默换代码。新旧 Worker组并存期间 Capacity Profile必须保留一整组 Application Worker的 Rollout Headroom。
- 旧 Worker Version只有在没有 Active/Pinned Workflow、状态已进入 Drained且 Evidence完整后才允许进入回收倒计时；对应 Image/Digest至少保留到 `drainedAt + 本环境 PostgreSQL Recovery Window + 7d Safety Margin`。PITR演练必须能按 Build ID重建旧 Worker，否则数据库虽然恢复但 Workflow不可 Replay时不得宣称恢复成功。
- Workflow/Activity必须遵守确定性、有限 History和幂等副作用边界；外部 GitLab、Model、Object Storage与 Sandbox操作使用稳定 Idempotency Key并写 Effect Ledger。瞬时错误可由 Temporal执行有界 Retry，永久业务错误、未知结果、权限失败或 Execution Binding变化不得无限重试；长时间 Activity使用 Heartbeat、Timeout和 Cancellation，恢复/重投不得产生第二份未 Fence副作用。

Temporal首年资源与运行基线：

| 组件 | 每个环境副本数 | 单 Pod CPU Request / Limit | 单 Pod Memory Request / Limit |
| --- | ---: | --- | --- |
| Frontend | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| History | 2 | `500m / 2 CPU` | `1 GiB / 2 GiB` |
| Matching | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Temporal System Worker | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Platform Orchestrator Worker | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` |
| Temporal UI / Console Access Adapter | 2 | `100m / 500m` | `256 MiB / 512 MiB` |

- DEV与PROD首个 Candidate使用相同副本拓扑和上述单 Pod起始 Envelope；后续可以通过各自 Environment Capacity Profile在不降低 HA/安全机制的前提下调整容量。稳态合计 Request约为 `3.2 CPU / 6.5 GiB`，Limit约为 `13 CPU / 13 GiB`；这些是 Cluster内多 Pod预算，不是一台独立服务器规格，也不能把 Limit简单相加当作稳态占用。
- 四类 Server Deployment若在同一 GitOps Wave同时各 Surge一个 Pod，需要额外约 `1.25 CPU / 2.5 GiB` Request；Worker Versioning发布还需预留一整组 `2`个 Platform Orchestrator Worker，即额外 `500m / 1 GiB` Request。OpenBao Sidecar、Schema/Namespace Job、DaemonSet和 Observability开销另计；最终 Environment Capacity Profile必须在单 Node故障后仍容纳必要稳态 Replica、PDB和 Rollout Headroom。
- 首版固定 Replica且不启用 Temporal HPA/VPA。Metrics持续观测 Service Request/Error/Latency、Persistence Request/Error/Latency、Workflow完成状态、Task Queue Backlog/Age、History Size/Event、Shard Ownership、Worker Poll/Slot/Heartbeat、Visibility、数据库连接与资源；扩容只生成新的 GitOps Capacity Candidate，并经 DEV压测和故障验证后激活。

Temporal升级与恢复边界：

- 升级顺序固定为验证备份与恢复点 → 依次升级 `temporal` core和 `temporal_visibility` Schema → 逐服务滚动 Server → 通过 Worker Versioning发布 Application Worker。Server Minor必须顺序升级，不能跨 Minor；每个 Minor至少等待 History Shard加载和关键指标稳定 `10min`后再继续。Server `1.31`首次 Schema Candidate为 PostgreSQL core `1.19`、visibility `1.14`，冻结时必须与精确 Release重新核对。
- CloudNativePG物理 Backup/PITR一致覆盖业务库、`temporal`和 `temporal_visibility`，但它不会撤销恢复点之后已经发生的 GitLab、Model、Object Storage或 Sandbox外部副作用。恢复固定先 Fence Temporal写入口和全部 SDK Worker，再执行 PG PITR；随后以相同 Server/Schema/Shard/Namespace配置启动，校验 Visibility与 Worker Build映射，通过 Outbox/Inbox/Effect Ledger对账并处置不确定副作用后才重新放开 Worker。
- 现有 PostgreSQL `RPO <=5min / RTO <=60min`只能作为 Temporal Persistence层的首年 Candidate；端到端 Workflow Recovery必须同时验证 Server、Namespace、旧 Worker Image、Task Queue、外部副作用对账和重新 Poll，演练未达标时展示实测值并修订 Capacity/Runbook，不能把数据库恢复时间直接冒充完整 Workflow RTO。
- 当前只承诺单站点 Cluster HA、单 Host故障和逐节点维护，不宣称 Site DR或 Temporal Global Namespace HA；DEV Cluster不是 PROD Standby。未来确需 Multi-Cluster Replication时，必须创建包含独立 PROD Standby Cluster、数据库、Namespace Failover、Worker双写/部署、网络、证书、冲突和演练的新 PCS，不改变领域模块的 `WorkflowOrchestratorPort`。

### 9.5 NATS JetStream（已确认）

- NATS Server 固定使用 `2.14` 版本线，首次部署版本为官方 `2.14.4-scratch` 镜像；官方 NATS Helm Chart 固定为 `2.14.2`。Chart 与 Server Patch 版本允许不同，Server 镜像通过 Chart 支持的覆盖能力独立指定。
- Helm Chart、NATS Server、Config Reloader、Metrics Exporter、`nats-box` 等所有镜像和安装制品必须在 GitOps 中锁定精确版本与 digest，禁止使用 `latest`、`2.14` 或其他浮动引用。
- NATS Server 使用无 Shell、无包管理器的 `scratch` 镜像以缩小运行时攻击面；诊断通过平台管理后台、Metrics、受控的临时 `nats-box`/Debug Pod 和 Audit 完成，不能把登录业务 Pod 执行 Shell 作为正式运维能力。
- NATS Client Port 和 Cluster Route 全部使用 TLS；Client 连接必须通过 mTLS 验证 Workload Certificate，Cluster Route 使用独立的 Route Certificate 执行双向验证，禁止明文连接、`insecure` 校验和匿名连接。
- NATS Server Certificate、Client Certificate 与 Route Certificate 使用相互隔离的 OpenBao PKI Role 和用途约束，由 cert-manager 申请、短周期轮换与续签；证书或私钥的交付规则沿用平台 Secret 基线。
- 首版使用 Server Configuration 管理显式的 `PLATFORM` 与 `SYS` Account，不使用默认全局 `$G` Account；`PLATFORM` 只承载平台业务消息，`SYS` 只承载 NATS System Event、监控和受控运维请求，两者不得共享业务 User 或 Subject Namespace。
- 每个可独立部署的服务或运维用途使用独立 NKey User，并同时满足 mTLS 和 NKey Challenge 才能建立 Client 连接；同一进程内的领域模块共用该 Deployable Unit 的 Event Bus Adapter 身份，不伪造无法独立轮换的模块身份。
- NKey Public Key、Account 和 Subject Permission 属于非 Secret 的版本化 GitOps 配置；NKey Seed 由 OpenBao 保存并以内存文件注入，禁止进入源码、镜像、普通 YAML、Helm Values、环境变量或日志。
- 每个 NKey User 使用 Publish/Subscribe Allowlist，只授予其命令、事件、Queue Group、Reply Inbox 和必要 JetStream API Subject；默认禁止跨领域通配符、`$SYS.>`、不必要的 `$JS.API.>` 和其他管理 Subject，Deny 与 Allow 重叠时按 Deny 生效。
- 平台 Sandbox 不获得 NATS 网络连通性、Client Certificate 或 NKey Seed；需要消息交互时只能通过平台控制的 Connector/Worker，由该 Deployable Unit 使用独立、最小权限身份代理。
- NATS Monitoring Port 使用 HTTPS，但因其不继承 Client mTLS 身份映射，必须通过 NetworkPolicy 只允许 Metrics Collector 和平台运维聚合服务访问，禁止通过 Ingress、LoadBalancer 或公网直接暴露。
- NetworkPolicy 只允许批准的 Client Workload 访问 Client TLS Port，只允许 NATS Pod 相互访问 Route Port，只允许监控 Workload 访问 Monitoring Port；任何 TLS、NKey 或 Subject Permission 校验失败都必须 Fail Closed。
- 普通身份不具备 Account、User、Stream 或 Consumer 管理权限；Break-glass 运维身份默认禁用且不保留长期可用 Seed，启用、使用、轮换和回收必须进入 OpenBao Audit 与平台 Audit。
- 首版不部署 JWT Resolver、Auth Callout 或用户名密码/Token 认证。未来出现大量独立服务、多团队或多租户后，可把当前实际使用的 Event Bus Credential Provider 从静态 NKey Seed 切换为 Operator/Account/User JWT Credentials，不修改领域模块或 Event Bus Port。
- NKey/Certificate 轮换采用短时新旧身份并存、逐 Workload 重连和旧身份吊销；认证失败、Permission Violation、异常连接、Seed 轮换失败与证书临近到期必须进入 System Event、Metrics、Alert 与 Audit。
- DEV 与 PROD 均使用 3 节点 NATS JetStream Cluster；所有业务 Stream 使用 `File Storage` 和 `Replicas=3`。
- 每个 NATS Node 使用独立的 20 GiB PVC 和本地快速磁盘，不允许多个 Node 共享同一个 NFS/NAS 存储目录。
- JetStream 负责可靠投递、有限时间重放和失败隔离，不是业务事实、Audit 或文件的永久存储；权威事实、Outbox、Inbox 和 Audit 继续保存在 PostgreSQL。
- 平台业务 Subject 固定使用 `platform.<kind>.<domain>.<message>.v<major>` 五段结构；`kind` 首版只允许 `command`、`event` 和 `dlq`，其余类型必须经过架构评审后加入 Subject Catalog。
- Subject Token 统一使用小写 ASCII 字母、数字和下划线，禁止空格、中文、大小写混用和在 Token 内使用通配符；Command Message 使用祈使动作名称，Event Message 使用已经发生的事实名称。
- 示例分别为 `platform.command.requirement.create.v1`、`platform.event.requirement.created.v1` 和 `platform.dlq.requirement.create.v1`；Publisher 必须发布完整 Subject，不能发布通配符。
- `PLATFORM_COMMANDS` 只接收 `platform.command.>`，`PLATFORM_EVENTS` 只接收 `platform.event.>`，`PLATFORM_DLQ` 只接收 `platform.dlq.>`；Stream Filter、NKey Permission 与 Subject Catalog 必须由同一份版本化部署配置校验一致性。
- DEV 与 PROD 均按同一三节点 NATS/GitOps 拓扑模板实例化当前环境的 NATS Cluster 和 Account；Message、Stream State、Credential 与故障域不跨环境共享。Subject 因此不包含环境、Cluster、Namespace、Pod 或部署实例名称；Workspace ID、Requirement ID、Attempt ID、User ID 等业务实例数据放入 Message Envelope，不进入 Subject。
- Subject 最后一段是该消息契约的独立 Major Version。向后兼容的可选字段新增不改变 Subject；删除字段、修改既有字段语义或类型等破坏性变更必须发布新的 `v<major>` Subject。
- 破坏性升级期间允许旧版和新版 Subject 并行，由 Consumer 显式声明支持版本；迁移完成前不得把旧 Subject 原地改义。Subject Mapping 只作为有截止时间、可观测、可回滚的迁移桥梁，不能成为长期隐藏兼容层。
- Subject 不承载完整 Payload Schema、敏感信息或动态路由数据；消息契约、Owner、生产者、消费者、Schema 和弃用时间统一登记在版本化 Subject Catalog 中。
- Event 严格使用 CloudEvents `1.0.2` Structured JSON；NATS Message Payload 为完整 JSON Event，Content Type 使用 `application/cloudevents+json`，不把 CloudEvents Context 拆散到依赖特定 Event Bus 的私有 Header 中。
- Event 必须包含 `specversion`、全局唯一 `id`、稳定逻辑 `source`、版本化 `type`、UTC `time`、业务 `subject`、`datacontenttype`、`dataschema` 和 `data`；`source` 表示逻辑生产者，禁止写入 Pod 名、IP 或临时实例 ID。
- Event 的 CloudEvents Extension 固定使用小写属性名 `correlationid`、`causationid`、`traceparent`、`actorid` 和 `workspaceid`；字段不适用时按契约省略，禁止用空字符串伪造上下文。
- Command 使用平台 `CommandEnvelope v1` 和 `application/json`，不是 CloudEvent，也不得伪装成已经发生的业务事实；Command 与 Event 共享 `id`、`type`、`source`、`time`、`subject`、`datacontenttype`、`dataschema`、Correlation/Causation/Trace、Actor/Workspace Context 和 `data` 的语义。
- Event `type` 与 Command `type` 使用稳定、版本化的业务契约名称；NATS Subject 负责路由，Envelope `type` 负责跨 Event Bus 识别，两者的映射必须在 Subject Catalog 中唯一且可校验。
- Event 与 Command 的 `data` 均为 UTF-8 JSON，并由 Subject Catalog 引用的版本化 JSON Schema 校验；首版 Schema 随代码和部署制品版本管理，不额外部署 Schema Registry 服务。
- Producer 在发布前必须校验 Envelope 与 Payload Schema；Consumer 在进入领域逻辑前再次校验。未知 Major Version、缺失必填字段或 Schema 不合法属于永久失败，不能以无限重试掩盖契约错误。
- Event Bus Adapter 负责 CloudEvents/NATS 编解码、Schema 校验和未来协议转换；领域模块只接收类型化 Command/Event，不直接依赖 NATS Message、JetStream Header 或 CloudEvents SDK 对象。
- DLQ Message 保存原始 Subject 与原始 Envelope，并添加失败 Consumer、错误代码、脱敏摘要、投递次数、首次/最后失败时间和必要的 JetStream 定位信息；禁止把 Secret、完整 Stack Trace、Prompt 或敏感文件内容复制到 DLQ。
- 单条消息仍受 256 KiB 总线限制；超限业务数据使用 Object Storage Claim-Check/Object Reference，Envelope 只保存引用、摘要和完整性校验信息。
- NATS/JetStream 的平台语义固定为 At-Least-Once Delivery；架构承诺的是通过 Transactional Outbox/Inbox 实现 Exactly-Once Business Effect，不宣称网络传输或消息投递绝对只发生一次。
- 领域状态变更、Audit 和待发布 Outbox Record 必须在同一个 PostgreSQL Transaction 中提交；业务事务不得直接把“已经发送到 NATS”作为唯一成功证据。
- Outbox Relay 使用 JetStream Publish API 并等待 Server Persist ACK，发布时设置 `Nats-Msg-Id=Envelope.id`；只有收到成功 ACK 后才能标记 Outbox 已发布，超时或结果不确定时使用同一个 Message ID 重试。
- JetStream Duplicate Window 只用于吸收短时间重复发布，不作为最终一致性边界；即使重复发生在窗口之外，Consumer Inbox 仍必须保证业务结果幂等。
- Consumer 统一使用版本化配置创建 Durable Pull Consumer、`AckPolicy=AckExplicit` 和 File-backed R3 Consumer State；禁止用 Ephemeral、`AckNone` 或处理前 ACK 承载平台业务命令与事件。
- Consumer 以 `(consumer_id, message_id)` 作为 Inbox Unique Key；Inbox Record、领域状态变更、Audit 和后续 Outbox Record 必须在同一个 PostgreSQL Transaction 中提交。
- 数据库 Transaction 成功提交后才允许执行 `AckSync`；如果 Commit 成功但 ACK 丢失，下一次投递必须命中 Inbox 并跳过业务副作用，然后再次 `AckSync`。
- Command Contract 只有一个 Owner Durable Consumer，但允许多个同版本 Worker Instance 共享该 Pull Consumer 横向处理；每个 Event 下游 Deployable Service 使用独立 Durable Consumer，互不共享消费进度。
- Consumer 默认 `MaxDeliver=8`，Backoff 依次为 `30s`、`2m`、`10m`、`30m`、`2h`、`6h`、`12h`、`24h`；数值可按 Consumer 通过版本化部署配置调整，但禁止无限重投。
- 可恢复基础设施或依赖错误按当前 Delivery Count 使用对应延迟重试；处理时间可能超过当前 ACK Window 时发送 In-Progress ACK。长时间业务执行应启动持久化 Workflow/Attempt 后 ACK，不能把 NATS Message 长期占用当作任务运行状态。
- Schema 不合法、未知 Major Version、权限或业务前置条件永久失败时不得继续 Backoff；必须先在 PostgreSQL 记录失败证据并写入 DLQ Outbox，再终止该 Consumer 的后续投递。
- 达到 `MaxDeliver`、Consumer Lag 持续增长、ACK 延迟异常、Outbox 积压、Inbox 冲突异常或 DLQ 写入失败必须告警；DLQ 持久化失败时不得静默 ACK 原消息。
- 对 GitLab、Model Provider、Object Storage 等数据库外部副作用，Inbox 只能防止平台事务重复，Connector 还必须传递稳定 Idempotency Key 并保存 Effect Ledger；供应商不支持幂等时必须进入可对账的不确定状态，不能虚构 Exactly-Once 保证。
- DLQ 禁止自动 Redrive；普通瞬时故障由 Consumer Backoff 处理，进入 DLQ 后必须先定位并修复根因，再由具备明确 Capability 的人员受控恢复，避免 Poison Message 或外部副作用形成消息风暴。
- 管理后台通过后端聚合接口提供 DLQ 列表、原始 Envelope、失败 Consumer、投递历史、错误分类、关联 Audit 和 Redrive 结果；浏览器不得直连 NATS 或获得运维 NKey。
- DLQ 查看与恢复分别要求 `event_bus.dlq.read` 和 `event_bus.dlq.redrive` Capability，并按当前环境和授权 Scope 校验；DEV 不能 Redrive PROD 消息，PROD 也不能把消息发往 DEV。
- 每次 Redrive 必须填写原因，支持单条或受控批次；单次默认最多 100 条，批次上限属于版本化平台配置，超过上限必须拆分操作，不能通过前端循环绕过。
- Redrive 前必须重新校验原 Subject、Major Version、JSON Schema、目标 Stream、目标 Durable Consumer、当前 Contract 状态和操作人权限；任一条件失败时整条消息不得发布，并返回可定位原因。
- 原始 DLQ Message 在保留期内不可修改；Redrive 必须复制原始 Payload 创建新的 Envelope `id`，增加 `replayof=原消息ID`，保留原 `correlationid`，并令新消息 `causationid` 指向原消息。
- 每个 Redrive Operation 使用唯一 Request ID 并持久化；相同 Request ID 重试必须返回已创建的新消息和结果，禁止因重复点击产生多份 Redrive Message。
- 原 DLQ Record、Redrive Operation、新旧 Message 关系和最终消费结果必须持续可查询；JetStream 90 天 DLQ Payload 到期后，PostgreSQL 中的失败索引、关系与 Audit 仍按平台审计保留规则保存。
- 禁止在 DLQ 页面直接编辑 Payload、Subject 或 Actor 后重放；数据本身错误时必须通过正常业务 API 创建新的修正 Command，并显式关联原失败 Message。
- Redrive 请求、权限判定、校验结果、发布 ACK、重复请求、再次失败和最终处理结果全部写入 Audit；平台不得在 NATS 重启、Consumer 恢复或依赖恢复时自动批量重放 DLQ。

首版 Stream 基线：

| Stream | Retention Policy | 时间规则 | `MaxBytes` | 满容量行为 |
| --- | --- | --- | --- | --- |
| `PLATFORM_COMMANDS` | `WorkQueuePolicy` | 成功 ACK 后立即删除；未完成消息最多 7 天 | 1 GiB | `DiscardNew` 并告警 |
| `PLATFORM_EVENTS` | `LimitsPolicy` | 最多保留 30 天 | 5 GiB | `DiscardOld`，删除最旧消息 |
| `PLATFORM_DLQ` | `LimitsPolicy` | 最多保留 90 天 | 2 GiB | `DiscardNew` 并告警 |

- 时间和容量限制同时生效，任一限制先达到即按对应策略处理。
- 单条 JetStream 消息最大 256 KiB，只允许承载版本化事件、必要元数据和 Artifact/Object 引用；文件、代码包、完整 Prompt、大日志和二进制内容必须进入 Object Storage。
- `PLATFORM_COMMANDS` 和 `PLATFORM_DLQ` 达到阈值后必须提前告警；达到上限时发布失败必须向调用方返回错误，不得静默丢弃未处理命令或新的失败证据。
- `PLATFORM_EVENTS` 的 30 天窗口只用于消费者恢复和受控重放；超过窗口后仍可依据 PostgreSQL 业务事实和受控重建流程恢复投影。
- Stream 名称、Subject、Retention、容量和 Consumer Policy 均通过版本化部署配置管理；调整配置不修改领域业务代码。

NATS 首年 Pod 容量基线：

| 环境 | 单个 NATS Node Request | 单个 NATS Node Limit | Memory Store 上限 | File Store 上限 | PVC |
| --- | --- | --- | --- | --- | --- |
| DEV | 100m CPU / 256 MiB | 500m CPU / 512 MiB | 128 MiB | 12 GiB | 20 GiB |
| PROD | 250m CPU / 512 MiB | 1 CPU / 1 GiB | 128 MiB | 12 GiB | 20 GiB |

- 业务 Stream 全部使用 File Store，Memory Store 只保留受限的系统余量，不允许业务模块自行创建无容量上限的内存 Stream。
- File Store 只使用 20 GiB PVC 中的最多 12 GiB，其余空间预留给 RAFT、索引、Compaction、临时文件和故障恢复。
- 上述数值是单个 NATS Pod 的 Kubernetes 配额，不是物理服务器或 Node 规格；三个 NATS Pod 必须分散到独立故障域。
- 容量调整属于 Helm/GitOps 部署配置；扩容前后必须验证 R3 Catch-up、Leader 切换、Stream Compaction、发布延迟和磁盘告警。
- NATS Patch 升级不自动执行；必须先在 DEV 验证 Client/Adapter、Subject ACL、TLS、Outbox/Inbox、去重、重投、DLQ、R3 Catch-up、Leader 切换、Stream 数据和回滚，再受控发布到 PROD。
- NATS 不自动跨 `2.14` 版本线；未来 Minor/Major 升级必须独立验证协议、Client SDK、JetStream 元数据与存储格式、Stream/Consumer 配置、Feature Flag 和降级兼容性。
- 滚动升级前必须确认 3 个 Node 全部在线、Meta Cluster 健康且所有 R3 Stream Replica 均为 `current`；任一条件不满足时禁止开始或继续升级。
- 每次只允许滚动一个 NATS Pod，先升级非 Meta Leader，Meta Leader 最后；Pod 退出前必须通过 Helm Chart 的 `preStop` 进入 Lame Duck Mode，转移 Leadership、刷盘并引导 Client 重连。
- `PodDisruptionBudget` 固定 `minAvailable=2`；`terminationGracePeriodSeconds` 必须大于 Lame Duck Duration 与退出开销之和，禁止因 Kubelet 超时而在 Drain 完成前 `SIGKILL`。
- 每个 Pod 返回后必须同时满足 `/healthz` 返回 HTTP 200、重新加入 Cluster、所有 R3 Replica 恢复 `current` 且无持续 Catch-up Lag，才允许滚动下一个 Pod。
- 回滚使用上一份已验证并锁定 digest 的镜像，仍按相同顺序逐节点执行；禁止同时重建多个 Node 或以删除 PVC 作为常规回滚手段。

NATS 备份与恢复基线：

- DEV 与 PROD 每天 `04:00 Asia/Shanghai` 通过专用 Backup Job 执行 `nats account backup --consumers --check`，逻辑备份 `PLATFORM` Account 的全部 Stream、Message、Stream State 和 Durable Consumer Configuration/Position；调度时区必须显式声明并同时展示对应 UTC 时间。
- Account Backup 按 Stream 顺序生成 Snapshot，不是三个 Stream 的跨流原子快照；Backup Manifest 必须记录每个 Stream 的开始/完成时间、首尾 Sequence、Message/Consumer 数量、压缩后大小、Checksum、NATS 版本和对应 PostgreSQL Outbox Watermark。
- 备份期间消息可以继续 Ingest，但目标 Stream 禁止修改配置且 Retention Eviction 暂停；Job 必须避开高峰、监控 PVC 余量和备份 I/O，空间不足、完整性检查失败或前次任务未结束时不得启动重叠备份，并立即告警。
- Backup Job 使用临时受限工作卷生成备份，校验完成后上传到当前环境专用的 NATS Backup Bucket；传输使用 TLS，对象使用服务端加密、Versioning 和 `GOVERNANCE` Object Lock，锁定期默认覆盖该环境当前有效的备份保留期。备份凭据由 OpenBao 托管且只能访问该 Bucket，不具备 Retention Bypass；成功上传并复验后清理临时文件。Prefix 只能用于 Bucket 内的 Account、日期或 Backup ID 组织，不能充当安全边界。
- PROD 逻辑备份保留 7 天，DEV 保留 3 天；已发布 Outbox Record 至少保留 30 天，使最新可用 Snapshot 之后的消息能够从 PostgreSQL 对账补发。
- NATS 升级、Stream/Consumer 破坏性配置变更或存储维护前必须创建并验证按需 Account Backup；周期和按需备份都必须进入统一 Metrics、Alert 与 Audit。
- R3 Stream 在仍有两个完整 Replica 时优先依靠 Raft Quorum 自动恢复；三个 Node 或有效 Quorum 全部丢失时，使用 GitOps 和 Secret 基线重建空的 3 Node Cluster，再把最新 Account Backup 恢复到不存在同名 Stream 的空环境。
- Restore 必须先在隔离环境校验 Stream Configuration、Message Count/Sequence、Consumer Position、Schema 和抽样 Payload，再根据 Manifest Watermark 从 PostgreSQL Outbox 以安全重叠窗口补发；补发沿用原 Envelope ID，重复投递由 Inbox 与 Effect Ledger 消除。
- DEV 每月执行一次完整 Account Restore；PROD 每季度恢复到网络隔离的临时 Cluster，验证备份完整性、Consumer Position、Outbox Reconciliation、重复消除和实测 RPO/RTO，保存证据后销毁临时环境。
- 在 PLATFORM 三个 Stream 合计不超过 8 GiB 的基线下，结合 PostgreSQL `RPO <= 5min` 和 Outbox 补偿，NATS Cluster DR 目标为 `RPO <= 5min`、`RTO <= 60min`；目标必须由演练实测，不能把每日 Snapshot 频率直接误写成业务消息 RPO。
- 不把三个 NATS PVC 的独立 CSI Snapshot 作为正式恢复来源，因为其 Raft/Stream/Consumer State 不保证处于一致时点；当前备份仍位于同一站点，因此只承诺 Cluster 级故障恢复，不承诺 Site DR。

### 9.6 OpenBao（已确认）

- OpenBao Server 首次部署固定为 `2.6.1`，官方 OpenBao Helm Chart 固定为 `0.28.6`；Server、Chart、Agent Injector 及附属镜像必须在 GitOps 中锁定精确版本与镜像 digest，禁止使用 `latest` 或其他浮动引用。
- OpenBao 官方不提供传统 LTS、固定多年支持窗口或商业 SLA；平台至少每月检查 Release 与 Security Advisory，安全修复按紧急变更处理，常规版本先在 DEV 验证后再受控提升至 PROD。
- OpenBao 使用原生 Integrated Storage（Raft）同时提供持久化与 HA，不使用 PostgreSQL 或其他业务数据组件作为 OpenBao Storage Backend，避免 Secret Manager 的可用性反向依赖业务数据库。
- DEV 部署 3 个 Voting Server，Quorum 为 2，可容忍 1 个 Voting Server 故障；PROD 部署 5 个 Voting Server，Quorum 为 3，可容忍 2 个 Voting Server 故障，符合 OpenBao 推荐的生产参考拓扑。
- DEV 与 PROD 使用相同的官方 Helm Chart、Integrated Storage、TLS、Audit、Snapshot 和升级流程；副本数与资源容量属于环境容量配置差异，不改变组件、接口或 HA 架构模式。
- 每个 Cluster 同一时刻只有 1 个 Active Server，其余为同步的 Standby Server；请求到达 Standby 时由其转发给 Active，Active 故障后由仍满足 Quorum 的 Voting Server 自动选举接管。
- 每个 OpenBao Pod 使用独立 SSD、RWO PVC，Voting Server 必须通过 Pod Anti-Affinity 与 Topology Spread 分散到不同 Kubernetes Node/故障域；不得让多个 Pod 共享同一个数据目录或 PVC。
- Integrated Storage 的 `performance_multiplier` 在正式环境固定为 `1`；Raft Peer 发现使用稳定的 Kubernetes Service/DNS 与 `retry_join`，节点间 Cluster 通信必须使用 TLS。
- OpenBao 的自愿中断、升级和维护必须通过 PodDisruptionBudget 与受控逐节点流程限制为一次最多中断 1 个 Voting Server；任何操作不得在剩余节点无法保持 Quorum 时继续。
- 当前仅承诺同一站点内的 OpenBao Cluster HA；多个 Pod 或多个 PVC 不等于 Site DR，跨站点 Secret Manager 灾难恢复仍按平台后续演进边界处理。
- 当前没有经过批准且专用于 OpenBao Seal的独立外部 KMS/HSM信任根；Alibaba KMS中的 ESSD CMK仅授权给 Block Storage Provider Mapping，OpenBao不得访问或复用。DEV 与 PROD 使用同一个 Shamir Seal 初始化、解封和恢复机制；每个 Cluster 独立生成只属于本环境的 5 份 Unseal Key Share，Threshold 固定为 3，任意 3 份才能重建该 Cluster 的 Unseal Key，Share 与 Seal 状态不跨环境复用。
- Shamir Share 数量与 OpenBao Pod 数无关；Cluster 只初始化一次，但每个 OpenBao Pod 在进程重启、显式 Seal 或不可恢复存储错误后都必须独立收集满 3 份 Share 才能 Unseal，一个 Pod 上未达到 Threshold 的进度不能与另一个 Pod 合并。
- 使用 Shamir 时不实现自动提交 Share 的脚本或服务。滚动维护必须按“一个 Standby 重启 → 人工 Unseal → 健康与 Raft 同步确认 → 下一个 Standby → Active 最后”的顺序执行；全 Cluster 重启后必须由保管人按 Runbook 恢复达到 Quorum 的节点。
- 每个环境的 5 份 Share 均按同一保管流程使用该环境受控 PGP Public Key 加密，并保存在与另一环境彼此分隔的离线介质或保险位置；禁止进入 Git、CI/CD、Kubernetes Secret、PVC、平台数据库、OpenBao 自身、日志或普通即时通信工具，也禁止跨环境复用 PGP Private Key 或 Share。
- 当前由同一人暂时保管全部 5 份 Share 属于明确的临时治理例外，只提供介质丢失容错，不声称具备多人制衡。具备多名保管人后必须通过 `bao operator rotate-keys -verify` 重新生成并按不同 PGP Public Key 分配 5/3 Share，使旧 Share 失效，而不是简单转交已经被单人完整掌握的旧 Share。
- 不采用把 32-byte Static Seal Key 放入同一 Kubernetes Cluster Secret 的 Auto Unseal 方案；该方式使 Kubernetes/Pod 权限与 OpenBao 最高信任根处于同一故障域，不符合独立信任根要求。
- 当前不额外部署第二套 OpenBao Transit Cluster 仅用于 Auto Unseal，因为它仍需独立解决自身 Seal、HA、备份、升级和 Token 生命周期，会把 Bootstrap 问题外移并显著增加当前规模的复杂度。
- 未来具备云 KMS、独立 HSM/KMIP/PKCS#11 或真正独立的 Transit 信任根后，可以通过 OpenBao Seal Migration 切换为 Auto Unseal；迁移仅改变 OpenBao 基础设施，不修改平台业务代码，但必须先创建并验证 Snapshot、保证旧新 Seal 同时可用并安排受控维护窗口。
- 切换 Auto Unseal 后产生的是用于高风险操作授权的 Recovery Key Share，而不是能够替代外部 KMS/HSM 解密 Root Key 的 Unseal Key；外部 Seal Provider 或其 Key 永久丢失时，Recovery Key 与 OpenBao Snapshot 都不能独立恢复数据，因此外部 Key 的删除保护、备份和恢复必须成为迁移 Gate。
- OpenBao Integrated Storage 使用 `bao operator raft snapshot save` 生成在线原子全量 Snapshot；不把各 Pod PVC/CSI Snapshot 作为正式恢复来源，因为多个 Raft Volume 的独立快照不保证处于同一一致时点。
- PROD 默认每 1 小时创建一次 Snapshot，小时点默认保留 48 小时，每日点默认保留 30 天；DEV 默认每 6 小时创建一次 Snapshot并保留 7 天。
- Snapshot 调度、小时/每日保留期、Object Lock 期限与恢复演练周期都必须是版本化的 Helm/GitOps 运维配置，不写死在业务代码、镜像或 CronJob 脚本中；管理后台可以展示当前有效值。配置调整必须校验磁盘、对象存储与 RPO/RTO 影响，放宽到超出已批准目标时必须经过受控架构/运维变更。
- OpenBao、Chart 或 Plugin 升级，Seal Migration、`rotate-keys`、高风险 Auth/Policy/Secret Engine 变更和其他破坏性维护前，必须额外创建并验证按需 Snapshot。
- Snapshot CronJob 通过绑定专用 Kubernetes ServiceAccount 的 OpenBao Kubernetes Auth 获取短期、最小权限 Token，只允许读取 Raft Snapshot API；不得获得 Root、`snapshot-force`、Secret 读取、Policy 管理或其他无关权限。
- Backup Job 只允许访问当前环境的 OpenBao、S3-compatible Endpoint 与必要 DNS；DEV 和 PROD 使用相互隔离的 OpenBao Recovery Bucket 与凭据，上传链路使用 TLS，对象启用 Versioning 和默认 7 天 `GOVERNANCE` Object Lock，并按本章 OpenPGP Recovery 规则在客户端加密后上传，不依赖 OpenBao 提供的 SSE-S3。Prefix 只能用于 Bucket 内的 Snapshot 组织，不能充当安全边界。
- 每个 Snapshot 使用唯一对象名并保存 Manifest，至少记录 Environment、Cluster ID、Snapshot Time、OpenBao/Chart/Image 精确版本、Raft Index、Seal Generation、对象 Version ID、大小和 SHA-256 Checksum；上传后必须执行完整性复验。
- Raft Snapshot 中的持久数据已经由 OpenBao Barrier 加密，但对象仍按平台最高敏感级别保护；Snapshot 不包含可直接使用的 Shamir Share，也不替代 Helm/HCL、TLS Key、Plugin Artifact、运维脚本和外部 Audit Log 的独立版本化或备份。
- Shamir Key 轮换后必须立即生成并验证新 Snapshot；旧 Snapshot 仍依赖其创建时的 Seal Generation，旧一代 Share 必须至少保留到依赖它的最后一个 Snapshot 到期且恢复验证通过，随后才能按受控流程销毁。
- DEV 每月、PROD 每季度默认在网络隔离的临时 Cluster 执行完整恢复演练；恢复必须先使用 Manifest 记录的 OpenBao 精确版本与镜像 digest，验证后再按独立升级流程迁移，不能把恢复和升级合成一个不可回滚步骤。
- 正式恢复优先使用匹配的 Shamir Key Generation；`snapshot-force` 会绕过当前 Cluster 的 Seal 一致性检查并执行整库状态替换，只允许经审批的 Break-glass 身份人工执行，禁止授权给 CronJob 或普通运维身份。
- 隔离恢复必须验证 Raft Index、Auth、Policy、Secret Engine、抽样 Secret、Token/Lease 行为和客户端读取，并避免旧 Lease、动态凭据或外部副作用连接真实系统；通过后再扩展到 DEV 3 / PROD 5 个 Voting Server并逐节点完成 Join、Unseal 和同步校验。
- PROD OpenBao Cluster DR 默认目标为 `RPO <= 1h`、`RTO <= 60min`，其中 RTO 以对象存储可用且 3 份匹配 Shamir Share 能在时限内取得为前提；DEV 默认 `RPO <= 6h`、完整 Cluster `RTO <= 60min`，所有目标都必须由演练实测。
- 当前 Snapshot 与 Object Storage 仍处于同一站点，只承诺既定 Cluster DR，不宣称 Site DR 或整个站点/存储介质同时丢失后的可恢复性。

OpenBao 首年 Server Pod 容量基线：

| 环境 | Voting Server 数 | 单个 Server Request | 单个 Server Limit | 单个 Data PVC |
| --- | ---: | --- | --- | ---: |
| DEV | 3 | 250m CPU / 512 MiB | 1 CPU / 1 GiB | 10 GiB |
| PROD | 5 | 500m CPU / 1 GiB | 2 CPU / 2 GiB | 10 GiB |

- Active 与 Standby 使用完全相同的资源规格；不能因当前只有一个 Active 处理请求而缩减 Standby，因为 Standby 必须随时接管并持续完成 Raft Replication。
- PROD 五个 Server Pod 合计 Request 为 2.5 CPU / 5 GiB、Limit 为 10 CPU / 10 GiB、Data PVC 为 50 GiB；这些数值是 Kubernetes Pod/Container 配额，不是 Kubernetes Node 或物理服务器规格。
- 每个 Data PVC 使用独立、低延迟、非共享的 SSD、RWO、支持在线扩容的 StorageClass；容量达到 70% 告警、85% Critical，扩容时从 10 GiB 提升到 20 GiB 或更高，不执行在线缩容。
- Voting Server 不启用 HPA，也不允许自动 VPA 同时或无序修改 Raft 成员资源；副本数固定为 DEV 3 / PROD 5，垂直扩容通过版本化 Helm/GitOps 配置逐节点执行并验证 Quorum、Raft Catch-up 和延迟。
- CPU、Memory、PVC、阈值和告警参数都属于版本化 Helm/GitOps 运维配置，不写死在 OpenBao 镜像或平台业务代码中；调整后必须重新验证 `performance_multiplier=1` 下的 Leader Election、PKI、Snapshot 与故障切换。
- 同一 OpenBao Agent Injector Helm/GitOps 模板在每个 Cluster 分别实例化 2 个无状态副本并跨 Node 分散；版本、逻辑拓扑和调度 Contract 相同，仅资源容量按环境 Profile 调整：DEV 单副本 Request 为 50m CPU / 128 MiB、Limit 为 250m CPU / 256 MiB，PROD 单副本 Request 为 100m CPU / 256 MiB、Limit 为 500m CPU / 512 MiB。
- 注入到各业务 Pod 的 OpenBao Agent Sidecar 属于对应业务 Workload 的资源，不计入上述 Server 或 Injector 容量；后续汇总 Kubernetes Node 容量时必须按实际注入 Pod 数单独累计。
- OpenBao 官方没有针对当前 50 个以内账号、峰值 30 DAU 规定固定 CPU/Memory 最小值；上述数值是本平台结合 HA、Snapshot、PKI、升级与故障切换余量确定的首年工程基线，不冒充官方硬件最低要求。
- OpenBao 启用两个通过 HCL 声明式配置并由 GitOps 管理的 `file` Audit Device：一个写入 `/openbao/audit/audit.log`，另一个写入 `stdout`；保持 `unsafe_allow_api_audit_creation=false`，禁止通过 OpenBao API 动态创建任意文件或网络 Audit Destination。
- 持久化 Audit Device 使用与 Raft Data PVC 分离的独立 SSD、RWO Audit PVC；DEV 每个 OpenBao Pod 为 5 GiB，PROD 每个 Pod 为 10 GiB，本地默认保留 7 天作为集中日志链路故障时的缓冲，不作为长期权威归档。
- `stdout` Audit Device 由 Kubernetes 标准日志采集链路接收，持久化文件由每个 OpenBao Pod 的日志采集组件独立 Tail；所有 Pod 都必须采集，因为 Active 切换后新的 Audit Record 会写到接管请求的 Pod。
- 两个 Audit Device 均使用 JSON、`log_raw=false` 和默认 HMAC 保护，不输出明文 Secret；两个 Device 拥有各自 Salt，同一敏感值的 HMAC 可以不同，聚合时按照 Audit Request ID、Request/Response Type 与 Device Source 关联和去重，不能按 HMAC 值去重。
- File Audit Log 通过受控日志轮转管理，轮转后必须向 OpenBao 进程发送 `SIGHUP` 使其关闭并重新打开目标文件；轮转失败、Audit PVC 70%/85% 阈值、采集延迟、重复/缺口和 Audit Write Latency 必须进入统一 Metrics 与 Alert。
- 集中 Audit 默认在线/归档总保留 365 天，进入 `audit-worm` 的权威归档使用默认 365 天 `COMPLIANCE` Object Lock；在 Retention 到期前，包括 RGW 管理员在内的任何身份都不能删除对象、缩短期限或绕过锁定。本地缓冲、集中热查、归档和 Object Lock 时间都是版本化运维配置，调整不得短于统一平台 Audit Policy 的当前要求。
- OpenBao 会尝试写入所有 Audit Device；一个 Device 发生非阻塞失败时，只要另一个成功就可以完成请求，两个都不能记录时必须 Fail Closed。任一 Device 的写调用如果发生阻塞，OpenBao 请求仍可能整体等待，因此必须监控两条本地写入路径的延迟。
- 首版不让 OpenBao 直接同步调用 HTTP、TCP Socket 或远程 Syslog Audit Collector；远程网络、Collector 限流与重试由日志采集层异步处理，避免把远端故障直接放入 Secret API 的同步关键路径。
- OpenBao Audit 保存 OpenBao API Request/Response 安全事实，平台 Audit 保存用户、Requirement、Workflow、Assignment 等业务事实；两者独立保留，不能相互替代，并通过 Request ID、Trace Context、Workload Identity 与 Actor Context 在管理后台关联查询。
- OpenBao API/UI Listener 强制使用 TLS，关闭明文端口并只允许 TLS 1.2/1.3；Client 必须校验受信任 CA 与 SAN，证书由受控内部 CA/cert-manager 轮换并通过 `SIGHUP` 安全重载。API Listener 使用 Server-side TLS 与 OpenBao Auth Token，不在整个 8200 Listener 强制客户端证书，以免破坏浏览器 UI 和 Agent Injector。
- OpenBao API Service 使用 `ClusterIP`，不开放公网；8200 只允许 Agent Injector、获批业务 Workload、受控运维/备份 Job 和 VPN 管理入口访问，8201 Cluster Port 只允许 OpenBao Pod 互通并使用 OpenBao 内部节点 mTLS，Sandbox 不具备 OpenBao 网络连通性。
- 每个可独立部署的服务使用独立 Kubernetes ServiceAccount、OpenBao Kubernetes Auth Role 和最小权限 Policy；Role 必须精确绑定 ServiceAccount Name 与 Namespace，禁止 `*`，DEV 与 PROD 的身份、Role 和 Secret Path 相互隔离。
- Workload 使用 Audience 固定为 `openbao` 的短期 Projected ServiceAccount Token 登录；OpenBao Kubernetes Auth 使用本地 OpenBao Server ServiceAccount 调用 TokenReview，只有该 Server ServiceAccount 获得所需 `system:auth-delegator` 权限，普通业务 ServiceAccount 不获得 TokenReview 权限或长期 Reviewer Token。
- OpenBao Agent 获得的 Service Token 默认 TTL 为 1 小时，由 Agent 自动续期或在到期/失效后重新认证；Pod 退出时主动撤销 Token。TTL、续期与最大生命周期是版本化安全配置，但不能改为无期限 Workload Token。
- Secret 继续只写入 Pod 的 tmpfs/内存文件；平台 Control Plane 本身也作为普通 Workload 使用自己的 ServiceAccount、Role 和 Policy，不保存共享、静态或高权限 OpenBao Token。
- 平台管理后台仅向具备对应 Capability + Scope 的人员展示当前环境 OpenBao Console 入口，并在新标签页通过 VPN 管理链路打开；平台登录只控制入口可见性，不直接授予 OpenBao 权限，也不在 URL、Cookie、页面脚本或后端响应中传递 OpenBao Token。
- 当前没有 SSO，少量人工基础设施运维人员使用独立 OpenBao `userpass + Login TOTP MFA` 再次认证；Username 继续使用 8 位员工编号，但 OpenBao Password、TOTP 与平台 Password/TOTP 相互独立且禁止复用。
- OpenBao Human Identity/Policy 至少区分只读查看、Secret 管理和安全管理，不共享账号；登录失败锁定、TOTP 校验、入口限流、Token TTL、续期和撤销均由 OpenBao 独立执行并进入 OpenBao Audit。
- 平台后端不充当 OpenBao 高权限 Token Broker，也不根据平台 Session 代签 OpenBao Token。未来存在正式 OIDC/SSO Provider 后，可只替换 Human Auth Mount 为 OIDC；Workload Kubernetes Auth、Secret Path、Policy 和平台业务代码保持不变。
- 初始化 Root Token 必须使用受控 PGP Public Key 加密，只用于首次建立 Audit、Auth、Policy 与非 Root 管理身份；Bootstrap 完成后立即执行自撤销并验证失效，禁止长期保存在 Git、Kubernetes Secret、平台数据库、OpenBao 自身或在线密码配置中。
- 紧急 Root 操作由仍可认证、仅具备启动 Generate Root 流程权限的短期 `breakglass-operator` 身份发起，再使用既定 Shamir 5/3 Share 通过 OpenBao 2.6 的受认证 `operator generate-root` 流程临时生成受保护的 Root Token；每次必须填写原因、限定操作清单、使用受控终端并完整审计，完成后立即撤销。Root/Break-glass 不能成为日常 Console 登录方式。
- 未认证 Generate Root Endpoint 默认保持禁用；如果全部 Auth Method 损坏，只能在审批后的恢复维护窗内，通过受限网络临时启用旧的未认证恢复入口，操作完成后立即重新禁用并验证，禁止为便利长期开放。

### 9.7 Object Storage（已确认）

- 当前自建 S3-compatible Object Storage 固定采用 Rook-Ceph RGW，不再把 AIStor、旧版 MinIO、SeaweedFS、Garage 或仍处于 Beta 的 RustFS 作为首版正式实现。
- 首次部署固定使用 Rook `v1.20.2` 与 Ceph Tentacle `v20.2.2`；Rook Helm Chart、Ceph Image、CSI、RGW 及所有附属镜像必须在 GitOps 中锁定精确版本与 digest，禁止使用 `latest`、浮动版本线或未经 DEV 验证的自动升级。
- DEV 与 PROD 在各自独立的 Kubernetes Cluster 内部署相同的 Rook-Ceph 组件和配置结构，不共享 Ceph Cluster、Pool、Bucket、用户、Access Key 或故障域；容量差异只通过环境化 GitOps 配置表达。
- Object Storage 以“环境 + 数据类别”为强制隔离边界。每个环境至少建立 `requirement-attachments`、`agent-artifacts`、`audit-worm`、`postgres-backup`、`nats-backup`、`openbao-recovery`、`observability-logs`和 `observability-traces`八个逻辑 Bucket Class；物理名称由稳定的平台实例标识、环境标识、逻辑类别以及必要时的 Cluster ID组成，由 GitOps注入，领域代码不得硬编码。`observability-logs`按 Loki正式配置实例化相互独立且不使用上游默认名称的 Chunks、Ruler和 Admin物理 Bucket，`observability-traces`实例化 Tempo Trace Block Bucket；未来同一类别出现多个独立 PostgreSQL/NATS/Observability Cluster时，应为每个 Cluster实例化独立物理 Bucket，而不是退化为共享 Prefix。Control Plane的 `kubernetes-etcd-backup`权威副本明确位于目标 Cluster/Rook-Ceph之外，不是这里的第九个 RGW Bucket，也不占用下述 Ceph Quota或 Reserve。
- 八类逻辑 Bucket Class分别使用独立的 Workload Identity/Credential、最小权限 Bucket Policy、Encryption、Versioning、Object Lock/Retention与 Lifecycle配置，禁止跨类别或跨环境复用 Access Key。Requirement Attachment只存用户上传附件；Agent Artifact存 Spec、Plan、测试报告、截图、运行日志及其他生成物；Audit、PostgreSQL Backup、NATS Backup、OpenBao Recovery、Loki Log与 Tempo Trace不得混入其他类别。Prefix只用于同一 Bucket内的对象组织与查询，不能替代 Bucket级安全、合规或生命周期隔离。
- Object Lock采用分级策略：`audit-worm`使用 `COMPLIANCE`；PostgreSQL/NATS/OpenBao Backup与关键 Artifact使用 `GOVERNANCE`；Requirement Attachment和普通 Artifact默认只使用 Versioning。`observability-logs`与 `observability-traces`是可丢弃、可重建的诊断数据，默认关闭 Versioning和 Object Lock，由 Loki/Tempo自身 Retention安全清理；通用 S3 Lifecycle首版只 Abort未完成 Multipart Upload，不配置按 Prefix或对象年龄批量删除 Backend数据，避免旧 Version、Delete Marker或错误 Lifecycle绕过保留与索引一致性。Backup/Audit到期后的受控精确 Version清理使用下述独立 Reconciler，不属于通用年龄 Lifecycle。如未来需要为诊断数据增加合规锁定，必须新建相应 Bucket Class并迁移，不能原地混用。Retention模式、默认期限和当前有效值由版本化 GitOps运维配置管理并展示在平台管理后台，不写死在领域代码中。
- 所有 Bucket 默认 Private，并显式禁止 Public ACL、Public Bucket Policy、匿名 List/Get/Put 和跨环境访问。浏览器只允许从当前平台部署的受控 Origin 通过最小化 CORS 执行已签名的必要 Method/Header；内部 Backup Job、File Security Worker、Control Plane 与其他 Workload 使用各自独立的 Workload Identity，不把浏览器 Presigned URL 当作服务间长期认证机制。
- 平台业务、备份 Job 和基础设施组件只通过 Object Storage Port 与 S3 Adapter 使用对象存储；Endpoint、Region、Bucket、Prefix、Path-style/Virtual-host-style、Credential、SSE 和 Timeout 等均为外部配置，不允许领域模块直接依赖 Ceph/RGW Admin API。
- RGW 必须提供并通过自动化兼容性验收的 S3 Versioning、Object Lock、GOVERNANCE/COMPLIANCE Retention、Legal Hold、Multipart Upload、Lifecycle、服务端加密和最小权限 Bucket Policy；未通过 Object Lock/WORM 验收时不得承载 Audit、OpenBao Snapshot、PostgreSQL Backup 或其他已声明不可篡改的数据。首版只验证 Legal Hold 兼容性，不在平台业务中启用或暴露 Legal Hold 操作，与第一阶段不实施物理清除的数据治理边界保持一致。
- 除 OpenBao Recovery 例外外，Requirement Attachment、Artifact、Audit、PostgreSQL/NATS Backup 及其他普通 Bucket 默认启用 S3 Bucket Encryption `SSE-S3`；RGW 负责每个 Bucket 的密钥生命周期，平台业务客户端无需提交或持有 KMS Key ID。首版不向业务开放 SSE-KMS 或 SSE-C，避免把密钥选择、持有和永久数据丢失风险扩散到领域模块或终端用户。
- SSE-S3 使用 DEV/PROD 各自独立的 OpenBao Transit Mount、Policy、Role 和密钥域，新集群固定采用 `transit compat=0`；Transit Key 不可导出，禁止启用 Plaintext Backup。RGW 通过只监听 localhost 的 OpenBao Agent-compatible Proxy 和 Kubernetes Auth 获取可续期短期身份，不在 Ceph 配置、Git 或普通 Kubernetes Secret 中长期保存静态 Token；RGW 到 Agent、Agent 到 OpenBao 以及所有 S3 请求都必须经过受验证的 TLS 信任链。
- Rook/Ceph 官方声明的 RGW KMS Backend 是 Vault，OpenBao 只能作为 Vault-compatible 实现进入 DEV 兼容性 Gate；Gate 至少覆盖 Bucket Encryption API、Presigned Upload/Download 约束、Checksum/Version ID、CORS、Multipart、Versioning、Object Lock、RGW 重启、OpenBao HA/Seal/Unseal、Agent Token 续期、密钥轮换及恢复读取。任一关键用例失败都阻止发布，禁止静默关闭 SSE、接受明文回退或把 OpenBao 兼容性写成未经验证的既成事实。
- OpenBao Snapshot/Recovery Bucket 明确排除上述同源 SSE-S3 依赖：DEV 与 PROD 分别使用独立且仅用于该用途的 OpenPGP Recovery Key Pair。Public Key 及其 Fingerprint 可以受版本控制地保存在 GitOps，并以只读方式提供给 Backup Job；Private Key 及其 Passphrase 必须离线保管，不得进入 OpenBao、Ceph、Kubernetes、平台数据库、Git、日志或在线 Secret。该 Key Pair 不得复用初始化 Root Token 的 PGP Key、Shamir Share、Root Token 或其他业务密钥。
- Backup Job 必须在上传前使用对应环境的 OpenPGP Public Key 对 OpenBao Snapshot 做客户端加密，Object Storage 中只允许出现密文；Backup Manifest 记录 Snapshot 校验值、Public Key Fingerprint、加密算法与对象版本，但不记录任何 Private Key 材料。专用 Recovery Bucket 仍受 dm-crypt、TLS、Versioning、Object Lock、最小权限和 Audit 保护。未来可以在不改变 Backup Port 的前提下增加多个受控 Recipient；轮换时必须保留仍在 Retention Window 内的旧 Snapshot 所需 Private Key，且恢复演练覆盖新旧 Recipient。
- 完整 Kubernetes Control Plane/etcd丢失时，恢复总顺序固定为：先从 Cluster外 `kubernetes-etcd-backup` Repository与匹配 Recovery Bundle重建 etcd、三个 Control Plane Member和 HA API Endpoint，验证核心控制循环后再启动/恢复 Cluster内基础设施。进入 Cluster内数据恢复阶段后，OpenBao顺序才是先恢复可读取 Recovery Bucket密文的 RGW基础服务，再由获批的 Break-glass流程离线提供 OpenPGP Private Key、解密并恢复 OpenBao Snapshot，随后恢复 Transit/SSE解密能力，最后恢复 PostgreSQL、NATS、Artifact与其他依赖 SSE-S3的数据。禁止让 etcd或 OpenBao恢复依赖丢失后必须先恢复的同 Cluster OpenBao Transit Key，从架构上消除循环依赖。
- OpenBao 或 Agent 在 Cache Miss 时不可用，RGW 对需要 SSE-S3 的读写必须 Fail Closed 并告警，不能改写为明文对象。Object Lock 只保护对象而不保护 Transit Key；任何受 Versioning、Retention、Legal Hold 或 Backup Window 约束的对象仍可能引用旧密钥版本，因此禁止删除、Trim 或提高最小解密版本越过仍存活对象所需版本，密钥生命周期必须与对象生命周期联合验收。
- 正式 HA 拓扑至少需要 3 个相互独立的 Kubernetes Storage Node/Host 故障域和可由 Ceph 直接管理的独立 Raw Block Device；OSD 必须跨 Host 分布。只有一个物理 Host 时，即使运行多个 Pod、OSD 或虚拟节点，也不得宣称具备 Ceph HA。
- DEV 与 PROD 均按同一 Rook-Ceph/GitOps 拓扑模板实例化 `storage-worker` Pool，Environment Capacity Profile 将 Storage Node 数参数化为 DEV 3 个、PROD 4 个；每个 Node 首版配置 1 个独占 Raw SSD OSD。OS 系统盘与 OSD 数据盘必须物理分离，一块 Raw Device 只对应一个 OSD，禁止在 OSD 盘上再叠加 RAID、共享文件系统或其他 Workload 数据。每个 MON 使用独立持久化卷/目录；小型集群可让这些卷落在企业级 OS SSD 上，但不得与 OSD Raw Device 或其他 MON 数据目录共用。
- DEV 与 PROD 的每个 Host-based Raw OSD 必须在首次 Provision 时启用 Ceph 原生 dm-crypt/LUKS，即 Rook `encryptedDevice: "true"`；禁止先以明文 OSD 上线后再宣称可以原地补加密。既有未加密 OSD 若未来需要加密，只能经过受控的逐 OSD 替换、Backfill、健康检查和故障回滚流程。
- Host-based Raw OSD 的 `dmcrypt_key`、Lockbox 与 CephX 解锁链路由 `ceph-volume` 和 Ceph MON 管理，不属于 Rook 针对 PVC-backed OSD 的外部 KMS 路径，因此不得把该层描述为“OpenBao 托管 OSD 密钥”。承载 MON 数据和 Ceph 密钥材料的 OS/MON 存储同样必须具备静态加密保护，自动解锁与恢复材料不得只保存在同一节点或同一磁盘上。
- Go-live 前必须生成受控加密的离线 Ceph Recovery Bundle，覆盖支持恢复流程所需的 MON/Cluster Metadata、CephX/Lockbox 与相关 Kubernetes Secret，并完成节点重启、单盘更换、MON Quorum 故障及密钥恢复演练。明文密钥禁止进入 Git、日志、平台数据库、普通 Kubernetes ConfigMap 或即时通信；dm-crypt 只防护物理介质泄露，不替代 S3 Authorization、TLS、Bucket Policy 或下一层对象级 SSE。
- DEV 与 PROD 的每台 Storage Node 使用相同的正式宿主机容量基线：至少 `8 vCPU / 32 GiB RAM`；这是整台 Kubernetes Node 的容量要求，不是任何单个 Ceph Pod 的 `request` 或 `limit`。如果后续允许其他 Workload 共置，必须在这项 Ceph 与系统预留之外另加容量，禁止挤占 Recovery、Backfill、Scrub、升级和单节点故障期间所需余量。
- 每台 Storage Node 使用至少 `256 GiB` 企业级 SSD 作为 OS 与允许共置的独立 MON 持久化存储，并与 `1 TiB` OSD Raw SSD 物理分离；禁止启用 Swap。节点内部东西向网络至少为 `10 Gbps`，该指标指 Kubernetes/CNI、RGW、OSD Replication 与 Recovery 实际经过的内网路径，而非公网带宽；上线前必须验证全链路吞吐、延迟、丢包和故障恢复表现。
- 首版采用单一 `10 Gbps` Ceph 内部网络路径，Ceph `public network` 的 RGW/MON/OSD 客户端通信与 OSD Replication、Recovery、Backfill 共享该路径；这里的 `public network` 是 Ceph 术语，不代表互联网或公网暴露。首版不引入 Multus、第二套 `cluster network`、双网络路由或相关额外故障面，通过 Kubernetes CNI、NetworkPolicy 和既定 Service 入口限制访问，并在验收时确认 Pod 流量实际经过 10 Gbps 链路而非低速 Uplink。
- 网络吞吐、延迟或恢复窗口未来超过单网络容量时，可在保持 RGW Endpoint、ObjectStorage Port、Bucket 和业务 Workflow 不变的前提下，为 Ceph 独立增加 Cluster Network；该变化属于可独立验证和回滚的基础设施演进，不允许渗透到领域模块。
- DEV 与 PROD 均部署 3 个 MON、2 个 MGR（Active + Standby）和 2 个无状态 RGW；MON、MGR、RGW 必须通过 Anti-Affinity、Topology Spread 和 PodDisruptionBudget 跨 Host 分散，RGW 通过 Kubernetes Service 提供统一 S3 Endpoint。
- Ceph 核心 Daemon 采用受控 `Burstable` Kubernetes 资源策略：`request` 保证基础调度容量，Memory Limit 隔离节点风险，CPU 不设置 Limit，以免 Recovery、Backfill、Scrub 或故障切换期间受到 CFS Throttling。DEV 与 PROD 使用相同的首发基线，所有数值由 GitOps 配置并根据 DEV 压测、PROD 指标和容量变化受控调整，不写入业务代码。

  | Daemon | CPU Request | Memory Request | CPU Limit | Memory Limit |
  | --- | ---: | ---: | ---: | ---: |
  | OSD | `2` | `4 GiB` | 不设置 | `6 GiB` |
  | MON | `1` | `1 GiB` | 不设置 | `2 GiB` |
  | MGR | `500m` | `512 MiB` | 不设置 | `1 GiB` |
  | RGW | `1` | `1 GiB` | 不设置 | `2 GiB` |
  | Rook Operator | `200m` | `128 MiB` | 不设置 | `512 MiB` |

- OSD 的有效 `osd_memory_target` 固定并在验收时验证为 `4 GiB`；`6 GiB` Memory Limit 为 BlueStore 回收延迟和短时峰值保留空间，禁止把 `6 GiB` 误设为 Memory Request 或有效 Target。OSD Prepare Job 仅设置基础 CPU/Memory Request，不设置 Memory Limit，避免首次初始化 Raw Device 的瞬时内存峰值导致 OOM Kill；其余 Sidecar/Collector 采用锁定版本的 Rook 正式默认值，并纳入节点容量汇总与监控。
- DEV 与 PROD 的 Storage Node 均为专用 Ceph 节点角色，通过受控 Label、`NoSchedule` Taint、Node Affinity 和 Toleration 形成调度隔离；OSD、MON、MGR、RGW 只能落在对应环境的 Storage Node，并继续满足既定 Host Anti-Affinity 与 Topology Spread。
- Storage Node 只允许运行 Rook-Ceph 组件以及 Kubernetes 正常工作所必需的 CNI、网络代理、监控、日志和安全 Node Agent/DaemonSet；禁止调度平台 Control Plane、PostgreSQL、Valkey、NATS、Temporal、OpenBao、普通业务 Pod、Agent、Sandbox 或其他用户 Workload。普通 Workload 配置不得暴露或自行声明该 Toleration，例外必须作为独立容量与风险变更经过 DEV 验证和受控 GitOps 审批，不得临时绕过隔离策略。
- RGW Metadata Pool 与 Data Pool 首版都使用 `failureDomain=host`、三副本 `size=3` 和安全写入下限 `min_size=2`，启用 PG Autoscaler；当前不使用 `2+1` Erasure Coding，也不为了节省容量降低副本数。
- DEV 任意 1 个 Host/OSD 故障后可维持双副本的降级读写，但在替换故障盘或 Host 前不能重新恢复三副本；PROD 的第 4 个 Storage Node 使单 Host 故障后可以在剩余 3 个 Host 上自动重建三副本，但仍必须保留足够空闲容量并受控处理 Recovery/Backfill。
- 每个 OSD 首年使用 1 TiB 企业级 SATA SSD 或 NVMe SSD，必须具备断电保护（PLP）并建议达到至少 1 DWPD 或等价 TBW；同一环境优先采用相同型号、固件和容量，消费级无 PLP SSD 不进入正式基线。
- OSD 是管理单块 Raw Data Device、承担对象分片、校验、复制、Recovery 与 Backfill 的 Ceph Object Storage Daemon；1 TiB 是基础设施设备规格而不是单用户、单 Requirement 或业务文件配额，Requirement Attachment 使用独立的默认 `50 MiB` 单文件与 `200 MiB` 单 Requirement 产品配额。
- DEV 首年 Raw Capacity 为 3 TiB，三副本理论 Logical Capacity 约为 1 TiB；PROD Raw Capacity 为 4 TiB，三副本理论 Logical Capacity 约为 1.33 TiB。理论容量不等于可承诺业务容量，必须扣除 Ceph 元数据、Recovery/Backfill、Versioning、Object Lock、未完成 Multipart Upload 和运维余量。
- DEV 与 PROD 正常运营都按不超过 `50%` Raw Capacity 规划，首年对应 Cluster 50%-Raw Logical Planning Envelope约为 `0.5 TiB` 与 `0.67 TiB`；这是底层容量安全边界而非业务硬配额或任何单一 Bucket Class额度。PROD 在 50% 使用率时损失 1 个四分之一容量的 Storage Node，完成三副本重建后的理论使用率约为 `66.7%`，仍低于 Near Full并保留恢复余量。
- Ceph Fullness Ratio 固定为 `nearFullRatio=0.70`、`backfillFullRatio=0.75`、`fullRatio=0.80`，由版本化 GitOps 配置并在实际 OSDMap 中验收；顺序必须始终满足 `nearfull < backfillfull < full`。Near Full 产生健康告警，Backfill Full 阻止向过满 OSD 继续 Backfill，Full 阻止继续写入以保护数据。
- Cluster Raw 平均使用率达到 50%，任一 OSD 达到 50%，或趋势预测 30 天内达到 50% 时立即进入扩容流程；监控、告警与看板必须同时展示 Cluster 平均值、最满 OSD、容量增长率、30 天预测、各安全阈值和剩余恢复余量，并按风险最高者判定状态。禁止通过临时提高 Fullness Ratio、删除受 Retention/Object Lock 保护的对象或缩短既定 Recovery Window 掩盖容量不足。
- 容量预测必须同时计算当前对象、历史 Version、Delete Marker、Object Lock Retention、Incomplete Multipart、Backup、Audit 与预期增长；不能只统计用户界面可见的最新文件大小。
- 首个 Environment Capacity Profile为八类逻辑 Bucket Class定义以下环境级 Logical Operating Quota；它们是容量规划和准入上限，不是预分配磁盘，也不替代单 Object、Attempt、Requirement等产品配额：

  | Bucket Class | DEV Operating Quota | PROD Operating Quota |
  | --- | ---: | ---: |
  | `requirement-attachments` | `16 GiB` | `24 GiB` |
  | `agent-artifacts` | `48 GiB` | `56 GiB` |
  | `audit-worm` | `64 GiB` | `96 GiB` |
  | `postgres-backup` | `72 GiB` | `128 GiB` |
  | `nats-backup` | `40 GiB` | `80 GiB` |
  | `openbao-recovery` | `8 GiB` | `16 GiB` |
  | `observability-logs` | `150 GiB` | `150 GiB` |
  | `observability-traces` | `50 GiB` | `50 GiB` |
  | **正常 Operating Quota合计** | **`448 GiB`** | **`600 GiB`** |
  | **50% Raw线内未分配 Reserve** | **`64 GiB`** | **约 `82.7 GiB`** |

- DEV `3 TiB Raw × 50% ÷ 3副本 = 512 GiB`，PROD `4 TiB Raw × 50% ÷ 3副本 ≈ 682.7 GiB`，因此上表总量没有越过既定50% Raw Operating Boundary。该换算只是规划近似；BlueStore/RGW Metadata、Bucket Index、PG分布、最满 OSD、恢复写放大和实际 `ceph df`始终是更高优先级事实，不能因为逻辑 Quota算术未满就忽略底层接近50%的风险。
- 未分配 Reserve不是可出售或可由普通 Bucket自动借用的共享空间。它首先承担 Metadata、历史 Version放大、Delete Marker、未完成 Multipart、GC延迟、OSD倾斜、预测误差和 Recovery/Backfill余量；其中只为 `audit-worm`额外指定 DEV `16 GiB`、PROD `32 GiB`的 Audit Emergency Margin，使 Audit正常 Operating Quota与紧急写入 Ceiling分别为 DEV `64/80 GiB`、PROD `96/128 GiB`。扣除该 Margin后仍保留约 DEV `48 GiB`、PROD `50.7 GiB`的纯基础设施余量，其他 Bucket不得借用 Audit Margin。
- Audit容量使用两级 Enforcement：平台 Audit Admission、Retention Controller与告警以 DEV `64 GiB`、PROD `96 GiB`正常 Operating Quota为 Gate；RGW原生硬配额/后备 Ceiling则必须配置为 DEV `80 GiB`、PROD `128 GiB`，不能错误地在正常 Gate处阻断 Emergency Margin。其他七类逻辑 Class的全部物理 Bucket配额分区之和不得超过各自 Class Envelope，不得借用 Audit Margin或纯基础设施余量；禁止创建未分类 Bucket绕过 Class聚合、Quota、Retention、Encryption与监控。
- 每个 Logical Bucket Class在 Capacity Profile中必须显式定义 `operatingQuotaBytes`、`emergencyMarginBytes`、`admissionCeilingBytes`、每个物理 Bucket/Owner对应的 `rgwMaxSizeBytes`、经证据生成的 `rgwMaxObjects`以及 Desired/Effective Revision；除 `audit-worm`外 `emergencyMarginBytes=0`且 `admissionCeilingBytes=operatingQuotaBytes`，Audit则为 `admissionCeilingBytes=operatingQuotaBytes+emergencyMarginBytes`。同一 Class有多个物理 Bucket时，GitOps必须为其划分互斥分区，所有 `rgwMaxSizeBytes`之和不得超过 Class `admissionCeilingBytes`，不能给每个物理 Bucket重复配置整份 Class额度；RGW native quota语义、历史 Version/Object Lock计数和生效值必须经 PCS验证，不能只验证 YAML Desired值。
- Logical Class Usage必须聚合同一 Class的全部物理 Bucket/Cluster实例，并按保守口径包含当前 Object Version、Noncurrent Version、受 Object Lock或 Retention保护的对象、Delete Marker/Index开销、已上传及已预占的 Multipart、尚未完成 GC的对象和相关 Metadata估算。只统计用户可见最新对象、单个物理 Bucket或压缩前后任一较小口径都不能用于准入。RGW统计存在异步与缓存时，Environment Bucket-Class Capacity Ledger、RGW Bucket Stats、Cluster Raw和最满 OSD分别保留自己的单位与阈值，任一 Gate进入更危险状态都按该状态处理，不能挑选较宽松口径或把不同单位直接相减。
- Environment Bucket-Class Capacity Ledger以 logical stored bytes为基础，并使用版本化、经实测校准的标准化 Overhead Factor纳入 Version、Delete Marker、Multipart、Bucket Index与GC延迟估算；这些估算已经进入 Class Usage时，不再从 Class Quota中重复扣减一次。未分配 Cluster Reserve仍用于吸收估算误差、BlueStore/PG/OSD倾斜、Recovery/Backfill写放大等无法准确归属单一 Class的物理开销；`ceph df` Raw与最满 OSD始终作为独立、更高优先级 Gate，不能把 logical bytes与 Raw bytes直接相加比较。
- 每类 Bucket在 Operating Quota `70%`产生 Warning、`85%`产生 Critical；同时计算30天预测：当前全部版本用量 + p95/p99预期写入 + Locked/Multipart上界 - 未来30天内已被权威 Retention Reconciler证明可安全释放的对象。Audit 365天锁定对象、尚未验证可删除的 Backup、仅有 Delete Marker的旧 Version、Reconciler执行失败和未完成 GC数据不得计作可回收。任一 Class预测超过其 Quota `70%`，或 Cluster平均/最满 OSD预测30天内达到50% Raw，当前 Capacity Candidate即失败并进入扩容，不等待硬拒绝发生。
- Object Retention Reconciler只负责 `audit-worm`、`postgres-backup`、`nats-backup`与 `openbao-recovery`中已经超过各自权威保留期的历史对象。它必须按精确 Object Version ID删除，且只有在 Retention/Object Lock确已到期、没有 Legal Hold/调查冻结/恢复任务/业务引用，并在 Backup类别中确认仍存在满足 Recovery Window、恢复链与额外恢复点要求的更新有效副本时才可执行；每次判定、删除、拒绝与失败都必须写入独立 Audit。Reconciler使用专用最小权限 Workload Identity，不具有 Retention Bypass、跨 Bucket或通配 Prefix批量删除权限。
- Reconciler无法完整证明资格、Object Lock尚未到期、权威 Manifest/索引不一致或删除/GC未验证完成时，该 Version继续按占用容量计算，不能因逻辑 Retention到期而提前扣减。已经被业务接受的 `requirement-attachments`与 `agent-artifacts`首版仍只做归档/逻辑删除和引用治理，不进入业务数据物理清理；归档、删除标记或 Requirement恢复状态变化都不释放 Object Storage容量。已经独立确认的未完成 Multipart Abort与无业务引用 `ORPHANED`技术垃圾精确 Version清理不受此限制。Loki/Tempo诊断数据继续由各自 Backend的权威 Retention流程清理，不由该 Reconciler越过其索引一致性直接删除对象。
- `requirement-attachments`与 `agent-artifacts`继续先由 Product Quota Ledger和 Environment Bucket-Class Capacity Ledger按精确 Object Version双重原子预占，再由物理 Bucket的 RGW native quota作为最后后备保护；达到产品额度时返回产品维度的 `ARTIFACT_QUOTA`，达到 Class/Raw容量边界时返回独立的 `STORAGE_CAPACITY`维度并触发运维事件，不能混成同一错误。既有单文件、单 Attempt和单 Requirement动态产品配额继续由 Super Admin Configuration管理，但提高产品额度不得突破环境 Operating Quota或 Scanner/Capacity Envelope。
- PostgreSQL、NATS和 OpenBao Backup Job在开始完整上传前必须预检目标 Class剩余 Operating Headroom并原子预占本次 Working Set、Version/Lock放大；普通 Backup不得借用 Cluster Reserve或 Audit Emergency Margin。不足时不得上传半份“成功备份”，而应产生明确的 Backup/RPO Degraded Incident并立即扩容。PostgreSQL持续 WAL归档还必须逐对象准入并持续预测，不能只在每日 Base Backup开始前检查；禁止为通过容量 Gate而缩短既定 Recovery Window、Object Lock期限，删除仍受保护的备份，或把 Backup写入 Attachment/Artifact Bucket。
- `audit-worm`聚合当前环境全部平台 Audit、OpenBao Audit及未来获准 Audit Producer，DEV `64 GiB`/PROD `96 GiB`是 Class合计而非每个来源各自一份。达到正常 Operating Quota即进入 Critical Capacity Incident并开始使用专用 Emergency Margin，同时按剩余 Margin与实际 Audit p99写入率计算可支撑的扩容 Lead Time；系统暂停 Attachment、普通 Artifact、Trace及其他可安全拒绝的低优先级新写并启动扩容。Emergency Margin不是正常365天预算，且不能凌驾于 Ceph Raw/最满 OSD/Full Gate；底层已无法安全写入或预计空间不足以覆盖扩容 Lead Time时，任何必须产生 Audit却无法可靠持久化的新受审计状态变更都必须 Fail Closed，不能在无审计情况下继续成功。
- `observability-logs`与 `observability-traces`继续由 Loki/Tempo权威 Retention清理，不启用会绕过索引/Block一致性的通用对象年龄删除；达到 Critical或底层 Capacity Incident时可以按已确认诊断数据优先级限流/拒绝新 Ingest，但不得影响 Audit、Backup、Artifact等权威事实，也不能把诊断数据 Quota临时借给其他 Class后宣称配置未变。
- Bucket Class Operating Quota、Audit Emergency Margin、Object Count Guard和底层 RGW/Ceph Enforcement属于版本化 `GITOPS_CONFIG`与 Environment Capacity Profile，管理后台只读展示，Super Admin也不能从业务页面即时放宽；调整使用新 Capacity Candidate、Impact Preview、恢复余量和 DEV验证。产品级文件/Artifact额度仍是独立 `PLATFORM_POLICY`，两层必须同时满足，禁止合并为一个可绕过基础设施安全线的配置项。
- 首个 Capacity Profile激活前必须以实际数据验证 PostgreSQL压缩 Base Backup与每日 WAL p95、NATS压缩 Snapshot p95、OpenBao Snapshot p95、Audit每日字节/对象 p99、Attachment/Artifact净增长与 Version放大、Multipart并发预占、RGW Metadata/BlueStore放大以及 Loki/Tempo稳定增长。`max_objects`不凭经验写固定值，而是由至少一周对象大小分布和日对象数证据生成 Candidate；证据无法证明上述 Quota、Retention和30天增长能同时落入50% Raw线时，必须增加同规格 OSD/Storage Node或降低非权威数据写入，不得削减 Audit、Object Lock或 Recovery Window。
- `postgres-backup`的 `72/128 GiB`只是首个 Capacity Candidate，不是未经验证的30天容量保证；所需空间必须至少覆盖 Recovery Window内全部压缩 Base Backup与 WAL、一个额外已验证 Base Backup/恢复点、当前上传 Working Set、按需备份以及 Locked/Noncurrent Version与 Multipart放大。`nats-backup`的 `40/80 GiB`必须验证 DEV至少容纳3天保留加上传重叠、PROD至少容纳7天保留加上传重叠，并计入 Manifest、按需备份和历史 Version。`openbao-recovery`的 `8/16 GiB`必须按实际 Snapshot p95验证；尤其 PROD虽然小时点逻辑保留48小时，但默认7天 Object Lock会使最多约168个小时 Snapshot在锁到期前暂时共存，另需计入每日点、按需点、Manifest和历史 Version。任一实测结果超出 Class Envelope都必须调整 Capacity Candidate或扩容，不能假设 Retention到期即刻回收。
- 扩容优先增加同规格 OSD/Storage Node，并保持 CRUSH Host 故障域和容量分布均衡；禁止在线缩小 OSD、把一个 OSD 切成多个共享数据目录，或通过提高 Full Ratio 掩盖容量不足。磁盘型号、固件与扩容批次必须通过 SMART、`fio`、Burn-in 和 DEV Recovery/Backfill 验证后进入 PROD。
- Ceph 维护、升级或自愿中断一次最多处理 1 个 Storage Node；每次操作前后必须验证 MON Quorum、MGR Standby、RGW Endpoint、全部 PG 状态和副本健康。两 Host 同时不可用时不得继续写入或进行下一步维护。
- Erasure Coding 只在未来至少具备 6 个、优先 7 个以上独立 Storage Host，且大对象容量成为主要成本时单独评审 `4+2` 等新 Data Pool；RGW Metadata 仍保持三副本，现有 Replicated Pool 不执行原地转换。
- Rook-Ceph 首版职责严格限定为 RGW Object Storage，不为 PostgreSQL、Valkey、NATS、OpenBao 或其他 Stateful Workload 提供通用 RBD/CephFS StorageClass，也不部署当前没有需求的 CephFS/MDS。
- PostgreSQL、Valkey、NATS 和 OpenBao 继续使用相互隔离、低延迟、非共享的 SSD/RWO Volume，并依赖各自已经确定的应用级复制与故障切换；首版统一引用逻辑 `stateful-rwo-lowlatency`，当前 Provider Mapping 使用经过 PCS 验证的 Alibaba Cloud ESSD CSI。未来切换 Provider 时沿用上述显式数据迁移与验证流程，不能通过直接修改默认 StorageClass 隐式迁移。
- 禁止把上述组件的实时 Data PVC 与其位于 RGW 的 Backup/Snapshot 放进同一个 Ceph 故障域，避免 Ceph 故障同时带走运行数据与恢复源，也避免应用级复制再叠加 Ceph 三副本造成无必要的多重复制、写放大和恢复耦合。
- 是否在未来为某个独立 Workload 引入 Ceph RBD，必须基于明确需求、基准测试、故障分析和数据迁移方案单独评审；不得通过修改默认 StorageClass 把现有 Stateful Workload 整批隐式迁入 Ceph。
- 本节 Ceph与其承载的 PostgreSQL/NATS/OpenBao等备份对象仍位于同一站点，只满足既定 Cluster HA/Cluster DR边界，不构成 Site DR；Cluster外的 etcd Backup Repository当前同样没有升级为异地 Site DR。未来切换云 S3-compatible服务、独立 Object Storage Cluster或异地 Control Plane Repository时必须保持领域模块与 Workflow不变，仅替换 Adapter、配置、凭据和迁移流程。

### 9.8 Secret 与数据库凭据（已确认）

- OpenBao保存正常在线应用与基础设施 Workload Secret值，PostgreSQL只保存 Secret引用、用途和版本元数据；明确要求 Cluster外/离线保管的 Bootstrap与 Recovery材料不进入 OpenBao，继续按各自 Recovery Contract管理。
- 应用通过 Workload Identity/Agent Injector 获取 Secret，并以内存文件挂载到 Pod；不在 Deployment YAML、环境配置仓库或镜像中保存明文。
- 首版数据库使用静态、最小权限、按服务/用途隔离的账号凭据，由 OpenBao 托管并支持轮换。
- 后续可单独升级为数据库动态凭据和短期 Lease，不要求修改业务模块。
- Secret 读取、轮换、吊销、注入失败和管理员变更必须审计。

### 9.9 灾难恢复与演进（已确认）

- 当前只有同一站点/服务器资源，首版实现 Cluster 级备份、恢复和故障切换。
- Kubernetes Control Plane以 Cluster外 `kubernetes-etcd-backup` Snapshot + Recovery Bundle作为权威 Cluster DR入口；它与 Cluster内 Ceph/RGW解耦，但当前仍位于同一站点，不改变 Site DR边界。
- Site 级灾难恢复属于后续迭代，不在首版假装已经具备。
- 第一阶段不实现 Site 级 DR，也不创建不能执行复制、切换和恢复演练的占位服务；当前文档只保留清晰的独立演进边界。
- 必须在架构文档中维护以下独立演进路径：
  - Control Plane 模块化单体 → 独立微服务；
  - PostgreSQL → 云托管 PostgreSQL 或模块独立数据库；
  - Valkey HA → Valkey Cluster 或云 Redis-compatible；
  - NATS JetStream → 扩展集群或其他 Event Bus Adapter；
  - OpenBao → 托管 Secret Manager；
  - S3-compatible Object Storage → 其他自建或云托管实现；
  - 精简 Observability → 分布式 Observability；
  - Sandbox Node Pool → 独立 Sandbox Cluster；
  - Cluster 级 DR → Site 级 DR。

### 9.10 Observability（已确认）

Observability职责与事实边界：

- Observability通过稳定的 `TelemetryPort`、`MetricsQueryPort`、`LogQueryPort`、`TraceQueryPort`、`AlertQueryPort`和 `ConsoleAccessPort`接入平台；领域模块只产生标准 Telemetry与 Correlation Context，不直接依赖 Prometheus、Thanos、Loki、Tempo、Grafana或某个 Chart的私有 API。替换 Backend只改变 Adapter、GitOps Mapping和迁移流程，不修改领域模型或业务 Workflow。
- Metrics、普通 Log、Trace与 Hubble Event都是诊断数据，不是 Requirement、Attempt、权限、Workflow、Audit或 Artifact的权威事实。完整 Attempt Log仍按 Artifact链路保存；平台 Audit继续使用独立追加式事实与既定 WORM归档；OpenBao Audit继续使用本地 `7d`缓冲、集中热查副本和 `365d` WORM权威归档。Loki Retention到期不得级联删除上述权威数据。
- DEV与PROD使用同一组件清单、逻辑角色、HA/恢复机制、Helm/Kustomize模板、接口 Contract和 PCS，并在各自 Kubernetes Cluster中独立实例化。Prometheus数据、PVC、Loki/Tempo Bucket、Grafana数据库、Observability Cluster ID、Loki Tenant、Credential、证书、告警与查询边界不跨环境共享；DEV管理后台只查询 DEV，未来 PROD管理后台只查询 PROD。

首个 PCS Candidate版本：

- `kube-prometheus-stack 88.1.5`，对应 Prometheus Operator `0.93.0`、Prometheus `3.13.2-distroless`、Alertmanager `0.33.1`与 Grafana Helm Chart `12.10.3`/Grafana `13.1.2`；Thanos Sidecar/Query使用 `0.42.4`。
- Loki使用 Grafana Community Helm Chart `18.7.3`与 Loki `3.7.5`；OpenTelemetry Collector使用官方 Helm Chart `0.168.0`的默认 Operand `0.157.0`，不在未经 Chart兼容验证时单独覆盖到更新 Operand。
- Tempo使用 `3.0.2` Monolithic `target=all`。若 PCS冻结时官方 Monolithic Chart仍未支持同一 Major，则使用仓库内版本化、Schema校验且锁定 Image Digest的 Kubernetes/Kustomize Manifest，不把面向旧 App Major的 Chart强行覆盖镜像后冒充兼容；出现已验证的官方兼容 Chart时可以在新 PCS中替换部署 Adapter。
- 上述版本都是截至本轮的 Candidate。PCS冻结前必须再次核对最新安全 Patch、Release Note、EOL、Compatibility、Chart Provenance、SBOM和全部 Image Digest；Helm v3不会自动升级既有 CRD，Prometheus Operator等 CRD必须作为独立 GitOps Wave先执行 Conversion/Dry-run/Backup与 DEV升级回退验证，不能把 Chart升级等同于 CRD已经安全升级。

采集与 Correlation：

- 平台应用使用 OpenTelemetry SDK生成 Trace、应用 Metric和结构化 Log，并统一传播 W3C Trace Context以及 `request_id`、`trace_id`、`run_id`、`requirement_id`、`attempt_id`等批准的 Correlation ID。首版 Trace/Log通过 OTLP发送，应用 Metric通过进程内 Prometheus Exporter暴露并由 Prometheus抓取；OTel Gateway不承担 Prometheus Target Discovery或双写同一 Metric Series。非 OTel原生基础设施通过 Prometheus Exporter、ServiceMonitor/PodMonitor、组件原生日志和受控 Adapter接入；禁止再笼统描述为“所有基础设施组件原生使用 OpenTelemetry”。
- 每个 Kubernetes Node运行一个 OpenTelemetry Node Agent DaemonSet，负责读取本 Node批准的 Container Log、补充 Kubernetes Resource Metadata并发送到本环境 Gateway。Node Image必须预创建只供 Collector UID/GID写入、权限为 `0700`的有界 Checkpoint目录；Agent以 Non-root运行，只读挂载批准的 Pod Log路径并显式挂载该目录，禁止通过 Chart Preset静默切换 Root或扩大 HostPath。每个环境部署 `2`个 OpenTelemetry Gateway StatefulSet Replica，使用 Required Anti-Affinity、Topology Spread与 `PDB minAvailable=1`；应用或 Node Agent通过当前环境 ClusterIP/mTLS OTLP Endpoint发送，不能直接访问 Loki、Tempo或其他环境 Gateway。
- 两个 Gateway各使用独立 `10 GiB` RWO持久 Queue，按已验证峰值提供默认 `4h` Trace/Log重试目标；时间和容量任一先耗尽即达到缓冲边界。Queue达到 `70%`告警、`85%` Critical，Exporter拒绝、Retry Exhausted、Dropped Item和 Replay Lag必须持续计数并显示缺口；Telemetry SDK与 Agent使用有界非阻塞队列，Observability故障不得阻塞登录、Requirement、MR或 Agent Attempt等核心业务。
- 首版 Trace默认采集率为 `100%`并关闭 Tail Sampling、Span Metrics和 Tempo Metrics Generator，以低规模下的完整链路、唯一 Metrics事实源和简单故障语义优先；采样率、Attribute Allowlist、Batch、Queue、Retry与 Rate Limit都是 GitOps/PCS配置。未来启用 Tail Sampling或 Trace-derived Metrics前必须增加 Trace ID一致性路由、跨 Gateway故障、Metric去重、Cardinality和采样偏差验证，不能只打开 Processor开关。
- HTTP Header、Cookie、Authorization、Presigned Query、Password、Token、Secret、Prompt正文、源码、附件内容、SQL Bind Value和未经批准的业务 Payload不得进入 Metric Label、Log或 Span Attribute。高基数 Correlation ID保存为结构化字段/Metadata，不作为 Prometheus Label或 Loki Index Label；可索引 Label固定使用 Environment、Namespace、Service、Severity与受控 `log_class`等低基数字段。

Metrics、Alert与 Grafana：

- 每个环境运行 `2`个配置相同的 Prometheus Replica，保留各自 Replica External Label、Required Anti-Affinity、Topology Spread、`PDB minAvailable=1`和独立 `50 GiB` RWO PVC；两个 Replica独立抓取同一批准 Target并独立执行相同 PrometheusRule，不采用一个 Primary加一个闲置 Standby，也不启用自动 Sharding、Remote Write、Remote-write Receiver、Prometheus OTLP Receiver、Admin API、Lifecycle API或 Mimir。
- 每个 Prometheus内运行 Thanos Sidecar，每个环境运行 `2`个无状态 Thanos Query Replica。首版不配置 Thanos Object Storage，不部署 Store Gateway、Compactor、Receive、Ruler或 Query Frontend；Thanos Query只联邦两个 Sidecar并按 Replica Label去重。Grafana、平台 Metrics Adapter和只读排查入口统一查询 Thanos Query，不能通过 Kubernetes Service随机查询某个 Prometheus后宣称已完成去重；Partial Response必须显示 `DEGRADED`和缺失 Replica，不能静默当作完整结果。
- 每个环境运行 `3`个 Alertmanager Replica，Required Anti-Affinity、Topology Spread、独立 `5 GiB` RWO PVC与 `PDB minAvailable=2`。两个 Prometheus必须分别发现并直接向全部 Alertmanager实例发送 Alert，不能先经过只选择一个 Backend的普通负载均衡 Service；发送前通过受版本控制的 `alert_relabel_configs`从 Alert Label Set删除唯一 `prometheus_replica` Label，使两个 Replica产生的同一业务 Alert能够被 Alertmanager去重，但 Prometheus TSDB/Thanos Query路径继续保留该 External Label用于 Metrics去重。Alertmanager Cluster Peer使用 mTLS，Gossip复制 Silence和 Notification Log并完成重复通知抑制。网络分区时官方 HA语义允许各分区 Fail-open并可能产生重复通知，恢复后必须重新收敛和告警，不能为了绝对去重阻止真实告警送达。
- `PrometheusRule + Alertmanager`是首版唯一告警计算与通知状态事实源，Grafana Managed Alerting默认关闭，避免两套 Rule、Silence与 Notification Policy。平台 Operations Adapter通过受限 API拉取 Active/Silenced/Resolved状态；未来新增 Email、Webhook或其他通知渠道时扩展 Alert Receiver Adapter，不改变监控数据路径。
- 每个环境运行 `2`个 Grafana Replica，通过 `platform-gateway`负载均衡，并共享同环境 CloudNativePG中的独立 `grafana`数据库、最小权限 Role与 TLS连接；禁止使用 SQLite实现伪 HA。Dashboard、Data Source、Folder、Plugin与 Viewer权限由 GitOps Provisioning管理，运行时 Plugin安装、未锁定 Plugin下载和浏览器持有 Data Source Credential全部禁用；Grafana Live、Anonymous、Self Sign-up和普通 Basic Login首版关闭，只保留受审计的基础设施 Break-glass流程。Grafana Managed State随 PostgreSQL备份，Dashboard/Rule声明同时由 Git保存。

Log与 Loki：

- 每个环境使用 Loki Monolithic模式运行 `3`个 Replica，固定 `replication_factor=3`，通过 Required Anti-Affinity、Topology Spread和 `PDB minAvailable=2`分散到不同 `platform-worker`；每个 Replica使用独立 `10 GiB` RWO WAL PVC。写入 Quorum不足、Ring异常、WAL Replay失败或 Object Storage不可用时必须明确返回错误并由 OTel Queue有界重试，不能接受数据后静默丢失。
- Loki使用本环境 `observability-logs` RGW Bucket Set保存 TSDB v13、`24h` Index Period的 Index/Chunk等对象；首版部署 `2`个无状态 Loki Gateway并显式关闭 Chart内置 MinIO、Chunks Cache和 Results Cache，低规模查询直接访问 Backend，避免为非权威 Cache增加单点与额外 Stateful组件。未来只有 Query p95、Object I/O或容量证据触发时才在新 Capacity Profile中启用多副本 Cache。
- 普通平台/Kubernetes运行日志默认保留 `14d`；受批准的 Security、OpenBao Audit热查副本和关键访问日志默认保留 `30d`；Hubble只导出 NetworkPolicy Deny与异常 Drop等批准事件并默认保留 `7d`。`log_class`只能由受控 Pipeline映射，Workload不能自行把普通日志标为更长保留类别绕过 Quota。
- Loki Compactor/Retention是在线对象清理的事实源；`observability-logs`与 `observability-traces` Bucket Lifecycle首版只负责 Abort未完成 Multipart Upload，不按整个 Bucket、空 Prefix或对象年龄直接删除 Backend对象，避免误删仍被 Index、Delete Request、Ruler或 Block Metadata引用的数据。Loki Retention变更不追溯重解释已经 Ingest的既有 Log，只作用于新配置生效后的数据；Impact Preview必须同时展示新旧窗口、旧数据预计自然到期时间和容量回收曲线。若未来确需提前删除既有诊断 Log，必须设计独立受控 Deletion流程，不能伪装成 Retention调整，也不能影响 Audit/WORM权威数据。

Trace与 Tempo：

- 每个环境只运行 `1`个 Tempo `3.0.2` Monolithic `target=all` StatefulSet Replica，使用独立 `10 GiB` RWO本地恢复卷和 `observability-traces` RGW Bucket保存 Trace Block，默认保留 `7d`。Tempo 3 Monolithic不支持以多个 `target=all`实例实现 HA，因此禁止增加 Replica后宣称 Trace Backend HA，也不为它引入 Kafka、Redpanda或全分布式组件。
- Tempo Pod、Node或升级故障期间，Trace查询允许不可用，OTel Gateway在已确认的 Queue边界内继续缓冲并重试；恢复后 Replay并重新开放查询，已写入 RGW的历史 Block继续可读。故障超过 Queue窗口或容量时允许丢弃诊断 Trace，但必须显示精确 Gap、时间范围、原因和 Dropped Count；不得把该行为描述成零丢失或完整 HA。
- Tempo单实例升级只能在两个 Gateway Queue健康、剩余容量覆盖验证窗口且无既有基础设施故障时进行；升级期间由 Queue吸收写入，完成 Config/Block兼容、Canary Trace、Search和 Replay Gate后再结束维护。不能通过 PDB阻止所有必要重调度，也不能同时升级 Collector、Tempo和 RGW隐藏故障来源。

访问控制、安全与环境隔离：

- Observability Namespace默认双向拒绝；Prometheus Scrape、Thanos Sidecar/Query、Alertmanager、Grafana、OTel Agent/Gateway、Loki Gateway/Replica、Tempo、Hubble、平台 Operations Adapter与 RGW之间维护按 ServiceAccount、Namespace、稳定 Label和端口声明的最小通信矩阵。所有 Backend保持 ClusterIP且不直接暴露公网；OTLP、Query和 Backend连接使用经 PCS验证的 TLS/mTLS与独立 Workload Identity，Credential由 OpenBao注入，禁止进入 Helm Values、ConfigMap、浏览器或日志。
- Loki的 Tenant Header只是路由选择器，不构成身份认证；只有受信 Loki Gateway、OTel Gateway、Grafana Data Source和 Operations Adapter可以访问 Loki Backend。所有入口必须删除外部传入的 `X-Scope-OrgID`、Auth Proxy和其他身份 Header，再依据当前环境的 mTLS Service Identity注入固定 Loki Tenant；NetworkPolicy阻止任何 Workload绕过 Gateway直连，不能仅依赖 Header保密。Tempo首版显式使用单租户模式 `multitenancy_enabled=false`，不接受或解释客户端 Tenant Header，环境隔离由独立 Cluster实例、mTLS Service Identity和 NetworkPolicy实现。
- Grafana与 Hubble只能从当前环境的平台管理后台以新标签页打开。`platform-gateway`先校验当前平台 Session，以及具有 Platform Scope的 `observability.console.read`或 `network.console.read` Capability，删除客户端伪造身份 Header，再通过受信 Auth Proxy/Console Access Adapter注入短期只读运维身份；NetworkPolicy只允许该入口访问 Console。Grafana OSS Viewer和 Hubble Console能够执行当前环境范围查询，不提供 Workspace/Requirement/Attempt行级隔离，因此细粒度 Scope用户不得获得专业 Console入口；其查询必须经过会强制注入 Scope Filter与结果裁剪的平台 Adapter。浏览器不得取得 Prometheus/Loki/Tempo/Hubble、Kubernetes或 RGW Credential，也不能通过知道内部 URL绕过授权。
- Grafana用户首版固定为 Viewer/Explore只读权限，Data Source使用独立只读服务身份；Alert Silence、Retention、Rule、Data Source、Dashboard、Plugin和基础设施参数不从 Grafana UI修改。未来确需平台提供受控 Alert Silence时必须使用独立 Capability、最长有效期、原因、TOTP和 Audit的 Command Adapter，不能把 Grafana Admin发给普通用户。
- 每个环境使用固定且不同的内部 Observability Cluster Identity与 Loki Tenant；Gateway和 Console Adapter覆盖而不是信任客户端提交的 Tenant Header，Tempo保持单租户且不使用 Header伪造隔离。Sandbox不能直接访问 Observability Backend或查询其他 Attempt数据，只能把批准 Telemetry发送到 Node Agent/Gateway；Platform Scope运维人员可以进入当前环境专业 Console，其他用户只能通过执行强制 Scope Filter的平台 API查看被授权的聚合结果。

Retention、容量与故障可见性：

| 数据类别 | 首发默认值 | 存储与边界 |
| --- | ---: | --- |
| Prometheus Metrics | `30d` | 每个 Replica独立 `50 GiB` PVC；容量 Gate必须证明 30 天数据低于安全水位 |
| 普通 Loki Log | `14d` | `observability-logs`；非权威热查副本 |
| Security/Audit热查 Log | `30d` | `observability-logs`；不替代 Audit/WORM |
| Hubble Deny/异常 Drop | `7d` | Loki受控 `log_class`；全量 Flow不落盘 |
| Tempo Trace | `7d` | `observability-traces`；诊断数据、Backend非 HA |
| OTel Gateway Queue | 目标 `4h` | 每 Replica `10 GiB` RWO；时间/容量任一先到即为边界 |

- Retention、采样率、Queue、PVC、Quota、Scrape Interval、Rule、Cardinality与 Rate Limit属于 `GITOPS_CONFIG`，管理后台只读展示 Desired、Effective、Revision、Usage、预计可保留窗口与 Drift；Super Admin也不能从业务后台直接修改。所有时间与容量可通过新 GitOps/Capacity Profile版本调整，但不得突破 Audit等更高层 Security/Compliance Floor。
- `observability-logs`与 `observability-traces`的权威 Class Operating Quota引用 9.7 Environment Capacity Profile，当前分别为 `150 GiB`与 `50 GiB`，不得在各物理 Bucket重复分配整份 Class额度。`ClassOperatingUsage`达到其 Class Quota的 `70%/85%`分别产生 Warning/Critical；各 PVC的 `PVCUsage`和 OTel Queue的 `QueueUsage`独立按自身 Envelope使用 `70%/85%`阈值并标明分母。Ceph Raw/最满 OSD既定 `50%`扩容线和 Recovery预算继续优先，不能因单 Class、PVC或 Queue尚未达到阈值而忽略底层容量风险。
- Prometheus Scrape Gap、Rule Evaluation、Alert Delivery、Thanos Sidecar/Query Endpoint与 Partial Response、Grafana DB/Session、Loki Ring/Quorum/WAL/Compactor、Tempo Query/Ingest、OTel Queue/Retry/Drop、Hubble Relay、PVC、`ClassOperatingUsage`、`RGWHardLimitUsage`、RGW错误、Cardinality和证书到期全部纳入自监控。告警必须明确指标类型、分母、当前环境、影响信号/组件、起止时间、Correlation ID（如存在）、数据缺口、Runbook和受权 Deep Link；Observability自身故障不能只依赖故障组件给自己告警。
- 每个环境持续产生 Alertmanager Watchdog/Deadman信号，并发送到位于被监控 Cluster故障域之外、由运维管理的最小外部 Receiver；该 Receiver不进入平台领域模块，也不获得 Cluster管理凭据，只负责检测整个 Alerting Pipeline或 Cluster失联。外部 Receiver尚未就绪时，管理后台必须显示 `EXTERNAL_WATCHDOG_NOT_READY`，只能声明 Cluster内部自监控，不能宣称已覆盖整 Cluster或站点完全失联。
- Prometheus单 Replica故障时由另一个 Replica继续 Scrape/Rule，Thanos Query降级查询；Alertmanager单 Replica故障时剩余实例继续去重与状态复制；Loki单 Replica故障时剩余两个维持写 Quorum；Grafana或 OTel Gateway单 Replica故障时由另一个继续服务。任何第二故障突破 Quorum、数据不完整或 Query Partial都必须显示 `DEGRADED/UNAVAILABLE`，不能只以 Pod Running判定健康。
- Prometheus PVC与普通 Observability诊断数据不建立独立业务级 Backup/RPO承诺；Grafana共享数据库继承 PostgreSQL Backup/PITR，Dashboard/Rule/Collector配置由 GitOps重建，Loki/Tempo对象依赖 RGW同站点复制与当前 Retention。当前仍只属于 Cluster HA/Recovery，不构成 Site DR；Observability失败或恢复不能改变业务事实、权限、Workflow和 External Effect Ledger。

首年资源与升级余量：

| 组件 | Replica | CPU Request / Limit | Memory Request / Limit | 单 Replica持久化 |
| --- | ---: | --- | --- | ---: |
| Prometheus | 2 | `500m / 2 CPU` | `1 GiB / 4 GiB` | `50 GiB` |
| Thanos Sidecar | 2 | `100m / 500m` | `128 MiB / 512 MiB` | 随 Prometheus，无独立 PVC |
| Thanos Query | 2 | `100m / 500m` | `256 MiB / 512 MiB` | 无 |
| Alertmanager | 3 | `50m / 500m` | `128 MiB / 256 MiB` | `5 GiB` |
| Grafana | 2 | `100m / 1 CPU` | `256 MiB / 1 GiB` | 使用 PostgreSQL，无本地 PVC |
| Loki Monolithic | 3 | `250m / 2 CPU` | `512 MiB / 2 GiB` | `10 GiB` WAL |
| Loki Gateway | 2 | `50m / 250m` | `64 MiB / 256 MiB` | 无 |
| Tempo Monolithic | 1 | `250m / 2 CPU` | `512 MiB / 2 GiB` | `10 GiB` |
| OpenTelemetry Gateway | 2 | `250m / 1 CPU` | `512 MiB / 1 GiB` | `10 GiB` Queue |
| Prometheus Operator | 1 | `100m / 500m` | `128 MiB / 512 MiB` | 无 |
| kube-state-metrics | 1 | `100m / 500m` | `256 MiB / 512 MiB` | 无 |

- 加上已确认的 2个 Hubble Relay与 Hubble UI、Chart必要 Sidecar和取整余量后，每个环境 Observability固定 Pod稳态 Request约为 `4.1 CPU / 8 GiB`；这不是物理服务器规格，也不包含 Node级 DaemonSet。每个 Node另计 OpenTelemetry Agent `100m / 256 MiB`、node-exporter `50m / 64 MiB`和 Loki Canary `20m / 32 MiB`，合计约 `170m CPU / 352 MiB`；Cilium/Hubble Agent已在 Cilium容量中计算，禁止重复计费。
- 每个环境 Observability RWO PVC合计为 `175 GiB`：Prometheus `100 GiB`、Alertmanager `15 GiB`、Loki WAL `30 GiB`、Tempo `10 GiB`、OTel Gateway Queue `20 GiB`。Grafana数据库容量计入 PostgreSQL，Loki/Tempo Object Data分别计入对应 Bucket Class Operating Usage与物理 RGW hard quota，三者不能重复相加为同一种存储。
- 首版不启用 Observability HPA/VPA；扩缩容只生成新的 Capacity Profile Candidate并经过 DEV负载、单 Pod/Node故障、Queue Replay、Retention、Cardinality与查询 Gate。组件按 CRD/Operator、Metrics/Alert、Log、Trace、Console、Collector顺序分 Wave升级，Stateful Backend一次只滚动一个 Replica且不同 Backend不同时升级；Capacity Profile额外保留至少 `1 CPU / 2 GiB`固定 Pod Rollout Headroom和每 Node一份 DaemonSet升级开销。
- 连续 `15min`出现任一 Prometheus/Loki/Tempo核心资源或 Query p95突破当前 Envelope、30天容量预测越过安全线、Prometheus需要超过 `30d`统一长期查询、Loki Monolithic无法满足单实例资源/写 Quorum、Tempo需要 Active-Active或 Queue Gap不再可接受时，进入 `OBSERVABILITY_SCALE_REVIEW`。演进路径分别是 Thanos Object Store或 Mimir、Loki Distributed、Tempo Microservices +经批准的 Kafka-compatible系统以及独立 Observability Cluster；切换必须使用新 PCS、Dual Write/Read、Query Parity、Retention/Backfill、故障与回退验证，不修改领域模块。

## 10. 管理后台、通知与运维视图

### 10.1 管理后台（已确认）

- 在单一 Platform Environment 内，用户端和管理端使用同一个 Web 构建产物、同一个 Control Plane API、当前环境本地的用户事实与登录态。DEV/PROD 使用同源代码、Contract、GitOps 模板和 PCS，但不共享 Web/Control Plane 运行实例、域名、Session、用户记录或数据库；管理后台只治理和展示当前环境。
- 管理菜单和 API 按 Capability + Scope 开放，不通过“管理员”或“开发 Leader”字符串硬编码。
- Grafana、Hubble、Temporal、OpenBao 等专业控制台的入口统一由当前环境的平台管理后台提供，并在新标签页打开；入口必须经过对应 Console Access Adapter授权，不能把菜单可见性当成控制台认证。
- 当前部署只显示当前环境的数据：DEV 域名只展示 DEV，PROD 域名只展示 PROD。
- 管理后台提供统一运行状态页面，通过后端聚合接口显示容器、数据库、缓存、NATS、OpenBao、Object Storage、Agent、Sandbox 和基础设施告警，方便开发与运维排查。
- 统一运行状态页面必须覆盖所有已经在架构中确认且具有运维意义的 Baseline、有效配置、实时状态、容量、性能、可用性、备份恢复、依赖健康、告警和趋势指标，而不是只显示简单的“正常/异常”。覆盖对象包括 Kubernetes Node/Pod/Deployment、PostgreSQL/CloudNativePG/PgBouncer、Valkey/Sentinel、NATS/JetStream、Temporal、OpenBao、Rook-Ceph/RGW、Object Storage Bucket、Prometheus/Thanos/Alertmanager、OpenTelemetry、Loki、Tempo、Grafana、Hubble、Agent/Sandbox、Model Provider、Source Control Connector以及后续通过 Adapter接入的基础设施。
- 页面采用“全局概览 → 组件详情 → 实例/告警详情”的渐进层级；概览突出当前环境的 Critical/Warning、受影响能力和容量风险，组件详情展示当前值、有效阈值、目标 Baseline、趋势与最近变更，告警详情展示发生时间、持续时间、影响范围、关联 Correlation ID、Runbook 和专业控制台 Deep Link。原始高基数指标、复杂日志和 Trace 查询继续由 Grafana 等专业控制台承载，避免在平台重复实现完整可观测性产品。
- 业务级动态配置只有 Super Admin 可以在平台内创建 Draft、校验、发布和回滚并完整审计；其他人员不因岗位、Workspace Owner 或模块管理能力取得配置修改权。Ceph Fullness Ratio、Replica、Kubernetes Resource、OpenBao Seal 等基础设施安全参数首版在平台中只读展示“期望值、实际生效值和 Drift”，Super Admin 也不能从平台后台修改，必须经过受控 GitOps 流程。Secret、Token、Access Key、TOTP Secret 和加密私钥永不在看板展示，只显示引用、健康、版本、轮换与到期状态。
- 聚合后端通过版本化 Observability/Operations Adapter读取 Thanos Query、Alertmanager、Loki、Tempo、Hubble、Kubernetes API和各组件受限管理接口，统一归一化 Health、Metric、Alert、Gap、Drift与 Runbook Link；Web前端不得直接持有基础设施凭据或直连各数据组件。新增或替换 PostgreSQL、Redis-compatible、Event Bus、Secret Manager、Object Storage或 Observability Backend时，只替换 Adapter和映射，不修改管理后台领域模型。
- 平台页面不取代专业控制台；复杂查询仍跳转外部控制台。

### 10.2 消息与安全公告（已确认）

- 首版消息通知采用简单的后端 API 拉取，不先建设复杂实时推送中心。
- 安全公告只通过预置 Source Adapter 调用官方 API 或机器可读 Feed，首版批准的数据源为 CISA KEV、NVD API 2.0 和 OSV API；不抓取网页 HTML，也不允许管理员填写任意抓取 URL。
- Source Adapter、Endpoint、超时、限流和所需凭据相互隔离；凭据由 OpenBao 管理，新增数据源不修改公告领域模块。
- 首版 Technology Inventory 使用平台级全局动态配置，记录关注组件或依赖的名称、生态、供应商标识和当前版本；采集结果只筛选与 Inventory 匹配的 CISA KEV，以及 High/Critical 漏洞。
- 每周日 `02:00` 按 `Asia/Shanghai` 时区增量采集，每周一 `07:00` 自动发布，无需人工发布 Gate；调度值通过版本化平台配置管理，不写死在业务代码中。
- 去重优先使用 CVE ID；OSV/GHSA 等 Alias 必须合并到同一漏洞记录。没有 CVE ID 时使用来源标识、来源内 Advisory ID 和规范化指纹去重。
- 单个数据源失败最多重试 3 次。部分数据源成功时可以生成并发布公告，但必须明确标注本期成功、失败和缺失的数据源覆盖情况。
- 全部数据源失败时不得发布空公告或伪装成“本周无漏洞”；保留上一期公告，生成运维告警并通知具备相应 Capability 的管理员。
- 公告采用结构化模板，至少包含紧急程度、CVE/Advisory ID、受影响组件与版本、已知修复版本、处置建议、是否已知被利用、官方来源链接及本期数据源覆盖状态。
- 是否可见由公告读取 Capability + Scope 决定。管理员、开发 Leader只是默认能力配置对象，不是代码中的角色判断；创建账号时勾选相应能力即可访问。
- 采集游标、原始来源摘要与哈希、规范化结果、去重关系、筛选原因、重试、生成、发布、失败和公告内容版本都要可查询并写入 Audit。

## 11. Audit 与可观测性

- Audit 表示审计：记录谁在何时、以何种身份、对哪个对象执行了什么操作、结果如何以及前后值摘要。
- Audit 不是 Requirement 逻辑删除表，也不是普通业务历史表；它是独立的追加式、防篡改事实。
- Identity、Organization、Workspace、Capability、Assignment、Workflow、MR、Agent Attempt、Secret、归档、恢复和逻辑删除等关键动作都必须审计。
- 审计正文不保存 Secret、完整密码、TOTP Secret、Token 或未经批准的敏感 Prompt/代码。
- 平台应用使用 OpenTelemetry SDK/OTLP并统一传播 trace/request/run/requirement/attempt等 Correlation ID；非 OTel原生基础设施通过 Prometheus Exporter、ServiceMonitor、原生日志或受控 Adapter接入，具体边界以 9.10为准。
- 管理后台展示可操作告警、Telemetry Gap和 Partial Query，并为每类告警关联 Runbook与受权排查入口；Observability数据不得替代独立 Audit事实。

## 12. 完整架构收口状态

业务领域、主要基础设施组件组、Cluster 外 `kubernetes-etcd-backup` 权威 Repository、每环境独立的 Cluster 外 Private L4 Kubernetes API Endpoint、Control Plane 本地 `secretbox` Data-at-rest Encryption、DEV/PROD 独立 Cloud Account + 独立 VPC 边界、External Provider Contract，以及首个 DEV/PROD Environment Capacity Profile Candidate 均已确认。目前没有尚未选择的产品级、信任拓扑级或容量拓扑级架构分支；Region、Zone、精确 Provider SKU、价格和折扣属于部署输入，不再作为架构待确认项。

### 12.1 首个 Environment Capacity Profile Candidate（已确认）

| 环境 | Node Role | 数量 | 单 Node CPU / RAM | 单 Node 磁盘 | 角色 CPU / RAM 小计 |
| --- | --- | ---: | --- | --- | --- |
| DEV | `k8s-control-plane` | 3 | `2 vCPU / 4 GiB` | `100 GiB` OS/etcd | `6 vCPU / 12 GiB` |
| DEV | `platform-worker` | 4 | `8 vCPU / 32 GiB` | `100 GiB` OS/Runtime | `32 vCPU / 128 GiB` |
| DEV | `sandbox-worker` | 2 | Alibaba Fallback：`64 vCPU / 192 GiB` | `100 GiB` OS + `500 GiB` Runtime | Fallback：`128 vCPU / 384 GiB` |
| DEV | `storage-worker` | 3 | 至少 `8 vCPU / 32 GiB` | `256 GiB` OS/MON + `1 TiB` Raw OSD | 至少 `24 vCPU / 96 GiB` |
| PROD | `k8s-control-plane` | 3 | `4 vCPU / 8 GiB` | `100 GiB` OS/etcd | `12 vCPU / 24 GiB` |
| PROD | `platform-worker` | 6 | `8 vCPU / 32 GiB` | `200 GiB` OS/Runtime | `48 vCPU / 192 GiB` |
| PROD | `sandbox-worker` | 2 | Alibaba Fallback：`64 vCPU / 192 GiB` | `100 GiB` OS + `800 GiB` Runtime | Fallback：`128 vCPU / 384 GiB` |
| PROD | `storage-worker` | 4 | 至少 `8 vCPU / 32 GiB` | `256 GiB` OS/MON + `1 TiB` Raw OSD | 至少 `32 vCPU / 128 GiB` |

- 当前只采购和部署 DEV：共 `12` 个 Node；未来 PROD 另行创建 `15` 个 Node。`27` 个 Node 只是两个独立环境未来同时存在时的算术合计，不是当前采购量，也不代表二者共享任何实例。
- 在当前 Alibaba EBM Fallback 与 Storage Node 最低规格下，DEV 派生 Raw Compute 为至少 `190 vCPU / 620 GiB RAM`，未来 PROD 为至少 `220 vCPU / 728 GiB RAM`。这些是当前 Provider Candidate 的派生值，不是跨云架构常量；若目标 Region/Zone 采用通过 PCS 的较小 Nested-Virtualization ECS，必须依据 Effective SKU 重新计算。
- `12/15` Node Count、四类 Node Role、故障域、Replica/Quorum、Kata/KVM、单 Node 故障余量和 DEV `5 Units`/PROD `8 Units` Sandbox Capacity Contract 已确认；具体 CPU/RAM SKU 仍是 `CANDIDATE`。未经实际 Allocatable、逐 Node 调度碎片、PDB/Anti-affinity、RWO Topology、KVM、I/O、N+1、Rollout Surge 与故障演练，不得标记为 `VALIDATED` 或 `ACTIVE`。
- 如果真实调度或 Provider Gate 证明某个 Candidate 不可用，只创建新的 Environment Capacity Profile 或 Compute/Storage Provider Mapping进行调整，不反向修改 Requirement、Workflow、Agent、Authorization 等领域模块。

### 12.2 存储 Bill of Materials 与去重口径（已确认）

| 环境 | Node 系统类磁盘 | Sandbox Runtime 磁盘 | Ceph Raw OSD | 当前 Active ESSD PVC | 仅用于 TCO 的 Nominal 总量 |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV | `1,668 GiB` | `1,000 GiB` | `3 TiB = 3,072 GiB` | `28` 卷 / `425 GiB` | `6,165 GiB ≈ 6.02 TiB` |
| PROD | `2,724 GiB` | `1,600 GiB` | `4 TiB = 4,096 GiB` | `32` 卷 / `675 GiB` | `9,095 GiB ≈ 8.88 TiB` |

- `Active ESSD PVC` 合计已经包含 PostgreSQL、Valkey、NATS、OpenBao Data/Audit、Scanner Signature 与 Observability RWO Volume；Temporal 与 Grafana 的持久事实已经计入 PostgreSQL，不能再增加一份独立数据库容量。首个 Candidate让 Ceph MON 的独立数据目录落在各 `storage-worker` 的 `256 GiB` OS/MON SSD容量边界内，不再重复申请3个MON ESSD PVC；若未来Provider Mapping改为独立MON PVC，必须生成新Capacity Profile并重新计算卷数与成本。
- 上表是名义购置容量，不是可用业务容量、Kubernetes Allocatable或故障后容量；云盘最小规格取整、Filesystem Reserved、Snapshot、`Retain`遗留卷、恢复演练临时卷和Provider IOPS/性能等级在精确报价时单列。
- Ceph Bucket Class Operating Quota、Audit Emergency Margin、Loki/Tempo对象数据与三副本Logical Capacity都位于已计费的Raw OSD内部，不能在TCO中再次相加，也不能把三副本再乘一次。Loki/Tempo本地WAL、Queue或恢复卷属于ESSD PVC，与Ceph对象数据职责不同，两者都要计费，但不能把同一对象重复计算。
- PostgreSQL/NATS/OpenBao的在线ESSD PVC与其Ceph备份对象是两份真实且用途不同的存储，因此PVC和Raw OSD都计费；备份Bucket Quota只是Raw OSD内部Logical Allocation，不形成第三份云盘费用。
- Cluster外`kubernetes-etcd-backup` Repository尚未固定GiB数，后续按真实Snapshot p95、Retention、Version/Object Lock、Manifest与Working Set计算。外部Watchdog/Collector、NLB、KMS、NAT/EIP/Egress及恢复演练瞬时资源也不在上述Node/PVC磁盘合计中，必须在TCO Snapshot单列。

### 12.3 Region、Provider SKU 与 TCO Contract（已确认）

- 当前部署状态明确为`Region/Zone UNASSIGNED`，表示尚未由运维选择部署位置，不是遗留的产品架构问题。已确认拓扑仍是每个Platform Environment单Region、Single-Zone、独立Resource Account/VPC/Kubernetes Cluster；当前只承诺Cluster HA与Cluster DR，不宣称Zone、Region或Site DR。
- DEV与未来PROD分别由各自不可变`CloudEnvironmentBinding` Generation绑定Region和单元素Zone Set；二者不要求相同或不同。Region、Zone、vSwitch、CIDR、精确Provider Resource ID和SKU属于环境部署参数，迁移Region/Zone必须创建新Binding Generation、执行数据迁移和重新验证，但不修改领域模块。
- Provisioning Gate必须把`CloudEnvironmentBinding Generation + PCS Digest + Environment Capacity Profile Digest`绑定为一组证据，并验证目标账号/Region/Zone的正式服务可用性、Quota、库存和故障替换余量；精确ECS/EBM SKU、CPU/NUMA、Ubuntu Image/Kernel；Deployment Set/独立Host；KVM与Kata；ESSD类别、CMK加密、挂盘上限、Attach/Detach/Fence和CSI；Storage Node 10 Gbps路径、Raw OSD与Recovery；Private NLB；KMS、Backup Repository与Object Lock，以及全部调度、故障和升级Gate。任一条件失败时保持`CANDIDATE`，不能静默降级。
- 价格不进入PCS或Capacity Profile Digest。成本使用独立、版本化、只读的`Environment TCO Snapshot`，引用对应Binding、PCS和Capacity Profile，至少记录报价时间与有效期、Region/Zone、精确SKU和数量、包年包月/按量及期限、磁盘种类和性能等级、NLB/KMS/外部Backup/NAT/EIP/Egress、流量假设、币种、税费和折扣。管理后台可以只读展示当前Snapshot与差异，但不能修改云资源或把历史报价当成实时账单。
- Region未选定时只确认资源Bill of Materials与计费项目，不编造精确月费。Region/Zone、购买方式和折扣确定后，先计算当前DEV；未来PROD单独估价，再按需要汇总，避免把未来15个Node误算为当前支出。

### 12.4 完整回写与一致性审查（已完成并批准）

`00～07`精简版、详细版、README和本决策基线已经统一回写为当前有效架构；旧命名、旧默认值、废弃方案对照、共享环境误解、Jenkins集成残留和已经解决的“继续确认”标记已经清理。用户已于 `2026-08-06` 明确批准版本 `.173`，全部文档统一标记为“完整架构基线（已批准）”。

收口审查已经分别覆盖业务领域、Identity与授权、Requirement/SDD/GitLab、Agent/Model/Sandbox，以及基础设施、安全、恢复、Observability、Capacity/TCO和Markdown机械完整性。审查发现的Jenkins边界、密码重置/TOTP分支、Stateful Storage、Ceph介质加密、Provider Replay恢复、PKI、NATS/OpenBao DR、Tenant安全、组织树和历史枚举问题均已直接回写当前Contract；相对链接、Markdown Fence、版本/状态与`git diff --check`已通过验证。

如果后续发现已确认Contract之间存在真实矛盾、安全闭环缺失或Capacity Profile无法部署，必须给出证据并只重新打开受影响的单一决策，形成新的架构版本；Provider SKU、CIDR、账号UID、价格、Patch/Digest和实施命令仍是部署输入或后续实施材料，不重新包装成产品架构选择题。

已经选择的Kubernetes、Ubuntu、containerd、Kata、Cilium、Gateway API、cert-manager与Observability等组件只需按既定保守策略在PCS冻结时核对最新受支持Patch、Artifact Digest、Compatibility Matrix与验证证据，不再把每个Patch/Digest拆成产品选择题。本次批准只确认架构，不自动授权编写后端开发Spec、实施Plan或代码；这些工作必须等待用户明确下达下一阶段指令。

## 13. 更新纪律

- 每批准一组跨模块规则，先更新本文件并形成新版本，再继续后续设计或实施。
- 修改必须直接更新当前有效规则并同步处理受影响模块；不得保留相互矛盾的旧规则、废弃方案或新旧对照表。
- 不把尚未确认的推荐方案写成既定事实。
- 每次架构版本变化都必须做全库一致性扫描，并统一直接修订 `00～07` 精简版、详细版及其他相关 Markdown；修订后的文档只描述当前有效架构。
- 架构批准不自动授权进入开发；后端开发 Spec、实施 Plan 或代码必须由用户明确启动。
