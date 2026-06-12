<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type {
  BookingWithClass,
  WaiverStatus,
  MyBillingResponse,
  LedgerEntryType,
} from '@grasi/shared';
import { ALLOWED_IMAGE_TYPES, PROFILE_PICTURE_MAX_BYTES, formatUsd } from '@grasi/shared';
import { meApi, classesApi, waiverApi, billingApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { isPast, formatRange, formatDate } from '@/utils/format';
import { resizeImageToLimit } from '@/utils/image';

const auth = useAuthStore();
const bookings = ref<BookingWithClass[]>([]);
const waiver = ref<WaiverStatus | null>(null);
const billing = ref<MyBillingResponse | null>(null);
const loading = ref(true);
const error = ref('');
const portalBusy = ref(false);

/** Open Stripe's hosted billing portal to manage/cancel the subscription. */
async function manageSubscription() {
  portalBusy.value = true;
  error.value = '';
  try {
    const { url } = await billingApi.portal();
    window.location.assign(url);
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not open billing management.';
    portalBusy.value = false;
  }
}

const PURCHASE_LABELS: Record<LedgerEntryType, string> = {
  manual_credit: 'Credit added',
  package_purchase: 'Class pack',
  dropin_payment: 'Drop-in class',
  subscription: 'Unlimited subscription',
  adjustment: 'Adjustment',
  class_booking: 'Class booking',
};
const notice = ref('');
const busyId = ref<string | null>(null);

// Profile editing
const name = ref(auth.user?.name ?? '');
const birthday = ref(auth.user?.birthday ?? '');
const savingProfile = ref(false);
const uploadingAvatar = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Email notification preferences (auto-saved on toggle)
type PrefKey = 'notifyNewClass' | 'notifyBookingConfirm' | 'notifyClassChange';
const PREF_OPTIONS: { key: PrefKey; label: string; hint: string }[] = [
  { key: 'notifyBookingConfirm', label: 'Booking confirmations', hint: 'When you book a class.' },
  {
    key: 'notifyClassChange',
    label: 'Class updates',
    hint: 'If a class you booked is changed or canceled.',
  },
  { key: 'notifyNewClass', label: 'New class announcements', hint: 'When a new class is added.' },
];
const savingPref = ref<PrefKey | null>(null);

async function togglePref(key: PrefKey, e: Event) {
  const value = (e.target as HTMLInputElement).checked;
  savingPref.value = key;
  error.value = '';
  try {
    const { user } = await meApi.updateNotifications({ [key]: value });
    auth.setUser(user);
  } catch (err) {
    error.value = err instanceof ApiRequestError ? err.message : 'Could not save your preferences.';
    (e.target as HTMLInputElement).checked = !value; // revert the visual on failure
  } finally {
    savingPref.value = null;
  }
}

// Change password
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const changingPassword = ref(false);
const pwError = ref('');
const pwNotice = ref('');

const upcoming = computed(() => bookings.value.filter((b) => !isPast(b.class.startTime)));
const past = computed(() => bookings.value.filter((b) => isPast(b.class.startTime)));

// Location maps (tap to expand). Keyless Google Maps embed of the address — no API key needed.
const openMaps = ref(new Set<string>());
function toggleMap(id: string) {
  const next = new Set(openMaps.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  openMaps.value = next;
}
const mapEmbedUrl = (loc: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(loc)}&z=15&output=embed`;
const mapExternalUrl = (loc: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`;

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [b, w, bill] = await Promise.all([meApi.bookings(), waiverApi.status(), meApi.billing()]);
    bookings.value = b.bookings;
    waiver.value = w.status;
    billing.value = bill;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load your classes.';
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  savingProfile.value = true;
  error.value = '';
  notice.value = '';
  try {
    const { user } = await meApi.updateProfile({ name: name.value, birthday: birthday.value });
    auth.setUser(user);
    notice.value = 'Profile updated! ✨';
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not save your profile.';
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  pwError.value = '';
  pwNotice.value = '';
  if (newPassword.value.length < 10) {
    pwError.value = 'New password must be at least 10 characters.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'New passwords do not match.';
    return;
  }
  changingPassword.value = true;
  try {
    await meApi.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    pwNotice.value = 'Password changed! 🔒';
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (e) {
    pwError.value = e instanceof ApiRequestError ? e.message : 'Could not change your password.';
  } finally {
    changingPassword.value = false;
  }
}

function pickAvatar() {
  fileInput.value?.click();
}

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  error.value = '';
  notice.value = '';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    error.value = 'Please choose a JPG, PNG, or WebP image.';
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  uploadingAvatar.value = true;
  try {
    // Downscale/compress in the browser so large phone photos fit the limit instead of being rejected.
    let upload = file;
    if (file.size > PROFILE_PICTURE_MAX_BYTES) {
      notice.value = 'Optimizing your photo…';
      upload = await resizeImageToLimit(file, {
        maxBytes: PROFILE_PICTURE_MAX_BYTES,
        maxDim: 1024,
      });
    }
    await auth.refreshAvatar(upload);
    notice.value = 'Looking great! 📸';
  } catch (err) {
    error.value =
      err instanceof ApiRequestError || err instanceof Error ? err.message : 'Upload failed.';
    notice.value = '';
  } finally {
    uploadingAvatar.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

// Cancel confirmation modal.
const pendingCancel = ref<BookingWithClass['class'] | null>(null);

/** ClassCard "cancel" → open the confirmation modal. */
function requestCancel(id: string) {
  pendingCancel.value = bookings.value.find((b) => b.class.classId === id)?.class ?? null;
}

async function confirmCancel() {
  const cls = pendingCancel.value;
  if (!cls) return;
  busyId.value = cls.classId;
  error.value = '';
  try {
    await classesApi.cancel(cls.classId);
    pendingCancel.value = null;
    await load();
  } catch (e) {
    pendingCancel.value = null;
    error.value = e instanceof ApiRequestError ? e.message : 'Could not cancel.';
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="section">
    <div class="container">
      <h1>
        Olá, <span class="text-gradient">{{ auth.user?.name }}</span
        >! 💃
      </h1>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="notice" class="alert alert-success">{{ notice }}</div>

      <div class="dash-grid">
        <div class="main-col">
          <!-- Membership & credits -->
          <section v-if="billing" class="card membership">
            <div class="mem-grid">
              <div class="mem-summary">
                <div class="mem-credits">
                  <template v-if="billing.summary.subscription?.active">
                    <span class="credits-num">✨</span>
                    <span class="credits-label">Unlimited</span>
                  </template>
                  <template v-else>
                    <span class="credits-num">{{ billing.summary.classesRemaining }}</span>
                    <span class="credits-label">classes left</span>
                  </template>
                </div>
                <ul class="mem-stats">
                  <li>
                    <span class="ms-val">{{ billing.summary.classesPurchased }}</span>
                    <span class="ms-lbl">Purchased</span>
                  </li>
                  <li>
                    <span class="ms-val">{{ billing.summary.classesBooked }}</span>
                    <span class="ms-lbl">Booked</span>
                  </li>
                  <li>
                    <span class="ms-val">
                      <span v-if="billing.summary.subscription?.active" class="pill pill-green"
                        >Unlimited</span
                      >
                      <span v-else class="muted">None</span>
                    </span>
                    <span class="ms-lbl">Plan</span>
                  </li>
                </ul>
                <p v-if="billing.summary.subscription?.active" class="muted small renews">
                  Renews {{ new Date(billing.summary.subscription.renewsAt).toLocaleDateString() }}
                </p>
                <button
                  v-if="billing.summary.subscription?.active"
                  class="btn btn-ghost btn-sm manage-sub"
                  :disabled="portalBusy"
                  @click="manageSubscription"
                >
                  {{ portalBusy ? 'Opening…' : 'Manage subscription' }}
                </button>
              </div>

              <div class="mem-history">
                <h4 class="ph-title">Recent purchases</h4>
                <p v-if="billing.purchases.length === 0" class="muted small">No purchases yet.</p>
                <template v-else>
                  <ul class="purchase-list">
                    <li v-for="p in billing.purchases.slice(0, 3)" :key="p.entryId">
                      <div class="ph-row">
                        <span>{{ PURCHASE_LABELS[p.type] }}</span>
                        <strong>{{ formatUsd(p.amountCents) }}</strong>
                      </div>
                      <span class="muted small">{{ formatDate(p.createdAt) }}</span>
                    </li>
                  </ul>
                  <RouterLink to="/account/purchases" class="view-all">
                    View all purchases →
                  </RouterLink>
                </template>
              </div>
            </div>
          </section>

          <!-- Upcoming classes -->
          <section class="bookings card">
            <div v-if="loading" class="spinner"></div>
            <template v-else>
              <div class="bookings-head">
                <h2>Your upcoming classes</h2>
                <RouterLink to="/schedule" class="btn btn-primary btn-sm"
                  >+ Book a class</RouterLink
                >
              </div>
              <p v-if="upcoming.length === 0" class="muted">
                No classes booked yet —
                <RouterLink to="/schedule">find one on the schedule!</RouterLink>
              </p>
              <ul v-else class="booking-rows">
                <li v-for="b in upcoming" :key="b.class.classId" class="booking-row">
                  <div class="br-main">
                    <strong>{{ b.class.title }}</strong>
                    <span class="muted small block"
                      >🗓️ {{ formatRange(b.class.startTime, b.class.endTime) }}</span
                    >
                    <span class="muted small block">
                      📍 {{ b.class.location }}
                      <button
                        v-if="b.class.location"
                        type="button"
                        class="map-toggle"
                        @click="toggleMap(b.class.classId)"
                      >
                        {{ openMaps.has(b.class.classId) ? 'Hide map' : 'View map' }}
                      </button>
                    </span>
                    <div v-if="openMaps.has(b.class.classId)" class="map-wrap">
                      <iframe
                        :src="mapEmbedUrl(b.class.location)"
                        class="map-frame"
                        loading="lazy"
                        title="Class location map"
                        referrerpolicy="no-referrer-when-downgrade"
                      ></iframe>
                      <a
                        :href="mapExternalUrl(b.class.location)"
                        target="_blank"
                        rel="noopener"
                        class="map-open"
                        >Open in Google Maps ↗</a
                      >
                    </div>
                    <a
                      :href="`/api/classes/${b.class.classId}/calendar.ics`"
                      class="cal-link small"
                    >
                      📅 Add to calendar
                    </a>
                  </div>
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="busyId === b.class.classId"
                    @click="requestCancel(b.class.classId)"
                  >
                    {{ busyId === b.class.classId ? '…' : 'Cancel' }}
                  </button>
                </li>
              </ul>

              <template v-if="past.length">
                <h2 class="past-title">Past classes</h2>
                <ul class="booking-rows past">
                  <li v-for="b in past" :key="b.class.classId" class="booking-row">
                    <div class="br-main">
                      <strong>{{ b.class.title }}</strong>
                      <span class="muted small block"
                        >🗓️ {{ formatRange(b.class.startTime, b.class.endTime) }}</span
                      >
                    </div>
                  </li>
                </ul>
              </template>
            </template>
          </section>
        </div>

        <div class="profile-col">
          <!-- Profile -->
          <aside class="card profile">
            <div class="avatar-wrap">
              <img
                v-if="auth.user?.profilePictureUrl"
                :src="auth.user.profilePictureUrl"
                alt="Your profile picture"
                class="avatar"
              />
              <div v-else class="avatar avatar-fallback">{{ initials }}</div>
              <button class="avatar-edit" :disabled="uploadingAvatar" @click="pickAvatar">
                {{ uploadingAvatar ? '…' : '📷' }}
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                @change="onAvatarChange"
              />
            </div>

            <form class="profile-form" @submit.prevent="saveProfile">
              <div class="field">
                <label for="pname">Name</label>
                <input id="pname" v-model="name" type="text" required />
              </div>
              <div class="field">
                <label for="pbday">Birthday</label>
                <input id="pbday" v-model="birthday" type="date" required />
              </div>
              <p class="muted small">{{ auth.user?.email }}</p>
              <button class="btn btn-tropical full" :disabled="savingProfile" type="submit">
                {{ savingProfile ? 'Saving…' : 'Save profile' }}
              </button>
            </form>
          </aside>

          <!-- Email preferences -->
          <section class="card pref-card">
            <h3>Email preferences</h3>
            <p class="muted small intro">Choose which emails you'd like to receive.</p>
            <ul class="pref-list">
              <li v-for="opt in PREF_OPTIONS" :key="opt.key">
                <label class="pref-toggle">
                  <input
                    type="checkbox"
                    :checked="auth.user?.[opt.key] ?? false"
                    :disabled="savingPref === opt.key"
                    @change="togglePref(opt.key, $event)"
                  />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="pref-text">
                    <strong>{{ opt.label }}</strong>
                    <span class="muted small block">{{ opt.hint }}</span>
                  </span>
                </label>
              </li>
            </ul>
          </section>

          <!-- Liability waiver -->
          <section class="card waiver-card">
            <h3>Liability waiver</h3>
            <template v-if="waiver?.upToDate">
              <p class="muted small">
                ✅ Signed by <strong>{{ waiver.fullName }}</strong>
                <span v-if="waiver.signedAt">
                  on {{ new Date(waiver.signedAt).toLocaleDateString() }}</span
                >.
              </p>
              <a
                :href="waiverApi.myPdfUrl"
                target="_blank"
                rel="noopener"
                class="btn btn-ghost btn-sm"
              >
                📥 Download my signed copy
              </a>
            </template>
            <template v-else>
              <p class="muted small">
                {{
                  waiver?.signed
                    ? 'Our waiver was updated — please re-sign.'
                    : "You haven't signed the waiver yet. It's required before booking."
                }}
              </p>
              <RouterLink to="/waiver" class="btn btn-primary btn-sm"
                >Review &amp; sign ✍️</RouterLink
              >
            </template>
          </section>

          <!-- Change password -->
          <section class="card pw-card">
            <h3>Change password</h3>
            <div v-if="pwError" class="alert alert-error">{{ pwError }}</div>
            <div v-if="pwNotice" class="alert alert-success">{{ pwNotice }}</div>
            <form @submit.prevent="changePassword">
              <div class="field">
                <label for="cpw">Current password</label>
                <input
                  id="cpw"
                  v-model="currentPassword"
                  type="password"
                  autocomplete="current-password"
                  required
                />
              </div>
              <div class="field">
                <label for="npw">New password</label>
                <input
                  id="npw"
                  v-model="newPassword"
                  type="password"
                  autocomplete="new-password"
                  minlength="10"
                  required
                />
                <small class="muted">At least 10 characters.</small>
              </div>
              <div class="field">
                <label for="npw2">Confirm new password</label>
                <input
                  id="npw2"
                  v-model="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                />
              </div>
              <button class="btn btn-ghost full" :disabled="changingPassword" type="submit">
                {{ changingPassword ? 'Saving…' : 'Change password' }}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>

    <ConfirmModal
      :open="pendingCancel !== null"
      title="Cancel this booking?"
      confirm-text="Yes, cancel"
      variant="danger"
      :busy="busyId !== null"
      @confirm="confirmCancel"
      @cancel="pendingCancel = null"
    >
      <template v-if="pendingCancel">
        You're about to cancel your spot in <strong>{{ pendingCancel.title }}</strong>
        <br />
        <span class="muted">{{ formatRange(pendingCancel.startTime, pendingCancel.endTime) }}</span>
      </template>
    </ConfirmModal>
  </div>
</template>

<style scoped>
.dash-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start;
}
/* Left: membership then upcoming classes (stacked). Right: account settings sidebar. */
.main-col,
.profile-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}
.profile {
  text-align: center;
}
.pw-card {
  text-align: left;
}
.pw-card h3 {
  margin: 0 0 0.75rem;
}

/* Membership & credits */
.mem-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 1.5rem;
  align-items: start;
}
.mem-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mem-credits {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.credits-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 3rem;
  line-height: 1;
  color: var(--c-pink-dark);
}
.credits-label {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--c-ink-soft);
}
.mem-stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1.75rem;
}
.mem-stats li {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.ms-val {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.3rem;
  line-height: 1.1;
}
.ms-lbl {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-ink-soft);
}
.renews {
  margin: 0;
}
.manage-sub {
  margin-top: 0.75rem;
}
.mem-history {
  border-left: 1px solid var(--c-line);
  padding-left: 1.5rem;
  max-height: 240px;
  overflow-y: auto;
}
.ph-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
}
.purchase-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.purchase-list li {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--c-line);
}
.purchase-list li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ph-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.view-all {
  display: inline-block;
  margin-top: 0.75rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--c-pink-dark);
}

