#!/usr/bin/env node
// 架构基线清单（ArchitectureBaselineManifest）：
//   update  重算 docs/architecture 全部 .md 的 SHA-256 并推进基线号
//   check   校验清单与文档一致（已随 pnpm lint 执行）
// 基线号与文档摘要以 docs/architecture/baseline-manifest.json 为唯一事实源。
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'docs', 'architecture');
const MANIFEST = path.join(DIR, 'baseline-manifest.json');

const fail = (msg) => {
  console.error(`[baseline] ${msg}`);
  process.exit(1);
};

const currentHashes = () =>
  Object.fromEntries(
    fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => [
        f,
        createHash('sha256')
          .update(fs.readFileSync(path.join(DIR, f)))
          .digest('hex'),
      ]),
  );

const nextId = (prev) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date, seq] = String(prev ?? '').split('.');
  return date === today ? `${today}.${Number(seq) + 1}` : `${today}.1`;
};

const cmd = process.argv[2];
if (cmd === 'update') {
  const prev = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
    : null;
  const manifest = {
    baselineId: nextId(prev?.baselineId),
    files: currentHashes(),
  };
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `[baseline] 基线清单已更新：${manifest.baselineId}（${Object.keys(manifest.files).length} 个文件）`,
  );
} else if (cmd === 'check') {
  if (!fs.existsSync(MANIFEST)) {
    fail(
      '缺少 docs/architecture/baseline-manifest.json：运行 pnpm baseline:update。',
    );
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const current = currentHashes();
  const diffs = [];
  for (const [f, h] of Object.entries(current)) {
    if (manifest.files?.[f] !== h) diffs.push(f);
  }
  for (const f of Object.keys(manifest.files ?? {})) {
    if (!(f in current)) diffs.push(`${f}（已删除）`);
  }
  if (diffs.length > 0) {
    fail(
      `架构文档与基线清单不一致（${diffs.join('、')}）：评审后运行 pnpm baseline:update 并提交。`,
    );
  }
  console.log(
    `[baseline] 基线 ${manifest.baselineId} 与文档一致（${Object.keys(current).length} 个文件）。`,
  );
} else {
  fail(
    `用法：node scripts/baseline.mjs <update|check>（收到：${cmd ?? '空'}）`,
  );
}
