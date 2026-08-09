# 架构文档重构设计

日期:2026-08-08
状态:已确认
范围:`docs/architecture/` 全目录

## 背景与问题诊断

`docs/architecture` 当前共 28 个 Markdown 文件、约 3500 行,采用 13 个主题 × 两层(L1 主文 + L2 详细说明)结构,外加 README 和离线 HTML 架构地图。经分析确认三个结构性问题,且三者都需要解决:

1. **维护成本**:L1/L2 双层实质性重复(如 04 的 Activation Gate 规则两层各写一遍),加上全目录 52 处"只由/唯一拥有"所有权声明和密集交叉引用,任何 Contract 变更都要同步多处,单次改动经常波及十几个文件。
2. **阅读成本**:3500 行、每章节 30–50% 篇幅是所有权免责声明,人和 AI 都难以快速把握全貌。
3. **细节超前**:精确资源数值(`2/4 vCPU`)、Policy Key 名、错误码、Port 方法清单、Kata 组件名等实现期决策写死在架构正文里,实现时必然变动,文档会频繁返工或腐化。

文档用途定位:**兼顾 AI 开发的规范输入与人的阅读**——事实唯一性和参数精度需要保留,但要控制体积和维护面。

## 目标

- 28 个文件 → 约 16 个;约 3500 行 → 总行数 ≤1600。
- 每个事实只有一个修改点,单次变更不再波及十几个文件。
- 每个主题一篇 ≤150 行的文档,人可以完整读完。
- AI 开发所需的精确参数保留在唯一的参数附录页。

## 已确认的决策

| 决策点 | 结论 |
| --- | --- |
| 层级结构 | L1+L2 合并为每主题一篇,取消子目录,文件平铺,编号保留 |
| 实现级参数 | 收拢到唯一参数附录页 `appendix-parameters.md`,正文只留定性规则 |
| ADR | 不建独立 ADR;决策以"一行决策 + 一句理由"写在各篇"关键不变量"节 |
| HTML 架构地图 | 保留 `visuals/platform-architecture-map.html`,同步更新其中链接指向新路径 |
| 执行方式 | 两阶段:先机械合并(无事实损失,单独提交),再精简压缩(单独提交) |

## 目标目录结构

```
docs/architecture/
├─ README.md                                # 导航 + 事实所有权矩阵 + 维护规则
├─ 00-platform-overview.md
├─ 01-identity-organization-authorization.md
├─ 02-requirement-workflow.md
├─ 03-agent-skill-model.md
├─ 04-sandbox-runtime.md
├─ 05-source-control-delivery.md
├─ 06-platform-application-integration.md
├─ 07-data-messaging-storage.md
├─ 08-security-audit-governance.md
├─ 09-infrastructure-operations.md
├─ 10-configuration-governance.md
├─ 11-architecture-baseline.md
├─ 12-implementation-roadmap.md
├─ appendix-parameters.md
└─ visuals/platform-architecture-map.html
```

映射规则:

- 每个主题目录的 `<topic>.md` + `<topic>-detail.md` 合并为一个平铺文件 `NN-<topic>.md`,子目录删除。
- `12-implementation-roadmap/` 的主文与 detail 合并为 `12-implementation-roadmap.md`;`environment-capacity-plan.md` 的数值内容并入 `appendix-parameters.md` 的容量章节。

## 篇内模板

每篇统一四节,目标 ≤150 行(00 与 12 可放宽到 180):

```markdown
# <主题名>

## 目标与边界
≤3 段:定位、职责、明确不拥有什么(一段带链接的短文,不逐段声明)。

## 核心模型
对象/概念表 + 必要的结构图(text tree 或表格)。

## 关键不变量
列表,每条 = 决策 + 一句理由。

## 与其他模块的关系
一张表:模块 | 本模块消费什么 / 提供什么。
```

行文风格:叙述性中文,专有名词保留英文(与现状一致);表格用于可枚举事实,规则语义写在正文。

