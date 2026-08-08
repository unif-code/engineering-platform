# 身份、组织与授权

> 文档层级：L1 主文
> 规范事实源：[身份、组织与授权详细说明](./identity-organization-authorization-detail.md)
> 实施阶段、激活状态和 Release 验收见 [12 实施路线图详细说明](./12-implementation-roadmap.md)。

## 模块目标

本主题为平台提供本地人员身份、组织关系、Workspace 人员边界和动作授权。它回答“谁是谁、属于哪里、能访问什么、当前由谁负责”，而不定义 Requirement 状态、交付流程或基础设施认证实现。

授权结论来自当前的身份状态、资源关系和 `Capability + Scope + Assignment`，不来自岗位名称、菜单可见性或外部系统角色。

## 本地身份

平台使用环境本地账号完成登录。账号初始化、正式认证、多因素验证、Session 和账号状态共同决定人员是否可以进入受保护业务能力。密码与 TOTP 重置、账号停用和权限变化会使已有访问权及时失效；历史业务 actor 和 Audit 保留。

身份规则的值、初始化限制和 Session 语义由[详细说明](./identity-organization-authorization-detail.md#2-本地身份与-session)唯一规定。

## 组织层级

平台维护单一的人员管理链：经理管理 Leader，Leader 管理普通员工。产品、前端、后端等专业分类可以辅助展示和能力模板预选，但不构成第二棵组织树，也不直接授予业务权限。

组织变化会影响由组织派生的 Workspace 正式成员；它不会静默改写未完成责任或历史事实。

## Workspace 成员

Workspace 是团队协作与业务资源边界。每个 Workspace 有一个 Owner；Owner、受邀 Leader 及其直属有效普通员工形成动态的正式成员投影。临时或跨组织访问通过有时间边界的协作关系授予，不改写正式成员集合。

成员资格只解决“是否进入资源边界”，不单独赋予创建、确认、验收、审核或合并等动作权限。这些动作的规则由[Requirement Workflow](./02-requirement-workflow.md)和[Source Control 与交付](./05-source-control-delivery.md)拥有。

## Capability、Scope 与 Assignment

`Capability` 表示稳定的原子动作，`Scope` 表示该动作可作用的资源范围，`Assignment` 表示尚未完成责任的当前承担者。三者分别解决资格、范围和责任，不能相互替代。

受保护 API 必须基于服务端当前事实校验身份、Capability、Scope、适用的 Membership、Assignment 和资源条件。UI 的菜单、按钮和路由只改善体验，不构成授权边界。

## Super Admin 边界

Super Admin 是受保护的平台级身份，而不是拥有全部业务权限的万能 Role。其保留能力只覆盖平台配置治理和 Super Admin 生命周期；业务资源、人工 Gate、责任分配和其他安全不变量仍遵循普通授权规则。

平台始终保留至少一个可用 Super Admin。无法执行正常认证时，只能使用受限的带外恢复路径，恢复不成为读取或修改一般业务资源的入口。

## 认证演进边界

Passkey/WebAuthn 是本地密码、强制 TOTP、可撤销 Session、Organization、Workspace 与服务端授权 Contract 稳定后的独立演进路径。它通过认证器无关的 Port 接入，不改变 Capability、Scope、Assignment 或业务 Workflow 语义；未完成完整注册、验证、恢复与 Audit Contract 前保持关闭。

## 关键不变量

- 本地身份、组织、Workspace、授权和 Audit 都是当前 Platform Environment 的本地事实。
- 组织层级只有经理、Leader 与一层普通员工；岗位不是运行时授权事实。
- 每个 Workspace 始终恰有一个 Owner；受邀 Leader 不取得 Owner 治理权。
- 正式成员是动态投影；经理不会仅因管理关系自动成为成员。
- Assignment 不授予 Capability，也不扩大 Scope 或 Membership；组织和 Policy 变化不静默转移未完成责任。
- Super Admin 不绕过 Capability、Scope、Assignment、人工 Gate、资源状态、Audit 或 System Invariant。
- 已启动的 Agent Attempt 按其执行 Contract 继续；之后的查看、取消或重试仍按当前人员权限判断。

## 阅读导航

- [身份、组织与授权详细说明](./identity-organization-authorization-detail.md)：本主题的规范事实源。
- [平台总览](./00-platform-overview.md)：平台边界与依赖方向。
- [Requirement Workflow](./02-requirement-workflow.md)：责任、人工 Gate 与业务状态。
- [安全、审计与治理](./08-security-audit-governance.md)：安全事件与 Audit。
- [基础设施与运维](./09-infrastructure-operations.md)：专业控制台访问边界。
