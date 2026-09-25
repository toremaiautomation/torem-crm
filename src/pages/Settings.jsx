import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Palette } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useClient, useIntegrations, useUpdateClientConfig } from '../data/queries';
import { ADDON_LABELS, fmtDate, fmtMoney, labelFor, PLAN_LABELS } from '../lib/format';
import { Badge, Card, Field, PageHeader, Toggle } from '../components/ui';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_DAY = { open: '09:00', close: '17:00' };

function SaveBar({ dirty, busy, onSave, onReset, saved }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
      {saved && !dirty && <span className="text-xs text-success-ink">Saved</span>}
      <button className="btn-secondary" disabled={!dirty || busy} onClick={onReset}>Reset</button>
      <button className="btn-primary" disabled={!dirty || busy} onClick={onSave}>Save changes</button>
    </div>
  );
}

export function BrandingForm({ clientId, config }) {
  const update = useUpdateClientConfig();
  const [form, setForm] = useState({ logo_url: config?.logo_url ?? '', primary_color: config?.primary_color ?? '#007AE3' });
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm({ logo_url: config?.logo_url ?? '', primary_color: config?.primary_color ?? '#007AE3' }), [config]);
  const dirty = form.logo_url !== (config?.logo_url ?? '') || form.primary_color !== (config?.primary_color ?? '#007AE3');

  return (
    <Card title="Branding" subtitle="How your dashboard looks to your team">
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Logo URL" hint="Square PNG or SVG works best.">
          <input className="input" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…/logo.png" />
        </Field>
        <Field label="Primary color">
          <div className="flex gap-2">
            <input type="color" className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-0.5" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            <input className="input" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
          </div>
        </Field>
        <div className="sm:col-span-2">
          <p className="label">Preview</p>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            {form.logo_url ? (
              <img src={form.logo_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: form.primary_color }}><Palette className="h-5 w-5" /></span>
            )}
            <button className="btn text-white" style={{ background: form.primary_color }}>Primary button</button>
            <span className="text-sm" style={{ color: form.primary_color }}>Link color</span>
          </div>
        </div>
      </div>
      <SaveBar
        dirty={dirty}
        busy={update.isPending}
        saved={saved}
        onReset={() => setForm({ logo_url: config?.logo_url ?? '', primary_color: config?.primary_color ?? '#007AE3' })}
        onSave={async () => {
          await update.mutateAsync({ clientId, patch: form });
          setSaved(true);
        }}
      />
    </Card>
  );
}

export function HoursForm({ clientId, config }) {
  const update = useUpdateClientConfig();
  const initial = () => ({
    hours: DAYS.reduce((acc, d) => ({ ...acc, [d]: config?.business_hours?.[d] ?? (d === 'sunday' ? null : DEFAULT_DAY) }), {}),
    slot: config?.business_hours?.slot_interval_minutes ?? 60,
    window: config?.booking_window_days ?? 30,
  });
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(initial()), [config]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(form) !== JSON.stringify(initial());

  const setDay = (d, patch) => setForm({ ...form, hours: { ...form.hours, [d]: patch } });

  return (
    <Card title="Business hours & booking" subtitle="Controls when your assistant offers appointment slots">
      <div className="p-4">
        <div className="divide-y divide-line rounded-lg border border-line">
          {DAYS.map((d) => {
            const v = form.hours[d];
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="w-24 font-medium capitalize">{d}</span>
                <Toggle checked={!!v} onChange={(on) => setDay(d, on ? DEFAULT_DAY : null)} />
                {v ? (
                  <span className="flex items-center gap-2">
                    <input type="time" className="input w-32" value={v.open} onChange={(e) => setDay(d, { ...v, open: e.target.value })} />
                    <span className="text-muted">to</span>
                    <input type="time" className="input w-32" value={v.close} onChange={(e) => setDay(d, { ...v, close: e.target.value })} />
                  </span>
                ) : (
                  <span className="text-muted">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Appointment length" hint="Minutes per slot offered in chat.">
            <select className="input" value={form.slot} onChange={(e) => setForm({ ...form, slot: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </Field>
          <Field label="Booking window" hint="How far ahead customers can book.">
            <select className="input" value={form.window} onChange={(e) => setForm({ ...form, window: Number(e.target.value) })}>
              {[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days</option>)}
            </select>
          </Field>
        </div>
      </div>
      <SaveBar
        dirty={dirty}
        busy={update.isPending}
        saved={saved}
        onReset={() => setForm(initial())}
        onSave={async () => {
          await update.mutateAsync({
            clientId,
            patch: { business_hours: { ...form.hours, slot_interval_minutes: form.slot }, booking_window_days: form.window },
          });
          setSaved(true);
        }}
      />
    </Card>
  );
}

export function PlanCard({ client, addons }) {
  const monthly = addons.filter((a) => a.enabled).reduce((n, a) => n + Number(a.monthly_price ?? 0), 0);
  return (
    <Card title="Your plan" subtitle="Managed by Torem — email us to change anything">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{labelFor(PLAN_LABELS, client.plan_tier)}</p>
            <p className="text-xs text-muted">Client since {fmtDate(client.created_at)}</p>
          </div>
          <Badge tone={client.status === 'active' ? 'success' : 'warning'}>{client.status}</Badge>
        </div>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line text-sm">
          {Object.keys(ADDON_LABELS).map((name) => {
            const a = addons.find((x) => x.addon_name === name);
            return (
              <li key={name} className="flex items-center justify-between px-3 py-2">
                <span className={a?.enabled ? '' : 'text-muted'}>{ADDON_LABELS[name]}</span>
                <span className="flex items-center gap-2">
                  {a?.monthly_price != null && <span className="text-xs text-muted">{fmtMoney(a.monthly_price)}/mo</span>}
                  {a?.enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-right text-xs text-muted">Add-ons: <span className="font-medium text-ink">{fmtMoney(monthly)}/mo</span></p>
      </div>
    </Card>
  );
}

export function IntegrationsCard({ clientId }) {
  const integrations = useIntegrations(clientId);
  return (
    <Card title="Connected accounts">
      {integrations.isPending ? (
        <Skeleton className="m-4 h-12" />
      ) : integrations.data?.length ? (
        <ul className="divide-y divide-line text-sm">
          {integrations.data.map((i) => (
            <li key={`${i.client_id}-${i.provider}`} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 capitalize"><CalendarCheck className="h-4 w-4 text-muted" /> {i.provider.replace('_', ' ')}</span>
              <span className="text-xs text-muted">Connected {fmtDate(i.connected_at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing connected">Torem connects your calendar during setup.</EmptyState>
      )}
    </Card>
  );
}

export default function Settings() {
  const { activeClientId, isAdmin } = useAuth();
  const { data, isPending, error } = useClient(activeClientId);

  if (!activeClientId) {
    return (
      <>
        <PageHeader title="Settings" />
        <EmptyState title="Pick a client">Use the switcher in the top bar to choose a client, or manage everything from <Link className="text-brand" to="/admin/clients">Clients</Link>.</EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Branding, hours, and your plan."
        actions={isAdmin && <Link to={`/admin/clients/${activeClientId}`} className="btn-secondary">Admin: edit client</Link>}
      />
      {error && <ErrorState error={error} />}
      {isPending || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <BrandingForm clientId={activeClientId} config={data.config} />
            <HoursForm clientId={activeClientId} config={data.config} />
          </div>
          <div className="space-y-4">
            <PlanCard client={data.client} addons={data.addons} />
            <IntegrationsCard clientId={activeClientId} />
          </div>
        </div>
      )}
    </>
  );
}
