# 当前开发进度

- Repository: engineering-platform
- Updated At: 2026-08-25T02:16:56Z
- Based On Commit: da72238abc87a19c07a5cac96e41d88d5f6bf2d3
- Branch: codex/final-prototype-acceptance
- State: active
- Active Plan: docs/superpowers/plans/2026-08-21-final-prototype-ui.md
- Remote Recoverable: no

## 已完成

- 19 屏最终原型的单线实现、真实 V0.2 Feature/service/OpenAPI 接缝、无 API 区域真实空态和结构纯度门禁均已合入 `main`；当前代码基线为 `da72238`，仍是发布候选，不是已发布最终版。
- 前端已锁定后端 `api-v0.2.1` OpenAPI Artifact，版本 `0.2.1`，SHA-256 为 `624712f97f8f8f3fe9d8e57422df7a62ae88cfa9c1059a316f0b188fb19a6b1a`。
- 精确 `main@da72238` 的 GitHub Actions run `32683635240` 已成功：`verify` 执行完整 `pnpm verify` 并通过，`publish-image` 成功发布 `ghcr.io/unif-code/engineering-platform:sha-da72238`；main push 不触发 `release-gate`。
- 历史记录中的 AdminWorkspaces 四个 timeout 已在当前基线收敛；本机本轮完整测试覆盖这些长链路并全部通过。
- 外部 Chrome 扩展当前可连接，符合只用外部 Chrome 验收的仓库要求；尚未开始目标环境的 19 屏验收。

## 进行中

- 正在推进发布候选的环境闭环：部署前置条件、真实联调和外部 Chrome 双宽度可视化验收。
- 环境部署、迁移与账号初始化由各自事实源仓库和受控运维流程推进；本仓不记录内部环境状态、凭据或私有仓交付细节。

## 剩余工作

- 由部署事实源仓完成目标环境的精确镜像、迁移顺序、健康检查与版本/digest readback；任何服务器或 Kubernetes 写命令继续遵循该仓审批门。
- 由受控运维流程完成目标环境账号初始化；凭据不得写入 Git、日志、验收证据或本进度文件。
- 使用真实 Session 验证 `/me`、`/navigation`、V0.2 管理 API 与 mutation；随后在外部 Chrome 完成 1440×900 和 1280px 的 19 屏、授权跳转、主题、空态/错误态与真实 mutation 验收。
- 精确候选 SHA 的 CI、真实联调、外部 Chrome 验收和明确发布授权全部通过后，才可创建远端前端 tag/Release 并宣称已发布最终版；当前远端没有前端 Release。

## 阻塞项

- 本仓当前没有代码或质量门 blocker；环境部署与账号初始化尚未完成，具体阻塞由对应事实源仓和受控运维记录承载。
- 外部 Chrome 当前没有可验收的目标环境页面，因此真实联调与 19 屏可视化验收尚不能执行。

## 最近验证

- `pnpm exec vitest run --reporter=verbose` 首次冷运行：72/73 files、476/478 tests；一条 BootstrapWizard 用例因机器资源饥饿超过 15 秒，下一条受到未完成异步操作级联污染。两条失败用例分别 isolated PASS，完整 `BootstrapWizard.test.tsx` 20/20 PASS。
- `pnpm exec vitest run --reporter=dot` 第二次完整复验：73/73 files、478/478 tests，exit 0；Duration 1118.96s。未放宽 timeout、未 skip、未降低断言。
- GitHub Actions `32683635240`：精确 `da72238abc87a19c07a5cac96e41d88d5f6bf2d3` 的 `verify` 与 `publish-image` 均 success；前端公开仓当前可运行 CI。
- 前端锁定的 `api-v0.2.1` Artifact 摘要与当前 `openapi/artifact.lock.json` 一致，generated client 无手改。
- 外部 Chrome 控制连接成功；当前无可验收的目标环境页面，未使用应用内浏览器替代验收。

## 工作树

- 隔离工作树：`D:\tongyi\code\.worktrees\engineering-platform-final-prototype-acceptance`。
- 业务代码未改动；本次只同步 `docs/superpowers/progress/current.md`。本地提交尚未成功推送，当前仍有本机独有进度记录，因此 `Remote Recoverable: no`。
