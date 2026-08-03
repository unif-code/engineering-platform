# 内部研发平台目标架构

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02

## 1. 平台定位

建设一个面向产品、产品 Leader、前后端开发、开发 Leader、经理、管理员和超级管理员的企业内部 AI 研发平台。

平台将 Requirement、代码仓库、Agent、Skill、Model、远程 Sandbox 和人工审批连接起来。下面是 `feat` 的完整路径；`fix`、`refactor` 和 `chore` 按类型跳过不适用阶段：

```text
需求澄清
→ Product Spec / Plan
→ 可运行黄金需求
→ Backend SDD
→ Frontend Delivery
→ 联调与测试
→ 产品验收
→ AI Review
→ MR 审批
→ 合并 main
```

Jenkins 继续负责合并 `main` 后的构建与发布，平台只预留集成接口。

## 2. 核心设计决策

1. 用户端和管理端使用同一个前端项目、同一套用户数据和同一套 API。
2. 第一阶段由平台使用员工编号、本地密码和 TOTP MFA 完成认证，不接入 SSO 或 HR。
3. 账号与组织身份分离；组织关系固定为“经理 → Leader → 普通员工”，产品和开发分别形成独立组织树。
4. 创建用户不选择 Workspace；Leader 选择同体系经理，普通员工选择同体系 Leader。
5. 创建 Workspace 的 Leader 成为 Owner，只有 Owner 能邀请、移除其他 Leader和转让所有权；受邀 Leader不能继续治理 Leader 名单。
6. 正式成员由 Owner、受邀 Leader及其直属普通员工动态派生，不包含经理；Workspace 不提供手工设置正式成员。
7. Role 不作为授权核心；岗位类型提供默认能力包，最终权限由 Capability、Scope 和上下文条件决定。
8. 所有 Workspace 正式成员默认可以创建 Requirement，但创建权不等于确认、验收、代码审批或合并权。
9. Requirement 按类型路由：`feat` 执行完整 SDD，`fix` 执行 Superpowers Debug 流程，`refactor` / `chore` 执行技术快速流程。
10. `feat` 在真实前端仓库中完成 Product SDD，生成页面、交互和 Mock，形成可运行黄金需求。
11. 需要后端交付时执行 Backend SDD 并产出机器可读的 API Contract；复杂前端需求才升级为完整 Frontend SDD。
12. 一个 Requirement 可以绑定多个仓库，每个仓库拥有自己的任务分支和 MR。
13. Agent、Superpowers Skill、Model 和人员 Capability 相互解耦，Agent 只获得当前 Attempt 所需的短期工具权限。
14. AI Review 默认提供建议，不代替开发 Leader审批；确定性质量门禁按 Workspace Policy 配置。
15. 每个 Requirement 在远程隔离 Sandbox 中运行、预览、联调和测试。

## 3. 核心业务结构

```text
Identity
├── 员工编号本地账号
├── 首次激活与密码
└── TOTP MFA

Organization
├── 产品经理 → 产品 Leader → 产品人员
└── 开发经理 → 开发 Leader → 前端 / 后端人员

Workspace
├── Owner
├── 受邀 Leaders
├── 各 Leader 的直属员工
├── 有时效的协作成员
├── Project
├── Repository Binding
└── Requirement
```

正式成员跟随 Workspace Leader 和直属员工关系自动同步。Workspace 成员身份只决定进入边界，能做什么仍由 Capability 决定。

## 4. Requirement 主流程

```text
创建 Requirement
→ 按 feat / fix / refactor / chore 选择流程模板
→ 创建所需任务分支与远程 Sandbox
→ 调用固定版本的 Superpowers Runtime Bundle
→ 执行对应 SDD、Debug 或技术快速流程
→ 完成人工 Gate、测试和必要验收
→ 创建 MR、AI Review 和开发 Leader审批
→ 合并 main
→ Jenkins 构建与发布
```

