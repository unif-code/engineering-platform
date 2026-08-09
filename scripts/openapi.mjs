#!/usr/bin/env node
// OpenAPI Artifact 链（见 docs/architecture/06 与 AGENTS.md）：
//   fetch    按 openapi/artifact.lock.json 取回构件并校验 sha256，写入 openapi/spec.json
//   generate 从已校验的 spec 生成 src/services/generated（类型 + 版本戳），不得手改
//   check    校验 spec 与锁定摘要一致，并 dirty-diff 生成目录（手改或漂移即失败）
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCK_PATH = path.join(ROOT, 'openapi', 'artifact.lock.json');
const SPEC_PATH = path.join(ROOT, 'openapi', 'spec.json');
const OUT_DIR = path.join(ROOT, 'src', 'services', 'generated');
const GENERATOR_BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  'openapi-typescript',
);

const fail = (msg) => {
  console.error(`[openapi] ${msg}`);
  process.exit(1);
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

const readLock = () => {
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  const filled = [lock.source, lock.version, lock.sha256].filter(
    Boolean,
  ).length;
  if (filled > 0 && filled < 3) {
    fail(
      'openapi/artifact.lock.json 填写不完整：source、version、sha256 必须同时提供，部分填写一律失败。',
    );
  }
  return { ...lock, pinned: filled === 3 };
};

const requirePinned = (lock) => {
  if (!lock.pinned) {
    fail(
      '后端 OpenAPI Artifact 尚未锁定：先在 openapi/artifact.lock.json 填写 source（https:// 或 file:）、version 与 sha256。',
    );
  }
};

async function fetchArtifact(lock) {
  if (lock.source.startsWith('file:')) {
    return fs.readFileSync(
      path.resolve(ROOT, lock.source.slice('file:'.length)),
    );
  }
  if (lock.source.startsWith('https://')) {
    const res = await fetch(lock.source);
    if (!res.ok)
      fail(`下载失败：${res.status} ${res.statusText} ← ${lock.source}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fail(`不支持的 source：${lock.source}（仅支持 https:// 与 file:）`);
}

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'head',
  'options',
  'trace',
];

// 前端侧的保守结构化兼容检查，覆盖：删除的 path/operation、删除或转必填的参数、
// 新增必填参数、requestBody 转必填、删除的响应状态码、operation 新增认证要求、
// components.schemas 的删除/类型变化/枚举收窄/新增必填字段、securityScheme 删除。
// 内联 operation Schema、$ref 解析与 allOf/oneOf 组合语义仍由后端仓 CI 的完整 diff 承担（见 docs/architecture/06）。
const opParams = (pathItem, op) =>
  [...(pathItem?.parameters ?? []), ...(op?.parameters ?? [])].filter(
    (p) => p?.name,
  );

function walkSchema(oldS, newS, ptr, breaking) {
  if (!oldS || typeof oldS !== 'object') return;
  if (newS === undefined || newS === null) {
    breaking.push(`删除 Schema ${ptr}`);
    return;
  }
  if (typeof newS !== 'object') return;
  if (oldS.type && newS.type && oldS.type !== newS.type)
    breaking.push(`Schema ${ptr} 类型 ${oldS.type} → ${newS.type}`);
  if (Array.isArray(oldS.enum) && Array.isArray(newS.enum)) {
    const removed = oldS.enum.filter((v) => !newS.enum.includes(v));
    if (removed.length > 0)
      breaking.push(`Schema ${ptr} 枚举收窄（移除 ${removed.join('/')}）`);
  }
  const oldRequired = new Set(oldS.required ?? []);
  for (const r of newS.required ?? []) {
    if (!oldRequired.has(r)) breaking.push(`Schema ${ptr} 新增必填字段 ${r}`);
  }
  for (const [k, v] of Object.entries(oldS.properties ?? {})) {
    walkSchema(v, newS.properties?.[k], `${ptr}.${k}`, breaking);
  }
  if (oldS.items) walkSchema(oldS.items, newS.items, `${ptr}[]`, breaking);
}

const hasAuthRequirement = (op, spec) =>
  (op.security ?? spec.security ?? []).some(
    (s) => Object.keys(s ?? {}).length > 0,
  );

function breakingChanges(oldSpec, newSpec) {
  const breaking = [];
  for (const [p, oldItem] of Object.entries(oldSpec.paths ?? {})) {
    const newItem = newSpec.paths?.[p];
    if (!newItem) {
      breaking.push(`删除 path ${p}`);
      continue;
    }
    for (const m of HTTP_METHODS) {
      const oldOp = oldItem?.[m];
      if (!oldOp) continue;
      const newOp = newItem[m];
      const label = `${m.toUpperCase()} ${p}`;
      if (!newOp) {
        breaking.push(`删除 operation ${label}`);
        continue;
      }
      const oldParams = new Map(
        opParams(oldItem, oldOp).map((x) => [`${x.in}:${x.name}`, x]),
      );
      const newParams = new Map(
        opParams(newItem, newOp).map((x) => [`${x.in}:${x.name}`, x]),
      );
      for (const [key, oldParam] of oldParams) {
        const newParam = newParams.get(key);
        if (!newParam) breaking.push(`${label} 删除参数 ${key}`);
        else if (!oldParam.required && newParam.required)
          breaking.push(`${label} 参数 ${key} 转为必填`);
      }
      for (const [key, newParam] of newParams) {
        if (newParam.required && !oldParams.has(key))
          breaking.push(`${label} 新增必填参数 ${key}`);
      }
      if (!oldOp.requestBody?.required && newOp.requestBody?.required)
        breaking.push(`${label} requestBody 转为必填`);
      for (const code of Object.keys(oldOp.responses ?? {})) {
        if (!newOp.responses?.[code])
          breaking.push(`${label} 删除响应 ${code}`);
      }
      if (
        !hasAuthRequirement(oldOp, oldSpec) &&
        hasAuthRequirement(newOp, newSpec)
      )
        breaking.push(`${label} 新增认证要求`);
    }
  }
  const newSchemas = newSpec.components?.schemas ?? {};
  for (const [name, oldSchema] of Object.entries(
    oldSpec.components?.schemas ?? {},
  )) {
    walkSchema(
      oldSchema,
      newSchemas[name],
      `#/components/schemas/${name}`,
      breaking,
    );
  }
  for (const name of Object.keys(oldSpec.components?.securitySchemes ?? {})) {
    if (!newSpec.components?.securitySchemes?.[name])
      breaking.push(`删除 securityScheme ${name}`);
  }
  return breaking;
}

const majorOf = (version) => {
  const major = Number.parseInt(String(version ?? ''), 10);
  return Number.isNaN(major) ? null : major;
};

function assertCompatible(oldBuf, newBuf) {
  const oldSpec = JSON.parse(oldBuf.toString('utf8'));
  const newSpec = JSON.parse(newBuf.toString('utf8'));
  if (oldSpec.info?.version === newSpec.info?.version) {
    fail(
      `构件内容变化但 info.version 未变（${newSpec.info?.version}）：Artifact 必须随内容演进版本。`,
    );
  }
  const breaking = breakingChanges(oldSpec, newSpec);
  if (breaking.length > 0 && !process.argv.includes('--allow-breaking')) {
    fail(
      `检测到 breaking change：${breaking.join('；')}。确认已按 Contract 兼容演进后可加 --allow-breaking 覆盖（CI 的 openapi:check 仍要求主版本升级）。`,
    );
  }
}

async function cmdFetch() {
  const lock = readLock();
  requirePinned(lock);
  const buf = await fetchArtifact(lock);
  const digest = sha256(buf);
  if (digest !== lock.sha256) {
    fail(
      `Digest 不匹配：锁定 ${lock.sha256}，实际 ${digest}。拒绝写入未受信构件。`,
    );
  }
  const specVersion = JSON.parse(buf.toString('utf8')).info?.version;
  if (specVersion !== lock.version) {
    fail(
      `lock.version（${lock.version}）与构件 info.version（${specVersion}）不一致：锁定版本必须与构件自述版本绑定。`,
    );
  }
  if (fs.existsSync(SPEC_PATH)) {
    const prev = fs.readFileSync(SPEC_PATH);
    if (!prev.equals(buf)) assertCompatible(prev, buf);
  }
  fs.mkdirSync(path.dirname(SPEC_PATH), { recursive: true });
  fs.writeFileSync(SPEC_PATH, buf);
  console.log(
    `[openapi] spec.json 已更新（version=${lock.version}, sha256=${digest.slice(0, 12)}…）`,
  );
}

const verifySpec = (lock) => {
  if (!fs.existsSync(SPEC_PATH))
    fail('openapi/spec.json 不存在：先运行 pnpm openapi:fetch。');
  const digest = sha256(fs.readFileSync(SPEC_PATH));
  if (digest !== lock.sha256) {
    fail(
      `openapi/spec.json 与锁定摘要不一致（${digest} ≠ ${lock.sha256}）：重新运行 pnpm openapi:fetch。`,
    );
  }
  const specVersion = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8')).info
    ?.version;
  if (specVersion !== lock.version) {
    fail(
      `lock.version（${lock.version}）与 spec info.version（${specVersion}）不一致：锁定版本必须与构件自述版本绑定。`,
    );
  }
};

const generatorVersion = () =>
  JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'node_modules', 'openapi-typescript', 'package.json'),
      'utf8',
    ),
  ).version;

