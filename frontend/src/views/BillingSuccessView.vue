<script setup lang="ts">
// Stripe redirects here after a successful checkout. The purchase is applied asynchronously by the
// webhook, so we just confirm and point the customer to their account.
</script>

<template>
  <div class="section">
    <div class="container narrow">
      <div class="card center-card">
        <div class="emoji">🎉</div>
        <h1>Payment received!</h1>
        <p class="muted">
          Thanks for your purchase. Your credits or subscription will appear on your account in a
          few moments.
        </p>
        <div class="actions">
          <RouterLink to="/dashboard" class="btn btn-primary">Go to My Account →</RouterLink>
          <RouterLink to="/schedule" class="btn btn-ghost">Browse classes</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 460px;
}
.center-card {
  text-align: center;
  padding: 2.5rem 1.5rem;
}
.emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.center-card h1 {
  font-size: 1.7rem;
  margin-bottom: 0.5rem;
}
.center-card p {
  margin: 0 0 1.25rem;
}
.actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
