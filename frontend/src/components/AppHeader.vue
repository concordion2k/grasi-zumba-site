<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const menuOpen = ref(false);

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);

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
        <span class="brand-mark">💃🏽</span>
        <span class="brand-text"><span class="brand-accent">Zumba</span> by Grasiele</span>
      </RouterLink>

      <div class="mobile-actions">
        <RouterLink
          v-if="auth.isAuthenticated"
          to="/dashboard"
          class="mobile-avatar"
          aria-label="My Account"
          @click="menuOpen = false"
        >
          <img
            v-if="auth.user?.profilePictureUrl"
            :src="auth.user.profilePictureUrl"
            alt=""
            class="mobile-avatar-img"
          />
          <span v-else class="mobile-avatar-img mobile-avatar-fallback">{{ initials }}</span>
        </RouterLink>
        <button class="burger" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          <span></span><span></span><span></span>
        </button>
      </div>

      <nav class="nav" :class="{ open: menuOpen }" @click="menuOpen = false">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/schedule" class="nav-link">Schedule</RouterLink>
        <RouterLink to="/pricing" class="nav-link">Pricing</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">Admin</RouterLink>
          <RouterLink to="/dashboard" class="nav-link account-link">
            <img
              v-if="auth.user?.profilePictureUrl"
              :src="auth.user.profilePictureUrl"
              alt=""
              class="nav-avatar"
            />
            <span v-else class="nav-avatar nav-avatar-fallback">{{ initials }}</span>
            <span>My Account</span>
          </RouterLink>
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
  background: var(--c-header-bg);
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
/* Give the white "Log out" button a themed outline so it stands out (matches the pricing buttons). */
.nav .btn-ghost {
  border: 2px solid var(--c-pink);
  color: var(--c-pink-dark);
}
.nav .btn-ghost:not(:disabled):hover {
  background: var(--c-pink);
  color: #fff;
}
.account-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.nav-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: var(--shadow-sm);
}
.nav-avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--grad-samba);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8rem;
}
/* On mobile, the profile photo sits to the left of the hamburger (not inside the collapsed nav). */
.mobile-actions {
  display: none;
  align-items: center;
  gap: 0.6rem;
}
.mobile-avatar {
  display: inline-flex;
}
.mobile-avatar-img {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: var(--shadow-sm);
}
.mobile-avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--grad-samba);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.85rem;
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
  .mobile-actions {
    display: flex;
  }
  .burger {
    display: flex;
  }
  /* The photo now lives by the hamburger, so drop it from the "My Account" link in the menu. */
  .account-link .nav-avatar {
    display: none;
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
