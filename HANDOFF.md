# Torem AI — Technical handoff (dashboard, widget, n8n)

Written 2026-09-19. Everything below is on the Windows PC under `C:\Users\klr13\`.

## 1. What exists now

| Folder | What it is | Status |
|---|---|---|
| `torem-crm/` | Client dashboard + agency admin. Vite + React 19 + Tailwind v4. Reads Supabase directly (RLS-scoped). | **Working locally** against live Supabase. Not deployed. |
| `torem-chat-widget/` | The chat bubble for contractor websites. Vite library build → `build/widget.js` + `build/widget.css`. | **Working locally.** Not hosted yet. |
| `torem-website/` | toremai.com (Vercel, GitHub `toremaiautomation/torem-website`). | One local change not yet pushed (see §5). |

Docs inside the repos: `torem-crm/README.md` (env, roles, n8n contracts), `torem-chat-widget/README.md` (embed snippet, attributes), `CLAUDE.md` at the top level (overview).

## 2. Supabase — already done (don't redo)

Project `torem-ai` (`https://qcqkkpivbqxoshfsgnah.supabase.co`). Two migrations were run in the SQL editor; both files are in `torem-crm/supabase/migrations/` and are safe to re-run:

- `0001_crm_access.sql`
  - New table `public.profiles (user_id → auth.users, client_id → clients, role 'admin'|'client', full_name)`.
  - Trigger `on_auth_user_created`: every new auth user gets a `profiles` row with `role = 'client'` (role is never taken from user metadata).
  - Helper functions `current_client_id()` and `is_admin()` (security definer).
  - RLS enabled on every table + policies: clients see rows where `client_id = current_client_id()`; admins see all. Clients can UPDATE `bookings.status`, INSERT `review_requests` for their own bookings, and UPDATE `client_config` (a trigger blocks non-admins from changing `system_prompt`). `leads` and `chat_sessions` are read-only for clients.
  - `client_integrations` has **no** policies — OAuth tokens never reach the browser. The dashboard reads `view client_integration_status (client_id, provider, connected_at, expires_at)` instead.
  - Indexes on `(client_id, created_at)` etc.; `leads`, `bookings`, `chat_sessions` added to the realtime publication.
- `0002_grants.sql` — table privileges for the `authenticated` role. The tables had no API-role grants at all (every request failed with 42501). Also revoked the old `GRANT ALL ... TO anon` on `chat_sessions`.

