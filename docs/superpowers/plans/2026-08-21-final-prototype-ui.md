# Final Prototype UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current frontend screens with the 19-screen final prototype while preserving completed V0.1/V0.2 services and removing all production demo/static business data.

**Architecture:** Routes and visible structure follow the final prototype; data continues to flow through `pages → features → services/generated`. Pages with completed APIs keep those seams, while pages without APIs render honest empty/disabled states. Migration is replacement-based: after each screen is rebuilt, its old fixtures, demo actions, duplicate components, and duplicate routes are deleted.

**Tech Stack:** Umi Max 4, React 19, TypeScript 5.9, Ant Design 6, ProComponents 3, TanStack Query 5, antd-style, Vitest, Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-08-21-final-prototype-ui-design.md`

## Global Constraints

- The prototype source SHA-256 is `92C50FC62578F96E6136A0673BB594C427FB57B696D2052361AF5CD77AC9FF11`.
- One capability has one final screen; do not add prototype sections beside legacy sections.
- Preserve completed real API seams; do not edit `src/services/generated` and do not invent endpoints.
- Production source must not contain runtime mock data, business fixtures, demo role switching, demo reset actions, or fake success feedback.
- Prefer ProComponents, then Ant Design, then token-based `antd-style`; do not target internal `.ant-*` selectors.
- Local feedback uses focused tests and changed-file checks. Full coverage/doctor/build runs in final CI, not after every edit.
- Browser acceptance uses external Chrome only; never substitute the in-app browser.

---

### Task 1: Lock the one-screen and no-demo structural contract

**Files:**
- Modify: `scripts/verify-structure.mjs`
- Modify: `scripts/verify-structure.test.mjs`
- Modify: `src/features/navigation/registry.tsx`
- Modify: `src/features/navigation/registry.test.tsx`
- Modify: `config/routes.ts`
- Create: `src/pages/AccessDenied/index.tsx`
- Create: `src/pages/AccessDenied/index.test.tsx`
- Delete after redirect migration: `src/pages/Tasks/Archived.tsx`

**Interfaces:**
- Consumes: `ROUTE_REGISTRY`, Umi route configuration, Ant Design `Result`.
- Produces: exactly 19 prototype screens, `/tasks/archived` compatibility redirect, and `assertNoRuntimePrototypeArtifacts(rootDir)`.

- [ ] **Step 1: Write failing structure tests**

Add fixtures that fail when production `.ts/.tsx` contains `WorkspaceFixture`, `TASK_FIXTURE`, `useStaticPrototypeAction`, `prototype: true`, `静态原型操作`, or a `mock/` directory. Test files and `tests/fixtures` remain allowed.

```js
assert.throws(
  () => assertNoRuntimePrototypeArtifacts(fixtureRoot),
  /production prototype artifact/i,
);
```

Add registry assertions for the 19 screen route keys and for unique concrete paths. Assert that `tasks.archived` is a redirect and not a menu page.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test scripts/verify-structure.test.mjs`

Run: `node_modules/.bin/vitest.cmd run src/features/navigation/registry.test.tsx src/pages/AccessDenied/index.test.tsx`

Expected: FAIL because production fixtures/demo hooks still exist, the registry still marks prototype pages, and AccessDenied does not exist.

- [ ] **Step 3: Implement the minimum structural gate and routes**

Implement a source scan limited to non-test files under `src/pages`, `src/features`, `src/components`, and `src/hooks`. Remove the `prototype` field from `RouteRegistration`. Register `access-denied` at `/403`, change `tasks.archived` to `kind: 'redirect'`, and make `config/routes.ts` redirect the compatibility URL.

```tsx
export default function AccessDeniedPage() {
  return (
    <Result
      status="403"
      title="无权访问"
      subTitle="当前账号没有访问此页面的能力，请联系管理员。"
      extra={<Button href="/home" type="primary">返回工作台</Button>}
    />
  );
}
```

- [ ] **Step 4: Run focused GREEN checks**

Run: `node --test scripts/verify-structure.test.mjs`

Run: `node_modules/.bin/vitest.cmd run src/features/navigation/registry.test.tsx src/pages/AccessDenied/index.test.tsx`

