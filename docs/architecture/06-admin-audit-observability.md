# 管理端、审计与数据看板

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[管理端、审计与数据看板详细设计](./06-admin-audit-observability-detail.md)

## 1. 模块目标

为平台管理员、Workspace Owner、Leader和经理提供统一治理入口，保证人员、权限、Model、Runtime Bundle、代码和 Agent 操作可查询、可追溯、可度量。

## 2. 管理端功能

- 用户与上下级管理；
- 岗位类型、Capability Package 与额外授权；
- 人员变动记录；
- Workspace、Owner、受邀 Leader和协作成员；
- Project 与 Repository；
- Agent、Runtime Bundle 运行记录和 Model；
- 菜单与资源 Policy；
- 审计查询；
- Model、研发效率和运行质量看板。

用户端和管理端共用一张用户表，根据有效 Capability 动态展示菜单。

## 3. 人员变动

人员变动菜单是只读审计视图。管理员在用户或 Workspace 页面完成实际修改后，系统记录：

- 原岗位、上级和 Workspace；
- 新岗位、上级和 Workspace；
- 自动增减的成员关系与 Capability；
- 操作人、时间、原因和同步状态。

## 4. 审计

关键事件包括：

- 登录、用户和权限变化；
- Leader、正式成员和协作成员变化；
- Workspace、Repository、PAT 和 Secret 配置；
- Requirement 状态和人工审批；
- Agent、实际加载的 Skill、Model 与工具调用；
- Sandbox 命令、网络、Artifact；
- Commit、AI Review、MR 和合并；
- Jenkins 状态同步。

审计记录不可被普通业务接口修改，敏感字段只保存脱敏值、摘要或引用。

## 5. 数据看板

管理层看板至少覆盖：

- Model 调用量、Token、成本、延迟和成功率；
- Requirement 各阶段耗时和等待时间；
- 按 Requirement 类型统计的 SDD / Debug 路由成功率、返修率和一次验收通过率；
- Agent、Runtime Bundle、Skill 和 Model 的质量与失败分布；
- Sandbox 启动、运行、超时和回收情况；
- MR 周期、Review 结果和 Jenkins 发布状态。

所有指标都可以按 Workspace、Project、时间、Model、Skill 和 Agent 下钻，并受数据范围控制。

## 6. 治理原则

- 审计事件与分析指标分开存储；
- 指标可聚合，审计原始证据不可覆盖；
- 超级管理员操作重点告警；
- 成本预算和调用配额按 Workspace 配置；
- 看板数字必须能追溯到来源事件和统计口径。