Auth settings changed: Site URL = `http://localhost:5173`, Redirect URLs include `http://localhost:5173/**`, public sign-ups disabled. One admin user exists: `toremaiautomation@gmail.com` (role admin, client_id = Torem's `d7b1ebe9-e914-4c39-891e-ee7617b74d3a`).

Service-role key is still only used by n8n. The dashboard uses the publishable/anon key.

## 3. n8n — what needs to change (this is the blocker)

The dashboard never calls n8n. It reads Supabase rows and writes a few; n8n reacts to rows.

### 3a. Chat workflow (`/webhook/torem-chat`) — required
Request body now includes `client_id` (and `sessionId` + `session_id`, same value):
```json
{ "message": "...", "sessionId": "<uuid>", "session_id": "<uuid>", "client_id": "<clients.id>" }
```
- Write `client_id` onto every `chat_sessions` row. Without this, contractor chats never appear in their dashboard (rows with `client_id = null` are visible to admins only).
- When the chat captures an email/phone → insert `leads (client_id, session_ref = sessionId, email, phone)`.
- When a booking is confirmed → insert `bookings (client_id, session_ref, customer_name, customer_email, appointment_time, calendar_event_id, status = 'confirmed')` and set `leads.booking_completed = true`.
- Reply field: the widget accepts `bot_message`, `ai_response`, `reply` or `message`.
- The old endpoint `/webhook/8fbc92af-930e-40b8-95b2-dfe582c97a3e/chat` returns HTTP 500 — nothing points at it anymore; delete or fix.
- Optional: load the client's `client_config.system_prompt` by `client_id` so each contractor's bot has its own persona (the admin edits it from the dashboard).

### 3b. Follow-up workflow (cron) — for the "Automated Follow-Up" add-on
Select `leads` where `followed_up_at is null and booking_completed = false and (email is not null or phone is not null) and created_at < now() - interval '<delay>'` and the client has `client_addons.addon_name = 'automated_followup' and enabled = true`. Send the follow-up, then set `followed_up_at = now()`. The dashboard shows Queued / Sent / Converted from these columns.

### 3c. Review workflow (cron) — for the "Review Generation" add-on
The dashboard's "Mark job complete" sets `bookings.status = 'completed'` and inserts `review_requests (client_id, booking_id, marked_complete_at)`. Select rows where `review_sent_at is null`, send the request (customer email is on the booking), then set `review_sent_at = now()` and `review_link`.

### 3d. Cancellations — optional
Dashboard sets `bookings.status = 'cancelled'`. If you want the Google Calendar event removed, watch for that and delete by `calendar_event_id`.

## 4. Widget — hosting + embed

Build: `cd torem-chat-widget && npm install && npm run build` → `build/widget.js`, `build/widget.css`.
Host `build/` as a static site (Vercel: new project, output directory `build`, or just drag the folder in). Suggested domain: `widget.toremai.com`.

Embed for a contractor (goes before `</body>` on their site):
```html
<link rel="stylesheet" href="https://widget.toremai.com/widget.css">
<div id="torem-chat"
     data-client-id="<their clients.id>"
     data-name="Bayou City Roofing"
     data-color="#B45309"
     data-greeting="Hi! Need a quote or an inspection? I can help."></div>
<script src="https://widget.toremai.com/widget.js" defer></script>
```
Optional `data-webhook` overrides the n8n URL. CSS is scoped to `.torem-widget` — it won't restyle the host site.

## 5. Website — one change to push

`torem-website/src/App.jsx` `sendToN8N()` now sends `client_id: "d7b1ebe9-…"` (Torem's own id). Commit + push to GitHub; Vercel redeploys.

## 6. Dashboard — running and deploying

Local: `cd torem-crm && npm install && npm run dev` → http://localhost:5173. `.env.local` holds `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_USE_MOCK=false` (`true` = demo data + fake login, no Supabase needed).

Deploy (Vercel): framework Vite, build `npm run build`, output `dist`, add the two `VITE_SUPABASE_*` env vars and `VITE_USE_MOCK=false`. Then in Supabase → Authentication → URL Configuration add the production URL to Redirect URLs (`https://app.toremai.com/**`) and make it the Site URL. Add a rewrite so client-side routes work (Vercel: `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`).

Roles: `admin` sees every client and the `/admin/clients` pages (edit plan, add-ons, system prompt, "view as" any client). `client` sees only their own business. Bookings / Follow-ups / Reviews pages are locked with an upsell unless the matching `client_addons` row is enabled.

## 7. Onboarding a contractor — checklist

1. **Create the business** — in the dashboard (as admin) → Clients. Or insert a `clients` row + `client_config` row (business_name, primary_color, logo_url, system_prompt, business_hours) directly. Enable add-ons in `client_addons`.
2. **Invite their login** — Supabase → Authentication → Users → Invite user (their email). They click the link and set a password.
3. **Link the login** — SQL editor:
   ```sql
   update public.profiles
   set client_id = '<their clients.id>'
   where user_id = (select id from auth.users where email = 'owner@contractor.com');
   ```
   (For Torem staff, also `role = 'admin'`.)
4. **Embed the widget** on their website with their `data-client-id` (§4).
5. **Check** — send a test chat on their site; it should appear under their login in Conversations.

## 8. Known gaps / security notes

- `client_integrations.access_token` / `refresh_token` are plaintext (flagged in the original handoff). Encrypt before real client OAuth tokens go in.
- `leads` / `bookings` population depends on §3a — dashboard shows empty until then.
- Prices differ across the site, the pricing doc and the n8n prompt. The dashboard shows `client_addons.monthly_price` from the DB and hardcodes nothing.
- No response-time metric — n8n doesn't log latency.
- The dashboard's mock seed (`torem-crm/src/data/mock/seed.js`) is deterministic sample data only; it never touches Supabase.