Run: `pnpm tsc`

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-structure.mjs scripts/verify-structure.test.mjs config/routes.ts src/features/navigation/registry.tsx src/features/navigation/registry.test.tsx src/pages/AccessDenied src/pages/Tasks/Archived.tsx
git commit -m "refactor(ui): lock final prototype routes"
```

### Task 2: Replace the shell and authentication screen

**Files:**
- Modify: `src/app.ts`
- Modify: `src/app.test.ts`
- Modify: `config/defaultSettings.ts`
- Modify: `src/features/theme/config.ts`
- Modify: `src/features/theme/ThemeProvider.test.tsx`
- Modify: `src/features/shell/index.ts`
- Modify: `src/features/shell/index.test.tsx`
- Modify: `src/features/shell/HeaderActions.tsx`
- Modify: `src/features/shell/MenuBrand.tsx`
- Modify: `src/components/BrandMark/index.tsx`
- Modify: `src/components/BrandMark/index.style.ts`
- Modify: `src/features/auth/LoginShell.tsx`
- Modify: `src/features/auth/LoginShell.test.tsx`
- Modify: `src/features/auth/LoginFlow.tsx`
- Modify: `src/features/auth/BootstrapWizard.tsx`
- Modify: `src/features/auth/login.style.ts`
- Modify: `src/pages/Login/index.tsx`
- Modify: `src/pages/Login/index.test.tsx`
- Modify: `src/pages/Bootstrap/index.tsx`

**Interfaces:**
- Consumes: existing login/bootstrap services and navigation initial state.
- Produces: 208/56 dark ProLayout sider, 52px header, final D-brand login shell, and shared bootstrap visual state.

- [ ] **Step 1: Query current Ant Design APIs**

Run: `node scripts/antd-command.mjs info layout --format json`

Run: `node scripts/antd-command.mjs info menu --format json`

Run: `node scripts/antd-command.mjs info form --format json`

Record only supported public props/tokens used by the implementation.

- [ ] **Step 2: Write failing behavior and visual-contract tests**

```tsx
expect(screen.getByRole('img', { name: '研发协作平台' })).toBeVisible();
expect(screen.getByRole('heading', { name: /一条可治理的 AI 交付链路/ })).toBeVisible();
expect(layoutConfig.siderWidth).toBe(208);
expect(layoutConfig.menu?.collapsedWidth).toBe(56);
expect(proTheme.token.layout.sider.colorMenuBackground).toBe('#191919');
expect(screen.queryByText('重置演示数据')).not.toBeInTheDocument();
```

Keep the existing assertions for one-time temporary password consumption, password confirmation, hidden TOTP secret, localized errors, and real `/me` + navigation bootstrap.

- [ ] **Step 3: Run RED**

Run: `node_modules/.bin/vitest.cmd run src/app.test.ts src/features/theme/ThemeProvider.test.tsx src/features/shell src/features/auth src/pages/Login src/pages/Bootstrap`

Expected: shell dimensions/theme or final login structure differs.

- [ ] **Step 4: Replace the shell and login DOM**

Use ProLayout runtime settings and public theme tokens for the dark sider. Keep one `BrandMark`. Rebuild LoginShell around the final two-column hero/card layout and make BootstrapWizard a state inside the same shell; do not add a second logo/header/form implementation.

- [ ] **Step 5: Focused GREEN and commit**

Run: `node_modules/.bin/vitest.cmd run src/app.test.ts src/features/theme src/features/shell src/features/auth src/pages/Login src/pages/Bootstrap`

Run: `pnpm biome:check --files-ignore-unknown=true src/app.ts config/defaultSettings.ts src/features/theme src/features/shell src/features/auth src/pages/Login src/pages/Bootstrap src/components/BrandMark`

Run: `pnpm tsc`

Run: `node scripts/antd-command.mjs lint src/features/shell src/features/auth src/pages/Login src/pages/Bootstrap --format json`

Commit: `feat(ui): replace shell and authentication screen`

### Task 3: Replace user screens that have no completed data API

**Files:**
- Modify: `src/pages/Home/index.tsx`
- Modify: `src/pages/Home/index.style.ts`
- Modify: `src/pages/Home/index.test.tsx`
- Delete: `src/pages/Home/constant.ts`
- Modify: `src/pages/Tasks/TaskList.tsx`
- Modify: `src/pages/Tasks/TaskBoard.tsx`
- Modify: `src/pages/Tasks/index.style.ts`
- Modify: `src/pages/Tasks/index.test.tsx`
- Delete: `src/pages/Tasks/constant.ts`
- Delete: `src/pages/Tasks/util.ts`
- Delete: `src/pages/Tasks/util.test.ts`
- Modify: `src/pages/TaskDetail/index.tsx`
- Modify: `src/pages/TaskDetail/ConversationPane.tsx`
- Modify: `src/pages/TaskDetail/InspectorPanel.tsx`
- Modify: `src/pages/TaskDetail/index.style.ts`
- Modify: `src/pages/TaskDetail/index.test.tsx`
- Delete: `src/pages/TaskDetail/constant.ts`
- Delete: `src/pages/TaskDetail/DiffContent.tsx`
- Delete: `src/pages/TaskDetail/PreviewFrame.tsx`
- Modify: `src/pages/Workspaces/index.tsx`
- Modify: `src/pages/Workspaces/index.style.ts`
- Modify: `src/pages/Workspaces/index.test.tsx`
- Delete after migration: `src/pages/Workspaces/constant.ts`
- Modify: `src/pages/Messages/index.tsx`
- Modify: `src/pages/Messages/index.style.ts`
- Modify: `src/pages/Messages/index.test.tsx`
- Delete: `src/pages/Messages/constant.ts`
- Modify: `src/pages/TeamBoard/index.tsx`
- Modify: `src/pages/TeamBoard/index.style.ts`
- Modify: `src/pages/TeamBoard/index.test.tsx`
- Delete: `src/pages/TeamBoard/constant.ts`

**Interfaces:**
- Consumes: authenticated Principal, Ant Design `Empty`, `Tabs`, `Segmented`, ProTable/ProCard.
- Produces: final workbench/task/detail/workspace/message/team layouts with no fake records.

- [ ] **Step 1: Write one screen-level RED per route**

Each test renders the actual page and asserts the final region plus an honest empty state. Also assert the former fixture content is absent.

```tsx
expect(screen.getByRole('heading', { name: '我的任务' })).toBeVisible();
expect(screen.getByText('暂无真实任务数据')).toBeVisible();
expect(screen.queryByText('MK-1024')).not.toBeInTheDocument();
```

For `/tasks`, assert table/board switching reuses the same empty dataset. For `/tasks/:taskId`, assert the route ID is visible but no fabricated title, repository, Diff, Agent conversation, or artifact appears.

- [ ] **Step 2: Run RED**

Run: `node_modules/.bin/vitest.cmd run src/pages/Home src/pages/Tasks src/pages/TaskDetail src/pages/Workspaces src/pages/Messages src/pages/TeamBoard`

Expected: former fixture names and metrics are still rendered.

- [ ] **Step 3: Replace each page instead of appending sections**

Use the final prototype region order. Keep headers, filters, Tabs and column shapes, but feed empty arrays and disable unsupported actions with a Tooltip.

```tsx
<Button disabled title="当前版本暂未接入" type="primary">
  创建任务
