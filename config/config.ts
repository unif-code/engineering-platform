import { defineConfig } from '@umijs/max';
import defaultSettings from './defaultSettings';
import proxy from './proxy';
import routes from './routes';
import { themePreflightScript } from './themePreflight';

const { REACT_APP_ENV = 'dev' } = process.env;

export default defineConfig({
  antd: {
    configProvider: {},
    appConfig: {},
  },
  headScripts: [{ content: themePreflightScript }],
  access: {},
  model: {},
  initialState: {},
  request: { dataField: '' },
  mock: { exclude: ['**/*.test.ts', '**/handlers.ts'] },
  reactQuery: {},
  tailwindcss: {},
  layout: {
    title: defaultSettings.title,
  },
  mfsu: false,
  routes,
  proxy: proxy[REACT_APP_ENV],
  npmClient: 'pnpm',
  esbuildMinifyIIFE: true,
});
