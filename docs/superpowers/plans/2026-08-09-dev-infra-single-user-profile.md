# V0.1 DEV Single-User Kubernetes Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user has preselected inline execution; do not dispatch subagents.

**Goal:** 将现有 V0.1 DEV kubeadm 单节点 Desired State 缩配为保留全部功能的单用户 Profile，并把 DEV 架构决定拆分到受基线保护的 `docs/decisions/`。

**Architecture:** `engineering-platform` 只承载 canonical Architecture Decision 与基线工具，嵌套的 `engineering-platform-gitops` 承载实际 DEV Desired State、容量保护和运行手册。功能拓扑不变，通过低 requests、适度 limits、83Gi 稳态 PVC、bucket quota、Prometheus 容量保留和 80%/90% 磁盘 Gate 控制共享主机资源。

**Tech Stack:** Node.js 22/24、Node test runner、Python 3 + `unittest` + PyYAML、Kustomize、Flux v2.9.3、Kubernetes v1.36.3、Cilium 1.20.0、HelmRelease、CloudNativePG、MinIO、kube-prometheus-stack、metrics-server。

## Global Constraints

- 全程中文沟通；所有开发与复核使用 Sol max，不启用 subagent。
- `engineering-platform-backend` 不得写入。
- `engineering-platform` 的授权写入范围仅限本设计所需的 `docs/decisions/`、架构链接、基线脚本/测试/清单以及 superpowers spec/plan；不得修改 `src/`、`config/`、`mock/` 或应用依赖。
- GitOps 仓固定为 `/Users/liulijun/tongyi/unif-code/engineering-platform/engineering-platform-gitops`，是独立 Git 仓；父仓提交不得包含该目录。
- 每遇到 `【运维】`：输出完整命令清单后立即停止，等待用户人工执行和回执；不得跳过、代跑或把未执行步骤标为完成。
- 保留 kubeadm、Cilium、Flux、Gateway API、MinIO、CNPG/PostgreSQL、Prometheus/Grafana、PG/etcd 备份及恢复演练，保留期仍为 7 天。
- 保留现有 3.8GiB Swap；kubelet 必须使用 `failSwapOn: false` 与 `memorySwap.swapBehavior: NoSwap`。
- 稳态 PVC：MinIO 50Gi、PostgreSQL 20Gi、Prometheus 10Gi、Grafana 2Gi、Alertmanager 1Gi；恢复演练临时 PostgreSQL 20Gi。
- 平台稳态实际磁盘预算不超过 100Gi，恢复演练峰值不超过 130Gi；当前 438Gi 可用空间减去峰值后至少为其他程序保留 300Gi。
- 根文件系统 80% 使用率告警；90% 时停止新发布、PVC 创建/扩容和恢复演练，不自动删除数据库、WORM 对象或备份。
- 可调整工作负载稳态 requests 总目标不超过 2 CPU / 6Gi；非系统组件 limits 总目标约 10 CPU / 16Gi。Cilium Agent、Envoy、etcd 和 Kubernetes 控制面不设置激进 CPU limit。
- 所有直接工作负载镜像继续按 `linux/amd64` Digest 固定；禁止 `latest`、浮动 tag、伪造 Digest 和跳过 TLS 校验。
- MinIO 供应链、containerd 共存、稳定控制面 DNS、local-path 能力差异和应用镜像 Digest 保持 Stop Gate，不因缩配而关闭。
- 每个 Task 遵循 Red → Green → Refactor，验证通过后单独 Conventional Commit；最终完成声明前使用 verification-before-completion。

## File Map

### `engineering-platform`

- Create: `docs/decisions/README.md` — Architecture Decision 唯一索引。
- Create: `docs/decisions/DEV-001-same-host-backup.md` — 迁移现有同机备份偏差。
- Create: `docs/decisions/DEV-002-single-user-kubernetes-profile.md` — 单用户 Profile canonical 决策。
- Delete: `docs/architecture/deviations.md` — 删除旧单体事实源。
- Modify: `docs/architecture/README.md` — 导航、owner 与维护规则指向 decisions。
- Modify: `docs/superpowers/specs/2026-08-09-dev-infra-v01-design.md` 与 `docs/superpowers/plans/2026-08-09-dev-infra-v01.md` — 更新全部 DEV-001 链接。
- Modify: `scripts/baseline.mjs` — 同时哈希 architecture 与 decisions。
- Create: `scripts/baseline.test.mjs` — 多根目录基线单元测试。
- Modify: `package.json` — 把基线单测纳入 `baseline:check`。
- Regenerate: `docs/architecture/baseline-manifest.json` — 使用相对 `docs/` 的路径键。

### `engineering-platform-gitops`

- Modify: Flux、cert-manager、local-path、MinIO、CNPG、Barman、Observability、etcd backup 的现有资源清单。
- Create: `infrastructure/foundation/resource-quotas.yaml` — 三个 Namespace 的 PVC 申请额度。
- Create: `infrastructure/observability/controller/metrics-server-{repository,release}.yaml` — Metrics API。
- Create: `scripts/test_validate.py` — Profile validator 单元/集成测试。
- Modify: `scripts/validate.py` — DEV-002 精确值与总预算检查。
- Modify: `README.md`、`pcs/candidate-1.md`、`runbook/*.md` 和恢复示例 — canonical 决策链接与实测流程。

---

