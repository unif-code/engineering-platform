# 组织、Workspace 与 Capability

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[组织、Workspace 与 Capability 详细设计](./01-organization-workspace-capability-detail.md)

## 1. 模块目标

以本地身份、单层组织关系、Workspace 成员投影和 `Capability + Scope + Assignment` 统一解决登录、人员归属、数据边界、动态菜单和操作权限。岗位只用于组织表达与账号创建时的能力预选，不作为业务 API 的授权条件。

## 2. Platform Environment 边界

当前只部署 DEV；未来 PROD 使用相同代码、Contract、GitOps 模板和 Platform Compatibility Set，但在独立运行实例中部署。

- 每个 Platform Environment 各自保存本地账号、密码、TOTP、Session、组织、Workspace 和授权事实。
- DEV 与 PROD 不共享域名、Web/API 实例、数据库、用户记录、Session 或凭据。
- 当前 DEV 管理后台只治理和展示 DEV；未来 PROD 管理后台只治理和展示 PROD。
- 第一阶段不接入 SSO 或 HR，外部 HR 组织树不是事实源，也不建设无实际行为的占位 Adapter。

## 3. 本地身份与登录

- 登录账号统一使用恰好 8 位数字的员工编号，允许以 `0` 开头并按字符串保存。
- 账号只能由具备相应 Identity Capability 和 Scope 的管理员创建，不提供自助注册。
- 平台为每个新账号生成唯一、密码学安全随机的一次性临时密码。临时密码默认 24 小时有效，只展示一次且之后不可回读明文。
- 临时密码首次成功使用时原子消费，只签发受限 Bootstrap Session；新账号必须设置正式密码并完成 TOTP Enrollment，密码重置账号必须设置正式密码并校验已有 TOTP（若 TOTP 已独立重置则重新 Enrollment），之后才能进入业务页面。
- 正式密码为 15～32 位，必须包含大写字母、小写字母和至少一个特殊字符，同时拒绝常见弱密码、已泄露密码和包含员工编号等账号上下文的密码。
- 密码使用 Argon2id、每账号独立 salt，并以 OpenBao 管理的 pepper 加固；数据库不保存明文。
- 所有用户必须绑定并在登录时验证 TOTP。Enrollment 可显示二维码和一次性 Secret，支持手机或桌面 2FA 工具；第一阶段不提供恢复码。
- 密码重置和 TOTP 重置是两个独立的受审计操作，均需撤销既有 Session；密码重置重新生成唯一的一次性临时密码。
- 密码过期周期、临时密码有效期、Session 空闲时间和并发 Session 数等首发默认值均由受控 Platform Policy 管理，不写死在代码中。

## 4. 组织层级

平台内部只维护以下层级：

```text
经理
└── Leader（一个经理可以有多个 Leader）
    └── 普通员工（产品、前端或后端）
```

- 创建 Leader 时必须选择其经理；创建普通员工时必须选择直属 Leader。
- 第一阶段不支持 Leader 下再嵌套 Leader，也不支持普通员工拥有下属。
- 产品与开发可以属于不同经理和不同组织链，不要求共同经理，也不以产品/开发标签限制 Workspace 协作。
- 经理、Leader、产品、前端和后端是组织岗位或人员分类，不直接授予业务权限。

## 5. Workspace 治理与成员

- Workspace 是团队协作与业务资源边界，不再建立独立 Team 实体或 Team 级授权。
- 创建 Workspace 的有效 Leader 成为唯一 `Workspace Owner`。
- Owner 可以邀请或移除其他 Leader，并可以将 Owner 转让给已有受邀 Leader。
- 受邀 Leader可以参与 Workspace 业务，但不能邀请、移除其他 Leader，也不能转让 Owner。
- Leader 名单治理除要求相应 Capability 和 Scope 外，还必须校验当前 Owner 事实；普通 Grant 不能绕过 Owner 门禁。
- Owner 无法操作时，只有具备专用 Override Capability 和有效 Scope 的平台管理员才能受审计地强制转让；Super Admin 身份本身不自动满足该业务权限。

