# V0.2 前端真实契约与 Mock 退役 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 锁定 `api-v0.2.1`，补全账号真实密码重置，移除无后端契约的页面动作，并删除全部 V0.2 运行时 Mock。

**Architecture:** 生产数据流保持 `pages → features → src/services → src/services/generated → transport`；service 继续位于 `src/services/`，页面不直接调用 generated client。页面测试 mock feature 公开入口，service 测试 mock generated client；纯 DTO fixture 可以放在 `tests/fixtures`，但不再存在可运行 `/api/v1` Mock 路由或 Umi Mock。

**Tech Stack:** TypeScript 5.9、React 19、Umi Max 4、Ant Design 6、Pro Components 3、TanStack Query 5、Vitest 4、Testing Library、Biome、OpenAPI TypeScript

**Spec:** `docs/superpowers/specs/2026-08-17-frontend-v02-contract-exact-closure-design.md`

## Global Constraints

- 实施前置是后端 `api-v0.2.1` Release 可下载且 SHA-256 为 `8a388c120e7f6417405888caa4302c3a4d00ac9f6c3881254dd46db981571f36`。
- OpenAPI lock 使用版本化 GitHub Release URL，不再依赖同级后端工作树；generated 文件只能由脚本生成。
- 删除全部 `mock/` 运行时 API Mock；V0.3+ 页面内静态原型数据不在本计划删除，也不得注册 `/api/v1` 路由。
- `AdminUsers` 只保留创建、密码重置、TOTP 重置、启用、停用；没有编辑、删除。
- `AdminWorkspaces` 只保留创建、成员查看、Leader 管理、Owner 转让；没有归档、恢复命令。
- `00000000` 不预填、不特判、不用于前端授权；固定密码、临时密码、TOTP Secret 与 Cookie 不得进入源码或测试 fixture。
- 本机不运行全量 coverage；只跑受影响测试、TypeScript、变更文件 Biome、结构/Markdown/OpenAPI 门禁。完整 coverage、doctor、Ant Design 检查与 build 由 CI 执行。
- `.nvmrc` 为 Node `24.12.0`，pnpm 必须为 `11.18.0`。
- 未收到 `【同步进度】`，不修改 `docs/superpowers/progress/current.md`。

---

## File Map

- Modify: `openapi/artifact.lock.json` — 锁定 `api-v0.2.1` Release URL、版本与 digest。
- Modify (generated): `openapi/spec.json`、`src/services/generated/ARTIFACT.json` — 新 Artifact；schema/client 预期无语义 diff。
- Modify: `src/pages/AdminUsers/index.tsx`、`type.ts`、`constant.ts`、`index.test.tsx` — 真实密码重置与伪动作移除。
- Delete: `src/pages/AdminUsers/UserEditModal.tsx` — 无契约编辑原型。
- Modify: `src/pages/AdminWorkspaces/index.tsx`、`index.test.tsx` — 归档/恢复原型移除。
- Create: `tests/fixtures/accessGovernance.ts` — 仅测试使用的不可变 DTO 数据，不含 route handler 或状态机。
- Modify: `src/pages/AdminOrganization/index.test.tsx`、`AdminGrants/index.test.tsx`、`AdminPolicies/index.test.tsx`、`Audit/index.test.tsx` — mock feature 公开入口。
- Modify: `src/features/navigation/menu.test.ts` — 固定后端 V0.2 八个 route key 到七个可见菜单的精确投影，并排除原型菜单。
- Delete: `src/features/auth/mockContract.test.ts`、`src/features/administration/mockContract.test.ts` — 被 service tests 取代的 Mock 合同测试。
- Delete: `tests/mockRequestHarness.ts` — 仅为 Umi Mock 服务的 HTTP harness。
- Delete: `mock/` — 全部 V0.2 运行时 Mock 与其测试。
- Modify: `config/config.ts`、`config/proxy.ts` — `mock: false` 与真实代理说明。
- Modify: `tsconfig.json`、`vitest.config.ts` — 移除已删除 `mock/` source/test/coverage glob。
- Modify: `scripts/verify-structure.mjs`、`scripts/verify-structure.test.mjs` — 禁止运行时 Mock 回流。
- Modify: `AGENTS.md` — 仓库规则改为不保留运行时 API Mock。
- Modify: `src/features/administration/index.ts`、`src/features/navigation/service.ts` — 删除已经失真的 Mock-only 注释。

### Task 1: 锁定 `api-v0.2.1` Artifact

**Files:**

- Modify: `openapi/artifact.lock.json`
- Modify (generated): `openapi/spec.json`
- Modify (generated): `src/services/generated/ARTIFACT.json`
- Verify unchanged: `src/services/generated/schema.d.ts`
- Verify unchanged: `src/services/generated/client.ts`
- Verify unchanged: `src/services/generated/index.ts`

