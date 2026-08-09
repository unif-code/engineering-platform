import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise } from 'dependency-cruiser';
import dependencyConfig from '../.dependency-cruiser.cjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = resolve(
  repositoryRoot,
  'tests/fixtures/dependency-contract',
);
const { tsConfig: _productionTsConfig, ...fixtureOptions } =
  dependencyConfig.options;

const { output } = await cruise(['src'], {
  ...fixtureOptions,
  baseDir: fixtureRoot,
  ruleSet: { forbidden: dependencyConfig.forbidden },
  validate: true,
});

assert.equal(typeof output, 'object', 'dependency-cruiser 应返回结构化结果');

const rulesFor = (from, to) => {
  const source = output.modules.find((module) => module.source === from);
  assert.ok(source, `fixture source 未被巡检: ${from}`);
  const dependency = source.dependencies.find(
    (candidate) => candidate.resolved === to,
  );
  assert.ok(dependency, `fixture 依赖未被解析: ${from} -> ${to}`);
  return (dependency.rules ?? []).map((rule) => rule.name).sort();
};

const cases = [
  {
    from: 'src/pages/Allowed/index.ts',
    to: 'src/features/alpha/index.ts',
    rules: [],
  },
  {
    from: 'src/features/alpha/index.ts',
    to: 'src/features/alpha/private.ts',
    rules: [],
  },
  {
    from: 'src/features/alpha/index.ts',
    to: 'src/features/beta/index.ts',
    rules: [],
  },
  {
    from: 'src/features/alpha/index.ts',
    to: 'src/services/domain/index.ts',
    rules: [],
  },
  {
    from: 'src/services/domain/index.ts',
    to: 'src/services/transport/index.ts',
    rules: [],
  },
  {
    from: 'src/pagesLegacy/index.ts',
    to: 'src/services/domain/index.ts',
    rules: [],
  },
  {
    from: 'src/componentsLegacy/index.ts',
    to: 'src/features/alpha/index.ts',
    rules: [],
  },
  {
    from: 'src/featuresLegacy/index.ts',
    to: 'src/pages/Allowed/index.ts',
    rules: [],
  },
  {
    from: 'src/servicesLegacy/index.ts',
    to: 'src/features/alpha/index.ts',
    rules: [],
  },
  {
    from: 'src/pages/Service/index.ts',
    to: 'src/services/domain/index.ts',
    rules: ['pages-only-via-features'],
  },
  {
    from: 'src/pages/FeaturePrivate/index.ts',
    to: 'src/features/beta/private.ts',
    rules: ['pages-feature-public-entry-only'],
  },
  {
    from: 'src/features/beta/cross-private.ts',
    to: 'src/features/alpha/private.ts',
    rules: ['features-public-entry-only'],
  },
  {
    from: 'src/features/beta/page.ts',
    to: 'src/pages/Allowed/index.ts',
    rules: ['features-no-pages'],
  },
  {
    from: 'src/components/Business/index.ts',
    to: 'src/features/alpha/index.ts',
    rules: ['components-no-business'],
  },
  {
    from: 'src/components/Business/index.ts',
    to: 'src/services/domain/index.ts',
    rules: ['components-no-business'],
  },
  {
    from: 'src/services/domain/feature.ts',
    to: 'src/features/alpha/index.ts',
    rules: ['services-no-app-deps'],
  },
  {
    from: 'src/services/domain/page.ts',
    to: 'src/pages/Allowed/index.ts',
    rules: ['services-no-app-deps'],
  },
  {
    from: 'src/services/transport/feature.ts',
    to: 'src/features/alpha/index.ts',
    rules: ['services-no-app-deps', 'transport-no-app-deps'],
  },
  {
    from: 'src/services/transport/page.ts',
    to: 'src/pages/Allowed/index.ts',
    rules: ['services-no-app-deps', 'transport-no-app-deps'],
  },
  {
    from: 'src/services/transportLegacy/feature.ts',
    to: 'src/features/alpha/index.ts',
    rules: ['services-no-app-deps'],
  },
];

const failures = [];

for (const contractCase of cases) {
  const actual = rulesFor(contractCase.from, contractCase.to);
  const expected = [...contractCase.rules].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(
      `${contractCase.from} -> ${contractCase.to}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

assert.deepEqual(failures, [], failures.join('\n'));

console.log(`dependency architecture contract: ${cases.length} edges verified`);
