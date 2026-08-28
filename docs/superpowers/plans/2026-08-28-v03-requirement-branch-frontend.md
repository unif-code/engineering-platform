# V0.3 Requirement & Branch Frontend Implementation Plan

> **For Codex:** Execute only after the reviewed backend `api-v0.3.0` Artifact exists. Use strict
> red-green-refactor. Do not hand-edit generated files, merge, tag, deploy, delete branches, or update
> `docs/superpowers/progress/current.md` without the separate authorization required by repository
> policy.

**Goal:** Replace the empty Task prototype with the real V0.3 Requirement list/create/detail journey
and show only verified Branch Binding success.

**Architecture:** Pages are route adapters only. `features/requirements` owns page behavior and a
private generated-client service seam. Session bootstrap retains scoped Workspace facts. The browser
queries safe Source Control repository choices, but reads Branch Binding state only through the
Requirement contract.

**Design:** `engineering-platform-docs/docs/superpowers/specs/2026-08-28-v03-requirement-branch-vertical-design.md`

**Tech Stack:** TypeScript 5.9, React 19, Umi Max 4, Ant Design 6, Pro Components 3, TanStack Query 5,
openapi-fetch, Vitest 4, Testing Library, Biome.

## Guardrails

- Create an isolated worktree from the reviewed frontend `main` SHA.
- Before writing UI code, read the repository's locked Ant Design guidance and query each used
  component with `npx antd info <component> --format json`; do not rely on remembered props.
- Keep `pages → features → services/generated`; no page imports a service and no shared component
  imports Requirement code.
- `src/services/generated/**` and `openapi/spec.json` are generator output only.
- No runtime `/api/v1` mocks, fixtures, fallback rows, fabricated branch/SHA or dual route.
- All server data uses React Query from `@umijs/max`; tables use ProTable `request`; do not use
  `useRequest`.
- Browser acceptance uses the external Chrome extension only. If it is unavailable, record
  `CANNOT VERIFY` rather than using the in-app browser.

## Gate 0: Require the released backend Artifact

**Files:**

- Modify only after release: `openapi/artifact.lock.json`
- Generate: `openapi/spec.json`
- Generate: `src/services/generated/{ARTIFACT.json,client.ts,index.ts,schema.d.ts}`
- Modify tests if required: `scripts/openapi-baseline.test.mjs`

Verify that the backend release contains:

```text
POST /api/v1/requirements
GET  /api/v1/requirements
GET  /api/v1/requirements/{requirementId}
GET  /api/v1/workspaces/{workspaceId}/repositories
```

and excludes V0.4/V0.5 commands. Confirm release URL, `version=0.3.0`, sidecar digest and downloaded
SHA-256 before changing the lock.

Run:

```powershell
pnpm openapi:fetch
pnpm openapi:generate
pnpm openapi:check:release
```

Expected: generated client is deterministic and contains only the reviewed Artifact. If the release
does not exist, stop at this gate; do not commit a `file:` lock or copied schema as the final state.

## Task 1: Preserve Workspace and scoped Capability facts in Session state

**Files:**

- Modify: `src/services/auth/type.ts`
- Modify: `src/services/auth/index.ts`
- Modify: `src/services/auth/index.test.ts`
- Modify: `src/features/auth/type.ts`
- Modify: `src/features/auth/service.ts`
- Modify: `src/features/auth/service.test.ts`
- Modify: `src/features/auth/index.ts`
- Modify: `src/app.ts`
- Modify: `tests/auth-fixtures.ts`

### Step 1: Write failing projection tests

Assert `/me` projects and retains:

- `accountId`, employee ID and name;
- Workspace `{id,name,ownerId}` summaries;
- scoped Capability `{capability,scopeType,scopeId}` entries;
- the existing flat capability list only as a derived compatibility for current V0.2 screens.

Add pure helpers that answer whether a capability is present for an exact Workspace. Platform grants
must not satisfy a Workspace-scoped requirement accidentally.

Run:

