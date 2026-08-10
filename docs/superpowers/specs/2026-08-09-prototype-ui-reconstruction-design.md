# 内部研发平台 · 原型视觉重构设计

日期：2026-08-09

状态：已确认

范围：`engineering-platform` 前端仓库

原型来源：本地 Claude Design handoff bundle `untitled/project/研发协作平台.dc.html`

## 1. 背景与决策

当前 V0.1 已具备登录、Session Bootstrap、路由守卫、动态菜单和 `pages → features → services` 数据边界，但 `/home` 与 `/admin` 仍是占位页面，整体视觉也未形成统一产品语言。

本轮使用原型作为**界面样式参考**，重建全部页面的静态 UI 骨架。原型中的业务流程、权限模拟、角色切换、Agent 执行、Chat、审批状态机和模型调用均不作为实现依据。现有登录、Session、Initial State、路由守卫、信封解包与数据分层继续作为唯一逻辑事实源。

已确认的关键决策：

| 决策点 | 结论 |
| --- | --- |
| 实现方案 | 共享设计基线 + 独立页面模块，使用 Ant Design token 和 ProComponents 重建，不翻译原型内部实现 |
| 页面范围 | 原型全部用户端与管理端页面均建立独立路由和静态 UI 骨架 |
| 交互范围 | 路由、主题、Tab、Segmented、Modal、Drawer、筛选外观和按钮反馈可用；不模拟真实业务状态机 |
| 适配范围 | 桌面优先，支持 1280px 及以上；侧栏可折叠 |
| 主题 | `system | light | dark`；首次跟随系统，手动选择后写入 localStorage，可恢复跟随系统 |
| 登录 | 仅重构现有员工编号 + 密码 + TOTP 登录视觉，不加入首次初始化、重置密码或 TOTP 绑定流程 |
| 内容口径 | 使用当前 `docs/architecture` 术语和中性静态示例；原型仅提供视觉与信息密度参考 |
| 导航 | 全部页面进入现有动态菜单；用户端与“管理端”分组展示 |
| 管理端可见性 | 仅后端 `navigation` 返回管理端 routeKey 的管理员显示“管理端”分组；普通用户不可直接访问 `/admin` 与 `/admin/*` |
| 路由兼容 | `/home` 升级为工作台；`/admin` 保留为管理概览；管理能力使用 `/admin/*` 子路由 |

## 2. 目标与非目标

### 2.1 目标

1. 建立与原型接近的产品视觉：橙色品牌、紧凑桌面密度、可折叠侧栏、52px 顶栏、浅灰/深灰内容底、白色/深色容器卡片。
2. 用 Ant Design 6 的全局 token、算法主题与组件 token 形成视觉单一来源，覆盖 ProLayout 和所有 Portal 浮层。
3. 为原型全部页面提供可导航、可渲染、具备基本视觉交互的静态 UI 骨架。
4. 保留当前 V0.1 的登录、Session、Initial State、路由守卫和服务边界。
5. 页面结构可在后续接入真实 API 时继续使用，不因静态骨架产生第二套数据架构。
6. 在 1440×900 的浅色、深色场景完成核心路径视觉验收，并保证 1280px 下可用。

### 2.2 非目标

- 不实现真实新增、编辑、删除、审批、归档或角色授权。
- 不实现真实 Agent、Chat、模型、评测、审计、代码 Diff 或 Sandbox Preview 数据流。
- 不接入后端 OpenAPI Artifact 或 generated client。
- 不实现移动端或 1280px 以下的独立布局。
- 不实现原型的右下角演示角色切换器、清空数据或重置演示数据。
- 不复制原型的首次登录初始化、密码重置、TOTP 绑定流程。
- 不引入图表库；复杂分析图表留待真实数据需求明确后处理。

## 3. 视觉系统

### 3.1 品牌与颜色

- 产品名保持“内部研发平台”。
- Brand Mark 使用原型的橙色圆角方块。
- `#EB6E00` 作为品牌强调色，用于 Logo、选中指示、装饰性强调和大字号文本。
- 需要白色文字的主要操作按钮使用更深的可访问橙色 `#C25700`，hover/active 色由 Ant Design 色阶派生；避免小号白字直接落在 `#EB6E00` 上。
- Light：`colorBgLayout = #F5F5F5`、`colorBgContainer = #FFFFFF`、侧栏为白色、正文为接近 `#191919`。
- Dark：`colorBgLayout = #121212`、`colorBgContainer = #1F1F1F`、侧栏为 `#191919`，边框和文字层级由 dark algorithm 派生。
- success、warning、error、info、风险、Team、Diff 增删色使用语义 token，不在页面硬编码。

### 3.2 尺寸、密度与动效

