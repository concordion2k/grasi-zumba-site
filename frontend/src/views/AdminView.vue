<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type {
  CrmCustomer,
  PublicUser,
  ZumbaClassWithBookingState,
  CustomerOverview,
  BillingSummary,
  LedgerEntry,
  LedgerEntryType,
} from '@grasi/shared';
import {
  DEFAULT_BANNER_MESSAGE,
  CLASS_PACKAGES,
  DROP_IN_PRICE_CENTS,
  formatUsd,
} from '@grasi/shared';
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
const selected = ref<CustomerOverview | null>(null);
const loadingDetail = ref(false);
const noteDraft = ref('');
const savingNote = ref(false);

// Customer-detail sub-tabs + billing actions
const detailTab = ref<'billing' | 'bookings' | 'notes'>('billing');
const creditAmount = ref(1);
const creditNote = ref('');
const packSize = ref<number>(CLASS_PACKAGES[1].size);
const billingBusy = ref(false);

const billing = computed<BillingSummary | null>(() => selected.value?.billing ?? null);

const LEDGER_LABELS: Record<LedgerEntryType, string> = {
  manual_credit: 'Credit added',
  package_purchase: 'Package purchase',
  dropin_payment: 'Drop-in',
  subscription: 'Subscription',
  adjustment: 'Adjustment',
  class_booking: 'Class booking',
};

// Transaction history: 10 most recent, paginate from there (the ledger is already loaded in full).
const LEDGER_PAGE_SIZE = 10;
const ledgerPage = ref(1);
const ledger = computed(() => selected.value?.ledger ?? []);
const ledgerTotalPages = computed(() =>
  Math.max(1, Math.ceil(ledger.value.length / LEDGER_PAGE_SIZE)),
);
const pagedLedger = computed(() =>
  ledger.value.slice(
    (ledgerPage.value - 1) * LEDGER_PAGE_SIZE,
    ledgerPage.value * LEDGER_PAGE_SIZE,
  ),
);

function patchBilling(res: { billing: BillingSummary; ledger: LedgerEntry[] }) {
  if (!selected.value) return;
  selected.value.billing = res.billing;
  selected.value.ledger = res.ledger;
  ledgerPage.value = 1; // a new entry lands on top — jump back to the first page to show it
}

async function runBilling(fn: () => Promise<{ billing: BillingSummary; ledger: LedgerEntry[] }>) {
  if (!selected.value || billingBusy.value) return;
  billingBusy.value = true;
  error.value = '';
  notice.value = '';
  try {
    patchBilling(await fn());
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Billing update failed.';
  } finally {
    billingBusy.value = false;
  }
}

function adjustCredits(sign: 1 | -1) {
  const id = selected.value?.user.userId;
  const amount = Math.trunc(Math.abs(creditAmount.value)) * sign;
  if (!id || !amount) return;
  runBilling(() => adminApi.adjustCredits(id, amount, creditNote.value.trim() || undefined)).then(
    () => {
      creditNote.value = '';
    },
  );
}

function buyPackage() {
  const id = selected.value?.user.userId;
  if (id) runBilling(() => adminApi.purchasePackage(id, packSize.value));
}

function recordDropIn() {
  const id = selected.value?.user.userId;
  if (id) runBilling(() => adminApi.recordDropIn(id));
}

function toggleSubscription() {
  const id = selected.value?.user.userId;
  if (id) runBilling(() => adminApi.setSubscription(id, !billing.value?.subscription?.active));
}

// Search + pagination
const customerSearch = ref('');
const customerPage = ref(1);
const customerTotal = ref(0);
const customerTotalPages = ref(1);
/** True once the first customer load has resolved — drives "initial spinner" vs "inline reload". */
const customersLoadedOnce = ref(false);
const PAGE_SIZE = 5;
let searchDebounce: ReturnType<typeof setTimeout> | undefined;

async function loadCustomers() {
  loadingCustomers.value = true;
  try {
    const res = await adminApi.customers({
      search: customerSearch.value.trim() || undefined,
      page: customerPage.value,
      pageSize: PAGE_SIZE,
    });
    customers.value = res.customers;
    customerTotal.value = res.total;
    customerTotalPages.value = res.totalPages;
    customerPage.value = res.page; // server clamps to the valid range
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load customers.';
  } finally {
    loadingCustomers.value = false;
    customersLoadedOnce.value = true;
  }
}

