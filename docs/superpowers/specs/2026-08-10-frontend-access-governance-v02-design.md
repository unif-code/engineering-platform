# V0.2 访问治理闭环 · 前端设计

- 日期：2026-08-10　状态：设计已批准，待实施计划
- 仓库：`engineering-platform`　对应后端 spec：`engineering-platform-backend` 仓 `docs/superpowers/specs/2026-08-10-backend-access-governance-v02-design.md`
- 契约依据：架构仓 `architecture/{01,06,12}`；接口形状以后端 spec 的 API 面为准，最终以 `api-v0.2.0` OpenAPI Artifact 冻结

## 目标

登录、初始化、Session 管理与动态导航全部真实化；`/admin` 提供账号、组织、Workspace、Grant、Policy 发布与审计查询六个管理页；可见性只做体验（RouteGuard/菜单），授权结论永远来自服务端。UI 全量可先行（mock 驱动），`api-v0.2.0` 发布后锁定构件切 generated client。

## 范围

### 认证与 Session（features/auth 真实化）

- 登录页两步流：员工号+密码 → TOTP 码；错误按 Problem Details 呈现（退避提示直接展示服务端返回的等待信息，不在前端计时推算）。
- **Bootstrap 初始化向导**（新路由 `/bootstrap`）：临时密码登录 → 设正式密码（实时校验 15~64/复杂度，规则文案与服务端一致）→ TOTP 绑定（渲染 provisioning URI 二维码 + 手输 fallback）→ 确认完成 → 引导重新登录。中断可重来（需重新签发临时密码的提示文案）。
- Session 过期/撤销：401 统一拦截 → 清 Initial State → 跳登录并带回跳参数；登出按钮调 `/auth/logout`。

### Session Bootstrap 链（06 契约）

- Initial State 改为调 generated client 的 `me` + `navigation`（构件锁定前走 mock，形状按后端 spec 冻结）。
- 动态菜单：按 `navigation` 投影（routeKey/排序/元数据）渲染；RouteGuard 以 routeKey+capability 控制路由可达性——纯体验层，页面内敏感动作仍以服务端响应为准。
- 静态 Route Registry：routeKey → 组件映射表；后端不下发路径或组件。

### `/admin` 管理区六页（features/administration）

| 页面 | 关键交互 |
| --- | --- |
| 账号 | ProTable 列表 + 创建（成功弹一次性临时密码，明示"仅此一次"）+ 重置密码/启停/TOTP 重置（均带确认与原因输入） |
| 组织 | 树形展示 + 设置上级（经理/Leader 归属）操作，变更前置校验错误按 Problem 呈现 |
| Workspace | 列表 + 创建 + Leader 邀请/移除 + Owner 转让 + 成员投影只读查看 |
| Grant | 列表（按 principal/capability 过滤）+ 授予/撤销（带原因） |
| Policy 发布 | catalog+当前值 → Draft 编辑（ETag 并发冲突提示）→ Validate/Preview（前后值对照表）→ Publish 弹 TOTP Challenge + 原因 → 结果反馈；Rollback 从版本历史发起 |
| 审计 | 时间/actor/target 过滤 + cursor 分页列表，展示 requestId 便于关联排查 |

### transport 增强（src/services/transport）

- 401/403 归一：401 触发登出流程；403 透出 Problem detail。
- 写请求自动附 `Idempotency-Key`（uuid，per 调用生成）与 CSRF 相关行为配合（cookie 走 SameSite，浏览器自动带 Origin）。
- `If-Match`/ETag 透传辅助（Policy Draft 编辑用）。
- `requestId` 从错误中提取并在全局错误提示里展示。

## Mock 与联调节奏（沿 V0.1 模式）

1. 依据后端 spec 冻结的接口形状先写 `mock/`（含错误分支：401/403/409/422、退避、TOTP 失败）。
2. 全部 UI 按 mock 开发、测试跑绿——**不等后端**。
3. 后端发 `api-v0.2.0` → `openapi/artifact.lock.json` 重新锁定 → `openapi:generate` → Initial State 与各页切 generated client，mock 仅留本地开发兜底。
4. 前置依赖：V0.1 的 Task 10（首次锁定链）须先完成。

## 测试策略

Testing Library 行为测试：登录两步流（含错误/退避文案）、Bootstrap 向导逐步推进与中断、401 拦截跳转、菜单按 navigation 数据渲染、RouteGuard 拒绝未授权 routeKey、六管理页关键交互（创建账号弹临时密码、Publish 的 TOTP 弹窗、ETag 冲突提示）、audit 分页。mock 层校验请求带 Idempotency-Key/If-Match。

## 验收标准

1. `pnpm lint` / `pnpm test` / `pnpm build` 全绿。
2. mock 模式端到端可走：初始化向导 → 登录 → 动态菜单 → 六管理页操作 → 审计可查。
3. 构件锁定后：generated client 接管全部接口调用，mock 不再被生产路径引用。
4. UI 截图随 PR（登录、向导、Policy 发布 TOTP 弹窗、审计页）。

## 非目标

Chat/SDD 界面（V0.3）、Agent/运行页真实化（V0.4）、Passkey、协作关系管理、Workspace Policy Override、Operations Read Model/Console。
