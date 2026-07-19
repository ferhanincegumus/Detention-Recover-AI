# Base44 Backend

This directory contains the production backend definitions for Detention Recover AI on [Base44](https://base44.com): entity schemas, serverless functions (webhooks, email, SMS/WhatsApp, AI), and the automation workflow.

The React app runs against a fully-functional **mock backend** by default (`VITE_DATA_BACKEND=mock`). To run against Base44:

1. Create a Base44 app and note its **App ID**.
2. Import the entity schemas in [`entities/`](./entities) (Entities → Import schema).
3. Deploy the functions in [`functions/`](./functions) (Functions → New function).
4. Add the automation in [`workflows/`](./workflows).
5. Configure secrets (see below).
6. Set the frontend env:
   ```
   VITE_DATA_BACKEND=base44
   VITE_BASE44_APP_ID=<your-app-id>
   ```

## Secrets (Base44 → Settings → Secrets)

| Secret | Purpose |
| ------ | ------- |
| `RESEND_API_KEY` | Outbound email via Resend |
| `RESEND_WEBHOOK_SECRET` | Verify inbound email webhook signatures |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | SMS + WhatsApp send + webhook validation |
| `TWILIO_MESSAGING_FROM` | Sender number for SMS |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender (e.g. `+18885551234`) |
| `INBOUND_WEBHOOK_SECRET` | Shared HMAC secret for generic webhook auth |

All secrets are encrypted at rest by Base44 and injected into functions at runtime. Never commit real values.

## Entity → app mapping

Every entity mirrors a TypeScript type in [`src/types`](../src/types). The mock backend in [`src/services/backend`](../src/services/backend) and the API services in [`src/services/api`](../src/services/api) share the exact same shapes, so switching `VITE_DATA_BACKEND` requires no component changes — only the service adapter swaps.

| Base44 entity | App type | Service |
| ------------- | -------- | ------- |
| `Broker` | `Broker` | `brokersApi` |
| `Load` | `Load` | `loadsApi` |
| `Claim` | `Claim` | `claimsApi` |
| `CaseLead` | `CaseLead` | `leadsApi` |
| `StoredDocument` | `StoredDocument` | `documentsApi` |
| `EmailMessage` | `EmailMessage` | `inboxApi` |
| `SmsMessage` | `SmsMessage` | (Twilio fn) |
| `FollowUp` | `FollowUp` | `followupsApi` |
| `Activity` | `Activity` | `activityApi` |

## Security model

- **Owner isolation / RLS** — every entity carries `ownerId`; Base44 row-level security restricts all reads/writes to the owning admin.
- **Soft delete** — records set `deletedAt` instead of hard-deleting; all list queries filter it out.
- **Webhook auth** — inbound webhooks verify HMAC signatures (`src/services/integrations/webhook.ts`) and dedupe by provider event id (idempotent handlers).
- **Rate limiting** — webhook endpoints use a fixed-window limiter.
- **Audit log** — every mutation appends an immutable `Activity` row.

## AI functions (InvokeLLM)

The AI service contracts live in [`src/services/api/ai.ts`](../src/services/api/ai.ts). Each maps to a Base44 `InvokeLLM` call:

| App method | Function | Prompt intent |
| ---------- | -------- | ------------- |
| `parseRateConfirmation` | `ai-parse-ratecon` | Extract broker, stops, rate, free time from a PDF |
| `writeClaimLetter` | `ai-write-claim` | Draft a formal detention demand letter |
| `generateReply` | `ai-generate-reply` | Draft a reply tuned to the broker's message |
| `classifyReply` | `ai-classify-reply` | Classify an inbound broker email |
| `defenseReport` | `ai-defense-report` | Assess defensibility + evidence gaps |

## Idempotency

Every automated action is idempotent: claim creation returns the existing claim for a load, `markPaid` cancels outstanding follow-ups exactly once, and webhook handlers dedupe by event id. Re-delivery never double-sends or double-charges.
