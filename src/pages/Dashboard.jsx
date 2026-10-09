import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { subDays } from 'date-fns';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, DollarSign, MessageSquare, Moon, Repeat, Star, Users } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/context';
import { useBookings, useClient, useClients, useLeads, useMessages, useReviewRequests } from '../data/queries';
import { attachRelations, computeStats, groupConversations, hourHistogram, isAfterHours, perDaySeries, perWeekSeries } from '../lib/analytics';
import { fmtMoney, fmtNumber, fmtPercent, fmtRelative, labelFor, PLAN_LABELS } from '../lib/format';
import { Badge, Card, DateRangePicker, PageHeader, StatCard, Table} from '../components/ui';
import { useDateRange } from '../lib/useDateRange';
import { EmptyState, ErrorState, Reveal, Skeleton } from '../components/Feedback';

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

function ResultTile({ label, value, cur, prev, delta, formatter = fmtNumber, caption, icon: Icon }) {
  const isNew = prev === 0 && cur > 0;
  const trend = isNew
    ? { up: true, label: 'New' }
    : delta !== 0 ? { up: delta > 0, label: delta > 0 ? `+${formatter(delta)}` : formatter(delta) } : undefined;
  const hint = caption != null ? caption : (delta === 0 ? 'No change' : undefined);
  return <StatCard label={label} value={value} icon={Icon} trend={trend} hint={hint} />;
}

