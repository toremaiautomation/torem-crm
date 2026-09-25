import { eachDayOfInterval, eachWeekOfInterval, endOfDay, format, getHours, isWeekend, startOfDay, startOfWeek, subDays } from 'date-fns';
import { toDate } from './format';

// Day-aligned so the range (and the query keys built from it) is stable across renders.
export function rangeFromDays(days) {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, days - 1));
  return { from, to, days };
}

export function groupConversations(messages) {
  const map = new Map();
  for (const m of messages) {
    let c = map.get(m.session_id);
    if (!c) {
      c = { session_id: m.session_id, client_id: m.client_id, messages: [], first_at: m.created_at, last_at: m.created_at };
      map.set(m.session_id, c);
    }
    c.messages.push(m);
    if (m.created_at < c.first_at) c.first_at = m.created_at;
    if (m.created_at > c.last_at) c.last_at = m.created_at;
  }
  const list = [...map.values()];
  for (const c of list) {
    c.messages.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    c.preview = c.messages[0]?.user_message ?? '';
  }
  return list.sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
}

export function attachRelations(conversations, leads, bookings) {
  const leadBySession = new Map(leads.map((l) => [l.session_ref, l]));
  const bookingBySession = new Map(bookings.map((b) => [b.session_ref, b]));
  return conversations.map((c) => ({
    ...c,
    lead: leadBySession.get(c.session_id) ?? null,
    booking: bookingBySession.get(c.session_id) ?? null,
  }));
}

export const isAfterHours = (d) => {
  const date = toDate(d);
  const h = getHours(date);
  return isWeekend(date) || h < 8 || h >= 18;
};

export function computeStats({ conversations, leads, bookings, reviews }) {
  const convCount = conversations.length;
  const msgCount = conversations.reduce((n, c) => n + c.messages.length, 0);
  const leadCount = leads.length;
  const bookingCount = bookings.filter((b) => b.status !== 'cancelled').length;
  const followUpsSent = leads.filter((l) => l.followed_up_at).length;
  const afterHours = conversations.filter((c) => isAfterHours(c.first_at)).length;
  return {
    conversations: convCount,
    messages: msgCount,
    leads: leadCount,
    captureRate: convCount ? leadCount / convCount : 0,
    bookings: bookingCount,
    bookingRate: leadCount ? bookingCount / leadCount : 0,
    followUpsSent,
    followUpsPending: leads.filter((l) => !l.followed_up_at && !l.booking_completed && (l.email || l.phone)).length,
    reviewsRequested: reviews.length,
    reviewsSent: reviews.filter((r) => r.review_sent_at).length,
    afterHoursPct: convCount ? afterHours / convCount : 0,
  };
}

const dayKey = (d) => format(toDate(d), 'yyyy-MM-dd');

export function perDaySeries(range, conversations, leads) {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const conv = new Map();
  const lead = new Map();
  conversations.forEach((c) => conv.set(dayKey(c.first_at), (conv.get(dayKey(c.first_at)) ?? 0) + 1));
  leads.forEach((l) => lead.set(dayKey(l.created_at), (lead.get(dayKey(l.created_at)) ?? 0) + 1));
  return days.map((d) => ({
    date: format(d, 'MMM d'),
    conversations: conv.get(dayKey(d)) ?? 0,
    leads: lead.get(dayKey(d)) ?? 0,
  }));
}

export function perWeekSeries(range, leads, bookings) {
  const weeks = eachWeekOfInterval({ start: range.from, end: range.to }, { weekStartsOn: 1 });
  const wk = (d) => format(startOfWeek(toDate(d), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const lead = new Map();
  const book = new Map();
  leads.forEach((l) => lead.set(wk(l.created_at), (lead.get(wk(l.created_at)) ?? 0) + 1));
  bookings.filter((b) => b.status !== 'cancelled').forEach((b) => book.set(wk(b.created_at), (book.get(wk(b.created_at)) ?? 0) + 1));
  return weeks.map((w) => ({
    week: format(w, 'MMM d'),
    leads: lead.get(format(w, 'yyyy-MM-dd')) ?? 0,
    bookings: book.get(format(w, 'yyyy-MM-dd')) ?? 0,
  }));
}

export function hourHistogram(conversations) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: format(new Date(2000, 0, 1, h), 'ha'), count: 0 }));
  conversations.forEach((c) => (buckets[getHours(toDate(c.first_at))].count += 1));
  return buckets;
}

export function leadStatus(lead) {
  if (lead.booking_completed) return 'converted';
  if (lead.followed_up_at) return 'sent';
  if (lead.email || lead.phone) return 'pending';
  return 'no_contact';
}
