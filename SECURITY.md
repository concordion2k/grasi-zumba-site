# Security

We manage customer data ourselves, so security is a first-class concern. This document records the
choices we've made and the things to keep an eye on.

## Authentication & sessions

- **Password hashing:** `scrypt` via Node's built-in `crypto` (`N=2^15, r=8, p=1`), 16-byte random
  salt, constant-time comparison (`crypto.timingSafeEqual`). No native dependencies → clean Lambda
  bundles. **Upgrade path:** swap `lib/password.ts` for `@node-rs/argon2` (argon2id, prebuilt arm64
  binaries) if/when we want the OWASP-preferred KDF. The interface is isolated for exactly this.
- **Sessions:** opaque 256-bit random tokens (`crypto.randomBytes(32)`). Only a SHA-256 **hash** of
  the token is stored in DynamoDB, with a TTL attribute for automatic expiry. Sessions are
  server-side and revocable (logout deletes the item; "log out everywhere" deletes all of a user's
  session items).
- **Cookies:** the session token is delivered as `HttpOnly; Secure; SameSite=Lax; Path=/`. JS can
  never read it, so XSS can't exfiltrate the session.

## CSRF

`SameSite=Lax` blocks cross-site cookie sending for the dangerous cases. As defense-in-depth, all
state-changing requests (POST/PUT/PATCH/DELETE) must send an `X-Requested-With: fetch` header, which
cross-origin form posts cannot set without a CORS preflight we don't allow.

## Authorization

- Every user has a `role` of `customer` or `admin`. Admin-only routes are gated by middleware that
  re-reads the role from the session's user record (never trusts a client claim).
- Admin bootstrap: the first admin is provisioned by setting `ADMIN_BOOTSTRAP_EMAILS` (comma list)
  in the Lambda environment — matching emails are auto-promoted to `admin` on registration/login.
  Rotate/remove after onboarding.

## Input validation

All request bodies are validated with [Zod](https://zod.dev) at the route boundary. Invalid input is
rejected with a 400 before touching the database.

## Secrets

- A `SESSION_SECRET` (HMAC pepper for token hashing) is stored in AWS SSM Parameter Store
  (SecureString) and injected into the Lambda. It is **not** committed.
- No secrets in the repo. `.env` files are git-ignored; `.env.example` documents the shape only.

## Data protection

- DynamoDB table uses AWS-managed encryption at rest (SSE) and point-in-time recovery.
- The profile-picture S3 bucket is private (all public access blocked); uploads/downloads go through
  short-lived presigned URLs scoped to the user's own key prefix.
- TLS everywhere (CloudFront + API Gateway are HTTPS-only).

## Reporting

This is a private project. If you find an issue, open a private note to the maintainers rather than a
public issue.
