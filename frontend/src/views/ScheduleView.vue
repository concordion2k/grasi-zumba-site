<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import type { ZumbaClassWithBookingState } from '@grasi/shared';
import { classesApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import ClassCard from '@/components/ClassCard.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';
import { isPast, formatRange } from '@/utils/format';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null);
const classes = ref<ZumbaClassWithBookingState[]>([]);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);
const highlightId = ref<string | null>(null);

// The month grid is unusable on a phone, so default to a tap-friendly list view there.
const MOBILE_BP = 700;
const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < MOBILE_BP);

const upcoming = computed(() =>
  classes.value
    .filter((c) => !isPast(c.startTime))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
);

function colorFor(c: ZumbaClassWithBookingState): string {
  if (c.bookedByMe) return '#00b16a';
  if (c.spotsRemaining <= 0) return '#9b8aa6';
  return '#ff2e63';
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  initialView: isMobile.value ? 'listMonth' : 'dayGridMonth',
  headerToolbar: isMobile.value
    ? { left: 'prev,next', center: 'title', right: 'today' }
    : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' },
  buttonText: { today: 'Today', month: 'Month', week: 'Week', list: 'List' },
  height: 'auto',
  expandRows: true,
  noEventsText: 'No classes in this range — check back soon!',
  events: classes.value.map((c) => ({
    id: c.classId,
    title: c.title,
    start: c.startTime,
    end: c.endTime,
    backgroundColor: colorFor(c),
    borderColor: colorFor(c),
  })),
  eventClick: (arg: EventClickArg) => {
    highlightId.value = arg.event.id;
    document
      .getElementById(`class-${arg.event.id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
}));

// Switch between list (mobile) and month (desktop) when crossing the breakpoint (e.g. iPad rotation).
function handleResize() {
  const mobile = window.innerWidth < MOBILE_BP;
  if (mobile === isMobile.value) return;
  isMobile.value = mobile;
  calendarRef.value?.getApi()?.changeView(mobile ? 'listMonth' : 'dayGridMonth');
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    classes.value = (await classesApi.list()).classes;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load the schedule.';
  } finally {
    loading.value = false;
  }
}

function isWaiverRequired(e: unknown): boolean {
  return (
    e instanceof ApiRequestError &&
    e.status === 403 &&
    typeof e.details === 'object' &&
    e.details !== null &&
    (e.details as { code?: string }).code === 'waiver_required'
  );
}

// Confirmation modal — shared by both book and cancel.
const pending = ref<{ cls: ZumbaClassWithBookingState; action: 'book' | 'cancel' } | null>(null);

/** ClassCard "book"/"cancel" → open the confirmation modal. */
function requestAction(id: string, action: 'book' | 'cancel') {
  const cls = classes.value.find((c) => c.classId === id);
  if (cls) pending.value = { cls, action };
}

/** Book a class. If the waiver isn't signed yet, send the user to sign it — carrying the class id
 *  so the booking is completed automatically on return (instead of being silently dropped). */
async function doBook(id: string) {
  busyId.value = id;
  error.value = '';
  try {
    await classesApi.book(id);
    await load();
  } catch (e) {
    if (isWaiverRequired(e)) {
      router.push({ name: 'waiver', query: { redirect: '/schedule', book: id } });
      return;
    }
    error.value = e instanceof ApiRequestError ? e.message : 'Booking failed.';
  } finally {
    busyId.value = null;
  }
}

async function confirmPending() {
  const p = pending.value;
  if (!p) return;
  pending.value = null;
  if (p.action === 'book') {
    await doBook(p.cls.classId);
    return;
  }
  busyId.value = p.cls.classId;
  error.value = '';
  try {
    await classesApi.cancel(p.cls.classId);
    await load();
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Could not cancel.';
  } finally {
    busyId.value = null;
  }
}

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  await load();
  // Returning from the waiver with a pending booking → finish it now (waiver is signed).
  const bookId = route.query.book;
  if (typeof bookId === 'string' && auth.isAuthenticated) {
    await router.replace({ query: {} }); // drop ?book= so a refresh won't re-book
    await doBook(bookId);
  }
});
onUnmounted(() => window.removeEventListener('resize', handleResize));
</script>

<template>
  <div class="section">
    <div class="container">
      <header class="page-head">
        <h1>Class <span class="text-gradient">schedule</span></h1>
        <p class="muted">Find a class, grab your spot, and come dance with us! 🎉</p>
      </header>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <p v-if="!auth.isAuthenticated" class="alert alert-success">
        👋 <RouterLink to="/login">Log in</RouterLink> or
        <RouterLink to="/register">create an account</RouterLink> to book a class.
      </p>

      <div v-if="loading" class="spinner"></div>

      <template v-else>
        <div class="card calendar-wrap">
          <FullCalendar ref="calendarRef" :options="calendarOptions" />
          <div class="legend">
            <span><i class="dot" style="background: #ff2e63"></i> Open</span>
            <span><i class="dot" style="background: #00b16a"></i> Booked by you</span>
            <span><i class="dot" style="background: #9b8aa6"></i> Full</span>
          </div>
        </div>

        <h2 class="upcoming-title">Upcoming classes</h2>
        <p v-if="upcoming.length === 0" class="muted">
          No upcoming classes posted yet — check back soon! 💛
        </p>
        <div class="grid cards">
          <div
            v-for="c in upcoming"
            :id="`class-${c.classId}`"
            :key="c.classId"
            :class="{ glow: highlightId === c.classId }"
          >
            <ClassCard
              :cls="c"
              :busy="busyId === c.classId"
              :can-book="auth.isAuthenticated"
              @book="(id) => requestAction(id, 'book')"
              @cancel="(id) => requestAction(id, 'cancel')"
            />
          </div>
        </div>
      </template>
    </div>

    <ConfirmModal
      :open="pending !== null"
      :title="pending?.action === 'cancel' ? 'Cancel this booking?' : 'Book this class?'"
      :confirm-text="pending?.action === 'cancel' ? 'Yes, cancel' : 'Yes, book it 💃'"
      :variant="pending?.action === 'cancel' ? 'danger' : 'primary'"
      :busy="busyId !== null"
      @confirm="confirmPending"
      @cancel="pending = null"
    >
      <template v-if="pending">
        <template v-if="pending.action === 'cancel'">
          You're about to cancel your spot in <strong>{{ pending.cls.title }}</strong>
        </template>
        <template v-else>
          You're about to book <strong>{{ pending.cls.title }}</strong>
        </template>
        <br />
        <span class="muted">{{ formatRange(pending.cls.startTime, pending.cls.endTime) }}</span>
      </template>
    </ConfirmModal>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 1.5rem;
}
.page-head h1 {
  font-size: clamp(2rem, 5vw, 3rem);
}
.calendar-wrap {
  margin-bottom: 2.5rem;
}
.legend {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--c-ink-soft);
}
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 0.3rem;
  vertical-align: middle;
}
.upcoming-title {
  margin-bottom: 1.25rem;
}
.cards {
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
}
.glow :deep(.class-card) {
  outline: 3px solid var(--c-yellow);
  outline-offset: 3px;
}

/* FullCalendar look-and-feel tweaks */
:deep(.fc) {
  --fc-border-color: var(--c-line);
  font-family: var(--font-body);
}
:deep(.fc .fc-button-primary) {
  background: var(--c-pink);
  border-color: var(--c-pink);
  text-transform: capitalize;
}
:deep(.fc .fc-button-primary:hover) {
  background: var(--c-pink-dark);
  border-color: var(--c-pink-dark);
}
:deep(.fc .fc-button-primary:disabled) {
  background: var(--c-ink-soft);
  border-color: var(--c-ink-soft);
}
:deep(.fc-event) {
  cursor: pointer;
  font-weight: 600;
}
:deep(.fc .fc-toolbar-title) {
  font-family: var(--font-display);
}
:deep(.fc .fc-list-event-title) {
  font-weight: 600;
}
:deep(.fc .fc-list-event:hover td) {
  background: var(--c-paper);
}
/* Friendly, padded empty state in the bubbly display font. */
:deep(.fc .fc-list-empty) {
  background: transparent;
}
:deep(.fc .fc-list-empty-cushion) {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--c-ink-soft);
  padding: 2.5rem 1.5rem;
  margin: 0;
}

/* Phone: stack the toolbar so it isn't cramped, and tighten the calendar. */
@media (max-width: 560px) {
  .calendar-wrap {
    padding: 1rem;
  }
  :deep(.fc .fc-toolbar.fc-header-toolbar) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  :deep(.fc .fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
  }
  :deep(.fc .fc-toolbar-title) {
    font-size: 1.2rem;
  }
  :deep(.fc .fc-list-event-time) {
    white-space: normal;
  }
}
</style>
