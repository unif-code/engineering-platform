# GitLab、MR 与交付集成

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[GitLab、MR 与交付集成详细设计](./05-source-control-delivery-detail.md)

## 1. 模块目标

用统一的 Source Control Adapter 管理 Workspace 仓库、Requirement 分支、Commit、AI Review、MR 和合并，并为未来替换或增加 Git Provider 保留边界。

## 2. Workspace 仓库

开发 Leader连接 GitLab 后，可以从凭据可见的仓库中选择部分仓库加入 Workspace。只有 Workspace 已授权的仓库才能被 Requirement 和 Agent 使用。

平台保存仓库标识、默认分支、保护规则和技术栈信息，不保存明文 PAT。

## 3. Requirement 分支

创建 Requirement 时必须选择前端仓库，并从已记录的 `main` Commit 创建：

```text
feat/REQ-20260731-001
fix/REQ-20260731-002
```

后端仓库由开发 Leader审核时选择，并创建同名分支。一个 Requirement 对应一组 `RepositoryBranchBinding`，而不是跨仓库共享一个物理分支。

## 4. 阶段基线

同一前端任务分支持续承载当前 Requirement 类型的完整路由。对 `feat`，同一分支承载 Product SDD 和 Frontend Delivery；对 `fix`、`refactor` 和 `chore`，同一分支承载对应 Debug 或技术快速流程及后续交付。平台记录：

- `baseCommitSha`；
- `goldenRequirementCommitSha`（仅 `feat`）；
- `frontendCompletedCommitSha`；
- `acceptedCommitSha`（当前路由要求产品验收时）。

阶段审批绑定具体 Commit 和 Artifact，代码发生变化后相关检查与审批需要重新执行。

## 5. MR 与 Review

当前路由要求的测试、必要产品验收及其他 Gate 通过后，前后端按实际交付范围各自创建 MR：

```text
确定性检查
→ AI Review 建议
→ 开发 Leader审批
→ 合并 main
```

AI Review 默认不阻塞，不可用时如实记录；编译失败、测试失败、凭据泄漏等确定性门禁可以按 Policy 阻塞。Agent 不能直接 Push 或合并 `main`。

## 6. Jenkins

平台监听 MR 和 `main` 状态，但不重建发布能力：

```text
MR 合并 main
→ Jenkins 触发
→ 平台展示构建和发布状态
```

Jenkins 失败不回写 Git 历史，由 Jenkins 执行重试或回滚，平台只同步状态和关联记录。

## 7. 可替换性

Workflow 依赖统一的 Source Control Port 和 Delivery Port，不直接调用 GitLab 或 Jenkins SDK。Webhook 采用幂等 Inbox，外部写操作带 Idempotency Key。