验收不通过时创建关联的 `fix`、`feat`、`refactor` 或 `chore` Requirement，并按新 Requirement 类型重新路由；原 Requirement 保留完整历史。

## 5. 平台分层

```text
体验层
├── 用户工作台
├── Requirement 详情三栏界面
└── 管理端

控制平面
├── Identity
├── Organization
├── Workspace
├── Authorization
├── Requirement Workflow
├── Agent Run
└── Audit

执行平面
├── Agent Orchestrator
├── Remote Sandbox
├── Test / Review Runner
└── Artifact Storage

集成平面
├── GitLab Adapter
├── Model Provider Adapter
├── Jenkins Adapter
└── Notification Adapter
```

所有外部系统通过 Adapter 接入，Workflow 只依赖内部稳定接口，避免替换 Git 平台、Model、Sandbox 或 Jenkins 时修改核心业务。

## 6. 推荐部署形态

第一阶段采用“逻辑模块化、物理适度拆分”：

- Python Control Plane 是一个模块化单体部署单元，内部包含 Identity、Organization、Workspace、Authorization、Requirement Workflow、Agent Run 和 Audit 模块；
- Agent Orchestrator、Model Gateway、Sandbox Controller 独立部署，隔离高风险执行面并支持独立扩容；
- GitLab、Jenkins、Model Provider 和通知由 Integration Adapter 统一接入；
- 领域事件通过 Transactional Outbox 可靠发布，逐步接入消息系统。

该方式比一开始全面微服务更容易交付，同时保留按模块拆分服务的接口边界。

## 7. 安全与治理原则

- `main` 禁止直接 Push，所有代码通过 MR 合并。
- Capability 授权必须带平台、Workspace、Project、Requirement 或 Repository Scope。
- 超级管理员拥有不可删除的全平台能力；管理员只有配置的管理能力。
- Secret 不进入代码、日志或 Prompt，使用短期凭据动态注入。
- Sandbox 默认隔离计算、文件、网络和凭据。
- Agent 不能以人员岗位获得权限，只能获得本次 Run 的最小 Runtime Policy。
- 关键操作写入不可抵赖的审计事件，并关联用户、Agent、Skill、Model、仓库、Commit 和 Requirement。

## 8. 渐进式建设

### 阶段一：治理基础

- 本地账号、首次激活、密码重置和高风险账户 TOTP MFA；
- 经理、Leader、普通员工和上下级关系；
- Workspace、自动成员、协作成员；
- Capability、动态菜单、接口鉴权；
- 审计基础。

### 阶段二：黄金需求

- Requirement、前端分支；
- Product SDD；
- 远程 Sandbox 与页面预览；
- 产品及产品 Leader确认。

### 阶段三：研发闭环

- Backend SDD、API Contract；
- Frontend Delivery；
- 联调、测试、产品验收；
- GitLab MR、AI Review、Leader审批。

### 阶段四：平台治理

- Model、Agent 与 Runtime Bundle 运行治理；
- 成本、质量和效率看板；
- Jenkins 与通知等企业集成；
- Workflow 与 Sandbox 的规模化治理。

## 9. 模块导航

- [组织、Workspace 与 Capability](./01-organization-workspace-capability.md)
- [Requirement 与 SDD Workflow](./02-requirement-sdd-workflow.md)
- [Agent、Skill 与 Model](./03-agent-skill-model.md)
- [远程 Sandbox Runtime](./04-remote-sandbox.md)
- [GitLab、MR 与交付集成](./05-source-control-delivery.md)
- [管理端、审计与数据看板](./06-admin-audit-observability.md)
- [平台技术架构](./07-platform-technical-architecture.md)

## 10. 非目标

- 不重建 GitLab 的代码托管能力。
- 不重建 Jenkins 的部署流水线。
- 不允许 Model 或 Agent 绕过人工审批和受保护分支策略。
- 第一阶段不为每个逻辑模块建立独立微服务。
- 不把任何具体 Model 版本、Git Provider 或 Sandbox 实现写死在业务流程中。
