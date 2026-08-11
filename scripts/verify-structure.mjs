import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeDependencies = [
  '@ant-design/x',
  '@ant-design/pro-components',
  '@tanstack/react-query',
  'antd',
  'openapi-fetch',
  'react',
  'react-dom',
];
const developmentDependencies = [
  '@biomejs/biome',
  '@umijs/max',
  '@vitest/coverage-v8',
  'dependency-cruiser',
  'happy-dom',
  'openapi-typescript',
  'tailwindcss',
  'typescript',
  'vitest',
];
const sourceRoots = ['config', 'mock', 'src'];
const requiredBiomeScopes = ['config', 'mock', 'scripts', 'src', 'tests'];
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const requiredSkills = {
  'ant-design': 'skills/ant-design/SKILL.md',
  antd: 'skills/antd/SKILL.md',
};
const officialSkillSource = 'ant-design/antd-skill';
const umiImportForms = [
  { label: "from 'umi'", pattern: /\bfrom\s+['"]umi['"]/u },
  { label: "import 'umi'", pattern: /\bimport\s+['"]umi['"]/u },
  { label: "import('umi')", pattern: /\bimport\s*\(\s*['"]umi['"]\s*\)/u },
  { label: "require('umi')", pattern: /\brequire\s*\(\s*['"]umi['"]\s*\)/u },
];

async function readText(root, path, issues) {
  try {
    return await readFile(join(root, path), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      issues.push(`缺少 ${path}`);
      return undefined;
    }
    issues.push(`无法读取 ${path}: ${error.message}`);
    return undefined;
  }
}

async function readJson(root, path, issues) {
  const contents = await readText(root, path, issues);
  if (contents === undefined) return undefined;

  try {
    return JSON.parse(contents);
  } catch (error) {
    issues.push(`${path} JSON 解析错误: ${error.message}`);
    return undefined;
  }
}

function hasDependency(manifest, name) {
  return Boolean(manifest.dependencies?.[name]);
}

function hasBiomeScope(includes, directory) {
  return includes.some(
    (pattern) =>
      pattern === '**/*' ||
      pattern.startsWith(`${directory}/`) ||
      pattern.startsWith(`**/${directory}/`),
  );
}

async function collectSourceFiles(root, path) {
  try {
    const entries = await readdir(join(root, path), { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const child = join(path, entry.name);
        if (entry.isDirectory()) {
          if (
            child === 'src/.umi' ||
            child.startsWith('src/.umi-') ||
            child === 'src/services/generated'
          ) {
            return [];
          }
          return collectSourceFiles(root, child);
        }
        return /\.(?:[cm]?[jt]sx?)$|\.less$/u.test(entry.name) ? [child] : [];
      }),
    );
    return nested.flat();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function checkManifest(manifest, issues) {
  if (!manifest) return;

  if (manifest.packageManager !== 'pnpm@11.18.0') {
    issues.push('packageManager 必须为 pnpm@11.18.0');
  }
  if (!/^>=11(?:\D|$)/u.test(manifest.engines?.pnpm ?? '')) {
    issues.push('engines.pnpm 必须要求 >=11');
  }
  if (!manifest.engines?.node) {
    issues.push('缺少 engines.node');
  }

  for (const name of runtimeDependencies) {
    if (!hasDependency(manifest, name)) {
      issues.push(`${name} 必须位于 dependencies`);
    }
  }
  for (const name of developmentDependencies.filter(
    (name) => name !== '@umijs/max',
  )) {
    if (!manifest.devDependencies?.[name]) {
      issues.push(`${name} 必须位于 devDependencies`);
    }
  }

  const umiMaxIsOutsideDevDependencies = dependencySections
    .filter((section) => section !== 'devDependencies')
    .some((section) => manifest[section]?.['@umijs/max']);
  if (
    !manifest.devDependencies?.['@umijs/max'] ||
    umiMaxIsOutsideDevDependencies
  ) {
    issues.push('@umijs/max 必须仅位于 devDependencies');
  }

  for (const section of dependencySections) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (
        name === 'vite' ||
        name === '@utoo/pack' ||
        name.startsWith('@vitejs/')
      ) {
        issues.push(`禁止 direct Vite/Utoopack 依赖：${section}.${name}`);
      }
    }
  }
}

function checkConfig(contents, issues) {
  if (contents === undefined) return;
  if (!/\butoopack\s*:/u.test(contents)) {
    issues.push('config/config.ts 必须声明 utoopack');
  }
  if (/\bmfsu\s*:/u.test(contents)) {
    issues.push('config/config.ts 不得保留 mfsu');
  }
  if (/\besbuildMinifyIIFE\s*:/u.test(contents)) {
    issues.push('config/config.ts 不得保留 esbuildMinifyIIFE');
  }
}

function checkTsconfig(tsconfig, issues) {
  if (!tsconfig) return;
  if (
    typeof tsconfig.extends === 'string' &&
    tsconfig.extends.includes('.umi/')
  ) {
    issues.push('tsconfig.json 不得 extends .umi 生成配置');
  }
  if (tsconfig.compilerOptions?.moduleResolution !== 'bundler') {
    issues.push('tsconfig.json 必须使用 moduleResolution: bundler');
  }
  if (tsconfig.compilerOptions?.strict !== true) {
    issues.push('tsconfig.json 必须启用 strict');
  }
  if (!Array.isArray(tsconfig.compilerOptions?.paths?.['@/*'])) {
    issues.push('tsconfig.json 必须声明 @/* 路径别名');
  }
  if (!Array.isArray(tsconfig.compilerOptions?.paths?.['@root/*'])) {
    issues.push('tsconfig.json 必须声明 @root/* 路径别名');
  }
}

function checkBiome(biome, issues) {
  if (!biome) return;
  const includes = biome.files?.includes;
  if (!Array.isArray(includes)) {
    issues.push('Biome 必须声明 files.includes');
    return;
  }
  for (const directory of requiredBiomeScopes) {
    if (!hasBiomeScope(includes, directory)) {
      issues.push(`Biome scope 必须覆盖 ${directory}`);
    }
  }
}

function checkSkillLock(lock, issues) {
  if (!lock) {
    issues.push('缺少共享 Skill 声明');
    return;
  }

  if (lock.version !== 1) {
    issues.push('skills-lock.json version 必须为 1');
  }

  const skills = lock.skills ?? {};
  for (const [name, skillPath] of Object.entries(requiredSkills)) {
    const skill = skills[name];
    if (
      skill?.source !== officialSkillSource ||
      skill?.sourceType !== 'github' ||
      skill?.skillPath !== skillPath
    ) {
      issues.push(
        `skills-lock.json 必须从 GitHub ${officialSkillSource} 锁定 ${name}（${skillPath}）`,
      );
    }
    if (!/^[0-9a-f]{64}$/u.test(skill?.computedHash ?? '')) {
      issues.push(
        `skills-lock.json 的 ${name}.computedHash 必须是 64 位十六进制摘要`,
      );
    }
  }

  if (skills.umi !== undefined) {
    issues.push('skills-lock.json 不得锁定 generic umi Skill');
  }

  const unexpectedSkills = Object.keys(skills).filter(
    (name) => !Object.hasOwn(requiredSkills, name),
  );
  if (unexpectedSkills.length > 0) {
    issues.push(
      `skills-lock.json 只允许锁定组件 Skill：${unexpectedSkills.join(', ')}`,
    );
  }
}

async function checkHooks(root, issues) {
  const preCommit = await readText(root, '.husky/pre-commit', issues);
  if (preCommit !== undefined && !preCommit.includes('lint-staged')) {
    issues.push('.husky/pre-commit 必须运行 lint-staged');
  }
  const commitMessage = await readText(root, '.husky/commit-msg', issues);
  if (commitMessage !== undefined && !commitMessage.includes('verify-commit')) {
    issues.push('.husky/commit-msg 必须运行 verify-commit');
  }
  if (preCommit === undefined || commitMessage === undefined) {
    issues.push('缺少 Git hooks 声明');
  }
  await readJson(root, '.lintstagedrc', issues);
}

async function checkSourceFiles(root, issues) {
  const files = (
    await Promise.all(sourceRoots.map((path) => collectSourceFiles(root, path)))
  ).flat();
  for (const path of files) {
    if (path.endsWith('.less')) {
      issues.push(`${path}: 不允许 .less 文件`);
      continue;
    }
    const contents = await readText(root, path, issues);
    const importForm = umiImportForms.find(({ pattern }) =>
      pattern.test(contents),
    );
    if (importForm) {
      issues.push(
        `${path}: 不允许 ${importForm.label}，请从 '@umijs/max' 导入`,
      );
    }
  }
}

export async function verifyStructure(root = process.cwd()) {
  const issues = [];
  const manifest = await readJson(root, 'package.json', issues);
  checkManifest(manifest, issues);

  checkConfig(await readText(root, 'config/config.ts', issues), issues);
  checkTsconfig(await readJson(root, 'tsconfig.json', issues), issues);
  checkBiome(await readJson(root, 'biome.json', issues), issues);
  checkSkillLock(await readJson(root, 'skills-lock.json', issues), issues);
  await checkHooks(root, issues);
  await checkSourceFiles(root, issues);

  return issues;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const issues = await verifyStructure();
  if (issues.length === 0) {
    console.log('结构验证通过');
  } else {
    for (const issue of issues) console.error(issue);
    process.exitCode = 1;
  }
}
