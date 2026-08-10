import { App } from 'antd';
import { useCallback } from 'react';

export function useStaticPrototypeAction(): (action: string) => void {
  const { message } = App.useApp();

  return useCallback(
    (action: string) => {
      void message.info(`静态原型操作：${action}，未保存任何业务数据。`);
    },
    [message],
  );
}
