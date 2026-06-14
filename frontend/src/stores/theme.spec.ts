import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from '@/stores/theme';

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light (no saved choice, no OS hint) and reflects it on <html>', () => {
    const theme = useThemeStore();
    expect(theme.current).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggles, persists the choice, and updates <html>', () => {
    const theme = useThemeStore();
    theme.toggle();
    expect(theme.current).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    theme.toggle();
    expect(theme.current).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('honours a previously saved preference on init', () => {
    localStorage.setItem('theme', 'dark');
    const theme = useThemeStore();
    expect(theme.current).toBe('dark');
  });
});
