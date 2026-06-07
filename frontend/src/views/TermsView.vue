<script setup lang="ts">
// ---------------------------------------------------------------------------
// Boilerplate Terms & Conditions. The bracketed [PLACEHOLDER] values below are
// the business-specific bits to confirm (legal name, jurisdiction, contact).
// This is a starting template, not legal advice — have a professional review it.
// ---------------------------------------------------------------------------
const businessName = 'Grasi Zumba';
const contactEmail = 'hello@grasizumba.com'; // [PLACEHOLDER] set your real contact email
const governingLaw = '[your state / country]'; // [PLACEHOLDER] e.g. "the State of Florida, USA"
const cancelWindow = '2 hours'; // [PLACEHOLDER] cancellation cut-off before class start
const lastUpdated = 'June 7, 2026';

import { RouterLink } from 'vue-router';

type Block = { p: string } | { list: string[] } | { link: { to: string; text: string } };
interface Section {
  id: string;
  title: string;
  body: Block[];
}

const sections: Section[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of these terms',
    body: [
      {
        p: `Welcome to ${businessName}! These Terms & Conditions ("Terms") govern your use of our website and your participation in our Zumba® classes. By creating an account, booking a class, or attending a session, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, please do not use our services.`,
      },
    ],
  },
  {
    id: 'about',
    title: 'Who we are',
    body: [
      {
        p: `${businessName} offers Zumba® dance-fitness classes led by a licensed Zumba® instructor. In these Terms, "we", "us", and "our" mean ${businessName}, and "you" means the participant or website user.`,
      },
      {
        p: `Zumba® is a registered trademark of Zumba Fitness, LLC. Our instructor is independently licensed to teach the Zumba® program. ${businessName} is an independent business and is not owned, operated, or endorsed by Zumba Fitness, LLC.`,
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: [
      { p: 'To book classes you need an account. When you register, you agree to:' },
      {
        list: [
          'Provide accurate, current information (your name, email, and date of birth).',
          'Keep your password confidential and not share your account.',
          'Take responsibility for all activity that happens under your account.',
          'Notify us promptly of any unauthorized use of your account.',
        ],
      },
      {
        p: 'You must be at least 16 years old to create an account. Participants under 18 may need the consent of a parent or guardian to take part in classes.',
      },
    ],
  },
  {
    id: 'health',
    title: 'Health & safety',
    body: [
      {
        p: 'Zumba is a vigorous, physically demanding activity. Before participating, you should consult a healthcare professional — especially if you have a medical condition or injury, are pregnant or recently gave birth, or have not exercised in some time.',
      },
      { p: 'By taking part, you agree that you will:' },
      {
        list: [
          'Inform the instructor of any injuries, health conditions, pregnancy, or limitations before class.',
          'Exercise within your own limits and stop immediately if you feel unwell, dizzy, faint, or in pain.',
          'Wear appropriate athletic footwear and clothing and stay properly hydrated.',
        ],
      },
      {
        p: 'Our classes and any information we provide are for general fitness and are not a substitute for professional medical advice, diagnosis, or treatment.',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Assumption of risk & release of liability',
    body: [
      {
        p: 'You understand that physical activity carries inherent risks, including muscle strains and sprains, slips and falls, and in rare cases more serious injury. Your participation is voluntary, and you knowingly and freely assume all such risks.',
      },
      {
        p: `To the fullest extent permitted by law, you release and hold harmless ${businessName}, its instructor(s), and staff from any claims, liabilities, demands, or damages of any kind arising out of or related to your participation in our classes, except to the extent caused by our gross negligence or willful misconduct.`,
      },
    ],
  },
  {
    id: 'bookings',
    title: 'Bookings & reservations',
    body: [
      {
        p: 'Classes are booked through your account and are subject to availability and class capacity. Your place is confirmed only once the booking appears in your account. Where a class is full, you may not be able to book it.',
      },
    ],
  },
  {
    id: 'cancellations',
    title: 'Cancellations & no-shows',
    body: [
      {
        p: `You may cancel a booking through your account up to ${cancelWindow} before the class start time, which releases your place for someone else. Cancellations made later than this, and failure to attend a booked class ("no-shows"), may result in the loss of that class or class credit.`,
      },
      {
        p: 'We encourage you to cancel as early as possible so others can take your spot.',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & payment',
    body: [
      {
        p: 'Current prices are shown on our Pricing page and include single drop-in classes, multi-class packs, and a monthly unlimited subscription. Prices are in [USD] and may change from time to time; the price that applies is the one shown at the time of your purchase.',
      },
      {
        p: 'Online payment is not yet available. Payment is currently arranged directly with the instructor (for example, at the studio). Class packs are valid for 6 months from the date of purchase. The monthly subscription continues each month until cancelled, and you may cancel at any time, effective at the end of your current billing period.',
      },
    ],
  },
  {
    id: 'refunds',
    title: 'Refunds',
    body: [
      {
        p: 'Class packs and subscription fees are non-refundable except where required by law. If we cancel a class and cannot offer you a suitable alternative, we will provide a credit or refund for that class.',
      },
    ],
  },
  {
    id: 'schedule-changes',
    title: 'Changes to the schedule',
    body: [
      {
        p: 'We may occasionally need to reschedule, relocate, or cancel a class — for example due to illness, low attendance, or circumstances beyond our reasonable control. We will give you as much notice as we reasonably can and offer a credit or alternative where appropriate.',
      },
    ],
  },
  {
    id: 'conduct',
    title: 'Studio etiquette & conduct',
    body: [
      { p: 'To keep classes safe and fun for everyone, you agree to:' },
      {
        list: [
          'Arrive on time and follow the instructor’s guidance.',
          'Treat the instructor and fellow participants with respect.',
          'Refrain from harassing, disruptive, or unsafe behavior.',
        ],
      },
      {
        p: 'We may refuse or end participation for anyone whose conduct affects the safety or enjoyment of others.',
      },
    ],
  },
  {
    id: 'media',
    title: 'Photos & video',
    body: [
      {
        p: `We sometimes take photos or video during classes and events to promote ${businessName}. If you would prefer not to appear, please tell the instructor in writing and we will use reasonable efforts to accommodate your request.`,
      },
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: [
      {
        p: `All content on this website — including text, graphics, logos, and design — is owned by ${businessName} or its licensors and may not be copied, reproduced, or reused without our permission. Zumba® and related names and logos are trademarks of Zumba Fitness, LLC.`,
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    body: [
      {
        p: 'We collect and store the personal information you provide — such as your name, email address, date of birth, and profile photo — to manage your account and bookings. We handle your information with care and do not sell it. Our Privacy Policy explains exactly what we collect, how we use it, and your rights.',
      },
      { link: { to: '/privacy', text: 'Read our Privacy Policy →' } },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: [
      {
        p: `To the maximum extent permitted by law, ${businessName} will not be liable for any indirect, incidental, special, or consequential damages arising from your use of our website or participation in our classes. Our total liability for any claim relating to our services will not exceed the amount you paid us for the class or classes giving rise to the claim.`,
      },
    ],
  },
  {
    id: 'indemnity',
    title: 'Indemnification',
    body: [
      {
        p: `To the extent permitted by law, you agree to indemnify and hold harmless ${businessName} from any claims, losses, or expenses arising out of your breach of these Terms or your participation in our classes.`,
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: [
      {
        p: 'We may update these Terms from time to time. When we make material changes, we will post the updated Terms on this page with a new effective date. Your continued use of our services after changes take effect means you accept the updated Terms.',
      },
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: [
      {
        p: `These Terms are governed by the laws of ${governingLaw}, without regard to conflict-of-law principles, and any disputes will be subject to the courts of that jurisdiction.`,
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: [
      {
        p: `Have a question about these Terms? We’d love to hear from you — email us at ${contactEmail}.`,
      },
    ],
  },
];

function isList(b: Block): b is { list: string[] } {
  return 'list' in b;
}
function isLink(b: Block): b is { link: { to: string; text: string } } {
  return 'link' in b;
}
</script>

<template>
  <div class="section">
    <div class="container legal">
      <header class="legal-head">
        <span class="kicker">📜 The fine print</span>
        <h1>Terms &amp; <span class="text-gradient">Conditions</span></h1>
        <p class="muted">Last updated: {{ lastUpdated }}</p>
        <p class="intro">
          Please read these Terms carefully before using the {{ businessName }} website or joining a
          class. They keep things clear, fair, and safe for everyone on the dance floor. 💃
        </p>
      </header>

      <!-- Table of contents -->
      <nav class="toc card" aria-label="Contents">
        <ol>
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`">{{ s.title }}</a>
          </li>
        </ol>
      </nav>

      <!-- Sections -->
      <section v-for="(s, i) in sections" :id="s.id" :key="s.id" class="clause">
        <h2>{{ i + 1 }}. {{ s.title }}</h2>
        <template v-for="(block, bi) in s.body" :key="bi">
          <ul v-if="isList(block)">
            <li v-for="(item, li) in block.list" :key="li">{{ item }}</li>
          </ul>
          <p v-else-if="isLink(block)">
            <RouterLink :to="block.link.to" class="clause-link">{{ block.link.text }}</RouterLink>
          </p>
          <p v-else>{{ block.p }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.legal {
  max-width: 780px;
}
.legal-head {
  margin-bottom: 1.5rem;
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
.legal-head h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  margin-bottom: 0.25rem;
}
.intro {
  font-size: 1.1rem;
  color: var(--c-ink-soft);
  margin-top: 0.75rem;
}

/* Table of contents */
.toc {
  margin-bottom: 2.5rem;
}
.toc ol {
  margin: 0;
  padding-left: 1.25rem;
  columns: 2;
  column-gap: 2rem;
}
.toc li {
  margin-bottom: 0.4rem;
  break-inside: avoid;
}
.toc a {
  color: var(--c-ink);
  font-weight: 500;
}
.toc a:hover {
  color: var(--c-pink-dark);
}

/* Clauses */
.clause {
  margin-bottom: 2rem;
  scroll-margin-top: 90px; /* clears the sticky header on anchor jumps */
}
.clause h2 {
  font-size: 1.4rem;
  margin-bottom: 0.6rem;
}
.clause p {
  color: var(--c-ink-soft);
  line-height: 1.75;
  margin: 0 0 0.75rem;
}
.clause ul {
  color: var(--c-ink-soft);
  line-height: 1.7;
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
}
.clause li {
  margin-bottom: 0.4rem;
}
.clause-link {
  font-weight: 700;
}

@media (max-width: 560px) {
  .toc ol {
    columns: 1;
  }
}
</style>
