import { useState } from 'react';
import { useAuth } from '../auth/context';
import { useClient, useSetAddon } from '../data/queries';
import { supabase } from '../lib/supabase';
import { ADDON_LABELS, fmtMoney, labelFor, PLAN_LABELS } from '../lib/format';
import { Badge, Card, PageHeader, Toggle } from '../components/ui';
import { ErrorState, Skeleton, Spinner } from '../components/Feedback';

const SUBSCRIBE_WEBHOOK = import.meta.env.VITE_N8N_SUBSCRIBE_WEBHOOK;
const ADDON_REQUEST_WEBHOOK = import.meta.env.VITE_N8N_ADDON_REQUEST_WEBHOOK;

const PLAN_PRICE = { foundation: 40, growth: 0, full_stack: 0 };

const ADDON_CONFIG = {
  booking:            { price: 20, live: true },
  review_generation:  { price: 10, live: false },
  automated_followup: { price: 15, live: false },
};

const BILLING_BADGE = { active: 'success', pending: 'neutral', past_due: 'danger', canceled: 'danger' };
const BILLING_LABEL = { active: 'Active', pending: 'Pending', past_due: 'Past due', canceled: 'Canceled' };

const REQUEST_ROWS = [
  { name: 'booking',            label: 'Booking Built In',    comingSoon: false },
  { name: 'review_generation',  label: 'Review Generation',   comingSoon: true  },
  { name: 'automated_followup', label: 'Automated Follow-Up', comingSoon: true  },
  { name: 'custom',             label: 'Something custom',    comingSoon: false },
];

