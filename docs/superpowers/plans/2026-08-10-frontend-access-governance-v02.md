# V0.2 访问治理闭环 · 前端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 登录/初始化/Session/动态导航真实化 + `/admin` 六管理页，全程 mock 驱动先行，`api-v0.2.0` 发布后锁定构件切 generated client。

**Architecture:** 认证流在 `src/features/auth/`，管理面在 `src/features/administration/`（页内私有子组件平铺），`src/pages/` 只做路由装配；接口形状以后端 spec API 面为准先写 mock，最终以 OpenAPI Artifact 冻结。设计见 `docs/superpowers/specs/2026-08-10-frontend-access-governance-v02-design.md`。

**Tech Stack:** Umi Max / React 19 / TypeScript 5.9 / antd 6 + ProComponents 3.1.14-x / React Query（`@umijs/max` 导出）/ antd-style / Vitest + Testing Library

## Global Constraints

- Umi API 一律 `from '@umijs/max'`；服务端数据一律 React Query（禁 `useRequest`）；表格走 ProTable `request`。
- 依赖方向 `pages → features → services/generated`；Feature 间只用公开入口（`index.ts`）；私有文件单数命名（`hook.ts`/`type.ts`/`constant.ts`），样式 `index.style.ts`（antd-style token，禁硬编码色值）。
- 写 antd/ProComponents 代码前先 `npx antd info <组件>` 查当前 API，不凭记忆写属性。
- 每任务收尾 `pnpm lint && pnpm test` 全绿再提交；UI 任务附截图说明（PR 用）。
- mock 与真实接口同形状：路径 `/api/v1/...`、camelCase、错误为 Problem Details（`application/problem+json`）。
- 变更命令请求必须带 `Idempotency-Key`；Draft 编辑带 `If-Match`。
- 本计划 Task 1–9 全部 mock 驱动、**不依赖后端**；Task 10 依赖后端 `api-v0.2.0` 发布与 V0.1 Task 10（首次锁定链）完成。

---

### Task 1: transport 增强（401/403 归一、Idempotency-Key、If-Match、requestId）

**Files:**
- Modify: `src/services/transport/index.ts`
- Create: `src/services/transport/mutation.ts`、`src/services/transport/mutation.test.ts`

**Interfaces:**
- Produces:
  - `onUnauthorized(handler: () => void): void`（transport 收到 401 时回调，登录流 Task 5 注册跳转）
  - `mutationHeaders(opts?: { etag?: string }): Record<string, string>`（含 `Idempotency-Key: <uuid>`，传 etag 时含 `If-Match`）
  - `ApiError` 增加只读属性 `requestId: string | undefined`（自 Problem 扩展字段提取）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { mutationHeaders } from './mutation';

