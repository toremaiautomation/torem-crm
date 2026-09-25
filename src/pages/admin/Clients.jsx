import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useAuth } from '../../auth/context';
import { useBookings, useClients, useLeads } from '../../data/queries';
import { rangeFromDays } from '../../lib/analytics';
import { fmtDate, fmtNumber, labelFor, PLAN_LABELS } from '../../lib/format';
import { Badge, Card, PageHeader, Table } from '../../components/ui';
import { EmptyState, ErrorState, Skeleton } from '../../components/Feedback';

export default function Clients() {
  const { setActiveClientId } = useAuth();
  const navigate = useNavigate();
  const clients = useClients();
  const range = useMemo(() => rangeFromDays(30), []);
  const leads = useLeads(null, range);
  const bookings = useBookings(null, range, 'created_at');

  const rows = useMemo(
    () =>
      (clients.data ?? []).map((c) => ({
        ...c,
        leads30: leads.data?.filter((l) => l.client_id === c.id).length,
        bookings30: bookings.data?.filter((b) => b.client_id === c.id && b.status !== 'cancelled').length,
      })),
    [clients.data, leads.data, bookings.data]
  );

  return (
    <>
      <PageHeader title="Clients" subtitle="Every business on Torem. Last 30 days of activity." />
      {clients.error && <ErrorState error={clients.error} retry={clients.refetch} />}
      <Card>
        {clients.isPending ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table
            rowKey={(r) => r.id}
            rows={rows}
            onRowClick={(r) => navigate(`/admin/clients/${r.id}`)}
            empty={<EmptyState title="No clients yet" />}
            columns={[
              { key: 'business_name', header: 'Business', render: (r) => (
                <div>
                  <p className="font-medium">{r.business_name}</p>
                  <p className="text-xs text-muted">{r.contact_email}</p>
                </div>
              ) },
              { key: 'plan_tier', header: 'Plan', render: (r) => <Badge tone="brand">{labelFor(PLAN_LABELS, r.plan_tier)}</Badge> },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
              { key: 'leads30', header: 'Leads', className: 'text-right', render: (r) => (r.leads30 == null ? '…' : fmtNumber(r.leads30)) },
              { key: 'bookings30', header: 'Bookings', className: 'text-right', render: (r) => (r.bookings30 == null ? '…' : fmtNumber(r.bookings30)) },
              { key: 'created_at', header: 'Since', className: 'whitespace-nowrap text-muted', render: (r) => fmtDate(r.created_at) },
              { key: 'view', header: '', className: 'text-right', render: (r) => (
                <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => {
                      setActiveClientId(r.id);
                      navigate('/');
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> View as
                  </button>
                  <Link to={`/admin/clients/${r.id}`} className="btn-secondary px-2 py-1 text-xs">Manage</Link>
                </span>
              ) },
            ]}
          />
        )}
      </Card>
    </>
  );
}