/** Debounced search — reset to page 1 and reload shortly after typing stops. */
function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    customerPage.value = 1;
    loadCustomers();
  }, 300);
}

function goToPage(p: number) {
  if (p < 1 || p > customerTotalPages.value || p === customerPage.value) return;
  customerPage.value = p;
  loadCustomers();
}

async function openCustomer(id: string) {
  loadingDetail.value = true;
  selected.value = null;
  detailTab.value = 'billing';
  ledgerPage.value = 1;
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
          <div class="cust-search">
            <input
              v-model="customerSearch"
              type="search"
              placeholder="🔎 Search by name or email…"
              @input="onSearchInput"
            />
          </div>

          <!-- First load: a single spinner. After that, keep results in place and overlay a
               scoped veil so searching/paging doesn't tear down (and reflow) the whole list. -->
          <div v-if="loadingCustomers && !customersLoadedOnce" class="spinner"></div>

          <div v-else class="cust-results" :class="{ 'is-loading': loadingCustomers }">
            <div v-if="loadingCustomers" class="list-veil" aria-hidden="true">
              <span class="veil-spinner"></span>
            </div>

            <p v-if="customers.length === 0" class="muted cust-empty">
              {{ customerSearch.trim() ? 'No customers match your search.' : 'No customers yet.' }}
            </p>
            <template v-else>
              <ul class="cust-list">
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
                    <span class="pill stat" :title="`${c.noteCount} notes`"
                      >📝 {{ c.noteCount }}</span
                    >
                  </div>
                </li>
              </ul>

              <div v-if="customerTotalPages > 1" class="pager">
                <button
                  class="btn btn-ghost btn-sm"
                  :disabled="customerPage <= 1"
                  @click="goToPage(customerPage - 1)"
                >
                  ← Prev
                </button>
                <span class="pager-info">Page {{ customerPage }} of {{ customerTotalPages }}</span>
                <button
                  class="btn btn-ghost btn-sm"
                  :disabled="customerPage >= customerTotalPages"
                  @click="goToPage(customerPage + 1)"
                >
                  Next →
                </button>
              </div>
              <p class="muted small cust-total">{{ customerTotal }} total</p>
            </template>
          </div>
        </div>

        <div class="crm-detail card">
          <div v-if="loadingDetail" class="spinner"></div>
          <p v-else-if="!selected" class="muted center pick">← Pick a customer to see details.</p>
          <template v-else>
            <!-- Header -->
            <header class="cust-head">
              <img
                v-if="selected.user.profilePictureUrl"
                :src="selected.user.profilePictureUrl"
                class="head-avatar"
                alt=""
              />
              <span v-else class="head-avatar head-fallback">{{ selected.user.name[0] }}</span>
              <div class="head-info">
                <div class="head-name">
                  <h2>{{ selected.user.name }}</h2>
                  <span v-if="selected.user.role === 'admin'" class="pill pill-green">Admin</span>
                </div>
                <p class="muted small">
                  {{ selected.user.email }} · 🎂 {{ formatBirthday(selected.user.birthday) }} ·
                  joined {{ formatDate(selected.user.createdAt) }}
                </p>
                <p class="muted small waiver-inline">
                  Waiver:
                  <template v-if="selected.waiver.upToDate">
                    <span class="pill pill-green">Signed</span>
                    <a
                      :href="adminApi.waiverPdfUrl(selected.user.userId)"
                      target="_blank"
                      rel="noopener"
                      >PDF</a
                    >
                  </template>
                  <span v-else-if="selected.waiver.signed" class="pill">Outdated</span>
                  <span v-else class="pill">Not signed</span>
                </p>
              </div>
            </header>

            <!-- Stat strip -->
            <div v-if="billing" class="stat-strip">
              <div class="stat">
                <span class="stat-val">{{ billing.classCredits }}</span>
                <span class="stat-label">Credits</span>
              </div>
              <div class="stat">
                <span class="stat-val">
                  <span v-if="billing.subscription?.active" class="pill pill-green">Unlimited</span>
                  <span v-else class="muted">None</span>
                </span>
                <span class="stat-label">Plan</span>
              </div>
              <div class="stat">
                <span class="stat-val">{{ selected.bookings.length }}</span>
                <span class="stat-label">Bookings</span>
              </div>
              <div class="stat">
                <span class="stat-val">{{ formatUsd(billing.totalPaidCents) }}</span>
                <span class="stat-label">Lifetime</span>
              </div>
            </div>

            <p v-if="billing?.needsDropIn" class="dropin-note">
              No active plan — drop-in rate {{ formatUsd(DROP_IN_PRICE_CENTS) }}/class applies.
            </p>

            <!-- Sub-tabs -->
            <div class="subtabs">
              <button :class="{ on: detailTab === 'billing' }" @click="detailTab = 'billing'">
                💳 Billing
              </button>
              <button :class="{ on: detailTab === 'bookings' }" @click="detailTab = 'bookings'">
                📅 Bookings ({{ selected.bookings.length }})
              </button>
              <button :class="{ on: detailTab === 'notes' }" @click="detailTab = 'notes'">
                📝 Notes ({{ selected.notes.length }})
              </button>
            </div>

            <!-- Billing tab -->
            <div v-if="detailTab === 'billing'">
              <div class="billing-actions">
                <div class="ba-row">
                  <label class="ba-label">Credits</label>
                  <input v-model.number="creditAmount" type="number" min="1" class="ba-num" />
                  <button
                    class="btn btn-primary btn-sm"
                    :disabled="billingBusy"
                    @click="adjustCredits(1)"
                  >
                    Add
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    :disabled="billingBusy"
                    @click="adjustCredits(-1)"
                  >
                    Remove
                  </button>
                  <input v-model="creditNote" placeholder="note (optional)" class="ba-note" />
                </div>
                <div class="ba-row">
                  <label class="ba-label">Package</label>
                  <select v-model.number="packSize" class="ba-select">
                    <option v-for="p in CLASS_PACKAGES" :key="p.size" :value="p.size">
                      {{ p.size }} classes — {{ formatUsd(p.priceCents) }}
                    </option>
                  </select>
                  <button
                    class="btn btn-primary btn-sm"
                    :disabled="billingBusy"
                    @click="buyPackage"
                  >
                    Record purchase
                  </button>
                </div>
                <div class="ba-row">
                  <label class="ba-label">Drop-in</label>
                  <button
                    class="btn btn-primary btn-sm"
                    :disabled="billingBusy"
                    @click="recordDropIn"
                  >
                    Record drop-in ({{ formatUsd(DROP_IN_PRICE_CENTS) }})
                  </button>
                  <label class="ba-label ba-label-2">Subscription</label>
                  <button
                    class="btn btn-sm"
                    :class="billing?.subscription?.active ? 'btn-danger' : 'btn-primary'"
                    :disabled="billingBusy"
                    @click="toggleSubscription"
                  >
                    {{ billing?.subscription?.active ? 'Cancel unlimited' : 'Activate unlimited' }}
                  </button>
                </div>
              </div>

              <h3 class="sec-title">Purchase &amp; credit history</h3>
              <p v-if="ledger.length === 0" class="muted small">No transactions yet.</p>
              <template v-else>
                <table class="ledger">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th class="num">Credits</th>
                      <th class="num">Amount</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="e in pagedLedger" :key="e.entryId">
                      <td class="nowrap">{{ formatDate(e.createdAt) }}</td>
                      <td>
                        {{ LEDGER_LABELS[e.type] }}
                        <span v-if="e.note" class="muted small block">{{ e.note }}</span>
                      </td>
                      <td
                        class="num"
                        :class="e.creditDelta > 0 ? 'pos' : e.creditDelta < 0 ? 'neg' : ''"
                      >
                        {{ e.creditDelta > 0 ? '+' : '' }}{{ e.creditDelta || '—' }}
                      </td>
                      <td class="num">{{ e.amountCents ? formatUsd(e.amountCents) : '—' }}</td>
                      <td class="muted small">{{ e.by }}</td>
                    </tr>
                  </tbody>
                </table>

                <div v-if="ledgerTotalPages > 1" class="pager">
                  <button
                    class="btn btn-ghost btn-sm"
                    :disabled="ledgerPage <= 1"
                    @click="ledgerPage--"
                  >
                    ← Prev
                  </button>
                  <span class="pager-info">Page {{ ledgerPage }} of {{ ledgerTotalPages }}</span>
                  <button
                    class="btn btn-ghost btn-sm"
                    :disabled="ledgerPage >= ledgerTotalPages"
                    @click="ledgerPage++"
                  >
                    Next →
                  </button>
                </div>
              </template>
            </div>

            <!-- Bookings tab -->
            <div v-else-if="detailTab === 'bookings'">
              <p v-if="selected.bookings.length === 0" class="muted small">No bookings yet.</p>
              <ul v-else class="booking-list">
                <li v-for="b in selected.bookings" :key="b.class.classId">
                  <strong>{{ b.class.title }}</strong>
                  <span class="muted small block">{{
                    formatRange(b.class.startTime, b.class.endTime)
                  }}</span>
                </li>
              </ul>
            </div>

            <!-- Notes tab -->
            <div v-else>
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
            </div>
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
  /* Reset native button chrome so the platform doesn't draw its own (square) button bezel. */
  appearance: none;
  -webkit-appearance: none;
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
  /* No real border: a (transparent) border + border-radius lets the square-cornered background/
     gradient fill show past the rounded edge. The outline is an inset box-shadow instead, which
     always follows border-radius, so corners stay clean. */
  border: none;
  box-shadow: inset 0 0 0 2px var(--c-line);
  padding: 0 1.15rem;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}
