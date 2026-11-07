-- Community Timeline: member-only reads, anonymous submissions via Edge Function.
create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  happened_at date not null,
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'その他' check (char_length(category) <= 40),
  author text not null default '匿名' check (char_length(author) <= 40),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- Explicitly remove browser-side anonymous access. The Edge Function uses
-- the server-only service role key and validates the posting token.
revoke all on table public.events from anon;
revoke insert, update, delete on table public.events from authenticated;
grant select on table public.events to authenticated;

drop policy if exists "Signed-in members can read events" on public.events;
create policy "Signed-in members can read events"
on public.events for select
to authenticated
using (true);
