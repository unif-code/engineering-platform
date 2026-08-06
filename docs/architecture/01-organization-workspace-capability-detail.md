# 组织、Workspace 与 Capability 详细设计

> 文档层级：L2 详细版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 对应精简版：[组织、Workspace 与 Capability](./01-organization-workspace-capability.md)
> 适用读者：产品、前端、后端、测试、运维和实施 Agent

## 1. 文档目的与边界

本文定义企业内部 AI 研发平台的本地人员身份、组织上下级、Workspace 成员、授权和责任分配边界。它是架构 Contract，不是数据库 Schema、API Spec、开发 Plan 或代码实现。

本模块解决五个问题：

1. 用户如何在没有 SSO/HR 的情况下安全登录；
2. 经理、Leader 和普通员工如何形成平台内部组织关系；
3. Workspace 如何根据 Leader 配置自动推导正式成员；
4. 谁能在什么 Scope 执行什么动作；
5. 某项尚未完成的责任当前由谁承担。

以下内容不在第一阶段范围内：

- SSO、HR 同步、自助注册和外部组织树；
- 多级 Leader、矩阵汇报、普通员工管理下属和通用 HR 组织引擎；
- 以 Role 名称、岗位字符串或前端菜单作为后端授权依据；
- 独立 Team 实体、Team 成员关系或 Team 级授权；Workspace 是团队协作与业务资源边界；
- 手工维护 Workspace 正式成员；
- Passkey/WebAuthn、TOTP 恢复码和无实际行为的占位 Adapter；
- 从平台管理后台修改 Kubernetes、数据库、OpenBao、Object Storage 等基础设施配置。

## 2. Platform Environment 本地事实

Identity、Organization、Workspace 和 Authorization 都是当前 Platform Environment 的本地事实。

- 当前只部署 DEV；未来 PROD 单独部署。
- DEV 与 PROD 使用相同代码、领域 Contract、GitOps 模板和 Platform Compatibility Set。
- 两个环境不共享 Web/Control Plane 运行实例、域名、PostgreSQL、用户记录、密码、TOTP、Session、组织关系、Workspace、Capability Grant 或 Audit 流。
- 相同员工编号可以分别存在于 DEV 和 PROD，但它们是两个环境内独立初始化、独立认证和独立审计的本地账号，不构成跨环境身份同步。
- DEV 管理后台只读取和治理 DEV；未来 PROD 管理后台只读取和治理 PROD。
- 配置 Promotion 不传输密码、TOTP Secret、Session、组织人员或 Workspace 成员等环境本地事实。

第一阶段不接入 SSO 或 HR。平台本地 PostgreSQL 是账号、组织关系、Workspace 和授权的权威事实源；外部 HR 组织树既不是事实源，也不建设空 HR Adapter。未来确需接入外部身份或组织源时，只能通过新的受控 Adapter 和迁移流程进入，不得在没有实现的情况下用 Feature Toggle 假装可用。

## 3. 统一治理模型

所有业务模块统一采用以下四层结构：

```text
System Invariant / Security Floor
→ Platform / Workspace Policy
→ Capability + Scope
→ Assignment
```

| 层级 | 负责的问题 | 约束 |
| --- | --- | --- |
| System Invariant / Security Floor | 哪些安全底线永远不能绕过 | 领域代码和安全边界强制执行，不提供业务配置入口 |
| Platform / Workspace Policy | 默认路由、候选范围和产品行为如何配置 | 只能在系统底线内调整，Workspace Override 仍由 Super Admin 发布 |
| Capability + Scope | 当前主体是否有资格在目标资源范围执行动作 | 每次受保护请求都在服务端校验 |
| Assignment | 某项未完成责任当前由谁执行 | 可显式转派，但不授予任何 Capability |

统一原则是：

> 可移交的是未完成责任，不是安全资格、系统事实或已经完成的动作。

