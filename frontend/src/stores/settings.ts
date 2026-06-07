import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SiteSettings, UpdateSettingsRequest } from '@grasi/shared';
import { settingsApi } from '@/api/endpoints';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<SiteSettings | null>(null);
  const loaded = ref(false);

  async function fetch() {
    try {
      settings.value = (await settingsApi.get()).settings;
    } catch {
      settings.value = null; // a settings hiccup shouldn't break the site
    } finally {
      loaded.value = true;
    }
  }

  /** Admin-only update. */
  async function update(patch: UpdateSettingsRequest) {
    settings.value = (await settingsApi.update(patch)).settings;
  }

  return { settings, loaded, fetch, update };
});
