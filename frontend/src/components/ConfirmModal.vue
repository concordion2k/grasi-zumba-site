<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    /** Confirm button style. */
    variant?: 'primary' | 'danger';
    /** Disable buttons + show a working state on confirm. */
    busy?: boolean;
  }>(),
  {
    title: 'Are you sure?',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    busy: false,
  },
);

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const confirmBtn = ref<HTMLButtonElement | null>(null);

function cancel() {
  if (props.busy) return;
  emit('cancel');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancel();
}

// Focus the confirm button when the dialog opens.
watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      confirmBtn.value?.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        @click.self="cancel"
        @keydown="onKeydown"
      >
        <div class="modal card">
          <h2 id="confirm-title">{{ title }}</h2>
          <div class="body">
            <slot />
          </div>
          <div class="actions">
            <button class="btn btn-ghost" :disabled="busy" @click="cancel">{{ cancelText }}</button>
            <button
              ref="confirmBtn"
              class="btn"
              :class="variant === 'danger' ? 'btn-danger' : 'btn-primary'"
              :disabled="busy"
              @click="emit('confirm')"
            >
              {{ busy ? 'Working…' : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(36, 23, 51, 0.55);
  backdrop-filter: blur(2px);
}
.modal {
  width: 100%;
  max-width: 420px;
  text-align: center;
}
.modal h2 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
}
.body {
  color: var(--c-ink-soft);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}
.actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}
.actions .btn {
  min-width: 7rem;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(12px) scale(0.98);
}
</style>
