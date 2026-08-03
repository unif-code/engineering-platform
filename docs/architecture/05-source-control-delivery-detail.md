# GitLab、MR 与交付集成详细设计

> 文档层级：L2 详细版
> 状态：设计基线（待整体评审）
> 更新日期：2026-08-02
> 对应精简版：[GitLab、MR 与交付集成](./05-source-control-delivery.md)

## 1. 目标与非目标

目标：

- 让 Workspace 只使用开发 Leader明确授权的 GitLab 仓库；
- 可靠创建 Requirement 分支并贯穿类型路由、交付、测试和 MR；
- 确保 `main` 不被直接 Push；
- 将 AI Review、确定性检查和开发 Leader审批分开建模；
- 通过 Adapter 隔离 GitLab、Jenkins 和未来其他 Provider。

非目标：

- 不复制 GitLab 的完整仓库、分支或 MR 页面；
- 不在平台数据库保存 GitLab 明文 PAT；
- 不由 Agent 绕过 GitLab 保护规则；
- 不重建 Jenkins Pipeline。

## 2. 集成边界

```text
Requirement Workflow
        │
        ▼
SourceControlPort
        │
        └── GitLab Adapter

DeliveryPort
        │
        └── Jenkins Adapter
```

Workflow 使用平台统一状态和错误码，不依赖 GitLab MR 状态字符串、Webhook 格式或 Jenkins Job 参数。

## 3. Workspace GitLab 连接

开发 Leader拥有 `workspace:repository:manage` 后可以：

1. 创建 GitLab Connection；
2. 使用 PAT、Project Access Token 或 OAuth 获取可见仓库；
3. 从可见仓库中选择允许进入 Workspace 的仓库；
4. 配置默认分支、仓库类型和技术栈覆盖；
5. 验证 Webhook 和保护分支。

例如凭据可见 20 个仓库，选择 10 个加入 Workspace 后，成员和 Agent 只能选择这 10 个。

凭据由 Secret Manager 保存，数据库只记录 Secret 引用、权限范围、过期时间和最近校验状态。

## 4. 核心实体

| 实体 | 职责 |
| --- | --- |
| `SourceControlConnection` | Workspace 与 Git Provider 的连接 |
| `WorkspaceRepository` | Workspace 允许使用的仓库 |
| `RepositoryProfile` | 默认分支、技术栈、构建和保护信息 |
| `RequirementRepositoryBinding` | Requirement 与前端、后端等仓库的绑定 |
| `TaskBranch` | 某仓库中的 Requirement 分支 |
| `CommitCheckpoint` | Product、开发、联调和验收阶段 Commit |
| `MergeRequestLink` | 平台实体与 Provider MR 的映射 |
| `ReviewRun` | AI 或确定性检查结果 |
| `MergePlan` | 多仓库 MR 的合并顺序和兼容策略 |
| `DeliveryRun` | Jenkins 构建和发布状态投影 |

## 5. Repository 授权

访问仓库至少满足：

```text
用户有效
AND Workspace Membership 有效
AND Repository 已绑定 Workspace
AND 用户具备目标 Capability
AND Agent Runtime Policy 允许当前 Repository/Branch
```

Workspace Repository 被移除后：

- 禁止新 Requirement 选择；
- 停止签发新的 Agent 凭据；
- 进行中的 Requirement 标记风险并由开发 Leader处理；
- 历史 Commit、MR 和审计引用继续保留。

## 6. 创建 Requirement 与分支 Saga

### 6.1 输入

- Workspace、Project；
- Requirement Key 和类型；
- Frontend Repository；
- Repository 当前默认分支；
- Idempotency Key。

### 6.2 流程

```text
创建 Requirement(INITIALIZING)
→ 校验 Repository Binding
→ 查询 main 当前 Commit
→ 保存 baseCommitSha
→ 创建任务分支
→ 再次查询并验证分支指向 baseCommitSha
→ 创建 TaskBranch Binding
→ Requirement 进入 READY
```

分支没有在 GitLab 真实创建成功时，Requirement 不得进入 `READY` 或启动其 Workflow Route。

### 6.3 分支命名

```text
feat/REQ-20260731-001
fix/REQ-20260731-002
refactor/REQ-20260731-003
chore/REQ-20260731-004
```

