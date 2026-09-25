import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, List, XCircle } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useAddons } from '../theme/context';
import { useBookings, useMarkJobComplete, useUpdateBookingStatus } from '../data/queries';
import { fmtDateTime, fmtTime, toDate } from '../lib/format';
import { Badge, Card, Modal, PageHeader, Table } from '../components/ui';
import { EmptyState, ErrorState, LockedFeature, Skeleton } from '../components/Feedback';

const STATUS_TONE = { confirmed: 'brand', completed: 'success', cancelled: 'danger', no_show: 'warning' };
const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status.replace('_', ' ')}</Badge>;

function useBookingActions() {
  const complete = useMarkJobComplete();
  const update = useUpdateBookingStatus();
  const { enabled } = useAddons();
  const [confirm, setConfirm] = useState(null);

  const modal = (
    <Modal
      open={!!confirm}
      onClose={() => setConfirm(null)}
      title={confirm?.action === 'cancel' ? 'Cancel this appointment?' : 'Mark job complete?'}
      footer={
        <>
          <button className="btn-secondary" onClick={() => setConfirm(null)}>Back</button>
          <button
            className={confirm?.action === 'cancel' ? 'btn-danger' : 'btn-primary'}
            disabled={complete.isPending || update.isPending}
            onClick={async () => {
              if (confirm.action === 'cancel') await update.mutateAsync({ bookingId: confirm.booking.id, status: 'cancelled' });
              else if (enabled('review_generation')) await complete.mutateAsync(confirm.booking);
              else await update.mutateAsync({ bookingId: confirm.booking.id, status: 'completed' });
              setConfirm(null);
            }}
          >
            {confirm?.action === 'cancel' ? 'Cancel appointment' : 'Mark complete'}
          </button>
        </>
      }
    >
      {confirm && (
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{confirm.booking.customer_name}</span> · {fmtDateTime(confirm.booking.appointment_time)}
          {confirm.action === 'complete' && enabled('review_generation') && (
            <span className="mt-2 block">Torem will automatically send the customer a review request.</span>
          )}
          {confirm.action === 'cancel' && <span className="mt-2 block">The customer will not be notified automatically.</span>}
        </p>
      )}
    </Modal>
  );

  return { setConfirm, modal };
}

function Actions({ booking, setConfirm }) {
  const past = toDate(booking.appointment_time) < new Date();
  if (booking.status !== 'confirmed') return null;
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {past && (
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setConfirm({ booking, action: 'complete' })}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
        </button>
      )}
      <button className="btn-ghost px-2 py-1 text-xs text-danger hover:text-danger" onClick={() => setConfirm({ booking, action: 'cancel' })}>
        <XCircle className="h-3.5 w-3.5" /> Cancel
      </button>
    </div>
  );
}

function BookingTable({ rows, setConfirm, empty }) {
  return (
    <Table
      rowKey={(r) => r.id}
      rows={rows}
      empty={empty}
      columns={[
        { key: 'customer_name', header: 'Customer', render: (r) => (
          <div>
            <p className="font-medium">{r.customer_name}</p>
            <p className="text-xs text-muted">{r.customer_email}</p>
          </div>
        ) },
        { key: 'appointment_time', header: 'Appointment', className: 'whitespace-nowrap', render: (r) => fmtDateTime(r.appointment_time) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'calendar_event_id', header: 'Calendar', render: (r) => (r.calendar_event_id ? <span className="text-xs text-success-ink">Synced</span> : <span className="text-xs text-muted">Not synced</span>) },
        { key: 'chat', header: '', render: (r) => (
          <Link to={`/conversations/${encodeURIComponent(r.session_ref)}`} className="text-xs font-medium text-brand hover:underline">View chat</Link>
        ) },
        { key: 'actions', header: '', className: 'text-right', render: (r) => <Actions booking={r} setConfirm={setConfirm} /> },
      ]}
    />
  );
}

