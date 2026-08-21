import { useLocation } from '@umijs/max';
import { AccessDeniedResult } from '@/components/AccessDeniedResult';

export default function AccessDeniedPage() {
  const location = useLocation();
  const requestId = new URLSearchParams(location.search).get('requestId');

  return <AccessDeniedResult requestId={requestId || undefined} />;
}
