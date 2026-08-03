# 平台本地身份、组织、Workspace 与 SDD 路由修订设计

> 状态：已确认
> 日期：2026-08-02
> 影响范围：身份认证、组织关系、Workspace 治理、Requirement Workflow、Agent Skill 运行记录和平台技术架构

## 1. 背景

原架构基线假设平台接入企业 SSO 和 HR，以共同经理、主要开发 Leader 及任意深度组织树推导 Workspace 成员，并在平台内维护通用 Skill Registry。当前建设范围已经变化：

- 第一阶段不接 SSO 或 HR，平台自行管理账号和组织关系；
- 组织层级固定为“经理 → Leader → 普通员工”；
- Workspace 由创建者治理，可邀请多个 Leader，但受邀 Leader不能继续管理其他 Leader；
- Requirement 按类型选择完整 SDD、Debug 或技术快速流程；
- 第一阶段只使用随 Agent Runtime 发布的 Superpowers Skills，不建设独立 Skill 管理中心。

本设计是上述修订的统一依据。所有 L1/L2 架构文档必须与本设计保持一致。

## 2. 方案选择

### 2.1 身份与组织

采用“本地账号 + 类型化组织关系”。账号认证与组织岗位分离，但在第一阶段保持一名用户对应一个有效组织身份。

不采用以下方案：

- 不把账号、组织岗位和业务权限全部塞入用户表；
- 不建设通用 HR 组织单元、职位和多汇报线引擎；
- 不预留未使用的 SSO/HR Adapter 作为第一阶段组件。

### 2.2 Control Plane

采用 Python 模块化单体。Control Plane 是一个可部署的 Python 后端应用，内部由边界清晰的领域模块组成；Agent Orchestrator、Model Gateway 和 Sandbox Controller 保持独立部署。

该方案避免第一阶段微服务复杂度，同时保留后续按负载或安全边界拆分的能力。

### 2.3 Skill 接入

采用 Runtime Bundle 方式接入 Superpowers。平台 Workflow 负责业务状态和 Gate，Superpowers Skills 负责具体方法，不在平台内重复实现 brainstorming、Debug、TDD 或验证步骤。

第一阶段不接入 `grill-me`，也不建设 Skill 发布、审核、热更新和独立版本管理页面。

## 3. 身份认证

### 3.1 账号

- 只允许平台管理员创建账号，不提供自助注册；
- 登录标识为唯一员工编号；
- 第一阶段不接入 SSO；
- 账号状态至少包含 `PENDING_ACTIVATION`、`ACTIVE`、`SUSPENDED` 和 `INACTIVE`。

### 3.2 首次激活与密码

- 创建或重置账号时生成单账号、单次有效的临时凭据；
- 临时凭据 24 小时后过期，不使用共享默认密码；
- 首次登录只允许进入修改密码流程；
- 正式密码长度为 15–32 个字符；
- 不强制大小写、数字或特殊字符的组合规则；
- 拦截常见弱密码、已泄露密码以及包含员工编号等上下文信息的密码；
- 允许粘贴和密码管理器，不做无风险依据的周期性强制修改。

密码重置由管理员在线下完成身份核验后发起。重置和账号停用必须撤销全部现有 Session，并写入审计。

### 3.3 MFA

超级管理员和持有高风险管理 Capability 的用户必须启用 TOTP MFA。普通用户第一阶段不强制启用。

## 4. 组织模型

平台内部维护两棵独立组织树：

```text
产品经理 → 产品 Leader → 产品人员
开发经理 → 开发 Leader → 前端 / 后端人员
```

组织节点分为三种层级、两条上下级边：

- `MANAGER` 没有上级；
- `LEADER` 必须选择一个同体系 `MANAGER`；
- `MEMBER` 必须选择一个同体系 `LEADER`；
- 产品人员只能属于产品体系；
- 前端和后端人员只能属于开发体系；
- 一名用户第一阶段只能有一个有效组织身份和一个直接上级；
- 普通员工的经理通过 Leader 推导，不重复保存；
- 组织关系禁止形成环。

