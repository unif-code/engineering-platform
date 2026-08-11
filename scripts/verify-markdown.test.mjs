import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { promisify } from 'node:util';
import { verifyMarkdown } from './verify-markdown.mjs';

const execFileAsync = promisify(execFile);
const fixtureRoots = [];
const verifierPath = join(import.meta.dirname, 'verify-markdown.mjs');

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((root) => rm(root, { force: true, recursive: true })),
  );
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'engineering-platform-markdown-'));
  fixtureRoots.push(root);
  return root;
}

async function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

test('accepts recursive Markdown inputs and supported link forms', async () => {
  const root = await createFixture();
  await write(
    root,
    'README.md',
    [
      '# Repository',
      '',
      '[Guide](docs/guide.md#usage)',
      '[Query](docs/guide.md?view=full#usage)',
      '[External](https://example.com/missing.md)',
      '[Mail](mailto:owner@example.com)',
      '[Local heading](#repository)',
      '`[Inline code](missing-inline.md)`',
      '',
      '```md',
      '[Fenced code](missing-fenced.md)',
      '```',
      '',
    ].join('\n'),
  );
  await write(root, 'docs/guide.md', '# Guide\n\n## Usage\n');

  assert.deepEqual(await verifyMarkdown(['README.md', 'docs'], root), []);
});

test('reports whitespace, final newline, fence, and relative link problems', async () => {
  const root = await createFixture();
  await write(root, 'docs/trailing.md', '# Trailing  \n');
  await write(root, 'docs/no-newline.md', '# Missing newline');
  await write(root, 'docs/fence.md', '# Fence\n\n```ts\nconst value = 1;\n');
  await write(root, 'docs/link.md', '[Missing](../missing/guide.md#intro)\n');

  const output = (await verifyMarkdown(['docs'], root)).join('\n');
  assert.match(output, /docs\/trailing\.md:1: 行尾存在空白/u);
  assert.match(output, /docs\/no-newline\.md: 缺少末尾换行/u);
  assert.match(output, /docs\/fence\.md: 存在未闭合代码围栏/u);
  assert.match(
    output,
    /docs\/link\.md:1: 断裂的相对链接 \.\.\/missing\/guide\.md#intro/u,
  );
});

test('deduplicates inputs and skips generated or dependency directories', async () => {
  const root = await createFixture();
  await write(root, 'docs/guide.md', '# Guide\n');
  await write(root, 'docs/.umi/broken.md', '[Missing](missing.md)');
  await write(root, 'docs/node_modules/broken.md', '[Missing](missing.md)');
  await write(root, 'coverage/broken.md', '[Missing](missing.md)');
  await write(root, 'dist/broken.md', '[Missing](missing.md)');

  assert.deepEqual(
    await verifyMarkdown(['docs', 'docs/guide.md', 'coverage', 'dist'], root),
    [],
  );
});

test('reports missing inputs instead of silently succeeding', async () => {
  const root = await createFixture();

  assert.deepEqual(await verifyMarkdown(['missing.md'], root), [
    'missing.md: 输入不存在',
  ]);
});

test('CLI returns a non-zero exit code with aggregated diagnostics', async () => {
  const root = await createFixture();
  await write(root, 'README.md', '[Missing](missing.md)');

  await assert.rejects(
    execFileAsync(process.execPath, [verifierPath, 'README.md'], { cwd: root }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /缺少末尾换行/u);
      assert.match(error.stderr, /断裂的相对链接 missing\.md/u);
      return true;
    },
  );
});