### Task 1: 拆分 Architecture Decisions 并扩展基线保护

**Files:**
- Create: `scripts/baseline.test.mjs`
- Create: `docs/decisions/README.md`
- Create: `docs/decisions/DEV-001-same-host-backup.md`
- Create: `docs/decisions/DEV-002-single-user-kubernetes-profile.md`
- Modify: `scripts/baseline.mjs`
- Modify: `package.json`
- Modify: `docs/architecture/README.md`
- Modify: `docs/superpowers/specs/2026-08-09-dev-infra-v01-design.md`
- Modify: `docs/superpowers/plans/2026-08-09-dev-infra-v01.md`
- Delete: `docs/architecture/deviations.md`
- Regenerate: `docs/architecture/baseline-manifest.json`

**Interfaces:**
- Consumes: 已确认设计 `docs/superpowers/specs/2026-08-09-dev-infra-single-user-profile-design.md`。
- Produces: `collectMarkdownHashes(docsDir, roots)`；canonical `DEV-001`、`DEV-002` 路径；同时覆盖两个文档根的 Architecture Baseline Manifest。

- [ ] **Step 1: 写多文档根的失败测试**

创建 `scripts/baseline.test.mjs`：

```js
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectMarkdownHashes } from './baseline.mjs';

test('collectMarkdownHashes includes architecture and decisions only', () => {
  const docsDir = mkdtempSync(path.join(tmpdir(), 'baseline-docs-'));
  try {
    mkdirSync(path.join(docsDir, 'architecture'));
    mkdirSync(path.join(docsDir, 'decisions'));
    mkdirSync(path.join(docsDir, 'superpowers'));
    writeFileSync(path.join(docsDir, 'architecture', '00.md'), '# A\n');
    writeFileSync(path.join(docsDir, 'decisions', 'DEV-001.md'), '# D\n');
    writeFileSync(path.join(docsDir, 'superpowers', 'plan.md'), '# P\n');

    const hashes = collectMarkdownHashes(docsDir, [
      'architecture',
      'decisions',
    ]);

    assert.deepEqual(Object.keys(hashes), [
      'architecture/00.md',
      'decisions/DEV-001.md',
    ]);
    assert.match(hashes['architecture/00.md'], /^[a-f0-9]{64}$/);
  } finally {
    rmSync(docsDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test scripts/baseline.test.mjs`

Expected: FAIL，提示 `baseline.mjs` 没有导出 `collectMarkdownHashes`，或导入时触发现有 CLI 用法错误。

- [ ] **Step 3: 将 baseline scanner 改为可测试的多根实现**

在 `scripts/baseline.mjs` 中导入 `fileURLToPath`，以以下公开函数替换当前 `currentHashes` 的单目录扫描：

```js
export const collectMarkdownHashes = (
  docsDir,
  roots = ['architecture', 'decisions'],
) =>
  Object.fromEntries(
    roots
      .flatMap((root) => {
        const dir = path.join(docsDir, root);
        return fs
          .readdirSync(dir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => [
            path.posix.join(root, file),
            createHash('sha256')
              .update(fs.readFileSync(path.join(dir, file)))
              .digest('hex'),
          ]);
      })
      .sort(([left], [right]) => left.localeCompare(right)),
  );
```

保留 manifest 文件在 `docs/architecture/baseline-manifest.json`，把 `currentHashes()` 改为 `collectMarkdownHashes(path.join(ROOT, 'docs'))`。将 CLI 分支包装进 `main(cmd)`，只在下式为真时执行：

```js
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) main(process.argv[2]);
```

- [ ] **Step 4: 把基线单测接入标准命令**

在 `package.json` 中新增并调整：

```json
"baseline:test": "node --test scripts/baseline.test.mjs",
"baseline:check": "npm run baseline:test && node scripts/baseline.mjs check"
```

- [ ] **Step 5: 运行单测确认 scanner 通过**

Run: `pnpm baseline:test`

Expected: PASS，1 test passed。

- [ ] **Step 6: 创建 decisions 索引和两个独立决定**

`docs/decisions/README.md` 使用下表，不复制正文：

```markdown
# Architecture Decisions

| 编号 | 标题 | 状态 | 范围 | 记录 |
| --- | --- | --- | --- | --- |
| DEV-001 | V0.1 DEV 同机备份与审计归档 | ACTIVE | DEV only | [DEV-001](./DEV-001-same-host-backup.md) |
| DEV-002 | V0.1 DEV 单用户 Kubernetes Profile | ACTIVE | DEV only | [DEV-002](./DEV-002-single-user-kubernetes-profile.md) |
```

`DEV-001-same-host-backup.md` 保留原文全部事实，链接改为 `../architecture/07-data-messaging-storage.md` 与 `../architecture/09-infrastructure-operations.md`。`DEV-002-single-user-kubernetes-profile.md` 固定以下内容：