describe('mutationHeaders', () => {
  it('每次生成新的 Idempotency-Key', () => {
    const a = mutationHeaders()['Idempotency-Key'];
    const b = mutationHeaders()['Idempotency-Key'];
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });
  it('携带 If-Match', () => {
    expect(mutationHeaders({ etag: '"3"' })['If-Match']).toBe('"3"');
  });
});
```

另在既有 transport 测试文件补：401 响应触发 `onUnauthorized` 注册的回调；`ApiError.requestId` 从 `{"requestId":"req-1"}` Problem 中提取。

- [ ] **Step 2: RED** `pnpm test src/services/transport` → **Step 3: 实现** → **Step 4: GREEN**
- [ ] **Step 5: 提交** `feat(transport): idempotency, etag and unauthorized handling`

---

### Task 2: mock——认证与 bootstrap 全分支

**Files:**
- Create: `mock/auth.ts`（替换/扩展现有登录 mock，保留原文件结构约定）
- Test: `src/features/auth/mockContract.test.ts`（用 fetch 直调 mock handler 函数校验形状）

**Interfaces:**
- Produces mock 端点（形状 = 后端 spec API 面）：
  - `POST /api/v1/auth/login`：`{employeeNo,password}` → 200 `{challengeToken, stage:'TOTP'}`；账号 `00000009` 返回 `{stage:'BOOTSTRAP', bootstrapToken}`；密码错 401 Problem；连续 5 次后 429 Problem + `Retry-After: 30` + `detail` 含等待文案。
  - `POST /api/v1/auth/totp`：`{challengeToken, code}`；`123456` 成功 `Set-Cookie` 并返回 `{ok:true}`；错误码 401（附剩余次数 detail）；5 次后 401 `challengeExpired:true`。
  - `POST /api/v1/auth/logout` → 204。
  - Bootstrap 流：`POST /auth/bootstrap/password`（弱密码 422 Problem，`errors:[{field,reason}]`）、`POST /auth/bootstrap/totp/enroll` → `{provisioningUri:'otpauth://totp/EP:00000009?secret=JBSWY3DPEHPK3PXP&issuer=EP'}`、`POST /auth/bootstrap/totp/confirm`（`123456` 成功）。
  - 全部错误响应 `content-type: application/problem+json` 且含 `requestId`。

- [ ] **Step 1: 契约测试 RED** → **Step 2: 实现 mock** → **Step 3: GREEN** → **Step 4: 提交** `feat(mock): auth and bootstrap flows with error branches`

---

### Task 3: 登录页两步流真实化

**Files:**
- Modify: `src/features/auth/`（登录表单组件与 hook；沿现有 Login feature 结构）
- Test: 与组件同目录 `*.test.tsx`

**Interfaces:**
- Consumes: Task 2 mock；Task 1 `mutationHeaders`。
- Produces: `LoginFlow` 组件——步骤一员工号+密码（8 位数字校验），步骤二 TOTP 6 位输入（自动聚焦、粘贴支持）；429 时按钮禁用并展示服务端 `detail` 文案（**不前端计时推算**）；`stage:'BOOTSTRAP'` 时跳 `/bootstrap?token=...`。

- [ ] **Step 1: 失败测试**（Testing Library：成功两步→跳转工作台；密码错展示 Problem detail；429 禁用提交并显示文案；BOOTSTRAP 分支跳向导）
- [ ] **Step 2: RED** → **Step 3: 实现（ProForm；查 `npx antd info Form Input` 确认 API）** → **Step 4: GREEN**
- [ ] **Step 5: 提交** `feat(auth): two-step login against real contract`

---

### Task 4: `/bootstrap` 初始化向导

**Files:**
- Create: `src/pages/Bootstrap/index.tsx`（装配）、`src/features/auth/BootstrapWizard.tsx` 及私有子组件（平铺）、`config/routes.ts` 增路由（layout: false，同登录）
- Test: `BootstrapWizard.test.tsx`

**Interfaces:**
- Consumes: Task 2 bootstrap mock。
- Produces: 四步向导（Steps 组件）：①临时密码换 token（或从 URL 带入）②设正式密码（本地实时校验 15~64/大小写/特殊字符，提交后展示服务端 422 逐字段错误）③TOTP 绑定（`provisioningUri` 渲染二维码——用 antd `QRCode` 组件，另显 secret 手输 fallback）④确认完成 → 提示重新登录并跳 `/login`。中断刷新可从 token 步重来；token 失效展示"联系管理员重新签发临时密码"。

- [ ] **Step 1: 失败测试**（逐步推进；弱密码停在第②步且显示字段错误；confirm 错误码留在第③步；完成后出现"重新登录"入口）
- [ ] **Step 2: RED** → **Step 3: 实现（查 `npx antd info Steps QRCode`）** → **Step 4: GREEN** → **Step 5: 提交** `feat(auth): bootstrap initialization wizard`

---

### Task 5: Session Bootstrap 链——me/navigation 接入、401 拦截、动态菜单、RouteGuard

**Files:**
- Modify: `src/app.ts(x)`（getInitialState/layout 运行时配置）、`src/features/navigation/`（菜单渲染与 RouteGuard，沿 V0.1 结构）、`mock/`（me/navigation 返回真实投影形状：navigation 含 `routeKey/sort/meta`，me 含 `capabilities: string[]`）
- Test: `src/features/navigation/*.test.tsx`

**Interfaces:**
- Consumes: Task 1 `onUnauthorized`。
- Produces: Initial State `{principal, capabilities, navigation}`；静态 Route Registry `src/features/navigation/registry.ts`（`routeKey → {path, access}` 映射，**前端持有组件映射，后端只给 routeKey**）；菜单按 navigation 排序渲染；RouteGuard：路由的 routeKey 不在 navigation 内→403 页；401→清 Initial State 跳 `/login?redirect=...`。

- [ ] **Step 1: 失败测试**（navigation 缺 `admin.accounts` 时菜单无该项且直达路由渲染 403 页；401 响应后跳登录带 redirect；菜单顺序按 sort）
- [ ] **Step 2: RED** → **Step 3: 实现** → **Step 4: GREEN** → **Step 5: 提交** `feat(navigation): server-projected menu and route guard`

---

### Task 6: admin 骨架 + 账号管理页

**Files:**
- Create: `src/pages/Admin/Accounts/index.tsx`、`src/features/administration/accounts/`（列表+动作+私有组件）、`mock/adminAccounts.ts`；`config/routes.ts` `/admin/accounts`
- Test: `src/features/administration/accounts/*.test.tsx`

**Interfaces:**
- Consumes: Task 1/5。
- Produces: ProTable 列表（员工号/姓名/状态/专业分类，状态筛选）；创建抽屉（表单→成功 Modal 展示一次性临时密码 + "仅此一次，请立即传达"警示 + 复制按钮）；行动作：重置密码（同临时密码 Modal）、启用/停用、TOTP 重置——全部带确认框 + 原因必填；mock 覆盖 409（重复员工号）与 403。

- [ ] **Step 1: 失败测试**（创建成功弹临时密码且关闭后不可再取；重复员工号展示 409 detail；动作请求带 Idempotency-Key 与 reason）
- [ ] **Step 2: RED** → **Step 3: 实现（查 `npx antd info` 用到的 ProTable/Modal/Drawer）** → **Step 4: GREEN** → **Step 5: 提交** `feat(admin): account management page`

---

### Task 7: 组织页 + Workspace 页

**Files:**
- Create: `src/pages/Admin/Organization/index.tsx`、`src/features/administration/organization/`；`src/pages/Admin/Workspaces/index.tsx`、`src/features/administration/workspaces/`；`mock/adminOrg.ts`、`mock/adminWorkspaces.ts`；路由两条
- Test: 各 feature 目录 `*.test.tsx`

**Interfaces:**
- Produces: 组织页——Tree 展示经理→Leader→员工，节点操作"调整归属"（选择器仅列合法目标：给员工列 Leader、给 Leader 列经理；提交 reason 必填；422/409 Problem 呈现）。Workspace 页——列表+创建；详情抽屉含 Leader 名单（邀请/移除）、Owner 转让（仅可选受邀 Leader）、成员投影只读列表（含来源标注 Owner/Leader/直属）。

- [ ] **Step 1: 失败测试**（树按层级渲染；非法目标不在选择器中；Owner 转让候选仅受邀 Leader；移除 Owner 的按钮禁用并提示先转让）
- [ ] **Step 2: RED** → **Step 3: 实现** → **Step 4: GREEN** → **Step 5: 提交** `feat(admin): organization tree and workspace governance pages`

---

### Task 8: Grant 页 + 审计页

**Files:**
- Create: `src/pages/Admin/Grants/index.tsx`、`src/features/administration/grants/`；`src/pages/Admin/Audit/index.tsx`、`src/features/administration/audit/`；`mock/adminGrants.ts`、`mock/adminAudit.ts`；路由两条
- Test: 各 feature 目录 `*.test.tsx`

**Interfaces:**
- Produces: Grant 页——按 principal/capability 过滤的 ProTable；授予表单（principal 选择、capability 下拉——常量表来自 `constant.ts`、scope 选择 Platform/Workspace+目标）；撤销带原因。审计页——时间范围+actor+targetType 过滤；cursor 分页（ProTable `request` 返回 `{data, success}` 并自管 nextCursor——"加载更多"模式）；行展开显示完整摘要与 `requestId`（可复制）。

- [ ] **Step 1: 失败测试**（授予请求体形状正确；撤销带 reason；审计分页三页无重复；requestId 展示且可复制）
- [ ] **Step 2: RED** → **Step 3: 实现** → **Step 4: GREEN** → **Step 5: 提交** `feat(admin): grants and audit pages`

---

### Task 9: Policy 发布页

**Files:**
- Create: `src/pages/Admin/Policies/index.tsx`、`src/features/administration/policies/`（catalog 表、Draft 编辑器、Preview 对照、Publish TOTP 弹窗、版本历史）、`mock/adminPolicies.ts`；路由
- Test: `src/features/administration/policies/*.test.tsx`

**Interfaces:**
- Produces: 页面结构——左侧 Key catalog（当前生效值+版本）；"新建 Draft"进入编辑（逐 Key 类型化控件：数字带 min/max、枚举下拉；PATCH 带 `If-Match`，409 提示"已被并发修改，刷新后重试"）；Validate 按钮展示 issue 列表；Preview 展示前后值对照表 + 生效语义说明；Publish 弹窗（原因必填 + TOTP 6 位输入）→ 成功刷新 catalog；版本历史列表 + Rollback（确认后提示"已创建回滚 Draft"跳编辑）。mock 覆盖：validate 越界 issue、publish 409 base 落后、TOTP 错误 401。

- [ ] **Step 1: 失败测试**（编辑请求带 If-Match；409 展示冲突提示；Publish 未填 TOTP 不可提交；成功后 catalog 版本+1；Rollback 跳新 Draft）
- [ ] **Step 2: RED** → **Step 3: 实现** → **Step 4: GREEN** → **Step 5: 提交** `feat(admin): policy draft, preview and publish page`

---

### Task 10:【依赖后端 api-v0.2.0】构件锁定切换 generated client

**Files:**
- Modify: `openapi/artifact.lock.json`（version `0.2.0`、file: 通道、新 sha256——值取自后端 Release 回执）、`src/services/generated/*`（重新生成，不手改）、各 feature 的数据调用点（fetch mock 形状 → `api` typed 调用）、`mock/`（保留为本地兜底，路径不变）
- Test: 全量回归

**Interfaces:**
- Consumes: 后端 `api-v0.2.0` Release（sha256 以回执为准）；V0.1 Task 10 已完成的锁定链。

- [ ] **Step 1: 锁定与生成**：更新 lock（`file:../engineering-platform-backend/openapi.json` + 版本 + sha256）→ `pnpm openapi:fetch && pnpm openapi:generate && pnpm openapi:check` 全绿。
- [ ] **Step 2: 切换调用点**：Initial State 与六页的请求改经 `@/services/generated` 的 typed client（`api.GET('/api/v1/me')` 等），错误处理经既有 `ApiError`；逐页跑对应测试。
- [ ] **Step 3: 全量回归** `pnpm lint && pnpm test && pnpm build`。
- [ ] **Step 4: 提交** `feat(services): lock api-v0.2.0 and switch to generated client`（标注 lock 变更）。

---

## Self-Review 完成项

- spec 覆盖：认证两步(T3)、向导(T4)、Session Bootstrap 链+RouteGuard(T5)、六管理页(T6–T9)、transport 增强(T1)、mock 节奏(T2 与各页 mock)、构件切换(T10)——spec 全节有归属。
- 类型/命名一致：`mutationHeaders`/`onUnauthorized`/`registry.ts`/mock 路径跨任务一致；mock 形状与后端计划 API 面一致（employeeNo/challengeToken/provisioningUri/nextCursor）。
- 无占位符；每任务有具体测试意图与实现要点，UI 组件先查 `npx antd info`。
