# 身份、组织与授权

> 实施阶段、激活状态和 Release 验收见[实施路线图](./12-implementation-roadmap.md)。

## 目标与边界

本主题为平台提供本地人员身份、组织关系、Workspace 人员边界与成员投影，以及动作授权，回答“谁是谁、属于哪里、能访问什么、当前由谁负责”。它同时定义 Super Admin 与 Bootstrap 边界、谁有资格发起受保护配置命令，以及 Identity 的带外恢复资格。授权结论只来自当前身份状态、服务端可信资源关系与 `Capability + Scope + Assignment`，不来自岗位名称、专业分类、菜单可见性、前端显示状态或外部系统角色。

本文不定义 Requirement 状态、WorkItem 流程、人工 Gate 规则、外部交付语义、Agent 执行或基础设施认证实现。Configuration Catalog 以及 Draft、Publish、Rollback、Effective Snapshot 与 Promotion 生命周期属于 [Configuration Governance](./10-configuration-governance.md)，本文只判定命令资格；通用 Audit Envelope、可靠提交、脱敏、WORM 与 Retention 属于[安全、审计与治理](./08-security-audit-governance.md)，本文只拥有本领域的 Audit Trigger 与业务摘要。完整归属见 [README 所有权矩阵](./README.md#事实所有权矩阵)，精确参数见[参数附录](./appendix-parameters.md#platform-policy-key)。

本地身份、组织、Workspace、授权与 Audit 都是当前 Platform Environment 的本地事实；环境之间不共享账号主键、凭据、Session 或授权投影。

## 核心模型

### 账号与可访问状态

账号与人员一一对应，登录账号是可含前导 `0` 的 8 位数字员工编号，按字符串保存并在单个 Platform Environment 内唯一。账号由具备相应 Identity Capability 与 Scope 的人员创建；当前架构基线不提供自助注册，也不接入 SSO 或 HR。

| 状态 | 含义 |
| --- | --- |
| 初始化受限 | 尚未完成正式密码与 TOTP 初始化，只能用 Bootstrap Session 完成初始化或安全退出。 |
| 启用 | Session、Capability、Scope 与资源条件均有效时可访问受保护能力。 |
| 停用 | 不能登录或发起新的 API 操作，不再是有效正式成员；历史事实仍保留原 actor。 |
| 受限 | 独立的非完整访问状态，不得视为启用；允许的操作必须由当前受限规则明确声明。 |

### 认证材料与 Session

认证路径由四类材料组成：一次展示的一次性**临时密码**（创建账号或重置密码时签发，用于换取只能完成初始化的受限 **Bootstrap Session**）、**正式密码**、强制 **TOTP**，以及服务端可撤销的**人员 Session**。Session 在连续 60 分钟无用户操作后失效。

临时密码有效期、密码过期周期（永不过期或有限周期）与同账号有效 Session 上限都是版本化 `PLATFORM_POLICY`：取值与范围见[参数附录](./appendix-parameters.md#platform-policy-key)，每个 Policy Version 自服务端成功发布并成为当前 Effective Policy 时生效，不由 Frontend、客户端或脚本解释。密码年龄以最近一次成功设置正式密码的服务端时间事实 `passwordSetAt` 起算。

### Organization

```text
经理
└── Leader
    └── 普通员工
```

经理没有平台内直属上级，可以有多个 Leader；每个 Leader 只有一个经理，每个普通员工只有一个直属 Leader。产品、前端、后端等只是专业分类，可用于展示、候选筛选与账号创建时的 Capability Template 预选，不是授权 Role，也不要求产品与开发共用经理或组织链。

### Workspace Membership

```text
FormalMembers(W) = L(W) UNION (UNION R(l), l IN L(W))
```

`L(W)` 是 Workspace `W` 的当前 Owner 与全部受邀 Leader，`R(l)` 是直属 Leader 为 `l` 的当前有效普通员工。成员按稳定用户 ID 去重并只投影一层直属普通员工：Owner 与受邀 Leader 即使没有直属员工仍是正式成员，经理不因管理某个 Leader 自动加入，未受邀 Leader 及其直属员工也不会自动加入。创建 Workspace 的有效 Leader 成为其唯一 Owner，可邀请或移除其他有效 Leader 并将 Owner 转让给已有受邀 Leader。

跨组织或临时访问由独立的**有时效协作关系**表达，每条关系包含目标用户、目标 Workspace、开始与结束时间、原因、资源 Scope 与所需临时 Capability Grant，有效期采用半开区间 `validFrom <= now < validTo`。

### 授权对象与服务端判定

Capability 是独立于 UI 文案、URL 与岗位名称的稳定原子动作；Scope 是动作适用的资源范围，可为 Platform、Workspace、Project、Requirement 或 Repository；Assignment 是某项未完成责任的当前承担者，记录责任类型、目标对象、当前主体、来源 Policy Version 与创建或转派原因与版本。三者分别表达资格、范围与责任，实际授权以成对 Grant 保存和校验：

```text
Grant = (principal, capability, scope, source, validFrom?, validTo?, status, version)
```

每个受保护请求依次使用可信服务端事实作出判定：

```text
当前 Principal、账号状态与 Session
→ System Invariant / Security Floor
→ Capability + Scope Grant
→ Workspace Membership（适用时）
→ Assignment（适用时）
→ 资源当前条件与 Owner 门禁（适用时）
→ Allow 或 Deny 与必要 Audit
```

### Super Admin 与配置命令资格

Super Admin 是受保护的平台级身份，不是组织岗位，也不是业务权限的万能 Role。每个 Platform Environment 仅可通过一次成功的本地 Bootstrap 创建首个 Super Admin；该账号同样使用本地员工编号、临时密码、正式密码与强制 TOTP，完成初始化前管理能力不激活。其独占的 Platform Scope 保留能力为：

```text
platform.configuration.manage
platform.super_admin.manage
```

前者是所有 `PLATFORM_POLICY` 受保护配置命令的唯一资格来源，后者是 Super Admin 生命周期管理的唯一资格来源。最后一个可用 Super Admin 无法完成正常认证时，只能通过当前环境受限的带外 Break-glass Recovery 调用 Recovery Port 取得一次性受限资格。

## 关键不变量

- 员工编号始终是可含前导 `0` 的 8 位数字字符串，且只在当前 Platform Environment 内唯一——账号主键与凭据不跨环境共享，环境才能成为独立的信任域与故障域。
- 新账号与密码重置始终签发该账号唯一、密码学安全随机、一次展示的临时密码，不使用固定默认密码——可预测的初始凭据等于没有凭据。
- 临时密码在首次成功使用时原子消费，只签发仅能设置正式密码、完成或校验 TOTP、确认结果与退出的 Bootstrap Session；初始化中断后已消费的临时密码不得复用，必须重新签发——一次性凭据的一次性只能由服务端强制。
- 未完成正式密码与 TOTP 初始化的账号不能进入业务能力，也不能读取或修改 Workspace、Requirement、配置或其他业务资源——初始化期的账号还没有可信认证事实。
- 正式密码始终满足 15～32 位长度、大小写与特殊字符复杂度、弱密码、已知泄露密码与账号上下文检查，平台只保存足以安全验证的受保护派生结果，绝不保存或回读明文——这是不可由 Policy 下调的 Security Floor。
- 所有用户必须绑定并在登录时验证 TOTP，不因岗位、Capability 或 Super Admin 身份豁免——第二因子的价值来自没有例外。
- 密码重置使旧正式密码与未使用的旧临时密码失效并撤销现有 Session，但不自动重置 TOTP——重置的是被怀疑的因子，不是整套认证事实。
- TOTP 的二维码与一次性 Secret 只在受限初始化或受控重置流程中展示，确认后不能查询明文，当前架构基线也不提供恢复码——可事后读取的 Secret 与可自助绕过的恢复码都会把第二因子降级为第一因子。
- 丢失 TOTP 只能由具备相应 Identity Capability 与 Scope 的人员在人工身份核验后独立重置，并撤销既有 Session、要求重新 Enrollment、写入安全 Audit——因子恢复必须是有主体、可追溯的人工动作。
- Policy 切换不改写 `passwordSetAt`，也不追溯改写既有安全事实——Policy 版本变化只影响之后的判定，不重写历史。
- 有限过期周期生效后，已超期的存量密码在下一次交互式登录必须进入仅允许设置正式密码的受限流程，但该门禁不取消已经启动的后台 Agent Attempt——门禁作用于人的新会话，不破坏运行中的执行 Contract。
- Session 仅在受认证 API 活动或受控心跳发生时续期，后台 Agent 执行不能刷新人员 Session——执行资源的活跃度不代表人在场。
- 账号状态、认证因子或授权变化必须使受影响的 Session 与授权投影及时失效，密码重置、TOTP 重置、账号停用与安全事件都可以撤销 Session；受保护写操作在状态或授权事实未知、过期或不可解析时回源校验或拒绝——Fail Closed 是撤权真正生效的唯一保证。
- Session 失效或人员权限变化不终止已启动的 Agent Attempt，Attempt 按启动时的不可变执行 Contract 继续；人员之后发起的查看、取消、重试或其他控制动作必须使用当前授权重新判断——不可变执行 Contract 与当前授权各管一段。
- 组织关系始终是经理 → Leader → 一层普通员工的无环结构：创建 Leader 必选有效经理，创建普通员工必选有效直属 Leader，不允许 Leader 管理 Leader 或普通员工拥有下属——固定层级让成员投影与授权范围可判定。
- 组织变更必须先验证目标账号状态、目标层级与无环关系，成功后更新组织事实、失效受影响的成员与授权投影，并记录影响与 Audit——组织是授权与成员的输入，错误结构会静默扩大访问面。
- 岗位、专业分类与 Capability Template 只影响之后创建账号时的预选，绝不静默新增、撤销或替换实际 Grant，也不静默替换未完成的 Assignment——资格必须是显式保存的事实，不是可被批量推导的标签。
- Workspace 成员资格只解决“是否进入资源边界”，不赋予创建、确认、验收、审核或合并等动作权限——边界与动作是两类判定，混淆会让“进入”等于“有权”。
- 每个 Workspace 任意时刻恰有一个 Owner，Owner 不能在未先转让 Owner 的情况下退出或被移除——无主 Workspace 无法完成受 Owner 门禁保护的治理动作。
- 受邀 Leader 可以参与 Workspace 业务，但不能邀请或移除 Leader，也不能转让 Owner——名单治理权限不随参与权一起扩散。
- Leader 名单治理同时要求相应 Capability、Scope 与当前 Owner 事实：普通 Grant 不能绕过 Owner 门禁，Owner 身份也不能绕过 Capability 与 Scope——两道门禁互不替代。
- Owner 无法操作时只能由具备专用 Override Capability 与有效 Scope 的平台人员执行受审计的强制转让，Super Admin 身份不是该业务 Override 的替代品——平台级身份不应成为业务门禁的旁路。
- 正式成员是可重建的当前态投影，不提供手工添加、删除、排除、锁定或批量导入入口；Workspace 创建、Owner 转让、Leader 变化、直属关系变化与账号状态变化都触发重算，且关系失效、账号停用或 Workspace 归档后旧投影不得用于新的受保护请求——撤权必须优先于异步投影收敛。
- 有时效协作到期或提前终止时立即撤销该协作产生的 Membership Scope 与临时 Grant，同时保留协作记录、正式成员关系、业务事实与 Audit——临时访问不能沉淀为永久成员事实，也不能抹掉发生过的事实。
- 管理协作关系需要显式 Capability 与匹配 Scope，Owner、受邀 Leader 或管理员等称谓不自动取得该能力——称谓不是资格。
- Capability 集合与 Scope 集合不能分别汇总后形成笛卡尔积——聚合展示会把从未授予的组合变成事实上的权限。
- Scope 包含关系仅按服务端可信资源关系解析；客户端提交的资源 ID、Role、Capability 或 Scope 结论，以及 Frontend、菜单与可见性都不是授权事实——授权结论只能在服务端产生。
- Workspace 业务资源的有效范围是实际 Grant Scope 与当前 Membership Scope 的交集——任一侧失效都必须立即收缩访问面。
- Assignment 只表达当前责任，不授予 Capability、不扩大 Scope 或 Membership，其变更必须以显式命令完成并写入 Audit——责任与资格分离才能各自被独立审计。
- 已完成的 Decision、Approval、Attempt、Artifact 与 Audit 始终保留原 actor，不因组织、授权或 Assignment 的后续变化而重写——历史归属是审计的前提。
- 自动执行主体使用自身 Workload Identity 与执行 Contract，不占用 Human Assignment——人的责任不能由运行主体代持。
- 授权投影版本是服务端权威事实：Grant、Membership、协作有效期、Assignment、账号状态或相关 Policy 改变时必须提升受影响的授权版本，缓存只能加速而不能延长已失效的授权——版本是撤权可验证的载体。
- Super Admin 只拥有其保留的配置与 Super Admin 管理能力，不自动获得 Requirement、Workspace、MR、Agent 或其他业务 Capability，且这两项保留能力不能通过普通 Grant 分配——平台管理身份不是业务万能 Role。
- 增加或移除 Super Admin 仅由当前有效 Super Admin 使用 `platform.super_admin.manage`、完成新的 TOTP Challenge、填写原因并记录安全 Audit，被晋升者必须是已启用且已完成正式密码与 TOTP 初始化的本地员工账号——最高权限的扩散必须有主体、有理由、有第二因子。
- 平台始终至少保留一个有效 Super Admin：最后一个不能被移除、停用或逻辑删除；Super Admin 身份变化必须提升 Authorization Version 并撤销目标账号既有 Session——治理能力不能被清空，身份变化必须立即生效。
- 所有 `PLATFORM_POLICY` 的 Draft、校验、发布与回滚（含 Workspace Scope 的 Policy Override）只允许 Super Admin 使用 `platform.configuration.manage`；发布或回滚要求独立的当前权限校验、原因与新的 TOTP Challenge，并记录安全 Audit——配置改变全局行为，必须与一次性人工确认绑定。
- `platform.configuration.manage` 不能绕过 Capability、Scope、Assignment、人工 Gate、资源状态、Audit、Secret 隔离或任何 `SYSTEM_INVARIANT`；`GITOPS_CONFIG` 在平台中只读展示并由受控 GitOps 修改，`SYSTEM_INVARIANT` 只读且无编辑入口——配置资格不是安全边界的旁路。
- 带外恢复不经过 Web 页面、普通平台 API 或直接数据库修改，也不能读取或修改 Workspace、Requirement、Policy 或历史 Audit——恢复入口越窄，被滥用的面越小。
- 恢复只签发一次性受限资格，目标账号必须重新完成正式密码与 TOTP 初始化才可恢复正常 Super Admin 管理能力，且每次恢复都留下独立的安全 Audit——恢复是回到正常认证的通道，不是长期后门。
- 本领域提交给 Audit Port 的业务摘要至少包含目标 Identity/Organization/Workspace/Grant/Assignment 稳定标识、动作、结果、原因、前后版本与授权版本，但绝不包含明文密码、临时密码、TOTP Code、TOTP Secret、Session Cookie、Token 或其他可直接使用的认证材料——摘要必须足以解释这次变更，同时不能保存可重放的凭据。
- 人员变动与授权影响只能通过只读视图关联组织变化、Membership、Grant、Assignment、授权版本与同步结果，实际修改必须在其所属的受权入口执行——只读投影不是第二条写入路径。
- 当前认证路径只有“员工编号 + 正式密码 + 强制 TOTP”，不创建未使用的 Passkey 数据表、API、UI、字段或空 Adapter——未完成的能力不应先留下攻击面与迁移债。
- Passkey/WebAuthn 只通过认证器无关的 `AuthenticatorPort` 新增 Adapter 接入，不改变 Session、Authorization、Capability、Assignment 或业务 Workflow 语义，并在完整注册、验证、恢复与 Audit Contract 就绪前保持关闭——认证演进必须与业务语义解耦。
- 未来的 Passkey 登录必须使用 `userVerification=required`，由服务端验证 UV Flag、Challenge、Origin、RP ID、Credential 与 Replay 条件，绝不信任客户端自报结果；平台只保存 Public-key Credential、Signature Counter 与验证所需元数据，Private Key 与 Biometrics 始终留在用户设备——抗钓鱼来自服务端验证与设备持有的私钥。
- 注册新 Passkey 必须在正式密码与 TOTP 初始化完成后再次验证当前密码与 TOTP；遗失认证器只能通过专用 Identity Override Capability、有效 Scope、人工身份核验、Session 撤销与安全 Audit 取得短期受限恢复资格，实际注册仍由用户设备完成，管理员与平台不得接触 Private Key，也不得把流程实现为隐式恢复码——注册与恢复是最高价值的攻击目标。
- 一次满足策略的 Passkey 登录可同时替代该次密码与 TOTP，但绑定 Passkey 不自动停用 TOTP，是否允许停用只能由未来独立的认证 Policy 决定；Session 与 Audit 必须记录实际认证方式与认证强度——迁移期强弱路径并存，认证强度必须可查。

## 与其他模块的关系

下表是本模块自身视角：01 从各模块消费什么、向各模块提供什么。各模块的完整 Contract 由其自身定义，本文不复制其状态、参数或协议字段。

| 模块 | 消费 | 提供 |
| --- | --- | --- |
| [00 平台总览](./00-platform-overview.md) | 模块边界、依赖方向与端到端责任链约定 | 责任链起点的 Principal、Session 与授权判定 |
| [02 Requirement Workflow](./02-requirement-workflow.md) | Requirement、WorkItem、Gate 与业务责任的领域语义（用于解释被授权的动作） | 每次受保护命令的账号状态、Capability、Scope、Membership 判定与责任 Assignment 语义 |
| [03 Agent、Skill 与 Model](./03-agent-skill-model.md) | 已启动 Attempt 的不可变执行 Contract 边界 | 发起与控制执行的人员资格判定；Workload Identity 与 Human Assignment 的区分 |
| [05 Source Control 与交付](./05-source-control-delivery.md) | 仓库、分支、MR 与 Merge 的外部交付语义 | 仓库绑定、MR 创建与 Merge 等动作的人员资格判定 |
| [06 平台应用与集成](./06-platform-application-integration.md) | Web 与 Control Plane 边界、稳定 Port/Adapter 装配 | 当前授权上下文与服务端授权判定入口；菜单与可见性不作为授权结论的规则 |
| [08 安全、审计与治理](./08-security-audit-governance.md) | Audit Envelope、可靠提交、脱敏、WORM、Retention 与安全恢复 Contract | 身份事实；本领域的 Audit Trigger（账号与状态、临时密码签发或消费、密码与 TOTP 重置、Session 撤销、组织与 Owner/Leader 变化、成员投影与协作关系变化、Grant 与 Assignment 变化、Super Admin 生命周期、配置授权命令与带外恢复）及业务摘要 |
| [09 基础设施与运维](./09-infrastructure-operations.md) | Platform Environment 隔离边界 | 专业运维 Console 访问的人员资格判定 |
| [10 Configuration Governance](./10-configuration-governance.md) | Draft、ChangeSet、Effective Snapshot 与 Promotion 的通用配置生命周期语义 | 受保护配置命令的发起资格、TOTP Challenge 与恢复资格判定 |