## 精简阶段的删除规则

**删除/迁移**:

1. 逐段"X 只由 Y 拥有 / 唯一事实源"声明 → 删除,由 README 的事实所有权矩阵统一承载;正文只在读者真正需要跳转处保留链接。
2. 精确参数(资源数值、Policy Key 名、错误码、Port 方法清单、Runtime 组件与版本名、容量数字)→ 迁入 `appendix-parameters.md`;正文保留定性规则(如"资源有硬上限且用户不可自选规格")。
3. L1/L2 合并后重复的段落 → 只保留一份(以 L2 表述为准)。
4. README 中的三层事实模型长篇导言、受众阅读路径表 → 压缩进"维护规则"一节,10 行以内。

**明确不删**:不变量语义、安全边界、Fail Closed 语义、模块间协作规则、Gate 的语义定义。这些是文档的核心价值。

## 参数附录设计

`appendix-parameters.md` 是唯一参数事实源,按域分节:

1. 容量与服务器规划(原 `environment-capacity-plan.md` 内容)
2. Resource Profile 表(CPU/Memory/Ephemeral/Unit)
3. Platform Policy Key 表(Key、Minimum、Maximum、准入效果)
4. 错误码表(`CAPACITY_UNAVAILABLE`、`POLICY_LIMIT_REACHED` 等,含语义)
5. Port 方法清单(如 `SandboxPort` 的方法列表)
6. Runtime 组件清单(Kata、`runtime-rs`、QEMU/KVM 等)

正文引用附录,不复制附录内容。

## README 重设计

三部分:

1. **导航表**:13 篇,每篇一句职责。
2. **事实所有权矩阵**:事实类别 → owner 文档,替代散布全目录的逐段声明。
3. **维护规则**:压缩为 ≤10 行(先找 owner 再改、参数只改附录、不在文档外复制规范事实、过期规则直接删除)。

## 执行流程

- **Phase 0**:把当前工作区 15 个未提交的存量修改单独 commit,与重构隔离。
- **Phase 1(机械合并)**:每主题 L1 并入 L2 成单篇、平铺、删除子目录;更新全部内链、README 链接和 HTML 地图链接。规则是"无事实损失":L1 独有内容并入对应章节,与 L2 重复的段落保留 L2 版本。单独 commit。
- **Phase 2(精简)**:按删除规则逐篇精简;创建 `appendix-parameters.md` 并迁入参数;重写 README;再次更新 HTML 地图。单独 commit。

## 验收标准

1. 正文(README + 13 篇主题文档)总行数 ≤2000;参数附录作为事实库单列,不计入正文预算。
   > 修订记录(2026-08-08,用户裁决):原标准为全目录 ≤1600,系规划期估算;实施后逐篇审查确认"不删清单"语义占满每篇 ~145 行,13 篇合计即超 1600。为不牺牲受保护语义,改为正文 ≤2000 + 附录单列。实测:正文 1958、附录 514、合计 2472(原 3518,-30%)。
   > 修订记录(2026-08-08,用户裁决):Presigned URL 有效期由固定默认值改为版本化 Platform Policy 属已接受的收紧性扩展(Policy 只能收紧、不得放宽为长期可复用 URL),见 02 与参数附录。
2. 每篇主题文档 ≤150 行(00、12 ≤180)。
3. 脚本检查:所有 Markdown 内链与 HTML 地图链接无失效。
4. grep 验证:资源数值、Policy Key、错误码只在 `appendix-parameters.md` 出现。
5. Phase 1 提交的 diff 可证明无事实损失;Phase 2 提交的 diff 清楚展示删除内容。

## 不在本次范围

- 不修改文档表达的架构语义本身(重构结构,不重新设计平台)。
- 不引入 ADR 目录、文档站点或新工具链。
- 不重做 HTML 地图的内容结构,只更新链接。