- 状态 `ACTIVE`，批准日期 `2026-08-09`，范围 `V0.1 DEV / NON_HA / 单用户 / 共享主机`。
- 偏离：不使用独立 500Gi 数据盘；保留 3.8Gi Swap；使用低 requests、适度 limits；local-path 不提供硬 quota/在线扩容。
- 决定：完整功能与 7 天保留不变；83Gi 稳态 PVC、103Gi 恢复 PVC、130Gi 平台峰值；Swap 为 `NoSwap` Pod 行为。
- 补偿控制：MinIO bucket quota、Prometheus `retentionSize: 8GB`、Namespace ResourceQuota、80% 告警、90% Stop Gate、恢复 preflight。
- 验证证据：server baseline、GitOps commit、`kubectl top`、PVC/`df`/`du`、备份与恢复 runbook。
- 演进触发器：多用户启用、峰值超过 130Gi、持续 CPU/内存节流、根盘达到 80%、进入 PROD Candidate。
- 关闭条件：迁移到满足 Target Architecture 的独立存储/节点 Profile，或由后继 Decision 明确替代。

- [ ] **Step 7: 删除旧事实源并更新全部链接**

删除 `docs/architecture/deviations.md`。将 Architecture README 的“13 篇主题 + 参数附录 + 例外记录”改为“13 篇主题 + 参数附录；决策登记位于 `../decisions/`”，导航和 owner 链接均指向 `../decisions/README.md`。更新原 DEV infra spec/plan 中全部 3 处 DEV-001 Markdown 链接到：

```text
../../decisions/DEV-001-same-host-backup.md
```

Run:

```bash
rg -n '\]\([^)]*deviations\.md' docs \
  --glob '!superpowers/specs/2026-08-09-dev-infra-single-user-profile-design.md' \
  --glob '!superpowers/plans/2026-08-09-dev-infra-single-user-profile.md'
```

Expected: 无输出，exit code 1。

- [ ] **Step 8: 刷新并验证 Architecture Baseline**

Run: `pnpm baseline:update`

Expected: 新 manifest 的 key 以 `architecture/` 或 `decisions/` 开头，包含 15 个 architecture Markdown 与 3 个 decisions Markdown。

Run: `pnpm baseline:check && git diff --check`

Expected: PASS。

- [ ] **Step 9: 提交 Architecture Decision 重构**

```bash
git add package.json scripts/baseline.mjs scripts/baseline.test.mjs docs/architecture docs/decisions docs/superpowers/specs/2026-08-09-dev-infra-v01-design.md docs/superpowers/plans/2026-08-09-dev-infra-v01.md docs/superpowers/specs/2026-08-09-dev-infra-single-user-profile-design.md
git commit -m "refactor(architecture): split environment decisions"
```

---

### Task 2: 为 GitOps Profile Validator 建立测试基元

**Files:**
- Create: `engineering-platform-gitops/scripts/test_validate.py`
- Modify: `engineering-platform-gitops/scripts/validate.py`
- Modify: `engineering-platform-gitops/scripts/validate.sh`

**Interfaces:**
- Consumes: PyYAML document mappings。
- Produces: `document_by_identity(path, kind, name)`、`value_at(value, path)`、`expect_value(...)`，供后续存储和资源 contract 使用。

- [ ] **Step 1: 写 selector 与 value path 的失败测试**

创建 `scripts/test_validate.py`：

```python
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import yaml

from validate import document_by_identity, value_at


class ProfileValidationTest(unittest.TestCase):
    def test_document_and_named_list_item_are_selected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'deployment.yaml'
            path.write_text(
                yaml.safe_dump_all(
                    [
                        {
                            'apiVersion': 'apps/v1',
                            'kind': 'Deployment',
                            'metadata': {'name': 'minio'},
                            'spec': {
                                'template': {
                                    'spec': {
                                        'containers': [
                                            {
                                                'name': 'minio',
                                                'resources': {
                                                    'requests': {'cpu': '100m'}
                                                },
                                            }
                                        ]
                                    }
                                }
                            },
                        }
                    ]
                ),
                encoding='utf-8',
            )

            document = document_by_identity(path, 'Deployment', 'minio')
            cpu = value_at(
                document,
                (
                    'spec',
                    'template',
                    'spec',
                    'containers',
                    ('name', 'minio'),
                    'resources',
                    'requests',
                    'cpu',
                ),
            )

            self.assertEqual(cpu, '100m')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd engineering-platform-gitops && PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py`

Expected: FAIL，提示无法导入 `document_by_identity` 或 `value_at`。

- [ ] **Step 3: 实现最小 YAML selector**

在 `scripts/validate.py` 中新增：

```python
PathToken = str | tuple[str, str]


def document_by_identity(path: Path, kind: str, name: str) -> dict[str, Any]:
    for document in load_documents(path):
        metadata = document.get('metadata', {})
        if document.get('kind') == kind and metadata.get('name') == name:
            return document
    fail(f'{path.relative_to(ROOT)} 缺少 {kind}/{name}')


def value_at(value: Any, path: tuple[PathToken, ...]) -> Any:
    current = value
    for token in path:
        if isinstance(token, tuple):
            key, expected = token
            if not isinstance(current, list):
                fail(f'路径 selector {key}={expected} 的父值不是 list')
            current = next(
                (
                    item
                    for item in current
                    if isinstance(item, dict) and item.get(key) == expected
                ),
                None,
            )
            if current is None:
                fail(f'路径缺少 selector {key}={expected}')
        else:
            if not isinstance(current, dict) or token not in current:
                fail(f'路径缺少 key {token}')
            current = current[token]
    return current


def expect_value(
    relative_path: str,
    kind: str,
    name: str,
    path: tuple[PathToken, ...],
    expected: Any,
) -> None:
    document = document_by_identity(ROOT / relative_path, kind, name)
    actual = value_at(document, path)
    if actual != expected:
        fail(f'{relative_path} 期望 {expected!r}，实测 {actual!r}')
```

