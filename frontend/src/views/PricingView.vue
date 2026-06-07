<script setup lang="ts">
import { RouterLink } from 'vue-router';

const perClass = 15;

interface Pack {
  classes: number;
  price: number;
  save: number;
  popular?: boolean;
}

const packs: Pack[] = [
  { classes: 5, price: 70, save: 5 },
  { classes: 10, price: 130, save: 20, popular: true },
  { classes: 20, price: 240, save: 60 },
];

const monthly = { price: 199 };

const perClassRate = (p: Pack) => Math.round(p.price / p.classes);

const faqs = [
  {
    q: 'How do I pay?',
    a: 'Reserve your spot online, then pay Grasi directly at the studio. Online checkout for packs and subscriptions is coming soon!',
  },
  {
    q: 'Do class packs expire?',
    a: 'Packs are valid for 6 months from purchase — plenty of time to use every class.',
  },
  {
    q: 'Can I cancel the monthly plan?',
    a: 'Yes — the monthly subscription is flexible and you can cancel anytime, no contracts.',
  },
  {
    q: 'New to Zumba?',
    a: 'Start with a single drop-in class. All levels are welcome and no experience is needed!',
  },
];
</script>

<template>
  <div>
    <!-- Header -->
    <section class="pricing-hero">
      <div class="container center">
        <span class="kicker">💸 Simple, fair pricing</span>
        <h1>Choose how you <span class="text-gradient">dance</span></h1>
        <p class="lede">
          Drop in whenever you like, save with a class pack, or go all-in with unlimited classes.
          Every option is just you, the music, and a great workout. 🎶
        </p>
      </div>
    </section>

    <!-- Tier 1: Drop-in -->
    <section class="section">
      <div class="container">
        <div class="tier-label">
          <span class="tier-num">1</span>
          <div>
            <h2>Drop-in</h2>
            <p class="muted">
              Pay as you go — perfect for your first class or the occasional boogie.
            </p>
          </div>
        </div>

        <div class="card card-lift dropin">
          <div class="dropin-price">
            <span class="amount">${{ perClass }}</span>
            <span class="per">/ class</span>
          </div>
          <div class="dropin-copy">
            <h3>Single class</h3>
            <p class="muted">One class, one payment. No commitment, all the fun.</p>
          </div>
          <RouterLink to="/schedule" class="btn btn-primary">Book a class</RouterLink>
        </div>
      </div>
    </section>

    <!-- Tier 2: Packs -->
    <section class="section section-tint">
      <div class="container">
        <div class="tier-label">
          <span class="tier-num">2</span>
          <div>
            <h2>Class packs</h2>
            <p class="muted">
              Buy in bulk and save — the more you commit, the less you pay per class.
            </p>
          </div>
        </div>

        <div class="grid packs">
          <article
            v-for="p in packs"
            :key="p.classes"
            class="card card-lift pack"
            :class="{ popular: p.popular }"
          >
            <span v-if="p.popular" class="popular-badge">⭐ Most popular</span>
            <h3>{{ p.classes }} classes</h3>
            <div class="pack-price">
              <span class="amount">${{ p.price }}</span>
            </div>
            <p class="rate">${{ perClassRate(p) }} <span class="muted">/ class</span></p>
            <span class="pill pill-green">Save ${{ p.save }}</span>
            <ul class="perks">
              <li>✓ {{ p.classes }} classes to use anytime</li>
              <li>✓ Valid for 6 months</li>
              <li>✓ Book any class on the calendar</li>
            </ul>
            <RouterLink
              :to="{ name: 'payment-coming-soon', query: { plan: `${p.classes}-class pack` } }"
              class="btn"
              :class="p.popular ? 'btn-primary' : 'btn-ghost'"
            >
              Get this pack
            </RouterLink>
          </article>
        </div>
      </div>
    </section>

    <!-- Tier 3: Monthly -->
    <section class="section">
      <div class="container">
        <div class="tier-label">
          <span class="tier-num">3</span>
          <div>
            <h2>Monthly unlimited</h2>
            <p class="muted">For the regulars — dance as much as you want, every single day.</p>
          </div>
        </div>

        <div class="monthly card-lift">
          <div class="monthly-left">
            <span class="pill pill-pink">Best for regulars</span>
            <h3>Unlimited classes</h3>
            <p>Come to every class, every week. The more you dance, the more you save. 💃🔥</p>
            <ul class="perks perks-light">
              <li>✓ Unlimited classes every month</li>
              <li>✓ Priority booking on popular classes</li>
              <li>✓ Cancel anytime — no contracts</li>
            </ul>
          </div>
          <div class="monthly-right">
            <div class="monthly-price">
              <span class="amount">${{ monthly.price }}</span>
              <span class="per">/ month</span>
            </div>
            <p class="monthly-hint">
              ≈ {{ Math.round(monthly.price / perClass) }} classes pays for itself
            </p>
            <RouterLink
              :to="{ name: 'payment-coming-soon', query: { plan: 'Monthly unlimited' } }"
              class="btn btn-tropical"
            >
              Go unlimited
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section section-tint">
      <div class="container">
        <h2 class="center">Good to <span class="text-gradient">know</span></h2>
        <div class="grid faqs">
          <div v-for="f in faqs" :key="f.q" class="card faq">
            <h4>{{ f.q }}</h4>
            <p class="muted">{{ f.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-band">
      <div class="container center">
        <h2>Vamos dançar? 🎉</h2>
        <p>Pick your plan and join the party — your first class is just a tap away.</p>
        <div class="row cta-row">
          <RouterLink to="/schedule" class="btn btn-primary">See the schedule</RouterLink>
          <RouterLink to="/register" class="btn btn-ghost">Create an account</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing-hero {
  padding: clamp(2.5rem, 6vw, 4.5rem) 0 1rem;
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
.pricing-hero h1 {
  font-size: clamp(2.2rem, 5.5vw, 3.4rem);
}
.lede {
  font-size: 1.15rem;
  color: var(--c-ink-soft);
  max-width: 40rem;
  margin: 0.5rem auto 0;
}
.section-tint {
  background: linear-gradient(180deg, rgba(255, 204, 41, 0.08), rgba(0, 194, 168, 0.06));
}

/* Tier label */
.tier-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.75rem;
}
.tier-num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--grad-samba);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  box-shadow: var(--shadow-md);
}
.tier-label h2 {
  margin: 0;
}
.tier-label p {
  margin: 0;
}

