import { readdir, readFile } from 'node:fs/promises';
import { join, matchesGlob, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
const sourceRoots = ['config', 'src'];
const requiredBiomeScopes = ['config', 'scripts', 'src', 'tests'];
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
const commentsAndStrings =
  /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/gu;

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
        const normalizedChild = child.split(sep).join('/');
        if (entry.isDirectory()) {
          if (
            normalizedChild === 'src/.umi' ||
            normalizedChild.startsWith('src/.umi-') ||
            normalizedChild === 'src/services/generated'
          ) {
            return [];
          }
          return collectSourceFiles(root, child);
        }
        return /\.(?:[cm]?[jt]sx?)$|\.less$/u.test(entry.name)
          ? [normalizedChild]
          : [];
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

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function staticPropertyName(name) {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return { known: true, text: name.text };
  }
  if (ts.isComputedPropertyName(name)) {
    const expression = unwrapExpression(name.expression);
    if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
      return { known: true, text: expression.text };
    }
    return { known: false };
  }
  return { known: false };
}

function effectiveMockSetting(objectLiteral) {
  let setting = 'absent';

  for (const property of objectLiteral.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spread = unwrapExpression(property.expression);
      if (ts.isObjectLiteralExpression(spread)) {
        const spreadSetting = effectiveMockSetting(spread);
        if (spreadSetting !== 'absent') setting = spreadSetting;
      } else {
        setting = 'unknown';
      }
      continue;
    }

    if (!property.name) continue;
    const propertyName = staticPropertyName(property.name);
    if (!propertyName.known) {
      setting = 'unknown';
      continue;
    }
    if (propertyName.text !== 'mock') continue;
    if (ts.isPropertyAssignment(property)) {
      setting =
        unwrapExpression(property.initializer).kind ===
        ts.SyntaxKind.FalseKeyword
          ? 'false'
          : 'other';
    } else {
      setting = 'other';
    }
  }

  return setting;
}

function exportedDefineConfigObject(contents) {
  const sourceFile = ts.createSourceFile(
    'config/config.ts',
    contents,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const exportAssignment = sourceFile.statements.find(
    (statement) =>
      ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  if (!exportAssignment) return undefined;

  const exportedExpression = unwrapExpression(exportAssignment.expression);
  if (!ts.isCallExpression(exportedExpression)) return undefined;
  const callee = unwrapExpression(exportedExpression.expression);
  if (!ts.isIdentifier(callee) || callee.text !== 'defineConfig') {
    return undefined;
  }

  const config = exportedExpression.arguments[0];
  return config && ts.isObjectLiteralExpression(unwrapExpression(config))
    ? unwrapExpression(config)
    : undefined;
}

function checkConfig(contents, issues) {
  if (contents === undefined) return;
  const executableContents = contents.replace(commentsAndStrings, '');
  if (!/\butoopack\s*:/u.test(executableContents)) {
    issues.push('config/config.ts 必须声明 utoopack');
  }
  const config = exportedDefineConfigObject(contents);
  if (!config || effectiveMockSetting(config) !== 'false') {
    issues.push('config/config.ts 的 mock 必须显式为 false');
  }
  if (/\bmfsu\s*:/u.test(executableContents)) {
    issues.push('config/config.ts 不得保留 mfsu');
  }
  if (/\besbuildMinifyIIFE\s*:/u.test(executableContents)) {
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

function checkDoctorConfig(doctorConfig, issues) {
  if (!doctorConfig) return;
  const ignoredFiles = doctorConfig.ignore?.files;
  if (
    Array.isArray(ignoredFiles) &&
    ignoredFiles.some((pattern) => {
      if (typeof pattern !== 'string') return false;
      const segments = pattern
        .trim()
        .replaceAll('\\', '/')
        .replace(/^\/+|\/+$/gu, '')
        .split('/')
        .filter((segment) => segment !== '' && segment !== '.');
      while (segments[0] === '**') segments.shift();
      return matchesGlob('mock', segments[0] ?? '');
    })
  ) {
    issues.push('doctor.config.json 不得忽略已退役的 mock/ source');
  }
}

function checkPnpmWorkspace(contents, issues) {
  if (contents === undefined) return;
  const setting = contents.match(
    /^enableGlobalVirtualStore:\s*([^#\s]+)(?:\s*#.*)?$/mu,
  );
  if (setting?.[1] !== 'false') {
    issues.push('enableGlobalVirtualStore 必须显式设为 false');
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
  checkDoctorConfig(await readJson(root, 'doctor.config.json', issues), issues);
  checkPnpmWorkspace(
    await readText(root, 'pnpm-workspace.yaml', issues),
    issues,
  );
  checkSkillLock(await readJson(root, 'skills-lock.json', issues), issues);
  await checkHooks(root, issues);
  if ((await collectSourceFiles(root, 'mock')).length > 0) {
    issues.push('禁止保留运行时 mock/ source');
  }
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
