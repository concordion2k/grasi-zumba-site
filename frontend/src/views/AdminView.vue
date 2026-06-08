<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type {
  CrmCustomer,
  CrmNote,
  PublicUser,
  BookingWithClass,
  ZumbaClassWithBookingState,
  WaiverStatus,
} from '@grasi/shared';
import { DEFAULT_BANNER_MESSAGE } from '@grasi/shared';
import { adminApi, classesApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useSettingsStore } from '@/stores/settings';
import { formatRange, formatDate, formatBirthday, isPast } from '@/utils/format';

type Tab = 'schedule' | 'customers' | 'signups' | 'settings';
const tab = ref<Tab>('schedule');
const error = ref('');
const notice = ref('');

// --- Site settings (announcement banner) ------------------------------------
const settingsStore = useSettingsStore();
const bannerEnabled = ref(false);
const bannerMessage = ref(DEFAULT_BANNER_MESSAGE);
const savingSettings = ref(false);

async function loadSettings() {
  if (!settingsStore.loaded) await settingsStore.fetch();
  if (settingsStore.settings) {
    bannerEnabled.value = settingsStore.settings.bannerEnabled;
    bannerMessage.value = settingsStore.settings.bannerMessage;
  }
}

async function saveSettings() {
  savingSettings.value = true;
  error.value = '';
  notice.value = '';
  try {
    await settingsStore.update({
      bannerEnabled: bannerEnabled.value,
      bannerMessage: bannerMessage.value.trim(),
    });
    notice.value = 'Banner settings saved! 🎉';
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not save settings.';
  } finally {
    savingSettings.value = false;
  }
}

// --- Schedule a class -------------------------------------------------------
const EMPTY_FORM = {
  title: '',
  description: '',
  startTime: '',
  durationMinutes: 60,
  location: '',
  capacity: 20,
};
const form = ref({ ...EMPTY_FORM });
const creating = ref(false);
/** Set when editing an existing class; null when creating a new one. */
const editingId = ref<string | null>(null);

// Existing classes (for edit/cancel).
const classes = ref<ZumbaClassWithBookingState[]>([]);
const loadingClasses = ref(false);
const cancelingId = ref<string | null>(null);

async function loadClasses() {
  loadingClasses.value = true;
  try {
    classes.value = (await classesApi.list()).classes;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load classes.';
  } finally {
    loadingClasses.value = false;
  }
}