- [ ] **Step 4: 将单元测试加入验证入口**

在 `scripts/validate.sh` 的 PyYAML 检查后增加：

```bash
PYTHONPATH="$repo_root/scripts" python3 -m unittest discover \
  -s "$repo_root/scripts" \
  -p 'test_*.py'
```

- [ ] **Step 5: 运行测试与现有 validator**

Run: `cd engineering-platform-gitops && ./scripts/validate.sh`

Expected: unittest PASS，随后输出 `GitOps manifests validated successfully.`。

- [ ] **Step 6: 提交 validator 基元**

```bash
git add scripts/validate.py scripts/validate.sh scripts/test_validate.py
git commit -m "test(gitops): add profile validation primitives"
```

---

### Task 3: 缩小持久化存储并增加磁盘保护

**Files:**
- Create: `engineering-platform-gitops/infrastructure/foundation/resource-quotas.yaml`
- Modify: `engineering-platform-gitops/infrastructure/foundation/kustomization.yaml`
- Modify: `engineering-platform-gitops/infrastructure/minio/pvc.yaml`
- Modify: `engineering-platform-gitops/infrastructure/minio/bootstrap-job.yaml`
- Modify: `engineering-platform-gitops/infrastructure/cnpg/database/cluster.yaml`
- Modify: `engineering-platform-gitops/infrastructure/observability/controller/release.yaml`
- Modify: `engineering-platform-gitops/infrastructure/observability/config/alerts.yaml`
- Modify: `engineering-platform-gitops/runbook/examples/postgres-restore.yaml`
- Modify: `engineering-platform-gitops/scripts/test_validate.py`
- Modify: `engineering-platform-gitops/scripts/validate.py`

**Interfaces:**
- Consumes: Task 2 的 `expect_value`。
- Produces: 83Gi 稳态 PVC、103Gi 恢复峰值 PVC、三类 ResourceQuota、bucket hard quota、80%/90% PrometheusRule。

- [ ] **Step 1: 写 live storage contract 的失败测试**

在 `scripts/test_validate.py` 中导入并增加：

```python
from validate import validate_single_user_storage


class RepositoryProfileContractTest(unittest.TestCase):
    def test_single_user_storage_contract(self) -> None:
        validate_single_user_storage()
```

Run: `PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py`

Expected: FAIL，提示无法导入 `validate_single_user_storage`。

- [ ] **Step 2: 实现精确 storage contract**

在 `validate.py` 中新增 `validate_single_user_storage()`，使用 `expect_value` 固定：

```text
infrastructure/minio/pvc.yaml                 PVC/minio-data                  spec.resources.requests.storage = 50Gi
infrastructure/cnpg/database/cluster.yaml     Cluster/platform                spec.storage.size = 20Gi
runbook/examples/postgres-restore.yaml        Cluster/platform-restore        spec.storage.size = 20Gi
infrastructure/observability/controller/release.yaml HelmRelease/kube-prometheus-stack:
  spec.values.alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage = 1Gi
  spec.values.grafana.persistence.size = 2Gi
  spec.values.prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage = 10Gi
  spec.values.prometheus.prometheusSpec.retention = 7d
  spec.values.prometheus.prometheusSpec.retentionSize = 8GB
```

同时读取 `bootstrap-job.yaml` 文本并要求存在且仅存在：

```sh
mc quota set dev/postgres-backup --size 30Gi
mc quota set dev/etcd-backup --size 5Gi
mc quota set dev/audit-worm --size 5Gi
```

读取 `alerts.yaml` 并要求同时存在阈值 `>= 80`、`>= 90` 和两个 alert 名 `NodeRootFilesystemUsageHigh`、`NodeRootFilesystemUsageCritical`。

- [ ] **Step 3: 添加 Namespace PVC 申请额度**

创建 `resource-quotas.yaml`，包含三个 `ResourceQuota`：

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-storage-budget
  namespace: minio
spec:
  hard:
    persistentvolumeclaims: '1'
    requests.storage: 50Gi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-storage-budget
  namespace: monitoring
spec:
  hard:
    persistentvolumeclaims: '3'
    requests.storage: 13Gi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-storage-budget
  namespace: platform
spec:
  hard:
    persistentvolumeclaims: '2'
    requests.storage: 45Gi
```

将该文件加入 `infrastructure/foundation/kustomization.yaml`。

- [ ] **Step 4: 应用 PVC 与 retention 精确值**

按 Step 2 的 contract 修改 MinIO、CNPG、恢复示例和 kube-prometheus-stack。不要修改 `storageClassName`、`Retain` 或 `WaitForFirstConsumer`。

- [ ] **Step 5: 设置三个 bucket hard quota**

在 `mc version enable` 之后、用户创建之前加入：

```sh
mc quota set dev/postgres-backup --size 30Gi
mc quota set dev/etcd-backup --size 5Gi
mc quota set dev/audit-worm --size 5Gi
```

继续使用 `SSL_CERT_FILE=/etc/minio-ca/ca.crt`，不得加入 `--insecure`。

- [ ] **Step 6: 添加 80%/90% 根盘告警**

在 `dev-infrastructure` rule group 加入：

```yaml
- alert: NodeRootFilesystemUsageHigh
  annotations:
    description: '根文件系统使用率已达到 80%，必须复核 DEV-002 容量预算。'
    summary: DEV 根文件系统容量告警
  expr: 100 * (1 - node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) >= 80
  for: 10m
  labels:
    severity: warning
