# 身份、组织与授权详细说明

> 文档层级：L2 规范事实源
> 对应主文：[身份、组织与授权](./identity-organization-authorization.md)

## 1. 目的与边界

本文是平台本地身份、组织、Workspace Membership、授权、Super Admin、配置授权、恢复与 Audit 语义的唯一规范事实源。

本文不定义 Requirement 状态、WorkItem 流程、人工 Gate 规则、外部交付语义或基础设施认证细节；这些事实由各自主题拥有。本文也不将岗位、外部系统角色或前端显示状态作为授权事实。

## 2. 本地身份与 Session

### 2.1 账号与状态

登录账号是恰好 8 位数字的员工编号，允许以 `0` 开头并按字符串保存。账号由具备相应 Identity Capability 和 Scope 的人员创建；首版不提供自助注册，也不接入 SSO 或 HR。

账号的可访问状态语义如下：

- **初始化受限**：账号尚未完成正式密码与 TOTP 初始化，只能使用 Bootstrap Session 完成初始化或安全退出，不能访问业务资源。
- **启用**：账号完成正式认证与 TOTP 要求后，可在当前 Session、Capability、Scope 和资源条件均有效时访问受保护能力。
- **停用**：账号不能登录或发起新的 API 操作，不再是当前有效正式成员；其历史 Requirement、Assignment、Decision、Artifact 和 Audit 仍保留原 actor。

账号状态、认证因子或授权变化必须使受影响的 Session 和授权投影及时失效；受保护写操作在状态或授权事实未知时回源校验或拒绝。

### 2.2 临时密码与初始化

创建账号或重置密码时，平台必须生成该账号唯一、密码学安全随机、一次展示的一次性临时密码。临时密码默认有效 24 小时；其有效期由版本化 `PLATFORM_POLICY` 管理，不由客户端或脚本固定。

临时密码首次成功使用时原子消费，只签发受限 Bootstrap Session。该 Session 仅可设置正式密码、完成或校验 TOTP、确认初始化结果和退出，不能读取或修改 Workspace、Requirement、配置或其他业务资源。初始化中断后，不得重新使用已经消费的临时密码；必须重新签发。

密码重置必须使旧正式密码和未使用的旧临时密码失效、撤销现有 Session，并生成新的临时密码。密码重置不自动重置 TOTP。

### 2.3 正式密码与 TOTP

正式密码必须满足以下规则：

- 长度为 15～32 位；
- 至少包含一个大写字母、一个小写字母和一个特殊字符；
- 拒绝常见弱密码、已知泄露密码和包含员工编号等账号上下文的密码。

平台只保存足以安全验证密码的受保护派生结果，不能保存或回读明文密码。所有用户必须绑定并在登录时验证 TOTP，不因岗位、Capability 或 Super Admin 身份而豁免。

TOTP Enrollment 只能在受限初始化或受控重置流程中显示二维码和一次性 Secret；确认后不能查询明文。首版不提供恢复码。丢失 TOTP 时由具备相应 Identity Capability 和 Scope 的人员完成身份核验后独立重置；该操作撤销既有 Session，要求重新 Enrollment，并写入安全 Audit。

### 2.4 Session

平台使用服务端可撤销 Session。连续 60 分钟没有用户操作后 Session 失效；只有受认证 API 活动或受控心跳可以更新活动时间，后台 Agent 执行不能刷新人员 Session。

同一账号默认最多保留 3 个有效 Session，允许通过 `PLATFORM_POLICY` 在 1～10 范围内调整。密码重置、TOTP 重置、账号停用和安全事件都可以撤销 Session。

Session 失效或人员权限变化不会终止已经启动的 Agent Attempt；Attempt 按启动时的不可变执行 Contract 继续。人员之后发起的查看、取消、重试或其他控制动作必须使用当前授权重新判断。

## 3. Organization

平台组织关系固定为：

```text
经理
└── Leader
    └── 普通员工
```

经理没有平台内直属上级；一个经理可以有多个 Leader。创建 Leader 必须选择一个有效经理；创建普通员工必须选择一个有效直属 Leader。每个 Leader 只有一个经理，每个普通员工只有一个直属 Leader。平台不允许 Leader 管理 Leader、普通员工拥有下属或组织关系形成环。

产品、前端、后端等仅是专业分类，可用于展示、候选筛选和账号创建时的能力模板预选；它们不是授权 Role，也不要求产品与开发共用经理或组织链。

