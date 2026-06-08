<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ZumbaClassWithBookingState } from '@grasi/shared';
import { formatRange, isPast } from '@/utils/format';

const props = defineProps<{
  cls: ZumbaClassWithBookingState;
  busy?: boolean;
  /** Show booking controls (requires the viewer to be logged in). */
  canBook?: boolean;
}>();

const emit = defineEmits<{ book: [id: string]; cancel: [id: string] }>();

// Location map (tap to expand). Keyless Google Maps embed of the address — no API key needed.
const showMap = ref(false);
const embedUrl = computed(
  () =>
    `https://maps.google.com/maps?q=${encodeURIComponent(props.cls.location)}&z=15&output=embed`,
);
const externalUrl = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.cls.location)}`,
);

const past = computed(() => isPast(props.cls.startTime));
const full = computed(() => props.cls.spotsRemaining <= 0 && !props.cls.bookedByMe);

/** Availability ratio drives the spots-left color: green ≥66%, yellow 33–66%, red ≤33%. */
const spotsPillClass = computed(() => {
  const ratio = props.cls.capacity > 0 ? props.cls.spotsRemaining / props.cls.capacity : 0;
  if (ratio >= 0.66) return 'pill-green';
  if (ratio > 0.33) return 'pill-amber';
  return 'pill-pink';
});
</script>

<template>
  <article class="card card-lift class-card">
    <div class="class-top">
      <h3>{{ cls.title }}</h3>
      <span v-if="cls.bookedByMe" class="pill pill-green">✓ Booked</span>
      <span v-else-if="full" class="pill pill-full">Full</span>
      <span v-else class="pill" :class="spotsPillClass">{{ cls.spotsRemaining }} spots left</span>
    </div>

    <p class="when">🗓️ {{ formatRange(cls.startTime, cls.endTime) }}</p>
    <p class="where muted">
      📍 {{ cls.location }}
      <button v-if="cls.location" type="button" class="map-toggle" @click="showMap = !showMap">
        {{ showMap ? 'Hide map' : 'View map' }}
      </button>
    </p>
    <div v-if="cls.location && showMap" class="map-wrap">
      <iframe
        :src="embedUrl"
        class="map-frame"
        loading="lazy"
        title="Class location map"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
      <a :href="externalUrl" target="_blank" rel="noopener" class="map-open">
        Open in Google Maps ↗
      </a>
    </div>
    <p v-if="cls.description" class="desc">{{ cls.description }}</p>

    <div class="class-foot">
      <span class="muted small">{{ cls.bookedCount }}/{{ cls.capacity }} dancers</span>
      <template v-if="canBook && !past">
        <button
          v-if="cls.bookedByMe"
          class="btn btn-danger btn-sm"
          :disabled="busy"
          @click="emit('cancel', cls.classId)"
        >
          Cancel
        </button>
        <button
          v-else
          class="btn btn-primary btn-sm"
          :disabled="busy || full"
          @click="emit('book', cls.classId)"
        >
          {{ full ? 'Full' : 'Book it 💃' }}
        </button>
      </template>
      <span v-else-if="past" class="muted small">Past class</span>
    </div>
  </article>
</template>

<style scoped>
.class-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.class-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.class-top h3 {
  margin: 0;
  font-size: 1.25rem;
}
.when {
  font-weight: 600;
  margin: 0;
}
.where {
  margin: 0;
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
  margin: 0.5rem 0 0;
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
.desc {
  margin: 0.4rem 0 0;
  color: var(--c-ink-soft);
}
.class-foot {
  margin-top: auto;
  padding-top: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.small {
  font-size: 0.85rem;
}
</style>
