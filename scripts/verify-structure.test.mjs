import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { verifyStructure } from './verify-structure.mjs';

const fixtureRoots = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((root) => rm(root, { force: true, recursive: true })),
  );
});

async function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function createValidFixture() {
  const root = await mkdtemp(join(tmpdir(), 'engineering-platform-structure-'));
  fixtureRoots.push(root);

  await write(
    root,
    'package.json',
    JSON.stringify(
      {
        packageManager: 'pnpm@11.18.0',
        engines: { node: '>=22', pnpm: '>=11' },
        dependencies: {
          '@ant-design/x': '^2.0.0',
          '@ant-design/pro-components': '^3.0.0',
          '@tanstack/react-query': '^5.0.0',
          antd: '^6.0.0',
          'openapi-fetch': '^0.17.0',
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
        devDependencies: {
          '@biomejs/biome': '^2.0.0',
          '@umijs/max': '^4.0.0',
          '@vitest/coverage-v8': '^4.0.0',
          'dependency-cruiser': '^18.0.0',
          'happy-dom': '^20.0.0',
          'openapi-typescript': '^7.0.0',
          tailwindcss: '^4.0.0',
          typescript: '^5.0.0',
          vitest: '^4.0.0',
        },
      },
      null,
      2,
    ),
  );
  await write(
    root,
    'pnpm-workspace.yaml',
    'packages:\n  - .\n\nenableGlobalVirtualStore: false\n',
  );
  await write(
    root,
    'config/config.ts',
    "import { defineConfig } from '@umijs/max';\nexport default defineConfig({ mock: false, utoopack: {} });\n",
  );
  await write(
    root,
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'bundler',
        paths: { '@/*': ['./src/*'], '@root/*': ['./*'] },
        strict: true,
      },
      include: ['config', 'src'],
    }),
  );
  await write(
    root,
    'biome.json',
    JSON.stringify({
      files: {
        includes: [
          'config/**/*.ts',
          'scripts/**/*.mjs',
          'src/**/*.{ts,tsx}',
          'tests/**/*.ts',
        ],
      },
    }),
  );
  await write(
    root,
    'skills-lock.json',
    JSON.stringify({
      version: 1,
      skills: {
        'ant-design': {
          computedHash: 'a'.repeat(64),
          skillPath: 'skills/ant-design/SKILL.md',
          source: 'ant-design/antd-skill',
          sourceType: 'github',
        },
        antd: {
          computedHash: 'b'.repeat(64),
          skillPath: 'skills/antd/SKILL.md',
          source: 'ant-design/antd-skill',
          sourceType: 'github',
        },
      },
    }),
  );
  await write(root, '.husky/pre-commit', 'pnpm exec lint-staged\n');
  await write(root, '.husky/commit-msg', 'pnpm exec max verify-commit "$1"\n');
  await write(root, '.lintstagedrc', '{"*.{ts,tsx}": "biome check --write"}\n');
  await write(
    root,
    'src/index.ts',
    "export { defineConfig } from '@umijs/max';\n",
  );

  return root;
}

async function mutatePackage(root, mutate) {
  const packagePath = join(root, 'package.json');
  const manifest = JSON.parse(
    await (await import('node:fs/promises')).readFile(packagePath, 'utf8'),
  );
  mutate(manifest);
  await write(root, 'package.json', JSON.stringify(manifest, null, 2));
}

test('accepts the platform engineering baseline', async () => {
  const root = await createValidFixture();
  assert.deepEqual(await verifyStructure(root), []);
});

test('reports obsolete builders and generated tsconfig coupling', async () => {
  const root = await createValidFixture();
  await mutatePackage(root, ({ devDependencies }) => {
    devDependencies.vite = '^7.3.5';
  });
  await write(root, 'config/config.ts', 'export default { mfsu: false };\n');
  await write(
    root,
    'tsconfig.json',
    '{"extends":"./src/.umi/tsconfig.json"}\n',
  );

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /vite/);
  assert.match(output, /utoopack/);
  assert.match(output, /\.umi/);
});

test('does not accept utoopack mentioned only in comments or strings', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'config/config.ts',
    [
      "import { defineConfig } from '@umijs/max';",
      "const migrationNote = 'utoopack: {}';",
      '// utoopack: {}',
      'export default defineConfig({});',
      '',
    ].join('\n'),
  );

  assert.match(
    (await verifyStructure(root)).join('\n'),
    /config\/config\.ts 必须声明 utoopack/,
  );
});

test('ignores legacy builder names mentioned only in comments or strings', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'config/config.ts',
    [
      "import { defineConfig } from '@umijs/max';",
      "const migrationNote = 'mfsu: false; esbuildMinifyIIFE: true';",
      '// mfsu: false',
      '/* esbuildMinifyIIFE: true */',
      'export default defineConfig({ mock: false, utoopack: {} });',
      '',
    ].join('\n'),
  );

  assert.deepEqual(await verifyStructure(root), []);
});

test('reports framework imports and Less without applying API rules', async () => {
  const root = await createValidFixture();
  await write(root, 'src/legacy.ts', "import { history } from 'umi';\n");
  await write(root, 'src/legacy.less', '.legacy {}\n');
  await write(
    root,
    'src/services/domain/index.ts',
    'export const response = { code: 200, data: {}, message: "ok" };\n',
  );

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /from 'umi'/);
  assert.match(output, /\.less/);
  assert.doesNotMatch(output, /信封|解包|code/);
});