- 侧栏展开宽度 208px，折叠宽度约 64px。
- 顶栏高度 52px。
- 页面默认 padding 为纵向 20px、横向 24px。
- 常规卡片圆角 8px，Modal/Drawer 内部大容器可使用 10–12px；按钮和输入保持 Ant Design 默认密度。
- 任务详情 Inspector 宽度 344px；Diff Drawer 约 880px，Artifact Drawer 约 560px，审计详情 Drawer 约 460px。
- 页面淡入、侧栏折叠和运行状态 pulse 控制在 150–250ms；`prefers-reduced-motion` 下关闭非必要动画。
- 业务 ID、仓库、分支、Correlation ID 与 Diff 使用 monospace 字体。

### 3.3 主题模型

主题模式为 `system | light | dark`：

1. localStorage key 使用版本化名称 `engineering-platform.theme.v1`。
2. 没有显式设置时使用 `matchMedia('(prefers-color-scheme: dark)')`，并监听系统变化。
3. 用户选择浅色或深色后保存 override；选择“跟随系统”时删除 override。
4. localStorage 被禁用或读写异常时安全回退到 system，不阻断应用启动。
5. 顶栏右侧提供三态主题入口。
6. ConfigProvider、ProLayout、App、Modal、Drawer、Dropdown、Tooltip、Select 和 message 使用同一主题上下文，禁止通过局部 `data-*` 和 `!important` 补丁实现暗色。
7. 首屏绘制前同步解析已保存模式或系统偏好，避免页面出现 light/dark 闪烁。

## 4. 全局外壳

继续使用 Umi ProLayout，不重写侧栏和顶栏：

- 侧栏包含 Brand Mark、产品名、用户端菜单和“管理端”分组，支持折叠、选中态与徽标。
- “管理端”分组不是所有登录用户的静态菜单；仅当当前 `navigation` 至少包含一个已知管理端 routeKey 时出现。
- 顶栏包含当前页面标题、全局搜索视觉入口、主题选择、消息入口、用户 Avatar/姓名。
- 内容区拥有唯一页面滚动所有权；任务详情等复杂页面可以建立明确的内部滚动区，避免多层滚动陷阱。
- 1280px 下宽表格使用 `scroll.x`，顶部动作溢出时进入 Dropdown，不设置原型的 `overflow:hidden` 强制裁切。
- 图标统一来自 `@ant-design/icons`，不沿用 emoji 或 Unicode 菜单图标。

## 5. 信息架构与路由

### 5.1 用户端

| 路由 | 页面 | 主要静态内容 |
| --- | --- | --- |
| `/login` | 登录 | 品牌 Hero、现有员工编号/密码/TOTP LoginForm |
| `/home` | 工作台 | KPI、待审批、我的任务、运行中 Agent、最近 MR、公告 |
| `/tasks` | 任务列表 | 状态筛选、搜索、表格/看板切换、创建任务入口 |
| `/tasks/archived` | 归档任务 | 复用任务列表视觉，只读语义 |
| `/tasks/:taskId` | 任务详情 | 阶段时间线/对话流、总览/文档/代码/执行/预览 Inspector |
| `/workspaces` | 工作区 | 左侧工作区选择器、成员/仓库/设置 Tab |
| `/messages` | 消息中心 | 全部、Gate、Agent、MR、系统分类 |
| `/team-board` | 团队看板 | KPI、吞吐、阶段分布、成员负载、阻塞事项 |
| `/audit` | 审计看板 | 统计、趋势、分类、筛选表格、详情 Drawer |

### 5.2 管理端

| 路由 | 页面 | 主要静态内容 |
| --- | --- | --- |
| `/admin` | 管理后台概览 | 平台 KPI、管理入口、近期风险与系统状态 |
| `/admin/workspaces` | 工作区管理 | 工作区 ProTable 与创建/查看入口 |
| `/admin/skills` | 技能管理 | 技能卡片目录、状态与管理操作 |
| `/admin/models` | 模型管理 | 模型目录、调用看板、模型评测 Tabs |
| `/admin/roles` | 角色管理 | 左侧角色选择、右侧能力矩阵 |
| `/admin/users` | 用户管理 | 用户 ProTable、状态与管理操作 |
| `/admin/menus` | 菜单管理 | 用户端/管理端菜单列表、顺序和显示状态 |

`/admin` 是为保持现有链接兼容而新增的管理概览，视觉复用原型的 KPI 卡片与紧凑列表语言，不新增业务含义。

### 5.3 页面内浮层