**Interfaces:**

- Consumes: 后端 Release `api-v0.2.1` 与 digest `8a388c120e7f6417405888caa4302c3a4d00ac9f6c3881254dd46db981571f36`。
- Produces: lock `version=0.2.1`，generated Artifact 标记同一版本和 digest。

- [ ] **Step 1: 先验证远端 Release 字节**

```powershell
Invoke-WebRequest https://github.com/unif-code/engineering-platform-backend/releases/download/api-v0.2.1/openapi.json -OutFile $env:TEMP/api-v0.2.1-openapi.json
(Get-FileHash $env:TEMP/api-v0.2.1-openapi.json -Algorithm SHA256).Hash.ToLowerInvariant()
node -e 'const s=JSON.parse(require("fs").readFileSync(process.env.TEMP+"/api-v0.2.1-openapi.json","utf8")); console.log(s.info.version)'
```

Expected: digest 精确为 `8a388c120e7f6417405888caa4302c3a4d00ac9f6c3881254dd46db981571f36`，version 为 `0.2.1`。不满足即停止，不修改 lock。

- [ ] **Step 2: 修改 lock 后观察旧 spec RED**

将 `openapi/artifact.lock.json` 改成：

```json
{
  "$comment": "后端仓 engineering-platform-backend 发布的 OpenAPI Artifact 锁定。source 支持 https:// 或 file:，sha256 为构件内容的十六进制摘要；三项齐备后运行 pnpm openapi:fetch && pnpm openapi:generate，提交 openapi/spec.json 与 src/services/generated。",
  "source": "https://github.com/unif-code/engineering-platform-backend/releases/download/api-v0.2.1/openapi.json",
  "version": "0.2.1",
  "sha256": "8a388c120e7f6417405888caa4302c3a4d00ac9f6c3881254dd46db981571f36"
}
```

Run:

```powershell
pnpm.cmd openapi:check:release
```

Expected: FAIL，旧 `openapi/spec.json` 的 digest/version 与新 lock 不一致。

- [ ] **Step 3: 由脚本取回并生成**

```powershell
pnpm.cmd openapi:fetch
pnpm.cmd openapi:generate
pnpm.cmd openapi:check:release
```

Expected: 三条命令 PASS；`spec.json` 为远端原始 LF 字节。

- [ ] **Step 4: 证明客户端 schema 无语义漂移**

```powershell
git diff -- src/services/generated/schema.d.ts src/services/generated/client.ts src/services/generated/index.ts
git diff -- openapi/spec.json src/services/generated/ARTIFACT.json openapi/artifact.lock.json
```

Expected: 前一条无输出；后一条只显示 release URL、version、digest、OpenAPI `info.version` 和 ARTIFACT 元数据变化。若 schema/client 有 diff，停止并回到后端契约审计。

- [ ] **Step 5: 提交 Artifact lock**

```powershell
git add openapi/artifact.lock.json openapi/spec.json src/services/generated/ARTIFACT.json
git commit -m "chore(openapi): lock api-v0.2.1 artifact" -m "真实导航补丁通过版本化 Artifact 交付；固定 release URL 与 digest，避免前端依赖本地后端工作树。"
```

### Task 2: 接通账号密码重置并删除编辑/删除原型

**Files:**

- Modify: `src/pages/AdminUsers/index.test.tsx`
- Modify: `src/pages/AdminUsers/index.tsx`
- Modify: `src/pages/AdminUsers/type.ts`
- Modify: `src/pages/AdminUsers/constant.ts`
- Delete: `src/pages/AdminUsers/UserEditModal.tsx`
- Verify: `src/services/adminAccounts/index.test.ts`

**Interfaces:**

- Consumes: `resetAccountPassword(accountId: string, input: { reason: string }, etag: string)` from `@/features/administration`。
- Produces: `CredentialState.kind: 'create' | 'reset'`；成功 reset 后一次性 `CredentialModal` 回执。

- [ ] **Step 1: 把 AdminUsers 页面测试改为 mock feature 公开入口**

删除 `createAdminAccountsMock`、`mockRequestHarness`、`fetch`、`defineMock` 和 route handler 代码。文件顶部使用：

```typescript
const administrationMocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  disableAccount: vi.fn(),
  enableAccount: vi.fn(),
  listAccounts: vi.fn(),
  resetAccountPassword: vi.fn(),
  resetAccountTotp: vi.fn(),
}));

vi.mock('@/features/administration', () => administrationMocks);
```

`beforeEach` 为 `listAccounts` 设置包含 ENABLED 与 DISABLED 行的 `AccountListResponse`，为写函数设置精确 resolved value。一次性凭据在每个测试运行时用 `crypto.randomUUID()` 生成并保存在局部变量，断言该变量被展示；不得把任何固定密码写进 fixture。

- [ ] **Step 2: 写页面行为 RED**

