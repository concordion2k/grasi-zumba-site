<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { unsubscribeApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';

const route = useRoute();
const state = ref<'loading' | 'done' | 'error'>('loading');
const name = ref('');
const error = ref('');

onMounted(async () => {
  const token = (Array.isArray(route.query.token) ? route.query.token[0] : route.query.token) ?? '';
  if (!token) {
    state.value = 'error';
    error.value = 'This unsubscribe link is missing its token.';
    return;
  }
  try {
    const res = await unsubscribeApi.confirm(token);
    name.value = res.name;
    state.value = 'done';
  } catch (e) {
    error.value =
      e instanceof ApiRequestError ? e.message : 'This unsubscribe link is invalid or has expired.';
    state.value = 'error';
  }
});
</script>

<template>
  <div class="section">
    <div class="container narrow">
      <div class="card center-card">
        <div v-if="state === 'loading'" class="spinner"></div>

        <template v-else-if="state === 'done'">
          <div class="emoji">💌</div>
          <h1>You're unsubscribed</h1>
          <p class="muted">
            {{ name ? `Got it, ${name}.` : 'Got it.' }} You won't receive notification emails from
            us anymore.
          </p>
          <p class="muted small">
            Changed your mind? You can re-enable emails anytime from your
            <RouterLink to="/dashboard">dashboard</RouterLink>.
          </p>
          <RouterLink to="/" class="btn btn-primary">Back to home →</RouterLink>
        </template>

        <template v-else>
          <div class="emoji">😕</div>
          <h1>Hmm, that didn't work</h1>
          <p class="muted">{{ error }}</p>
          <p class="muted small">
            You can manage your email preferences from your
            <RouterLink to="/dashboard">dashboard</RouterLink>.
          </p>
          <RouterLink to="/" class="btn btn-ghost">Back to home</RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 460px;
}
.center-card {
  text-align: center;
  padding: 2.5rem 1.5rem;
}
.emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.center-card h1 {
  font-size: 1.7rem;
  margin-bottom: 0.5rem;
}
.center-card p {
  margin: 0 0 0.75rem;
}
.center-card .btn {
  margin-top: 0.75rem;
}
.small {
  font-size: 0.85rem;
}
</style>
