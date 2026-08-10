export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeSnapshot {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
}

export interface ThemeContextValue extends ThemeSnapshot {
  setMode: (mode: ThemeMode) => void;
}
