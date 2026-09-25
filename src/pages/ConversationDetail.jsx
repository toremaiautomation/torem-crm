import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, CalendarCheck, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useBookings, useLeads, useMessages } from '../data/queries';
import { fmtDateTime, fmtTime } from '../lib/format';
import { Badge, Card } from '../components/ui';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const STATUS_TONE = { confirmed: 'brand', completed: 'success', cancelled: 'danger', no_show: 'warning' };

export default function ConversationDetail() {
  const { sessionId } = useParams();
  const { activeClientId } = useAuth();
  const messages = useMessages(activeClientId, null);
  const leads = useLeads(activeClientId, null);
  const bookings = useBookings(activeClientId, null);

  const loading = messages.isPending || leads.isPending || bookings.isPending;
  const error = messages.error || leads.error || bookings.error;
  const thread = (messages.data ?? []).filter((m) => m.session_id === sessionId).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const lead = leads.data?.find((l) => l.session_ref === sessionId);
  const booking = bookings.data?.find((b) => b.session_ref === sessionId);

  return (
    <>
      <Link to="/conversations" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All conversations
      </Link>

      {error && <ErrorState error={error} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Transcript"
          subtitle={thread[0] ? fmtDateTime(thread[0].created_at) : ''}
          bodyClassName="space-y-4 p-4 sm:p-6"
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-3/4 odd:ml-auto" />)
          ) : thread.length === 0 ? (
            <EmptyState title="Conversation not found">It may be outside your date range or belong to another client.</EmptyState>
          ) : (
            thread.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white">
                    <p className="whitespace-pre-wrap">{m.user_message}</p>
                    <p className="mt-1 text-right text-[10px] text-white/70">{fmtTime(m.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-3 px-4 py-2.5 text-sm">
                    <p className="whitespace-pre-wrap">{m.ai_response}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Lead" bodyClassName="p-4 text-sm">
            {loading ? (
              <Skeleton className="h-16" />
            ) : lead ? (
              <div className="space-y-2">
                {lead.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted" />
                    <a className="hover:text-brand" href={`mailto:${lead.email}`}>{lead.email}</a>
                  </p>
                )}
                {lead.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted" />
                    <a className="hover:text-brand" href={`tel:${lead.phone}`}>{lead.phone}</a>
                  </p>
                )}
                {!lead.email && !lead.phone && <p className="text-muted">No contact info captured.</p>}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lead.booking_completed ? <Badge tone="success">Converted</Badge> : lead.followed_up_at ? <Badge tone="warning">Followed up</Badge> : <Badge>Pending follow-up</Badge>}
                </div>
                <p className="text-xs text-muted">Captured {fmtDateTime(lead.created_at)}</p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-muted">
                <User className="h-4 w-4" /> No lead captured in this chat.
              </p>
            )}
          </Card>

          <Card title="Booking" bodyClassName="p-4 text-sm">
            {loading ? (
              <Skeleton className="h-16" />
            ) : booking ? (
              <div className="space-y-2">
                <p className="font-medium">{booking.customer_name}</p>
                <p className="flex items-center gap-2 text-muted">
                  <CalendarCheck className="h-4 w-4" /> {fmtDateTime(booking.appointment_time)}
                </p>
                <Badge tone={STATUS_TONE[booking.status] ?? 'neutral'}>{booking.status.replace('_', ' ')}</Badge>
                {booking.calendar_event_id && <p className="text-xs text-muted">Synced to Google Calendar</p>}
              </div>
            ) : (
              <p className="text-muted">No appointment booked.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
