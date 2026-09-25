import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '../../auth/context';
import { useClient, useSetAddon, useUpdateClient, useUpdateClientConfig } from '../../data/queries';
import { ADDON_LABELS, fmtMoney } from '../../lib/format';
import { Card, Field, PageHeader, Toggle } from '../../components/ui';
import { ErrorState, Skeleton } from '../../components/Feedback';
import { BrandingForm, HoursForm, IntegrationsCard } from '../Settings';

const DEFAULT_PRICES = { booking: 20, review_generation: 10, automated_followup: 15 };

function ClientForm({ client }) {
  const update = useUpdateClient();
  const pickFields = (c) => ({
    business_name: c.business_name ?? '',
    website_url: c.website_url ?? '',
    contact_email: c.contact_email ?? '',
    plan_tier: c.plan_tier ?? 'foundation',
    status: c.status ?? 'active',
  });
  const [form, setForm] = useState(() => pickFields(client));
  useEffect(() => setForm(pickFields(client)), [client]);
  const dirty = JSON.stringify(form) !== JSON.stringify(pickFields(client));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card title="Business">
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Business name"><input className="input" value={form.business_name} onChange={set('business_name')} /></Field>
        <Field label="Contact email"><input className="input" type="email" value={form.contact_email} onChange={set('contact_email')} /></Field>
        <Field label="Website"><input className="input" value={form.website_url} onChange={set('website_url')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan tier">
            <select className="input" value={form.plan_tier} onChange={set('plan_tier')}>
              <option value="foundation">Foundation</option>
              <option value="growth">Growth</option>
              <option value="full_stack">Full Stack</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <button className="btn-secondary" disabled={!dirty || update.isPending} onClick={() => setForm(pickFields(client))}>Reset</button>
        <button className="btn-primary" disabled={!dirty || update.isPending} onClick={() => update.mutate({ clientId: client.id, patch: form })}>Save</button>
      </div>
    </Card>
  );
}

function AddonsCard({ clientId, addons }) {
  const setAddon = useSetAddon();
  return (
    <Card title="Add-ons" subtitle="Toggling here unlocks the matching dashboard pages for the client">
      <ul className="divide-y divide-line">
        {Object.keys(ADDON_LABELS).map((name) => {
          const a = addons.find((x) => x.addon_name === name);
          const price = a?.monthly_price ?? DEFAULT_PRICES[name];
          return (
            <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{ADDON_LABELS[name]}</p>
                <p className="text-xs text-muted">{fmtMoney(price)}/mo</p>
              </div>
              <Toggle
                checked={!!a?.enabled}
                disabled={setAddon.isPending}
                onChange={(enabled) => setAddon.mutate({ clientId, addonName: name, enabled, monthlyPrice: price })}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function PromptCard({ clientId, config }) {
  const update = useUpdateClientConfig();
  const [value, setValue] = useState(config?.system_prompt ?? '');
  useEffect(() => setValue(config?.system_prompt ?? ''), [config]);
  const dirty = value !== (config?.system_prompt ?? '');
  return (
    <Card title="AI system prompt" subtitle="What the assistant knows about this business. Changes apply to new chats.">
      <div className="p-4">
        <textarea className="input min-h-48 font-mono text-xs" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
        <button className="btn-secondary" disabled={!dirty || update.isPending} onClick={() => setValue(config?.system_prompt ?? '')}>Reset</button>
        <button className="btn-primary" disabled={!dirty || update.isPending} onClick={() => update.mutate({ clientId, patch: { system_prompt: value } })}>Save prompt</button>
      </div>
    </Card>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const { setActiveClientId } = useAuth();
  const navigate = useNavigate();
  const { data, isPending, error } = useClient(clientId);

  return (
    <>
      <Link to="/admin/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All clients
      </Link>
      <PageHeader
        title={data?.client?.business_name ?? 'Client'}
        subtitle={data?.client?.website_url}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setActiveClientId(clientId);
              navigate('/');
            }}
          >
            <Eye className="h-4 w-4" /> View dashboard as client
          </button>
        }
      />
      {error && <ErrorState error={error} />}
      {isPending || !data?.client ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <ClientForm client={data.client} />
            <PromptCard clientId={clientId} config={data.config} />
            <BrandingForm clientId={clientId} config={data.config} />
            <HoursForm clientId={clientId} config={data.config} />
          </div>
          <div className="space-y-4">
            <AddonsCard clientId={clientId} addons={data.addons} />
            <IntegrationsCard clientId={clientId} />
          </div>
        </div>
      )}
    </>
  );
}
