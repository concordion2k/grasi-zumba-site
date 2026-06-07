<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const show = computed(() => settings.settings?.bannerEnabled ?? false);
const message = computed(() => settings.settings?.bannerMessage ?? '');
</script>

<template>
  <div v-if="show" class="banner" role="status">
    <div class="container banner-inner">
      <span class="banner-icon" aria-hidden="true">🚧</span>
      <p>{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.banner {
  width: 100%;
  background: linear-gradient(90deg, #e4002b 0%, #ff7a00 55%, #ffcc29 100%);
  color: #fff;
  /* warning stripe accent along the bottom edge */
  border-bottom: 4px solid rgba(0, 0, 0, 0.12);
}
.banner-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
}
.banner-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}
.banner p {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

@media (max-width: 560px) {
  .banner p {
    font-size: 0.85rem;
  }
}
</style>
