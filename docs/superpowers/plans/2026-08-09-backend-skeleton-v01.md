# V0.1 后端仓骨架实施计划

> **Roadmap Reclassification（2026-08-28）**：本计划保留为 V0.1 Application Foundation 的已执行技术记录。原 V0.1 基础设施/恢复/容量依赖已被权威路线图取代，分别在 V0.14～V0.19 实施；不得用下文历史步骤重新扩大 V0.1 Release Gate。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `engineering-platform-backend` 空仓落地可重现构建的 FastAPI 模块化单体骨架：四个端点、Audit 追加式机制、OpenAPI Artifact 发布链，并与前端仓 openapi 链路闭环。

**Architecture:** 竖切优先——`bootstrap` 装配 + `shared/{api,db,observability}` 基建 + `identity`（me/navigation stub，无表）与 `audit`（追加式基线表）两个真模块；模块边界由 import-linter 契约固化；`openapi.json` 入库并由 CI 校验与代码一致。

**Tech Stack:** Python 3.12、uv、FastAPI、Pydantic 2、SQLAlchemy 2、Alembic、psycopg 3、ruff、mypy(strict)、pytest + httpx TestClient、import-linter、docker compose（postgres:18）、GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-08-09-backend-skeleton-v01-design.md`

## Global Constraints

- 后端任务的工作目录一律是 `/Users/liulijun/tongyi/unif-code/engineering-platform-backend`（空仓，remote 已指向 github.com/unif-code/engineering-platform-backend，直接在 main 开发）；任务 10、11 的前端部分在 `/Users/liulijun/tongyi/unif-code/engineering-platform`。
- Python `>=3.12`；依赖只经 uv 管理，`uv.lock` 必须提交；PostgreSQL 大版本固定 18。
- API 约定：JSON camelCase、ID 一律 string、前缀 `/api/v1`、错误统一 `application/problem+json`（RFC 9457）、**无** `{code,data,message}` 信封。
- `audit_rw` 角色绝不授予 `UPDATE/DELETE`——追加式由数据库权限层保证。
- `openapi.json` 与代码必须同步（CI `--check` 校验）；`info.version` 单源于 `control_plane/app/__init__.py` 的 `__version__`。
- 提交规范：Conventional Commits、每次提交单一主题；本计划各任务末尾即提交点。
- 所有命令在仓库根执行；`uv run` 前置任何 Python 命令。

---

### Task 1: 仓库初始化与工具链底座

**Files:**
- Create: `pyproject.toml`、`.python-version`、`.gitignore`、`control_plane/__init__.py`、`control_plane/app/__init__.py`、`tests/__init__.py`、`tests/test_version.py`

**Interfaces:**
- Produces: 包 `control_plane.app`，常量 `__version__ = "0.1.0"`（str）；`uv run pytest` 可用。

- [ ] **Step 1: 写包与工具配置**

`pyproject.toml`：

```toml
[project]
name = "engineering-platform-backend"
dynamic = ["version"]
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn>=0.34",
  "pydantic>=2.10",
  "pydantic-settings>=2.7",
  "sqlalchemy>=2.0.36",
  "alembic>=1.14",
  "psycopg[binary]>=3.2",
]

[dependency-groups]
dev = [
  "pytest>=8.3",
  "httpx>=0.28",
  "ruff>=0.9",
  "mypy>=1.14",
  "import-linter>=2.1",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.version]
path = "control_plane/app/__init__.py"

