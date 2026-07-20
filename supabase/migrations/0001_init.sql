-- Detention Recover AI — Supabase schema
-- Design: each entity stores its full app-shaped object in a `data` jsonb
-- column, with a few *promoted* scalar columns for RLS, indexing, and filtering.
-- This keeps the client adapter thin (row.data IS the typed entity) while still
-- supporting owner isolation and fast queries.
--
-- Owner isolation: every row carries owner_id = auth.uid(). RLS restricts all
-- access to the owning (single admin) user. Anonymous landing-page leads are
-- inserted only via the public-lead-intake Edge Function (service role).

create extension if not exists "pgcrypto";

-- ── Helper: auto-maintain updated_at on the promoted column ──────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── brokers ──────────────────────────────────────────────────────────────────
create table if not exists brokers (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  risk_level  text,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists brokers_owner_idx on brokers(owner_id) where deleted_at is null;

-- ── loads ────────────────────────────────────────────────────────────────────
create table if not exists loads (
  id                text primary key,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  broker_id         text,
  reference_number  text not null,
  claim_id          text,
  risk_level        text,
  data              jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists loads_owner_idx on loads(owner_id) where deleted_at is null;
create index if not exists loads_broker_idx on loads(broker_id);

-- ── claims ───────────────────────────────────────────────────────────────────
create table if not exists claims (
  id            text primary key,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  broker_id     text,
  load_id       text,
  claim_number  text not null,
  status        text not null,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (owner_id, claim_number)
);
create index if not exists claims_owner_status_idx on claims(owner_id, status) where deleted_at is null;
create index if not exists claims_broker_idx on claims(broker_id);
create index if not exists claims_load_idx on claims(load_id);

-- ── case leads ───────────────────────────────────────────────────────────────
create table if not exists leads (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  status      text not null,
  email       text,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists leads_owner_status_idx on leads(owner_id, status) where deleted_at is null;

-- ── documents ────────────────────────────────────────────────────────────────
create table if not exists documents (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  load_id     text,
  claim_id    text,
  kind        text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists documents_owner_idx on documents(owner_id) where deleted_at is null;

-- ── emails ───────────────────────────────────────────────────────────────────
create table if not exists emails (
  id                    text primary key,
  owner_id              uuid not null references auth.users(id) on delete cascade,
  claim_id              text,
  provider_message_id   text,
  direction             text not null,
  read                  boolean not null default false,
  data                  jsonb not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (owner_id, provider_message_id)
);
create index if not exists emails_owner_idx on emails(owner_id);
create index if not exists emails_claim_idx on emails(claim_id);

-- ── follow-ups ───────────────────────────────────────────────────────────────
create table if not exists followups (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  claim_id    text not null,
  status      text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists followups_owner_status_idx on followups(owner_id, status);
create index if not exists followups_claim_idx on followups(claim_id);

-- ── activities (audit log) ───────────────────────────────────────────────────
create table if not exists activities (
  id          text primary key,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists activities_owner_idx on activities(owner_id, created_at desc);

-- ── app settings (singleton per owner) ───────────────────────────────────────
create table if not exists app_settings (
  owner_id    uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── updated_at triggers ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['brokers','loads','claims','leads','documents','emails','followups','activities','app_settings']
  loop
    execute format('drop trigger if exists set_updated_at on %I;', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ── Row Level Security: owner isolation ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['brokers','loads','claims','leads','documents','emails','followups','activities','app_settings']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "owner_select" on %I;', t);
    execute format('drop policy if exists "owner_insert" on %I;', t);
    execute format('drop policy if exists "owner_update" on %I;', t);
    execute format('drop policy if exists "owner_delete" on %I;', t);
    execute format('create policy "owner_select" on %I for select using (owner_id = auth.uid());', t);
    execute format('create policy "owner_insert" on %I for insert with check (owner_id = auth.uid());', t);
    execute format('create policy "owner_update" on %I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());', t);
    execute format('create policy "owner_delete" on %I for delete using (owner_id = auth.uid());', t);
  end loop;
end $$;