经理、Leader、产品、前端、后端和管理员都是组织岗位或人员分类，可用于账号创建时预选 Capability、解析候选池或默认责任人，但不能成为业务 API 的授权条件。Agent、Webhook、定时任务和确定性检查不是 Human Assignment 的承接人，也不能冒充人工审核人。

## 4. Identity 与 Session

### 4.1 本地账号

- 账号与人员一一对应，只能由具备相应 Identity Capability 和有效 Scope 的管理员创建；不提供自助注册。
- 登录标识是恰好 8 位数字的员工编号。员工编号允许以 `0` 开头，必须按字符串保存和校验，不能转换为整数。
- 员工编号在单个 Platform Environment 内唯一；环境之间不共享账号主键或凭据。
- 账号状态至少区分待初始化、启用、停用和受限状态。未完成正式密码与 TOTP 初始化的账号不能进入业务页面。
- 账号创建不接受 Workspace、Team、Role 或手工正式成员字段。

### 4.2 一次性临时密码与初始化

创建或重置账号时，平台使用密码学安全随机数生成该账号唯一的一次性临时密码：

- 不同账号不得共享同一个固定初始密码；
- 默认有效期为 24 小时，该默认值属于版本化 `PLATFORM_POLICY`，可由 Super Admin 受控调整，不能写死在 Frontend、领域代码、镜像或脚本中；
- 只在创建或重置完成页展示一次，之后不可查询明文；
- 数据库只保存可验证的单向派生结果和必要元数据；
- 临时密码过期、被重签或成功使用后立即失效。

第一次成功使用临时密码时必须原子消费该凭据，并只签发短期、受限的 Bootstrap Session。该 Session 仅允许：

1. 设置正式密码；
2. 完成或校验 TOTP；
3. 校验初始化结果；
4. 安全退出。

它不能读取或修改任何 Workspace、Requirement、配置或其他业务资源。初始化流程中断后不得重复使用已消费的临时密码，必须由具备对应 Identity Capability 的管理员重新签发。

新账号在此流程中完成首次 TOTP Enrollment；仅重置密码且原 TOTP Binding 仍有效的账号校验既有 TOTP，不重新生成 Secret。只有 TOTP 已通过独立命令重置时才重新 Enrollment。

### 4.3 正式密码

正式密码策略为：

- 长度 15～32 位；
- 至少包含一个大写字母；
- 至少包含一个小写字母；
- 至少包含一个特殊字符；
- 拒绝常见弱密码、已知泄露密码和包含员工编号等账号上下文的密码；
- 允许粘贴和密码管理器，不要求管理员接触或代用户设置正式密码。

密码使用 Argon2id、每账号独立 salt，并通过 OpenBao 管理的 pepper 加固。数据库、Audit、Log、Trace 和消息均不得保存明文密码、临时密码或 pepper。

密码过期策略是版本化 Platform Policy，支持永不过期、90 天、180 天和受约束的自定义周期。变更应按该配置声明的生效语义执行，不能追溯改写已有安全事实或由前端自行解释。

管理员重置密码时必须：

1. 重新校验其 Identity Capability、Scope 和目标账号；
2. 使旧密码和所有尚未使用的旧临时密码失效；
3. 撤销目标账号已有 Session；
4. 生成新的唯一一次性临时密码；
5. 要求目标用户重新完成受限初始化流程；
6. 写入安全 Audit。

密码重置不自动重置 TOTP；TOTP 重置是独立命令。

### 4.4 TOTP MFA

所有用户都必须绑定并在登录时验证 TOTP，不因岗位、Capability 或管理身份而豁免。

- Enrollment 只在受限初始化或受控重置流程中显示二维码和一次性 Secret。
- 用户可以将 Secret 保存到手机或桌面 2FA 工具；平台不要求必须使用手机。
- Secret 确认后不再提供明文查询。
- 第一阶段不生成或保存恢复码。
- 用户丢失认证器时，由具备对应 Identity Capability 的管理员完成身份核验后重置 TOTP。
- TOTP 重置撤销已有 Session、要求重新 Enrollment，并写入安全 Audit。
- 密码与 TOTP 是两个独立认证因子，重置一个不能静默替换另一个。