平台生成名称并做合法字符归一化。重试时若同名分支已经存在，只能在确认属于同一 Requirement 且 Commit 一致时复用。

### 6.4 补偿

| 失败点 | 处理 |
| --- | --- |
| Requirement 数据写入失败 | 不调用 GitLab |
| GitLab 创建失败 | 保持 `INITIALIZING_FAILED`，允许幂等重试 |
| 分支已创建但绑定写入失败 | Reconciler 查找孤儿分支并补写或告警 |
| `main` 在流程中移动 | 仍使用已记录 `baseCommitSha`，刷新基线必须显式操作 |

## 7. 多仓库分支

一个 Requirement 拥有多条仓库绑定：

```text
Requirement REQ-001
├── frontend-web → feat/REQ-001
└── backend-service → feat/REQ-001
```

分支名称可以一致，但物理上属于不同仓库。后端仓库在开发 Leader审核时绑定并执行同样的分支创建流程。

每条 `TaskBranch` 单独记录：

```text
repositoryId
branchName
baseBranch
baseCommitSha
currentHeadSha
createdBy
createdAt
status
```

## 8. Commit 与阶段基线

前端同一任务分支贯穿当前 Requirement 类型的全部执行阶段。对 `feat`，它贯穿 Product SDD 与 Frontend Delivery；对其他类型，它贯穿 Debug 或技术快速流程与后续交付。平台不靠分支名区分阶段，而是记录 `CommitCheckpoint`：

| Checkpoint | 含义 |
| --- | --- |
| `BASE` | Requirement 创建时的 `main` |
| `GOLDEN_REQUIREMENT` | `feat` 中产品和产品 Leader确认的页面版本 |
| `DELIVERY_COMPLETE` | 前端或后端开发完成 |
| `INTEGRATION_VERIFIED` | 联调通过 |
| `TEST_PASSED` | 测试通过 |
| `PRODUCT_ACCEPTED` | 当前路由要求产品验收时的最终验收版本 |

Checkpoint 包含 Commit SHA、Artifact Hash、创建者、Agent Run 和审批引用。Commit 或 Artifact 变化后，依赖旧版本的测试、Review 和审批失效。

## 9. Git 身份与 Push

- 用户和 Agent 都只能 Push Task Branch；
- `main`、Release 和其他受保护分支拒绝直接 Push；
- Agent 使用短期、分支级 Service Credential；
- Commit 记录实际 Agent、代表用户和 Correlation ID；
- 是否采用 squash、merge commit 或 rebase 由 Workspace Repository Policy 决定；
- Force Push 默认禁止，确需 rebase 时由受控操作完成并触发审批失效。

## 10. MR 创建

当前路由要求的测试、必要产品验收及其他 Gate 通过后，MR 才能创建或转为 Ready。每个 MR 必须关联当前实际存在的：

- Requirement 与 WorkItem；
- Route Baseline、适用的 Product/Backend Spec 和 Plan；
- API Contract 版本；
- Commit Checkpoint；
- Test、Integration 和必要的 Product Acceptance Artifact；
- AI Review；
- 目标分支与 Merge Plan。

创建 MR 需要 `mr:create`，审批需要 `mr:approve`，最终合并需要 `mr:merge`。Capability 可以组合到不同岗位或个人。

## 11. AI Review 与质量门禁

### 11.1 AI Review

AI Review 输入固定 `headSha`、Diff、仓库规范、测试结果和 Requirement Context，输出：

- 严重级别；
- 文件和行位置；
- 问题说明；
- 修复建议；
- 置信度。

默认是建议型检查：

- AI 服务失败或没有意见时如实标记；
- 不因风格、命名或低置信度问题阻塞；
- 开发 Leader可以接受、忽略或要求修改。

### 11.2 确定性门禁

可以阻塞：

- 构建失败；
- 必须测试失败；
- API Contract 校验失败；
- 凭据泄漏；
- Workspace 明确配置的高风险安全规则；
- 分支保护规则不满足。

AI 严重级别本身不直接等于阻塞，是否升级为 Policy 需要独立配置和审计。

## 12. 开发 Leader审批

审批绑定准确的 `headSha` 和验证 Artifact。发生以下变化后旧审批失效：

