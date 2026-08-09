import { defineConfig } from '@umijs/max';
import defaultSettings from './defaultSettings';
import proxy from './proxy';
import routes from './routes';

const { REACT_APP_ENV = 'dev' } = process.env;

export default defineConfig({
  antd: {
    appConfig: {},
  },
  access: {},
  model: {},
  initialState: {},
  request: {},
  mock: { exclude: ['**/*.test.ts', '**/handlers.ts'] },
  reactQuery: {},
  tailwindcss: {},
  layout: {
    title: defaultSettings.title,
  },
  routes,
  proxy: proxy[REACT_APP_ENV],
  npmClient: 'pnpm',
  esbuildMinifyIIFE: true,
});
