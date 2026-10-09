-- Make addon_catalog readable by authenticated users, allow clients to
-- toggle their own add-ons (non-active, non-comped accounts only), and
-- keep monthly_price / stripe_price_id in sync with the catalog via trigger.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. addon_catalog table
-- ---------------------------------------------------------------------------
create table if not exists public.addon_catalog (
  addon_name      text     primary key,
  monthly_price   numeric  not null,
  stripe_price_id text,
  live            boolean  not null default false
);

alter table public.addon_catalog enable row level security;

drop policy if exists "addon_catalog read authenticated" on public.addon_catalog;
drop policy if exists "catalog read"                    on public.addon_catalog;
create policy "catalog read" on public.addon_catalog
  for select to authenticated using (true);

grant select on public.addon_catalog to authenticated;

-- ---------------------------------------------------------------------------
-- 2. client_addons: stripe_price_id column and per-operation write policies
-- ---------------------------------------------------------------------------
alter table public.client_addons add column if not exists stripe_price_id text;

drop policy if exists "client_addons client write own"   on public.client_addons;
drop policy if exists "client_addons client insert own"  on public.client_addons;
drop policy if exists "client_addons client update own"  on public.client_addons;

create policy "client_addons client insert own" on public.client_addons
  for insert to public
  with check (client_id = current_client_id());

create policy "client_addons client update own" on public.client_addons
  for update to public
  using  (client_id = current_client_id())
  with check (client_id = current_client_id());

-- ---------------------------------------------------------------------------
-- 3. Trigger: auto-fill price/stripe_id from catalog; block writes for
--    active or comped accounts (non-admins only).
-- ---------------------------------------------------------------------------
create or replace function public.client_addons_guard()
returns trigger language plpgsql security definer set search_path = 'public' as $function$
declare
  v_role   text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'service_role');
  v_status text;
  v_exempt boolean;
  v_cat    public.addon_catalog%rowtype;
begin
  select * into v_cat from public.addon_catalog where addon_name = new.addon_name;

  if v_role = 'service_role' or public.is_admin() then
    if new.stripe_price_id is null and v_cat.addon_name is not null then
      new.stripe_price_id := v_cat.stripe_price_id;
      new.monthly_price   := coalesce(new.monthly_price, v_cat.monthly_price);
    end if;
    return new;
  end if;

  select billing_status, billing_exempt into v_status, v_exempt
    from public.clients where id = new.client_id;
  if coalesce(v_exempt, false) or v_status = 'active' then
    raise exception 'Add-ons are managed by Torem for this account';
  end if;
  if v_cat.addon_name is null then
    raise exception 'Unknown add-on';
  end if;
  if new.enabled and not v_cat.live then
    raise exception 'This add-on is not available yet';
  end if;

  new.stripe_price_id := v_cat.stripe_price_id;
  new.monthly_price   := v_cat.monthly_price;
  return new;
end $function$;

drop trigger if exists guard_and_fill_addon on public.client_addons;
drop trigger if exists client_addons_guard  on public.client_addons;
create trigger client_addons_guard
  before insert or update on public.client_addons
  for each row execute function public.client_addons_guard();
