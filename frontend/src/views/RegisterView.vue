<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiRequestError } from '@/api/client';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const birthday = ref('');
const notifyNewClass = ref(false);
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      birthday: birthday.value,
      notifyNewClass: notifyNewClass.value,
    });
    router.push('/dashboard');
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
        <h1>Join the <span class="text-gradient">party!</span> 🎉</h1>
        <p class="muted">Create your account and book your first class.</p>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="submit">
          <div class="field">
            <label for="name">Your name</label>
            <input id="name" v-model="name" type="text" autocomplete="name" required />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="birthday">Birthday 🎂</label>
            <input id="birthday" v-model="birthday" type="date" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              minlength="10"
              required
            />
            <small class="muted">At least 10 characters.</small>
          </div>
          <label class="optin">
            <input v-model="notifyNewClass" type="checkbox" />
            <span>Email me when new classes are announced 🎉</span>
          </label>
          <button class="btn btn-primary full" :disabled="busy" type="submit">
            {{ busy ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="center muted switch">
          Already have an account? <RouterLink to="/login">Log in</RouterLink>
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
.optin {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0.25rem 0 0.5rem;
  cursor: pointer;
  font-size: 0.92rem;
  color: var(--c-ink-soft);
}
.optin input {
  margin-top: 0.15rem;
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  accent-color: var(--c-pink);
  cursor: pointer;
}
.switch {
  margin-top: 1.25rem;
  margin-bottom: 0;
}
</style>