- alert: NodeRootFilesystemUsageCritical
  annotations:
    description: '根文件系统使用率已达到 90%；停止新发布、PVC 变更和恢复演练。'
    summary: DEV 根文件系统触发 Stop Gate
  expr: 100 * (1 - node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}) >= 90
  for: 5m
  labels:
    severity: critical
```

- [ ] **Step 7: 运行 Red → Green 验证**

Run: `PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py && ./scripts/validate.sh`

Expected: PASS；Kustomize 可渲染所有新增 quota。

- [ ] **Step 8: 提交存储 Profile**

```bash
git add infrastructure/foundation infrastructure/minio infrastructure/cnpg/database/cluster.yaml infrastructure/observability runbook/examples/postgres-restore.yaml scripts/validate.py scripts/test_validate.py
git commit -m "feat(storage): apply single-user capacity budgets"
```

---

### Task 4: 缩小所有可调整容器的 CPU 与内存

**Files:**
- Modify: `engineering-platform-gitops/clusters/dev/flux-system/kustomization.yaml`
- Modify: `engineering-platform-gitops/infrastructure/foundation/local-path-provisioner.yaml`
- Modify: `engineering-platform-gitops/infrastructure/cert-manager/controller/release.yaml`
- Modify: `engineering-platform-gitops/infrastructure/minio/{deployment,bootstrap-job}.yaml`
- Modify: `engineering-platform-gitops/infrastructure/cnpg/controller/{cnpg-release,barman-release}.yaml`
- Modify: `engineering-platform-gitops/infrastructure/cnpg/database/{cluster,object-store}.yaml`
- Modify: `engineering-platform-gitops/infrastructure/observability/controller/release.yaml`
- Modify: `engineering-platform-gitops/infrastructure/etcd-backup/cronjob.yaml`
- Modify: `engineering-platform-gitops/runbook/examples/{postgres-restore,etcd-restore-drill,minio-lock-verify}.yaml`
- Modify: `engineering-platform-gitops/scripts/{validate.py,test_validate.py}`

**Interfaces:**
- Consumes: Task 2 selector；Task 3 存储 contract。
- Produces: DEV-002 的显式资源矩阵与总 requests Gate。

- [ ] **Step 1: 扩展失败测试覆盖资源矩阵**

新增 `validate_single_user_resources()` 并先在测试中调用。测试必须在清单仍为原值时失败，首个错误应为 Flux source-controller request 仍为 `100m/256Mi` 而非 `25m/96Mi`。

- [ ] **Step 2: 在 validator 中登记精确资源 contract**

使用 `expect_value` 和 named-list selector 固定以下值：

| 工作负载 | requests | limits |
| --- | --- | --- |
| Flux source-controller | 25m / 96Mi | 200m / 256Mi |
| Flux kustomize-controller | 50m / 128Mi | 500m / 512Mi |
| Flux helm-controller | 50m / 128Mi | 500m / 512Mi |
| Flux notification-controller | 10m / 64Mi | 100m / 128Mi |
| local-path-provisioner | 20m / 32Mi | 100m / 96Mi |
| cert-manager controller | 30m / 64Mi | 300m / 256Mi |
| cert-manager cainjector | 30m / 64Mi | 300m / 256Mi |
| cert-manager webhook | 20m / 64Mi | 200m / 128Mi |
| cert-manager startupapicheck | 10m / 32Mi | 100m / 64Mi |
| MinIO server | 100m / 256Mi | 1 / 2Gi |
| MinIO bootstrap | 10m / 32Mi | 100m / 128Mi |
| CNPG operator | 50m / 128Mi | 300m / 256Mi |
| Barman operator | 50m / 128Mi | 300m / 256Mi |
| PostgreSQL primary | 250m / 512Mi | 2 / 4Gi |
| Barman instance sidecar | 50m / 64Mi | 500m / 256Mi |
| Alertmanager | 20m / 64Mi | 200m / 256Mi |
| Grafana | 50m / 128Mi | 500m / 512Mi |
| kube-state-metrics | 20m / 64Mi | 200m / 128Mi |
| Prometheus | 200m / 512Mi | 1 / 2Gi |
| node-exporter | 20m / 32Mi | 100m / 64Mi |
| Prometheus Operator | 50m / 128Mi | 300m / 256Mi |
| etcd upload | 10m / 32Mi | 200m / 128Mi |
| etcd snapshot | 50m / 64Mi | 500m / 256Mi |
| etcd validate | 10m / 32Mi | 200m / 128Mi |

恢复示例中的 PostgreSQL 与 Barman sidecar 使用与主实例相同的值；etcd restore 和 MinIO lock 验证任务使用不高于相应备份/验证步骤的值。

- [ ] **Step 3: 修改 Flux、基础控制器和数据服务**

逐文件应用 Step 2 的精确值。保留 Cilium、kube-apiserver、scheduler、controller-manager 和 etcd 的 upstream bootstrap sizing；不要给这些关键路径添加新的 CPU limit。

- [ ] **Step 4: 修改 Observability 与瞬时任务**

应用表中 Alertmanager、Grafana、KSM、Prometheus、node-exporter、Prometheus Operator 和 etcd backup 的精确值。保持所有副本数为 1、Grafana Managed Alerting 关闭、备份调度不变。

- [ ] **Step 5: 实现总预算断言**

`validate_single_user_resources()` 在逐项值通过后，按长期工作负载求和并断言：

```python
if total_cpu_millicores > 2000:
    fail(f'DEV-002 稳态 CPU requests 超预算：{total_cpu_millicores}m')
