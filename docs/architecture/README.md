# 内部研发平台架构文档

> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 适用范围：内部研发平台目标架构
> 当前代码基线：Umi Max、React、TypeScript 前端模板

> 已批准的跨模块完整约束见
> [完整架构决策基线](./08-rolling-architecture-decision-baseline.md)。
> 模块文档与该基线若出现冲突，视为文档缺陷，必须修正而不能由实施者自行选择。

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
- [完整架构决策基线](./08-rolling-architecture-decision-baseline.md)

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

- 所有架构 Markdown 只描述当前有效设计；决策变化时直接修正文档，不保留旧规则对照、废弃方案或相互冲突的历史表述。
- “Requirement”与“需求”含义相同，平台领域对象统一使用 `Requirement`。
- Workspace 就是营销、财务、人资、制造等团队协作边界，不再设置独立的 Team 实体。
- Role 不作为业务授权核心；岗位仅提供创建时的能力模板和默认路由，实际授权采用 `Capability + Scope + Assignment`。
- 第一阶段由平台使用8位员工编号、本地密码、可撤销Session和全员强制TOTP MFA完成认证，不接入SSO或HR；创建/重置账号生成唯一随机、一次展示的临时密码。
- 组织关系固定为“经理 → Leader → 普通员工”；Workspace 正式成员由 Owner、受邀 Leader 及其直属员工动态派生。
- Requirement创建由Capability + Scope决定，产品和开发岗位都不自动允许或禁止；创建Requirement时必须选择一个初始GitLab Project。
- `feat` 执行完整 SDD，`fix` 执行 Superpowers 的 `systematic-debugging`、TDD、验证和代码评审流程，`refactor` / `chore` 执行技术快速流程。
- 所有SDD默认审核人为Requirement创建人，可按统一Assignment规则异步改派；最终验收与Formal MR Review使用独立Assignment和Decision。
- 第一阶段 Superpowers 随 Agent Runtime 镜像发布，不建设独立 Skill 版本管理中心。
- 文档中的 Model 名称均为配置别名，业务代码不得绑定具体厂商或版本。
- Jenkins首版保持独立，平台不调用、不读取其状态；开发人员在外部手工验证后，平台只负责一键创建Formal MR并完成GitLab合并流程。
- 当前只部署DEV；未来PROD使用同源组件、Contract、GitOps模板和PCS在独立Resource Account/VPC/Kubernetes Cluster中实例化，不共享Gateway、数据、Session或密钥。
- Cloud Account、VPC、NLB、WAF、VPN、NAT、KMS、外部Backup和Watchdog由运维/IaC管理，平台只消费逻辑Binding和签名只读状态。
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

完整架构已经批准；收到明确的下一阶段指令后，再按实施阶段补充：

- `docs/adr/`：关键架构决策记录；
- `docs/plans/`：分阶段实施计划；
- `docs/runbooks/`：运行、故障处理和恢复手册；
- API、事件和数据库 Schema：随对应模块实施计划逐步固化。

跨模块细粒度约束统一见[完整架构决策基线](./08-rolling-architecture-decision-baseline.md)。模块详版负责各自边界内的实施视图；二者必须保持一致，任何变化都通过新的架构版本受控修订。
