-- Table privileges for logged-in users. RLS (0001) decides WHICH rows they
-- can see; these grants let the API touch the tables at all. Without them
-- every request fails with 42501 "permission denied for table ...".
-- Safe to re-run. The anon role intentionally gets nothing.

grant usage on schema public to authenticated;

grant select                         on public.profiles          to authenticated;
grant select, insert, update, delete on public.clients           to authenticated;
grant select, insert, update, delete on public.client_config     to authenticated;
grant select, insert, update, delete on public.client_addons     to authenticated;
grant select                         on public.chat_sessions     to authenticated;
grant select, insert, update, delete on public.leads             to authenticated;
grant select, insert, update, delete on public.bookings          to authenticated;
grant select, insert, update, delete on public.review_requests   to authenticated;
grant select                         on public.client_integration_status to authenticated;

-- Undo the old setup script that opened chat_sessions to the anon key.
revoke all on public.chat_sessions from anon;

-- Sanity check: should list one row per table above with the privileges granted.
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where grantee = 'authenticated' and table_schema = 'public'
group by table_name
order by table_name;
