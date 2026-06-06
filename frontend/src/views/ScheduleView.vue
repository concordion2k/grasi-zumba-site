<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import type { ZumbaClassWithBookingState } from '@grasi/shared';
import { classesApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import { useAuthStore } from '@/stores/auth';
import ClassCard from '@/components/ClassCard.vue';
import { isPast } from '@/utils/format';

const auth = useAuthStore();
const classes = ref<ZumbaClassWithBookingState[]>([]);
const loading = ref(true);
const error = ref('');
const busyId = ref<string | null>(null);
const highlightId = ref<string | null>(null);

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
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
  height: 'auto',
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

async function book(id: string) {
  busyId.value = id;
  error.value = '';
  try {
    await classesApi.book(id);
    await load();
  } catch (e) {
    error.value = e instanceof ApiRequestError ? e.message : 'Booking failed.';
  } finally {
    busyId.value = null;
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
          <FullCalendar :options="calendarOptions" />
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
              @book="book"
              @cancel="cancel"
            />
          </div>
        </div>
      </template>
    </div>
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
</style>