组织变更必须验证目标账号状态、目标层级和无环关系。变更后更新组织事实，失效受影响的成员与授权投影，并记录影响和 Audit。组织、岗位或模板变化不得静默新增、撤销或替换实际 Grant，也不得静默替换未完成 Assignment。

## 4. Workspace Membership

### 4.1 Owner 与受邀 Leader

创建 Workspace 的有效 Leader 成为唯一 Owner。每个 Workspace 任意时刻恰有一个 Owner。

Owner 可邀请或移除其他有效 Leader，并可将 Owner 转让给已有受邀 Leader。受邀 Leader 可以参与 Workspace 业务，但不能邀请或移除 Leader，也不能转让 Owner。Owner 不能在未先转让 Owner 的情况下退出或被移除。

Leader 名单治理同时要求相应的 Capability、Scope 和当前 Owner 事实；普通 Grant 不能绕过 Owner 门禁，Owner 身份也不能绕过 Capability 与 Scope。Owner 无法操作时，具备专用 Override Capability 和有效 Scope 的平台人员可以执行受审计的强制转让；Super Admin 身份本身不是该业务 Override 的替代品。

### 4.2 动态正式成员

设 `L(W)` 为 Workspace `W` 的当前 Owner 与全部受邀 Leader，`R(l)` 为直属 Leader 为 `l` 的当前有效普通员工，则：

```text
FormalMembers(W) = L(W) UNION (UNION R(l), l IN L(W))
```

成员按稳定用户 ID 去重，只投影一层直属普通员工。Owner 和受邀 Leader 即使没有直属员工仍是正式成员；经理不会仅因管理某个 Leader 自动加入；未受邀 Leader 及其直属员工不会自动加入。

正式成员是可重建的当前态投影，不提供手工添加、删除、排除、锁定或批量导入入口。Workspace 的创建、Owner 转让、Leader 变化、直属关系变化和账号状态变化都会触发重算。撤权优先于异步投影收敛：关系失效、账号停用或 Workspace 归档后，旧投影不能用于新的受保护请求。

### 4.3 有时效协作

跨组织或临时访问通过独立协作关系表达，而不是手工修改正式成员。每条协作关系必须包含目标用户、目标 Workspace、开始时间、结束时间、原因、资源 Scope 和所需的临时 Capability Grant。

协作有效期采用半开区间 `validFrom <= now < validTo`。到期或提前终止立即撤销该协作产生的 Membership Scope 和临时 Grant，但保留协作记录、正式成员关系、业务事实和 Audit。管理协作关系需要显式 Capability 与匹配 Scope，Owner、受邀 Leader 或管理员等称谓不自动取得该能力。

## 5. Authorization：Capability、Scope 与 Assignment

### 5.1 Capability 与 Scope

Capability 是独立于 UI 文案、URL 和岗位名称的稳定原子动作；Scope 是动作适用的资源范围，可为 Platform、Workspace、Project、Requirement 或 Repository。实际授权以成对的 Grant 保存和校验：

```text
Grant = (principal, capability, scope, source, validFrom?, validTo?, status, version)
```

Capability 集合与 Scope 集合不能分别汇总后形成笛卡尔积。Scope 包含关系由服务端可信资源关系解析，不能相信客户端提交的资源 ID、Role、Capability 或 Scope 结论。Workspace 业务资源的有效范围是实际 Grant Scope 与当前 Membership Scope 的交集。

岗位和专业分类只能提供创建账号时的 Capability Template 预选；最终保存的是显式 `Capability + Scope` Grant。模板、岗位或组织变更只影响之后的预选，不得静默改写既有 Grant。

### 5.2 Assignment

Assignment 是某项未完成责任的当前承担者，记录责任类型、目标对象、当前主体、来源 Policy Version、创建或转派原因与版本。Assignment 仅表达责任，不授予 Capability、不扩大 Scope 或 Membership。

当前责任的变更必须以显式命令完成并写入 Audit。组织、岗位、模板或 Policy 变化不能静默替换进行中的 Assignment；已完成的 Decision、Approval、Attempt、Artifact 和 Audit 始终保留原 actor。自动执行主体使用自身 Workload Identity 与执行 Contract，不占用 Human Assignment。

### 5.3 服务端判定

每个受保护请求依次使用可信服务端事实：

```text
当前 Principal、账号状态与 Session
→ System Invariant / Security Floor
→ Capability + Scope Grant
→ Workspace Membership（适用时）
→ Assignment（适用时）
→ 资源当前条件与 Owner 门禁（适用时）
→ Allow 或 Deny 与必要 Audit
```

