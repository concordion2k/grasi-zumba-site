<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const menuOpen = ref(false);

async function handleLogout() {
  await auth.logout();
  menuOpen.value = false;
  router.push({ name: 'home' });
}
</script>

<template>
  <header class="site-header">
    <div class="container bar">
      <RouterLink to="/" class="brand" @click="menuOpen = false">
        <span class="brand-mark">💃</span>
        <span class="brand-text">Grasi<span class="brand-accent">Zumba</span></span>
      </RouterLink>

      <button class="burger" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <span></span><span></span><span></span>
      </button>

      <nav class="nav" :class="{ open: menuOpen }" @click="menuOpen = false">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/schedule" class="nav-link">Schedule</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/dashboard" class="nav-link">My Classes</RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">Admin</RouterLink>
          <button class="btn btn-ghost btn-sm" @click.stop="handleLogout">Log out</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nav-link">Log in</RouterLink>
          <RouterLink to="/register" class="btn btn-primary btn-sm">Join the party</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 248, 243, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-line);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--c-ink);
}
.brand:hover {
  color: var(--c-ink);
}
.brand-mark {
  font-size: 1.6rem;
  animation: bounce 2.2s ease-in-out infinite;
}
.brand-accent {
  color: var(--c-pink);
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0) rotate(-6deg);
  }
  50% {
    transform: translateY(-4px) rotate(6deg);
  }
}
.nav {
  display: flex;
  align-items: center;
  gap: 1.4rem;
}
.nav-link {
  color: var(--c-ink);
  font-weight: 600;
  position: relative;
}
.nav-link:hover {
  color: var(--c-pink-dark);
}
.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 3px;
  border-radius: 3px;
  background: var(--grad-samba);
}
.burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
}
.burger span {
  width: 26px;
  height: 3px;
  border-radius: 3px;
  background: var(--c-ink);
}

@media (max-width: 760px) {
  .burger {
    display: flex;
  }
  .nav {
    position: absolute;
    top: 68px;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1.25rem;
    background: var(--c-paper);
    border-bottom: 1px solid var(--c-line);
    box-shadow: var(--shadow-md);
    display: none;
  }
  .nav.open {
    display: flex;
  }
  .nav-link.router-link-active::after {
    display: none;
  }
}
</style>
