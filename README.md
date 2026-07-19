# Detention Recover AI

> **No Recovery, No Fee.** Recover unpaid detention, layover, and TONU charges from freight brokers using AI-assisted negotiation.

Detention Recover AI is an **internal operating system** for a single admin (the founder). Trucking companies never log in — they interact only through the landing page, SMS, WhatsApp, and email. The mission is to reduce founder workload by 95% by having AI draft almost everything and letting the founder review only the important actions.

## Tech stack

| Layer     | Choice |
| --------- | ------ |
| Frontend  | React · Vite · TypeScript · TailwindCSS · shadcn/ui |
| Data      | React Query · React Hook Form · Zod |
| Backend   | Base44 (entities, functions, workflows, InvokeLLM, auth, storage) |
| Email     | Resend (outbound + inbound webhook) |
| Messaging | Twilio (SMS + WhatsApp) |
| Charts    | Recharts · date-fns · Lucide |

The app ships with a **fully functional mock backend** (`VITE_DATA_BACKEND=mock`) so it runs and demos with zero external services. Point it at Base44 by setting `VITE_DATA_BACKEND=base44` and providing an app id.

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
- [x] **M8** — Base44 backend, integrations, tests, polish

## Backend

The [`base44/`](./base44) directory contains the production backend: entity
schemas, serverless functions (Resend inbound/outbound email, Twilio SMS &
WhatsApp, AI via InvokeLLM), the idempotent recovery-automation workflow, and a
deployment guide. See [`base44/README.md`](./base44/README.md).

## Testing

```bash
npm run test
```

45 tests cover the domain logic (detention, commission, risk scoring), the
integration contracts (email threading/idempotency, SMS templates, webhook
signature verification, dedup, rate limiting), and an end-to-end claim
lifecycle (load → claim → paid → follow-ups cancelled + audit log).
