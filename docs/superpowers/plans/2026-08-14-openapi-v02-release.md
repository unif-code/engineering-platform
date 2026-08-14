# OpenAPI V0.2 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复并发布 `api-v0.2.0` OpenAPI Artifact，同时让前端契约门禁正确支持开发期 `0.x` minor breaking release。

**Architecture:** 将版本判定提取为无副作用 helper，由 Node 单元测试覆盖 `0.x minor`、`0.x patch` 和稳定版 major 三种边界；CLI 的 fetch 与 git-baseline check 复用同一判定。后端继续单源导出 `info.version`，前端只通过 fetch/generate 更新 spec 与 generated 文件。

**Tech Stack:** Node.js test runner、OpenAPI、Python/FastAPI、pnpm、uv、GitHub Actions。

## Global Constraints

- 所有 `0.x` 均为开发阶段；breaking change 必须提升 minor，不得只提升 patch。
- `1.x` 及以后 breaking change 必须提升 major。
- 后端 tag 必须为 `api-v0.2.0`，前端 tag 必须为 `v0.2.0`。
- 不手改 `openapi.json`、`openapi/spec.json` 或 `src/services/generated`。
- 保留当前工作区已有的 V0.2 seam 修复。

---

### Task 1: 开发期契约版本门禁

**Files:**
- Create: `scripts/openapi-baseline.mjs`
- Create: `scripts/openapi-baseline.test.mjs`
- Modify: `scripts/openapi.mjs`
- Modify: `package.json`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: `classifyBreakingRelease(baseVersion, currentVersion)`，返回 `'development-minor' | 'major' | null`。
- Consumes: OpenAPI `info.version` 字符串。

- [ ] **Step 1: 写失败测试**

```js
assert.equal(classifyBreakingRelease('0.1.0', '0.2.0'), 'development-minor');
assert.equal(classifyBreakingRelease('0.2.0', '0.2.1'), null);
assert.equal(classifyBreakingRelease('1.2.0', '2.0.0'), 'major');
assert.equal(classifyBreakingRelease('1.2.0', '1.3.0'), null);
```

- [ ] **Step 2: 运行 RED**

Run: `node --test scripts/openapi-baseline.test.mjs`
Expected: FAIL，提示找不到 `openapi-baseline.mjs`。

- [ ] **Step 3: 实现最小 helper，并让 fetch/check 共用**

```js
export function classifyBreakingRelease(baseVersion, currentVersion) {
  const base = parseSemver(baseVersion);
  const current = parseSemver(currentVersion);
  if (!base || !current) return null;
  if (current.major > base.major) return 'major';
  if (base.major === 0 && current.major === 0 && current.minor > base.minor) {
    return 'development-minor';
  }
  return null;
}
```

- [ ] **Step 4: 运行 GREEN 与 tooling suite**

Run: `node --test scripts/openapi-baseline.test.mjs`
Expected: PASS。

Run: `pnpm test:tooling`
Expected: PASS。

### Task 2: 恢复并同步 Artifact 0.2.0

**Files:**
- Modify: `../engineering-platform-backend/control_plane/app/__init__.py`
- Modify: `../engineering-platform-backend/tests/test_version.py`
- Modify: `../engineering-platform-backend/tests/test_e2e_access_governance.py`
- Generate: `../engineering-platform-backend/openapi.json`
- Modify: `openapi/artifact.lock.json`
- Generate: `openapi/spec.json`
- Generate: `src/services/generated/ARTIFACT.json`

**Interfaces:**
- Consumes: 后端导出的 `openapi.json` 与 SHA-256。
- Produces: version/digest 完全一致的 lock、spec 与 generated metadata。

- [ ] **Step 1: 恢复后端单源版本断言为 `0.2.0` 并导出**

Run: `uv run python scripts/export_openapi.py`
Expected: 输出 `version=0.2.0`。

- [ ] **Step 2: 用新 SHA 更新 lock，并按流程生成**

Run: `pnpm openapi:fetch && pnpm openapi:generate`
Expected: version 为 `0.2.0`，生成目录无手改。

- [ ] **Step 3: 验证开发期 minor breaking release**

Run: `pnpm openapi:check:release`
Expected: PASS，并说明 `0.1.0 → 0.2.0` 由开发期 minor 升级声明。

### Task 3: 门禁、提交与发布

**Files:**
- Verify: 两仓 CI 配置列出的本地可执行门禁。

**Interfaces:**
- Produces: 后端 `api-v0.2.0` 与前端 `v0.2.0`。

- [ ] **Step 1: 运行后端静态门禁、测试与 Artifact check**

Run: `uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run lint-imports && uv run pytest -v && uv run python scripts/export_openapi.py --check`
Expected: 全部 exit 0；需要 PostgreSQL 的测试若本机未提供服务，记录为 CI 待验证项，不伪造通过。

- [ ] **Step 2: 运行前端 `pnpm verify` 与 release gate**

Run: `pnpm verify && pnpm openapi:check:release`
Expected: 全部 exit 0。

- [ ] **Step 3: 精确暂存并以 Conventional Commits 提交两仓**

Run: `git status --short && git diff --check`（分别在两仓执行），随后按文件清单 `git add` 和 `git commit`。
Expected: 提交只包含本次 V0.2 契约切换、回归修复与版本策略。

- [ ] **Step 4: push 两仓 `main`，确认远端 SHA 后创建并 push tags**

Run: `git push origin main`；远端 SHA 与本地 HEAD 一致后，后端创建 `api-v0.2.0`、前端创建 `v0.2.0` 并分别 push。
Expected: push 成功，tag 均指向各仓已验证的 main HEAD。

- [ ] **Step 5: 查询 GitHub Actions，确认 main 与 tag workflows 结果**

Run: `gh run list --limit 10`，并对本次 main/tag run 使用 `gh run watch --exit-status`。
Expected: 两仓 main 与 release/tag workflow 全绿。

## Self-Review

- 覆盖用户确认的 `0.x` 开发期策略、后端/前端 tag 命名和双仓 Artifact 同步。
- helper 返回值、测试期待值与 CLI 消费名称一致。
- 未引入版本自动推断或额外 Release 机制；仅调整既有契约门禁。
- 无占位符；每个生成文件都由仓库命令产生。
