# 管理端、审计与数据看板详细设计

> 文档层级：L2 详细版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 对应精简版：[管理端、审计与数据看板](./06-admin-audit-observability.md)

## 1. 目标与非目标

目标：

- 用同一个 Web App 治理用户、Workspace、Capability、Agent Runtime 和 Model；
- 为经理、Leader、管理员和超级管理员提供符合 Scope 的数据；
- 对人员、权限、代码、Agent 和外部集成形成完整审计；
- 用统一指标衡量成本、效率、质量和稳定性。

非目标：

- 不建立独立管理端用户表；
- 不允许前端菜单隐藏替代后端鉴权；
- 不把审计存储当作业务数据库；
- 不在第一阶段建设任意拖拽式 BI 平台。

## 2. 管理端信息架构

```text
平台管理
├── 用户管理
├── 岗位与 Capability
├── 人员变动
├── Workspace 管理
├── Project 与 Repository
├── Agent 管理
├── Runtime Bundle 运行记录
├── Model 管理
├── 菜单与资源 Policy
├── 审计中心
└── 数据看板
```

菜单由后端根据用户当前有效 Capability 返回。用户只有在至少一个 Scope 中具备对应能力时才看到入口，进入后继续按 Scope 过滤数据。

## 3. 用户管理

用户创建不选择 Workspace。主要字段：

```text
employeeNo
displayName
email
accountStatus
organizationTrack
organizationLevel
specialty
supervisorUserId
```

规则：

- 账号由管理员创建，员工编号唯一；
- 临时凭据单账号、单次有效、24 小时过期；
- 正式密码长度为 15–32 个字符；
- 超级管理员和高风险管理 Capability 持有者强制 TOTP MFA；
- 产品的直属上级必须是有效产品 Leader；
- 产品 Leader的直属上级必须是有效产品经理；
- 开发 Leader的直属上级必须是有效开发经理；
- 前端/后端开发的直属上级必须是有效开发 Leader；
- 上下级关系不得形成环；
- 停用用户立即失去登录、Workspace 和协作访问；
- 历史操作不因姓名、岗位或上级变化而改写。

用户列表提供岗位、上级、状态、Workspace 投影和有效 Capability 摘要，但 Workspace 不能在用户创建表单中编辑。

## 4. 岗位与 Capability

页面包括：

- 岗位类型；
- Capability Registry；
- Capability Package；
- 岗位默认能力包绑定；
- 用户额外 Grant；
- 菜单/API/资源 Policy 映射。

Capability 使用稳定 Code，例如：

```text
requirement:create
requirement:approve
requirement:assign
development:execute
mr:create
mr:approve
mr:merge
audit:view
workspace:leader:manage
workspace:ownership:transfer
```

岗位名称只用于默认配置和展示，后端不得通过岗位名称判断接口权限。

额外 Grant 记录：

- Capability；
- Scope 类型与 ID；
- 授予人；
- 原因；
- 起止时间（如适用）；
- 状态。

## 5. Workspace 管理

创建 Workspace 时配置：

- 名称、编码和说明；
- 创建者自动成为唯一 Owner；
- Owner 后续邀请的产品或开发 Leader；
- Repository、Model、Runtime、Sandbox 和预算 Policy。

只有 Owner 可以邀请、移除 Leader或转让所有权。受邀 Leader不能执行这些操作。系统把 Owner、受邀 Leader及其直属普通员工同步为正式成员，经理不自动加入。

Workspace 页面：

```text
概览
├── 基本信息
├── Owner 与受邀 Leader
├── 成员概览（只读）
├── 协作成员
├── Project
├── Repository
├── Model / Runtime Policy
├── Sandbox / 预算 Policy
└── 审计与指标
```

不存在“手工设置正式成员”。成员概览展示成员来源、岗位、Leader 链路和最近同步时间。

## 6. 协作成员

新增协作成员必填：

- 用户；
-开始时间；
-结束时间；
-协作原因；
- Project Scope；
- Capability。

支持延期和提前终止，每次变化生成新审计事件。到期任务是状态投影优化，API 鉴权仍实时检查 `[startAt, endAt)`，即使定时任务延迟也不能继续访问。

协作到期后：

- 撤销临时 Capability；
- 失去 Workspace、Project、Preview 和 Sandbox 访问；
- 吊销临时凭据；
- 未完成任务保留并通知开发 Leader重新分配；
- 历史记录保留。

## 7. 人员变动

