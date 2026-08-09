// 运行时配置：https://umijs.org/docs/api/runtime-config

// 全局初始化数据，用于 Layout 用户信息与前端可见性初始化
export async function getInitialState(): Promise<{ name: string }> {
  return { name: '内部研发平台' };
}

export const layout = () => {
  return {
    logo: false,
    menu: {
      locale: false,
    },
  };
};
