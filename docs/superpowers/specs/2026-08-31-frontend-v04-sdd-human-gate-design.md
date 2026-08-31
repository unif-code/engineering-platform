# Frontend V0.4 SDD 与人工 Gate 设计规格

## 目标

前端 V0.4 消费后端 `api-v0.4.0` 的正式 OpenAPI Artifact，在现有 Requirement 详情页内跑通以下闭环：

1. 查看冻结的 Route Snapshot、Requirement Version 与必需 WorkItem 集合版本。
2. 增加必需 WorkItem，并把 WorkItem 明确分配给合格的人类负责人。
3. 编辑 SDD 内容，创建不可变 Artifact Version，并立即登记为当前 SDD Baseline。
4. 将当前 Baseline 提交人工确认，查看 Gate、当前 Assignment 与历史 Decision 的当前投影。
5. 由默认审核人改派当前审核人；由当前审核人提交 `APPROVED`、`CHANGES_REQUESTED` 或 `REJECTED` Decision。
6. 每次写入后重新读取 Requirement 详情，以服务端事实决定页面状态。

本批不包含 V0.5 的 WorkItem 启动、Integration MR、Merge、Artifact 验收、Chat/Model、Agent、Sandbox、前端部署或 GitOps。

## 模块边界

V0.4 不是新增一个横向“SDD 模块”或“Gate 模块”。按照平台架构，Requirement、Route、SDD Baseline、WorkItem、Assignment、Gate 与 Decision 共同组成一个内聚的 Requirement Workflow 深模块：

```text
pages/requirements     仅路由装配
        ↓
features/requirements  拥有 V0.1-V0.4 的前端业务语义和公开入口
        ↓
services/generated     由 api-v0.4.0 生成的契约客户端
        ↓
services/transport     统一认证、Problem Details、ETag 与幂等请求头
```

私有面板、表单和提交状态放在 `src/features/requirements/` 内并由公开入口隐藏。不得让页面直接调用 generated client，不得跨 Feature 读取私有实现，也不得手写后端 DTO。

## 事实与投影

`getRequirement` 将 V0.4 详情响应投影为一个完整读取模型：

- `requirement`：补齐 Route Snapshot、Route/Requirement/WorkItem Set 版本与 hash、当前 Baseline ID、revision。
- `workItems` 与 `workItemAssignments`：当前交付项及其不可变分配记录。
- `currentSddBaseline`：当前 SDD Artifact 的精确 ID、版本和 hash。
- `currentGate`、`currentGateAssignment`、`currentDecision`：当前人工确认链。

页面不根据颜色、按钮点击或本地缓存推导业务状态。mutation 返回值只用于确认请求完成；可见状态一律来自随后 refetch 的详情投影。

## 页面结构

保留 `/requirements/:requirementId` 单一路由，详情页增加三个私有区域：

### 1. Route 与版本事实

显示 Route Snapshot 的版本、hash、Requirement Version、必需 WorkItem 集合版本/hash，并以只读 JSON 展示冻结 Route 内容。hash 使用等宽文本并允许换行，不把客户端重新计算值冒充服务端 hash。

### 2. WorkItem 计划

- 列出所有 WorkItem、Repository、负责人、Assignment 状态、Repository 状态和 revision。
- 具备当前 Workspace `work_item.create` 的用户可从现有授权仓库列表选择仓库并增加 WorkItem。
- 具备 `work_item.assign` 的用户可为某个 WorkItem 填写人类负责人 ID 与原因并提交分配。
- 当前没有“候选成员列表”契约，因此 V0.4 不跨用管理域账户接口伪造候选人选择器。服务端负责最终校验 Membership、Capability、仓库访问与资源条件。

### 3. SDD Baseline 与人工 Gate

- 编辑器加载当前 Baseline 对应 Artifact Version 的正文；没有 Baseline 时从空白 Markdown 开始。
- “保存并设为当前基线”是前端组合动作：先创建不可变 Artifact Version，再用其精确 `artifactId + version` 登记 Baseline。两步仍是两个独立服务端命令，不伪装成原子事务。
- 已有 Baseline 时，新版本复用同一 `artifactId`；首次保存由服务端创建 Artifact ID。
- 当前 Baseline 可提交确认；提交后展示 Gate、Policy Snapshot、Current Assignment 和 Decision。
- 只有具备 `requirement.baseline.assign` 的用户看到改派入口；后端仍判定其是否为默认审核人或恢复性管理员。
- 只有当前登录账号等于 `currentReviewerId` 且具备 `requirement.baseline.decide` 时显示 Decision 操作。前端可见性只改善体验，服务端授权仍是最终边界。
- `CHANGES_REQUESTED` 后编辑器继续基于当前 Artifact 创建新版本和新 Baseline；旧 Artifact、Gate 与 Decision 不在前端改写。

## 幂等、并发与未知结果

所有 V0.4 写命令使用稳定的 `Idempotency-Key` 和强 `If-Match`：

| 命令 | If-Match 所属实体 |
| --- | --- |
| 增加 WorkItem | Requirement revision |
| 分配 WorkItem | WorkItem revision |
| 创建 SDD Artifact Version | Requirement revision |
| 登记 SDD Baseline | 创建 Artifact 后返回的 Requirement revision |
| 提交 Baseline Confirmation | Requirement revision |
| 改派 Gate | Gate revision |
| 提交 Decision | Requirement revision |

提交身份由规范化 payload 决定。相同 payload 在超时、断网或结果未知后复用同一 key；只有 payload 改变或已确认成功后才生成新 key。组合 SDD 动作分别保存 Artifact 与 Baseline 两阶段的提交身份，第二阶段失败或未知时保留已创建 Artifact 的精确引用并只重放登记命令。

任何写入错误都不更新本地业务事实。页面显示 Problem Details，并提供“重新读取状态”；并发冲突要求刷新后由用户基于最新 revision 再提交，禁止静默覆盖。成功后清除对应提交身份并 refetch。

## 权限映射

所有按钮使用当前 Requirement 的 `workspaceId` 与精确 WORKSPACE scope 检查：

- `work_item.create`
- `work_item.assign`
- `requirement.baseline.submit`
- `requirement.baseline.assign`
- `requirement.baseline.decide`

账号身份优先使用 `principal.accountId`。`employeeId` 只用于会话缓存隔离的回退，不用于判断 Gate 当前审核人。

## 测试与验收

测试按 TDD 推进：

1. 生成客户端锁定与 dirty-diff 检查证明消费精确 `api-v0.4.0`。
2. service 测试证明 DTO 安全投影、每个路径、body、稳定幂等键与正确 ETag。
3. 纯函数测试证明规范化 payload 的 key 复用、payload 变化换 key，以及 SDD 两阶段重放。
4. 详情页测试覆盖 Route、WorkItem、SDD、Gate、权限、当前审核人、错误、refetch、会话切换和未知结果。
5. 受影响测试、Biome、TypeScript、依赖方向、OpenAPI release check 全部通过；完整 `pnpm verify` 由 PR CI 执行。
6. UI 发布候选最终以安装 ChatGPT 插件的外部 Chrome 在 1440×900 与 1280px 宽度验收；未完成该检查时只报告代码候选，不宣称视觉验收完成。