const BANNER =
  '// GENERATED FROM openapi/spec.json — DO NOT EDIT（见 AGENTS.md 接口与数据获取）\n';

function generateInto(dir, lock) {
  fs.mkdirSync(dir, { recursive: true });
  const schema = execFileSync(GENERATOR_BIN, [SPEC_PATH], { encoding: 'utf8' });
  fs.writeFileSync(path.join(dir, 'schema.d.ts'), schema);
  fs.writeFileSync(
    path.join(dir, 'client.ts'),
    `${BANNER}import { createApiClient } from '../transport';\nimport type { paths } from './schema';\n\n/** 绑定当前锁定 Artifact 类型的平台 API 客户端 */\nexport const api = createApiClient<paths>();\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    `${BANNER}export { api } from './client';\nexport type * from './schema';\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'ARTIFACT.json'),
    `${JSON.stringify(
      {
        version: lock.version,
        sha256: lock.sha256,
        generator: `openapi-typescript@${generatorVersion()}`,
      },
      null,
      2,
    )}\n`,
  );
}

const listFiles = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && e.name !== '.gitkeep')
        .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
        .sort()
    : [];

function cmdGenerate() {
  const lock = readLock();
  requirePinned(lock);
  verifySpec(lock);
  for (const f of listFiles(OUT_DIR)) fs.rmSync(path.join(OUT_DIR, f));
  generateInto(OUT_DIR, lock);
  const keep = path.join(OUT_DIR, '.gitkeep');
  if (fs.existsSync(keep)) fs.rmSync(keep);
  console.log(
    `[openapi] src/services/generated 已生成（version=${lock.version}）`,
  );
}

