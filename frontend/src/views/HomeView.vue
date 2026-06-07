<script setup lang="ts">
import { RouterLink } from 'vue-router';

const services = [
  {
    emoji: '🔥',
    title: 'Zumba Fitness',
    text: 'High-energy cardio dance party blending samba, salsa, and reggaeton. All levels welcome!',
  },
  {
    emoji: '💪',
    title: 'Zumba Toning',
    text: 'Sculpt and tone with light weights while you move to the rhythm. Feel the burn, keep the fun.',
  },
  {
    emoji: '🌟',
    title: 'Private & Small Group',
    text: 'Personalized sessions for you and your friends. Birthdays, hen-dos, team events — vamos!',
  },
];

const highlights = [
  { num: 'Licensed', label: 'Certified Zumba® instructor' },
  { num: 'Rio', label: 'Authentic Brazilian energy' },
  { num: 'All levels', label: 'No experience needed' },
];

const pricingTiers = [
  { name: 'Drop-in', price: '$15', unit: '/ class', note: 'Pay as you go' },
  { name: 'Class packs', price: 'from $12', unit: '/ class', note: '5, 10 or 20 classes' },
  { name: 'Monthly', price: '$199', unit: '/ month', note: 'Unlimited classes' },
];
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="kicker">💃🏽 Dance. Sweat. Smile. Repeat.</span>
          <h1>Feel the <span class="text-gradient">rhythm of Rio</span> in every class</h1>
          <p class="lede">
            Join Grasi for an unforgettable Zumba experience — Brazilian beats, big smiles, and a
            workout that never feels like one. Vem com a gente!
          </p>
          <div class="row hero-cta">
            <RouterLink to="/schedule" class="btn btn-primary">See the schedule →</RouterLink>
            <RouterLink to="/register" class="btn btn-ghost">Create an account</RouterLink>
          </div>
          <div class="highlights">
            <div v-for="h in highlights" :key="h.label" class="highlight">
              <strong>{{ h.num }}</strong>
              <span class="muted">{{ h.label }}</span>
            </div>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="disco">💃🏽</div>
        </div>
      </div>
    </section>

    <!-- Pricing teaser -->
    <section class="section pricing-teaser">
      <div class="container">
        <h2 class="center">Pricing that fits your <span class="text-gradient">rhythm</span></h2>
        <p class="center muted offer-sub">Drop in, save with a pack, or go all-in unlimited.</p>
        <div class="grid teaser-grid">
          <div v-for="t in pricingTiers" :key="t.name" class="card card-lift teaser">
            <h3>{{ t.name }}</h3>
            <p class="teaser-price">
              {{ t.price }} <span class="muted">{{ t.unit }}</span>
            </p>
            <p class="muted teaser-note">{{ t.note }}</p>
          </div>
        </div>
        <div class="center teaser-cta">
          <RouterLink to="/pricing" class="btn btn-primary">See full pricing →</RouterLink>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section class="section services-section">
      <div class="container">
        <h2 class="center">What we <span class="text-gradient">offer</span></h2>
        <p class="center muted offer-sub">Pick your beat — there's a class for everyone.</p>
        <div class="grid services">
          <div v-for="s in services" :key="s.title" class="card card-lift service">
            <span class="service-emoji">{{ s.emoji }}</span>
            <h3>{{ s.title }}</h3>
            <p class="muted">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="cta-band">
      <div class="container cta-inner">
        <h2>Ready to move? 🎶</h2>
        <p>Book your first class today — your future, fitter, happier self will thank you.</p>
        <RouterLink to="/schedule" class="btn btn-tropical">Book a class</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Tighter vertical rhythm on the home page (overrides the global .section padding, scoped here). */