/* Amount typography */
.amount {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 3rem;
  line-height: 1;
  color: var(--c-ink);
}
.per {
  font-weight: 600;
  color: var(--c-ink-soft);
  margin-left: 0.25rem;
}

/* Drop-in */
.dropin {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}
.dropin-price {
  display: flex;
  align-items: baseline;
}
.dropin-copy {
  flex: 1;
  min-width: 200px;
}
.dropin-copy h3 {
  margin: 0 0 0.25rem;
}

/* Packs */
.packs {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  align-items: stretch;
}
.pack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
  position: relative;
}
.pack h3 {
  margin: 0;
}
.pack .pack-price {
  display: flex;
  align-items: baseline;
}
.rate {
  margin: 0;
  font-weight: 700;
  font-size: 1.1rem;
}
.pack.popular {
  border: 2px solid var(--c-pink);
  box-shadow: var(--shadow-md);
}
.popular-badge {
  position: absolute;
  top: -13px;
  right: 1.25rem;
  background: var(--grad-samba);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
}
.perks {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: var(--c-ink-soft);
  font-size: 0.95rem;
}
.pack .btn {
  margin-top: auto;
  width: 100%;
}

/* Monthly */
.monthly {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 0;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.monthly-left {
  background: var(--grad-night);
  color: #fff;
  padding: 2rem;
}
.monthly-left h3 {
  color: #fff;
  font-size: 1.6rem;
  margin: 0.6rem 0 0.5rem;
}
.monthly-left p {
  color: rgba(255, 255, 255, 0.85);
}
.perks-light {
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 0;
}
.monthly-right {
  background: var(--c-card);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}
.monthly-price {
  display: flex;
  align-items: baseline;
}
.monthly-price .amount {
  font-size: 3.4rem;
}
.monthly-hint {
  margin: 0 0 0.5rem;
  color: var(--c-ink-soft);
  font-size: 0.9rem;
}
.monthly-right .btn {
  width: 100%;
}

/* FAQ */
.faqs {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin-top: 1.5rem;
}
.faq h4 {
  margin: 0 0 0.4rem;
}
.faq p {
  margin: 0;
}

/* CTA */
.cta-band {
  background: var(--grad-night);
  color: #fff;
  padding: clamp(2.5rem, 6vw, 4rem) 0;
}
.cta-band h2 {
  color: #fff;
  font-size: 2rem;
}
.cta-band p {
  max-width: 32rem;
  margin: 0 auto 1.5rem;
  color: rgba(255, 255, 255, 0.85);
}
.cta-row {
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .monthly {
    grid-template-columns: 1fr;
  }
}
</style>