.tabs button:hover:not(.active) {
  box-shadow: inset 0 0 0 2px var(--c-pink);
  color: var(--c-pink-dark);
  transform: translateY(-1px);
}
.tabs button.active {
  background: var(--grad-samba);
  color: #fff;
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
.cust-search {
  margin-bottom: 0.75rem;
}
.cust-search input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 2px solid var(--c-line);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.95rem;
}
.cust-search input:focus-visible {
  outline: 2px solid var(--c-pink);
  outline-offset: 1px;
}
.cust-empty {
  padding: 1rem 0;
}
/* Keep the list mounted during a search/page reload; dim it and float a small spinner over it so
   the panel doesn't collapse and flicker. */
.cust-results {
  position: relative;
  min-height: 60px;
}
.cust-results.is-loading .cust-list,
.cust-results.is-loading .pager,
.cust-results.is-loading .cust-empty,
.cust-results.is-loading .cust-total {
  opacity: 0.4;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.list-veil {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
}
.veil-spinner {
  width: 1.6rem;
  height: 1.6rem;
  border: 3px solid rgba(255, 46, 99, 0.25);
  border-top-color: var(--c-pink);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--c-line);
}
.pager-info {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-ink-soft);
}
.cust-total {
  text-align: center;
  margin: 0.5rem 0 0;
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
/* Customer dashboard header */
.cust-head {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}
.head-avatar {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  display: grid;
  place-items: center;
}
.head-fallback {
  background: var(--grad-tropical);
  color: #fff;
  font-weight: 700;
  font-size: 1.4rem;
  text-transform: uppercase;
}
.head-info {
  min-width: 0;
}
.head-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.head-name h2 {
  margin: 0;
  font-size: 1.3rem;
}
.head-info p {
  margin: 0.15rem 0 0;
}
.waiver-inline {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

/* Stat strip */
.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.6rem 0.4rem;
  background: var(--c-paper);
  border-radius: var(--radius-sm);
  text-align: center;
}
.stat-val {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
  line-height: 1.1;
}
.stat-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--c-ink-soft);
}
.dropin-note {
  margin: 0 0 1rem;
  padding: 0.6rem 0.85rem;
  background: rgba(255, 122, 0, 0.1);
  color: #8a4b00;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
}

