import { join } from 'node:path';
import { defineConfig } from '@umijs/max';
import defaultSettings from './defaultSettings';
import proxy from './proxy';
import routes from './routes';
import { themePreflightScript } from './themePreflight';

const { REACT_APP_ENV = 'dev' } = process.env;
const proxyEnvironment =
  REACT_APP_ENV in proxy ? (REACT_APP_ENV as keyof typeof proxy) : 'dev';

export default defineConfig({
  base: '/',
  alias: {
    '@root': join(__dirname, '..'),
  },
  hash: true,
  fastRefresh: true,
  routePrefetch: {},
  manifest: {},
  antd: {
    configProvider: {},
    appConfig: {},
  },
  headScripts: [{ content: themePreflightScript }],
  access: {},
  model: {},
  initialState: {},
  request: { dataField: '' },
  mock: false,
  reactQuery: {},
  tailwindcss: {},
  layout: {
    title: defaultSettings.title,
  },
  routes,
  proxy: proxy[proxyEnvironment],
  npmClient: 'pnpm',
  utoopack: {},
});
