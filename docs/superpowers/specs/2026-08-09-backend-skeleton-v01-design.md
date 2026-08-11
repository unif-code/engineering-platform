# V0.1 后端仓骨架设计（engineering-platform-backend）

日期：2026-08-09
状态：已确认
范围：`engineering-platform-backend` 仓库（github.com/unif-code/engineering-platform-backend，现为空仓）
依据：架构基线 `2026-08-09.1`（[baseline-manifest.json](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/baseline-manifest.json)）、[12 实施路线图](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/12-implementation-roadmap.md)的 V0.1 范围、[06 平台应用与集成](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/06-platform-application-integration.md)的 Control Plane 结构

## 背景与定位

V0.1 拆为三个子项目分别走 spec → plan → 实现：**后端仓骨架（本 spec）**、前端外壳（engineering-platform）、DEV 基础设施。后端骨架是关键路径：它产出首个 OpenAPI Artifact 解锁前端真实 API，V0.1 Release Gate 的 API/DB Smoke 也依赖它。

已确认的决策：

| 决策点 | 结论 |
| --- | --- |
| 骨架铺开程度 | 竖切优先：只建 V0.1 真实触碰的 shared 基建 + identity、audit 两个真模块；其余六模块（organization、workspace、authorization、configuration、requirement_workflow、agent_run）等对应里程碑再建，模块机制由范例与架构测试固化 |
| V0.1 API 面 | health/readiness + `me`/`navigation` 技术性 stub（无认证语义，V0.2 原地替换实现、Schema 兼容演进） |
| 托管与 CI | GitHub unif-code 组织（空仓与 remote 已存在），GitHub Actions |
| 既定规范 | 无公司后端模板，按 06 契约自定；工具链取 Python 社区主流 |

## 目标与非目标

**目标**：可重现构建的 FastAPI 模块化单体骨架；四个端点；Audit 追加式机制基线；OpenAPI Artifact 发布链（与前端仓 `openapi:fetch/generate/check` 闭环）；由 import-linter 固化的模块边界。

**非目标**：真实认证、Session、账号与授权（V0.2）；其余六个领域模块；Temporal/NATS/Valkey/OpenBao 接入（各自随 Capability 首次消费激活）；Kubernetes/Flux 部署与备份恢复（DEV 基础设施子项目）；分页/ETag/幂等约定的强制执行（V0.1 只写入约定，V0.2 首个真实接口起强制）。

## 结构与工具链

运行时与框架按 06：Python 3.12、FastAPI、Pydantic 2、SQLAlchemy 2、Alembic。工具链：uv（依赖与 `uv.lock`，对应"版本锁定的构建输入"）、ruff（lint + format）、mypy strict、pytest、import-linter。

```text
engineering-platform-backend/
├── AGENTS.md                    # 仓库开发规范（中文，对齐前端仓风格）
├── pyproject.toml / uv.lock
├── openapi.json                 # 提交入库的 OpenAPI 导出（CI 校验与代码一致）
├── docker-compose.yml           # 仅 PostgreSQL 18（对齐 PCS 大版本）
├── .github/workflows/ci.yml
└── control_plane/
    └── app/
        ├── bootstrap/           # 应用装配：FastAPI 实例、路由挂载、异常处理器、配置读取
        ├── shared/
        │   ├── api/             # Problem Details 模型与异常处理器、公共 DTO 基类
        │   ├── db/              # SQLAlchemy engine/session、Alembic env 机制
        │   └── observability/   # 结构化 JSON 日志、request-id/traceparent 中间件
        │                        #（shared/security 等 V0.2 认证落地时再建，竖切原则不留空壳）
        └── modules/
            ├── identity/        # api/ application/ domain/ ports/ adapters/
            │                    #   me、navigation stub（V0.1 无数据库表）
            └── audit/           # api/ application/ domain/ ports/ adapters/
                                 #   audit_event 追加表、Envelope、AuditPort
```

分层语义（06）：`api/` HTTP DTO 与路由、`application/` 用例与事务、`domain/` 实体与事件、`ports/` 接口、`adapters/` 实现。模块间只许调用公开 Facade；`shared` 不承载业务规则。这三条边界全部写成 import-linter contract 进 CI——边界由自动化证明，不靠约定自觉。

## API 面与全局约定

V0.1 端点：

| 端点 | 语义 |
| --- | --- |
| `GET /healthz` | 存活探针，无依赖 |
| `GET /readyz` | 就绪探针，含 PostgreSQL 连通检查 |
| `GET /api/v1/me` | 固定技术性 Principal（如 `employeeId="00000000"`、`name="V0.1 Stub"`），标注 stub 语义 |
| `GET /api/v1/navigation` | 固定导航数据（routeKey、名称、排序），与前端静态 Route Registry 对应 |

`me`/`navigation` 归属 identity 模块（其自然 owner），V0.2 以真实 Session/授权原地替换实现，响应 Schema 保持兼容演进。

