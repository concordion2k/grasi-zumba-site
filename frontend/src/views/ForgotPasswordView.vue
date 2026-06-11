<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { authApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';

const email = ref('');
const sent = ref(false);
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    await authApi.forgotPassword({ email: email.value });
    // Always show the same confirmation — we never reveal whether the address has an account.
    sent.value = true;
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
        <template v-if="!sent">
          <h1>Forgot your password?</h1>
          <p class="muted">No worries! Enter your email and we'll send you a link to reset it.</p>

          <div v-if="error" class="alert alert-error">{{ error }}</div>

          <form @submit.prevent="submit">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" v-model="email" type="email" autocomplete="email" required />
            </div>
            <button class="btn btn-primary full" :disabled="busy" type="submit">
              {{ busy ? 'Sending…' : 'Send reset link' }}
            </button>
          </form>

          <p class="center muted switch">
            Remembered it? <RouterLink to="/login">Back to log in</RouterLink>
          </p>
        </template>

        <template v-else>
          <div class="emoji">📬</div>
          <h1>Check your email</h1>
          <p class="muted">
            If an account exists for <strong>{{ email }}</strong
            >, we've sent a link to reset your password. It expires in 1 hour.
          </p>
          <p class="muted small">
            Didn't get it? Check your spam folder, or
            <a href="#" @click.prevent="sent = false">try again</a>.
          </p>
          <RouterLink to="/login" class="btn btn-ghost">Back to log in</RouterLink>
        </template>
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
.emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.small {
  font-size: 0.85rem;
}
.auth-card .btn-ghost {
  margin-top: 1rem;
}
</style>
