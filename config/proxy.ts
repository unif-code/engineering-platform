/** 开发代理：连真实后端时按环境配置；当前用 mock，默认留空。 */
export default {
  dev: {
    // '/api/': { target: 'http://localhost:8080', changeOrigin: true },
  },
  test: {},
  pre: {},
} as Record<string, Record<string, any>>;
