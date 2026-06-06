<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="section center notfound">
    <div class="container">
      <div class="big">💃🕺</div>
      <h1>Whoops — wrong step!</h1>
      <p class="muted">This page took a break from the dance floor. Let's get you back.</p>
      <RouterLink to="/" class="btn btn-primary">Back home</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  padding: 5rem 0;
}
.big {
  font-size: 4rem;
  margin-bottom: 1rem;
}
</style>
