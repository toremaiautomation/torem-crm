import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Mail, Phone, Repeat, Send, Trophy } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useAddons } from '../theme/context';
import { useLeads } from '../data/queries';
import { leadStatus } from '../lib/analytics';
import { fmtDateTime, fmtNumber, fmtPercent, fmtRelative } from '../lib/format';
import { Badge, Card, DateRangePicker, PageHeader, StatCard, Table} from '../components/ui';
import { useDateRange } from '../lib/useDateRange';
import { EmptyState, ErrorState, LockedFeature, Skeleton } from '../components/Feedback';

const TABS = [
  { key: 'pending', label: 'Waiting to send', tone: 'brand' },
  { key: 'sent', label: 'Sent', tone: 'warning' },
  { key: 'converted', label: 'Converted', tone: 'success' },
];

export default function FollowUps() {
  const { activeClientId } = useAuth();
  const { enabled, addons } = useAddons();
  const { range, days, setDays } = useDateRange(90);
  const [tab, setTab] = useState('pending');
  const leads = useLeads(activeClientId, range);

  const groups = useMemo(() => {
    const g = { pending: [], sent: [], converted: [] };
    for (const l of leads.data ?? []) {
      const s = leadStatus(l);
      if (g[s]) g[s].push(l);
    }
    return g;
  }, [leads.data]);

  if (!enabled('automated_followup')) {
    return (
      <>
        <PageHeader title="Follow-ups" />
        <LockedFeature title="Automated Follow-Up" price={addons.find((a) => a.addon_name === 'automated_followup')?.monthly_price}>
          When a chat captures an email but doesn't end in a booking, Torem automatically follows up to bring the customer back — no manual chasing.
        </LockedFeature>
      </>
    );
  }

  const total = groups.pending.length + groups.sent.length + groups.converted.length;
  const rows = groups[tab];

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="Leads that didn't book right away, and what happened next."
        actions={<DateRangePicker days={days} onChange={setDays} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {leads.isPending ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Waiting to send" value={fmtNumber(groups.pending.length)} hint="Sends automatically after the chat goes quiet" icon={Clock} />
            <StatCard label="Sent" value={fmtNumber(groups.sent.length)} icon={Send} tone="warning" />
            <StatCard label="Converted" value={fmtNumber(groups.converted.length)} icon={Trophy} tone="success" />
            <StatCard label="Recovery rate" value={fmtPercent(total ? groups.converted.length / total : 0)} hint="of leads that ended up booking" icon={Repeat} tone="navy" />
          </>
        )}
      </div>

      <Card
        className="mt-6"
        title={
          <span className="flex gap-2">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-full px-3 py-1 text-xs font-medium ${tab === t.key ? 'bg-navy text-white' : 'bg-surface-3 text-muted hover:text-ink'}`}>
                {t.label} <span className="opacity-60">{groups[t.key].length}</span>
              </button>
            ))}
          </span>
        }
      >
        {leads.error && <div className="p-4"><ErrorState error={leads.error} retry={leads.refetch} /></div>}
        {leads.isPending ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table
            rowKey={(r) => r.id}
            rows={rows}
            empty={<EmptyState icon={Repeat} title="Nothing here">No leads in this state for the selected range.</EmptyState>}
            columns={[
              { key: 'contact', header: 'Contact', render: (r) => (
                <div className="space-y-0.5">
                  {r.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted" /> {r.email}</p>}
                  {r.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted" /> {r.phone}</p>}
                </div>
              ) },
              { key: 'created_at', header: 'Lead captured', className: 'whitespace-nowrap text-muted', render: (r) => fmtRelative(r.created_at) },
              { key: 'followed_up_at', header: 'Follow-up sent', className: 'whitespace-nowrap text-muted', render: (r) => (r.followed_up_at ? fmtDateTime(r.followed_up_at) : <Badge>Queued</Badge>) },
              { key: 'chat', header: '', className: 'text-right', render: (r) => (
                <Link to={`/conversations/${encodeURIComponent(r.session_ref)}`} className="text-xs font-medium text-brand hover:underline">View chat</Link>
              ) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
