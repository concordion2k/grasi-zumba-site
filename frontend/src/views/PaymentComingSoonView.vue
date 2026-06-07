<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';

const route = useRoute();
const plan = computed(() => (route.query.plan as string | undefined) ?? null);
</script>

<template>
  <div class="section soon">
    <div class="container center">
      <div class="emoji">💳✨</div>
      <h1>Online payment is <span class="text-gradient">coming soon!</span></h1>

      <p v-if="plan" class="pill pill-pink plan-pill">You picked: {{ plan }}</p>

      <p class="lede">
        We're putting the finishing touches on secure online checkout. For now, reserve your spot
        online and pay Grasi directly at the studio — cash, card, or PIX. Obrigada for your
        patience! 🙏
      </p>

      <div class="row cta">
        <RouterLink to="/schedule" class="btn btn-primary">Book a class</RouterLink>
        <RouterLink to="/pricing" class="btn btn-ghost">Back to pricing</RouterLink>
      </div>

      <p class="muted note">
        Want to be the first to know when online payments go live?
        <RouterLink to="/register">Create an account</RouterLink> and we'll keep you posted.
      </p>
    </div>
  </div>
</template>

<style scoped>
.soon {
  padding: clamp(3rem, 8vw, 6rem) 0;
}
.emoji {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}
.soon h1 {
  font-size: clamp(2rem, 5vw, 3rem);
}
.plan-pill {
  margin: 0.5rem 0 1rem;
}
.lede {
  font-size: 1.15rem;
  color: var(--c-ink-soft);
  max-width: 36rem;
  margin: 0.5rem auto 1.75rem;
}
.cta {
  justify-content: center;
  flex-wrap: wrap;
}
.note {
  margin-top: 1.75rem;
  font-size: 0.95rem;
}
</style>