### 4.5 Session

- 使用服务端可撤销 Session 和安全 Cookie；不能仅依赖前端状态或不可撤销 Token。
- 连续 60 分钟没有用户操作后 Session 失效。服务端只以受认证 API 活动或受控心跳更新 `lastActivityAt`；后台 Agent 运行不能刷新人的 Session。
- 同一账号默认最多保留 3 个有效 Session，并允许由 Platform Policy 在 1～10 范围内配置。
- 密码重置、TOTP 重置、账号停用和安全事件可以统一撤销 Session。
- 上述时间和数量是正式首发默认值，不是代码常量；只能由 Super Admin 通过受控 Platform Policy 修改。
- Session 失效或权限变化不会终止已经启动的 Agent Attempt。Attempt 按启动时不可变 Execution Binding 继续；用户随后查看、取消、重试等控制动作使用当前 Capability 重新判断。

## 5. Organization

### 5.1 当前组织结构

平台只支持一层 Leader 和一层直属普通员工：

```text
经理
└── Leader（一个经理可以有多个 Leader）
    └── 普通员工（产品、前端或后端）
```

组织规则如下：

- 经理位于当前组织链顶层，不设置平台内直属上级；
- 创建 Leader 时必须选择一个有效经理；
- 创建产品、前端或后端普通员工时必须选择一个有效直属 Leader；
- 第一阶段每个 Leader 只有一个经理，每个普通员工只有一个直属 Leader；
- 第一阶段不允许 Leader 管理 Leader，也不允许普通员工拥有下属；
- 组织关系禁止形成环；
- 产品、前端和后端是专业分类，不是授权角色。

产品与开发可以属于不同经理和不同组织链，不要求共同经理。平台也不通过“产品体系”或“开发体系”硬编码共同经理、Workspace 加入条件或 Capability；专业分类只用于展示、候选筛选和账号创建时的能力模板预选。

### 5.2 账号创建与 Capability 预选

账号创建页面根据岗位和专业分类加载 Capability Template，作为管理员勾选能力的初始建议。最终保存的是明确的 `Capability + Scope` Grant，而不是岗位名称或模板引用产生的隐式运行时权限。

- 管理员可以在系统允许范围内增减预选项；
- 每个实际 Grant 必须同时保存 Capability、Scope、来源、操作者和 Audit 信息；
- 岗位模板变化只影响之后的预选，不静默改写已有用户 Grant；
- 用户岗位或直属上级变化不静默删除或新增实际 Grant；管理员必须显式调整并审计；
- 岗位或组织变化不得静默替换任何未完成 Assignment。

开发人员是否可以创建 Requirement 只由实际 Capability 和 Scope 决定。产品、前端、后端、Leader 或管理员称谓本身既不授予也不禁止创建权。

### 5.3 组织变化

修改岗位或直属上级时必须校验目标账号状态、上级层级、组织环和并发版本。变更成功后：

- 更新组织事实并提升 Organization Version；
- 找出受影响的 Workspace 并使旧成员/授权投影失效；
- 重建正式成员投影；
- 失效相关菜单和授权缓存；
- 记录操作人、原因、前后关系、影响 Workspace 和同步结果。

普通员工更换 Leader 会改变其由组织推导出的 Workspace Membership。Leader 更换经理不会改变该 Leader 已经加入的 Workspace，因为 Workspace 成员来源是 Workspace Leader 配置，不是经理关系。

账号停用后，其登录、新的 API 操作和当前成员资格立即失效，但历史 Requirement、Assignment、Decision、Artifact 和 Audit 保留原 actor，不执行物理删除或身份替换。

## 6. Workspace 与 Membership

### 6.1 Workspace 治理