</Button>
```

Delete the production business fixtures and demo action hook consumers as soon as their last consumer is migrated.

- [ ] **Step 4: Run focused GREEN and commit in two cohesive commits**

Run: `node_modules/.bin/vitest.cmd run src/pages/Home src/pages/Tasks src/pages/TaskDetail`

Commit: `feat(tasks): replace collaboration screens with final prototype`

Run: `node_modules/.bin/vitest.cmd run src/pages/Workspaces src/pages/Messages src/pages/TeamBoard`

Commit: `feat(portal): replace remaining user screens`

For both commits run changed-file Biome, `pnpm tsc`, and scoped antd lint. Do not run coverage.

### Task 4: Recompose the real Audit screen

**Files:**
- Modify: `src/pages/Audit/index.tsx`
- Modify: `src/pages/Audit/index.style.ts`
- Modify: `src/pages/Audit/index.test.tsx`
- Modify only when presentation metadata changes: `src/pages/Audit/constant.ts`
- Preserve: `src/pages/Audit/util.ts`

**Interfaces:**
- Consumes: `listAuditEvents`, existing date/query mapper, Problem Details formatting.
- Produces: final audit metrics/filter/table/drawer layout backed only by real V0.2 data.

- [ ] **Step 1: Write a failing page-boundary test**

Mock only `@/features/administration`, return DTOs built inside the test, and assert the final table/drawer consumes those DTOs. Add empty and 403 Problem Details cases.

- [ ] **Step 2: Run RED**

Run: `node_modules/.bin/vitest.cmd run src/pages/Audit/index.test.tsx`

- [ ] **Step 3: Recompose without changing the service seam**

Keep ProTable `request`; move filters, statistic containers and detail drawer to their final prototype positions. Do not derive fake aggregate counts when the API does not return aggregates; show `—` or Empty.

- [ ] **Step 4: GREEN and commit**

Run: `node_modules/.bin/vitest.cmd run src/pages/Audit`

Run: `pnpm tsc`

Run: `node scripts/antd-command.mjs lint src/pages/Audit --format json`

Commit: `feat(audit): align real audit screen with final prototype`

### Task 5: Recompose administration screens with completed V0.2 APIs

**Files:**
- Modify: `src/pages/AdminWorkspaces/index.tsx`
- Modify: `src/pages/AdminWorkspaces/index.style.ts`
- Modify: `src/pages/AdminWorkspaces/index.test.tsx`
- Modify: `src/pages/AdminOrganization/index.tsx`
- Modify: `src/pages/AdminOrganization/index.style.ts`
- Modify: `src/pages/AdminOrganization/index.test.tsx`
- Modify: `src/pages/AdminUsers/index.tsx`
- Modify: `src/pages/AdminUsers/index.style.ts`
- Modify: `src/pages/AdminUsers/index.test.tsx`
- Modify: `src/pages/AdminGrants/index.tsx`
- Modify: `src/pages/AdminGrants/index.style.ts`
- Modify: `src/pages/AdminGrants/index.test.tsx`
- Modify: `src/pages/AdminPolicies/index.tsx`
- Modify: `src/pages/AdminPolicies/index.style.ts`
- Modify: `src/pages/AdminPolicies/index.test.tsx`
- Modify page-private Modal/Drawer files only where the final prototype changes their visible composition.

**Interfaces:**
- Consumes: current exports from `@/features/administration` and existing ETag/reason/Problem Details behavior.
- Produces: final organization/workspace/account/grant/policy screens with unchanged real mutation semantics.

- [ ] **Step 1: Write RED tests around actual Feature seams**

For every page, return test-local DTOs from the public Feature mock and assert the DTO reaches the correct prototype table/tree/editor. Preserve explicit tests for 403/409/422, requestId, ETag, reload races, one-time credentials and mutation reason.

- [ ] **Step 2: Run page groups and verify RED**

Run: `node_modules/.bin/vitest.cmd run src/pages/AdminOrganization src/pages/AdminWorkspaces`

Run: `node_modules/.bin/vitest.cmd run src/pages/AdminUsers src/pages/AdminGrants src/pages/AdminPolicies`

- [ ] **Step 3: Replace page composition only**

Move existing real controls into the final prototype locations. Do not create alternate “prototype” buttons. Unsupported prototype actions remain disabled; supported actions call the existing mutation exactly once and reload the existing query.

- [ ] **Step 4: GREEN and commit by domain**

Run focused tests, changed-file Biome, `pnpm tsc`, and scoped antd lint before each commit.

Commit: `feat(workspaces): align real organization and workspace screens`

Commit: `feat(governance): align real account grant and policy screens`

### Task 6: Replace administration screens without completed APIs

**Files:**
- Modify: `src/pages/Admin/index.tsx`
- Modify: `src/pages/Admin/index.style.ts`
- Modify: `src/pages/Admin/index.test.tsx`
- Delete: `src/pages/Admin/constant.ts`
- Modify: `src/pages/AdminSkills/index.tsx`
- Modify: `src/pages/AdminSkills/index.style.ts`
- Modify: `src/pages/AdminSkills/index.test.tsx`
- Delete: `src/pages/AdminSkills/constant.ts`
- Delete unused Skill modal/version files after consumer removal.
- Modify: `src/pages/AdminModels/index.tsx`
- Modify: `src/pages/AdminModels/index.style.ts`
- Modify: `src/pages/AdminModels/index.test.tsx`
- Delete: `src/pages/AdminModels/constant.ts`
- Delete unused catalog/usage/evaluation modal files after migration.
- Modify: `src/pages/AdminRoles/index.tsx`
- Modify: `src/pages/AdminRoles/index.style.ts`
- Modify: `src/pages/AdminRoles/index.test.tsx`
- Delete: `src/pages/AdminRoles/constant.ts`
- Delete unused role modal/matrix files after migration.
- Modify: `src/pages/AdminMenus/index.tsx`
- Modify: `src/pages/AdminMenus/index.style.ts`
- Modify: `src/pages/AdminMenus/index.test.tsx`
- Delete business rows from: `src/pages/AdminMenus/constant.ts`
- Modify: `src/pages/AdminMenus/util.ts`

**Interfaces:**
- Consumes: authenticated navigation for the read-only menu projection.
- Produces: final admin overview/skills/models/roles/menu layouts without fake catalog records or fake CRUD.

- [ ] **Step 1: Write RED tests**

Assert the final headings/Tabs/table columns are visible, all data regions render Empty, unsupported action buttons are disabled, and former prototype names are absent. For AdminMenus, provide navigation through `@@initialState` and assert only returned routeKeys appear.

- [ ] **Step 2: Run RED**

Run: `node_modules/.bin/vitest.cmd run src/pages/Admin src/pages/AdminSkills src/pages/AdminModels src/pages/AdminRoles src/pages/AdminMenus`

- [ ] **Step 3: Replace legacy pages and delete fake records**

Build each final layout directly from ProCard/ProTable/Tabs/Empty. AdminMenus is read-only until a menu-management API exists; remove its create/edit/reorder/toggle fake actions.

- [ ] **Step 4: GREEN and commit**

Run the same focused files, changed-file Biome, `pnpm tsc`, and scoped antd lint.

Commit: `feat(admin): replace unsupported catalogs with honest final screens`

### Task 7: Remove residual demo code and prove there are no duplicate capabilities

**Files:**
- Delete when no consumers remain: `src/hooks/useStaticPrototypeAction.ts`
- Modify: `scripts/verify-structure.mjs`
- Modify: `scripts/verify-structure.test.mjs`
- Modify: `src/features/navigation/menu.test.ts`
- Modify: `src/features/navigation/registry.test.tsx`
- Modify: `AGENTS.md`
- Create: `docs/superpowers/reports/2026-08-21-final-prototype-ui.md`

**Interfaces:**
- Consumes: all migrated screens.
- Produces: structural proof, route/menu uniqueness evidence, and final acceptance report.

- [ ] **Step 1: Run residual searches**

Run: `rg -n -g '!*.test.*' -g '!tests/**' 'Fixture|FIXTURE|useStaticPrototypeAction|静态原型操作|重置演示数据|异常态演示|prototype: true' src`

Expected: no matches.

Run: `rg --files mock src/mock`

Expected: paths do not exist.

- [ ] **Step 2: Run route/menu integrity tests**

Assert all menu paths are unique, every menu item resolves to one route, hidden technical routes do not appear in the menu, and the 19-screen set is complete.

- [ ] **Step 3: Run local focused final checks**

Run: `pnpm biome:check`

Run: `pnpm tsc`

Run: `pnpm depcruise`

Run: `pnpm test:tooling`

Run page tests in resource-bounded groups without coverage. Stop and diagnose if a command produces no output for 60 seconds.

- [ ] **Step 4: Run external Chrome acceptance when available**

At 1440×900 and 1280px, inspect all 19 screens, auth redirects, menu routing, light/dark content theme, empty/error states and all supported real mutations. Record screenshot paths and PASS/FAIL/CANNOT VERIFY in the report. If the external Chrome plugin is unavailable, record CANNOT VERIFY and do not use the in-app browser.

- [ ] **Step 5: Final CI and delivery**

Push the feature branch and let CI run the full `pnpm verify`, including complete coverage, doctor, antd checks and build. Do not claim completion until the exact commit is green. Then request code review, fix findings, merge to `main`, verify remote `main`, and clean the worktree/branch.

Commit: `test(ui): prove final prototype replacement`