/** Convert an ISO instant to the `YYYY-MM-DDTHH:mm` value a datetime-local input expects (local tz). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resetForm() {
  form.value = { ...EMPTY_FORM };
  editingId.value = null;
}

function startEdit(cls: ZumbaClassWithBookingState) {
  editingId.value = cls.classId;
  form.value = {
    title: cls.title,
    description: cls.description,
    startTime: toLocalInput(cls.startTime),
    durationMinutes: Math.round(
      (new Date(cls.endTime).getTime() - new Date(cls.startTime).getTime()) / 60000,
    ),
    location: cls.location,
    capacity: cls.capacity,
  };
  error.value = '';
  notice.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function submitClass() {
  creating.value = true;
  error.value = '';
  notice.value = '';
  try {
    const payload = {
      ...form.value,
      // datetime-local is in local time; convert to a real ISO instant.
      startTime: new Date(form.value.startTime).toISOString(),
    };
    if (editingId.value) {
      await adminApi.updateClass(editingId.value, payload);
      notice.value = `"${form.value.title}" updated — booked dancers have been notified. ✨`;
    } else {
      await adminApi.createClass(payload);
      notice.value = `"${form.value.title}" added to the calendar! 🎉`;
    }
    resetForm();
    await loadClasses();
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not save the class.';
  } finally {
    creating.value = false;
  }
}

async function removeClass(cls: ZumbaClassWithBookingState) {
  const booked = cls.bookedCount;
  const warn =
    booked > 0 ? ` ${booked} booked dancer${booked === 1 ? '' : 's'} will be emailed.` : '';
  if (!window.confirm(`Cancel "${cls.title}"?${warn} This can't be undone.`)) return;
  cancelingId.value = cls.classId;
  error.value = '';
  notice.value = '';
  try {
    await adminApi.cancelClass(cls.classId);
    notice.value = `"${cls.title}" was canceled.`;
    if (editingId.value === cls.classId) resetForm();
    await loadClasses();
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not cancel the class.';
  } finally {
    cancelingId.value = null;
  }
}

// --- Customers (CRM) --------------------------------------------------------
const customers = ref<CrmCustomer[]>([]);
const loadingCustomers = ref(false);
const selected = ref<{
  user: PublicUser;
  notes: CrmNote[];
  bookings: BookingWithClass[];
  waiver: WaiverStatus;
} | null>(null);
const loadingDetail = ref(false);
const noteDraft = ref('');
const savingNote = ref(false);

async function loadCustomers() {
  loadingCustomers.value = true;
  try {
    customers.value = (await adminApi.customers()).customers;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load customers.';
  } finally {
    loadingCustomers.value = false;
  }
}

async function openCustomer(id: string) {
  loadingDetail.value = true;
  selected.value = null;
  try {
    selected.value = await adminApi.customer(id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load customer.';
  } finally {
    loadingDetail.value = false;
  }
}

async function addNote() {
  if (!selected.value || !noteDraft.value.trim()) return;
  savingNote.value = true;
  try {
    const { note } = await adminApi.addNote(selected.value.user.userId, noteDraft.value.trim());
    selected.value.notes.unshift(note);
    noteDraft.value = '';
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not save the note.';
  } finally {
    savingNote.value = false;
  }
}

async function removeNote(noteId: string) {
  if (!selected.value) return;
  const customerId = selected.value.user.userId;
  try {
    await adminApi.deleteNote(customerId, noteId);
    selected.value.notes = selected.value.notes.filter((n) => n.noteId !== noteId);
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not delete the note.';
  }
}

// --- Signups ----------------------------------------------------------------
const signups = ref<PublicUser[]>([]);
const loadingSignups = ref(false);

async function loadSignups() {
  loadingSignups.value = true;
  try {
    signups.value = (await adminApi.signups()).signups;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load signups.';
  } finally {
    loadingSignups.value = false;
  }
}

function switchTab(t: Tab) {
  tab.value = t;
  error.value = '';
  notice.value = '';
  if (t === 'schedule' && classes.value.length === 0) loadClasses();
  if (t === 'customers' && customers.value.length === 0) loadCustomers();
  if (t === 'signups' && signups.value.length === 0) loadSignups();
  if (t === 'settings') loadSettings();
}

onMounted(loadClasses); // schedule is the default tab
</script>

<template>
  <div class="section">
    <div class="container">
      <h1>Admin <span class="text-gradient">studio</span> 🎛️</h1>
      <p class="muted">Run the show — schedule classes, manage customers, welcome new dancers.</p>

      <div class="tabs">
        <button :class="{ active: tab === 'schedule' }" @click="switchTab('schedule')">
          ➕ Schedule a class
        </button>
        <button :class="{ active: tab === 'customers' }" @click="switchTab('customers')">
          👥 Customers
        </button>
        <button :class="{ active: tab === 'signups' }" @click="switchTab('signups')">
          🆕 New signups
        </button>
        <button :class="{ active: tab === 'settings' }" @click="switchTab('settings')">
          ⚙️ Settings
        </button>
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="notice" class="alert alert-success">{{ notice }}</div>

      <!-- Schedule -->
      <section v-if="tab === 'schedule'">
        <div class="card form-card">
          <h2 class="form-title">{{ editingId ? 'Edit class' : 'Schedule a class' }}</h2>
          <form @submit.prevent="submitClass">
            <div class="field">
              <label for="title">Class title</label>
              <input id="title" v-model="form.title" type="text" required maxlength="120" />
            </div>
            <div class="field">
              <label for="desc">Description</label>
              <textarea id="desc" v-model="form.description" rows="3" maxlength="2000"></textarea>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="start">Date &amp; time</label>
                <input id="start" v-model="form.startTime" type="datetime-local" required />
              </div>
              <div class="field">
                <label for="dur">Duration (min)</label>
                <input
                  id="dur"
                  v-model.number="form.durationMinutes"
                  type="number"
                  min="10"
                  max="360"
                  required
                />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label for="loc">Location</label>
                <input id="loc" v-model="form.location" type="text" required />
              </div>
              <div class="field">
                <label for="cap">Capacity</label>
                <input
                  id="cap"
                  v-model.number="form.capacity"
                  type="number"
                  min="1"
                  max="500"
                  required
                />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" :disabled="creating" type="submit">
                {{ creating ? 'Saving…' : editingId ? 'Save changes ✨' : 'Add to calendar 🎉' }}
              </button>
              <button v-if="editingId" class="btn btn-ghost" type="button" @click="resetForm">
                Cancel edit
              </button>
            </div>
          </form>
        </div>

        <!-- Existing classes -->
        <div class="card class-list-card">
          <h2 class="form-title">Upcoming classes</h2>
          <div v-if="loadingClasses" class="spinner"></div>
          <p v-else-if="classes.length === 0" class="muted">No classes scheduled yet.</p>
          <ul v-else class="class-list">
            <li
              v-for="cls in classes"
              :key="cls.classId"
              :class="{ editing: editingId === cls.classId }"
            >
              <div class="class-info">
                <strong>{{ cls.title }}</strong>
                <span class="muted small block">{{ formatRange(cls.startTime, cls.endTime) }}</span>
                <span class="muted small block">
                  📍 {{ cls.location }} · {{ cls.bookedCount }}/{{ cls.capacity }} booked
                  <span v-if="isPast(cls.startTime)" class="pill pill-past">past</span>
                </span>
              </div>
              <div class="class-actions">
                <button class="btn btn-ghost btn-sm" type="button" @click="startEdit(cls)">
                  Edit
                </button>
                <button
                  class="btn btn-danger btn-sm"
                  type="button"
                  :disabled="cancelingId === cls.classId"
                  @click="removeClass(cls)"
                >
                  {{ cancelingId === cls.classId ? '…' : 'Cancel' }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Customers / CRM -->
      <section v-else-if="tab === 'customers'" class="crm">
        <div class="crm-list card">
          <div v-if="loadingCustomers" class="spinner"></div>
          <p v-else-if="customers.length === 0" class="muted">No customers yet.</p>
          <ul v-else class="cust-list">
            <li
              v-for="c in customers"
              :key="c.userId"
              :class="{ active: selected?.user.userId === c.userId }"
              @click="openCustomer(c.userId)"
            >
              <div class="cust-mini">
                <img
                  v-if="c.profilePictureUrl"
                  :src="c.profilePictureUrl"
                  class="mini-avatar"
                  alt=""
                />
                <span v-else class="mini-avatar mini-fallback">{{ c.name[0] }}</span>
                <div>
                  <strong>{{ c.name }}</strong>
                  <span class="muted small block">{{ c.email }}</span>
                </div>
              </div>
              <div class="cust-counts">
                <span class="pill pill-pink stat" :title="`${c.bookingCount} bookings`">
                  📅 {{ c.bookingCount }}
                </span>
                <span class="pill stat" :title="`${c.noteCount} notes`">📝 {{ c.noteCount }}</span>
              </div>
            </li>
          </ul>
        </div>

        <div class="crm-detail card">
          <div v-if="loadingDetail" class="spinner"></div>
          <p v-else-if="!selected" class="muted center pick">← Pick a customer to see details.</p>
          <template v-else>
            <header class="detail-head">
              <h2>{{ selected.user.name }}</h2>
              <span v-if="selected.user.role === 'admin'" class="pill pill-green">Admin</span>
            </header>
            <p class="muted">
              {{ selected.user.email }} · 🎂 {{ formatBirthday(selected.user.birthday) }} · joined
              {{ formatDate(selected.user.createdAt) }}
            </p>

            <p class="waiver-line">
              <strong>Waiver:</strong>
              <template v-if="selected.waiver.upToDate">
                <span class="pill pill-green">Signed</span>
                {{ selected.waiver.signedAt ? formatDate(selected.waiver.signedAt) : '' }}
                <a
                  :href="adminApi.waiverPdfUrl(selected.user.userId)"
                  target="_blank"
                  rel="noopener"
                  >download PDF</a
                >
              </template>
              <span v-else-if="selected.waiver.signed" class="pill">Outdated — needs re-sign</span>
              <span v-else class="pill">Not signed</span>
            </p>

            <h3>Bookings</h3>
            <p v-if="selected.bookings.length === 0" class="muted small">No bookings yet.</p>
            <ul v-else class="booking-list">
              <li v-for="b in selected.bookings" :key="b.class.classId">
                <strong>{{ b.class.title }}</strong>
                <span class="muted small block">{{
                  formatRange(b.class.startTime, b.class.endTime)
                }}</span>
              </li>
            </ul>

            <h3>Notes 📝</h3>
            <form class="note-form" @submit.prevent="addNote">
              <textarea
                v-model="noteDraft"
                rows="2"
                placeholder="Add a private note about this customer…"
              />
              <button class="btn btn-primary btn-sm" :disabled="savingNote || !noteDraft.trim()">
                {{ savingNote ? 'Saving…' : 'Add note' }}
              </button>
            </form>
            <ul class="note-list">
              <li v-for="n in selected.notes" :key="n.noteId" class="note">
                <p>{{ n.body }}</p>
                <div class="note-meta">
                  <span class="muted small"
                    >{{ n.authorName }} · {{ formatDate(n.createdAt) }}</span
                  >
                  <button class="link-danger" @click="removeNote(n.noteId)">delete</button>
                </div>
              </li>
            </ul>
          </template>
        </div>
      </section>

      <!-- Signups -->
      <section v-else-if="tab === 'signups'" class="card">
        <div v-if="loadingSignups" class="spinner"></div>
        <p v-else-if="signups.length === 0" class="muted">No signups yet.</p>
        <table v-else class="signup-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Birthday</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in signups" :key="s.userId">
              <td data-label="Name">{{ s.name }}</td>
              <td data-label="Email">{{ s.email }}</td>
              <td data-label="Birthday">{{ formatBirthday(s.birthday) }}</td>
              <td data-label="Joined">{{ formatDate(s.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Settings -->
      <section v-else class="card form-card">
        <h2 class="settings-title">Announcement banner</h2>
        <p class="muted">
          Show a site-wide banner at the top of every page — handy while the business isn't live
          yet.
        </p>

        <label class="toggle">
          <input v-model="bannerEnabled" type="checkbox" />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">{{ bannerEnabled ? 'Banner is ON' : 'Banner is OFF' }}</span>
        </label>

        <div class="field">
          <label for="bannerMsg">Banner message</label>
          <textarea id="bannerMsg" v-model="bannerMessage" rows="3" maxlength="300"></textarea>
        </div>

        <button class="btn btn-primary" :disabled="savingSettings" @click="saveSettings">
          {{ savingSettings ? 'Saving…' : 'Save banner settings' }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 1.5rem 0;
}
.tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  line-height: 1;
  min-height: 44px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--c-ink);
  background: #fff;
  border: 2px solid var(--c-line);
  padding: 0 1.15rem;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.tabs button:hover:not(.active) {
  border-color: var(--c-pink);
  color: var(--c-pink-dark);
  transform: translateY(-1px);
}
.tabs button.active {
  background: var(--grad-samba);
  color: #fff;
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}
.form-card {
  max-width: 640px;
}
.form-title {
  margin: 0 0 1rem;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.form-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Existing-classes list (schedule tab) */
