<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { BookingWithClass, ZumbaClassWithBookingState } from '@grasi/shared';
import { ALLOWED_IMAGE_TYPES, PROFILE_PICTURE_MAX_BYTES } from '@grasi/shared';
import { meApi, classesApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import ClassCard from '@/components/ClassCard.vue';
import { isPast } from '@/utils/format';

const auth = useAuthStore();
const bookings = ref<BookingWithClass[]>([]);
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
    bookings.value = (await meApi.bookings()).bookings;
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
    return;
  }
  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    error.value = 'That image is too big (max 5 MB).';
    return;
  }
  uploadingAvatar.value = true;
  try {
    await auth.refreshAvatar(file);
    notice.value = 'Looking great! 📸';
  } catch (err) {
    error.value = err instanceof ApiRequestError ? err.message : 'Upload failed.';
  } finally {
    uploadingAvatar.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function cancel(id: string) {
  busyId.value = id;
  error.value = '';
  try {
    await classesApi.cancel(id);
    await load();
  } catch (e) {
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
                @cancel="cancel"
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
  </div>
</template>

<style scoped>
.dash-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start;
}
.profile {
  text-align: center;
  position: sticky;
  top: 90px;
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
    grid-template-columns: 1fr;
  }
  .profile {
    position: static;
  }
}
</style>