“人员变动”是只读审计菜单，不重复提供修改入口。

记录来源：

- 用户岗位或直属上级修改；
- 用户启用、停用或离职；
- Workspace Owner 转让和受邀 Leader 变化；
- 平台组织关系变化导致的正式成员投影变化；
- 岗位默认能力变化；
- Workspace Capability 变化。

列表字段：

```text
changedAt
changeType
user
beforeSummary
afterSummary
affectedWorkspaces
capabilityDelta
operator
reason
syncStatus
```

岗位型待办在查询时解析当前任职人；明确分配给个人的开发任务不自动换人。

## 8. Agent、Runtime Bundle 与 Model 管理

### 8.1 Agent

- Definition、版本、状态；
- 支持 Workflow 阶段；
- Skill 和 Runtime Permission 要求；
- Model Route Policy；
- 使用量、成功率和异常。

### 8.2 Runtime Bundle

第一阶段不提供独立 Skill Registry、发布审核或 Workspace 版本选择页面。运行记录只读展示：

- Agent Runtime 镜像 digest；
- Superpowers Skill Bundle hash；
- 实际加载的 Skill 名称；
- Attempt 使用的 Model、Tool Policy 和 Context Policy；
- 部署时间、运行次数、成功率和失败原因。

同一 Attempt 内禁止热更新；新 Runtime 镜像只影响新 Attempt。第一阶段不展示或配置 `grill-me`。

### 8.3 Model

- Provider 与 Deployment；
-逻辑 Capability；
-区域和数据处理等级；
-单价、配额和限流；
-健康状态和回退顺序；
- Workspace Allowlist；
-密钥引用。

业务页面显示逻辑 Model 别名，不依赖厂商版本字符串。

## 9. 菜单与资源 Policy

菜单实体只描述导航：

```text
id
parentId
name
path
icon
order
requiredCapabilities
status
```

后端登录上下文返回：

- User Profile；
- 可访问 Workspace；
- 有效 Capability 摘要；
- 菜单树；
- 当前 Workspace 数据范围。

前端按返回结果渲染；API 使用独立的 `ResourceCapabilityPolicy` 鉴权。敏感 API 未声明 Policy 时默认拒绝。

## 10. 审计事件

统一结构：

```text
eventId
occurredAt
actorType
actorId
onBehalfOfUserId
workspaceId
projectId
requirementId
action
resourceType
resourceId
result
reason
beforeHash
afterHash
correlationId
sourceIp
metadata
```

`actorType` 包括：

- USER；
- AGENT；
- SERVICE；
- SYSTEM。

源码、Prompt、PAT、Token 和 Secret 不直接写入审计。需要证明内容时保存脱敏摘要、Hash 或受控 Artifact 引用。

## 11. 必须审计的操作

### 11.1 身份与权限

- 登录、失败登录、临时凭据签发/使用/过期和会话撤销；
- 首次改密、管理员密码重置、TOTP MFA 绑定/重置和高风险验证失败；
- 用户、岗位、上级和状态变化；
- Capability Package 和额外 Grant；
- 超级管理员相关操作；
- 协作成员加入、延期、终止和到期。

### 11.2 Workspace 与资源

- Workspace 和 Leader 变化；
- Repository 加入、移除和凭据引用变化；
- Model、Runtime、Sandbox 和预算 Policy；
- Project 和数据范围变化。

### 11.3 研发流程

- Requirement 创建和状态转换；
- Spec、Plan、API Contract 和黄金需求版本；
- 人工审批、驳回和覆盖；
- Agent/Skill/Model 绑定和 Tool 调用；
- Sandbox Run、Preview 和 Artifact；
- Commit、Review、MR、合并和 Jenkins 状态。

## 12. 审计存储

- 业务事务通过 Transactional Outbox 产生审计事件；
- 审计消费者写入追加型存储；
- 普通业务 API 不提供 Update/Delete；
- 事件具备序列号、Hash 或其他完整性校验；
- 热数据支持条件查询，冷数据按保留策略归档；
- 敏感审计查询本身也被审计。

## 13. 指标体系

### 13.1 Model

- 调用次数；
- Input/Output Token；
-估算与结算成本；
-P50/P95 延迟；
-成功率、限流率、回退率；
-按 Workspace、Agent、Skill 和 Model 下钻。

### 13.2 Requirement 效率

- `feat` 创建到黄金需求确认时长；
-开发 Leader等待时长；
- Backend SDD 和 Frontend Delivery 时长；
-联调、测试和产品验收时长；
-从创建到合并的 Lead Time；
-每阶段阻塞时间。