- 新 Commit；
- rebase 或 merge `main`；
- 冲突解决；
- API Contract 版本变化；
- 必须测试结果变化。

Agent 不能审批自己生成的 MR，也不能代替开发 Leader执行最终合并。

## 13. 多仓库 Merge Plan

GitLab 无法为前后端多个仓库提供原子事务。平台必须显式保存：

- MR 集合；
- 合并顺序；
- API 向后兼容要求；
- Feature Flag 或兼容窗口；
- 部分合并失败策略。

推荐默认：

1. 后端先保证 API 向后兼容；
2. 合并并发布后端或准备兼容能力；
3. 再合并前端；
4. 最后移除旧接口。

如果现有 Jenkins 只允许全部代码合并后发布，则 Merge Plan 需要使用 Feature Flag 保证部分合并期间不可见。

发生部分合并时停止后续操作，由开发 Leader选择继续兼容、回滚发布或创建紧急返修 Requirement，不能假装跨仓库原子成功。

## 14. `main` 漂移与冲突

创建 MR 前检查 Task Branch 相对 `main` 的落后和冲突情况。需要同步时：

```text
在新 Sandbox 中同步 main
→ 解决冲突
→ Push 新 headSha
→ 重跑构建、测试和 AI Review
→ 重新产品/Leader确认受影响内容
```

任何自动同步都不能重写已确认的审计记录。

## 15. Jenkins 集成

Jenkins 只在代码合并 `main` 后工作：

```text
MRMerged
→ Jenkins Adapter 关联或触发 Job
→ 同步 Build
→ 同步 Deploy
→ 展示状态与跳转地址
```

平台保存外部 Job、Build Number、Environment、Commit SHA、状态和 URL，不复制 Jenkins 日志全文。

Jenkins 发布失败：

- 不修改或回退 Git 历史；
- 展示失败状态；
- 由 Jenkins 重试或回滚到上一稳定版本；
- 必要时创建关联返修 Requirement。

## 16. Webhook 与一致性

GitLab/Jenkins Webhook 先写入 Inbox：

- 验证签名；
- 使用 Provider Event ID 去重；
- 保存原始摘要；
- 异步处理；
- 可重放。

Reconciler 定期对账分支、Commit、MR、审批和 Jenkins 状态，修复 Webhook 丢失、重复或乱序。

## 17. Port

`SourceControlPort`：

```text
listRepositories
getRepository
getBranch
createBranch
getCommit
pushCommit
compare
createMergeRequest
getMergeRequest
approveMergeRequest
mergeMergeRequest
```

`DeliveryPort`：

```text
trigger
getBuild
getDeployment
retry
getExternalUrl
```

所有外部写操作接受 Idempotency Key。

## 18. 领域事件

```text
WorkspaceRepositoryAdded
WorkspaceRepositoryRemoved
TaskBranchCreated
CommitCheckpointRecorded
MergeRequestCreated
AIReviewCompleted
MergeRequestApprovalInvalidated
MergeRequestApproved
MergeRequestMerged
DeliveryStarted
DeliveryCompleted
DeliveryFailed
```

## 19. 审计

记录：

- Connection、Repository 和凭据引用变化；
- 分支创建、Commit 和 Push 身份；
- Checkpoint 和 Artifact；
- AI Review 输入 Commit 与结果；
- Leader审批、忽略建议和合并；
- GitLab/Jenkins Webhook；
- 部分合并和异常处置。

Secret 值、完整 PAT 和敏感源码不得进入普通审计字段。

## 20. 验收场景

1. PAT 可见 20 个仓库但 Workspace 只允许使用选中的 10 个。
2. 分支创建失败时 Requirement 不进入 `READY`。
3. 所有类型持续使用创建 Requirement 时的前端任务分支；`feat` 的 Product SDD 和 Frontend Delivery 保留同一黄金 Commit 基线。
4. Agent 无法 Push 或合并 `main`。
5. 后端仓库加入后创建独立同名任务分支。
6. AI Review 不可用时仍可进入开发 Leader人工审批。
7. 必须测试失败时不能合并。
8. 新 Commit 使旧 AI Review 和 Leader审批失效。
9. Webhook 重复不会重复合并或重复创建记录。
10. Jenkins 失败只影响发布状态，不改写 Requirement 和 Git 历史。