if total_memory_mib > 6144:
    fail(f'DEV-002 稳态内存 requests 超预算：{total_memory_mib}Mi')
```

瞬时 Job 不计入稳态总和，但必须逐项通过上限检查。

- [ ] **Step 6: 运行测试和渲染验证**

Run: `PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py && ./scripts/validate.sh && git diff --check`

Expected: PASS，输出单测成功和 `GitOps manifests validated successfully.`。

- [ ] **Step 7: 提交资源缩配**

```bash
git add clusters/dev/flux-system/kustomization.yaml infrastructure runbook/examples scripts/validate.py scripts/test_validate.py
git commit -m "feat(infra): right-size single-user workloads"
```

---

### Task 5: 以安全 TLS 增加 metrics-server

**Files:**
- Create: `engineering-platform-gitops/infrastructure/observability/controller/metrics-server-repository.yaml`
- Create: `engineering-platform-gitops/infrastructure/observability/controller/metrics-server-release.yaml`
- Modify: `engineering-platform-gitops/infrastructure/observability/controller/kustomization.yaml`
- Modify: `engineering-platform-gitops/clusters/dev/infrastructure.yaml`
- Modify: `engineering-platform-gitops/pcs/candidate-1.md`
- Modify: `engineering-platform-gitops/scripts/{validate.py,test_validate.py}`

**Interfaces:**
- Consumes: `dev-selfsigned` ClusterIssuer、`monitoring-helm-reconciler`、Task 2 selector。
- Produces: `metrics.k8s.io/v1beta1` 与 `kubectl top`；chart `3.13.1` / app `0.8.1`。

- [ ] **Step 1: 写缺失 metrics-server 的失败测试**

将下列资源加入 required set，并在 `test_validate.py` 调用完整 repository contract：

```python
('helm.toolkit.fluxcd.io/v2', 'HelmRelease', 'monitoring', 'metrics-server')
```

Run: `PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py`

Expected: FAIL，提示缺少 `HelmRelease/monitoring/metrics-server`。

- [ ] **Step 2: 创建官方 HelmRepository**

`metrics-server-repository.yaml`：

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: metrics-server
  namespace: monitoring
spec:
  interval: 24h
  url: https://kubernetes-sigs.github.io/metrics-server
```

- [ ] **Step 3: 创建锁版、安全 TLS HelmRelease**

`metrics-server-release.yaml` 固定：

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: metrics-server
  namespace: monitoring
spec:
  chart:
    spec:
      chart: metrics-server
      interval: 24h
      reconcileStrategy: ChartVersion
      sourceRef:
        kind: HelmRepository
        name: metrics-server
      version: 3.13.1
  interval: 30m
  releaseName: metrics-server
  serviceAccountName: monitoring-helm-reconciler
  targetNamespace: kube-system
  values:
    apiService:
      insecureSkipTLSVerify: false
    image:
      repository: registry.k8s.io/metrics-server/metrics-server
      tag: v0.8.1@sha256:6231fb0a1ffab76c92ab880f51a0d11b290f688373647bcedff85af025dfd8a9
    replicas: 1
    resources:
      limits:
        cpu: 100m
        memory: 128Mi
      requests:
        cpu: 20m
        memory: 64Mi
    tls:
      certManager:
        existingIssuer:
          enabled: true
          kind: ClusterIssuer
          name: dev-selfsigned
      type: cert-manager
