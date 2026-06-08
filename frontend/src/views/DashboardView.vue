<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { BookingWithClass, ZumbaClassWithBookingState, WaiverStatus } from '@grasi/shared';
import { ALLOWED_IMAGE_TYPES, PROFILE_PICTURE_MAX_BYTES } from '@grasi/shared';
import { meApi, classesApi, waiverApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import ClassCard from '@/components/ClassCard.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { isPast, formatRange } from '@/utils/format';
import { resizeImageToLimit } from '@/utils/image';

const auth = useAuthStore();
const bookings = ref<BookingWithClass[]>([]);
const waiver = ref<WaiverStatus | null>(null);
const loading = ref(true);
const error = ref('');
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

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
);

/** Adapt a booked class to the shape ClassCard expects. */
function toCardClass(b: BookingWithClass): ZumbaClassWithBookingState {
  return {
    ...b.class,
    bookedByMe: true,
    spotsRemaining: Math.max(0, b.class.capacity - b.class.bookedCount),
  };
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [b, w] = await Promise.all([meApi.bookings(), waiverApi.status()]);
    bookings.value = b.bookings;
    waiver.value = w.status;
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

        <!-- Bookings -->
        <section class="bookings">
          <div v-if="loading" class="spinner"></div>
          <template v-else>
            <h2>Your upcoming classes</h2>
            <p v-if="upcoming.length === 0" class="muted">
              No classes booked yet —
              <RouterLink to="/schedule">find one on the schedule!</RouterLink>
            </p>
            <div class="grid cards">
              <ClassCard
                v-for="b in upcoming"
                :key="b.class.classId"
                :cls="toCardClass(b)"
                :busy="busyId === b.class.classId"
                can-book
                @cancel="requestCancel"
              />
            </div>

            <template v-if="past.length">
              <h2 class="past-title">Past classes</h2>
              <div class="grid cards">
                <ClassCard v-for="b in past" :key="b.class.classId" :cls="toCardClass(b)" />
              </div>
            </template>
          </template>
        </section>
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
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start;
}
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
.cards {
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
}
.past-title {
  margin-top: 2rem;
  opacity: 0.85;
}

@media (max-width: 820px) {
  .dash-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
