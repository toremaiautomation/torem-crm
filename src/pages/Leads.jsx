import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Mail, Phone } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useClients, useLeads } from '../data/queries';
import { leadStatus } from '../lib/analytics';
import { fmtDateTime, fmtRelative } from '../lib/format';
import { Badge, Card, DateRangePicker, PageHeader, Table} from '../components/ui';
import { useDateRange } from '../lib/useDateRange';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const STATUS = {
  converted: { label: 'Booked', tone: 'success' },
  sent: { label: 'Followed up', tone: 'warning' },
  pending: { label: 'Needs follow-up', tone: 'brand' },
  no_contact: { label: 'No contact info', tone: 'neutral' },
};

const FILTERS = [{ key: 'all', label: 'All' }, ...Object.entries(STATUS).map(([key, v]) => ({ key, label: v.label }))];

function exportCsv(rows) {
  const header = ['email', 'phone', 'status', 'captured_at', 'followed_up_at', 'session'];
  const lines = rows.map((r) => [r.email ?? '', r.phone ?? '', leadStatus(r), r.created_at, r.followed_up_at ?? '', r.session_ref]);
  const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'leads.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Leads() {
  const { activeClientId, isAdmin } = useAuth();
  const { range, days, setDays } = useDateRange(30);
  const [filter, setFilter] = useState('all');
  const leads = useLeads(activeClientId, range);
  const clients = useClients(isAdmin && !activeClientId);
  const clientName = (id) => clients.data?.find((c) => c.id === id)?.business_name ?? '…';

  const rows = useMemo(() => {
    const list = leads.data ?? [];
    return filter === 'all' ? list : list.filter((l) => leadStatus(l) === filter);
  }, [leads.data, filter]);

  const counts = useMemo(() => {
    const c = { all: leads.data?.length ?? 0 };
    for (const l of leads.data ?? []) c[leadStatus(l)] = (c[leadStatus(l)] ?? 0) + 1;
    return c;
  }, [leads.data]);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Contact info your assistant captured from conversations."
        actions={
          <>
            <DateRangePicker days={days} onChange={setDays} />
            <button className="btn-secondary" onClick={() => exportCsv(rows)} disabled={!rows.length}>
              <Download className="h-4 w-4" /> CSV
            </button>
          </>
        }
      />

      <Card
        title={
          <span className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? 'bg-navy text-white' : 'bg-surface-3 text-muted hover:text-ink'}`}
              >
                {f.label} <span className="opacity-60">{counts[f.key] ?? 0}</span>
              </button>
            ))}
          </span>
        }
      >
        {leads.error && <div className="p-4"><ErrorState error={leads.error} retry={leads.refetch} /></div>}
        {leads.isPending ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table
            rowKey={(r) => r.id}
            rows={rows}
            empty={<EmptyState title="No leads in this range">Leads appear here when your assistant captures an email or phone number.</EmptyState>}
            columns={[
              {
                key: 'contact',
                header: 'Contact',
                render: (r) => (
                  <div className="space-y-0.5 text-sm">
                    {r.email && (
                      <a className="flex items-center gap-1.5 hover:text-brand" href={`mailto:${r.email}`}>
                        <Mail className="h-3.5 w-3.5 text-muted" /> {r.email}
                      </a>
                    )}
                    {r.phone && (
                      <a className="flex items-center gap-1.5 hover:text-brand" href={`tel:${r.phone}`}>
                        <Phone className="h-3.5 w-3.5 text-muted" /> {r.phone}
                      </a>
                    )}
                    {!r.email && !r.phone && <span className="text-muted">—</span>}
                  </div>
                ),
              },
              ...(isAdmin && !activeClientId ? [{ key: 'client', header: 'Client', render: (r) => <span className="text-muted">{clientName(r.client_id)}</span> }] : []),
              { key: 'status', header: 'Status', render: (r) => <Badge tone={STATUS[leadStatus(r)].tone}>{STATUS[leadStatus(r)].label}</Badge> },
              { key: 'followed_up_at', header: 'Followed up', className: 'whitespace-nowrap text-muted', render: (r) => (r.followed_up_at ? fmtDateTime(r.followed_up_at) : '—') },
              { key: 'created_at', header: 'Captured', className: 'whitespace-nowrap text-muted', render: (r) => fmtRelative(r.created_at) },
              {
                key: 'session_ref',
                header: '',
                className: 'text-right',
                render: (r) => (
                  <Link to={`/conversations/${encodeURIComponent(r.session_ref)}`} className="text-xs font-medium text-brand hover:underline">
                    View chat
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}