- 创建 Workspace 的主体必须是有效 Leader，并成为唯一 `Workspace Owner`。
- 每个 Workspace 任意时刻恰好有一个 Owner。
- Owner 可以邀请或移除其他有效 Leader，并可以将 Owner 转让给已有受邀 Leader。
- 受邀 Leader可以参与 Workspace 业务，但不能邀请、移除其他 Leader，也不能转让 Owner。
- Owner 不能直接退出或被移除；必须先完成 Owner 转让。
- 邀请 Leader不要求与 Owner 共用经理，也不要求相同专业分类。
- 移除 Leader 前，仍由其承担的未完成责任必须按对应 Workflow 显式转派；移除动作不能替代 Assignment 转派。

Owner 治理是双重门禁：命令既要校验对应的 Capability 与 Scope，也要校验操作者是当前 Owner。普通 Grant 不能绕过 Owner 事实，Owner 身份也不能绕过 Capability。

当 Owner 无法操作时，只有具备专用 Override Capability 和有效 Scope 的平台管理员可以发起受审计的强制转让。Super Admin 身份不是该业务 Override 的替代品；如需执行仍必须具备对应业务 Capability。

### 6.2 正式成员投影

设：

```text
L(W) = Workspace W 的当前 Owner 与全部受邀 Leader
R(l) = 直属 Leader 为 l 的全部当前有效普通员工
```

则：

```text
FormalMembers(W) = L(W) UNION (UNION R(l), l IN L(W))
```

计算规则：

- 按用户稳定 ID 去重；
- 只计算 Leader 的一层直属普通员工，不递归；
- Owner 和受邀 Leader即使没有直属员工，也仍是正式成员；
- 经理不会仅因管理某个 Leader 自动加入；
- 未受邀 Leader及其直属员工不会自动加入；
- 停用账号不属于当前有效成员；
- 同一用户可属于多个 Workspace，各自独立计算 Membership 和 Scope。

正式成员是可重建的当前态投影，不是手工主数据。页面和公共 API 只允许查看来源、对应 Leader、版本、同步时间和健康状态，不允许手工新增、删除、排除、锁定或批量导入正式成员。

### 6.3 成员同步与撤权

以下变化触发受影响 Workspace 的成员重算：

- Workspace 创建、恢复、Owner 转让或受邀 Leader变化；
- 普通员工直属 Leader变化；
- 用户状态变化；
- 组织异常修复；
- 周期性全量对账。

同步采用组织版本和 Workspace Leader 配置版本保证幂等。领域状态、投影变化、Outbox 和 Audit 需要保持一致；重复或乱序事件不得覆盖更高版本。

撤权优先于投影收敛：用户离开直属关系、Leader 被移除、账号停用或 Workspace 归档时，先提升 Authorization Version并使旧投影不能用于新的受保护请求，再异步完成大差异重建和外部短期访问回收。版本未知、投影过期或组织状态不可验证时，受保护写操作回源或 Fail Closed。

Workspace 归档后，当前业务访问立即失效，不新增或延长协作关系，但保留 Leader 配置、成员投影、协作记录和 Audit。恢复时从当前组织事实重新校验 Owner、受邀 Leader和直属员工并全量重建投影。

### 6.4 协作成员

跨组织或临时访问通过独立协作关系表达。每条关系必须包含：

- 已存在的用户和目标 Workspace；
- 开始时间与结束时间；
- 协作原因；
- Workspace 内的资源 Scope；
- 本次协作所需的临时 Capability Grant。

有效期统一使用半开区间：

```text
validFrom <= now < validTo
```

因此在 `now == validTo` 时权限已经失效，不依赖后台到期任务是否完成。提前终止同样立即失效。到期或终止只撤销该协作产生的 Membership Scope 和临时 Grant，不删除协作记录、正式成员关系、业务事实或 Audit。

管理协作关系必须具有明确的协作管理 Capability 和匹配 Scope。管理员、Owner、受邀 Leader等称谓本身不自动授予该能力；岗位模板可以在账号创建时预选，但最终仍以实际 Grant 为准。

