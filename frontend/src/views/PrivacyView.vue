<script setup lang="ts">
// ---------------------------------------------------------------------------
// Boilerplate Privacy Policy. Bracketed [PLACEHOLDER] values are the
// business-specific bits to confirm. This is a starting template, not legal
// advice — have a professional review it (especially GDPR/CCPA specifics).
// ---------------------------------------------------------------------------
import { RouterLink } from 'vue-router';

const businessName = 'Zumba by Grasiele';
const contactEmail = 'grasi@zumbabygrasiele.com'; // [PLACEHOLDER] set your real contact email
const hostingRegion = 'the United States (AWS, us-east-1)'; // [PLACEHOLDER] match your AWS region
const lastUpdated = 'June 7, 2026';

type Block = { p: string } | { list: string[] } | { link: { to: string; text: string } };
interface Section {
  id: string;
  title: string;
  body: Block[];
}

const sections: Section[] = [
  {
    id: 'intro',
    title: 'Introduction',
    body: [
      {
        p: `This Privacy Policy explains how ${businessName} ("we", "us", "our") collects, uses, and protects your personal information when you use our website and book our Zumba® classes. We only collect what we need to run our classes, and we never sell your data.`,
      },
      {
        p: 'By using our website and services, you agree to the practices described in this policy. It works alongside our Terms & Conditions.',
      },
      { link: { to: '/terms', text: 'Read our Terms & Conditions →' } },
    ],
  },
  {
    id: 'collect',
    title: 'Information we collect',
    body: [
      { p: 'Information you give us when you create an account or book a class:' },
      {
        list: [
          'Your name',
          'Your email address',
          'Your date of birth',
          'A profile photo, if you choose to upload one',
          'Your password (stored only as a securely hashed value — we never see or store the plain text)',
        ],
      },
      { p: 'Information we collect automatically when you use the site:' },
      {
        list: [
          'A single essential session cookie that keeps you logged in.',
          'Basic technical log data (such as your IP address and browser type) used to keep the service secure and working.',
        ],
      },
      {
        p: 'Payment information: online payment is not yet available, so we do not collect or store card or bank details through the website. Payments are arranged directly with the instructor.',
      },
    ],
  },
  {
    id: 'use',
    title: 'How we use your information',
    body: [
      { p: 'We use your information to:' },
      {
        list: [
          'Create and manage your account.',
          'Take and manage your class bookings, and show you the classes you’ve booked.',
          'Show your profile photo back to you and, for class organisers, who is attending.',
          'Communicate with you about your account, bookings, and schedule changes.',
          'Keep our service secure and prevent misuse.',
          'Meet our legal obligations.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: [
      {
        p: 'We use a single, essential cookie to keep you signed in to your account. It is strictly necessary for the website to work and is not used for advertising. We do not currently use third-party advertising or analytics trackers.',
      },
    ],
  },
  {
    id: 'sharing',
    title: 'How we share your information',
    body: [
      {
        p: 'We do not sell your personal information. We share it only in these limited cases:',
      },
      {
        list: [
          'Service providers: we host our website and store data with Amazon Web Services (AWS), which processes data on our behalf under strict agreements.',
          'Legal reasons: if required by law, regulation, or valid legal process, or to protect the rights and safety of our participants.',
          'Business transfer: if our business is ever sold or reorganised, your information may be transferred as part of that change.',
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'How we store and protect your data',
    body: [
      {
        p: `Your information is stored on Amazon Web Services in ${hostingRegion}. We take security seriously:`,
      },
      {
        list: [
          'Passwords are protected with a strong one-way hashing algorithm — they are never stored in readable form.',
          'Data is encrypted at rest, and all traffic to and from the site is encrypted in transit (HTTPS).',
          'Profile photos are kept in private storage and are only accessible through short-lived, signed links.',
          'Access to personal data is limited to what is needed to run the classes.',
        ],
      },
      {
        p: 'No method of storage or transmission is 100% secure, but we work hard to protect your information using industry-standard measures.',
      },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep your data',
    body: [
      {
        p: 'We keep your account information for as long as your account is active. If you ask us to delete your account, we will remove your personal information, except where we need to keep certain records to meet legal or accounting obligations.',
      },
    ],
  },
  {
    id: 'rights',
    title: 'Your privacy rights',
    body: [
      {
        p: 'Depending on where you live, you may have rights over your personal information, including the right to:',
      },
      {
        list: [
          'Access the personal information we hold about you.',
          'Correct information that is inaccurate or incomplete.',
          'Delete your personal information.',
          'Object to or restrict certain uses of your information.',
          'Withdraw consent at any time, where we rely on consent.',
        ],
      },
      {
        p: `If you are in the EEA or UK, these rights arise under the GDPR. If you are a California resident, you have rights under the CCPA/CPRA, including the right not to be discriminated against for exercising them — and note that we do not sell your personal information. To exercise any of these rights, email us at ${contactEmail} and we will respond as required by law.`,
      },
    ],
  },
  {
    id: 'children',
    title: 'Children’s privacy',
    body: [
      {
        p: 'Our website is intended for users aged 16 and over. We do not knowingly collect personal information from children under this age. If you believe a child has provided us with personal information, please contact us and we will delete it.',
      },
    ],
  },
  {
    id: 'transfers',
    title: 'International data transfers',
    body: [
      {
        p: `Our service is hosted in ${hostingRegion}. If you access the site from outside that region, your information will be transferred to and processed there. By using the site, you understand that your information may be processed in a country with different data-protection laws than your own.`,
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: [
      {
        p: 'We may update this Privacy Policy from time to time. When we make material changes, we will post the updated policy here with a new effective date. Please check back periodically.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: [
      {
        p: `If you have questions about this Privacy Policy or how we handle your information, email us at ${contactEmail}. We’re happy to help. 💛`,
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
        <span class="kicker">🔒 Your privacy</span>
        <h1>Privacy <span class="text-gradient">Policy</span></h1>
        <p class="muted">Last updated: {{ lastUpdated }}</p>
        <p class="intro">
          We only collect what we need to run our classes, we keep it safe, and we never sell it.
          Here’s exactly how we handle your information. 💃
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
  scroll-margin-top: 90px;
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
