import { history, useLocation, useModel } from '@umijs/max';
import { App } from 'antd';
import { useEffect, useState } from 'react';
import { fetchMe, LoginFlow, LoginShell } from '@/features/auth';
import { fetchNavigation, resolvePostLoginPath } from '@/features/navigation';
import { clearSessionQueryCache } from '@/utils/sessionQueryCache';

export default function LoginPage() {
  const [loginSucceeded, setLoginSucceeded] = useState(false);
  const { message } = App.useApp();
  const location = useLocation();
  const { setInitialState } = useModel('@@initialState');
  const postLoginPath = resolvePostLoginPath(
    new URLSearchParams(location.search).get('redirect'),
  );

  useEffect(() => {
    if (loginSucceeded) {
      history.push(postLoginPath);
    }
  }, [loginSucceeded, postLoginPath]);

  const refreshSession = async () => {
    const [me, navigation] = await Promise.all([fetchMe(), fetchNavigation()]);
    if (me === null) {
      message.error('登录状态刷新失败');
      return;
    }
    const { capabilities, scopedCapabilities, workspaces, ...principal } = me;
    await clearSessionQueryCache();
    await setInitialState({
      capabilities,
      navigation,
      principal,
      scopedCapabilities,
      workspaces,
    });
    setLoginSucceeded(true);
  };

  return (
    <LoginShell>
      <LoginFlow onAuthenticated={refreshSession} />
    </LoginShell>
  );
}