.section {
  padding: clamp(1.75rem, 3.5vw, 3rem) 0;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: clamp(2rem, 4.5vw, 3.5rem) 0;
}
.hero-inner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 2rem;
  align-items: center;
}
.kicker {
  display: inline-block;
  font-weight: 700;
  color: var(--c-pink-dark);
  background: rgba(255, 46, 99, 0.1);
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}
.hero-copy h1 {
  font-size: clamp(2.3rem, 5.5vw, 3.6rem);
  margin-bottom: 0.6rem;
}
.lede {
  font-size: 1.15rem;
  color: var(--c-ink-soft);
  max-width: 32rem;
}
.hero-cta {
  margin: 1.5rem 0;
  flex-wrap: wrap;
}
/* Themed outline on the white "Create an account" button (matches pricing + header buttons). */
.hero-cta .btn-ghost {
  border: 2px solid var(--c-pink);
  color: var(--c-pink-dark);
}
.hero-cta .btn-ghost:not(:disabled):hover {
  background: var(--c-pink);
  color: #fff;
}
.highlights {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
}
.highlight {
  display: flex;
  flex-direction: column;
}
.highlight strong {
  font-family: var(--font-display);
  font-size: 1.4rem;
  color: var(--c-pink-dark);
}
.hero-art {
  position: relative;
  height: 280px;
}
.blob {
  position: absolute;
  border-radius: 46% 54% 60% 40% / 50% 45% 55% 50%;
  filter: blur(2px);
  animation: float 7s ease-in-out infinite;
}
.blob-1 {
  width: 260px;
  height: 260px;
  background: var(--grad-samba);
  top: 20px;
  left: 30px;
  opacity: 0.9;
}
.blob-2 {
  width: 190px;
  height: 190px;
  background: var(--grad-tropical);
  bottom: 10px;
  right: 20px;
  animation-delay: -3s;
  opacity: 0.85;
}
.disco {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 7rem;
  animation: sway 3s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-18px) scale(1.04);
  }
}
@keyframes sway {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}
.offer-sub {
  margin-top: -0.4rem;
  margin-bottom: 1.5rem;
}
.services {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
.service {
  text-align: center;
}
.service-emoji {
  font-size: 2.6rem;
  display: block;
  margin-bottom: 0.5rem;
}
/* Pricing teaser */
.pricing-teaser .offer-sub {
  margin-top: -0.4rem;
  margin-bottom: 1.5rem;
}
.teaser-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-bottom: 1.5rem;
}
/* Subtle tint separates the two stacked sections without needing large gaps. */
.services-section {
  background: linear-gradient(180deg, rgba(255, 204, 41, 0.08), rgba(0, 194, 168, 0.06));
  border-radius: var(--radius);
}
.teaser {
  text-align: center;
}
.teaser h3 {
  margin: 0 0 0.4rem;
}
.teaser-price {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 2rem;
  margin: 0;
  color: var(--c-ink);
}
.teaser-price .muted {
  font-size: 1rem;
  font-weight: 600;
}
.teaser-note {
  margin: 0.25rem 0 0;
}
.teaser-cta {
  margin-top: 0.5rem;
}

.cta-band {
  position: relative;
  overflow: hidden;
  background: var(--grad-night);
  color: #fff;
  padding: clamp(2.5rem, 6vw, 4rem) 0;
  text-align: center;
}
/* Fade the diagonal into the footer's solid tone so there's no seam between the two dark sections. */
.cta-band::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 90px;
  background: linear-gradient(180deg, rgba(42, 26, 71, 0), var(--c-night-solid));
  pointer-events: none;
}
.cta-band .container {
  position: relative;
  z-index: 1;
}
.cta-band h2 {
  color: #fff;
  font-size: 2rem;
}
.cta-inner p {
  max-width: 32rem;
  margin: 0 auto 1.5rem;
  color: rgba(255, 255, 255, 0.85);
}

/* Small tablet / large phone: single column, art on top but shorter.
   (iPad portrait ≥768 keeps the nicer side-by-side hero.) */
@media (max-width: 760px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }
  .hero-art {
    height: 200px;
    order: -1;
  }
  .disco {
    font-size: 4.5rem;
  }
}

/* Phone: the decorative blob art dominates the screen and pushes content down — drop it and
   lead with the copy. Make the hero CTAs full-width for easy tapping. */
@media (max-width: 640px) {
  .hero {
    padding-top: 1.25rem;
  }
  .hero-art {
    display: none;
  }
  .hero-copy h1 {
    font-size: clamp(2rem, 8vw, 2.6rem);
  }
  .hero-cta {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-cta .btn {
    width: 100%;
  }
  .highlights {
    gap: 1.25rem 1.75rem;
  }
}
</style>