```powershell
pnpm exec vitest run src/services/auth src/features/auth src/app.test.ts -q
```

Expected: RED because current service discards account, workspace and scope facts.

### Step 2: Implement the typed Session projection

Keep generated types at the boundary and expose a stable Feature/session type. Update initial-state
fixtures without adding fabricated production data.

### Step 3: Make tests green

Run the same command. Expected: GREEN.

## Task 2: Add the Requirement Feature service seam

**Files:**

- Create: `src/features/requirements/type.ts`
- Create: `src/features/requirements/service.ts`
- Create: `src/features/requirements/service.test.ts`
- Create: `src/features/requirements/index.ts`
- Modify: `src/services/transport/mutation.ts`
- Modify: `src/services/transport/mutation.test.ts`

### Step 1: Write failing service tests

Mock only `@/services/generated` and cover:

- list uses `workspaceId`, cursor and limit;
- get uses exact Requirement path ID;
- authorized repository list uses exact Workspace path;
- create sends the generated request body and caller-provided stable Idempotency Key;
- all responses pass through `requireApiData`/Problem normalization;
- no service DTO exposes repository Secret references or Source Control Effect fields.

Extend `mutationHeaders` tests so a caller can provide a pre-generated key while existing callers keep
the default random-key behavior.

Run:

```powershell
pnpm exec vitest run src/features/requirements/service.test.ts src/services/transport/mutation.test.ts -q
```

Expected: RED because the Feature and explicit-key support do not exist.

### Step 2: Implement the private service

`features/requirements/service.ts` imports only generated API/types and transport helpers. It maps the
generated schema to compact Feature models and does not expose openapi-fetch result objects.

### Step 3: Make service tests green

Run the same command. Expected: GREEN.

## Task 3: Replace the static Task route contract with Requirement routes

**Files:**

- Modify: `config/routes.ts`
- Modify: `src/constants/route.ts`
- Modify: `src/features/navigation/registry.tsx`
- Modify: `src/features/navigation/registry.test.tsx`
- Modify: `src/features/navigation/menu.test.ts`
- Modify: `src/features/navigation/RouteGuard.test.tsx`
- Modify: `src/features/navigation/redirect.test.ts`
- Modify: `src/features/shell/index.test.tsx`
- Create: `src/pages/Requirements/index.tsx`
- Create: `src/pages/RequirementDetail/index.tsx`
- Remove when green: `src/pages/Tasks/index.tsx`
- Remove when green: `src/pages/TaskDetail/index.tsx`

### Step 1: Change tests first

Lock the exact static registry:

```text
requirements         /requirements
requirements.detail  /requirements/:requirementId
```

Assert `tasks`, `tasks.detail`, `/tasks` and `/tasks/:taskId` are absent. Navigation item
`routeKey=requirements` must create the user menu and RouteGuard must allow details only when its
parent capability route is active according to the existing detail-route rule.

Run:

```powershell
pnpm exec vitest run src/features/navigation src/features/shell -q
```

Expected: RED against the current Task registry.

### Step 2: Implement the single route line

Update config, constants and registry together. Pages export only the Requirement Feature public
screens. Do not add redirects or aliases for old Task URLs.

### Step 3: Make route tests green

Run the same command. Expected: GREEN.

## Task 4: Build the Requirement list with cursor-safe ProTable loading

**Files:**

- Create: `src/features/requirements/RequirementsPage.tsx`
- Create: `src/features/requirements/RequirementsPage.test.tsx`
- Create: `src/features/requirements/list.util.ts`
- Create: `src/features/requirements/list.util.test.ts`
- Create: `src/features/requirements/constant.ts`
- Create: `src/features/requirements/index.style.ts`
- Modify: `src/features/requirements/index.ts`

### Step 1: Query Ant Design APIs

Run and inspect JSON for the installed versions:

```powershell
npx antd info Select --format json
npx antd info Button --format json
npx antd info Empty --format json
```

Also inspect the locked Pro Components guidance before using ProTable.

### Step 2: Write failing page/adapter tests

Cover:

