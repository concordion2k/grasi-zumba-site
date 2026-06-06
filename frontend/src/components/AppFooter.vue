<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="container foot">
      <div>
        <span class="logo">💃 GrasiZumba</span>
        <p class="muted small">Energia do Rio, na sua vizinhança. Vem dançar! 🇧🇷</p>
      </div>
      <p class="muted small">© {{ year }} Grasi Zumba · Made with rhythm &amp; love.</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: auto;
  background: var(--grad-night);
  color: #fff;
  padding: 2rem 0;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}
.logo {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
}
.small {
  font-size: 0.85rem;
}
.site-footer .muted {
  color: rgba(255, 255, 255, 0.78);
}
</style>
