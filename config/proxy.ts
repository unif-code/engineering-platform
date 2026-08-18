/** 开发代理按环境配置；浏览器业务请求经同源 platform-gateway。 */
const proxy = {
  dev: {
    // '/api/': { target: 'http://localhost:8080', changeOrigin: true },
  },
  test: {},
  pre: {},
};

export type ProxyEnvironment = keyof typeof proxy;

export default proxy;