Workspace 正式成员是以下集合的去重并集：

```text
当前 Owner
UNION 受邀 Leaders
UNION 上述每个 Leader 当前直属的有效普通员工
```

经理不会仅因管理某个 Leader 自动成为正式成员。正式成员是由组织和 Leader 配置推导出的只读投影，不提供手工添加、移除或排除入口；人员、直属上级、Owner 或受邀 Leader变化后重新计算，历史 Requirement、Assignment、Decision 和 Audit 不被删除或改写。

跨组织或临时访问使用有开始时间、结束时间、原因、资源 Scope 和临时 Capability 的协作关系。是否可以管理协作关系只由显式 `Capability + Scope` 决定，Owner、受邀 Leader或管理员称谓本身不自动授予该能力；到期或提前终止后立即撤权并保留记录与 Audit。

## 6. Capability、Scope 与 Assignment

所有模块统一采用：

```text
System Invariant / Security Floor
→ Platform / Workspace Policy
→ Capability + Scope
→ Assignment
```

- Capability 表示可执行的稳定原子动作，Scope 表示该动作可作用的资源范围；两者必须按同一授权来源成对保存和校验。
- 岗位能力模板只用于账号创建界面的预选。管理员最终勾选并形成用户实际 Grant；岗位或模板变化不静默改写既有 Grant。
- Assignment 表示某项未完成责任当前由谁承担，不授予 Capability。被指派人仍必须满足当前账号状态、Capability、Scope、Workspace Membership 和资源状态等条件。
- 未完成责任的转派必须显式执行并写入 Audit；组织树或 Policy 变化不能静默替换当前责任人，已经完成的动作始终保留原 actor。
- 每个受保护 API 都从可信服务端数据重新校验当前 Principal、Capability、Scope、适用的 Membership/Assignment 和资源状态。菜单、按钮与路由的隐藏只改善体验，不是安全边界。
- PostgreSQL 中的当前授权版本是事实源；缓存版本未知或过期时必须回源或拒绝，不能用陈旧权限完成写操作。
- 权限撤销不终止已经启动的 Agent Attempt；Attempt 按启动时不可变 Execution Binding 继续，之后的查看、取消、重试等用户控制动作立即按当前权限判断。

## 7. Super Admin 与配置边界

- Super Admin 是受保护的平台级身份，不是组织岗位，也不是拥有全部业务 Capability 的万能账号。
- Super Admin 独占不可通过普通 Grant 分配的 Platform Scope 保留能力 `platform.configuration.manage` 和 `platform.super_admin.manage`；其他业务动作仍按普通 `Capability + Scope` 校验。
- 所有 `PLATFORM_POLICY` 只有 Super Admin 可以在平台管理后台创建 Draft、校验、发布和回滚，包括以 Workspace 为生效 Scope 的 Policy Override。Workspace Owner、受邀 Leader和普通管理员均不能修改。
- `GITOPS_CONFIG` 只在管理后台展示 Desired、Effective、Revision 和 Drift，实际修改走受控 GitOps；Super Admin 也不能从平台后台修改基础设施配置或取得基础设施高权限凭据。
- `SYSTEM_INVARIANT` 只读展示，不提供编辑入口。Super Admin 不能绕过 Human Gate、Assignment、资源状态、保护分支、Audit、Secret 隔离或其他安全底线。

## 8. 审计与人员变动

Identity、Organization、Workspace、Capability、Scope、Assignment、Session 撤销和配置变化全部进入追加式 Audit。人员变动视图只用于查询组织变化、成员投影、授权版本和同步结果；实际修改分别在用户、Workspace、Capability 或配置管理入口完成。

审计正文不得保存明文密码、一次性临时密码、TOTP Secret、Token 或其他认证材料。