.class-list-card {
  max-width: 640px;
  margin-top: 1.25rem;
}
.class-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.class-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid var(--c-line);
  border-radius: var(--radius-sm);
}
.class-list li.editing {
  border-color: var(--c-pink);
  background: rgba(255, 46, 99, 0.06);
}
.class-info {
  min-width: 0;
}
.class-info > strong {
  display: block;
}
.class-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.btn-danger {
  background: #fff;
  color: var(--c-pink-dark);
  border: 2px solid var(--c-pink);
}
.btn-danger:hover:not(:disabled) {
  background: var(--c-pink);
  color: #fff;
}
.pill-past {
  background: var(--c-line);
  color: var(--c-ink-soft);
}

/* Settings: toggle switch */
.settings-title {
  margin-bottom: 0.25rem;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  margin: 1.1rem 0 1.25rem;
  user-select: none;
}
.toggle input {
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
.toggle input:checked + .toggle-track {
  background: var(--c-green);
}
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}
.toggle input:focus-visible + .toggle-track {
  outline: 2px solid var(--c-pink);
  outline-offset: 2px;
}
.toggle-label {
  font-weight: 600;
}
.crm {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
/* Grid items default to min-width:auto; without this the row content (email/pills) can't shrink
   and overflows the screen. */
.crm-list,
.crm-detail {
  min-width: 0;
}
.cust-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cust-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.cust-list li:hover {
  background: var(--c-paper);
}
.cust-list li.active {
  background: rgba(255, 46, 99, 0.1);
}
.cust-mini {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0; /* allow the email to truncate instead of overflowing */
}
.cust-mini > div {
  min-width: 0;
}
.cust-mini strong {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cust-mini .small {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mini-avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  display: grid;
  place-items: center;
  line-height: 1;
}
.mini-fallback {
  background: var(--grad-tropical);
  color: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  text-transform: uppercase;
}
.cust-counts {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.cust-counts .stat {
  min-width: 3.1rem;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}
.block {
  display: block;
}
.small {
  font-size: 0.82rem;
}
.pick {
  padding: 2rem 0;
}
.detail-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.waiver-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.25rem 0 1rem;
}
.booking-list,
.note-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}
.booking-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--c-line);
}
.note-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.note-form textarea {
  width: 100%;
  font-family: var(--font-body);
  padding: 0.6rem;
  border: 2px solid var(--c-line);
  border-radius: var(--radius-sm);
}
.note {
  background: var(--c-paper);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-bottom: 0.6rem;
}
.note p {
  margin: 0 0 0.4rem;
}
.note-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.link-danger {
  background: none;
  border: none;
  color: var(--c-pink-dark);
  cursor: pointer;
  font-size: 0.82rem;
}
.signup-table {
  width: 100%;
  border-collapse: collapse;
}
.signup-table th,
.signup-table td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--c-line);
}
.signup-table th {
  font-family: var(--font-display);
}

@media (max-width: 820px) {
  .crm,
  .form-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Phone: the 4-column signups table overflows — stack each signup into a labeled card. */
@media (max-width: 600px) {
  .signup-table thead {
    display: none;
  }
  .signup-table,
  .signup-table tbody,
  .signup-table tr,
  .signup-table td {
    display: block;
    width: 100%;
  }
  .signup-table tr {
    border: 1px solid var(--c-line);
    border-radius: var(--radius-sm);
    padding: 0.5rem 0.9rem;
    margin-bottom: 0.75rem;
  }
  .signup-table td {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    text-align: right;
    border-bottom: 1px solid var(--c-line);
    padding: 0.45rem 0;
  }
  .signup-table tr td:last-child {
    border-bottom: none;
  }
  .signup-table td::before {
    content: attr(data-label);
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--c-ink);
    text-align: left;
  }
}
</style>
