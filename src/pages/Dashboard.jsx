import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, MessageSquare, Moon, Repeat, Star, Users } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/context';
import { useBookings, useClients, useLeads, useMessages, useReviewRequests } from '../data/queries';
import { attachRelations, computeStats, groupConversations, hourHistogram, perDaySeries, perWeekSeries } from '../lib/analytics';
import { fmtNumber, fmtPercent, fmtRelative, labelFor, PLAN_LABELS } from '../lib/format';
import { Badge, Card, DateRangePicker, PageHeader, StatCard, Table} from '../components/ui';
import { useDateRange } from '../lib/useDateRange';
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback';

const tooltipStyle = { borderRadius: 8, border: '1px solid #d3e0f0', fontSize: 12 };

function AgencyTable({ clients, conversations, leads, bookings }) {
  const rows = clients.map((c) => {
    const conv = conversations.filter((x) => x.client_id === c.id).length;
    const lead = leads.filter((x) => x.client_id === c.id).length;
    const book = bookings.filter((x) => x.client_id === c.id && x.status !== 'cancelled').length;
    return { ...c, conv, lead, book, rate: conv ? lead / conv : 0 };
  });
  return (
    <Table
      rowKey={(r) => r.id}
      rows={rows.sort((a, b) => b.conv - a.conv)}
      columns={[
        {
          key: 'business_name',
          header: 'Client',
          render: (r) => (
            <Link to={`/admin/clients/${r.id}`} className="font-medium hover:text-brand">
              {r.business_name}
            </Link>
          ),
        },
        { key: 'plan_tier', header: 'Plan', render: (r) => <Badge tone="brand">{labelFor(PLAN_LABELS, r.plan_tier)}</Badge> },
        { key: 'conv', header: 'Conversations', className: 'text-right', render: (r) => fmtNumber(r.conv) },
        { key: 'lead', header: 'Leads', className: 'text-right', render: (r) => fmtNumber(r.lead) },
        { key: 'rate', header: 'Capture rate', className: 'text-right', render: (r) => fmtPercent(r.rate) },
        { key: 'book', header: 'Bookings', className: 'text-right', render: (r) => fmtNumber(r.book) },
      ]}
    />
  );
}

export default function Dashboard() {
  const { activeClientId, isAdmin } = useAuth();
  const { brand } = useTheme();
  const { range, days, setDays } = useDateRange(30);

  const messages = useMessages(activeClientId, range);
  const leads = useLeads(activeClientId, range);
  const bookings = useBookings(activeClientId, range, 'created_at');
  const reviews = useReviewRequests(activeClientId);
  const clients = useClients(isAdmin && !activeClientId);

  const loading = messages.isPending || leads.isPending || bookings.isPending || reviews.isPending;
  const error = messages.error || leads.error || bookings.error || reviews.error;

  const model = useMemo(() => {
    if (loading || error) return null;
    const conversations = attachRelations(groupConversations(messages.data), leads.data, bookings.data);
    const reviewsInRange = reviews.data.filter((r) => r.marked_complete_at >= range.from.toISOString());
    return {
      conversations,
      stats: computeStats({ conversations, leads: leads.data, bookings: bookings.data, reviews: reviewsInRange }),
      perDay: perDaySeries(range, conversations, leads.data),
      perWeek: perWeekSeries(range, leads.data, bookings.data),
      hours: hourHistogram(conversations),
      recent: conversations.slice(0, 6),
    };
  }, [loading, error, messages.data, leads.data, bookings.data, reviews.data, range]);

  const title = isAdmin && !activeClientId ? 'Agency overview' : `${brand.name} dashboard`;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`What your AI assistant handled in the last ${days} days.`}
        actions={<DateRangePicker days={days} onChange={setDays} />}
      />

      {error && <ErrorState error={error} retry={() => [messages, leads, bookings, reviews].forEach((q) => q.refetch())} />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading || !model ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard label="Conversations" value={fmtNumber(model.stats.conversations)} hint={`${fmtNumber(model.stats.messages)} messages`} icon={MessageSquare} />
            <StatCard label="Leads captured" value={fmtNumber(model.stats.leads)} hint={`${fmtPercent(model.stats.captureRate)} of conversations`} icon={Users} tone="success" />
            <StatCard label="Bookings" value={fmtNumber(model.stats.bookings)} hint={`${fmtPercent(model.stats.bookingRate)} of leads`} icon={CalendarCheck} tone="navy" />
            <StatCard label="Follow-ups sent" value={fmtNumber(model.stats.followUpsSent)} hint={`${fmtNumber(model.stats.followUpsPending)} pending`} icon={Repeat} tone="warning" />
            <StatCard label="Reviews requested" value={fmtNumber(model.stats.reviewsRequested)} hint={`${fmtNumber(model.stats.reviewsSent)} sent`} icon={Star} />
            <StatCard label="After hours" value={fmtPercent(model.stats.afterHoursPct)} hint="of chats outside 8am–6pm" icon={Moon} tone="neutral" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Conversations per day" subtitle="Leads captured shown underneath" className="lg:col-span-2" bodyClassName="p-4">
          {model ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={model.perDay} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="conv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5c6e84' }} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5c6e84' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="conversations" stroke="var(--brand)" strokeWidth={2} fill="url(#conv)" isAnimationActive={false} />
                <Area type="monotone" dataKey="leads" stroke="#34d399" strokeWidth={2} fill="transparent" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-60" />
          )}
        </Card>

        <Card title="When customers reach out" subtitle="Chats by hour of day" bodyClassName="p-4">
          {model ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={model.hours} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#5c6e84' }} interval={3} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5c6e84' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f0f4f9' }} />
                <Bar dataKey="count" name="Chats" fill="#0b1f3a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-60" />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Leads vs bookings" subtitle="Per week" bodyClassName="p-4">
          {model ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={model.perWeek} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5c6e84' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5c6e84' }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f0f4f9' }} />
                <Bar dataKey="leads" fill="var(--brand)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="bookings" fill="#34d399" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton className="h-52" />
          )}
        </Card>

        <Card
          title={isAdmin && !activeClientId ? 'By client' : 'Recent conversations'}
          className="lg:col-span-2"
          actions={
            !(isAdmin && !activeClientId) && (
              <Link to="/conversations" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            )
          }
        >
          {!model ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : isAdmin && !activeClientId ? (
            clients.data ? (
              <AgencyTable clients={clients.data} conversations={model.conversations} leads={leads.data} bookings={bookings.data} />
            ) : (
              <Skeleton className="m-4 h-40" />
            )
          ) : (
            <Table
              rowKey={(r) => r.session_id}
              rows={model.recent}
              empty={<EmptyState title="No conversations yet">Once your AI assistant starts chatting, they'll show up here.</EmptyState>}
              columns={[
                {
                  key: 'preview',
                  header: 'First message',
                  render: (r) => (
                    <Link to={`/conversations/${encodeURIComponent(r.session_id)}`} className="line-clamp-1 font-medium hover:text-brand">
                      {r.preview}
                    </Link>
                  ),
                },
                { key: 'messages', header: 'Msgs', className: 'text-right', render: (r) => r.messages.length },
                {
                  key: 'status',
                  header: 'Outcome',
                  render: (r) =>
                    r.booking ? <Badge tone="success">Booked</Badge> : r.lead ? <Badge tone="brand">Lead</Badge> : <Badge>Chat only</Badge>,
                },
                { key: 'last_at', header: 'When', className: 'whitespace-nowrap text-muted', render: (r) => fmtRelative(r.last_at) },
              ]}
            />
          )}
        </Card>
      </div>
    </>
  );
}
