# @grasi/api

Node.js + TypeScript API for Grasi Zumba, built with [Hono](https://hono.dev) and deployed as a
single AWS Lambda behind API Gateway (HTTP API). Data lives in a single DynamoDB table.

## Local development

DynamoDB and S3 both run locally via LocalStack — see the [root README](../README.md#getting-started).
In short, from the repo root:

```bash
cp api/.env.example api/.env   # local defaults already target LocalStack
npm run up                     # LocalStack: creates the table + bucket automatically
npm run dev:api                # esbuild watch on http://localhost:8787
```

The table, GSI, TTL, S3 bucket, and CORS are created by
[`docker/localstack-init.sh`](../docker/localstack-init.sh), which mirrors the Terraform schema.

The frontend dev server proxies `/api` to `http://localhost:8787`, so the browser sees a single
origin (cookies + CSRF "just work").

> The dev server is bundled with **esbuild** rather than `tsx` (see `esbuild.dev.mjs`) — no
> Node-version-sensitive loader hooks, so it runs on any Node ≥ 18.

## Architecture

| Concern         | Where                                  |
| --------------- | -------------------------------------- |
| Lambda entry    | `src/index.ts` → `handler`             |
| App + routing   | `src/app.ts` (Hono)                    |
| Local server    | `src/local.ts`                         |
| DynamoDB access | `src/domain/*` (one module per entity) |
| Key design      | `src/lib/keys.ts`                      |
| Auth primitives | `src/lib/password.ts`, `tokens.ts`     |

## Build

```bash
npm run build:api    # esbuild → dist/index.mjs (handler: index.handler)
```

Terraform zips `dist/` into the Lambda package — see [`../terraform`](../terraform).

## Routes

| Method | Path                                     | Auth   |
| ------ | ---------------------------------------- | ------ |
| GET    | `/api/health`                            | public |
| POST   | `/api/auth/register`                     | public |
| POST   | `/api/auth/login`                        | public |
| POST   | `/api/auth/logout`                       | public |
| GET    | `/api/auth/me`                           | user   |
| GET    | `/api/classes`                           | public |
| GET    | `/api/classes/:id`                       | public |
| POST   | `/api/classes/:id/book`                  | user   |
| DELETE | `/api/classes/:id/book`                  | user   |
| GET    | `/api/me/bookings`                       | user   |
| PATCH  | `/api/me`                                | user   |
| POST   | `/api/me/password`                       | user   |
| POST   | `/api/me/avatar/presign`                 | user   |
| POST   | `/api/me/avatar/confirm`                 | user   |
| GET    | `/api/admin/customers`                   | admin  |
| GET    | `/api/admin/customers/:id`               | admin  |
| POST   | `/api/admin/customers/:id/notes`         | admin  |
| DELETE | `/api/admin/customers/:id/notes/:noteId` | admin  |
| GET    | `/api/admin/signups`                     | admin  |
| POST   | `/api/admin/classes`                     | admin  |
| GET    | `/api/admin/classes/:id/roster`          | admin  |