经理、Leader 和普通员工是组织岗位，不直接等同于 RBAC Role。业务权限继续由 Capability、Scope 和上下文条件决定。

## 5. Workspace 治理与成员

### 5.1 Workspace 身份

Workspace 只设置两种 Leader 身份：

- `Workspace Owner`：创建 Workspace 的 Leader；
- `Workspace Leader`：由 Owner 邀请加入的其他 Leader。

规则如下：

- Owner 可以邀请、移除其他 Leader，并转让所有权；
- 受邀 Leader不能邀请或移除其他 Leader；
- Owner 与受邀 Leader在各自组织体系内的 Requirement 业务能力按相同 Capability 规则计算；
- `createdBy` 只保留审计意义，当前 Owner 使用独立字段表示；
- Workspace 必须始终有且仅有一个 Owner；
- Owner 离开、停用或退出前必须转让所有权；
- Owner 无法操作时，由超级管理员执行受审计的强制转让。

不再设置主要开发 Leader、主责产品 Leader、共同经理或“所有 Leader 必须属于同一经理”的约束。

### 5.2 正式成员

Workspace 正式成员集合为：

```text
Owner
UNION 受邀 Leaders
UNION 每个 Workspace Leader 当前直属普通员工
```

经理不会因为管理某个 Leader 自动成为 Workspace 正式成员。未被邀请的其他 Leader 及其员工也不会进入 Workspace。

正式成员由组织关系动态派生，不提供人工新增、删除或排除操作。Leader 加入、移除或员工变更上级时，平台提升成员版本、使授权缓存失效并重建投影。鉴权发现投影过期时不得继续使用旧结果，必须重新计算或拒绝请求。

移除 Leader 前，必须先转交其团队负责的进行中任务。历史 Requirement、Artifact 和审计记录不随成员移除而删除。

## 6. Capability 边界

- 所有 Workspace 正式成员默认拥有 `requirement:create`；
- 创建 Requirement 不自动获得确认、验收、代码审批或合并能力；
- Workspace Owner 的额外能力仅限 Leader 名单治理和所有权转让；
- 产品与开发体系的业务动作继续通过 Capability 和 Scope 区分；
- 前端菜单只改善访问体验，Python Control Plane API 始终执行最终鉴权；
- 超级管理员能力受保护，但平台治理权限不自动授予 Workspace 业务数据访问。

## 7. Requirement 类型路由

### 7.1 `feat`

`feat` 执行完整 SDD：

```text
brainstorming
→ writing-plans
→ test-driven-development
→ verification-before-completion
→ requesting-code-review
```

平台保留产品确认、技术审核、测试、验收和 MR Gate。

### 7.2 `fix`

`fix` 不重复完整 Product SDD，执行 Superpowers Debug 路由：

```text
systematic-debugging
→ test-driven-development
→ verification-before-completion
→ requesting-code-review
```

修复必须保留复现证据、根因、回归测试和验证结果。任务分支使用 `fix/REQ-*`。

### 7.3 `refactor` 与 `chore`

`refactor` 和 `chore` 进入技术快速流程，根据影响范围执行必要的测试、验证和代码评审。若过程中发现产品行为变化，应升级为 `feat`，不得在技术快速流程中静默扩大范围。

### 7.4 编排边界

Workflow Engine 只负责：

- Requirement 类型路由；
- 状态、Gate 和人工审批；
- Agent Run 调度、重试和取消；
- Artifact 引用和审计；
- GitLab、Sandbox 与 Jenkins 状态协调。

Workflow Engine 不复制 Superpowers Skill 内部步骤。

## 8. Superpowers Runtime Bundle

Superpowers 随 Agent Runtime 镜像发布。每个 `AgentRunAttempt` 必须记录：