test('ignores generated Umi artifacts and tool fixture strings', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'src/.umi-production/core/runtime.ts',
    "import { history } from 'umi';\n",
  );
  await write(root, 'scripts/fixture.mjs', 'const fixture = "from \'umi\'";\n');

  assert.deepEqual(await verifyStructure(root), []);
});

test('reports missing package, tooling, and Skill baseline requirements together', async () => {
  const root = await createValidFixture();
  await mutatePackage(root, (manifest) => {
    manifest.packageManager = 'pnpm@10.30.3';
    manifest.engines.pnpm = '>=10';
    delete manifest.devDependencies['@umijs/max'];
  });
  await write(root, 'biome.json', '{"files":{"includes":["src/**/*.ts"]}}\n');
  await rm(join(root, 'skills-lock.json'));
  await rm(join(root, '.husky'), { force: true, recursive: true });

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /pnpm@11\.18\.0/);
  assert.match(output, /engines\.pnpm/);
  assert.match(output, /@umijs\/max/);
  assert.match(output, /Biome/);
  assert.match(output, /hooks/);
  assert.match(output, /Skill/);
});

test('requires the component Skills and rejects the generic Umi Skill', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'skills-lock.json',
    JSON.stringify({
      version: 1,
      skills: {
        'ant-design': {
          computedHash: 'invalid',
          skillPath: 'skills/ant-design/SKILL.md',
          source: 'wrong/source',
          sourceType: 'github',
        },
        umi: {
          computedHash: 'c'.repeat(64),
          skillPath: 'skills/umi/SKILL.md',
          source: 'unif-design/skills',
          sourceType: 'github',
        },
      },
    }),
  );

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /ant-design\/antd-skill/u);
  assert.match(output, /skills\/antd\/SKILL\.md/u);
  assert.match(output, /不得锁定 generic umi Skill/u);
  assert.match(output, /computedHash/u);
});

test('requires Umi runtime mock to stay disabled', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'config/config.ts',
    "import { defineConfig } from '@umijs/max';\nexport default defineConfig({ utoopack: {} });\n",
  );

  assert.match(
    (await verifyStructure(root)).join('\n'),
    /mock 必须显式为 false/u,
  );
});

test('rejects hand-written runtime API mock sources', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'mock/api.ts',
    "export default { 'GET /api/v1/me': () => ({}) };\n",
  );

  assert.match(
    (await verifyStructure(root)).join('\n'),
    /禁止保留运行时 mock\/ source/u,
  );
});

test('reports every required platform dependency when individually missing', async () => {
  const dependencies = ['@ant-design/x', 'openapi-fetch'];
  const devDependencies = ['dependency-cruiser', 'openapi-typescript'];

  for (const name of dependencies) {
    const root = await createValidFixture();
    await mutatePackage(root, (manifest) => {
      delete manifest.dependencies[name];
    });
    assert.match((await verifyStructure(root)).join('\n'), new RegExp(name));
  }

  for (const name of devDependencies) {
    const root = await createValidFixture();
    await mutatePackage(root, (manifest) => {
      delete manifest.devDependencies[name];
    });
    assert.match((await verifyStructure(root)).join('\n'), new RegExp(name));
  }
});

test('requires @umijs/max only in devDependencies', async () => {
  for (const section of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const root = await createValidFixture();
    await mutatePackage(root, (manifest) => {
      delete manifest.devDependencies['@umijs/max'];
      manifest[section] = { ...manifest[section], '@umijs/max': '^4.0.0' };
    });

    assert.match(
      (await verifyStructure(root)).join('\n'),
      /@umijs\/max 必须仅位于 devDependencies/,
    );
  }

  const root = await createValidFixture();
  await mutatePackage(root, (manifest) => {
    delete manifest.devDependencies['@umijs/max'];
  });
  assert.match(
    (await verifyStructure(root)).join('\n'),
    /@umijs\/max 必须仅位于 devDependencies/,
  );
});

test('requires a stable local virtual store for hook dependency resolution', async () => {
  const root = await createValidFixture();
  await write(
    root,
    'pnpm-workspace.yaml',
    'packages:\n  - .\n\nenableGlobalVirtualStore: true\n',
  );

  assert.match(
    (await verifyStructure(root)).join('\n'),
    /enableGlobalVirtualStore 必须显式设为 false/u,
  );
});

test('reports direct Vite and Utoopack dependencies in peer and optional sections', async () => {
  const root = await createValidFixture();
  await mutatePackage(root, (manifest) => {
    manifest.peerDependencies = { vite: '^7.3.5' };
    manifest.optionalDependencies = { '@utoo/pack': '^1.0.0' };
  });

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /vite/);
  assert.match(output, /@utoo\/pack/);
});

test('reports side-effect, dynamic, and require imports from umi', async () => {
  const root = await createValidFixture();
  await write(root, 'src/side-effect.ts', "import 'umi';\n");
  await write(root, 'src/dynamic.ts', "await import('umi');\n");
  await write(root, 'src/require.ts', "const umi = require('umi');\n");

  const output = (await verifyStructure(root)).join('\n');
  assert.match(output, /side-effect\.ts:.*import 'umi'/);
  assert.match(output, /dynamic\.ts:.*import\('umi'\)/);
  assert.match(output, /require\.ts:.*require\('umi'\)/);
});
