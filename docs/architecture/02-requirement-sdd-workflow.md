# Requirement 与 SDD Workflow

> 文档层级：L1 精简版
> 状态：设计基线（待整体评审）
> 详细设计：[Requirement 与 SDD Workflow 详细设计](./02-requirement-sdd-workflow-detail.md)

## 1. 模块目标

把文字 Requirement 转化为可运行页面、后端实现、联调结果和可合并 MR，并保留产品、Agent、开发和审批的完整过程。

## 2. 主流程

```text
创建 Requirement
→ 按类型选择 feat / fix / refactor / chore 路由
→ 执行对应 SDD、Debug 或技术快速流程
→ 完成人工 Gate、测试与必要验收
→ MR 与合并
```

## 3. 创建 Requirement

创建时必须选择：

- Workspace 和 Project；
- Requirement 类型：`feat`、`fix`、`refactor` 或 `chore`；
- 前端仓库；
- 标题、需求表述和背景。

平台按 Requirement 类型生成任务分支并启动远程 Sandbox，例如 `feat/REQ-*` 或 `fix/REQ-*`。同一 Requirement 的后续阶段持续使用对应任务分支。

## 4. Requirement 详情

所有有数据权限的成员都可以进入详情页：

```text
左侧：平台动态菜单
中间：Requirement Chat、澄清和人工确认
右侧：阶段进度、Spec、Plan、Diff、测试、Review 和 MR
```

操作按钮继续按 Capability 控制。Chat 是人与 Agent 协作入口，右侧结构化 Artifact 才是流程事实，不能只把过程保存在对话文本中。

## 5. 类型路由

`feat` 执行完整 SDD：

```text
brainstorming
→ writing-plans
→ test-driven-development
→ verification-before-completion
→ requesting-code-review
```

`fix` 不重复完整 Product SDD，而是执行：

```text
systematic-debugging
→ test-driven-development
→ verification-before-completion
→ requesting-code-review
```

`refactor` 和 `chore` 执行技术快速流程；若发现产品行为变化，必须升级为 `feat`。

## 6. `feat` Product SDD

`feat` 的产品阶段执行完整 SDD：

```text
需求澄清
→ Product Spec
→ Product Plan
→ 基于真实前端仓库生成页面
→ 生成交互方法和 Mock API
→ Test / Review / 修改 / 验证
→ 产品确认
→ 产品 Leader确认
```

通过后记录黄金需求 Commit SHA。黄金需求包括文档、验收标准和可运行页面，而不是静态原型。

## 7. Backend SDD 与 Frontend Delivery

开发 Leader审核当前 Route Baseline 后，按实际影响选择后端仓库、创建后端任务分支并分配人员。

需要后端交付时，后端执行 Backend SDD，并先产出机器可读的 API Contract。前端始终基于当前 Route Baseline：`feat` 使用黄金需求代码，`fix` 使用 Debug 证据，`refactor` / `chore` 使用技术计划；需要联调时再绑定 API Contract。

常规前端交付只生成简短的 Frontend Delivery Plan；多仓库、多端、公共组件或架构级改动由开发 Leader确认后升级为完整 Frontend SDD。非 `feat` 路由发现产品行为变化时必须升级为 `feat`。

## 8. 测试、验收与返修

前后端联调通过后提交测试；`feat` 和其他被标记为存在产品行为变化的路由在测试通过后由产品验收，无产品行为变化的技术路由可以按既定 Gate 跳过。

验收不通过不覆盖原始历史，而是创建关联返修 Requirement，并根据返修类型重新选择流程。原 Requirement 显示返修关系与总体状态。

## 9. MR

当前路由要求的测试、必要产品验收及其他 Gate 通过后，前后端按实际交付范围分别创建 MR：

- AI Review 提供风险和修改建议；
- 确定性测试与安全 Policy 可形成质量门禁；
- 开发 Leader进行最终审批；
- 通过后合并各自仓库的 `main`；
- Jenkins 接管后续构建和发布。

## 10. 关键价值

- 产品在开发投入前确认真实页面；
- 后端接口契约成为前后端共同基线；
- 避免 Product Spec 与 Frontend Spec 重复；
- Requirement、Commit、测试、Review 和 MR 全链路可追溯；
- 返修不破坏原始验收与审计历史。
