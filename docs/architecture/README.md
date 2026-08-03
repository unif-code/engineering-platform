# 内部研发平台架构文档

> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 适用范围：内部研发平台目标架构
> 当前代码基线：Umi Max、React、TypeScript 前端模板

## 阅读方式

本文档集采用渐进式结构，同一主题按不同读者提供不同深度。

| 层级 | 读者 | 内容 | 建议阅读时间 |
| --- | --- | --- | --- |
| L0 | 所有人 | 本导航页 | 2 分钟 |
| L1 | 公司领导、部门负责人、架构评审人 | 平台主文和各模块精简版 | 20～40 分钟 |
| L2 | 产品、开发、测试、运维、Agent | 各模块详细版 | 按需阅读 |

精简版只描述目标、边界、关键流程和已确定决策；详细版是后续设计、拆分任务、生成代码和验收的依据。若两者表述不一致，以详细版为准，并同步修订精简版。

## L1：平台主文

- [内部研发平台目标架构](./00-platform-architecture.md)

## L1/L2：模块文档

| 模块 | 精简版 | 详细版 |
| --- | --- | --- |
| 组织、Workspace 与 Capability | [精简版](./01-organization-workspace-capability.md) | [详细版](./01-organization-workspace-capability-detail.md) |
| Requirement 与 SDD Workflow | [精简版](./02-requirement-sdd-workflow.md) | [详细版](./02-requirement-sdd-workflow-detail.md) |
| Agent、Skill 与 Model | [精简版](./03-agent-skill-model.md) | [详细版](./03-agent-skill-model-detail.md) |
| 远程 Sandbox Runtime | [精简版](./04-remote-sandbox.md) | [详细版](./04-remote-sandbox-detail.md) |
| GitLab、MR 与交付集成 | [精简版](./05-source-control-delivery.md) | [详细版](./05-source-control-delivery-detail.md) |
| 管理端、审计与数据看板 | [精简版](./06-admin-audit-observability.md) | [详细版](./06-admin-audit-observability-detail.md) |
| 平台技术架构 | [精简版](./07-platform-technical-architecture.md) | [详细版](./07-platform-technical-architecture-detail.md) |

## 文档约定

- “Requirement”与“需求”含义相同，平台领域对象统一使用 `Requirement`。
- Workspace 就是营销、财务、人资、制造等团队协作边界，不再设置独立的 Team 实体。
- Role 不作为业务授权核心；采用“岗位类型默认能力包 + Capability + Scope”。
- 第一阶段由平台使用员工编号、本地密码和 TOTP MFA 完成认证，不接入 SSO 或 HR。
- 组织关系固定为“经理 → Leader → 普通员工”；Workspace 正式成员由 Owner、受邀 Leader 及其直属员工动态派生。
- `feat` 执行完整 SDD，`fix` 执行 Superpowers Debug 路由，`refactor` / `chore` 执行技术快速流程。
- 第一阶段 Superpowers 随 Agent Runtime 镜像发布，不建设独立 Skill 版本管理中心。
- 文档中的 Model 名称均为配置别名，业务代码不得绑定具体厂商或版本。
- “当前态”表示本仓库已经具备的能力；“目标态”表示本文设计，不能混为已实现功能。

## 当前仓库状态

当前仓库是精简前端模板，已经具备：

- Umi Max 4、React 19、TypeScript 6；
- Ant Design 6、Pro Components 3、Ant Design X；
- TanStack React Query、Umi Request、Umi Access；
- Biome、Vitest、Testing Library；
- 基础 Layout、路由、Access 和 CRUD 示例。

当前尚未具备真实认证、动态菜单、Python 后端、数据库、Workflow、Agent Runtime、Sandbox、GitLab、审计和看板。本目录描述的是目标架构，不代表相关能力已经实现。

## 后续文档

整体架构确认后，再按实施阶段补充：

- `docs/adr/`：关键架构决策记录；
- `docs/plans/`：分阶段实施计划；
- `docs/runbooks/`：运行、故障处理和恢复手册；
- API、事件和数据库 Schema：随对应模块实施计划逐步固化。

本轮已确认的跨模块修订见：

- [平台本地身份、组织、Workspace 与 SDD 路由修订设计](../superpowers/specs/2026-08-02-platform-architecture-revision-design.md)
