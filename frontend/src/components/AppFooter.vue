<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useThemeStore } from '@/stores/theme';

const year = new Date().getFullYear();
const theme = useThemeStore();
</script>

<template>
  <footer class="site-footer">
    <div class="container foot">
      <div class="foot-brand">
        <span class="logo">💃🏽 Zumba by Grasiele</span>
        <p class="muted small">Energia do Rio, na sua vizinhança. Vem dançar! 🇧🇷</p>
      </div>
      <nav class="foot-links" aria-label="Footer">
        <RouterLink to="/schedule">Schedule</RouterLink>
        <RouterLink to="/pricing">Pricing</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
        <RouterLink to="/waiver">Liability Waiver</RouterLink>
        <RouterLink to="/terms">Terms &amp; Conditions</RouterLink>
        <RouterLink to="/privacy">Privacy Policy</RouterLink>
      </nav>
    </div>
    <div class="container foot-base">
      <div class="foot-copy">
        <p class="muted small">© {{ year }} Grasi Zumba · Made with rhythm &amp; love.</p>
      </div>
      <div class="foot-toggle">
        <label class="theme-switch" title="Toggle dark mode">
          <span class="theme-icon" :class="{ on: theme.current === 'light' }" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
              />
            </svg>
          </span>
          <input
            type="checkbox"
            :checked="theme.current === 'dark'"
            aria-label="Dark mode"
            @change="theme.toggle()"
          />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="theme-icon" :class="{ on: theme.current === 'dark' }" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
        </label>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: auto;
  background: var(--c-night-solid);
  color: #fff;
  padding: 2rem 0;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}
.foot-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
.foot-links a {
  color: #fff;
  font-weight: 600;
  opacity: 0.9;
}
.foot-links a:hover {
  opacity: 1;
  color: var(--c-yellow);
}
.foot-base {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
}
/* Copyright and toggle each take half the width; the copy wraps within its half, the toggle
   stays pinned to the right of its half (= the footer's right edge). */
.foot-copy,
.foot-toggle {
  flex: 1;
  min-width: 0;
}
.foot-toggle {
  display: flex;
  justify-content: flex-end;
}
.foot-base p {
  margin: 0;
}

/* Theme toggle (icons + switch, right-aligned with the copyright). */
.theme-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.theme-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.theme-icon {
  display: inline-flex;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.18s ease;
}
.theme-icon.on {
  color: var(--c-yellow);
}
.toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  transition: background 0.18s ease;
}
.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.18s ease;
}
.theme-switch input:checked + .toggle-track {
  background: var(--c-pink);
}
.theme-switch input:checked + .toggle-track .toggle-thumb {
  transform: translateX(18px);
}
.theme-switch input:focus-visible + .toggle-track {
  outline: 2px solid var(--c-yellow);
  outline-offset: 2px;
}
.logo {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
}
.small {
  font-size: 0.85rem;
}
.site-footer .muted {
  color: rgba(255, 255, 255, 0.78);
}
</style>
