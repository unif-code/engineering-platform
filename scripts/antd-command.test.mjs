import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { antdInvocation } from './antd-command.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('routes Ant Design CLI scripts through a cross-platform Node runner', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  );

  assert.equal(
    packageJson.scripts['antd:doctor'],
    'node scripts/antd-command.mjs doctor',
  );
  assert.equal(
    packageJson.scripts['antd:lint'],
    'node scripts/antd-command.mjs lint src',
  );
  assert.equal(
    packageJson.scripts['antd:usage'],
    'node scripts/antd-command.mjs usage src',
  );
});

test('resolves the public object-form Ant Design CLI bin metadata', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'antd-command-'));
  const packageRoot = path.join(
    fixtureRoot,
    'node_modules',
    '@ant-design',
    'cli',
  );

  try {
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ bin: { antd: 'commands/custom-entry.mjs' } }),
    );

    const invocation = antdInvocation(fixtureRoot, ['doctor'], {
      PRESERVED: 'yes',
    });

    assert.equal(invocation.command, process.execPath);
    assert.equal(
      invocation.args[0],
      path.join(packageRoot, 'commands', 'custom-entry.mjs'),
    );
    assert.deepEqual(invocation.args.slice(1), ['doctor']);
    assert.equal(invocation.env.NO_UPDATE_CHECK, '1');
    assert.equal(invocation.env.PRESERVED, 'yes');
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test('supports string-form Ant Design CLI bin metadata', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'antd-command-'));
  const packageRoot = path.join(
    fixtureRoot,
    'node_modules',
    '@ant-design',
    'cli',
  );

  try {
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ bin: 'commands/string-entry.mjs' }),
    );

    const invocation = antdInvocation(fixtureRoot, ['usage', 'src']);

    assert.equal(
      invocation.args[0],
      path.join(packageRoot, 'commands', 'string-entry.mjs'),
    );
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test('fails clearly when Ant Design CLI bin metadata is missing', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'antd-command-'));
  const packageRoot = path.join(
    fixtureRoot,
    'node_modules',
    '@ant-design',
    'cli',
  );

  try {
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), '{}');

    assert.throws(
      () => antdInvocation(fixtureRoot, ['doctor']),
      /does not declare an "antd" binary/,
    );
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