- Workspace selector shows only Session workspaces readable through scoped capability;
- no Workspace produces a real empty state;
- ProTable `request` calls list with exact workspace/cursor/limit;
- cursor map supports sequential next and previous pages without inventing a total;
- switching Workspace resets cursor/page/data and invalidates stale completion;
- load error returns `success:false`, preserves normalized Problem and offers retry;
- rows show Requirement ID/title/type/state/updated time and navigate to exact details;
- no Branch Binding is fabricated from list-only data.

Run:

```powershell
pnpm exec vitest run src/features/requirements/RequirementsPage.test.tsx src/features/requirements/list.util.test.ts -q
```

Expected: RED.

### Step 3: Implement list behavior

Use ProTable `request` and a tested cursor adapter. Keep search, archive, board and filters absent until
the backend contract exists. Use Ant Design/Pro Components and existing semantic shared components;
do not recreate table, tags or empty states.

### Step 4: Make list tests green

Run the same command. Expected: GREEN.

## Task 5: Implement create flow with stable submission identity

**Files:**

- Create: `src/features/requirements/CreateRequirementModal.tsx`
- Create: `src/features/requirements/CreateRequirementModal.test.tsx`
- Create: `src/features/requirements/submission.ts`
- Create: `src/features/requirements/submission.test.ts`
- Modify: `src/features/requirements/RequirementsPage.tsx`
- Modify: `src/features/requirements/index.ts`

### Step 1: Query component APIs

Run:

```powershell
npx antd info Modal --format json
npx antd info Form --format json
npx antd info Input --format json
npx antd info Select --format json
npx antd info Alert --format json
```

### Step 2: Write failing form and idempotency tests

Cover:

- create button appears only when at least one exact Workspace has `requirement.create`;
- form validates type, title, description, one-or-more acceptance criteria, Workspace and Repository;
- selecting Workspace loads only its authorized repositories;
- changing Workspace clears an old repository choice;
- loading, empty and Problem states do not permit invalid submit;
- first submit creates a UUID key before sending;
- network/unknown-result retry with unchanged canonical payload reuses the same key;
- editing payload invalidates the old submission and creates a new key;
- server idempotency Conflict is shown and never bypassed by silently changing the key;
- success closes/reset form, reloads list and navigates to `/requirements/{id}`.

Run:

```powershell
pnpm exec vitest run src/features/requirements/CreateRequirementModal.test.tsx src/features/requirements/submission.test.ts -q
```

Expected: RED.

### Step 3: Implement with React Query mutation

Import `useMutation` from `@umijs/max`. Keep the submission key in a small tested state object rather
than regenerating it inside the service call. Never persist draft content or keys to logs/localStorage.

### Step 4: Make create tests green

Run the same command. Expected: GREEN.

## Task 6: Implement Requirement detail and verified Binding status

**Files:**

- Create: `src/features/requirements/RequirementDetailPage.tsx`
- Create: `src/features/requirements/RequirementDetailPage.test.tsx`
- Create: `src/features/requirements/BindingStatus.tsx`
- Create: `src/features/requirements/BindingStatus.test.tsx`
- Create: `src/features/requirements/binding.ts`
- Create: `src/features/requirements/binding.test.ts`
- Create: `src/features/requirements/detail.style.ts`
- Modify: `src/features/requirements/index.ts`

### Step 1: Query component APIs

Run:

```powershell
npx antd info Descriptions --format json
npx antd info Tag --format json
npx antd info Alert --format json
npx antd info Skeleton --format json
```

### Step 2: Write failing state-machine tests

Lock the pure mapping:

```text
WAITING_REPOSITORY                         -> PENDING
BOUND + baseCommitSha + taskBranch         -> READY
BLOCKED + RECONCILIATION_PENDING           -> RECONCILIATION
BLOCKED + any other safe reason            -> BLOCKED
BOUND missing exact SHA or branch          -> INVALID_RESPONSE
```

Page tests cover loading, 404/403/network Problems, manual retry, exact Requirement/WorkItem facts,
full non-secret base SHA and branch copy affordance, and absence of MR/Artifact/Chat actions.