所有时间以 UTC 存储并使用带时区的 ISO 8601 传输，管理界面按用户时区展示但不得改变服务端半开区间判定。

## 7. Authorization

### 7.1 Capability 与 Scope

Capability 是与 UI 文案、URL 和岗位名称解耦的稳定原子动作，使用点分命名，例如：

```text
requirement.create
merge_request.review
workspace.leader.manage
workspace.ownership.transfer
requirement.deleted.read
```

Scope 表示动作适用的资源范围，例如 Platform、Workspace、Project、Requirement 或 Repository。每个授权来源必须保持为独立元组：

```text
Grant = (
  principal,
  capability,
  scope,
  source,
  validFrom?,
  validTo?,
  status,
  version
)
```

Capability 集合与 Scope 集合不能分别汇总后做笛卡尔积。上级 Scope 是否包含子资源必须由服务端可信资源关系解析，不能相信客户端提交的 Workspace ID、Role、Capability 或 Scope 结论。

Workspace 业务资源的有效范围是实际 Grant Scope 与当前 Membership Scope 的交集。具有平台治理 Capability 不会自动获得任意 Workspace 业务数据访问权。

### 7.2 Assignment

Assignment 表示一项未完成责任的当前执行人，必须保留责任类型、目标对象、当前主体、来源 Policy Version、创建/转派原因和版本。

- Assignment 不授予 Capability，也不扩大 Scope 或 Membership；
- 被指派人仍须通过动作所需的全部授权与资源状态校验；
- 当前责任人只能通过明确命令转派，并记录 Audit；
- 组织、岗位、模板或 Policy 变化不得静默替换进行中 Assignment；
- 已完成的 Decision、Approval、Attempt、Artifact 和 Audit 永远保留原 actor；
- 自动执行主体使用自身 Workload Identity 和执行 Contract，不占用 Human Assignment。

### 7.3 服务端授权流程

每个受保护请求至少执行：

```text
1. 校验当前 Principal、账号状态和 Session
2. 从可信服务端数据解析资源、所属 Workspace 和资源状态
3. 强制执行 System Invariant / Security Floor
4. 校验匹配的 Capability + Scope Grant
5. 对 Workspace 业务资源校验当前 Membership
6. 对有当前责任人的动作校验 Assignment
7. 对 Leader 名单治理动作额外校验当前 Owner 事实
8. 返回可解释的 Allow / Deny，并记录必要 Audit
```

Frontend 根据后端返回的当前授权上下文动态展示菜单、按钮和路由，但隐藏 UI 不是安全边界。每个受保护 API 都必须独立鉴权。

### 7.4 授权版本与缓存

PostgreSQL 中的当前授权投影版本是权威事实。岗位、账号状态、Grant、Membership、协作有效期、Assignment 或相关 Policy 变化时，必须提升受影响的 Authorization Version。

运行时可以使用本地受限缓存并通过 Outbox/事件失效，但：

- 缓存键必须包含 Principal 和 Authorization Version；
- 有时效 Grant 的缓存有效期不得超过最近的失效时间；
- 检测到版本变化必须回源；
- 对授权、安全和外部副作用写操作，版本未知、过期或不可解析时必须回源或拒绝；
- Frontend 缓存、菜单可见性和客户端提交的版本都不是授权事实。

## 8. Super Admin 与配置治理

### 8.1 Super Admin 身份

Super Admin 是受保护的平台级身份事实，不是经理、Leader、管理员等组织岗位，也不是业务接口中的万能 Role。

每个 Platform Environment 通过同一版本化 Bootstrap 实现独立创建首个 Super Admin：

- 仍使用该环境本地的 8 位员工编号、随机一次性临时密码、正式密码和强制 TOTP；
- Bootstrap 在该环境只允许成功一次，初始化事实和账号不跨环境共享；
- 完成正式密码和 TOTP Enrollment 前，Super Admin 管理能力不激活。

