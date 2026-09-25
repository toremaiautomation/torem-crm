import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useBookings, useClients, useLeads, useMessages } from '../data/queries';
import { attachRelations, groupConversations } from '../lib/analytics';
import { fmtRelative } from '../lib/format';
import { Badge, Card, DateRangePicker, PageHeader, Table} from '../components/ui';
import { useDateRange } from '../lib/useDateRange';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const PAGE_SIZE = 25;
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'lead', label: 'Captured a lead' },
  { key: 'booked', label: 'Booked' },
  { key: 'none', label: 'Chat only' },
];

export default function Conversations() {
  const { activeClientId, isAdmin } = useAuth();
  const { range, days, setDays } = useDateRange(30);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const messages = useMessages(activeClientId, range);
  const leads = useLeads(activeClientId, range);
  const bookings = useBookings(activeClientId, null);
  const clients = useClients(isAdmin && !activeClientId);
  const clientName = (id) => clients.data?.find((c) => c.id === id)?.business_name ?? (id ? '…' : 'Torem (legacy)');

  const loading = messages.isPending || leads.isPending || bookings.isPending;
  const error = messages.error || leads.error || bookings.error;

  const rows = useMemo(() => {
    if (loading || error) return [];
    let list = attachRelations(groupConversations(messages.data), leads.data, bookings.data);
    if (filter === 'lead') list = list.filter((c) => c.lead && !c.booking);
    if (filter === 'booked') list = list.filter((c) => c.booking);
    if (filter === 'none') list = list.filter((c) => !c.lead && !c.booking);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) => c.messages.some((m) => m.user_message?.toLowerCase().includes(needle) || m.ai_response?.toLowerCase().includes(needle)));
    }
    return list;
  }, [loading, error, messages.data, leads.data, bookings.data, filter, q]);

  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Conversations"
        subtitle="Every chat your AI assistant has handled."
        actions={<DateRangePicker days={days} onChange={(d) => { setDays(d); setPage(0); }} />}
      />

      <Card
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(0); }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? 'bg-navy text-white' : 'bg-surface-3 text-muted hover:text-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        title={
          <span className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="input w-64 pl-8"
              placeholder="Search messages…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
            />
          </span>
        }
      >
        {error && <div className="p-4"><ErrorState error={error} /></div>}
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table
            rowKey={(r) => r.session_id}
            rows={pageRows}
            onRowClick={(r) => navigate(`/conversations/${encodeURIComponent(r.session_id)}`)}
            empty={<EmptyState title="No conversations match">Try a wider date range or a different search.</EmptyState>}
            columns={[
              {
                key: 'preview',
                header: 'Conversation',
                render: (r) => (
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium">{r.preview}</p>
                    <p className="line-clamp-1 text-xs text-muted">{r.messages[0]?.ai_response}</p>
                  </div>
                ),
              },
              ...(isAdmin && !activeClientId ? [{ key: 'client', header: 'Client', render: (r) => <span className="text-muted">{clientName(r.client_id)}</span> }] : []),
              { key: 'count', header: 'Msgs', className: 'text-right', render: (r) => r.messages.length },
              {
                key: 'outcome',
                header: 'Outcome',
                render: (r) =>
                  r.booking ? <Badge tone="success">Booked</Badge> : r.lead ? <Badge tone="brand">Lead</Badge> : <Badge>Chat only</Badge>,
              },
              { key: 'last_at', header: 'Last activity', className: 'whitespace-nowrap text-muted', render: (r) => fmtRelative(r.last_at) },
            ]}
          />
        )}
        {rows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} of {rows.length}
            </span>
            <span className="flex gap-1">
              <button className="btn-secondary px-2 py-1" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn-secondary px-2 py-1" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
            </span>
          </div>
        )}
      </Card>
    </>
  );
}