删除旧“编辑静态预览”和“没有重置密码入口”的测试，新增：

```typescript
it('只展示契约动作并通过公开 feature 重置密码', async () => {
  const user = userEvent.setup();
  renderPage();
  const row = await screen.findByRole('row', { name: /00002002.*何山/ });

  expect(within(row).queryByRole('button', { name: '编辑' })).toBeNull();
  expect(within(row).queryByRole('button', { name: '删除' })).toBeNull();
  await user.click(within(row).getByRole('button', { name: '重置密码' }));

  const dialog = await screen.findByRole('dialog', { name: '确认重置密码' });
  await user.type(within(dialog).getByRole('textbox', { name: '操作原因' }), '用户忘记密码');
  await user.click(within(dialog).getByRole('button', { name: '确认重置密码' }));

  await waitFor(() => {
    expect(administrationMocks.resetAccountPassword).toHaveBeenCalledWith(
      expect.any(String),
      { reason: '用户忘记密码' },
      expect.stringMatching(/^"v\d+"$/),
    );
  });
  expect(await screen.findByRole('dialog', { name: '密码重置成功' })).toBeInTheDocument();
  expect(administrationMocks.listAccounts).toHaveBeenCalledTimes(2);
});
```

再保留并改写 403/422 测试：令 `resetAccountPassword.mockRejectedValueOnce(new ApiError({status: 403, detail: '禁止重置该账号', requestId: 'req-reset-403'}))`，断言确认框仍打开且消息包含 detail/requestId。

- [ ] **Step 3: 运行测试观察 RED**

```powershell
pnpm.cmd exec vitest run src/pages/AdminUsers/index.test.tsx --reporter=verbose
```

Expected: FAIL，因为页面仍有编辑/删除，没有真实密码重置按钮。

- [ ] **Step 4: 最小实现真实密码重置**

`index.tsx`：

- 从 feature 导入 `resetAccountPassword`，删除 `useStaticPrototypeAction` 与 `UserEditModal`。
- 删除 `editAccount` state 和编辑渲染分支。
- `CredentialState.kind` 改为 `'create' | 'reset'`。
- 操作列按顺序显示“重置密码”“重置 TOTP”“启用/停用”，不显示“编辑/删除”。
- `confirmAction` 增加 password 分支：

```typescript
if (state.action === 'resetPassword') {
  const receipt = await resetAccountPassword(
    state.account.id,
    { reason },
    state.account.etag,
  );
  setActionState(undefined);
  setCredentialState({ kind: 'reset', receipt });
  message.success(USER_ACTION_META.resetPassword.successText);
  await reloadAccounts();
  return;
}
```

其余 enable/disable/resetTotp 分支保持现有语义。页脚把“禁用 / 删除即时失效”改为“禁用即时失效 Session 与访问权”。

`type.ts` 删除 `UserEditFormValues`；`constant.ts` 删除只供编辑原型使用的 `USER_ROLE_OPTIONS`，保留创建表单用常量；删除 `UserEditModal.tsx`。

- [ ] **Step 5: 运行 GREEN 与 service 契约回归**

```powershell
pnpm.cmd exec vitest run src/pages/AdminUsers/index.test.tsx src/pages/AdminUsers/UserModal.test.tsx src/pages/AdminUsers/util.test.ts src/services/adminAccounts/index.test.ts --reporter=verbose
pnpm.cmd exec biome check src/pages/AdminUsers src/services/adminAccounts/index.test.ts
pnpm.cmd tsc
```

Expected: PASS；service test 继续证明 reset-password path、`If-Match` 与 UUID `Idempotency-Key`，页面测试只断言 feature 调用和用户可见行为。

- [ ] **Step 6: 提交账号收口**

```powershell
git add src/pages/AdminUsers src/services/adminAccounts/index.test.ts
git commit -m "feat(accounts): connect real password reset action" -m "账号页仍展示无契约编辑删除且遗漏已发布密码重置；页面改用现有 service 回执并保持一次性凭据与错误门禁。"
```

### Task 3: 删除 Workspace 归档/恢复原型并隔离页面测试

**Files:**

- Modify: `src/pages/AdminWorkspaces/index.test.tsx`
- Modify: `src/pages/AdminWorkspaces/index.tsx`
- Verify: `src/services/adminWorkspaces/index.test.ts`

**Interfaces:**

- Consumes: `getOrganizationTree`、`listWorkspaces`、`listWorkspaceMembers`、`createWorkspace`、`inviteWorkspaceLeader`、`removeWorkspaceLeader`、`transferWorkspaceOwner` from feature public entry。
- Produces: 列表唯一行级动作“查看配置”；ACTIVE/ARCHIVED 都无归档命令。

- [ ] **Step 1: 把页面测试改为 feature mocks**