Super Admin 独占两个不能通过普通 Grant 分配的 Platform Scope 保留能力：

```text
platform.configuration.manage
platform.super_admin.manage
```

这两个能力不进入岗位模板、账号创建勾选项、Workspace Policy 或一般转授流程。Super Admin 不自动获得任何业务 Capability；Requirement、Workspace、MR、Agent 和其他业务动作仍按其实际 `Capability + Scope`、Membership、Assignment 和状态条件校验。

增加或移除 Super Admin 必须由当前有效 Super Admin 使用 `platform.super_admin.manage`、完成新的 TOTP Challenge、填写原因并写入安全 Audit。身份变化提升 Authorization Version并撤销目标账号既有 Session。平台始终保证至少一个有效 Super Admin；最后一人不能被移除、停用或逻辑删除。

当最后一个可用 Super Admin 无法完成正常认证时，只能通过当前环境的带外 Break-glass Recovery Job/CLI 调用受限 Recovery Port。该流程不经 Web 页面或普通平台 API，不允许运维人员直接修改 PostgreSQL，也不能读取或修改 Workspace、Requirement、Policy 或历史 Audit；恢复只签发一次性受限资格，并要求目标账号重新完成正式密码和 TOTP 初始化。

### 8.2 配置分类与修改边界

配置统一分为：

| 分类 | 事实源 | 平台管理后台 |
| --- | --- | --- |
| `PLATFORM_POLICY` | 所属模块在 PostgreSQL 中的版本化配置 | 只有 Super Admin 可创建 Draft、校验、发布和回滚 |
| `GITOPS_CONFIG` | Git、Helm Values、Kubernetes Manifest 或组件声明 | 只读展示 Desired、Effective、Revision 和 Drift，修改走受控 GitOps |
| `SYSTEM_INVARIANT` | 领域代码、安全边界和已批准架构规则 | 只读展示名称、约束和原因，不提供编辑入口 |

所有 Platform Policy，包括以 Workspace 为生效 Scope 的 Gate Policy Override，都只能由 Super Admin 使用 `platform.configuration.manage` 发布。Workspace Owner、受邀 Leader、普通管理员或模块管理员不能修改。平台不设置可由管理员自行选择的配置风险等级。

`platform.configuration.manage` 不是万能权限。它不能绕过 Capability、Scope、Assignment、Human Gate、资源状态、保护分支、Audit、Secret 隔离、Fail Closed 或其他 System Invariant，也不能让 Super Admin 从平台后台修改基础设施配置或取得高权限凭据。

所有默认时间、数量、期限和阈值除非明确属于 System Invariant 或 Security Floor，否则必须在 Typed Configuration Catalog 中声明类型、单位、默认值、范围、作用 Scope、生效语义和回滚值。Secret、密码、TOTP Secret、Token、Access Key 和私钥不进入 Catalog。

## 9. 模块边界与可提取性

当前 Control Plane 采用模块化单体，各模块在同一 Python 项目中独立拥有领域模型、数据访问和 Port；未来需要时可以提取为微服务而不改变调用方语义。

| 模块 | 责任 | 不负责 |
| --- | --- | --- |
| Identity | 本地账号、临时密码、正式密码、TOTP、Session、Super Admin 身份 | 组织成员推导和业务授权 |
| Organization | 岗位分类、经理/Leader/普通员工关系及组织版本 | Workspace Leader 名单和权限 Grant |
| Workspace | Owner、受邀 Leader、正式成员投影、协作关系 | 修改组织树和解释业务 Capability |
| Authorization | Capability、Scope、Grant、Assignment 校验、授权版本和动态菜单 | 通过岗位字符串直接授权 |
| Configuration | Typed Platform Policy 及版本治理 | 修改 GitOps Config 或 System Invariant |
| Audit | 追加式身份、组织、成员、授权和配置事件 | 充当业务当前态或逻辑删除表 |

