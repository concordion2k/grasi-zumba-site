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
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="kicker">💃 Dance. Sweat. Smile. Repeat.</span>
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
          <div class="disco">💃</div>
        </div>
      </div>
    </section>

    <!-- Services -->
    <section class="section">
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
.hero {
  position: relative;
  overflow: hidden;
  padding: clamp(2.5rem, 7vw, 5.5rem) 0;
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
.highlights {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
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
  height: 340px;
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
  margin-bottom: 2rem;
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
.cta-band {
  background: var(--grad-night);
  color: #fff;
  padding: clamp(2.5rem, 6vw, 4rem) 0;
  text-align: center;
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

@media (max-width: 820px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }
  .hero-art {
    height: 220px;
    order: -1;
  }
  .disco {
    font-size: 5rem;
  }
}
</style>
