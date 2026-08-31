# Frontend V0.4 SDD 与人工 Gate 实施计划

> 基线：前端 `6b8ebfc21664c8daa2c2765b65c1c9c531127da2`，后端 Artifact `api-v0.4.0` / `e26f030dfd05f34065bf3b6567d9b6d3a02c99dec3ec2e728e21cb7fde57da01`。

## Task 1：锁定并生成 V0.4 契约

**Files**

- Modify: `openapi/artifact.lock.json`
- Regenerate: `openapi/spec.json`
- Regenerate: `src/services/generated/**`

**Steps**

1. 把 lock source/version/sha256 更新到正式 GitHub Release `api-v0.4.0`。
2. 运行 `pnpm openapi:fetch`，验证下载摘要。
3. 运行 `pnpm openapi:generate`，只接受生成器产生的 diff。
4. 运行 `pnpm openapi:check:release`，确认锁定、兼容性与 dirty-diff 门禁。

## Task 2：扩展 Requirement 读取模型与服务命令

**Files**

- Modify: `src/features/requirements/type.ts`
- Modify: `src/features/requirements/service.ts`
- Modify: `src/features/requirements/service.test.ts`

**Red**

先为 V0.4 详情投影以及八个读写接口补失败测试，精确断言 path、body、Idempotency-Key 和 If-Match 所属 revision。

**Green**

从 generated schemas 派生类型；新增安全投影和命令函数：读取 Artifact、增加/分配 WorkItem、创建 Artifact、登记 Baseline、提交确认、改派、Decision。

**Refactor**

保持 generated client 只存在于 service seam，公共类型不泄露 transport 结果对象。

## Task 3：实现稳定提交身份和 SDD 两阶段恢复

**Files**

- Create: `src/features/requirements/workflowSubmission.ts`
- Create: `src/features/requirements/workflowSubmission.test.ts`

**Red**

覆盖字符串 trim、对象规范化、相同 payload key 复用、payload 变化换 key，以及 Artifact 已成功但 Baseline 未确认时只重放第二阶段。

**Green**

实现无 UI 依赖的纯函数，返回每条命令稳定 identity；组合 SDD 提交保存 Artifact 结果和 Baseline identity。

## Task 4：实现 Route 与 WorkItem 计划面板

**Files**

- Create: `src/features/requirements/RouteSnapshotPanel.tsx`
- Create: `src/features/requirements/WorkItemPlanningPanel.tsx`
- Modify: `src/features/requirements/index.style.ts`
- Create: `src/features/requirements/WorkItemPlanningPanel.test.tsx`
- Modify: `src/features/requirements/RequirementDetailPage.tsx`

**Red**

先测试服务端 Route/hash 原样展示、无权限隐藏写入口、授权仓库增加 WorkItem、WorkItem ETag 分配、成功 refetch 和错误不伪造状态。

**Green**

使用 Descriptions、Card、Modal、Form、Select、Input 等官方 antd API 拼装私有面板；详情页只传入 facts、capabilities 和 refetch 回调。

## Task 5：实现 SDD Baseline 与人工 Gate 面板

**Files**

- Create: `src/features/requirements/SddBaselinePanel.tsx`
- Create: `src/features/requirements/BaselineGatePanel.tsx`
- Create: `src/features/requirements/SddBaselinePanel.test.tsx`
- Create: `src/features/requirements/BaselineGatePanel.test.tsx`
- Modify: `src/features/requirements/RequirementDetailPage.tsx`

**Red**

先测试空白/已有 SDD 加载、两阶段提交、阶段二重放、确认、改派、三种 Decision、当前审核人判定、Capability scope、并发冲突和未知结果刷新。

**Green**

实现面板；每个成功命令 refetch，任何错误只显示 Problem Details；账号不匹配时不显示 Decision 按钮。

## Task 6：回归、审查与交付

**Files**

- Modify as required: `src/features/requirements/RequirementDetailPage.test.tsx`
- Modify as required: `src/features/requirements/index.style.ts`

**Steps**

1. 运行 requirements focused tests，确保 V0.1-V0.3 的列表、创建、Binding、轮询和会话隔离无回归。
2. 运行 Biome、TypeScript、依赖方向、OpenAPI release check。
3. 请求独立 Standards + Spec 代码审查，修正所有 Critical/Important 问题并复验。
4. 提交线性 Conventional Commits，推送独立分支并创建 PR。
5. 等待 PR CI 全绿后合并；再检查独立 main push CI。
6. 只有代码、契约、CI 与外部 Chrome 验收分别具备证据后，才报告相应阶段完成。
