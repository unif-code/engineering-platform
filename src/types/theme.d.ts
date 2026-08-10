import type { ThemeSnapshot } from '@/features/theme/type';

declare global {
  interface Window {
    __ENGINEERING_PLATFORM_THEME__?: ThemeSnapshot;
  }
}
