<script setup lang="ts">
import { ref } from 'vue';
import { contactApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';

// NOTE: placeholder bio — Grasi to replace with her real story (and a photo).
const name = ref('');
const email = ref('');
const message = ref('');
const company = ref(''); // honeypot — must stay empty
const sending = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  sending.value = true;
  try {
    await contactApi.send({
      name: name.value,
      email: email.value,
      message: message.value,
      company: company.value,
    });
    sent.value = true;
  } catch (e) {
    error.value =
      e instanceof ApiRequestError ? e.message : 'Could not send your message — please try again.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="section">
    <div class="container contact">
      <!-- Story -->
      <section class="story">
        <span class="kicker">🌴 Meet Grasi</span>
        <h1>Olá, I'm <span class="text-gradient">Grasiele</span></h1>
        <div class="avatar" aria-hidden="true">💃🏽</div>
        <p>
          Born and raised in <strong>Rio de Janeiro</strong>, I grew up with samba in my feet and
          the ocean at my doorstep. Dance was never exercise to me — it was joy, community, and the
          way we celebrate life. <em>[Placeholder — Grasi's real story goes here.]</em>
        </p>
        <p>
          As a <strong>licensed Zumba® instructor</strong>, I bring that Brazilian energy to every
          class: big smiles, infectious rhythms, and a room full of people who leave feeling lighter
          than when they walked in. Whether you've danced your whole life or have two left feet,
          there's a place for you on my floor.
        </p>
        <p>
          Curious about classes, private sessions, or events? Send me a message — I'd love to hear
          from you before you sign up. <strong>Vem dançar!</strong> 🇧🇷
        </p>
      </section>

      <!-- Form -->
      <section class="card form-card">
        <div v-if="sent" class="sent">
          <div class="sent-emoji">🎉</div>
          <h2>Message sent!</h2>
          <p class="muted">Obrigada for reaching out — I'll get back to you soon. 💛</p>
          <RouterLink to="/schedule" class="btn btn-primary">See the schedule →</RouterLink>
        </div>

        <form v-else @submit.prevent="submit">
          <h2>Get in touch</h2>
          <p class="muted intro">Have a question before joining? Drop me a note.</p>

          <div v-if="error" class="alert alert-error">{{ error }}</div>

          <div class="field">
            <label for="cname">Your name</label>
            <input
              id="cname"
              v-model="name"
              type="text"
              autocomplete="name"
              required
              maxlength="100"
            />
          </div>
          <div class="field">
            <label for="cemail">Email</label>
            <input id="cemail" v-model="email" type="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="cmsg">Message</label>
            <textarea id="cmsg" v-model="message" rows="5" required maxlength="4000"></textarea>
          </div>

          <!-- Honeypot: hidden from real users; bots tend to fill it -->
          <div class="hp" aria-hidden="true">
            <label for="company">Company</label>
            <input id="company" v-model="company" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <button class="btn btn-primary full" :disabled="sending" type="submit">
            {{ sending ? 'Sending…' : 'Send message 💌' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.contact {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 2rem;
  align-items: start;
}
.kicker {
  display: inline-block;
  font-weight: 700;
  color: var(--c-pink-dark);
  background: rgba(255, 46, 99, 0.1);
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}
.story h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  margin-bottom: 0.75rem;
}
.avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 3.2rem;
  background: var(--grad-tropical);
  box-shadow: var(--shadow-md);
  margin-bottom: 1rem;
}
.story p {
  line-height: 1.75;
  color: var(--c-ink-soft);
  margin: 0 0 1rem;
}
.form-card {
  position: sticky;
  top: 90px;
}
.form-card h2 {
  margin: 0 0 0.25rem;
}
.intro {
  margin: 0 0 1.25rem;
}
.full {
  width: 100%;
  margin-top: 0.25rem;
}
.sent {
  text-align: center;
  padding: 1.5rem 0;
}
.sent-emoji {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
/* Honeypot — visually hidden but present in the DOM for bots */
.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 820px) {
  .contact {
    grid-template-columns: minmax(0, 1fr);
  }
  .form-card {
    position: static;
  }
}
</style>