全局 API 约定随首个 Artifact 定死（闭掉"首个真实 API Slice 前定全局约定"残留）：

- JSON 字段一律 camelCase；ID 一律 string；API 前缀 `/api/v1`。
- 错误统一 RFC 9457 `application/problem+json`：全局异常处理器归一，覆盖业务异常、422 校验错误映射、未知路由 404 的 Problem 形状；无 `{code,data,message}` 信封。
- 分页 cursor 型 `{items, nextCursor}`；写并发 `If-Match`/ETag；变更命令 `Idempotency-Key` header。三者 V0.1 写入 OpenAPI 描述作为约定，V0.2 首个真实列表/写接口起强制执行。
- `info.version` 单源于包版本常量；operationId 规范化（`<module>_<action>`），保证前端生成类型可读。

## 数据、迁移与 Audit 基线

- 本地运行：`docker compose` 只提供 PostgreSQL 18，应用 uvicorn 直跑；`.env` 仅本地、不入库。
- Alembic：单 env、按模块划分 version location（07 "每模块独立迁移目录"的机制），V0.1 仅 `audit` 一条分支。
- 每模块独立 Schema 与账号的机制样板：建 PG schema `audit` 与角色 `audit_rw`，只授该 schema 的 `INSERT/SELECT`——不授 `UPDATE/DELETE`，**追加式由数据库权限层保证**。DDL 与 DML 分离：Alembic 迁移以 schema owner 角色执行，应用运行时只用受限的 `audit_rw`（07 的"Runtime Role 只做 DML、Schema 由 DDL 通道管理"在本地的最小体现）。
- `audit_event` 表列即 08 Envelope 摘要形状：`id`、`occurredAt`、`actor`、`actorType`、`action`、`targetType`、`targetId`、`result`、`reason`（可空）、`correlationId`、`schemaVersion`；绝不写入凭据或敏感值。
- 应用内 `AuditPort.record()`；V0.1 不虚构业务触发器，交付机制及其证明（集成测试验证追加成功、`UPDATE/DELETE` 被权限拒绝），真实触发器随 V0.2 身份事件接入。

## OpenAPI Artifact 发布链

- `openapi.json` 提交在仓库根，是唯一入库导出；CI 每次校验"代码导出 == 提交文件"（后端侧 dirty-diff，与前端 `openapi:check` 呼应）。
- 本地联调：`uv run` 任务导出后，前端 lock 走 `file:` 通道。
- 正式发布：打 `api-vX.Y.Z` tag → GitHub Actions 将 `openapi.json` 与其 SHA-256 附到 GitHub Release；前端 `openapi/artifact.lock.json` 指向 Release asset URL。
- 版本纪律两端闭环：breaking 变更必须升 major（前端 check 以 git 基线验证），内容变化必须变 `info.version`（前端 fetch 验证）。

## 质量门、测试与 CI

- 单元测试：domain/application 纯 pytest。
- API 测试：httpx TestClient 覆盖四端点与 Problem Details 归一（422 映射、未知路由 404 形状）。
- 集成测试：真实 PostgreSQL（CI service container `postgres:18`，本地 compose）验证 `readyz` 与 audit 追加式机制。
- 架构测试：import-linter 三类契约（层内单向、模块间仅 Facade、shared 无业务）进 CI，违规即红。
- CI（GitHub Actions）：`uv sync --frozen` → ruff → mypy → pytest（含 PG 集成）→ import-linter → OpenAPI 导出一致性；`api-v*` tag 触发 Release 发布 job。

## 与 V0.1 Release Gate 的对应

本子项目交付 Gate 的代码侧证据：可重现构建（`uv.lock` + CI frozen 安装）、API/DB Smoke（四端点 + audit 集成测试）、Audit 接入（机制 + 测试）、版本锁定构建输入（锁文件 + 入库 `openapi.json`）。Flux 链路、备份真实恢复、单节点容量测量属 DEV 基础设施子项目；前端页面 Smoke 属前端外壳子项目——三份 spec 合并覆盖完整 V0.1 验收面。

## 验收标准

1. 空仓一条 `git clone` + `uv sync --frozen` + `docker compose up -d` + 测试命令即可全绿（可重现）。
2. 四端点行为与 Problem Details 归一有测试覆盖；`audit_event` 追加式由权限层保证并有集成测试证明。
3. import-linter 契约生效：人为制造跨层/跨模块导入，CI 必须红。
4. `openapi.json` 与代码一致性校验生效：改路由不重导出，CI 必须红。
5. 前端仓以 `file:` 通道锁定本仓导出的 Artifact 后，`openapi:fetch/generate/check` 与含生成 client 的 `tsc` 全绿。
6. 打 `api-v0.1.0` tag 产出带 SHA-256 的 GitHub Release asset，前端 lock 切换为 URL 通道后同样全绿。
