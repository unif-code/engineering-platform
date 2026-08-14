import assert from 'node:assert/strict';
import fs from 'node:fs';
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