```

复用其他 HelmRelease 的 install/upgrade remediation、timeout 和 drift detection 结构。

- [ ] **Step 4: 接入 Kustomization 依赖链**

将两个文件加入 `infrastructure/observability/controller/kustomization.yaml`。在 `clusters/dev/infrastructure.yaml` 中让 `observability-controller` 同时依赖 `cert-manager-config` 与 `infrastructure-foundation`，确保 Certificate CRD 和 ClusterIssuer 已 Ready。

- [ ] **Step 5: 更新 PCS 精确来源**

在 Observability 行增加：

```text
Metrics Server | app 0.8.1 / chart 3.13.1 | chart sha256:084e6edb680cf4e2acc30bd496568c53fdf663cbacf6e17876b25785c35b7a13 | index sha256:b2d2efaf5ac3b366ed0f839d2412a2c4279d4fc2a2a733f12c52133faed36c41；amd64 sha256:6231fb0a1ffab76c92ab880f51a0d11b290f688373647bcedff85af025dfd8a9
```

记录官方兼容范围为 Kubernetes 1.31+，因此覆盖 1.36.3。禁止使用官方默认的 `insecureSkipTLSVerify: true`。

- [ ] **Step 6: 完成 validator contract**

断言 chart version、image tag+digest、`targetNamespace=kube-system`、`apiService.insecureSkipTLSVerify=false`、`tls.type=cert-manager`、ClusterIssuer 名称和 20m/64Mi → 100m/128Mi 资源值。

- [ ] **Step 7: 验证并提交**

Run: `PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py && ./scripts/validate.sh && git diff --check`

Expected: PASS，且安全扫描不报告 `insecureSkipTLSVerify: true`。

```bash
git add infrastructure/observability/controller clusters/dev/infrastructure.yaml pcs/candidate-1.md scripts/validate.py scripts/test_validate.py
git commit -m "feat(observability): add pinned metrics server"
```

---

### Task 6: 同步 DEV-002、基线证据与运行手册

**Files:**
- Modify: `engineering-platform-gitops/README.md`
- Modify: `engineering-platform-gitops/infrastructure/foundation/environment.yaml`
- Modify: `engineering-platform-gitops/pcs/candidate-1.md`
- Modify: `engineering-platform-gitops/runbook/00-server-baseline.md`
- Modify: `engineering-platform-gitops/runbook/01-bootstrap.md`
- Modify: `engineering-platform-gitops/runbook/03-minio-verify.md`
- Modify: `engineering-platform-gitops/runbook/04-postgres.md`
- Modify: `engineering-platform-gitops/runbook/05-etcd.md`
- Modify: `engineering-platform-gitops/runbook/06-apps.md`
- Modify: `engineering-platform-gitops/runbook/07-restore-drill.md`
- Modify: `engineering-platform-gitops/runbook/08-capacity.md`
- Modify: `engineering-platform-gitops/runbook/09-acceptance.md`
- Modify: `engineering-platform-gitops/runbook/10-image-owner-handoff.md`

**Interfaces:**
- Consumes: Task 1 生成的 Architecture Baseline ID 和 canonical decisions；Tasks 3–5 的精确 Desired State。
- Produces: 跨会话可恢复的决策、容量、Stop Gate 和人工回执模板。

- [ ] **Step 1: 更新 canonical decision 引用与环境标记**

GitOps README 将 DEV-001 来源改为：

```text
engineering-platform/docs/decisions/DEV-001-same-host-backup.md
```

新增 DEV-002 来源。`environment.yaml` 增加：

```yaml
capacityDecision: DEV-002
capacityProfile: SINGLE_USER_MINIMAL
```

- [ ] **Step 2: 把 PCS 基线号同步为 Architecture Manifest 当前值**

Run from parent repo:

```bash
node -p "JSON.parse(require('node:fs').readFileSync('docs/architecture/baseline-manifest.json', 'utf8')).baselineId"
```

把唯一输出写入 `pcs/candidate-1.md` 的 `基线` 字段；不得手猜日期或序号。

- [ ] **Step 3: 修订服务器基线结论**

`runbook/00-server-baseline.md` 按 DEV-002 重新判定：

- 磁盘：`438Gi - 130Gi = 308Gi`，通过单用户 Profile；不再要求独立 500Gi 数据盘。
- Swap：3.8Gi 保留，状态为“通过 DEV-002；kubelet 待配置 NoSwap”，不执行 `swapoff`。
- CPU、内存、架构、NTP、cgroup v2、ip_forward 保持通过。
- DNS、br_netfilter、containerd 共存仍未通过，因此总 Stop Gate 仍为未关闭。

- [ ] **Step 4: 更新 bootstrap runbook 的 kubelet 期望配置**

`runbook/01-bootstrap.md` 记录 kubeadm 配置必须包含：

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
failSwapOn: false
memorySwap:
  swapBehavior: NoSwap
```

同时新增现有 Docker/containerd 共存审计的证据字段，不提前写入“已兼容”结论。

- [ ] **Step 5: 更新组件和容量 runbook**

所有运行手册使用 Tasks 3–5 的精确 PVC、quota、retention 和资源值。`runbook/08-capacity.md` 增加：

- 稳态实际占用 ≤100Gi。
- 恢复峰值 ≤130Gi。
- 其他程序可用空间目标 ≥300Gi。
- 80% 告警和 90% Stop Gate 的规则状态、触发时间与处置证据。
- metrics-server APIService Ready 与 `kubectl top` 输出位置。

- [ ] **Step 6: 保留并重述未关闭 Stop Gate**

在 acceptance 与相关 runbook 中保持以下状态为 BLOCKED/PENDING：MinIO 供应链、containerd 2.2.5→2.3.1 共存决策、DNS、local-path 在线扩容/硬 quota、frontend/backend Digest。不得因资源缩配把任何一项勾为通过。

- [ ] **Step 7: 校验文档与 Desired State 一致**

Run:

```bash
rg -n "300Gi|100Gi|30Gi|10Gi|5Gi|swapoff|architecture/deviations.md" README.md pcs runbook infrastructure
./scripts/validate.sh
git diff --check
```

Expected: 原规格只允许出现在明确标注“旧值/替代值”的历史说明中；validator PASS。

- [ ] **Step 8: 提交运行手册同步**

```bash
git add README.md infrastructure/foundation/environment.yaml pcs runbook
git commit -m "docs(runbook): record single-user dev profile"
```

---

### Task 7: 全量静态验证与仓库边界复核

**Files:**
- Verify only; fixes must remain within files listed by Tasks 1–6.

**Interfaces:**
- Consumes: 两仓全部提交。
- Produces: 进入【运维】前的静态验证证据。

- [ ] **Step 1: 验证 `engineering-platform`**

Run:

```bash
pnpm baseline:test
pnpm baseline:check
pnpm lint
git diff --check
git status --short
```

Expected: 全部 exit 0；父仓只显示嵌套 `engineering-platform-gitops/` 为 untracked，不存在其他未提交修改。