- Modal/StepsForm：创建任务、分配任务、驳回审批、管理页新增/编辑。
- Drawer：代码 Diff、Artifact 文档、审计详情；Artifact 与审计详情复用只读 `DetailDrawer`，其内部固定组合 Ant Design `Drawer` 与 `ProDescriptions`，代码 Diff 仍直接使用 `Drawer`。
- AutoComplete/Dropdown：全局搜索视觉结果、顶部快捷入口。
- 所有静态提交操作通过 `App.useApp().message` 明确提示“静态原型操作”，随后关闭浮层；不修改持久示例数据。

## 6. 组件架构

### 6.1 组件优先级

1. ProComponents：`PageContainer`、`ProCard`、`StatisticCard`、`ProTable`、`ProList`、`ProDescriptions`、`LoginForm`、`ModalForm`、`StepsForm`、`LightFilter`/`QueryFilter`。
2. Ant Design：`Tabs`、`Segmented`、`Drawer`、`Tag`、`Badge`、`Avatar`、`Steps`、`Timeline`、`Progress`、`Dropdown`、`AutoComplete`、`Empty`、`App`。
3. `@ant-design/x`：任务详情的静态 `Bubble`、`Sender`、`ThoughtChain`/阶段链路；不接入模型或 Chat 服务。
4. 少量 `antd-style`：登录 Hero、非对称 Grid、任务详情双栏、迷你柱图、Diff、Preview Frame 等 Ant Design 无直接抽象的布局。

### 6.2 共享边界

只在至少两个页面复用时提升到 `src/components/`，候选包括：

- Brand Mark。
- 页面筛选工具栏。
- KPI/Statistic 卡片。
- Status/Risk/Team Tag。
- 紧凑列表行与统一 Empty State。
- 迷你柱图、堆叠条和 Legend。
- 只读 `DetailDrawer`：只封装 Ant Design `Drawer` 的浮层行为与 `ProDescriptions` 的字段展示，不引入编辑、提交或请求逻辑。

页面私有组件平铺在页面目录，不建立额外 `components/` 子目录；私有样式放 `index.style.ts`，静态 fixtures 放 `constant.ts`。

### 6.3 原型到组件的约束

- 不重写 Ant Design 已提供的表格、Checkbox、Switch、Tab、Modal、Drawer、Toast 或表单控件；`DetailDrawer` 只能组合原生 `Drawer + ProDescriptions`，不得自行实现遮罩、焦点锁定或详情布局引擎。
- 不复制原型的大量 inline style、硬编码 z-index、暗色反查 CSS 或斜纹 Preview 占位。
- 简单柱条用 `Progress` 与 CSS Grid；不为静态骨架新增图表依赖。
- Diff 和 Browser Preview 使用 Drawer + List/Typography/pre + 少量样式，不引入重型编辑器。

## 7. 数据与导航边界

### 7.1 现有逻辑保持

- 登录继续调用 `features/auth`，成功后刷新 `me` 与 `navigation`，等待 Initial State React commit 后进入 `/home`。
- API client 继续位于 `src/services/<domain>/`，使用 `@umijs/max request` 和 `{ code, data, message }` 信封。
- 页面不得直达 services；dependency-cruiser 规则继续生效。

### 7.2 Route Registry

扩展前端静态 Route Registry，使 routeKey 映射到 path、图标和菜单分组。建议 routeKey：

`home`、`tasks`、`workspaces`、`messages`、`teamBoard`、`audit`、`admin`、`adminWorkspaces`、`adminSkills`、`adminModels`、`adminRoles`、`adminUsers`、`adminMenus`。

mock navigation 仍只返回 `routeKey/name/order`；用户端/管理端父级、图标与 path 由 Registry 派生。未知 routeKey 必须被过滤，不进入菜单或授权判断。

管理端权限不新增前端角色真相源：后端按当前 Principal 过滤 `navigation`，前端从相同结果派生 `canAccessAdmin`。普通用户没有管理端 routeKey 时，不显示管理分组，且 Umi route `access` 阻止直接访问 `/admin` 和 `/admin/*`。这属于前端体验与纵深防御；后端 API 仍必须独立执行真实授权。开发 mock 的当前用户作为管理员返回全部 routeKey，以便完整验收页面，同时单元测试覆盖仅用户端 navigation 的普通用户场景。

### 7.3 静态页面数据

- 页面展示数据放就近 `constant.ts`，使用架构文档里的 Platform、Workspace、Artifact、Agent Attempt、MR、Capability、Audit 等术语。
- 静态 fixtures 不进入 Initial State、不伪装成 API、不进入 services。
- ProTable 仍统一使用其 `request` 属性；页面内的静态 request adapter 只对就近 fixtures 做筛选、排序和分页，并返回 `{ data, success, total }`，不发网络请求。
- 页内 Tab、Segmented、Modal、Drawer 和过滤展示可以使用本地 UI state；审批、启停、删除、归档等业务结果不写回 fixtures。

## 8. 页面重点