Use React Query `refetchInterval` only for PENDING/RECONCILIATION. Assert terminal status, unmount and
route change stop polling; stale responses cannot overwrite a newer terminal result.

Run:

```powershell
pnpm exec vitest run src/features/requirements/RequirementDetailPage.test.tsx src/features/requirements/BindingStatus.test.tsx src/features/requirements/binding.test.ts -q
```

Expected: RED.

### Step 3: Implement detail behavior

Import `useQuery` from `@umijs/max`. Show user-safe blocked reason copy from an allowlisted mapping;
unknown future reason uses a generic blocked message and request ID, not raw provider detail. READY
requires both exact values and is never inferred from elapsed time.

### Step 4: Make detail tests green

Run the same command. Expected: GREEN.

## Task 7: Remove the replaced prototype implementation and close public boundaries

**Files:**

- Modify: `src/features/portal/index.ts`
- Remove: `src/features/portal/screens/Tasks/**`
- Remove: `src/features/portal/screens/TaskDetail/**`
- Modify: structure/dependency tests under `scripts/` as required
- Modify: affected `src/pages/**` boundary tests

This is part of the approved single-line Requirement implementation, not a repository/branch cleanup.
Before removal, prove every route/export points to the new Feature. Then delete the replaced files and
assert source scans contain no `TasksScreen`, `TaskDetailScreen`, `/tasks`, `tasks.detail`, static
`taskRows`, fake Agent conversation or compatibility wrapper.

Run:

```powershell
pnpm verify:structure
pnpm depcruise
pnpm exec vitest run src/features/requirements src/features/navigation src/features/portal src/pages -q
```

Expected: GREEN.

## Task 8: Run focused frontend gates

Run:

```powershell
pnpm exec biome check config/routes.ts src/app.ts src/constants/route.ts src/features/auth src/features/navigation src/features/requirements src/pages/Requirements src/pages/RequirementDetail src/services/auth src/services/transport
pnpm tsc
pnpm depcruise
pnpm openapi:check:release
pnpm verify:structure
pnpm test:tooling
pnpm exec vitest run src/features/auth src/features/navigation src/features/requirements src/services/auth src/services/transport -q
pnpm antd:lint
```

Expected: all commands exit 0. Do not run daily full coverage/doctor/build repeatedly; the exact
candidate CI must execute complete `pnpm verify` before merge.

## Task 9: CI and visual acceptance handoff

After review, present the candidate for separate commit/push/PR authorization. Required evidence:

- exact frontend candidate SHA;
- locked `api-v0.3.0` URL/version/SHA-256 and clean generated check;
- complete `pnpm verify` CI result;
- no runtime API mocks, old Task routes, skipped tests or sensitive output;
- backend/OpenAPI candidate used by the build.

Real visual and integration acceptance runs only after a target environment deploys the exact frontend,
backend, migration, Source Control worker/Connector and provider configuration. Use external Chrome at
1440×900 and 1280px. Verify create, unknown/reconciliation, ready, blocked, retry, cross-Workspace and
refresh behavior. If the environment is absent, record `CANNOT VERIFY`; do not infer deployment or
Release Acceptance from CI.

## Post-review safety amendments

The merge-candidate review tightened the implementation without changing V0.3 product scope:

- Requirement detail and authorized-repository Query keys include the authenticated principal, use
  zero cache retention, consume AbortSignal, and are cancelled/cleared before logout, protected 401,
  or a newly authenticated Session is committed.
- A 401/403 refresh failure never renders previously cached Requirement data.
- PENDING/RECONCILIATION polling is bounded to 60 seconds, then stops with an explicit manual-refresh
  affordance; READY remains evidence-based.
- The list owns Workspace, current opaque cursor and page number in the URL so refresh/share and
  browser history retain the selected server page.
- Successful detail response request IDs are projected for generic future BLOCKED reasons, and create
  cancellation ignores late success without fabricating an outcome.
