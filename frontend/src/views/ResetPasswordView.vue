<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/stores/auth';
import { ApiRequestError } from '@/api/client';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const token = ref('');
const password = ref('');
const confirm = ref('');
const error = ref('');
const busy = ref(false);
/** Set when the link itself is unusable (missing / invalid / expired) → show a recovery path. */
const linkBroken = ref(false);

const tooShort = computed(() => password.value.length > 0 && password.value.length < 10);
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value);
const canSubmit = computed(
  () => password.value.length >= 10 && confirm.value === password.value && !busy.value,
);

onMounted(() => {
  const q = route.query.token;
  token.value = (Array.isArray(q) ? q[0] : q) ?? '';
  if (!token.value) {
    linkBroken.value = true;
    error.value = 'This password reset link is missing its token.';
  }
});

async function submit() {
  if (!canSubmit.value) return;
  busy.value = true;
  error.value = '';
  try {
    const { user } = await authApi.resetPassword({ token: token.value, password: password.value });
    auth.setUser(user); // reset signs us in on this device
    router.push('/dashboard');
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Something went wrong.';
    // 400 means the token was rejected (used/expired/invalid) — steer them to request a new one.
    if (e instanceof ApiRequestError && e.status === 400) linkBroken.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="section auth">
    <div class="container narrow">
      <div class="card auth-card">
        <h1>Set a new password</h1>
        <p class="muted">Choose a new password for your account.</p>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <template v-if="linkBroken">
          <p class="muted small">
            Reset links expire after 1 hour and can only be used once.
            <RouterLink to="/forgot-password">Request a new link →</RouterLink>
          </p>
        </template>

        <form v-else @submit.prevent="submit">
          <div class="field">
            <label for="password">New password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
            />
            <p v-if="tooShort" class="hint err">Use at least 10 characters.</p>
          </div>
          <div class="field">
            <label for="confirm">Confirm new password</label>
            <input
              id="confirm"
              v-model="confirm"
              type="password"
              autocomplete="new-password"
              required
            />
            <p v-if="mismatch" class="hint err">Passwords don't match.</p>
          </div>
          <button class="btn btn-primary full" :disabled="!canSubmit" type="submit">
            {{ busy ? 'Saving…' : 'Reset password' }}
          </button>
        </form>

        <p class="center muted switch">
          <RouterLink to="/login">Back to log in</RouterLink>
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
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
}
.hint.err {
  color: #d81b54;
}
.small {
  font-size: 0.85rem;
}
</style>