当前授权投影版本是服务端权威事实。Grant、Membership、协作有效期、Assignment、账号状态或相关 Policy 改变时，受影响授权版本必须提升。缓存可用于加速，但对授权、安全或外部副作用写操作，版本未知、过期或不可解析时必须回源或拒绝；Frontend、菜单和客户端提交内容不是授权事实。

## 6. Super Admin、配置授权与恢复

### 6.1 Super Admin

Super Admin 是受保护的平台级身份，不是组织岗位，也不是业务权限的万能 Role。每个 Platform Environment 仅可通过一次成功的本地 Bootstrap 创建首个 Super Admin；该账号仍使用本地员工编号、临时密码、正式密码和强制 TOTP，完成初始化前管理能力不激活。

Super Admin 独占且不能通过普通 Grant 分配的 Platform Scope 保留能力为：

```text
platform.configuration.manage
platform.super_admin.manage
```

Super Admin 不自动获得 Requirement、Workspace、MR、Agent 或其他业务 Capability。增加或移除 Super Admin 仅由当前有效 Super Admin 使用 `platform.super_admin.manage`、完成新的 TOTP Challenge、填写原因并记录安全 Audit。被晋升者必须是已启用、已完成正式密码和 TOTP 初始化的本地员工账号。

平台必须始终满足至少一个有效 Super Admin。最后一个有效 Super Admin 不能被移除、停用或逻辑删除；身份变化必须提升 Authorization Version 并撤销目标账号既有 Session。

### 6.2 配置授权边界

所有 `PLATFORM_POLICY` 仅允许 Super Admin 使用 `platform.configuration.manage` 创建 Draft、校验、发布和回滚，包括 Workspace Scope 的 Policy Override。发布或回滚要求独立的当前权限校验、原因和新的 TOTP Challenge，并记录安全 Audit。

`GITOPS_CONFIG` 在平台中只读展示，修改由受控 GitOps 负责；`SYSTEM_INVARIANT` 只读且无编辑入口。`platform.configuration.manage` 不能绕过 Capability、Scope、Assignment、人工 Gate、资源状态、Audit、Secret 隔离或其他 System Invariant。

### 6.3 带外恢复

当最后一个可用 Super Admin 无法完成正常认证时，只能通过当前环境受限的带外 Break-glass Recovery 调用 Recovery Port。恢复不经过 Web 页面、普通平台 API 或直接数据库修改，也不能读取或修改 Workspace、Requirement、Policy 或历史 Audit。

恢复只签发一次性受限资格；目标账号必须重新完成正式密码和 TOTP 初始化后，才可恢复正常 Super Admin 管理能力。每次恢复都必须留下独立的安全 Audit。

## 7. Audit 语义

以下行为必须进入追加式 Audit：账号创建与状态变化、临时密码签发或消费、密码与 TOTP 重置、Session 撤销、组织关系变更、Workspace Owner 与 Leader 变化、成员投影和协作关系变化、Grant 与 Assignment 变化、Super Admin 生命周期、配置授权命令与带外恢复。

每条 Audit 至少关联操作者或 Workload Identity、时间、Environment、Scope、目标对象、动作、结果、原因、前后摘要、授权或版本信息与 Correlation ID。Audit 不能保存明文密码、临时密码、TOTP Code、TOTP Secret、Session Cookie、Token 或其他可直接使用的认证材料。

人员变动与授权影响可以通过只读视图关联组织变化、Workspace Membership、Grant、Assignment、授权版本和同步结果；实际修改必须在其所属的受权入口执行。

## 8. 不变量

1. 员工编号始终是可含前导 `0` 的 8 位字符串。
2. 新账号和密码重置始终使用唯一随机的一次性临时密码，不使用固定默认密码。
3. 未完成正式密码和 TOTP 初始化的账号不能进入业务能力。
4. 正式密码始终满足 15～32 位及复杂度、弱密码、泄露密码和账号上下文检查。
5. 组织关系始终是经理 → Leader → 一层普通员工；创建 Leader 必选经理，创建普通员工必选 Leader。
6. 每个 Workspace 始终只有一个 Owner；正式成员仅由 Owner、受邀 Leader 与其一层直属有效普通员工动态派生。
7. Capability、Scope 与 Assignment 分别表达资格、范围与责任；Assignment 不得扩大任何访问权。
8. Super Admin 仅拥有其保留的配置和 Super Admin 管理能力，不自动拥有业务能力或越过安全边界。
9. 平台始终至少保留一个有效 Super Admin；恢复路径受限、一次性且可审计。
10. 受保护 API 始终以服务端当前身份、授权、成员、责任和资源事实作出判定。