删除两个 `createAdmin*Mock` 与 `mockRequestHarness`。使用：

```typescript
const administrationMocks = vi.hoisted(() => ({
  createWorkspace: vi.fn(),
  getOrganizationTree: vi.fn(),
  inviteWorkspaceLeader: vi.fn(),
  listWorkspaceMembers: vi.fn(),
  listWorkspaces: vi.fn(),
  removeWorkspaceLeader: vi.fn(),
  transferWorkspaceOwner: vi.fn(),
}));

vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));
```

在 `beforeEach` 中分别返回 organization tree、workspace page 和 member projection。写操作返回更新后的 `WorkspaceSummary`，需要 refetch 的测试通过 `mockResolvedValueOnce(...).mockResolvedValue(...)` 表达前后状态，不创建通用路由或内存后端。

- [ ] **Step 2: 写无归档命令 RED**

把旧“归档入口只反馈”测试替换为：

```typescript
it('ACTIVE 与 ARCHIVED 工作区都只展示查看配置', async () => {
  renderPage();
  const active = await screen.findByRole('row', { name: /营销工作区/ });
  const archived = await screen.findByRole('row', { name: /历史工作区/ });

  expect(within(active).getByRole('button', { name: '查看配置 营销工作区' })).toBeInTheDocument();
  expect(within(active).queryByRole('button', { name: /归档/ })).toBeNull();
  expect(within(archived).queryByRole('button', { name: /恢复/ })).toBeNull();
});
```

- [ ] **Step 3: 运行 RED**

```powershell
pnpm.cmd exec vitest run src/pages/AdminWorkspaces/index.test.tsx --reporter=verbose
```

Expected: FAIL，页面仍显示归档/恢复按钮。

- [ ] **Step 4: 删除原型动作并收正文案**

从 `index.tsx` 删除 `useStaticPrototypeAction`、`showStaticAction` 和归档/恢复 Button；操作列只保留查看配置，依赖数组移除静态 action。页脚改为：

```text
每个工作区恰有一个 Owner；正式成员为动态投影（Owner + 受邀 Leader 直属有效员工）
```

- [ ] **Step 5: 运行 GREEN**

```powershell
pnpm.cmd exec vitest run src/pages/AdminWorkspaces/index.test.tsx src/pages/AdminWorkspaces/util.test.ts src/services/adminWorkspaces/index.test.ts --reporter=verbose
pnpm.cmd exec biome check src/pages/AdminWorkspaces src/services/adminWorkspaces/index.test.ts
pnpm.cmd tsc
```

Expected: PASS；创建、Owner 转让、Leader 邀请/移除、成员投影和 Problem Details 测试继续通过。

- [ ] **Step 6: 提交 Workspace 收口**

```powershell
git add src/pages/AdminWorkspaces
git commit -m "fix(workspaces): remove unsupported archive actions" -m "V0.2 只发布 Workspace 创建与成员治理；移除归档恢复原型，避免静态反馈被误认为持久化命令。"
```

### Task 4: 将 Organization 与 Audit 页面测试切到公开 Feature

**Files:**

- Create: `tests/fixtures/accessGovernance.ts`
- Modify: `src/pages/AdminOrganization/index.test.tsx`
- Modify: `src/pages/Audit/index.test.tsx`
- Verify: `src/services/adminOrganization/index.test.ts`
- Verify: `src/services/adminAudit/index.test.ts`

**Interfaces:**

- Produces: `ACCOUNT_FIXTURES`、`ORGANIZATION_TREE_FIXTURE`、`WORKSPACE_FIXTURES`、`AUDIT_EVENT_FIXTURES` 等只读 DTO 常量；不导出 fetch、handler、route map 或可变 catalog。
- Consumes: `getOrganizationTree`、`setOrganizationSuperior`、`listAuditEvents` feature exports。

- [ ] **Step 1: 创建纯 DTO fixture**

从现有 Mock 测试实际使用的账号、组织、Workspace 与 Audit 示例中提取最小数据到 `tests/fixtures/accessGovernance.ts`。文件只允许 `Object.freeze` 的 DTO 和构造单行数据的纯函数，例如：

```typescript
import type {
  AccountSummary,
  AuditEvent,
  OrganizationTreeResponse,
  WorkspaceSummary,
} from '@/features/administration';

export const ACCOUNT_FIXTURES = Object.freeze<AccountSummary[]>([
  {
    displayName: '何山',
    employeeNo: '00002002',
    etag: '"v1"',
    id: 'account-9',
    profession: '研发',
    status: 'ENABLED',
  },
]);
```

其余对象必须满足现有 service type，且不得含真实凭据。不要复制 `createGovernanceCatalog`、授权函数或请求路由。

- [ ] **Step 2: 改写 Organization 测试边界**

删除 `createAdminOrganizationMock`、fetch/request harness 和 `defineMock`。mock：