// 在 CI/干净检出中以 git 基线重建兼容比较：--base <ref> 显式指定；默认工作区与 HEAD
// 不同时以 HEAD 为基线，相同（已提交）时以 spec.json 最近一次变更之前的版本为基线，
// 避免与自身比较。git 读取异常一律 Fail Closed，只有"基线中确实无 spec"才按首个构件跳过。
// 相对基线的 breaking change 必须由 Artifact 主版本升级显式声明，无旗标可绕过。
function gitSpecAt(ref) {
  execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}:openapi/spec.json`], {
      cwd: ROOT,
      stdio: 'ignore',
    });
  } catch {
    return null; // ref 存在但其中没有 spec —— 首个 Artifact
  }
  return execFileSync('git', ['show', `${ref}:openapi/spec.json`], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function resolveBaseline(currentBuf) {
  const baseIdx = process.argv.indexOf('--base');
  if (baseIdx > -1) {
    const ref = process.argv[baseIdx + 1];
    if (!ref) fail('--base 需要一个 git ref 参数。');
    try {
      return { ref, buf: gitSpecAt(ref) };
    } catch {
      return fail(
        `基线 ref 不可解析或读取失败：${ref}。基线异常按 Fail Closed 处理。`,
      );
    }
  }
  let headBuf;
  try {
    headBuf = gitSpecAt('HEAD');
  } catch {
    return fail('无法读取 HEAD 基线（git 异常）：按 Fail Closed 处理。');
  }
  if (headBuf === null || !headBuf.equals(currentBuf)) {
    return { ref: 'HEAD', buf: headBuf };
  }
  let lastChange;
  try {
    lastChange = execFileSync(
      'git',
      ['log', '-n', '1', '--format=%H', '--', 'openapi/spec.json'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
  } catch {
    return fail(
      '无法定位 spec.json 的最近变更提交（git 异常）：按 Fail Closed 处理。',
    );
  }
  if (!lastChange) {
    return fail(
      'spec.json 与 HEAD 一致但无变更历史（git 状态异常）：按 Fail Closed 处理。',
    );
  }
  try {
    return {
      ref: `${lastChange.slice(0, 12)}^`,
      buf: gitSpecAt(`${lastChange}^`),
    };
  } catch {
    return { ref: `${lastChange.slice(0, 12)}^`, buf: null }; // 变更即首提交，无更早基线
  }
}

function checkBaselineCompatibility() {
  const currentBuf = fs.readFileSync(SPEC_PATH);
  const { ref, buf: baseBuf } = resolveBaseline(currentBuf);
  if (baseBuf === null) {
    console.log(
      `[openapi] 基线 ${ref} 中不存在 spec（首个 Artifact），跳过兼容比较。`,
    );
    return;
  }
  if (baseBuf.equals(currentBuf)) return;
  const baseSpec = JSON.parse(baseBuf.toString('utf8'));
  const currentSpec = JSON.parse(currentBuf.toString('utf8'));
  const breaking = breakingChanges(baseSpec, currentSpec);
  if (breaking.length === 0) return;
  const baseMajor = majorOf(baseSpec.info?.version);
  const newMajor = majorOf(currentSpec.info?.version);
  if (baseMajor !== null && newMajor !== null && newMajor > baseMajor) {
    console.log(
      `[openapi] 相对 ${baseRef} 存在 breaking change，已由主版本升级（${baseSpec.info?.version} → ${currentSpec.info?.version}）显式声明。`,
    );
    return;
  }
  fail(
    `相对 ${baseRef} 检测到 breaking change 但主版本未升级（${baseSpec.info?.version} → ${currentSpec.info?.version}）：${breaking.join('；')}。breaking 变更必须以 Artifact 主版本发布，审批随后端 Release 流程。`,
  );
}

function cmdCheck() {
  const lock = readLock();
  if (!lock.pinned) {
    if (process.argv.includes('--require-pinned')) {
      fail(
        'Release 模式（--require-pinned）要求已锁定的 OpenAPI Artifact：当前 lock 为空。',
      );
    }
    if (listFiles(OUT_DIR).length > 0) {
      fail(
        'Artifact 未锁定但 src/services/generated 存在生成物：来源不可追溯，请锁定构件后重新生成。',
      );
    }
    console.log(
      '[openapi] 未锁定 Artifact 且无生成物，检查通过（等待后端首个构件）。',
    );
    return;
  }
  verifySpec(lock);
  checkBaselineCompatibility();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-check-'));
  try {
    generateInto(tmp, lock);
    const expected = listFiles(tmp);
    const actual = listFiles(OUT_DIR);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      fail(
        `生成目录文件集不一致：期望 [${expected}]，实际 [${actual}]。运行 pnpm openapi:generate。`,
      );
    }
    for (const f of expected) {
      const a = fs.readFileSync(path.join(tmp, f), 'utf8');
      const b = fs.readFileSync(path.join(OUT_DIR, f), 'utf8');
      if (a !== b)
        fail(
          `src/services/generated/${f} 与锁定 Artifact 的生成结果不一致（手改或未重新生成）。`,
        );
    }
    console.log('[openapi] 检查通过：spec 摘要一致，生成目录无手改与漂移。');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const cmd = process.argv[2];
if (cmd === 'fetch') await cmdFetch();
else if (cmd === 'generate') cmdGenerate();
else if (cmd === 'check') cmdCheck();
else
  fail(
    `用法：node scripts/openapi.mjs <fetch|generate|check>（收到：${cmd ?? '空'}）`,
  );
