import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyBreakingRelease } from './openapi-baseline.mjs';

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