export default function Dashboard() {
  const { activeClientId, isAdmin } = useAuth();
  const { brand } = useTheme();
  const { range, days, setDays } = useDateRange(30);

  const prevRange = { from: subDays(range.from, days), to: subDays(range.to, days) };

  const messages = useMessages(activeClientId, range);
  const leads = useLeads(activeClientId, range);
  const bookings = useBookings(activeClientId, range, 'created_at');
  const reviews = useReviewRequests(activeClientId);
  const clients = useClients(isAdmin && !activeClientId);
  const client = useClient(activeClientId);
  const prevMessages = useMessages(activeClientId, prevRange);
  const prevLeads = useLeads(activeClientId, prevRange);
  const prevBookings = useBookings(activeClientId, prevRange, 'created_at');

  const loading = messages.isPending || leads.isPending || bookings.isPending || reviews.isPending;
  const error = messages.error || leads.error || bookings.error || reviews.error;
  const stripLoading = loading || prevMessages.isPending || prevLeads.isPending || prevBookings.isPending || client.isPending;

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

  const strip = useMemo(() => {
    if (stripLoading || !model) return null;
    const prevConvs = groupConversations(prevMessages.data ?? []);
    const prevLeadsData = prevLeads.data ?? [];
    const prevBookingCount = (prevBookings.data ?? []).filter((b) => b.status !== 'cancelled').length;
    const avgJobValue = client.data?.config?.avg_job_value ?? null;

    const curLeads = model.stats.leads;
    const curBookings = model.stats.bookings;
    const curAfterHours = model.conversations.filter((c) => isAfterHours(c.first_at)).length;
    const prevAfterHours = prevConvs.filter((c) => isAfterHours(c.first_at)).length;

    return {
      leads: { cur: curLeads, prev: prevLeadsData.length, delta: curLeads - prevLeadsData.length },
      bookings: { cur: curBookings, prev: prevBookingCount, delta: curBookings - prevBookingCount },
      afterHours: { cur: curAfterHours, prev: prevAfterHours, delta: curAfterHours - prevAfterHours },
      estimated: avgJobValue != null
        ? { cur: curBookings * avgJobValue, prev: prevBookingCount * avgJobValue, delta: (curBookings - prevBookingCount) * avgJobValue, avgJobValue }
        : null,
    };
  }, [stripLoading, model, prevMessages.data, prevLeads.data, prevBookings.data, client.data]);

  const title = isAdmin && !activeClientId ? 'Agency overview' : `${brand.name} dashboard`;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`What your AI assistant handled in the last ${days} days.`}
        actions={<DateRangePicker days={days} onChange={setDays} />}
      />

      {error && <ErrorState error={error} retry={() => [messages, leads, bookings, reviews].forEach((q) => q.refetch())} />}

      {activeClientId && (
        <>
          <p className="mb-2 text-xs text-muted">Compared with the previous {days} days</p>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stripLoading || !strip ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : strip.leads.cur === 0 && strip.bookings.cur === 0 && strip.afterHours.cur === 0 && !strip.estimated ? (
              <p className="col-span-2 py-6 text-center text-sm text-muted lg:col-span-4">
                No activity yet in this period — conversations will appear here as your assistant starts chatting.
              </p>
            ) : (
              <>
                <ResultTile label="Leads captured" value={fmtNumber(strip.leads.cur)} cur={strip.leads.cur} prev={strip.leads.prev} delta={strip.leads.delta}
                  caption={`${fmtPercent(model.stats.captureRate)} of conversations`} icon={Users} />
                <ResultTile label="Bookings" value={fmtNumber(strip.bookings.cur)} cur={strip.bookings.cur} prev={strip.bookings.prev} delta={strip.bookings.delta}
                  caption={`${fmtPercent(model.stats.bookingRate)} of leads`} icon={CalendarCheck} />
                <ResultTile label="After-hours chats answered" value={fmtNumber(strip.afterHours.cur)} cur={strip.afterHours.cur} prev={strip.afterHours.prev} delta={strip.afterHours.delta}
                  caption={`${fmtPercent(model.stats.afterHoursPct)} of chats`} icon={Moon} />
                {strip.estimated ? (
                  <ResultTile
                    label="Estimated"
                    value={fmtMoney(strip.estimated.cur)}
                    cur={strip.estimated.cur}
                    prev={strip.estimated.prev}
                    delta={strip.estimated.delta}
                    formatter={fmtMoney}
                    caption={`${strip.bookings.cur} booking${strip.bookings.cur !== 1 ? 's' : ''} × ${fmtMoney(strip.estimated.avgJobValue)}`}
                    icon={DollarSign}
                  />
                ) : (
                  <Link to="/settings" className="stat-card-glass">
                    <p className="stat-card-label">Estimated</p>
                    <p className="stat-card-num text-muted">—</p>
                    <p className="stat-card-sub mt-1 text-brand hover:underline">Add your average job value</p>
                  </Link>
                )}
              </>
            )}
          </div>
        </>
      )}

      <div className={`grid gap-3 sm:gap-4 ${isAdmin && !activeClientId ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {loading || !model ? (
          Array.from({ length: isAdmin && !activeClientId ? 6 : 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Reveal delay={0}><StatCard label="Conversations" value={fmtNumber(model.stats.conversations)} hint={`${fmtNumber(model.stats.messages)} messages`} icon={MessageSquare} /></Reveal>
            {isAdmin && !activeClientId && <Reveal delay={70}><StatCard label="Leads captured" value={fmtNumber(model.stats.leads)} hint="of conversations" icon={Users} tone="success" trend={{ label: fmtPercent(model.stats.captureRate), up: true }} /></Reveal>}
            {isAdmin && !activeClientId && <Reveal delay={140}><StatCard label="Bookings" value={fmtNumber(model.stats.bookings)} hint="of leads" icon={CalendarCheck} tone="navy" trend={{ label: fmtPercent(model.stats.bookingRate), up: true }} /></Reveal>}
            <Reveal delay={isAdmin && !activeClientId ? 210 : 70}><StatCard label="Follow-ups sent" value={fmtNumber(model.stats.followUpsSent)} hint={`${fmtNumber(model.stats.followUpsPending)} pending`} icon={Repeat} tone="warning" /></Reveal>
            <Reveal delay={isAdmin && !activeClientId ? 280 : 140}><StatCard label="Reviews requested" value={fmtNumber(model.stats.reviewsRequested)} hint={`${fmtNumber(model.stats.reviewsSent)} sent`} icon={Star} /></Reveal>
            {isAdmin && !activeClientId && <Reveal delay={350}><StatCard label="After hours" value={fmtPercent(model.stats.afterHoursPct)} hint="outside 8am–6pm" icon={Moon} tone="neutral" /></Reveal>}
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0} className="lg:col-span-2">
          <Card title="Conversations per day" subtitle="Leads captured shown underneath" bodyClassName="p-4">
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
        </Reveal>

        <Reveal delay={70}>
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
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0}>
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
        </Reveal>

        <Reveal delay={70} className="lg:col-span-2"><Card
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
        </Card></Reveal>
      </div>
    </>
  );
}
