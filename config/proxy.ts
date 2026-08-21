/** 本地开发保留浏览器同源 Host，并将 API 转发到 Control Plane。 */
const proxy = {
  dev: {
    '/api/': { target: 'http://localhost:8080', changeOrigin: false },
  },
  test: {},
  pre: {},
};

export type ProxyEnvironment = keyof typeof proxy;

export default proxy;