/* Detail sub-tabs */
.subtabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--c-line);
}
.subtabs button {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--c-ink-soft);
  padding: 0.5rem 0.6rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}
.subtabs button.on {
  color: var(--c-pink-dark);
  border-bottom-color: var(--c-pink);
}

/* Billing actions */
.billing-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}
.ba-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ba-label {
  font-weight: 700;
  font-size: 0.82rem;
  min-width: 4.5rem;
  color: var(--c-ink-soft);
}
.ba-label-2 {
  min-width: auto;
  margin-left: 0.5rem;
}
.ba-num {
  width: 4rem;
}
.ba-note {
  flex: 1;
  min-width: 8rem;
}
.ba-num,
.ba-note,
.ba-select {
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--c-line);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 0.88rem;
}

/* Ledger table */
.sec-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.ledger {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.ledger th,
.ledger td {
  text-align: left;
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid var(--c-line);
  vertical-align: top;
}
.ledger th {
  font-family: var(--font-display);
  font-size: 0.78rem;
  color: var(--c-ink-soft);
}
.ledger .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ledger .nowrap {
  white-space: nowrap;
}
.ledger .pos {
  color: var(--c-green-deep);
  font-weight: 700;
}
.ledger .neg {
  color: var(--c-pink-dark);
  font-weight: 700;
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
