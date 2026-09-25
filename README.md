# Torem CRM

White-label dashboard for Torem AI clients, plus an agency view for the Torem team. Reads the existing `torem-ai` Supabase project directly; n8n keeps doing the chatting, booking, follow-ups and review sends.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run lint
```

## Modes

`.env.local` (never committed):

```
VITE_SUPABASE_URL=https://qcqkkpivbqxoshfsgnah.supabase.co
VITE_SUPABASE_ANON_KEY=        # publishable/anon key only — never the service_role key
VITE_USE_MOCK=true             # true = demo data + fake login, false = real Supabase
```

- **Demo mode** (`VITE_USE_MOCK=true`): seeded data for Torem + three contractors, pick-an-account login. Works with no Supabase setup.
- **Live mode**: Supabase Auth login, RLS-scoped data. Requires the steps below.

## Going live (one-time)

1. **Run the migrations** — paste `supabase/migrations/0001_crm_access.sql` into Supabase → SQL editor and run it (adds `profiles`, RLS policies, a `client_integration_status` view, indexes), then do the same with `0002_grants.sql` (table privileges for the `authenticated` role — without it every API call fails with 42501). Re-running either is safe.
2. **Turn off public sign-ups** — Authentication → Providers → Email → disable "Allow new users to sign up". Users get in by invite only.
3. **Invite users** — Authentication → Users → Invite user. A `profiles` row is created automatically with `role = 'client'`.
4. **Link each user** — run the `UPDATE` statements at the bottom of the migration: set `role = 'admin'` for Torem staff, and `client_id` for each contractor (their `clients.id`).
5. **Configure the app** — put the anon key in `.env.local`, set `VITE_USE_MOCK=false`, restart `npm run dev`.
6. **Auth redirect URLs** — Authentication → URL Configuration: add your dev and production dashboard URLs so magic links and password resets return to the app.

## What each role sees

| Page | Contractor (`client`) | Torem (`admin`) |
|---|---|---|
| Dashboard | Own stats + charts | Agency overview across all clients, or any client via the switcher |
| Conversations / Leads | Own rows | All rows (with client column) |
| Bookings / Follow-ups / Reviews | Own rows; locked with an upsell if the add-on is off | Everything |
| Settings | Branding, business hours, booking window, plan (read-only) | Same, plus `/admin/clients` to edit plan, add-ons, system prompt |

Add-on gating reads `client_addons.enabled` for `booking`, `automated_followup`, `review_generation`.

## What the dashboard writes (contracts for n8n)

The dashboard never calls n8n. It writes rows; n8n workflows react to them.

| Dashboard action | Row change | n8n should |
|---|---|---|
| Mark job complete | `bookings.status = 'completed'`, insert `review_requests (client_id, booking_id, marked_complete_at)` | Cron: send review request where `review_sent_at is null`, then set `review_sent_at`, `review_link` |
| Cancel appointment | `bookings.status = 'cancelled'` | Optionally delete the Google Calendar event by `calendar_event_id` |
| Save branding / hours | `client_config.logo_url`, `primary_color`, `business_hours`, `booking_window_days` | Read `business_hours` / `booking_window_days` when offering slots |
| Admin toggles add-on | `client_addons.enabled` | Follow-up cron: only process leads whose client has `automated_followup` enabled |

Follow-up status shown in the dashboard comes from `leads.followed_up_at` (null = queued) and `leads.booking_completed`.

## Layout

```
src/
  auth/        AuthProvider (session, profile, role, active client), route guards
  data/        api interface → supabaseApi.js (live) or mock/ (demo); queries.js = React Query hooks
  theme/       ThemeProvider applies client_config.primary_color + logo (white-label)
  lib/         analytics (grouping, stats, chart series), format helpers
  components/  AppShell, ui primitives, feedback states
  pages/       one file per screen; pages/admin/ for agency-only screens
supabase/migrations/  SQL to run in the Supabase dashboard
```
