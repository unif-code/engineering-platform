// 数据缝：后端计划 Task 8 的 OpenAPI Artifact 就绪后，由本仓 owner 执行 Task 10/11；
// 在 '@/services/auth' 的 domain client 底层接入 '@/services/generated'。
// 本 Feature service、页面、hooks 与公开 Feature API 均无需改动。
import { authenticate, getCurrentUser } from '@/services/auth';
import type { CurrentUser, LoginInput } from './type';

export async function fetchMe(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function login(input: LoginInput): Promise<void> {
  await authenticate(input);
}
