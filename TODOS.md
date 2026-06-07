# TODOs — decisions & placeholders to fill in

A running list of things we still need to **decide**, **fill in**, or **build** before (and after)
launch. Last updated: **2026-06-07**.

Legend: 🔴 blocker for launch · 🟡 important · 🟢 nice-to-have / later

---

## 1. Domain & DNS 🔴

No web domain has been chosen yet — this blocks several things below (HTTPS custom URL + email
deliverability).

- [ ] **Choose & register a domain** (e.g. `grasizumba.com`).
- [ ] Request an **ACM certificate in `us-east-1`** for CloudFront.
- [ ] Add **CloudFront aliases + `viewer_certificate`** (placeholders already noted in
      [`terraform/cloudfront.tf`](terraform/cloudfront.tf)).
- [ ] Create **Route 53** (or registrar) DNS records pointing at CloudFront.
- [ ] Set the **`frontend_origin`** Terraform variable to the real domain
      ([`terraform/variables.tf`](terraform/variables.tf)).

---

## 2. Legal pages — fill placeholders & get reviewed 🟡

Both legal pages are **boilerplate, not legal advice** — have a professional review them.

- [ ] **Get Terms & Privacy reviewed by a lawyer** (esp. liability release + GDPR/CCPA wording).
- [x] `contactEmail` — real address (currently `hello@grasizumba.com` placeholder) in
      [`TermsView.vue`](frontend/src/views/TermsView.vue) **and**
      [`PrivacyView.vue`](frontend/src/views/PrivacyView.vue). - updated to `grasi@zumbabygrasiele.com`
- [ ] `governingLaw` — set jurisdiction (currently `[your state / country]`) in `TermsView.vue`.
- [ ] `cancelWindow` — confirm cancellation cut-off (currently `2 hours`) in `TermsView.vue`.
- [ ] `hostingRegion` — confirm (currently "United States (AWS, us-east-1)") in `PrivacyView.vue`.
- [ ] Confirm the **minimum age** (currently 16) on both pages.
- [ ] Replace inline `[USD]` currency placeholder in Terms §8.

---

## 3. Pricing & payments 🟡

- [ ] **Reconcile the monthly price** — `PricingView.vue` currently shows **$199/mo**, but the home
      page teaser ([`HomeView.vue`](frontend/src/views/HomeView.vue)) still says **$99/mo**. Pick one
      and sync both.
- [ ] Confirm final **package prices** (5=$70, 10=$130, 20=$240) and **pack expiry** (6 months).
- [ ] Confirm accepted **payment methods** (copy currently mentions cash / card / PIX).
- [ ] **Online payment / Stripe integration** (deferred). Currently all purchase buttons route to
      `/payment-coming-soon`. Scope when ready:
  - [ ] Pick processor (Stripe likely).
  - [ ] Checkout flow for packs (one-time) + monthly subscription.
  - [ ] Webhooks → record entitlements in DynamoDB (class credits, subscription status).
  - [ ] Enforce credits/subscription at booking time.
  - [ ] Refund handling per the Refunds policy.

---

## 4. Email 🟡 (tabled — see analysis from 2026-06-07)

- [ ] **Decide email provider/strategy:** Amazon SES (AWS-native, Terraform, own-your-data) vs
      Resend (best DX) vs a marketing platform (MailerLite/Brevo/Mailchimp for self-serve campaigns).
- [ ] **Decide who sends marketing emails** — Dan (in-app on SES) vs Grasi (marketing-platform UI).
- [ ] Transactional **welcome email** on signup (trigger from
      [`api/src/routes/auth.ts`](api/src/routes/auth.ts), ideally async via SQS/EventBridge).
- [ ] Booking confirmation / cancellation / class-reminder emails.
- [ ] **Marketing consent checkbox** at signup + store `marketingOptIn` on the user record.
- [ ] **Unsubscribe** handling (token link + `unsubscribed` flag) for any broadcast email.
- [ ] Email **deliverability**: SPF + DKIM + DMARC (requires the domain above).
- [ ] If SES: request **production access** (out of sandbox) + bounce/complaint suppression
      (SNS → Lambda).

---

## 5. Auth & admin 🟡

- [ ] Set **`ADMIN_BOOTSTRAP_EMAILS`** for real admins — locally in
      [`api/.env`](api/.env.example) and in prod via the `admin_bootstrap_emails` Terraform var.
  - Note: `concordion@mac.com` was made admin via a direct local DynamoDB edit, which **won't
    survive** a `npm run reset`. Use the bootstrap list to make it stick.
- [ ] **Password reset flow** — not implemented yet.
- [ ] (Optional) In-app **"promote user to admin"** admin endpoint + button (offered, not built).
- [ ] (Optional) Upgrade password hashing from **scrypt → argon2id** (documented path in
      [`api/src/lib/password.ts`](api/src/lib/password.ts) / [`SECURITY.md`](SECURITY.md)).

---

## 6. Infrastructure & deployment 🔴/🟡

- [ ] 🔴 **Re-authenticate AWS** (`aws sso login` / equivalent — the CLI session was expired at setup).
- [ ] 🔴 **GitHub repo + remote** — not created yet (no remote configured).
- [ ] 🔴 **Remote Terraform state**: create the state bucket + lock table, enable the `backend "s3"`
      block in [`terraform/versions.tf`](terraform/versions.tf), and add `terraform/backend.hcl`
      (see [`backend.hcl.example`](terraform/backend.hcl.example)).
- [ ] 🔴 **CI/CD secret**: set `AWS_DEPLOY_ROLE_ARN` (GitHub OIDC role) for the deploy workflow
      ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).
- [ ] First **`terraform apply`** (build the API first: `npm run build:api`).
- [ ] 🟡 Tighten the **uploads bucket CORS** from `["*"]` to the real domain
      ([`terraform/s3_uploads.tf`](terraform/s3_uploads.tf)).
- [ ] 🟡 Review **`npm audit`** findings before launch.
- [ ] 🟢 Upgrade host **Node to ≥ 20.9** (currently 20.0.0 — causes tooling warnings; `tsx` hangs,
      which is why the dev runner uses esbuild).

---

## 7. Content & brand 🟡

- [ ] Add the **real class schedule** (via the admin studio).
- [ ] Real **services** copy, **photos**, and an **About / instructor bio** (Grasi's story, Rio, etc.).
- [ ] **Logo & favicon** (currently emoji-based placeholders).
- [ ] **Contact** details / a contact page (none yet).
- [ ] **Social media** links in the footer.

---

## 8. Feature backlog 🟢

- [ ] Online payments (Stripe) — see §3.
- [ ] Email (welcome + broadcasts) — see §4.
- [ ] Password reset — see §5.
- [ ] Class **waitlists** (join a waitlist when a class is full).
- [ ] **Calendar export** (`.ics`) / "add to calendar".
- [ ] Admin: **edit / cancel** existing classes (currently create-only), edit notes.
- [ ] Cookie notice (we only use one essential session cookie — a one-line notice may suffice).
- [ ] Signup **rate limiting / CAPTCHA** to deter abuse.

---

> Tip: keep this file current as decisions land — it's the single source of truth for "what's left."
