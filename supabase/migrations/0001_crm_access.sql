-- Torem CRM: client-facing access layer for the existing torem-ai schema.
-- Run once in Supabase → SQL editor. Safe to re-run.
--
-- Before this runs, every table has RLS enabled with zero policies, so the
-- anon/publishable key can read nothing. After it runs:
--   * each contractor (role = 'client') sees only rows for their client_id
--   * Torem staff (role = 'admin') see and manage everything
--   * client_integrations (OAuth tokens) stays unreachable from the browser

-- ---------------------------------------------------------------------------
-- 1. profiles: links an auth user to a client + role
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  client_id  uuid references public.clients (id) on delete set null,
  role       text not null default 'client' check (role in ('admin', 'client')),
  full_name  text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2. helpers (security definer so they can read profiles without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false)
$$;

revoke all on function public.current_client_id() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. auto-create a profile when a user is invited / signs up.
--    Role is NEVER taken from user metadata (a self-signup could set it).
--    Promote admins with the UPDATE at the bottom of this file.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, client_id, role, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'client_id', '')::uuid,
    'client',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. policies
-- ---------------------------------------------------------------------------
-- Make sure RLS is on everywhere (an older setup script had disabled it on
-- chat_sessions and granted the anon key full access).
alter table public.clients             enable row level security;
alter table public.client_config       enable row level security;
alter table public.client_addons       enable row level security;
alter table public.client_integrations enable row level security;
alter table public.chat_sessions       enable row level security;
alter table public.leads               enable row level security;
alter table public.bookings            enable row level security;
alter table public.review_requests     enable row level security;

-- profiles
drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- clients
drop policy if exists "clients read own or admin" on public.clients;
create policy "clients read own or admin" on public.clients
  for select to authenticated using (id = public.current_client_id() or public.is_admin());
drop policy if exists "clients admin write" on public.clients;
create policy "clients admin write" on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- client_config: clients may edit their own branding/hours; only admins may
-- touch system_prompt (enforced by the trigger below).
drop policy if exists "client_config read own or admin" on public.client_config;
create policy "client_config read own or admin" on public.client_config
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "client_config insert own or admin" on public.client_config;
create policy "client_config insert own or admin" on public.client_config
  for insert to authenticated with check (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "client_config update own or admin" on public.client_config;
create policy "client_config update own or admin" on public.client_config
  for update to authenticated
  using (client_id = public.current_client_id() or public.is_admin())
  with check (client_id = public.current_client_id() or public.is_admin());

create or replace function public.guard_client_config()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() and auth.uid() is not null then
    if tg_op = 'INSERT' and new.system_prompt is not null then
      raise exception 'Only Torem admins can set the system prompt';
    end if;
    if tg_op = 'UPDATE' and new.system_prompt is distinct from old.system_prompt then
      raise exception 'Only Torem admins can change the system prompt';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists guard_client_config on public.client_config;
create trigger guard_client_config
  before insert or update on public.client_config
  for each row execute function public.guard_client_config();

-- client_addons: read own; admin manages
drop policy if exists "client_addons read own or admin" on public.client_addons;
create policy "client_addons read own or admin" on public.client_addons
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "client_addons admin write" on public.client_addons;
create policy "client_addons admin write" on public.client_addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- chat_sessions: read only (n8n writes with the service role).
-- Legacy rows with client_id = null are visible to admins only.
drop policy if exists "chat_sessions read own or admin" on public.chat_sessions;
create policy "chat_sessions read own or admin" on public.chat_sessions
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());

-- leads: read only for clients
drop policy if exists "leads read own or admin" on public.leads;
create policy "leads read own or admin" on public.leads
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "leads admin write" on public.leads;
create policy "leads admin write" on public.leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bookings: clients may update their own (status changes from the dashboard)
drop policy if exists "bookings read own or admin" on public.bookings;
create policy "bookings read own or admin" on public.bookings
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "bookings update own or admin" on public.bookings;
create policy "bookings update own or admin" on public.bookings
  for update to authenticated
  using (client_id = public.current_client_id() or public.is_admin())
  with check (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "bookings admin write" on public.bookings;
create policy "bookings admin write" on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- review_requests: clients may create one for their own booking
drop policy if exists "review_requests read own or admin" on public.review_requests;
create policy "review_requests read own or admin" on public.review_requests
  for select to authenticated using (client_id = public.current_client_id() or public.is_admin());
drop policy if exists "review_requests insert own or admin" on public.review_requests;
create policy "review_requests insert own or admin" on public.review_requests
  for insert to authenticated with check (
    public.is_admin() or (
      client_id = public.current_client_id()
      and exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = client_id)
    )
  );
drop policy if exists "review_requests admin write" on public.review_requests;
create policy "review_requests admin write" on public.review_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- client_integrations: intentionally NO policies. Tokens never reach the
-- browser. The dashboard reads connection status through this view instead.
create or replace view public.client_integration_status
with (security_invoker = false) as
  select client_id, provider, connected_at, expires_at
  from public.client_integrations
  where client_id = public.current_client_id() or public.is_admin();
revoke all on public.client_integration_status from anon, public;
grant select on public.client_integration_status to authenticated;

-- ---------------------------------------------------------------------------
-- 5. indexes for the dashboard's access patterns
-- ---------------------------------------------------------------------------
create index if not exists leads_client_created_idx        on public.leads (client_id, created_at desc);
create index if not exists bookings_client_appt_idx        on public.bookings (client_id, appointment_time);
create index if not exists bookings_client_created_idx     on public.bookings (client_id, created_at desc);
create index if not exists chat_sessions_client_session_idx on public.chat_sessions (client_id, session_id, created_at);
create index if not exists review_requests_client_idx      on public.review_requests (client_id, marked_complete_at desc);

-- ---------------------------------------------------------------------------
-- 6. optional: live updates in the dashboard
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.leads, public.bookings, public.chat_sessions;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 7. AFTER inviting users (Authentication → Users → Invite user):
--    promote Torem staff to admin, and link contractors to their client row.
-- ---------------------------------------------------------------------------
-- update public.profiles set role = 'admin', client_id = 'd7b1ebe9-e914-4c39-891e-ee7617b74d3a'
--   where user_id = (select id from auth.users where email = 'you@toremai.com');
--
-- update public.profiles set client_id = '<clients.id for that business>'
--   where user_id = (select id from auth.users where email = 'owner@contractor.com');
