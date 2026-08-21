import { BootstrapWizard, LoginShell } from '@/features/auth';

export default function BootstrapPage() {
  return (
    <LoginShell formLabel="账号初始化">
      <BootstrapWizard />
    </LoginShell>
  );
}
