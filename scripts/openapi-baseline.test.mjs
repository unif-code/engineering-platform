import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { classifyBreakingRelease } from './openapi-baseline.mjs';
import { generatorInvocation } from './openapi-generator-command.mjs';
import { canonicalizeLf } from './openapi-line-endings.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('pins OpenAPI lock and generated artifacts to LF line endings', () => {
  const attributes = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');

  assert.match(attributes, /^openapi\/artifact\.lock\.json text eol=lf$/m);
  assert.match(attributes, /^openapi\/spec\.json text eol=lf$/m);
  assert.match(attributes, /^src\/services\/generated\/\*\* text eol=lf$/m);
});

test('canonicalizes CRLF worktree bytes before validating an OpenAPI digest', () => {
  assert.deepEqual(
    canonicalizeLf(Buffer.from('{\r\n  "openapi": "3.1.0"\r\n}\r\n')),
    Buffer.from('{\n  "openapi": "3.1.0"\n}\n'),
  );
});

test('preserves non-CRLF bytes while canonicalizing line endings', () => {
  assert.deepEqual(
    canonicalizeLf(Buffer.from([0xff, 0x0d, 0x0a, 0x80, 0x0d, 0x42])),
    Buffer.from([0xff, 0x0a, 0x80, 0x0d, 0x42]),
  );
});

test('fetch accepts a CRLF checkout whose LF bytes match the locked artifact', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-fetch-'));
  const scriptsDir = path.join(fixtureRoot, 'scripts');
  const openapiDir = path.join(fixtureRoot, 'openapi');
  const artifact = Buffer.from(
    '{\n  "info": { "version": "0.2.0" },\n  "openapi": "3.1.0"\n}\n',
  );

  try {
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.mkdirSync(openapiDir, { recursive: true });
    for (const script of [
      'openapi-baseline.mjs',
      'openapi-generator-command.mjs',
      'openapi-line-endings.mjs',
      'openapi.mjs',
    ]) {
      fs.copyFileSync(
        path.join(ROOT, 'scripts', script),
        path.join(scriptsDir, script),
      );
    }
    fs.writeFileSync(path.join(openapiDir, 'artifact.json'), artifact);
    fs.writeFileSync(
      path.join(openapiDir, 'artifact.lock.json'),
      `${JSON.stringify({
        sha256: createHash('sha256').update(artifact).digest('hex'),
        source: 'file:openapi/artifact.json',
        version: '0.2.0',
      })}\n`,
    );
    fs.writeFileSync(
      path.join(openapiDir, 'spec.json'),
      Buffer.from(artifact.toString('utf8').replaceAll('\n', '\r\n'), 'utf8'),
    );

    execFileSync(
      process.execPath,
      [path.join(scriptsDir, 'openapi.mjs'), 'fetch'],
      {
        cwd: fixtureRoot,
        encoding: 'utf8',
      },
    );

    assert.deepEqual(
      fs.readFileSync(path.join(openapiDir, 'spec.json')),
      artifact,
    );
  } finally {
    fs.rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test('runs the generator CLI through Node on Windows', () => {
  const invocation = generatorInvocation(ROOT, 'win32');

  assert.equal(invocation.command, process.execPath);
  assert.match(invocation.args[0], /openapi-typescript[\\/]bin[\\/]cli\.js$/);
});

test('allows a development-stage breaking release when 0.x minor increases', () => {
  assert.equal(classifyBreakingRelease('0.1.0', '0.2.0'), 'development-minor');
});

test('rejects a development-stage breaking release when only patch increases', () => {
  assert.equal(classifyBreakingRelease('0.2.0', '0.2.1'), null);
});

test('allows a stable breaking release when major increases', () => {
  assert.equal(classifyBreakingRelease('1.2.0', '2.0.0'), 'major');
});

test('rejects a stable breaking release when only minor increases', () => {
  assert.equal(classifyBreakingRelease('1.2.0', '1.3.0'), null);
});

test('rejects malformed or non-increasing versions', () => {
  assert.equal(classifyBreakingRelease('invalid', '0.2.0'), null);
  assert.equal(classifyBreakingRelease('0.2.0', 'invalid'), null);
  assert.equal(classifyBreakingRelease('0.2.0', '0.1.0'), null);
  assert.equal(classifyBreakingRelease('1.2.0', '1.2.0'), null);
});
