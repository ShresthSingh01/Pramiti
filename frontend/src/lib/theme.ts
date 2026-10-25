export type Theme = 'dark' | 'light';

export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('pramiti_theme') as Theme;
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore localstorage errors
  }
  return 'dark'; // Default to dark intelligence terminal
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem('pramiti_theme', theme);
  } catch {
    // ignore
  }
}