```typescript
const administrationMocks = vi.hoisted(() => ({
  getOrganizationTree: vi.fn(),
  setOrganizationSuperior: vi.fn(),
}));
vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));
```

查询返回 `ORGANIZATION_TREE_FIXTURE`；调整归属测试断言 `setOrganizationSuperior(accountId, {reason, superiorId})`，403/422 使用 `ApiError` rejection 并断言 detail/requestId。保留“新建部门仍是静态原型且不发服务请求”的测试。

- [ ] **Step 3: 改写 Audit 测试边界**

保留 `AUDIT_FIXTURE_NOW` 和图表组件 mock，删除 Umi route mock。通过带 `importOriginal` 的 partial module mock 只覆盖 `listAuditEvents`，保留真实 `formatGovernanceError`；根据传入 query 在测试内用 `mockImplementation` 记录参数并返回 `AUDIT_EVENT_FIXTURES`，不模拟 HTTP URL。时间筛选测试断言 query 的 `from/to`，URL/参数映射继续由 `src/services/adminAudit/index.test.ts` 拥有。

- [ ] **Step 4: 运行两页与 service GREEN**

```powershell
pnpm.cmd exec vitest run src/pages/AdminOrganization/index.test.tsx src/services/adminOrganization/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/Audit/index.test.tsx src/pages/Audit/util.test.ts src/services/adminAudit/index.test.ts --reporter=verbose
pnpm.cmd exec biome check tests/fixtures/accessGovernance.ts src/pages/AdminOrganization/index.test.tsx src/pages/Audit/index.test.tsx
```

Expected: PASS；测试不再 import `mock/` 或 `mockRequestHarness`。

- [ ] **Step 5: 提交只读页面测试隔离**

```powershell
git add tests/fixtures/accessGovernance.ts src/pages/AdminOrganization/index.test.tsx src/pages/Audit/index.test.tsx
git commit -m "test(governance): isolate organization and audit pages" -m "页面测试只验证公开 Feature 行为；HTTP 路由与参数继续由 src/services 契约测试负责，避免保留第二套运行时 API。"
```

### Task 5: 将 Grant 与 Policy 页面测试切到公开 Feature

**Files:**

- Modify: `tests/fixtures/accessGovernance.ts`
- Modify: `src/pages/AdminGrants/index.test.tsx`
- Modify: `src/pages/AdminPolicies/index.test.tsx`
- Verify: `src/services/adminGrants/index.test.ts`
- Verify: `src/services/adminPolicies/index.test.ts`
- Verify: `src/features/administration/grantsAudit.test.ts`
- Verify: `src/features/administration/policies.test.ts`

**Interfaces:**

- Consumes: Task 4 的只读 DTO fixture。
- Consumes: Grant 与 Policy 全部 feature exports；不消费 generated client。
- Produces: 不依赖运行时 Mock 的复杂治理页面回归。

- [ ] **Step 1: 改写 Grant 页面测试 mocks**

删除 accounts/workspaces/grants route mocks 和 fetch harness，提供：

```typescript
const administrationMocks = vi.hoisted(() => ({
  createGrant: vi.fn(),
  listAccounts: vi.fn(),
  listGrants: vi.fn(),
  listWorkspaces: vi.fn(),
  revokeGrant: vi.fn(),
}));
vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));
```

列表函数返回 fixture；create/revoke 用 `mockResolvedValue` 返回精确 `GrantSummary`，并让随后的 `listGrants` 返回更新列表。页面测试断言 feature 调用的 `principalId/capability/scope/reason/etag`；底层 path、header 与 idempotency 只由 service test 断言。

- [ ] **Step 2: 改写 Policy 页面测试 mocks**

删除 `createAdminPoliciesMock` 和 seed route helper，提供下列完整公开入口：

```typescript
const administrationMocks = vi.hoisted(() => ({
  createPolicyDraft: vi.fn(),
  listPolicyCatalog: vi.fn(),
  listPolicyVersions: vi.fn(),
  previewPolicyDraft: vi.fn(),
  publishPolicyDraft: vi.fn(),
  rollbackPolicyVersion: vi.fn(),
  updatePolicyDraft: vi.fn(),
  validatePolicyDraft: vi.fn(),
}));
vi.mock('@/features/administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/administration')>()),
  ...administrationMocks,
}));
```

每个测试在 `beforeEach` 设置 catalog/version 默认值；Draft 生命周期通过连续 `mockResolvedValueOnce` 表达 `DRAFT → VALIDATED → PUBLISHED` 返回，不创建跨测试可变 catalog。409/422 使用 `ApiError` rejection 并保留 Modal/错误可见性断言。

- [ ] **Step 3: 运行页面 RED/GREEN 回归**

先在只改测试、尚未删除 Mock 的状态运行，确保新边界测试可以独立通过：

