# V0.1 前端外壳设计（engineering-platform）

日期：2026-08-09
状态：已确认
范围：`engineering-platform` 仓库（本仓）
依据：架构基线 `2026-08-09.1`、[12 实施路线图](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/12-implementation-roadmap.md)的 V0.1 范围、[06 平台应用与集成](https://github.com/unif-code/engineering-platform-docs/blob/main/architecture/06-platform-application-integration.md)的前端结构与状态边界、后端骨架 spec（[2026-08-09-backend-skeleton-v01-design.md](./2026-08-09-backend-skeleton-v01-design.md)）

## 背景与定位

V0.1 三子项目之二。与 ①（后端骨架）的接口只有 API 形状契约：`me`/`navigation` 的响应形状、camelCase、Problem Details 已在 ① 中冻结，本子项目的 mock 逐字段照抄；① 的 `openapi.json` 落地后，由本子项目 owner 执行后端计划的 Task 10/11（file: 通道锁定与生成），切换点收敛在 feature 的 service 文件——保持"一个仓库一个写入者"。

已确认的决策：

| 决策点 | 结论 |
| --- | --- |
| 登录页 | 纳入外壳（纯 mock，不接真实认证）；V0.2 只换数据源不重写 UI |
| 守卫机制 | 路由级 `wrappers`（`RouteGuard`），不用 Umi access 插件——access/可见性语义留给 V0.2 真授权 |
| Bootstrap 数据 | `getInitialState` 启动时拉 `me`+`navigation` 入 Initial State（06 的状态边界），React Query 留给后续业务数据 |
| 依赖方向 | dependency-cruiser 固化 `pages → features → services/generated` 等规则，进 `pnpm lint` 链 |

## 目标与非目标

**目标**：完整的未登录 → 登录页 → 主布局路径；`/home`、`/admin`、`/login` 三路由与菜单；`features/{auth,navigation}` 公开入口机制；mock 数据面与后端形状逐字段一致；依赖方向架构测试。

**非目标**：真实认证、Session、TOTP 校验与服务端授权（V0.2）；`@ant-design/x` 对话界面（V0.3）；Workspace 与业务页面；暗色主题等视觉增强。

## 结构

```text
src/
├── pages/
│   ├── Login/index.tsx        # 员工编号(8位数字) + 密码 + TOTP(6位) 的 ProForm
│   ├── Home/…                 # 既有骨架页，接入导航
│   └── Admin/…                # 既有骨架页，接入导航
├── features/
│   ├── auth/
│   │   ├── index.ts           # 公开入口：RouteGuard、login()、useCurrentUser()
│   │   ├── RouteGuard.tsx     # 未登录 → <Navigate to="/login" />
│   │   └── service.ts         # 数据缝：login/me 的取数（今天 mock，之后 generated api）
│   └── navigation/
│       ├── index.ts           # 公开入口：getNavigation()
│       └── service.ts         # 数据缝：navigation 取数
├── app.ts                     # getInitialState 拉 me+navigation；layout 从 Initial State 出菜单
└── mock/api.ts                # /api/v1/me、/api/v1/navigation、/api/v1/auth/login
```

- 路由：`/login` 公开；`/`、`/home`、`/admin` 挂 `wrappers: ['@/features/auth/RouteGuard']`。
- Initial State 形状：`{ me?: { employeeId: string; name: string }, navigation: Array<{ routeKey: string; name: string; order: number }> }`——与 ① 的 `Principal`/`NavigationItem` 逐字段一致。
- 登录 mock 语义：格式合法（8 位数字编号、非空密码、6 位 TOTP）即成功，写入 Initial State 并跳 `/home`；无任何真实校验，页面标注 stub。
- 菜单：layout 运行时配置从 Initial State 的 `navigation` 渲染（routeKey → path 映射 home→/home、admin→/admin），排序按 `order`。

## 数据缝与切换规则

- 取数只发生在 `features/*/service.ts`；今天用 `fetch('/api/v1/…')` 走 umi mock（dev）/代理。
- ① 的 Task 8 落地后：本子项目 owner 执行后端计划 Task 10（file: 锁定 + 生成），把 service.ts 换成 `import { api } from '@/services/generated'`；hooks、组件、页面零改动。
- 错误形状按 transport 的 `ApiError`/Problem Details 约定；mock 的失败响应也用 `application/problem+json` 形状。

## 依赖方向架构测试

devDep 增加 dependency-cruiser，规则（进 `pnpm lint` 链）：

1. `src/pages` 只可依赖 `src/features`、`src/components` 与全局工具目录，禁止直达 `src/services`。
2. `src/features/<a>` 禁止导入 `src/features/<b>` 的内部文件（仅允许 `features/<b>` 包根公开入口）。
3. `src/components` 禁止依赖 `src/features` 与 `src/services`。
4. `src/services/transport` 禁止依赖 `src/features`、`src/pages`。

## 测试与 V0.1 Gate 对应

- 登录表单校验测试（编号/TOTP 格式错误不提交、合法输入触发 login）。
- RouteGuard 测试（无 me 渲染重定向、有 me 渲染子节点）。
- 菜单渲染测试（navigation 数据按 order 出现在文档中）。
- 既有 Home/Admin 渲染测试保留。
- Gate 证据：`pnpm build` 产物含 `/login`、`/home`、`/admin` 路由 chunk（页面 Smoke）；`pnpm lint` 含依赖方向检查。

## 验收标准

1. 未登录访问 `/home` 或 `/admin` 重定向 `/login`；mock 登录后进入 `/home`，菜单显示"首页/管理后台"且顺序正确。
2. mock 响应形状与 ① 的 `openapi.json` 对应 DTO 逐字段一致（camelCase）。
3. dependency-cruiser 规则生效：人为制造 `pages → services` 直连导入，`pnpm lint` 必须红。
4. 全量门（lint/test/build）绿；新增测试全部通过。
5. ① Task 8 完成后，切换 generated client 只改动 `features/*/service.ts` 与锁定/生成文件，页面与 hooks 零改动（切换动作即后端计划 Task 10/11，由本子项目 owner 执行）。
