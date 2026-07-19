# Supporting entities

The remaining entities follow the same pattern (RLS on `ownerId`, soft delete
via `deletedAt`, indexes on `ownerId` + foreign keys). Their exact TypeScript
shapes — the source of truth — live in [`src/types`](../../src/types):

| Entity | Type source | Key fields |
| ------ | ----------- | ---------- |
| `StoredDocument` | `src/types/document.ts` | `kind`, `name`, `contentType`, `sizeBytes`, `url`, `loadId`, `claimId`, `aiSummary` |
| `EmailMessage` | `src/types/communication.ts` | `providerMessageId` (unique), `threadId`, `direction`, `classification`, `read` |
| `SmsMessage` | `src/types/communication.ts` | `providerSid` (unique), `channel`, `direction`, `event`, `status` |
| `FollowUp` | `src/types/followup.ts` | `claimId`, `cadence`, `status`, `scheduledFor`, `sequence` |
| `Activity` | `src/types/communication.ts` | `type`, `title`, `claimId`/`loadId`/`leadId`/`brokerId`, `automated` |
| `AppSettings` | `src/types/user.ts` | singleton — `defaultCommissionRate`, `autoFollowUps`, `companyEmail`, … |

To generate a Base44 schema for any of these, follow the `Claim.json` /
`Load.json` structure in this folder and copy the property list from the
corresponding type file. Uniqueness constraints on `providerMessageId` /
`providerSid` are what make the inbound webhooks idempotent.