```powershell
pnpm.cmd exec vitest run src/pages/AdminGrants/index.test.tsx src/services/adminGrants/index.test.ts src/features/administration/grantsAudit.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/AdminPolicies/index.test.tsx src/services/adminPolicies/index.test.ts src/features/administration/policies.test.ts --reporter=verbose
pnpm.cmd exec biome check tests/fixtures/accessGovernance.ts src/pages/AdminGrants/index.test.tsx src/pages/AdminPolicies/index.test.tsx
pnpm.cmd tsc
```

Expected: PASS；两页测试无 `mock/`、fetch 或 `defineMock` import。

- [ ] **Step 4: 提交复杂页面测试隔离**

```powershell
git add tests/fixtures/accessGovernance.ts src/pages/AdminGrants/index.test.tsx src/pages/AdminPolicies/index.test.tsx
git commit -m "test(governance): isolate grant and policy pages" -m "Grant 与 Policy 页面改在 Feature 边界表达状态返回；service 契约测试继续独立验证 generated client、并发与幂等请求。"
```

### Task 6: 删除运行时 Mock 并建立禁止回流的结构门禁

**Files:**

- Delete: `mock/adminAccounts.ts`
- Delete: `mock/adminAudit.ts`、`mock/adminAudit.test.ts`
- Delete: `mock/adminGrants.ts`、`mock/adminGrants.test.ts`
- Delete: `mock/adminOrg.ts`、`mock/adminOrg.test.ts`
- Delete: `mock/adminPolicies.ts`、`mock/adminPolicies.test.ts`
- Delete: `mock/adminWorkspaces.ts`、`mock/adminWorkspaces.test.ts`
- Delete: `mock/api.ts`、`mock/api.test.ts`
- Delete: `mock/auth.ts`
- Delete: `mock/governanceCatalog.ts`
- Delete: `mock/handlers.ts`、`mock/handlers.test.ts`
- Delete: `src/features/auth/mockContract.test.ts`
- Delete: `src/features/administration/mockContract.test.ts`
- Delete: `tests/mockRequestHarness.ts`
- Modify: `config/config.ts`、`config/proxy.ts`
- Modify: `tsconfig.json`、`vitest.config.ts`
- Modify: `scripts/verify-structure.mjs`、`scripts/verify-structure.test.mjs`
- Modify: `AGENTS.md`
- Modify: `src/features/administration/index.ts`
- Modify: `src/features/navigation/service.ts`
- Modify: `src/features/navigation/menu.test.ts`

**Interfaces:**

- Consumes: Tasks 2–5 已脱离 Mock 的页面测试；现有 `src/services/*/index.test.ts` generated-client 契约测试。
- Produces: `config.mock === false`；结构门禁拒绝任何手写运行时 `mock/` source；V0.2 导航投影只显示七个正式菜单。

- [ ] **Step 1: 先写结构门禁 RED**

在 `scripts/verify-structure.test.mjs` 的 valid fixture 中把 config 改为：

```javascript
"import { defineConfig } from '@umijs/max';\nexport default defineConfig({ mock: false, utoopack: {} });\n"
```

从 fixture 的 Biome include 删除 `mock/**/*.ts`。删除旧 `requires Biome to cover hand-written mock sources` 测试，新增：

```javascript
test('requires Umi runtime mock to stay disabled', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'config/config.ts',
    "import { defineConfig } from '@umijs/max';\nexport default defineConfig({ utoopack: {} });\n",
  );
  assert.match((await verifyStructure(root)).join('\n'), /mock 必须显式为 false/u);
});

test('rejects hand-written runtime API mock sources', async () => {
  const root = await createValidFixture();
  await write(root, 'mock/api.ts', "export default { 'GET /api/v1/me': () => ({}) };\n");
  assert.match((await verifyStructure(root)).join('\n'), /禁止保留运行时 mock\/ source/u);
});
```

Run: `node --test scripts/verify-structure.test.mjs`

Expected: FAIL，因为实现尚未检查 `mock:false` 和 runtime mock directory。

- [ ] **Step 2: 实现结构门禁**

`scripts/verify-structure.mjs`：

- `sourceRoots` 改为 `['config', 'src']`。
- `requiredBiomeScopes` 改为 `['config', 'scripts', 'src', 'tests']`。
- `checkConfig` 增加：

```javascript
if (!/\bmock\s*:\s*false\b/u.test(executableContents)) {
  issues.push('config/config.ts 的 mock 必须显式为 false');
}
```

- 在主验证流程调用 `collectSourceFiles(root, 'mock')`；结果非空时加入 `禁止保留运行时 mock/ source`。

Run: `node --test scripts/verify-structure.test.mjs`

Expected: PASS。

- [ ] **Step 3: 删除 Mock 与旧合同测试**

