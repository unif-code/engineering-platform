import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');

const resolveAntdBin = (root) => {
  const packageRoot = path.join(root, 'node_modules', '@ant-design', 'cli');
  const packagePath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const binTarget =
    typeof packageJson.bin === 'string'
      ? packageJson.bin
      : packageJson.bin?.antd;

  if (typeof binTarget !== 'string' || binTarget.trim() === '') {
    throw new Error(
      `@ant-design/cli package metadata does not declare an "antd" binary: ${packagePath}`,
    );
  }

  return path.resolve(packageRoot, binTarget);
};

export const antdInvocation = (root, args, baseEnv = process.env) => ({
  args: [resolveAntdBin(root), ...args],
  command: process.execPath,
  env: {
    ...baseEnv,
    NO_UPDATE_CHECK: '1',
  },
});

export const runAntd = (args = process.argv.slice(2)) => {
  const invocation = antdInvocation(ROOT, args);
  const result = spawnSync(invocation.command, invocation.args, {
    env: invocation.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = runAntd();
}
