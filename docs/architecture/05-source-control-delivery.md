# GitLab、MR 与交付集成

> 文档层级：L1 精简版
> 状态：完整架构基线（已批准）
> 更新日期：2026-08-06
> 详细设计：[GitLab、MR 与交付集成详细设计](./05-source-control-delivery-detail.md)

## 1. 模块目标

通过稳定 Source Control Port 管理 GitLab Project、WorkItem 仓库绑定、任务分支、Integration MR、Formal MR、Review 和 Merge。平台不复制 GitLab Project，也不让 Workflow 依赖 GitLab 私有响应或凭据格式。

## 2. Project 与仓库绑定

平台中的 Project 直接对应 GitLab Project。Workspace 只暴露已经授权的 GitLab Project，平台授权不复制或推导一套 GitLab 仓库岗位体系。

- 创建 Requirement 时必须且只能选择一个初始仓库；
- 第一个 WorkItem 自动继承该仓库；
- 后续 WorkItem 可以先处于 `WAITING_REPOSITORY`，由其人类负责人从 Workspace 已授权 Project 中选择一个仓库；
- 每个 WorkItem 最终只绑定一个仓库和自己的任务分支；
- 分支创建后仓库选错时，原 WorkItem 标记 `SUPERSEDED`，以新 WorkItem、新编号和新分支替代，不篡改历史绑定。

## 3. 任务分支

任务分支从对应仓库的 `main` 当前 Commit 创建，名称为：

```text
type/wi-<全局递增号>-<semantic-slug>
```

例如 `feat/wi-1024-user-profile`；`1024` 是全局编号，不是日期。同一 Requirement 的不同 WorkItem 即使落在同一仓库，也使用不同分支。

`main` 是受保护分支，人员和 Agent 都不得直接 Push，只能通过 Formal MR 合并。Agent 只能操作 Execution Binding 固定的仓库和任务分支。

## 4. `dev` 集成与 Formal MR

```text
task branch（from main）
→ Integration MR：task branch → dev
→ 开发人员自行合并并在独立 Jenkins 手工构建/测试
→ 当前 Integration Baseline 完成必要 Gate 与 Requirement Acceptance
→ 平台一键创建 Formal MR：task branch → main
→ Human Review
→ squash merge main
```

Integration MR 不要求 Leader 人工审核，但仍受 GitLab 分支保护和确定性检查约束；`dev` 使用 merge commit。平台不建立固定 `main → dev` 同步步骤。

一键创建 Formal MR 时由 Model 生成 title/description，GitLab Connector 幂等创建 MR，不先弹出编辑 Modal。Formal MR 合并后自动删除 source branch，Commit、MR、Decision 与 Audit 历史继续保留。

## 5. Formal MR Review

Formal MR 的默认审核人按 WorkItem 当前人类负责人解析：普通开发人员的默认审核人为其直属 Leader，Leader 自己负责的 WorkItem 默认由本人审核。默认审核人可以把 Current Review Assignment 改派给具备 `merge_request.review`、有效 Scope 和 Membership 的候选人，包括 MR 作者本人。

只有 Current Assignment 的 assignee 可以作出 Decision。Review 绑定准确 `headSha`；新 Commit、rebase 或冲突解决使旧 Decision 失效并重新审核。要求修改时继续使用同一 WorkItem、分支和 MR；批准后冻结 source branch。`merge_request.review` 与 `merge_request.merge` 相互独立。

## 6. Jenkins 边界

首版 Jenkins 是独立平台。开发人员手动触发、查看和处置 Jenkins 构建/测试，研发平台不调用 Jenkins、不接收 Jenkins Webhook、不读取或展示 Jenkins 状态，也不把它建模为平台 Gate 或 Delivery Port。

## 7. 一致性与审计

GitLab 外部写操作使用 Idempotency Key，Webhook 使用签名校验、幂等 Inbox 和 Reconciliation。平台记录 Project/Repository Binding、base/head SHA、分支、MR、检查、Assignment、Decision、Merge 和异常处置，但不保存明文 PAT 或把 Agent/Connector 身份伪装成人工审核人。