### 8.1 登录

- 左侧为品牌 Hero：英文眉题、三行主标题、交付链路 Pill、版权信息。
- 右侧为 460px 表单区域和约 14px 圆角卡片，内部复用现有 LoginForm。
- 保留现有字段标签、校验、错误反馈、提交顺序和 fail-closed 行为。

### 8.2 工作台

- 四列 KPI、两栏主体；左侧审批与任务，右侧 Agent、MR、公告。
- 1280px 下可降为两列 KPI，但不支持移动布局。

### 8.3 任务列表与详情

- 任务列表使用 ProTable，并提供表格/看板视觉切换；创建任务使用 ModalForm。
- 任务详情左侧为阶段化静态消息流，右侧 344px Inspector；顶部动作过多时收入 Dropdown。
- 完整 Diff 使用 880px Drawer；Preview Frame 仅展示隔离的静态页面示意，不随平台主题反色。

### 8.4 看板与管理页

- Team/Audit/Model Usage 使用 Statistic、Progress 和 CSS mini chart，保持原型的信息密度。
- Workspace、Role、Menu 等选择控件优先使用 ProList、CheckCard、Checkbox.Group 和 Switch。
- 所有 ProTable 显式配置 `scroll.x`，在 1280px 下不压缩为不可读小字。

## 9. 可访问性与交互质量

- 所有操作使用真实 Button/Link，不使用可点击 `span`。
- 支持键盘焦点、Enter/Space 激活、Tooltip 和可见 focus ring。
- 正文尽量不低于 12px；关键操作点击区域满足桌面可用尺寸。
- 颜色不作为状态唯一表达，同时提供文字、图标或 Tag。
- Filled primary action 使用可达普通文本对比度的深橙色；品牌橙保留为视觉强调。
- 动效尊重 `prefers-reduced-motion`。
- Drawer、Modal 和 Dropdown 使用 Ant Design focus management 与 Portal，不自行实现遮罩和焦点锁定。

## 10. 测试与验收

### 10.1 自动化测试

- Theme：system/light/dark 解析、matchMedia、localStorage 持久化、异常回退。
- Navigation：全部 routeKey 映射、用户端/管理端分组、排序、未知项过滤。
- Access：普通用户 navigation 不产生管理端分组且不能访问 `/admin/*`；管理员 navigation 可以展示和访问管理端。
- Route：全部页面路由可解析，`/home` 与 `/admin` 兼容保留。
- Page smoke：每个路由至少验证标题或主要 Landmark。
- Interaction：主题切换、表格/看板、Tabs、Modal、Drawer、搜索下拉。
- Login：保留当前提交顺序、错误处理、字段校验和 React commit 竞态测试。
- Architecture：`pnpm depcruise` 与 20-edge contract 继续通过。

### 10.2 组件与质量检查

- 写组件前通过 antd CLI 查询涉及组件的当前版本 API。
- 对新增 UI 运行 antd deprecated、a11y、usage 检查。
- 最终运行 `pnpm lint`、`pnpm test`、`pnpm build`、`pnpm doctor` 和 `pnpm test:coverage`。

### 10.3 浏览器验收

在 1440×900 fresh profile 验证：

1. 未登录访问任一受保护页面跳转 `/login`。
2. 登录页浅色/深色视觉、字段校验和错误反馈正确。
3. mock 登录后进入 `/home`，全部菜单可导航。
4. 用户端与管理端核心页面无 Runtime error。
5. 主题首次跟随系统，手动切换后刷新仍保留；恢复 system 后继续响应系统变化。
6. Task Detail 的 Tabs/Drawer、Tasks 的表格/看板、管理页 Modal 可操作。
7. 1280px 下侧栏可折叠，宽表格可横向滚动，页面没有被 `overflow:hidden` 裁切。

## 11. 验收标准

1. 全部设计路由存在；所有顶层页面均有侧栏菜单入口，用户端/管理端分组与 active 状态正确；详情和归档页由任务入口进入。
2. 管理端分组仅对后端 navigation 授权的管理员出现；普通用户直接访问 `/admin` 或 `/admin/*` 被 Umi access 拒绝，且前端可见性不替代后端授权。
3. 视觉 token、Light/Dark algorithm、ProLayout 和 Portal 使用同一 Theme 状态，无 inline 暗色补丁。
4. `/login`、`/home`、`/admin` 现有行为与回归测试不退化。
5. 所有页面使用 Ant Design/ProComponents 优先策略，重复视觉 primitive 已合理共享。
6. 所有静态按钮明确为视觉交互，不产生伪造持久业务结果。
7. 1440×900 浅/深主题与 1280px 桌面验收通过。
8. lint、test、build、doctor 及 dependency architecture contract 全部通过。