用 `apply_patch` 删除 File list 中全部 `mock/` 文件、两个 `mockContract.test.ts` 和 `tests/mockRequestHarness.ts`。删除前用 `rg -n "mockRequestHarness|createAdmin.*Mock|createAuthMock|from .*mock" src tests` 确认仅剩待删除文件中的引用。

Auth/Bootstrap 的请求路径、Cookie 与 Problem Details 继续由 `src/services/auth/index.test.ts` 和 `src/features/auth/service.test.ts` 覆盖；账号底层契约继续由 `src/services/adminAccounts/index.test.ts` 覆盖。不要把旧 handler 测试搬到别处。

- [ ] **Step 4: 更新工程配置与仓库规则**

- `config/config.ts`: `mock: false`。
- `config/proxy.ts`: 注释改为“开发代理按环境配置；浏览器业务请求经同源 platform-gateway”。
- `tsconfig.json`: include 删除 `mock/**/*.ts`。
- `vitest.config.ts`: test include 删除 `mock/**/*.{test,spec}.{ts,tsx}`；coverage include 只保留 `src/**/*.{ts,tsx}`。
- `AGENTS.md`: 将“本地接口模拟数据位于 `mock/`”改为“生产与本地运行均不保留 `/api/v1` Umi Mock；页面测试 mock feature 公开入口，service 测试 mock generated client”。
- 删除 `src/features/administration/index.ts` 顶部 Mock-only 两行注释。
- 删除 `src/features/navigation/service.ts` 顶部已经完成 Artifact 切换的三行注释。

- [ ] **Step 5: 固定 V0.2 导航精确投影**

在 `src/features/navigation/menu.test.ts` 增加独立回归用例。输入必须精确包含后端返回的八个 route key（其中 `admin` 是兼容路由、`menu:false`），不能从前端 `ROUTE_REGISTRY` 动态推导预期输入：

```typescript
it('V0.2 超级管理员的八个后端路由只投影七个正式菜单', () => {
  const navigation = [
    navigationItem('home', '首页', 1),
    navigationItem('admin', '管理后台', 2),
    navigationItem('audit', '审计看板', 7),
    navigationItem('admin.workspaces', '工作区管理', 8),
    navigationItem('admin.organization', '组织管理', 9),
    navigationItem('admin.users', '用户管理', 13),
    navigationItem('admin.grants', 'Grant 管理', 14),
    navigationItem('admin.policies', 'Policy 发布', 15),
  ];

  expect(navigation.map(({ routeKey }) => routeKey)).toEqual([
    'home',
    'admin',
    'audit',
    'admin.workspaces',
    'admin.organization',
    'admin.users',
    'admin.grants',
    'admin.policies',
  ]);

  const menuKeys = buildMenuData(navigation).flatMap(
    ({ children }) => children?.map(({ key }) => key) ?? [],
  );
  expect(menuKeys).toEqual([
    'home',
    'audit',
    'admin.workspaces',
    'admin.organization',
    'admin.users',
    'admin.grants',
    'admin.policies',
  ]);
  expect(menuKeys).not.toContain('admin');
  for (const prototypeRouteKey of [
    'tasks',
    'tasks.archived',
    'workspaces',
    'messages',
    'team-board',
    'admin.skills',
    'admin.models',
    'admin.roles',
    'admin.menus',
  ]) {
    expect(menuKeys).not.toContain(prototypeRouteKey);
  }
});
```

Run: `pnpm.cmd exec vitest run src/features/navigation/menu.test.ts --reporter=verbose`

Expected: PASS。该用例是现有前端 registry 的刻画回归；后端 Task 2 的 API 测试负责证明真实响应精确返回同一组八个 key。

- [ ] **Step 6: 运行结构与无残留 GREEN**

```powershell
pnpm.cmd test:tooling
pnpm.cmd verify:structure
pnpm.cmd verify:markdown
pnpm.cmd tsc
rg -n "mockRequestHarness|createAdmin[A-Za-z]+Mock|createAuthMock|defineMock" src tests config scripts
rg --files mock
git diff --check
```

Expected: tooling/structure/markdown/tsc 全 PASS；两条 `rg` 都无匹配（`rg --files mock` 可因目录不存在返回 2，不代表失败）；源码、测试和配置不存在运行时 Mock 引用。历史 `docs/superpowers` 中的旧计划记录允许保留。

- [ ] **Step 7: 跑所有受影响页面与 service 测试**

为避免占满电脑，逐条运行而非并行：

```powershell
pnpm.cmd exec vitest run src/pages/AdminUsers/index.test.tsx src/services/adminAccounts/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/AdminOrganization/index.test.tsx src/services/adminOrganization/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/AdminWorkspaces/index.test.tsx src/services/adminWorkspaces/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/AdminGrants/index.test.tsx src/services/adminGrants/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/AdminPolicies/index.test.tsx src/services/adminPolicies/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/pages/Audit/index.test.tsx src/services/adminAudit/index.test.ts --reporter=verbose
pnpm.cmd exec vitest run src/features/auth src/services/auth/index.test.ts src/app.test.ts src/features/navigation src/services/navigation/index.test.ts --reporter=verbose
```

