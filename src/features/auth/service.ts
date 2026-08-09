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
