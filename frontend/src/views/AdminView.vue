<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CrmCustomer, CrmNote, PublicUser, BookingWithClass } from '@grasi/shared';
import { adminApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { formatRange, formatDate } from '@/utils/format';

type Tab = 'schedule' | 'customers' | 'signups';
const tab = ref<Tab>('schedule');
const error = ref('');
const notice = ref('');

// --- Schedule a class -------------------------------------------------------
const form = ref({
  title: '',
  description: '',
  startTime: '',
  durationMinutes: 60,
  location: '',
  capacity: 20,
});
const creating = ref(false);

async function createClass() {
  creating.value = true;
  error.value = '';
  notice.value = '';
  try {
    await adminApi.createClass({
      ...form.value,
      // datetime-local is in local time; convert to a real ISO instant.
      startTime: new Date(form.value.startTime).toISOString(),
    });
    notice.value = `"${form.value.title}" added to the calendar! 🎉`;
    form.value = {
      title: '',
      description: '',
      startTime: '',
      durationMinutes: 60,
      location: '',
      capacity: 20,
    };
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not create the class.';
  } finally {
    creating.value = false;
  }
}

// --- Customers (CRM) --------------------------------------------------------
const customers = ref<CrmCustomer[]>([]);
const loadingCustomers = ref(false);
const selected = ref<{ user: PublicUser; notes: CrmNote[]; bookings: BookingWithClass[] } | null>(
  null,
);
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
  if (t === 'customers' && customers.value.length === 0) loadCustomers();
  if (t === 'signups' && signups.value.length === 0) loadSignups();
}

onMounted(() => {
  // default tab is schedule; nothing to preload
});
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
      </div>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="notice" class="alert alert-success">{{ notice }}</div>

      <!-- Schedule -->
      <section v-if="tab === 'schedule'" class="card form-card">
        <form @submit.prevent="createClass">
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
          <button class="btn btn-primary" :disabled="creating" type="submit">
            {{ creating ? 'Adding…' : 'Add to calendar 🎉' }}
          </button>
        </form>
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
                <span class="pill pill-pink">{{ c.bookingCount }} 📅</span>
                <span class="pill">{{ c.noteCount }} 📝</span>
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
              {{ selected.user.email }} · 🎂 {{ formatDate(selected.user.birthday) }} · joined
              {{ formatDate(selected.user.createdAt) }}
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
      <section v-else class="card">
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
              <td>{{ s.name }}</td>
              <td>{{ s.email }}</td>
              <td>{{ formatDate(s.birthday) }}</td>
              <td>{{ formatDate(s.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
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
  font-family: var(--font-display);
  font-weight: 700;
  background: #fff;
  border: 2px solid var(--c-line);
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tabs button.active {
  background: var(--grad-samba);
  color: #fff;
  border-color: transparent;
}
.form-card {
  max-width: 640px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.crm {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1.25rem;
  align-items: start;
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
}
.mini-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  display: grid;
  place-items: center;
}
.mini-fallback {
  background: var(--grad-tropical);
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
}
.cust-counts {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
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
    grid-template-columns: 1fr;
  }
}
</style>