Expected: 全部 PASS，无 15 秒 timeout；本机不运行 `pnpm test:coverage`。

- [ ] **Step 8: 提交 Mock 退役**

```powershell
git add AGENTS.md config/config.ts config/proxy.ts tsconfig.json vitest.config.ts scripts/verify-structure.mjs scripts/verify-structure.test.mjs src tests mock
git commit -m "refactor(frontend): retire V0.2 runtime mocks" -m "V0.2 页面已经由 generated client 连接真实后端；删除第二套运行时 API 事实，并用结构门禁固定页面与 service 的测试边界。"
```

Expected: 正常 pre-commit 与 commit-msg hooks 通过；`git status --short` 为空。

### Task 7: 完成前端门禁、合并、tag 与环境发布前置

**Files:**

- Verify only: `.github/workflows/ci.yml`
- Verify only: all Task 1–6 changes

**Interfaces:**

- Consumes: `api-v0.2.1` Release、六个前端实现提交和后端环境 migration handoff。
- Produces: 前端代码侧收口、`v0.2.2` tag CI 证据；环境交付仍需真实 gateway 冒烟。

- [ ] **Step 1: 跑本地轻量总门禁**

```powershell
node --version
pnpm.cmd --version
pnpm.cmd exec biome check openapi/artifact.lock.json config/config.ts config/proxy.ts tsconfig.json vitest.config.ts scripts/verify-structure.mjs scripts/verify-structure.test.mjs tests/fixtures/accessGovernance.ts src/pages/AdminUsers/index.tsx src/pages/AdminUsers/index.test.tsx src/pages/AdminUsers/type.ts src/pages/AdminUsers/constant.ts src/pages/AdminWorkspaces/index.tsx src/pages/AdminWorkspaces/index.test.tsx src/pages/AdminOrganization/index.test.tsx src/pages/AdminGrants/index.test.tsx src/pages/AdminPolicies/index.test.tsx src/pages/Audit/index.test.tsx src/features/administration/index.ts src/features/navigation/service.ts
pnpm.cmd tsc
pnpm.cmd depcruise
pnpm.cmd openapi:check:release
pnpm.cmd test:tooling
pnpm.cmd verify:structure
pnpm.cmd verify:markdown
node scripts/antd-command.mjs lint --diff origin/main
git diff --check
```

Expected: Node `v24.12.0`、pnpm `11.18.0`；所有命令 PASS。Ant Design CLI 只检查相对 `origin/main` 变化的文件；本地不执行 coverage、doctor、antd 全量或 build，防止高资源套件影响电脑；这些步骤必须由 CI 的原样 `pnpm verify` 证明。

- [ ] **Step 2: 推送分支并等待 CI 完整 verify**

```powershell
git push -u origin fix/frontend-v02-contract-closure
```

Expected: CI `verify` 完成 locked install、lint、tooling、structure、Markdown、70-file coverage、React Doctor、Ant Design doctor/lint/usage 与 build，全部成功后才合并。

- [ ] **Step 3: 合并 main 并确认镜像发布**

确认 PR 目标 SHA 等于本地分支 HEAD；使用仓库允许的线性合并方式进入 main。等待 main `verify` 与 `publish-image` 全绿，记录 main SHA 和 `ghcr.io/unif-code/engineering-platform@sha256:...`。

- [ ] **Step 4: 创建前端补丁 tag**

远端 main 与本地 main 一致后：

```powershell
git tag -a v0.2.2 -m "v0.2.2"
git push origin v0.2.2
```

Expected: tag 的 `verify` 与 `release-gate` 均成功，`pnpm openapi:check:release` 证明锁定 `api-v0.2.1`。

- [ ] **Step 5: 形成环境 handoff，不直接修改 GitOps**

向环境发布方提供：后端 main SHA/镜像 digest、`api-v0.2.1` tag/Artifact digest、Authorization `0005_authorization_v02_routes` migration、前端 main SHA/镜像 digest、`v0.2.2` tag。前端镜像切换前必须通过同源 `platform-gateway` 验证：

```text
登录/Bootstrap
GET /api/v1/me → 精确九项 V0.2 Platform Capability
GET /api/v1/navigation → 八个 routeKey、七个可见菜单、无原型 routeKey
账号/组织/Workspace/Grant/Policy/Audit 真实 API 冒烟
未授权请求 401/403 与 requestId/Audit
```

Expected: 只有上述真实环境证据齐备才标记环境交付；本计划不修改 GitOps Desired State，也不把代码合并或 tag 等同于部署完成。