function MonthCalendar({ month, bookings, onMonth, setConfirm }) {
  const [selected, setSelected] = useState(null);
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const byDay = (d) => bookings.filter((b) => isSameDay(toDate(b.appointment_time), d));
  const selectedRows = selected ? byDay(selected) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        className="lg:col-span-2"
        title={format(month, 'MMMM yyyy')}
        actions={
          <div className="flex gap-1">
            <button className="btn-ghost px-2" onClick={() => onMonth(subMonths(month, 1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
            <button className="btn-secondary px-2 py-1 text-xs" onClick={() => onMonth(new Date())}>Today</button>
            <button className="btn-ghost px-2" onClick={() => onMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
          </div>
        }
        bodyClassName="p-3"
      >
        <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const rows = byDay(d);
            const active = selected && isSameDay(d, selected);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={`flex min-h-16 flex-col rounded-lg border p-1 text-left text-xs transition sm:min-h-20 ${
                  active ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface'
                } ${isSameMonth(d, month) ? '' : 'opacity-40'}`}
              >
                <span className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${isSameDay(d, new Date()) ? 'bg-navy text-white' : ''}`}>
                  {format(d, 'd')}
                </span>
                {rows.slice(0, 2).map((b) => (
                  <span key={b.id} className={`truncate rounded px-1 ${b.status === 'cancelled' ? 'line-through text-muted' : 'bg-brand/10 text-brand'}`}>
                    {fmtTime(b.appointment_time)} {b.customer_name.split(' ')[0]}
                  </span>
                ))}
                {rows.length > 2 && <span className="px-1 text-muted">+{rows.length - 2} more</span>}
              </button>
            );
          })}
        </div>
      </Card>
      <Card title={selected ? format(selected, 'EEEE, MMM d') : 'Select a day'} bodyClassName="divide-y divide-line">
        {!selected ? (
          <p className="p-4 text-sm text-muted">Click a day to see its appointments.</p>
        ) : selectedRows.length === 0 ? (
          <p className="p-4 text-sm text-muted">No appointments.</p>
        ) : (
          selectedRows.map((b) => (
            <div key={b.id} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{b.customer_name}</p>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-muted">{fmtTime(b.appointment_time)} · {b.customer_email}</p>
              <div className="mt-2 flex items-center justify-between">
                <Link to={`/conversations/${encodeURIComponent(b.session_ref)}`} className="text-xs font-medium text-brand hover:underline">View chat</Link>
                <Actions booking={b} setConfirm={setConfirm} />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

export default function Bookings() {
  const { activeClientId } = useAuth();
  const { enabled, addons } = useAddons();
  const [view, setView] = useState('list');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const bookings = useBookings(activeClientId, null);
  const { setConfirm, modal } = useBookingActions();

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const list = bookings.data ?? [];
    return {
      upcoming: list.filter((b) => toDate(b.appointment_time) >= now),
      past: list.filter((b) => toDate(b.appointment_time) < now).reverse(),
    };
  }, [bookings.data]);

  if (!enabled('booking')) {
    return (
      <>
        <PageHeader title="Bookings" />
        <LockedFeature title="Booking Built In" price={addons.find((a) => a.addon_name === 'booking')?.monthly_price}>
          Let customers book appointments directly inside the chat. Confirmations and reminders go out automatically, and everything lands on your calendar.
        </LockedFeature>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Appointments your assistant booked, synced to your calendar."
        actions={
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
            {[{ k: 'list', I: List, l: 'List' }, { k: 'calendar', I: CalendarDays, l: 'Calendar' }].map(({ k, I, l }) => (
              <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === k ? 'bg-navy text-white' : 'text-muted hover:text-ink'}`}>
                <I className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
          </div>
        }
      />
      {bookings.error && <ErrorState error={bookings.error} retry={bookings.refetch} />}
      {bookings.isPending ? (
        <Skeleton className="h-96" />
      ) : view === 'calendar' ? (
        <MonthCalendar month={month} onMonth={setMonth} bookings={bookings.data} setConfirm={setConfirm} />
      ) : (
        <div className="space-y-4">
          <Card title="Upcoming" subtitle={`${upcoming.length} scheduled`}>
            <BookingTable rows={upcoming} setConfirm={setConfirm} empty={<EmptyState icon={CalendarDays} title="Nothing scheduled">New appointments booked through chat will appear here.</EmptyState>} />
          </Card>
          <Card title="Past" subtitle="Mark finished jobs complete to trigger review requests">
            <BookingTable rows={past} setConfirm={setConfirm} empty={<EmptyState title="No past appointments" />} />
          </Card>
        </div>
      )}
      {modal}
    </>
  );
}
