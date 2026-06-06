<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiRequestError } from '@/api/client';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await auth.login({ email: email.value, password: password.value });
    const redirect = (route.query.redirect as string) || '/dashboard';
    router.push(redirect);
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Something went wrong.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="section auth">
    <div class="container narrow">
      <div class="card auth-card">
        <h1>Welcome back! <span class="wave">👋</span></h1>
        <p class="muted">Log in to book classes and see your schedule.</p>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="submit">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <button class="btn btn-primary full" :disabled="busy" type="submit">
            {{ busy ? 'Dancing in…' : 'Log in 💃' }}
          </button>
        </form>

        <p class="center muted switch">
          New here? <RouterLink to="/register">Create an account</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 460px;
}
.auth-card h1 {
  font-size: 1.9rem;
}
.full {
  width: 100%;
  margin-top: 0.5rem;
}
.switch {
  margin-top: 1.25rem;
  margin-bottom: 0;
}
.wave {
  display: inline-block;
  animation: wave 1.6s ease-in-out infinite;
  transform-origin: 70% 70%;
}
@keyframes wave {
  0%,
  100% {
    transform: rotate(0);
  }
  25% {
    transform: rotate(18deg);
  }
  75% {
    transform: rotate(-8deg);
  }
}
</style>
