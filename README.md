# Detention Recover AI

> **No Recovery, No Fee.** Recover unpaid detention, layover, and TONU charges from freight brokers using AI-assisted negotiation.

Detention Recover AI is an **internal operating system** for a single admin (the founder). Trucking companies never log in — they interact only through the landing page and email. The mission is to reduce founder workload by 95% by having AI draft almost everything and letting the founder review only the important actions.

## Tech stack

| Layer     | Choice |
| --------- | ------ |
| Frontend  | React · Vite · TypeScript · TailwindCSS · shadcn/ui |
| Data      | React Query · React Hook Form · Zod |
| Backend   | **Supabase** (Postgres + RLS, Auth, Edge Functions) — free tier |
| Email     | Resend (outbound + inbound webhook) |
| Messaging | Disabled for now (SMS/WhatsApp off) |
| Charts    | Recharts · date-fns · Lucide |

The app ships with a **fully functional mock backend** (`VITE_DATA_BACKEND=mock`) so it runs and demos with zero external services or cost. Set `VITE_DATA_BACKEND=supabase` (plus your Supabase URL/anon key) to run against a real, free Supabase backend — see the step-by-step guide in **[`DEPLOY_TR.md`](./DEPLOY_TR.md)**.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — mock mode needs nothing
npm run dev
```

| Script              | Purpose |
| ------------------- | ------- |
| `npm run dev`       | Start the dev server |
| `npm run build`     | Type-check + production build |
| `npm run typecheck` | Type-check only |
| `npm run lint`      | ESLint |
| `npm run test`      | Vitest unit/integration tests |

## Design system

A **Dark Asphalt** theme inspired by Stripe, Linear, Notion, Vercel, and Mercury with an industrial trucking aesthetic. Color usage is strict:

- **Amber** — CTAs, highlights, primary actions only
- **Green** — success, recovered, paid only
- **Red** — denied, errors only
- **Gray** — everything else

Typography: Barlow Semi Condensed (display), Inter (body), IBM Plex Mono (data).

## Architecture

Feature-based structure. Each domain owns its components, hooks, and services.

```
src/
  app/          # providers, router, theme
  components/
    ui/         # shadcn primitives
    shared/     # cross-feature components
  config/       # env, routes, constants
  features/     # marketing, auth, dashboard, loads, claims, …
  hooks/        # reusable hooks
  lib/          # utils, formatters, query client
  pages/        # route entry points
  styles/       # global CSS + theme tokens
```

## Roadmap (milestones)

- [x] **M0** — Foundation & design system
- [x] **M1** — Landing page (conversion-optimized, SEO)
- [x] **M2** — Auth & admin app shell (command palette, RBAC)
- [x] **M3** — Data layer, seeded mock backend & business logic
- [x] **M4** — Dashboard (KPIs, charts, AI recommendations)
- [x] **M5** — Loads, Claims, Claim detail (AI writer, settlement, PDF)
- [x] **M6** — Case leads, Recovery inbox, Broker intelligence, Follow-ups
- [x] **M7** — Documents, Analytics, Settings, Profile
- [x] **M8** — Supabase backend, integrations, tests, polish

## Deploy free on GitHub Pages (mock backend, no cost)

The app is fully functional on its own — it runs against an in-browser mock
backend (data persists in `localStorage`), so **no external services, secrets,
or paid plans are needed**. A GitHub Actions workflow builds and publishes it to
GitHub Pages automatically.

**One-time setup:**

1. Merge this branch into `main` (the workflow deploys on push to `main`).
2. In your repo: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow from the Actions
   tab). When it finishes, your site is live at:
   `https://ferhanincegumus.github.io/detention-recover-ai/`

The workflow auto-detects the correct base path, adds an SPA deep-link fallback
(`404.html`), and needs zero configuration. Every future push to `main`
redeploys.

> Sign in with the demo credentials shown on the login screen
> (`admin@detentionrecover.ai` / `recover123`). For a real, persistent backend
> (Supabase) plus a custom domain on Vercel, see the guide below.

## Backend (Supabase — free)

The [`supabase/`](./supabase) directory contains the production backend:

- **`migrations/0001_init.sql`** — Postgres tables (jsonb + promoted columns),
  indexes, `updated_at` triggers, and owner-isolation **RLS** policies.
- **`functions/`** — Deno **Edge Functions**: `send-email` (Resend outbound with
  idempotency + threading + backoff), `resend-inbound` (signed webhook routing
  broker replies to claims), and `public-lead-intake` (landing-form endpoint).

The client uses a **mirror store**: it operates on an in-memory snapshot
bootstrapped from Supabase after sign-in and synced back on every mutation, so
the same feature code runs against both the mock and Supabase backends. Auth
switches to **Supabase Auth** automatically in `supabase` mode. SMS is disabled;
email goes through Resend.

**Deploy it all for free (Supabase + Vercel): [`DEPLOY_TR.md`](./DEPLOY_TR.md).**

## Testing

```bash
npm run test
```

45 tests cover the domain logic (detention, commission, risk scoring), the
integration contracts (email threading/idempotency, SMS templates, webhook
signature verification, dedup, rate limiting), and an end-to-end claim
lifecycle (load → claim → paid → follow-ups cancelled + audit log).