/* Liability waiver */
.waiver-card {
  text-align: left;
}
.waiver-card h3 {
  margin: 0 0 0.5rem;
}
.waiver-card .btn {
  margin-top: 0.25rem;
}

/* Email preferences */
.pref-card {
  text-align: left;
}
.pref-card h3 {
  margin: 0 0 0.25rem;
}
.pref-card .intro {
  margin: 0 0 1rem;
}
.pref-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.pref-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  cursor: pointer;
  user-select: none;
}
.pref-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  margin-top: 0.1rem;
  border-radius: 999px;
  background: var(--c-line);
  transition: background 0.18s ease;
}
.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.18s ease;
}
.pref-toggle input:checked + .toggle-track {
  background: var(--c-green);
}
.pref-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
.pref-toggle input:focus-visible + .toggle-track {
  outline: 2px solid var(--c-pink);
  outline-offset: 2px;
}
.pref-toggle input:disabled + .toggle-track {
  opacity: 0.55;
}
.pref-text {
  line-height: 1.35;
}
.block {
  display: block;
}
.avatar-wrap {
  position: relative;
  width: 130px;
  margin: 0 auto 1.25rem;
}
.avatar {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #fff;
  box-shadow: var(--shadow-md);
}
.avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--grad-samba);
  color: #fff;
  font-family: var(--font-display);
  font-size: 2.6rem;
}
.avatar-edit {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #fff;
  background: var(--c-pink);
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.profile-form {
  text-align: left;
}
.full {
  width: 100%;
}
.small {
  font-size: 0.85rem;
}
/* Bookings as a compact list */
.bookings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.bookings-head h2 {
  margin: 0;
}
.booking-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.booking-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-sm);
}
.br-main {
  min-width: 0;
}
.br-main strong {
  display: block;
  margin-bottom: 0.15rem;
}
.cal-link {
  display: inline-block;
  margin-top: 0.25rem;
  font-weight: 700;
  color: var(--c-pink-dark);
}
.map-toggle {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  padding: 0;
  margin-left: 0.35rem;
  font: inherit;
  font-weight: 700;
  color: var(--c-pink-dark);
  cursor: pointer;
}
.map-toggle:hover {
  text-decoration: underline;
}
.map-wrap {
  margin: 0.5rem 0 0.25rem;
}
.map-frame {
  width: 100%;
  height: 180px;
  border: 0;
  border-radius: var(--radius-sm);
  display: block;
}
.map-open {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-pink-dark);
}
.booking-rows.past {
  margin-top: 0.75rem;
}
.booking-rows.past .booking-row {
  opacity: 0.7;
}
.past-title {
  margin-top: 2rem;
  opacity: 0.85;
}

@media (max-width: 820px) {
  .dash-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .mem-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .mem-history {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--c-line);
    padding-top: 1rem;
    max-height: none;
  }
}
</style>