- [ ] **Step 2: 验证 GitOps 清单**

Run:

```bash
PYTHONPATH=scripts python3 -m unittest scripts/test_validate.py
./scripts/validate.sh
python3 -m py_compile scripts/validate.py scripts/test_validate.py
shellcheck scripts/validate.sh
git diff --check
git status --short
```

Expected: 全部 exit 0，GitOps 工作树干净。

- [ ] **Step 3: 复核安全与供应链约束**

Run:

```bash
rg -n "latest|:main|:master|TODO_DIGEST|REPLACE_ME|insecureSkipTLSVerify: true|--insecure" clusters infrastructure apps
rg -n "metrics-server.*sha256:6231fb0a1ffab76c92ab880f51a0d11b290f688373647bcedff85af025dfd8a9" infrastructure pcs
```

Expected: 第一条无输出；第二条同时命中 HelmRelease 和 PCS。

- [ ] **Step 4: 复核仓库写入边界**

Run:

```bash
git -C /Users/liulijun/tongyi/unif-code/engineering-platform-backend status --short
git -C /Users/liulijun/tongyi/unif-code/engineering-platform status --short
git -C /Users/liulijun/tongyi/unif-code/engineering-platform/engineering-platform-gitops status --short
```

Expected: backend 无输出；父仓只有嵌套 GitOps 目录；GitOps 无输出。

---

### Task 8:【运维】审计现有 Docker/containerd 共存状态

**Files:**
- Update after receipt: `engineering-platform-gitops/runbook/01-bootstrap.md`

**Interfaces:**
- Consumes: Task 7 静态验证通过；服务器基线证据 SHA-256 `c100b23fbcc48253704c32bf7954b4dfc7e42ba9b831c2efb3fce488f56ea067`。
- Produces: 选择“维护窗口升级到 containerd 2.3.1”或“形成兼容性偏差”的事实依据。

- [ ] **Step 1: agent 输出完整只读审计命令并停止**

必须向用户输出以下完整命令块，不在本地或服务器代跑：

```bash
set -o errexit
set -o nounset
set -o pipefail

sudo -v

audit_dir="$PWD/dev-infra-evidence"
mkdir -p "$audit_dir"
audit_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
audit_file="$audit_dir/01-containerd-coexistence-$audit_stamp.txt"

{
  printf '\n[capture]\n'
  date -u --iso-8601=seconds
  id
  hostname -f

  printf '\n[packages]\n'
  dpkg-query -W -f='${Package}\t${Version}\n' docker-ce docker-ce-cli containerd.io runc 2>&1 || true
  apt-cache policy docker-ce containerd.io runc

  printf '\n[services]\n'
  systemctl --no-pager --full status docker containerd || true
  systemctl cat docker
  systemctl cat containerd

  printf '\n[versions]\n'
  docker version
  docker info
  containerd --version
  runc --version

  printf '\n[containerd-config]\n'
  sudo test -f /etc/containerd/config.toml && sudo sed -n '1,320p' /etc/containerd/config.toml || true
  sudo containerd config dump

  printf '\n[cri-plugin]\n'
  sudo ctr plugins ls | sed -n '1,240p'
  sudo ctr plugins ls | awk '$1 ~ /cri/ || $2 ~ /cri/ { print }'

  printf '\n[docker-workloads]\n'
  docker ps --no-trunc
  docker compose ls 2>&1 || true
  docker system df -v

  printf '\n[sockets-and-processes]\n'
  sudo ss -lxnp | grep -E 'containerd|docker' || true
  ps -eo pid,ppid,user,comm,args | grep -E '[c]ontainerd|[d]ockerd'

  printf '\n[data-roots]\n'
  sudo du -sh /var/lib/docker /var/lib/containerd 2>&1 || true
  sudo findmnt -T /var/lib/docker
  sudo findmnt -T /var/lib/containerd
} 2>&1 | tee "$audit_file"

printf '\nEvidence file:\n%s\n' "$audit_file"
printf '\nSHA-256:\n'
sha256sum "$audit_file"
```

输出命令后立即停止，等待完整终端输出、证据路径与 SHA-256 回执。

- [ ] **Step 2: 收到回执后记录事实，仍不自动升级**

把 package version、CRI plugin 状态、Docker 使用的 socket/data-root、运行容器、升级影响和证据 SHA-256 写入 `runbook/01-bootstrap.md`。若升级会中断现有容器，继续保持 Stop Gate，并要求用户确认维护窗口；不得自行选择停机。

- [ ] **Step 3: 只在用户批准具体路径后输出下一组【运维】命令并再次停止**

批准路径必须明确为以下之一：

1. 在维护窗口将共享 system containerd 升级到 2.3.1，重启前先记录并验证 Docker 工作负载恢复方法。
2. 保留现有 Docker runtime，建立独立的 Kubernetes CRI containerd 2.3.1 service/socket/data-root，并确认 kubelet 的 `containerRuntimeEndpoint`。
3. 证明现有 containerd 2.2.5 满足 Kubernetes 1.36.3/CRI v1 后建立 DEV-only PCS 偏差；该路径必须新增独立 Decision，不得静默修改版本锁。

每条路径的变更命令必须根据 Step 1 回执中的发行版包、service unit、socket 和 config version 生成完整清单；在回执之前不输出猜测性的写操作。
