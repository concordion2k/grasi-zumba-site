import { defineStore } from 'pinia';
import { ref } from 'vue';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  /** Whether the user has explicitly chosen a theme (vs. following the OS). */
  const explicit = ref(saved !== null);
  const current = ref<Theme>(saved ?? (prefersDark() ? 'dark' : 'light'));

  function apply(t: Theme) {
    current.value = t;
    document.documentElement.dataset.theme = t;
  }

  // Reflect the resolved theme on <html> immediately (CSS handles the pre-JS default via @media).
  apply(current.value);

  function toggle() {
    const next: Theme = current.value === 'dark' ? 'light' : 'dark';
    explicit.value = true;
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  // Follow the OS while the user hasn't picked their own preference.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!explicit.value) apply(e.matches ? 'dark' : 'light');
  });

  return { current, toggle };
});