export default function Billing() {
  const { activeClientId } = useAuth();
  const { data, isPending, error } = useClient(activeClientId);
  const setAddon = useSetAddon();
  const [busy, setBusy] = useState(false);
  const [subError, setSubError] = useState(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState(null);
  const [note, setNote] = useState('');
  const [reqState, setReqState] = useState({});

  if (!activeClientId) return null;
  if (isPending || !data) return <Skeleton className="h-96" />;
  if (error) return <ErrorState error={error} />;

  const { client, addons } = data;
  const billingStatus = client.billing_status ?? 'pending';
  const isActive = billingStatus === 'active';
  const isExempt = !!client.billing_exempt;
  const planPrice = PLAN_PRICE[client.plan_tier] ?? 0;
  const addonTotal = Object.keys(ADDON_CONFIG).reduce((sum, name) => {
    const row = addons.find((a) => a.addon_name === name);
    return row?.enabled ? sum + ADDON_CONFIG[name].price : sum;
  }, 0);

  async function subscribe() {
    setBusy(true);
    setSubError(null);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token;
      if (!token) throw new Error('Not authenticated — please sign in again.');
      const res = await fetch(SUBSCRIBE_WEBHOOK, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) throw new Error('Authentication failed — please sign in again.');
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      if (!json.checkout_url) throw new Error('No checkout URL in response');
      window.location.href = json.checkout_url;
    } catch (e) {
      setSubError(e.message);
      setBusy(false);
    }
  }

  async function sendRequest(addon) {
    setReqState((s) => ({ ...s, [addon]: 'busy' }));
    if (!ADDON_REQUEST_WEBHOOK) {
      setReqState((s) => ({ ...s, [addon]: 'error' }));
      return;
    }
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(ADDON_REQUEST_WEBHOOK, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addon, note: note.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setReqState((s) => ({ ...s, [addon]: 'sent' }));
    } catch {
      setReqState((s) => ({ ...s, [addon]: 'error' }));
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd?.session?.access_token;
      if (!token) throw new Error('Not authenticated — please sign in again.');
      const res = await fetch('https://toremai.app.n8n.cloud/webhook/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      const json = await res.json();
      if (!json.portal_url) throw new Error('No portal_url in response');
      window.open(json.portal_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setPortalError(e.message);
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Manage your subscription and add-ons." />
      <div className="mx-auto max-w-xl space-y-4">

        <Card title="Current plan">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-lg font-semibold">{labelFor(PLAN_LABELS, client.plan_tier)} Plan</p>
              <p className="mt-0.5 text-sm text-muted">{fmtMoney(planPrice)}/mo base</p>
            </div>
            {isExempt ? (
              <Badge tone="success">Complimentary</Badge>
            ) : (
              <Badge tone={BILLING_BADGE[billingStatus] ?? 'neutral'}>
                {BILLING_LABEL[billingStatus] ?? billingStatus}
              </Badge>
            )}
          </div>
        </Card>

        {isExempt ? (
          <Card title="Add-ons" subtitle="Enabled on your account by Torem">
            <ul className="divide-y divide-line">
              {Object.keys(ADDON_CONFIG).map((name) => {
                const row = addons.find((a) => a.addon_name === name);
                const enabled = !!row?.enabled;
                return (
                  <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className={`font-medium ${!enabled ? 'text-muted' : ''}`}>{ADDON_LABELS[name]}</span>
                    <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'On' : 'Off'}</Badge>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line px-4 py-4">
              <p className="text-sm text-muted">This is a complimentary account. Add-ons are managed directly by Torem.</p>
            </div>
          </Card>
        ) : (
          <Card
            title="Add-ons"
            subtitle={isActive ? 'Features active on your plan' : 'Select which features to include'}
          >
            <ul className="divide-y divide-line">
              {Object.keys(ADDON_CONFIG).map((name) => {
                const cfg = ADDON_CONFIG[name];
                const row = addons.find((a) => a.addon_name === name);
                const enabled = !!row?.enabled;

                return (
                  <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <span className={`font-medium ${!cfg.live ? 'text-muted' : ''}`}>
                        {ADDON_LABELS[name]}
                      </span>
                      {!cfg.live && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                          Coming soon
                        </span>
                      )}
                      <p className="text-xs text-muted">+{fmtMoney(cfg.price)}/mo</p>
                    </div>
                    {isActive ? (
                      <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'On' : 'Off'}</Badge>
                    ) : (
                      <Toggle
                        checked={enabled}
                        disabled={!cfg.live || setAddon.isPending}
                        onChange={(on) =>
                          cfg.live &&
                          setAddon.mutate({ clientId: activeClientId, addonName: name, enabled: on, monthlyPrice: cfg.price })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-line px-4 py-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Monthly total</span>
                <span>{fmtMoney(planPrice + addonTotal)}/mo</span>
              </div>

              {!isActive && (
                <div className="mt-3">
                  <button className="btn-primary w-full" onClick={subscribe} disabled={busy}>
                    {busy && <Spinner className="border-white/40 border-t-white" />}
                    Subscribe
                  </button>
                  {subError && (
                    <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{subError}</p>
                  )}
                </div>
              )}

              {isActive && (
                <div className="mt-3">
                  <button className="btn-secondary w-full" onClick={openPortal} disabled={portalBusy}>
                    {portalBusy && <Spinner className="h-4 w-4" />}
                    Manage Billing
                  </button>
                  {portalError && (
                    <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{portalError}</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {(isActive || isExempt) && (
          <Card title="Want to add something?" subtitle="Tell us what you need and we will set it up for you.">
            <div className="px-4 pt-4">
              <p className="label mb-1">Anything specific we should know? <span className="text-muted font-normal">(optional)</span></p>
              <textarea
                className="input min-h-[72px] w-full resize-none"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any details that might help us get it right..."
              />
              <p className="mt-1 text-right text-[11px] text-muted">{note.length}/500</p>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {REQUEST_ROWS.map(({ name, label, comingSoon }) => {
                const alreadyEnabled = name !== 'custom' && addons.find((a) => a.addon_name === name)?.enabled;
                const rs = reqState[name] ?? 'idle';
                return (
                  <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium">{label}</span>
                      {comingSoon && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                          Coming soon
                        </span>
                      )}
                      {rs === 'sent' && (
                        <p className="mt-0.5 text-xs text-success-ink">Request sent — we'll be in touch.</p>
                      )}
                      {rs === 'error' && (
                        <p className="mt-0.5 text-xs text-danger">Could not send your request. Please try again or email us.</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {alreadyEnabled ? (
                        <Badge tone="success">Active</Badge>
                      ) : rs === 'sent' ? (
                        <Badge tone="neutral">Request sent</Badge>
                      ) : (
                        <button
                          className="btn-secondary"
                          disabled={rs === 'busy'}
                          onClick={() => sendRequest(name)}
                        >
                          {rs === 'busy' && <Spinner className="h-3.5 w-3.5" />}
                          {comingSoon ? 'Join waitlist' : 'Request'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

      </div>
    </>
  );
}
