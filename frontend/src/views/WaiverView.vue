<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { WAIVER_DOCUMENT } from '@grasi/shared';
import type { WaiverStatus } from '@grasi/shared';
import { waiverApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const doc = WAIVER_DOCUMENT;
const status = ref<WaiverStatus | null>(null);
const loading = ref(true);

// Sign form
const fullName = ref('');
const agreeLiability = ref(false);
const consentElectronic = ref(false);
const photoRelease = ref(false);
const signing = ref(false);
const error = ref('');

const redirect = computed(() =>
  Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect,
);
const needsSignature = computed(() => !status.value || !status.value.upToDate);
const outdated = computed(() => status.value?.signed && !status.value.upToDate);

async function loadStatus() {
  loading.value = true;
  try {
    await auth.init();
    if (auth.isAuthenticated) {
      status.value = (await waiverApi.status()).status;
      fullName.value = status.value.fullName ?? auth.user?.name ?? '';
    }
  } catch {
    /* status is best-effort; the form still renders */
  } finally {
    loading.value = false;
  }
}

async function sign() {
  error.value = '';
  if (!agreeLiability.value || !consentElectronic.value) {
    error.value = 'Please check both boxes to sign.';
    return;
  }
  signing.value = true;
  try {
    status.value = (
      await waiverApi.sign({
        fullName: fullName.value.trim(),
        agreeLiability: agreeLiability.value as true,
        consentElectronic: consentElectronic.value as true,
        photoRelease: photoRelease.value,
      })
    ).status;
    if (redirect.value) router.push(redirect.value);
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not record your signature.';
  } finally {
    signing.value = false;
  }
}

onMounted(loadStatus);
</script>

<template>
  <div class="section">
    <div class="container narrow-doc">
      <!-- WIP / testing notice -->
      <div class="wip-banner">{{ doc.notice }}</div>

      <h1>{{ doc.title }}</h1>

      <div v-if="redirect && needsSignature" class="alert alert-info">
        ✍️ Please sign the waiver to continue with your booking.
      </div>

      <p class="intro">{{ doc.intro }}</p>

      <section v-for="s in doc.sections" :key="s.heading" class="clause">
        <h2>{{ s.heading }}</h2>
        <p>{{ s.body }}</p>
      </section>

      <p class="muted small consent-copy">{{ doc.electronicConsentText }}</p>

      <!-- Download (always available) -->
      <p class="downloads">
        <a
          :href="waiverApi.blankPdfUrl"
          target="_blank"
          rel="noopener"
          class="btn btn-ghost btn-sm"
        >
          📄 Download blank waiver (PDF)
        </a>
        <a
          v-if="status?.signed"
          :href="waiverApi.myPdfUrl"
          target="_blank"
          rel="noopener"
          class="btn btn-ghost btn-sm"
        >
          📥 Download my signed copy
        </a>
      </p>

      <div v-if="loading" class="spinner"></div>

      <!-- Not logged in -->
      <div v-else-if="!auth.isAuthenticated" class="card sign-card">
        <p>
          <RouterLink :to="{ name: 'login', query: { redirect: '/waiver' } }">Log in</RouterLink>
          or
          <RouterLink to="/register">create an account</RouterLink>
          to sign the waiver online — or download, print, and sign the PDF above.
        </p>
      </div>

      <!-- Signed & current -->
      <div v-else-if="status && status.upToDate" class="card signed-card">
        <div class="signed-emoji">✅</div>
        <h2>You've signed the waiver</h2>
        <p class="muted">
          Signed by <strong>{{ status.fullName }}</strong> on
          {{ status.signedAt ? new Date(status.signedAt).toLocaleDateString() : '' }} (version
          {{ status.signedVersion }}).
        </p>
      </div>

      <!-- Needs signature (new or outdated) -->
      <div v-else class="card sign-card">
        <h2>{{ outdated ? 'Please re-sign the updated waiver' : 'Sign the waiver' }}</h2>
        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <form @submit.prevent="sign">
          <div class="field">
            <label for="fullName">Full legal name</label>
            <input
              id="fullName"
              v-model="fullName"
              type="text"
              autocomplete="name"
              required
              maxlength="120"
              placeholder="Type your full name to sign"
            />
          </div>

          <label class="check">
            <input v-model="agreeLiability" type="checkbox" />
            <span>I have read and agree to this Liability Waiver & Release.</span>
          </label>
          <label class="check">
            <input v-model="consentElectronic" type="checkbox" />
            <span>{{ doc.electronicConsentText }}</span>
          </label>
          <label class="check optional">
            <input v-model="photoRelease" type="checkbox" />
            <span>{{ doc.photoReleaseText }}</span>
          </label>

          <button class="btn btn-primary full" :disabled="signing" type="submit">
            {{ signing ? 'Signing…' : 'Sign electronically ✍️' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narrow-doc {
  max-width: 760px;
}
.wip-banner {
  background: #fff4e5;
  border: 2px solid #ffb454;
  color: #8a4b00;
  font-weight: 700;
  border-radius: var(--radius-sm);
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}
.intro {
  line-height: 1.7;
  color: var(--c-ink-soft);
}
.clause {
  margin: 1.25rem 0;
}
.clause h2 {
  font-size: 1.15rem;
  margin: 0 0 0.35rem;
}
.clause p {
  line-height: 1.7;
  color: var(--c-ink-soft);
  margin: 0;
}
.consent-copy {
  margin-top: 1rem;
}
.downloads {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin: 1.25rem 0;
}
.sign-card,
.signed-card {
  margin-top: 1rem;
}
.signed-card {
  text-align: center;
  padding: 2rem 1.5rem;
}
.signed-emoji {
  font-size: 2.5rem;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin: 0.75rem 0;
  cursor: pointer;
  line-height: 1.5;
}
.check input {
  margin-top: 0.2rem;
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  accent-color: var(--c-pink);
  cursor: pointer;
}
.check.optional {
  color: var(--c-ink-soft);
  font-size: 0.92rem;
}
.full {
  width: 100%;
  margin-top: 0.75rem;
}
.small {
  font-size: 0.85rem;
}
</style>