### 13.3 质量

- Build/Test 通过率；
- AI Review 建议数量和采纳率；
-一次验收通过率；
-返修率；
-MR 修改轮次；
-合并后返修和发布失败率。

### 13.4 Runtime

- Sandbox Provision 成功率和耗时；
- Run 成功、失败、超时和取消；
-资源利用率；
-回收失败和隔离实例；
- Agent/Skill 失败分布。

## 14. 指标口径

指标定义必须包含：

```text
metricCode
displayName
definition
formula
dimensions
sourceEvents
timeZone
owner
version
```

例如：

```text
一次产品验收通过率
= 首次进入 PRODUCT_ACCEPTANCE 后直接通过的 Requirement 数
  / 首次进入 PRODUCT_ACCEPTANCE 的 Requirement 总数
```

看板不直接在前端拼接业务表计算，统一从 Metrics API 获取有版本的统计结果。

## 15. 数据管道

```text
Business / Runtime Events
→ Event Bus
→ Audit Consumer
→ Metrics Consumer
→ 聚合存储
→ Metrics API
→ Dashboard
```

审计事件保存事实，Metrics Consumer 可以重放并重建聚合数据。指标延迟与最近更新时间需要在看板展示。

## 16. 数据权限与脱敏

- 经理只有在成为正式/协作成员，或持有明确 Scope 的管理 Capability 时才能查看 Workspace；
- Leader查看其 Workspace 和授权 Project；
- 管理员按平台管理 Capability 查看配置，不自动获得业务代码和 Requirement 内容；
- 超级管理员访问敏感数据仍需审计；
- 成本、人员效率和代码安全数据按字段分级脱敏；
- 导出需要独立 Capability 和审计。

## 17. 告警

首批告警：

- 超级管理员或高风险 Capability 变化；
- 大量成员或权限异常同步；
- 协作成员到期撤权失败；
- Model 成本或调用量超预算；
- Sandbox 清理失败或异常网络访问；
- GitLab Secret 失效；
- 审计事件消费积压；
- Jenkins 连续发布失败。

告警通过 `NotificationPort` 发送，通知失败不回滚业务事务，但需要重试和记录。

## 18. API 与事件

主要 Query API：

```text
getCurrentSession
listUsers
getOrganizationTree
listWorkspaces
listWorkspaceMembers
listCollaborationAssignments
listPersonnelChanges
listAuditEvents
getDashboardMetrics
```

关键事件：

```text
UserChanged
ReportingLineChanged
WorkspaceLeaderInvited
WorkspaceLeaderRemoved
WorkspaceOwnershipTransferred
MembershipSynchronized
CapabilityGrantChanged
CollaborationExpired
AgentRunCompleted
AuditEventRecorded
MetricThresholdExceeded
```

## 19. 异常处理

| 场景 | 处理 |
| --- | --- |
| 正式成员投影同步失败 | 显示最近成功时间，自动重试并告警 |
| Capability 缓存未刷新 | 后端以权威数据或撤权标记拒绝敏感操作 |
| 到期任务延迟 | 鉴权实时判断结束时间，仍然拒绝访问 |
| 审计消费者失败 | Outbox 保留并重试，不丢业务事件 |
| Metrics 延迟 | 看板显示数据时间，不伪装实时 |
| Model 费用缺失 | 标记待结算，不用零成本替代 |
| 导出超范围 | 后端拒绝并记录审计 |

## 20. 验收场景

1. 创建用户页面没有 Workspace 字段。
2. Workspace 创建者成为 Owner，只有 Owner 可以邀请、移除 Leader或转让所有权。
3. Workspace 没有“设置正式成员”，只有成员概览和协作成员。
4. 调整直属上级后，人员变动菜单能看到前后值和 Workspace 变化。
5. 协作成员到期即使调度任务延迟也无法访问 API。
6. 用户没有 Capability 时前端不显示菜单，直接访问 API 也被拒绝。
7. 管理员能配置 Model，但不能因此查看未加入 Workspace 的 Requirement。
8. 超级管理员全能力不能通过普通 API 撤销。
9. 每次 MR 合并可以追踪到 Requirement、审批、Runtime Bundle、Model 和 Commit。
10. 看板指标可以下钻到来源事件并显示口径版本。
11. 审计消费者重启后可以从 Outbox 恢复且不重复记录业务动作。