模块之间通过稳定 Port、领域事件和只读投影通信，不直接读取其他模块的内部表来复制第二份事实源。正式成员和授权是可重建投影；账号、组织关系、Workspace Leader 配置、Grant、Assignment 与 Published Policy 各自仍由所属模块负责。

Identity 的密码和 TOTP 流程通过与具体认证器无关的 Authenticator Port 执行。第一阶段只注册实际使用的密码与 TOTP Adapter，不创建空 Passkey 数据表、API、UI 或 Adapter；未来增加认证方式时不改变 Session、Authorization、Capability 和业务 Workflow 的语义。

## 10. Audit 与可解释性

以下动作必须进入追加式 Audit：

- 账号创建、临时密码签发/消费/过期、密码与 TOTP 重置、Session 撤销和账号状态变化；
- 岗位、直属上级和组织版本变化；
- Workspace 创建、归档、恢复、Owner 转让和受邀 Leader变化；
- 正式成员投影新增、失效、来源变化、同步失败和对账修复；
- 协作关系创建、修改、到期和提前终止；
- Capability、Scope、Grant、Assignment 和 Authorization Version变化；
- Super Admin Bootstrap、增加、移除、被拒绝的最后一人操作和紧急恢复；
- Platform Policy Draft、校验、发布、回滚以及 GitOps Drift 展示结果。

每条 Audit 至少能够回答：谁、何时、以何种身份、在什么 Environment 和 Scope、对哪个对象执行了什么、前后摘要、原因、结果、版本与 Correlation ID。Audit 正文不得保存明文密码、一次性临时密码、TOTP Code、TOTP Secret、Session Cookie、Token 或其他可直接使用的认证材料。

人员变动页面是只读投影，用于串联：

```text
组织变化
→ 受影响 Workspace
→ Membership 变化
→ Capability / Scope / Assignment 影响
→ Authorization Version 与缓存失效
→ 同步或对账结果
```

实际修改必须回到用户管理、Workspace 管理、Capability 管理、Assignment 所属 Workflow 或 Super Admin 配置入口；人员变动页面不提供编辑、撤销、补录或绕过授权的功能。

## 11. 必须保持的架构不变量

1. 员工编号始终是允许前导 `0` 的 8 位字符串。
2. 新账号和密码重置始终生成唯一随机一次性临时密码，不使用固定默认密码。
3. 所有用户完成正式密码与 TOTP 初始化前都不能进入业务能力。
4. 正式密码始终满足 15～32 位、大写、小写、特殊字符和弱/泄露/上下文检查。
5. 组织层级始终是经理 → Leader → 一层普通员工。
6. 创建 Leader 必须选择经理，创建普通员工必须选择直属 Leader。
7. Workspace 始终只有一个 Owner；受邀 Leader没有 Leader 名单治理或 Owner 转让权。
8. 正式成员始终由 Owner、受邀 Leader及其一层直属有效普通员工推导，经理不自动加入。
9. 岗位和能力模板不是运行时授权事实；实际授权始终是 `Capability + Scope` Grant。
10. Assignment 从不授予 Capability，组织或 Policy 变化从不静默改写未完成责任。
11. Owner 治理必须同时满足 Capability/Scope 与当前 Owner 事实。
12. Super Admin 只天然拥有受保护的配置和 Super Admin 管理能力，不自动拥有全部业务能力。
13. 所有 Platform Policy 只有 Super Admin 可以发布；GitOps Config 和 System Invariant 在平台后台不可编辑。
14. 每个 Platform Environment 的账号、Session、组织、Workspace、授权和 Audit 独立存在，不跨 DEV/PROD 共享。
15. 菜单可见性不是安全边界；受保护 API 始终使用服务端当前事实重新鉴权。
16. 已启动 Agent Attempt 按不可变 Execution Binding 继续，后续用户控制动作立即使用当前权限。
