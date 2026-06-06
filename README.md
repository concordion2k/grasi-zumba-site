# Grasi Zumba 💃🇧🇷

Customer-facing website for **Grasi's Zumba** — a licensed Zumba instructor from Rio de Janeiro.
Energetic, fun, and full of Brazilian flare. Book classes, manage your profile, and (for admins)
run the whole show from a built-in CRM.

## Stack

| Layer        | Tech                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Frontend** | Vue 3 + TypeScript (Vite, `<script setup>`, Pinia, Vue Router, FullCalendar)                  |
| **API**      | Node.js + TypeScript on AWS Lambda + API Gateway (HTTP API), via [Hono](https://hono.dev)     |
| **Data**     | DynamoDB (single-table design)                                                                |
| **Auth**     | Self-managed — scrypt password hashing, server-side sessions (DynamoDB TTL), httpOnly cookies |
| **Uploads**  | S3 (private) + presigned URLs for profile pictures                                            |
| **Infra**    | Terraform (AWS)                                                                               |
| **CI/CD**    | GitHub Actions                                                                                |

## Repository layout

```
.
├── shared/      # @grasi/shared — TS domain types shared by api + frontend
├── api/         # Node/TS Lambda API (Hono router)
├── frontend/    # Vue 3 SPA
├── terraform/   # AWS infrastructure as code
└── .github/     # CI + deploy workflows
```

This is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo. The root
`package.json` orchestrates per-workspace scripts.

## Getting started

The whole backend (DynamoDB **and** S3) runs locally via [LocalStack](https://localstack.cloud) in
Docker, so local dev exercises the same code paths as production — including presigned avatar uploads.

```bash
npm install                 # installs all workspaces
cp api/.env.example api/.env # local defaults already point at LocalStack — works as-is

# Recommended loop: backend in Docker, apps on the host (fastest HMR)
npm run up                  # starts LocalStack, creates the table + bucket, waits until ready
npm run dev                 # runs the API + frontend together → http://localhost:5173
```

Open http://localhost:5173. Register with `admin@example.com` (configured as an admin in
`api/.env`) to see the admin studio. When you're done: `npm run down` (or `npm run reset` to also
wipe local data).

### Everything in Docker (one command)

Prefer not to run Node on the host? Bring the API and frontend up in containers too:

```bash
npm run up:all              # LocalStack + API + frontend, all in Docker
```

### Useful root scripts

| Script              | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run up`        | Start LocalStack (DynamoDB + S3) and wait until ready |
| `npm run up:all`    | Start the full stack (LocalStack + API + frontend)    |
| `npm run dev`       | Run the API + frontend on the host (concurrently)     |
| `npm run down`      | Stop the Docker stack                                 |
| `npm run reset`     | Stop the stack and delete local data volumes          |
| `npm run build`     | Build shared → api → frontend                         |
| `npm run typecheck` | Type-check every workspace                            |
| `npm run lint`      | ESLint across the repo                                |
| `npm run format`    | Prettier write                                        |
| `npm test`          | Run all workspace tests                               |

> **Node version:** the dev API runner uses `esbuild` (not `tsx`), so it works on any Node ≥ 18 —
> including older 20.x point releases. Node ≥ 20.9 is still recommended to silence tooling warnings.

## Deployment

Infrastructure is defined in [`terraform/`](./terraform). CI/CD lives in
[`.github/workflows/`](./.github/workflows). See [`terraform/README.md`](./terraform/README.md)
for the bootstrap (remote state) and first-apply steps.

> **Heads up:** the AWS CLI session on this machine was expired at setup time — run your AWS SSO/login
> before `terraform apply` or any deploy. No web domain has been chosen yet; CloudFront serves a
> default `*.cloudfront.net` domain until one is configured.

## Security posture

- All customer data lives in **your** DynamoDB table — no third-party identity store.
- Passwords hashed with `scrypt` (memory-hard, Node built-in). Argon2id is a documented upgrade path.
- Sessions are opaque random tokens stored server-side with TTL — fully revocable.
- Cookies are `HttpOnly` + `Secure` + `SameSite=Lax`; state-changing routes are CSRF-protected.
- Overbooking is prevented with DynamoDB atomic conditional writes.

See [`SECURITY.md`](./SECURITY.md) for details.
