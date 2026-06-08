<script setup lang="ts">
import { RouterLink } from 'vue-router';
const year = new Date().getFullYear();
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
        <RouterLink to="/terms">Terms &amp; Conditions</RouterLink>
        <RouterLink to="/privacy">Privacy Policy</RouterLink>
      </nav>
    </div>
    <div class="container foot-base">
      <p class="muted small">© {{ year }} Grasi Zumba · Made with rhythm &amp; love.</p>
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
}
.foot-base p {
  margin: 0;
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
