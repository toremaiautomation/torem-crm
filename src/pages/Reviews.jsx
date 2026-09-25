import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Send, Star } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useAddons } from '../theme/context';
import { useBookings, useMarkJobComplete, useReviewRequests } from '../data/queries';
import { fmtDateTime, fmtNumber, fmtRelative, toDate } from '../lib/format';
import { Badge, Card, Modal, PageHeader, StatCard } from '../components/ui';
import { EmptyState, ErrorState, LockedFeature, Skeleton } from '../components/Feedback';

function Column({ title, count, children }) {
  return (
    <Card title={title} subtitle={`${count} ${count === 1 ? 'job' : 'jobs'}`} bodyClassName="divide-y divide-line">
      {children}
    </Card>
  );
}

function Job({ booking, children }) {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">{booking?.customer_name ?? 'Unknown customer'}</p>
      <p className="text-xs text-muted">{booking ? fmtDateTime(booking.appointment_time) : ''}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {booking && (
          <Link to={`/conversations/${encodeURIComponent(booking.session_ref)}`} className="text-xs font-medium text-brand hover:underline">
            View chat
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}

export default function Reviews() {
  const { activeClientId } = useAuth();
  const { enabled, addons } = useAddons();
  const bookings = useBookings(activeClientId, null);
  const reviews = useReviewRequests(activeClientId);
  const complete = useMarkJobComplete();
  const [confirm, setConfirm] = useState(null);

  const model = useMemo(() => {
    if (!bookings.data || !reviews.data) return null;
    const byId = new Map(bookings.data.map((b) => [b.id, b]));
    const requested = new Set(reviews.data.map((r) => r.booking_id));
    const now = new Date();
    return {
      ready: bookings.data.filter((b) => b.status === 'confirmed' && toDate(b.appointment_time) < now && !requested.has(b.id)).reverse(),
      queued: reviews.data.filter((r) => !r.review_sent_at).map((r) => ({ ...r, booking: byId.get(r.booking_id) })),
      sent: reviews.data.filter((r) => r.review_sent_at).map((r) => ({ ...r, booking: byId.get(r.booking_id) })),
    };
  }, [bookings.data, reviews.data]);

  if (!enabled('review_generation')) {
    return (
      <>
        <PageHeader title="Reviews" />
        <LockedFeature title="Review Generation" price={addons.find((a) => a.addon_name === 'review_generation')?.monthly_price}>
          Mark a job complete and Torem sends the review request at exactly the right moment — while the customer is still happy.
        </LockedFeature>
      </>
    );
  }

  const error = bookings.error || reviews.error;

  return (
    <>
      <PageHeader title="Reviews" subtitle="Mark jobs complete and Torem asks for the review." />
      {error && <ErrorState error={error} />}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {!model ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Ready to mark" value={fmtNumber(model.ready.length)} icon={CheckCircle2} />
            <StatCard label="Queued" value={fmtNumber(model.queued.length)} hint="Sending soon" icon={Send} tone="warning" />
            <StatCard label="Requests sent" value={fmtNumber(model.sent.length)} icon={Star} tone="success" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {!model ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80" />)
        ) : (
          <>
            <Column title="Past appointments" count={model.ready.length}>
              {model.ready.length === 0 ? (
                <EmptyState title="All caught up">Finished jobs waiting to be marked complete show up here.</EmptyState>
              ) : (
                model.ready.map((b) => (
                  <Job key={b.id} booking={b}>
                    <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => setConfirm(b)}>Mark complete</button>
                  </Job>
                ))
              )}
            </Column>
            <Column title="Queued for sending" count={model.queued.length}>
              {model.queued.length === 0 ? (
                <EmptyState title="Queue is empty" />
              ) : (
                model.queued.map((r) => (
                  <Job key={r.id} booking={r.booking}>
                    <Badge tone="warning">Marked {fmtRelative(r.marked_complete_at)}</Badge>
                  </Job>
                ))
              )}
            </Column>
            <Column title="Sent" count={model.sent.length}>
              {model.sent.length === 0 ? (
                <EmptyState title="No requests sent yet" />
              ) : (
                model.sent.map((r) => (
                  <Job key={r.id} booking={r.booking}>
                    <span className="flex items-center gap-2">
                      <Badge tone="success">Sent {fmtRelative(r.review_sent_at)}</Badge>
                      {r.review_link && (
                        <a href={r.review_link} target="_blank" rel="noreferrer" className="text-muted hover:text-brand" aria-label="Open review link">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </span>
                  </Job>
                ))
              )}
            </Column>
          </>
        )}
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Mark job complete?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirm(null)}>Back</button>
            <button
              className="btn-primary"
              disabled={complete.isPending}
              onClick={async () => {
                await complete.mutateAsync(confirm);
                setConfirm(null);
              }}
            >
              Mark complete & request review
            </button>
          </>
        }
      >
        {confirm && (
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{confirm.customer_name}</span> · {fmtDateTime(confirm.appointment_time)}
            <span className="mt-2 block">Torem will send the review request to {confirm.customer_email}.</span>
          </p>
        )}
      </Modal>
    </>
  );
}
