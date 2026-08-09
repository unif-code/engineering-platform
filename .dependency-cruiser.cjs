/** 依赖方向契约（见 docs/architecture/06 与 AGENTS.md）。 */
module.exports = {
  forbidden: [
    {
      name: 'pages-only-via-features',
      comment: 'pages 禁止直达 services（必须经 features）',
      severity: 'error',
      from: { path: '^(?:\\.\\./)*src/pages' },
      to: { path: '^(?:\\.\\./)*src/services' },
    },
    {
      name: 'features-public-entry-only',
      comment: 'feature 之间只允许经包根公开入口互访',
      severity: 'error',
      from: { path: '^(?:\\.\\./)*src/features/([^/]+)/' },
      to: {
        path: '^(?:\\.\\./)*src/features/[^/]+/.+',
        pathNot:
          '^(?:\\.\\./)*src/features/(?:$1/|[^/]+/index\\.tsx?$)',
      },
    },
    {
      name: 'components-no-business',
      comment: '共享组件不依赖 features 与 services',
      severity: 'error',
      from: { path: '^(?:\\.\\./)*src/components' },
      to: { path: '^(?:\\.\\./)*src/(features|services)' },
    },
    {
      name: 'transport-no-app-deps',
      comment: 'transport 不依赖上层',
      severity: 'error',
      from: { path: '^(?:\\.\\./)*src/services/transport' },
      to: { path: '^(?:\\.\\./)*src/(features|pages)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.(test|spec)\\.(ts|tsx)$|^src/\\.umi' },
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
  },
};
