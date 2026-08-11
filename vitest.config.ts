import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@root': join(__dirname),
      '@@': join(__dirname, 'src', '.umi'),
    },
  },
  test: {
    // ProComponents + happy-dom 的高资源页面套件并发时会造成资源饥饿，需串行执行测试文件。
    clearMocks: true,
    fileParallelism: false,
    environment: 'happy-dom',
    globals: true,
    restoreMocks: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'mock/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'src/.umi*/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: ['src/**/*.{ts,tsx}', 'mock/**/*.ts'],
      exclude: [
        'src/.umi*/**',
        'src/services/generated/**',
        'src/**/*.d.ts',
        'src/**/index.style.ts',
        '**/*.{test,spec}.{ts,tsx}',
      ],
    },
    passWithNoTests: false,
    testTimeout: 15000,
  },
});