- Runtime 镜像 digest；
- Skill Bundle hash；
- 实际加载的 Skill 名称；
- Model、Tool Policy、Context Policy 和 Runtime Permission；
- 输入、输出、Artifact、日志、状态和失败原因。

同一 Attempt 内禁止热更新 Skill、Model 或 Runtime Policy。发生变更时必须创建新 Attempt，历史记录不可覆盖。

第一阶段不提供：

- 独立 Skill Registry 管理中心；
- Skill 草稿、审核、发布或停用 UI；
- Workspace Skill 版本选择；
- `grill-me` Adapter 或配置。

未来接入其他 Skill Bundle 时复用同一 Runtime Adapter 和 Attempt 追踪契约。

## 9. 技术组件

Python Control Plane 是一个部署单元，内部包含：

```text
control-plane
├── identity
├── organization
├── workspace
├── authorization
├── requirement-workflow
├── agent-run
└── audit
```

模块拥有自己的领域模型、Application Service 和数据表，通过明确接口或领域事件协作。第一阶段可共用 PostgreSQL 实例，但禁止跨模块随意写入对方数据。

独立部署组件包括：

- Agent Orchestrator；
- Model Gateway；
- Sandbox Controller 和 Worker。

第一阶段 Integration Adapter 包含 GitLab、Jenkins、Model Provider 和通知，不包含 SSO 或 HR。

## 10. 数据与执行流

```text
本地账号认证
→ 读取实时组织关系和 Workspace 成员身份
→ 校验 Capability + Scope
→ 事务写入业务状态和 Outbox
→ Agent Orchestrator 创建不可变 AgentRunAttempt
→ Sandbox 加载固定 Runtime Bundle
→ 执行 Superpowers Skill
→ 结果事件回写 Control Plane
→ Web 展示状态和 Artifact
```

PostgreSQL 保存业务事实，Redis 只保存短期缓存、锁和限流数据，对象存储保存 Artifact，Secret Manager 保存外部凭据。业务状态与 Outbox 必须在同一事务提交。

## 11. 失败处理与一致性

- 员工编号重复、组织层级或体系不匹配、组织关系成环时拒绝写入；
- 临时凭据过期或使用后只能重新签发；
- Owner 未完成转让时禁止退出或停用；
- Requirement、分支和 Run 创建命令必须支持幂等；
- 外部调用失败时保留明确阻塞状态和原因；
- Agent 重试创建新 Attempt，不覆盖旧 Attempt、日志和 Artifact；
- Model、Skill 或 Runtime 变化不能静默续跑；
- Reconciler 定期核对 PostgreSQL 与 GitLab、Sandbox、Jenkins 的状态差异。

## 12. 测试与验收

- 单元测试覆盖密码策略、组织层级、Owner/Leader 权限、Capability 和 Requirement 路由；
- 模块集成测试覆盖 PostgreSQL 事务、Outbox、成员派生和权限即时失效；
- Adapter Contract 测试覆盖 GitLab、Jenkins 和 Model Provider；
- 端到端测试覆盖账号激活、Workspace 创建、Leader 邀请、各类型 Requirement 和 Agent 重试；
- 安全测试覆盖越权、Session 撤销、MFA、临时凭据重放和 Sandbox 隔离。

## 13. 文档修订要求

现有架构文档必须删除或修订以下旧假设：

- 第一阶段 SSO/HR 接入；
- HR 组织树为只读事实源；
- 所有 Workspace Leader 必须具有共同经理；
- 主要开发 Leader或主责 Leader；
- 经理自动成为 Workspace 正式成员；
- 任意深度 Leader 下属树；
- 受邀 Leader可以继续邀请或移除其他 Leader；
- 所有 Requirement 类型都重新执行完整 Product SDD；
- 平台自建通用 Skill Registry 和 Skill Version 管理中心；
- 全部相关流程和文档术语统一使用 `SDD`。
