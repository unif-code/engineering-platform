import path from 'node:path';
import process from 'node:process';

export const generatorInvocation = (root, platform = process.platform) =>
  platform === 'win32'
    ? {
        args: [
          path.join(
            root,
            'node_modules',
            'openapi-typescript',
            'bin',
            'cli.js',
          ),
        ],
        command: process.execPath,
      }
    : {
        args: [],
        command: path.join(root, 'node_modules', '.bin', 'openapi-typescript'),
      };
