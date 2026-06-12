<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

/** Image to show enlarged. Defaults to Grasi's Zumba certificate (served from /public). */
const props = withDefaults(defineProps<{ src?: string; alt?: string }>(), {
  src: '/zumba-cert.png',
  alt: "Grasi's Zumba instructor certificate",
});

const show = ref(false);
const open = () => (show.value = true);
const close = () => (show.value = false);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

// Lock body scroll + Esc-to-close only while the lightbox is open.
watch(show, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : '';
  if (isOpen) window.addEventListener('keydown', onKey);
  else window.removeEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <!-- The call site supplies the trigger and calls `open`. -->
  <slot :open="open" />

  <Teleport to="body">
    <div
      v-if="show"
      class="cert-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="alt"
      @click.self="close"
    >
      <button class="cert-close" type="button" aria-label="Close" @click="close">×</button>
      <img :src="props.src" :alt="alt" class="cert-full" @click="close" />
    </div>
  </Teleport>
</template>

<style scoped>
.cert-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(20, 12, 35, 0.82);
  backdrop-filter: blur(3px);
  animation: cert-fade 0.15s ease;
}
.cert-full {
  max-width: min(900px, 92vw);
  max-height: 88vh;
  width: auto;
  height: auto;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  cursor: zoom-out;
}
.cert-close {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease;
}
.cert-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
@keyframes cert-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
