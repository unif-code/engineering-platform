// 数据缝：V0.2 Task 10 锁定 api-v0.2.0 OpenAPI Artifact 后，
// 在 '@/services/auth' 的 domain client 底层切入 '@/services/generated'。
// 本 Feature service、页面、hooks 与公开 Feature API 均无需改动。
import {
  getCurrentUser,
  verifyTotp as requestTotp,
  startLogin,
} from '@/services/auth';
import type {
  CurrentUser,
  LoginInput,
  LoginResult,
  TotpInput,
  TotpResult,
} from './type';

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function login(input: LoginInput): Promise<LoginResult> {
  return startLogin(input);
}

export async function verifyTotp(input: TotpInput): Promise<TotpResult> {
  return requestTotp(input);
}