[tool.hatch.build.targets.wheel]
packages = ["control_plane"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
strict = true
files = ["control_plane", "tests"]

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = ["integration: 需要真实 PostgreSQL"]
```

`.python-version` 内容一行：`3.12`。`.gitignore`：

```gitignore
.venv/
__pycache__/
*.pyc
.env
.mypy_cache/
.ruff_cache/
.pytest_cache/
```

`control_plane/__init__.py` 与 `tests/__init__.py` 为空文件；`control_plane/app/__init__.py`：

```python
__version__ = "0.1.0"
```

- [ ] **Step 2: 写失败测试**

`tests/test_version.py`：

```python
from control_plane.app import __version__


def test_version_is_single_sourced() -> None:
    assert __version__ == "0.1.0"
```

- [ ] **Step 3: 安装并跑测试**

Run: `uv sync && uv run pytest -v`
Expected: PASS（1 passed）；生成 `uv.lock`。

- [ ] **Step 4: 跑 lint 与类型检查**

Run: `uv run ruff format . && uv run ruff check . && uv run mypy .`
Expected: 全部通过、无输出错误。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: bootstrap uv toolchain and package skeleton"
```

---

### Task 2: create_app、healthz 与 Problem Details 归一

**Files:**
- Create: `control_plane/app/shared/__init__.py`、`control_plane/app/shared/api/__init__.py`、`control_plane/app/shared/api/problem.py`、`control_plane/app/bootstrap/__init__.py`、`control_plane/app/bootstrap/app.py`、`tests/conftest.py`、`tests/api/__init__.py`、`tests/api/test_health.py`、`tests/api/test_problem_details.py`

**Interfaces:**
- Consumes: `control_plane.app.__version__`（Task 1）。
- Produces: `create_app() -> FastAPI`；`problem_response(status: int, title: str, detail: str | None = None, extra: dict[str, object] | None = None) -> JSONResponse`；`register_problem_handlers(app: FastAPI) -> None`；媒体类型常量 `PROBLEM_MEDIA_TYPE = "application/problem+json"`。

- [ ] **Step 1: 写失败测试**

`tests/conftest.py`：

```python
import pytest
from fastapi.testclient import TestClient

from control_plane.app.bootstrap.app import create_app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)
```

`tests/api/test_health.py`：

```python
from fastapi.testclient import TestClient


def test_healthz_ok(client: TestClient) -> None:
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

`tests/api/test_problem_details.py`：

```python
from fastapi.testclient import TestClient
from pydantic import BaseModel

from control_plane.app.bootstrap.app import create_app


def test_unknown_route_is_problem_json(client: TestClient) -> None:
    resp = client.get("/no-such-route")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 404
    assert body["title"]


def test_validation_error_maps_to_422_problem() -> None:
    app = create_app()

    class Probe(BaseModel):
        count: int

    @app.get("/test-only/probe")
    async def probe(count: int) -> dict[str, int]:  # pragma: no cover - 仅供本测试
        return {"count": count}

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/test-only/probe", params={"count": "not-a-number"})
    assert resp.status_code == 422
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 422
    assert isinstance(body["errors"], list) and body["errors"]
```

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run pytest tests/api -v`
Expected: FAIL（`ModuleNotFoundError: control_plane.app.bootstrap`）。

- [ ] **Step 3: 实现**

`control_plane/app/shared/api/problem.py`：

```python
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_MEDIA_TYPE = "application/problem+json"


def problem_response(
    status: int,
    title: str,
    detail: str | None = None,
    extra: dict[str, object] | None = None,
) -> JSONResponse:
    body: dict[str, object] = {"title": title, "status": status}
    if detail is not None:
        body["detail"] = detail
    if extra:
        body.update(extra)
    return JSONResponse(status_code=status, content=body, media_type=PROBLEM_MEDIA_TYPE)


def register_problem_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return problem_response(exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_exception(_: Request, exc: RequestValidationError) -> JSONResponse:
        return problem_response(
            422, "Validation failed", extra={"errors": jsonable_encoder(exc.errors())}
        )

    @app.exception_handler(Exception)
    async def unhandled_exception(_: Request, exc: Exception) -> JSONResponse:
        return problem_response(500, "Internal server error")
```

`control_plane/app/bootstrap/app.py`：

```python
from fastapi import FastAPI

from control_plane.app import __version__
from control_plane.app.shared.api.problem import register_problem_handlers

API_DESCRIPTION = """内部研发平台 Control Plane API。

全局约定：JSON 一律 camelCase；ID 一律 string；错误统一 application/problem+json（RFC 9457）；
分页 cursor 型 {items, nextCursor}；写并发 If-Match/ETag；变更命令 Idempotency-Key——
后三者自 V0.2 首个真实接口起强制执行。"""


def create_app() -> FastAPI:
    app = FastAPI(
        title="engineering-platform-control-plane",
        version=__version__,
        description=API_DESCRIPTION,
    )
    register_problem_handlers(app)

    @app.get("/healthz", operation_id="system_healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    return app
```

`shared/__init__.py`、`shared/api/__init__.py`、`bootstrap/__init__.py`、`tests/api/__init__.py` 为空文件。

- [ ] **Step 4: 跑测试确认通过**

Run: `uv run pytest tests/api -v && uv run ruff format . && uv run ruff check . && uv run mypy .`
Expected: 3 passed；lint/类型无错误。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(bootstrap): create_app with healthz and problem-details handlers"
```

---

### Task 3: identity 模块（me/navigation stub）与 camelCase 约定

**Files:**
- Create: `control_plane/app/shared/api/camel.py`、`control_plane/app/modules/__init__.py`、`control_plane/app/modules/identity/{__init__.py,api/__init__.py,api/routes.py,application/__init__.py,application/bootstrap_stub.py,domain/__init__.py,domain/models.py,ports/__init__.py,adapters/__init__.py}`、`tests/api/test_identity_stub.py`
- Modify: `control_plane/app/bootstrap/app.py`

**Interfaces:**
- Consumes: `create_app()`（Task 2）。
- Produces: `CamelModel`（pydantic 基类，序列化 camelCase）；`Principal(employee_id: str, name: str)`、`NavigationItem(route_key: str, name: str, order: int)`；`get_me() -> Principal`、`get_navigation() -> list[NavigationItem]`；路由 `GET /api/v1/me`（operation_id `identity_me`）、`GET /api/v1/navigation`（operation_id `identity_navigation`）。

- [ ] **Step 1: 写失败测试**

`tests/api/test_identity_stub.py`：

```python
from fastapi.testclient import TestClient

from control_plane.app.bootstrap.app import create_app


def test_me_returns_stub_principal_in_camel_case(client: TestClient) -> None:
    resp = client.get("/api/v1/me")
    assert resp.status_code == 200
    assert resp.json() == {"employeeId": "00000000", "name": "V0.1 Stub"}


def test_navigation_matches_frontend_route_registry(client: TestClient) -> None:
    resp = client.get("/api/v1/navigation")
    assert resp.status_code == 200
    assert resp.json() == [
        {"routeKey": "home", "name": "首页", "order": 1},
        {"routeKey": "admin", "name": "管理后台", "order": 2},
    ]


def test_operation_ids_are_stable() -> None:
    schema = create_app().openapi()
    assert schema["paths"]["/api/v1/me"]["get"]["operationId"] == "identity_me"
    assert schema["paths"]["/api/v1/navigation"]["get"]["operationId"] == "identity_navigation"
```

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run pytest tests/api/test_identity_stub.py -v`
Expected: FAIL（404，路由不存在）。

- [ ] **Step 3: 实现**

`control_plane/app/shared/api/camel.py`：

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """API DTO 基类：字段 snake_case 定义、JSON 一律 camelCase。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
```

`modules/identity/domain/models.py`：

```python
from control_plane.app.shared.api.camel import CamelModel


class Principal(CamelModel):
    employee_id: str
    name: str


class NavigationItem(CamelModel):
    route_key: str
    name: str
    order: int
```

`modules/identity/application/bootstrap_stub.py`：

```python
from control_plane.app.modules.identity.domain.models import NavigationItem, Principal


def get_me() -> Principal:
    return Principal(employee_id="00000000", name="V0.1 Stub")


def get_navigation() -> list[NavigationItem]:
    return [
        NavigationItem(route_key="home", name="首页", order=1),
        NavigationItem(route_key="admin", name="管理后台", order=2),
    ]
```

`modules/identity/api/routes.py`：

```python
from fastapi import APIRouter

from control_plane.app.modules.identity.application.bootstrap_stub import get_me, get_navigation
from control_plane.app.modules.identity.domain.models import NavigationItem, Principal

router = APIRouter(prefix="/api/v1", tags=["identity"])

STUB_NOTE = "V0.1 技术性 stub：无认证语义，V0.2 起由真实 Session 与服务端授权判定原地替换。"


@router.get("/me", operation_id="identity_me", description=STUB_NOTE)
async def me() -> Principal:
    return get_me()


@router.get("/navigation", operation_id="identity_navigation", description=STUB_NOTE)
async def navigation() -> list[NavigationItem]:
    return get_navigation()
```

`bootstrap/app.py` 在 `register_problem_handlers(app)` 后、`healthz` 定义前加：

```python
from control_plane.app.modules.identity.api.routes import router as identity_router
```

并在 `healthz` 定义之后 `return app` 之前加：

```python
    app.include_router(identity_router)
```

其余 `__init__.py` 为空文件（identity 的 `ports/`、`adapters/` 仅占位 `__init__.py`，V0.2 落认证时填充）。

- [ ] **Step 4: 跑测试确认通过**

Run: `uv run pytest -v && uv run ruff format . && uv run ruff check . && uv run mypy .`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(identity): me and navigation bootstrap stubs with camelCase DTOs"
```

---

### Task 4: shared/db、docker compose 与 readyz

**Files:**
- Create: `docker-compose.yml`、`control_plane/app/shared/db/__init__.py`、`control_plane/app/shared/db/settings.py`、`control_plane/app/shared/db/engine.py`、`tests/api/test_readyz.py`
- Modify: `control_plane/app/bootstrap/app.py`

**Interfaces:**
- Consumes: `problem_response`（Task 2）。
- Produces: `DbSettings(database_url: str, migration_database_url: str)`（pydantic-settings，读 `.env` 与环境变量）；`runtime_engine() -> Engine`（`lru_cache(maxsize=1)`，测试可用 `runtime_engine.cache_clear()` 重置）；`ping(engine: Engine) -> bool`；路由 `GET /readyz`（operation_id `system_readyz`）。

- [ ] **Step 1: 写 compose 文件**

`docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: platform_owner
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: platform
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U platform_owner -d platform']
      interval: 2s
      timeout: 3s
      retries: 20
```

- [ ] **Step 2: 写失败测试**

`tests/api/test_readyz.py`：

```python
import pytest
from fastapi.testclient import TestClient

from control_plane.app.shared.db import engine as engine_module


def test_readyz_reports_unreachable_db_as_problem(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://audit_rw:wrong@localhost:59999/platform"
    )
    engine_module.runtime_engine.cache_clear()
    resp = client.get("/readyz")
    engine_module.runtime_engine.cache_clear()
    assert resp.status_code == 503
    assert resp.headers["content-type"].startswith("application/problem+json")
    assert resp.json()["status"] == 503
```

- [ ] **Step 3: 跑测试确认失败**

Run: `uv run pytest tests/api/test_readyz.py -v`
Expected: FAIL（404，`/readyz` 不存在）。

- [ ] **Step 4: 实现**

`shared/db/settings.py`：

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class DbSettings(BaseSettings):
    """本地默认对齐 docker-compose；.env 与环境变量可覆盖，凭据不入库。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://audit_rw:localdev@localhost:5432/platform"
    migration_database_url: str = (
        "postgresql+psycopg://platform_owner:localdev@localhost:5432/platform"
    )
```

`shared/db/engine.py`：

```python
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text

from control_plane.app.shared.db.settings import DbSettings


@lru_cache(maxsize=1)
def runtime_engine() -> Engine:
    return create_engine(DbSettings().database_url, pool_pre_ping=True)


def ping(engine: Engine) -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
```

`bootstrap/app.py` 增加导入：

```python
from fastapi.responses import JSONResponse

from control_plane.app.shared.api.problem import problem_response
from control_plane.app.shared.db.engine import ping, runtime_engine
```

并在 `healthz` 之后加路由：

```python
    @app.get("/readyz", operation_id="system_readyz")
    async def readyz() -> JSONResponse | dict[str, str]:
        if ping(runtime_engine()):
            return {"status": "ready"}
        return problem_response(503, "Not ready", detail="database unreachable")
```

- [ ] **Step 5: 跑测试确认通过**

Run: `uv run pytest tests/api/test_readyz.py -v && uv run ruff format . && uv run ruff check . && uv run mypy .`
Expected: PASS（503 路径）。注意：`readyz=ready` 的在线路径此时还**不能**验证——runtime 用的 `audit_rw` 角色要到 Task 5 迁移才创建；ready 路径在 Task 5 Step 4 验证。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): settings, runtime engine and readyz probe with compose postgres"
```

---

### Task 5: Alembic 机制与 audit 基线迁移（schema/表/audit_rw 角色）

**Files:**
- Create: `alembic.ini`、`migrations/env.py`、`migrations/script.py.mako`、`migrations/audit/0001_audit_event.py`、`tests/integration/__init__.py`、`tests/integration/conftest.py`、`tests/integration/test_migration.py`

**Interfaces:**
- Consumes: `DbSettings`（Task 4）。
- Produces: `uv run alembic upgrade head` 可用；PG schema `audit`、表 `audit.audit_event`、角色 `audit_rw`（仅 `USAGE`+`SELECT/INSERT`）；集成测试夹具 `owner_engine`、`rw_engine`（不可用时自动 skip）。

- [ ] **Step 1: 写 Alembic 配置**

`alembic.ini`：

```ini
[alembic]
script_location = migrations
version_locations = migrations/audit
prepend_sys_path = .

[loggers]
keys = root

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
```

`migrations/env.py`：

```python
from alembic import context
from sqlalchemy import create_engine

from control_plane.app.shared.db.settings import DbSettings


def run_migrations_online() -> None:
    engine = create_engine(DbSettings().migration_database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
```

`migrations/script.py.mako`（Alembic 默认模板即可）：

```mako
"""${message}"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 2: 写基线迁移**

`migrations/audit/0001_audit_event.py`：

```python
"""audit baseline: schema, append-only audit_event, audit_rw role.

角色口令仅用于本地/CI（生产角色由基础设施子项目管理）。
"""

from alembic import op

revision = "0001_audit_event"
down_revision = None
branch_labels = ("audit",)
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS audit")
    op.execute(
        """
        CREATE TABLE audit.audit_event (
            id TEXT PRIMARY KEY,
            occurred_at TIMESTAMPTZ NOT NULL,
            actor TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            result TEXT NOT NULL,
            reason TEXT,
            correlation_id TEXT NOT NULL,
            schema_version INTEGER NOT NULL
        )
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_rw') THEN
                CREATE ROLE audit_rw LOGIN PASSWORD 'localdev';
            END IF;
        END $$
        """
    )
    op.execute("GRANT USAGE ON SCHEMA audit TO audit_rw")
    op.execute("GRANT SELECT, INSERT ON audit.audit_event TO audit_rw")


def downgrade() -> None:
    op.execute("REVOKE ALL ON audit.audit_event FROM audit_rw")
    op.execute("REVOKE USAGE ON SCHEMA audit FROM audit_rw")
    op.execute("DROP TABLE audit.audit_event")
    op.execute("DROP SCHEMA audit")
```

- [ ] **Step 3: 写集成测试（含自动 skip 夹具）**

`tests/integration/conftest.py`：

```python
import pytest
from sqlalchemy import Engine, create_engine, text

from control_plane.app.shared.db.settings import DbSettings


def _engine_or_skip(url: str) -> Engine:
    engine = create_engine(url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL 不可用：先 docker compose up -d 并 uv run alembic upgrade head")
    return engine


@pytest.fixture(scope="session")
def owner_engine() -> Engine:
    return _engine_or_skip(DbSettings().migration_database_url)


@pytest.fixture(scope="session")
def rw_engine() -> Engine:
    return _engine_or_skip(DbSettings().database_url)
```

`tests/integration/test_migration.py`：

```python
import pytest
from sqlalchemy import Engine, text

pytestmark = pytest.mark.integration


def test_audit_event_table_exists(owner_engine: Engine) -> None:
    with owner_engine.connect() as conn:
        exists = conn.execute(
            text(
                "SELECT EXISTS (SELECT FROM information_schema.tables "
                "WHERE table_schema = 'audit' AND table_name = 'audit_event')"
            )
        ).scalar_one()
    assert exists is True
```

- [ ] **Step 4: 执行迁移并跑测试**

Run: `docker compose up -d && uv run alembic upgrade head && uv run pytest tests/integration/test_migration.py -v`
Expected: 迁移成功；1 passed（无 DB 时应显示 skipped——可 `docker compose stop` 验证后再 `start`）。

再验证 `readyz` 在线 ready 路径（audit_rw 现已存在）：
`uv run uvicorn control_plane.app.bootstrap.app:create_app --factory --port 8000 &`，
`curl -s localhost:8000/readyz` 应返回 `{"status":"ready"}`，然后 `kill %1`。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(audit): alembic baseline with append-only table and audit_rw role"
```

---

### Task 6: audit 模块（Envelope、Port、Adapter、record）与追加式证明

**Files:**
- Create: `control_plane/app/modules/audit/{__init__.py,api/__init__.py,application/__init__.py,application/record_event.py,domain/__init__.py,domain/envelope.py,ports/__init__.py,ports/repository.py,adapters/__init__.py,adapters/sqlalchemy_repository.py}`、`tests/test_audit_unit.py`、`tests/integration/test_audit_append_only.py`

**Interfaces:**
- Consumes: `rw_engine` 夹具（Task 5）。
- Produces: 公开 Facade `control_plane.app.modules.audit` 导出 `AuditEnvelope`、`record`；`AuditEnvelope(actor: str, actor_type: str, action: str, target_type: str, target_id: str, result: str, correlation_id: str, reason: str | None = None)`，自动生成 `id: str`（uuid4）、`occurred_at: datetime`（UTC）、`schema_version: int = 1`；`AuditEventRepository`（Protocol，`append(envelope) -> None`）；`SqlAlchemyAuditEventRepository(engine: Engine)`；`record(envelope: AuditEnvelope, repository: AuditEventRepository) -> None`。

- [ ] **Step 1: 写失败的单元测试**

`tests/test_audit_unit.py`：

```python
from control_plane.app.modules.audit import AuditEnvelope, record


class FakeRepository:
    def __init__(self) -> None:
        self.appended: list[AuditEnvelope] = []

    def append(self, envelope: AuditEnvelope) -> None:
        self.appended.append(envelope)


def test_record_appends_envelope_with_generated_fields() -> None:
    repo = FakeRepository()
    envelope = AuditEnvelope(
        actor="00000000",
        actor_type="HUMAN",
        action="test.append",
        target_type="TEST",
        target_id="t-1",
        result="OK",
        correlation_id="corr-1",
    )
    record(envelope, repo)
    assert repo.appended == [envelope]
    assert envelope.id and envelope.schema_version == 1
    assert envelope.occurred_at.tzinfo is not None
```

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run pytest tests/test_audit_unit.py -v`
Expected: FAIL（`ModuleNotFoundError: control_plane.app.modules.audit`）。

- [ ] **Step 3: 实现**

`modules/audit/domain/envelope.py`：

```python
from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, Field


class AuditEnvelope(BaseModel):
    """08 的 Audit Envelope 业务摘要形状；绝不携带凭据或敏感值。"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    actor: str
    actor_type: str
    action: str
    target_type: str
    target_id: str
    result: str
    reason: str | None = None
    correlation_id: str
    schema_version: int = 1
```

`modules/audit/ports/repository.py`：

```python
from typing import Protocol

from control_plane.app.modules.audit.domain.envelope import AuditEnvelope


class AuditEventRepository(Protocol):
    def append(self, envelope: AuditEnvelope) -> None: ...
```

`modules/audit/adapters/sqlalchemy_repository.py`：

```python
from sqlalchemy import TIMESTAMP, Column, Engine, Integer, MetaData, Table, Text, insert

from control_plane.app.modules.audit.domain.envelope import AuditEnvelope

metadata = MetaData(schema="audit")

audit_event = Table(
    "audit_event",
    metadata,
    Column("id", Text, primary_key=True),
    Column("occurred_at", TIMESTAMP(timezone=True), nullable=False),
    Column("actor", Text, nullable=False),
    Column("actor_type", Text, nullable=False),
    Column("action", Text, nullable=False),
    Column("target_type", Text, nullable=False),
    Column("target_id", Text, nullable=False),
    Column("result", Text, nullable=False),
    Column("reason", Text),
    Column("correlation_id", Text, nullable=False),
    Column("schema_version", Integer, nullable=False),
)


class SqlAlchemyAuditEventRepository:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def append(self, envelope: AuditEnvelope) -> None:
        with self._engine.begin() as conn:
            conn.execute(insert(audit_event).values(**envelope.model_dump()))
```

`modules/audit/application/record_event.py`：

```python
from control_plane.app.modules.audit.domain.envelope import AuditEnvelope
from control_plane.app.modules.audit.ports.repository import AuditEventRepository


def record(envelope: AuditEnvelope, repository: AuditEventRepository) -> None:
    repository.append(envelope)
```

`modules/audit/__init__.py`（公开 Facade）：

```python
from control_plane.app.modules.audit.application.record_event import record
from control_plane.app.modules.audit.domain.envelope import AuditEnvelope

__all__ = ["AuditEnvelope", "record"]
```

其余 `__init__.py` 为空文件。

- [ ] **Step 4: 写追加式集成测试**

`tests/integration/test_audit_append_only.py`：

```python
import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import ProgrammingError

from control_plane.app.modules.audit import AuditEnvelope, record
from control_plane.app.modules.audit.adapters.sqlalchemy_repository import (
    SqlAlchemyAuditEventRepository,
)

pytestmark = pytest.mark.integration


def _envelope() -> AuditEnvelope:
    return AuditEnvelope(
        actor="00000000",
        actor_type="HUMAN",
        action="test.append",
        target_type="TEST",
        target_id="t-1",
        result="OK",
        correlation_id="corr-1",
    )


def test_record_persists_via_rw_role(rw_engine: Engine) -> None:
    envelope = _envelope()
    record(envelope, SqlAlchemyAuditEventRepository(rw_engine))
    with rw_engine.connect() as conn:
        actor = conn.execute(
            text("SELECT actor FROM audit.audit_event WHERE id = :id"), {"id": envelope.id}
        ).scalar_one()
    assert actor == "00000000"


def test_update_is_denied_by_role(rw_engine: Engine) -> None:
    with rw_engine.connect() as conn:
        with pytest.raises(ProgrammingError, match="permission denied"):
            conn.execute(text("UPDATE audit.audit_event SET result = 'TAMPERED'"))


def test_delete_is_denied_by_role(rw_engine: Engine) -> None:
    with rw_engine.connect() as conn:
        with pytest.raises(ProgrammingError, match="permission denied"):
            conn.execute(text("DELETE FROM audit.audit_event"))
```

- [ ] **Step 5: 跑全部测试**

Run: `uv run pytest -v && uv run ruff format . && uv run ruff check . && uv run mypy .`
Expected: 单元 + 集成全部 PASS（追加成功、UPDATE/DELETE 均 permission denied）。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(audit): envelope, port, sqlalchemy adapter and append-only proof"
```

---

### Task 7: import-linter 边界契约

**Files:**
- Modify: `pyproject.toml`

**Interfaces:**
- Produces: `uv run lint-imports` 通过；三类契约生效（层内单向、模块间仅 Facade、shared 无业务）。

- [ ] **Step 1: 写契约配置**

`pyproject.toml` 追加：

```toml
[tool.importlinter]
root_packages = ["control_plane"]

[[tool.importlinter.contracts]]
name = "模块分层单向：api → application → ports → domain"
type = "layers"
layers = ["api", "application", "ports", "domain"]
containers = [
  "control_plane.app.modules.identity",
  "control_plane.app.modules.audit",
]
exhaustive = false

[[tool.importlinter.contracts]]
name = "identity 不得进入 audit 内部（仅公开 Facade）"
type = "forbidden"
source_modules = ["control_plane.app.modules.identity"]
forbidden_modules = [
  "control_plane.app.modules.audit.api",
  "control_plane.app.modules.audit.application",
  "control_plane.app.modules.audit.domain",
  "control_plane.app.modules.audit.ports",
  "control_plane.app.modules.audit.adapters",
]

[[tool.importlinter.contracts]]
name = "audit 不得进入 identity 内部（仅公开 Facade）"
type = "forbidden"
source_modules = ["control_plane.app.modules.audit"]
forbidden_modules = [
  "control_plane.app.modules.identity.api",
  "control_plane.app.modules.identity.application",
  "control_plane.app.modules.identity.domain",
  "control_plane.app.modules.identity.ports",
  "control_plane.app.modules.identity.adapters",
]

[[tool.importlinter.contracts]]
name = "shared 不依赖 modules（shared 无业务）"
type = "forbidden"
source_modules = ["control_plane.app.shared"]
forbidden_modules = ["control_plane.app.modules"]
```

- [ ] **Step 2: 跑契约确认通过**

Run: `uv run lint-imports`
Expected: `Contracts: 4 kept, 0 broken.`

- [ ] **Step 3: 篡改验证（证明契约真的会红）**

在 `control_plane/app/shared/api/problem.py` 顶部临时加一行 `from control_plane.app.modules.identity.domain.models import Principal  # noqa: F401`，再跑 `uv run lint-imports`。
Expected: `1 broken`（shared 契约违规）。**验证后删除该行**，重跑确认 `4 kept, 0 broken`。

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml
git commit -m "chore(arch): enforce module boundaries with import-linter contracts"
```

---

### Task 8: OpenAPI 导出链（openapi.json 入库 + 一致性校验）

**Files:**
- Create: `scripts/__init__.py`（空）、`scripts/export_openapi.py`、`openapi.json`（由脚本生成）、`tests/test_openapi_export.py`
- Modify: `pyproject.toml`（`[tool.mypy] files` 加回 `"scripts"`——目录自本任务起存在）

**Interfaces:**
- Consumes: `create_app()`（Task 2）。
- Produces: `uv run python scripts/export_openapi.py` 写出 `openapi.json`；`--check` 模式在不一致时退出码 1；`openapi.json` 的 `info.version == "0.1.0"`。

- [ ] **Step 1: 写失败测试**

`tests/test_openapi_export.py`：

```python
import subprocess
import sys

from control_plane.app import __version__
from scripts.export_openapi import render


def test_render_is_deterministic_and_versioned() -> None:
    first, second = render(), render()
    assert first == second
    assert f'"version": "{__version__}"' in first


def test_check_mode_passes_after_export() -> None:
    subprocess.run([sys.executable, "scripts/export_openapi.py"], check=True)
    result = subprocess.run([sys.executable, "scripts/export_openapi.py", "--check"])
    assert result.returncode == 0
```

- [ ] **Step 2: 跑测试确认失败**

Run: `uv run pytest tests/test_openapi_export.py -v`
Expected: FAIL（`ModuleNotFoundError: scripts.export_openapi`）。

- [ ] **Step 3: 实现**

`scripts/export_openapi.py`：

```python
"""导出 OpenAPI Artifact：默认写 openapi.json；--check 校验入库文件与代码一致。"""

import json
import sys
from pathlib import Path

from control_plane.app.bootstrap.app import create_app

OUT = Path(__file__).resolve().parents[1] / "openapi.json"


def render() -> str:
    return json.dumps(create_app().openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    content = render()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != content:
            print(
                "openapi.json 与代码不一致：运行 uv run python scripts/export_openapi.py",
                file=sys.stderr,
            )
            return 1
        print("openapi.json 与代码一致")
        return 0
    OUT.write_text(content, encoding="utf-8")
    print(f"openapi.json 已导出（version={create_app().version}）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: 导出并跑测试**

Run: `uv run python scripts/export_openapi.py && uv run pytest tests/test_openapi_export.py -v`
Expected: 生成 `openapi.json`；2 passed。

- [ ] **Step 5: 篡改验证**

手动把 `openapi.json` 里任意 description 改一个字，跑 `uv run python scripts/export_openapi.py --check`，Expected: 退出码 1；然后重新导出恢复一致。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(openapi): committed artifact export with drift check"
```

---

### Task 9: CI 工作流与仓库 AGENTS.md

**Files:**
- Create: `.github/workflows/ci.yml`、`AGENTS.md`

**Interfaces:**
- Consumes: Task 1–8 的全部命令。
- Produces: push/PR 全链验证；`api-v*` tag 自动发布带 SHA-256 的 Release Artifact。

- [ ] **Step 1: 写 CI**

`.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
    tags: ['api-v*']
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: platform_owner
          POSTGRES_PASSWORD: localdev
          POSTGRES_DB: platform
        ports:
          - '5432:5432'
        options: >-
          --health-cmd "pg_isready -U platform_owner -d platform"
          --health-interval 2s --health-timeout 3s --health-retries 20
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run ruff format --check .
      - run: uv run ruff check .
      - run: uv run mypy .
      - run: uv run lint-imports
      - run: uv run alembic upgrade head
      - run: uv run pytest -v
      - run: uv run python scripts/export_openapi.py --check

  release:
    if: startsWith(github.ref, 'refs/tags/api-v')
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run python scripts/export_openapi.py --check
      - env:
          TAG: ${{ github.ref_name }}
          GH_TOKEN: ${{ github.token }}
        run: |
          shasum -a 256 openapi.json > openapi.json.sha256
          gh release create "$TAG" openapi.json openapi.json.sha256 --title "$TAG" --notes "OpenAPI Artifact $TAG"
```

- [ ] **Step 2: 写 AGENTS.md**

`AGENTS.md`：

```markdown
# Repository Guidelines

## 项目结构与模块组织

本仓是内部研发平台的 Python Control Plane（模块化单体），结构以
`engineering-platform` 仓 `docs/architecture/06-platform-application-integration.md` 为准：
`control_plane/app/bootstrap/` 负责装配，`control_plane/app/shared/{api,db,observability}/`
是无业务基建，领域模块在 `control_plane/app/modules/<module>/`，模块内固定五层
`api/ application/ domain/ ports/ adapters/`。模块间只允许使用对方包根的公开 Facade；
边界由 import-linter 契约强制（`uv run lint-imports`），禁止绕过。迁移在 `migrations/`
按模块分目录；测试在 `tests/`（集成测试标记 `integration`）。

## 构建、测试与开发命令

- `uv sync`：安装依赖（CI 使用 `--frozen`）。
- `docker compose up -d`：启动本地 PostgreSQL 18。
- `uv run alembic upgrade head`：执行迁移。
- `uv run uvicorn control_plane.app.bootstrap.app:create_app --factory --reload`：本地起服务。
- `uv run pytest`：全部测试；无 DB 时集成测试自动 skip。
- `uv run ruff format . && uv run ruff check . && uv run mypy . && uv run lint-imports`：质量门。
- `uv run python scripts/export_openapi.py`：更新 `openapi.json`（`--check` 校验一致性，改路由后必须重导出并提交）。

## API 与数据约定

JSON 一律 camelCase（DTO 继承 `shared/api/camel.py` 的 `CamelModel`）；ID 一律 string；
前缀 `/api/v1`；错误统一 `application/problem+json`（RFC 9457），无 `{code,data,message}`
信封；分页 cursor 型 `{items, nextCursor}`、写并发 `If-Match`/ETag、变更命令
`Idempotency-Key` 自 V0.2 首个真实接口起强制。`info.version` 单源于
`control_plane/app/__init__.py`。审计表追加式由 `audit_rw` 权限保证，绝不授予
UPDATE/DELETE；Alembic 用 owner 账号执行 DDL，应用运行时只用受限角色。

## OpenAPI Artifact 发布

`openapi.json` 是入库的唯一导出，CI 校验与代码一致。正式发布打 `api-vX.Y.Z` tag，
CI 将构件与 SHA-256 附到 GitHub Release；breaking 变更必须升 major（前端仓
`openapi:check` 以 git 基线强制）。

## 提交与 Pull Request 规范

线性历史、Conventional Commits（如 `feat(identity): ...`），每次提交单一主题。
依赖、迁移或 CI 变更必须在提交信息中明确标注。禁止提交凭据；`.env` 仅本地。
```

- [ ] **Step 3: 提交并推送触发 CI**

```bash
git add -A
git commit -m "ci: verify pipeline with postgres service and api-v* release job"
git push origin main
```

在 GitHub Actions 页面确认 `verify` job 全绿（或 `gh run watch`）。

---

### Task 10: 前端联调闭环（file: 通道）

**Files:**（在前端仓 `/Users/liulijun/tongyi/unif-code/engineering-platform`）
- Modify: `openapi/artifact.lock.json`
- Create（由工具生成）: `openapi/spec.json`、`src/services/generated/{schema.d.ts,client.ts,index.ts,ARTIFACT.json}`（删除 `.gitkeep`）

**Interfaces:**
- Consumes: 后端仓根的 `openapi.json`（Task 8）。
- Produces: 前端 `openapi:fetch/generate/check` 与含生成 client 的 `tsc` 全绿；生成的 `api` 客户端可供 features 使用。

- [ ] **Step 1: 锁定构件（file: 通道）**

```bash
cd /Users/liulijun/tongyi/unif-code/engineering-platform
DIGEST=$(shasum -a 256 ../engineering-platform-backend/openapi.json | cut -d' ' -f1)
node -e "require('fs').writeFileSync('openapi/artifact.lock.json', JSON.stringify({source:'file:../engineering-platform-backend/openapi.json', version:'0.1.0', sha256:'$DIGEST'}, null, 2) + '\n')"
```

- [ ] **Step 2: 取回、生成、校验**

Run: `pnpm openapi:fetch && pnpm openapi:generate && pnpm openapi:check`
Expected: 三步全绿；`src/services/generated/` 出现 `schema.d.ts`、`client.ts`、`index.ts`、`ARTIFACT.json`。

- [ ] **Step 3: 全量验证**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: 全绿（lint 含 openapi:check 与 baseline:check）。

- [ ] **Step 4: Commit（前端仓）**

```bash
git add openapi/ src/services/generated/
git commit -m "feat(services): pin first backend OpenAPI artifact (file channel)"
```

---

### Task 11: 正式 Release 通道（api-v0.1.0 tag）

**Files:**
- Modify（视仓库可见性）: 前端 `openapi/artifact.lock.json`

**Interfaces:**
- Consumes: Task 9 的 release job。
- Produces: GitHub Release `api-v0.1.0` 带 `openapi.json` + `openapi.json.sha256`；仓库为 public 时前端 lock 切换 URL 通道。

- [ ] **Step 1: 打 tag 触发发布**

```bash
cd /Users/liulijun/tongyi/unif-code/engineering-platform-backend
git tag api-v0.1.0
git push origin api-v0.1.0
gh run watch
```

Expected: `verify` 与 `release` job 全绿，Release `api-v0.1.0` 出现两个 asset。

- [ ] **Step 2: 校验 Release 资产摘要**

```bash
gh release download api-v0.1.0 --dir /tmp/api-v010 --clobber
shasum -a 256 -c <(cut -d' ' -f1 /tmp/api-v010/openapi.json.sha256 | sed 's|$|  /tmp/api-v010/openapi.json|')
```

Expected: `OK`。

- [ ] **Step 3: 视可见性切换前端 lock 到 URL 通道**

```bash
gh repo view unif-code/engineering-platform-backend --json visibility -q .visibility
```

若输出 `PUBLIC`：把前端 `openapi/artifact.lock.json` 的 `source` 改为
`https://github.com/unif-code/engineering-platform-backend/releases/download/api-v0.1.0/openapi.json`（version/sha256 不变），重跑 `pnpm openapi:fetch && pnpm openapi:check`，Expected 全绿后在前端仓提交 `chore(services): switch artifact lock to release URL`。
若输出 `PRIVATE`：保持 file: 通道（脚本的 https 取回不带认证，私有 Release 无法匿名下载），在最终汇报中注明"URL 通道待仓库公开或为 fetch 增加认证支持后启用"——这是 spec 验收标准 6 的既定条件分支。

- [ ] **Step 4: 汇报收尾**

向用户汇报：四端点、audit 追加式证明、契约与导出链、双仓闭环结果，以及 Task 11 Step 3 走了哪个分支。
