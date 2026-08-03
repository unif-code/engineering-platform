# 组织、Workspace 与 Capability

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[组织、Workspace 与 Capability 详细设计](./01-organization-workspace-capability-detail.md)

## 1. 模块目标

用最少的概念解决人员组织、Workspace 数据隔离、动态菜单和操作权限问题，并支持经理、Leader 和员工变动后自动同步。

## 2. 核心模型

```text
Identity
├── 员工编号
├── 本地密码与 Session
└── TOTP MFA

Organization
├── 产品经理 → 产品 Leader → 产品人员
└── 开发经理 → 开发 Leader → 前端 / 后端人员

Workspace
├── Owner
├── 受邀 Leader
├── 自动同步的正式成员
└── 有有效期的协作成员
```

Workspace 本身就是营销、财务、人资、制造等团队边界，不再设置独立 Team。

## 3. 用户与 Workspace 解耦

账号由平台管理员创建，以员工编号登录。创建用户时不选择 Workspace，只维护身份信息、组织岗位、直属上级和状态。

组织关系固定为：

```text
经理 → Leader → 普通员工
```

Leader 必须选择同体系经理，普通员工必须选择同体系 Leader。创建 Workspace 的 Leader 成为 Owner，Owner 可以邀请或移除其他 Leader；受邀 Leader不能继续邀请或移除 Leader。

Owner、受邀 Leader及其直属普通员工自动成为正式成员，经理不自动加入。人员入职、调动、离职或上下级变化后，系统持续同步正式成员。

## 4. 协作成员

跨组织或临时参与人员通过“添加协作成员”加入，必须设置：

- 开始时间和结束时间；
- 协作原因；
- 可访问的 Project；
- 临时 Capability。

到期后系统立即停止授权、撤销 Sandbox 和临时仓库访问，但保留任务、代码和审计记录。

## 5. 岗位、Capability 与 Scope

不使用传统 Role 作为业务判断依据：

```text
岗位类型
→ 默认 Capability Package
→ 用户额外 Capability
→ Resource Scope
```

所有 Workspace 正式成员默认可以创建 Requirement。创建权不包含确认、验收、代码审批或合并权；这些动作继续由 Capability 和 Scope 决定。

有效权限至少同时满足：

```text
用户有效
AND Workspace 成员关系有效
AND 拥有目标 Capability
AND 资源位于授权 Scope
```

菜单、按钮和路由按有效 Capability 动态显示，后端 API 是最终安全边界。

## 6. 管理员

- 超级管理员拥有所有当前及未来平台 Capability，普通管理操作不能删除或撤销。
- 管理员默认拥有用户、Workspace、Model、Skill、菜单、审计等部分管理能力。
- 平台管理能力不自动授予 Workspace 业务数据访问。

## 7. 人员变动

管理员在用户或 Workspace 管理中完成变更。“人员变动”菜单只提供查询和审计：

- 岗位和直属上级变化；
- Workspace Owner 转让和 Leader 变化；
- 自动加入和移出的 Workspace；
- Capability 变化；
- 操作人、时间、原因和同步结果。

岗位型待办自动由新任人员承接；已分配给具体开发人员的任务不会因直属上级变化自动换人。

## 8. 业务价值

- 正式成员零手工维护；
- 人员调整后权限自动切换；
- 临时访问自动到期；
- 岗位不限制人员能力组合；
- 权限判断可解释、可审计；
- Workspace 之间默认数据隔离。
