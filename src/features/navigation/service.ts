import { getNavigation, type NavigationItem } from '@/services/navigation';

export async function fetchNavigation(): Promise<NavigationItem[]> {
  try {
    return await getNavigation();
  } catch {
    return [];
  }
}
