import { supabase } from '../lib/supabase';

const PAGE = 1000;

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

async function fetchAll(build) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

function scoped(query, clientId) {
  return clientId ? query.eq('client_id', clientId) : query;
}

function inRange(query, range, column) {
  if (range?.from) query = query.gte(column, range.from.toISOString());
  if (range?.to) query = query.lte(column, range.to.toISOString());
  return query;
}

async function single(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

export const supabaseApi = {
  auth: {
    async getSession() {
      const { data } = await requireClient().auth.getSession();
      return data.session;
    },
    onAuthStateChange(cb) {
      const { data } = requireClient().auth.onAuthStateChange((event, session) => cb(session, event));
      return () => data.subscription.unsubscribe();
    },
    signInWithPassword: (email, password) => requireClient().auth.signInWithPassword({ email, password }),
    signInWithOtp: (email) =>
      requireClient().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }),
    resetPassword: (email) =>
      requireClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
    updatePassword: (password) => requireClient().auth.updateUser({ password }),
    signOut: () => requireClient().auth.signOut(),
    getProfile: (userId) => single(requireClient().from('profiles').select('*').eq('user_id', userId).single()),
  },

  listClients: () => fetchAll(() => requireClient().from('clients').select('*').order('business_name')),

  async getClient(clientId) {
    const db = requireClient();
    const [client, config, addons] = await Promise.all([
      single(db.from('clients').select('*').eq('id', clientId).single()),
      single(db.from('client_config').select('*').eq('client_id', clientId).maybeSingle()),
      single(db.from('client_addons').select('*').eq('client_id', clientId)),
    ]);
    return { client, config: config ?? { client_id: clientId }, addons };
  },

  updateClient: (clientId, patch) =>
    single(requireClient().from('clients').update(patch).eq('id', clientId).select().single()),

  updateClientConfig: (clientId, patch) =>
    single(
      requireClient()
        .from('client_config')
        .upsert({ client_id: clientId, ...patch, updated_at: new Date().toISOString() })
        .select()
        .single()
    ),

  async setAddon(clientId, addonName, enabled, monthlyPrice) {
    const db = requireClient();
    const existing = await single(
      db.from('client_addons').select('id').eq('client_id', clientId).eq('addon_name', addonName).maybeSingle()
    );
    if (existing) {
      return single(db.from('client_addons').update({ enabled, monthly_price: monthlyPrice }).eq('id', existing.id).select().single());
    }
    return single(
      db
        .from('client_addons')
        .insert({ client_id: clientId, addon_name: addonName, enabled, monthly_price: monthlyPrice, enabled_at: new Date().toISOString() })
        .select()
        .single()
    );
  },

  listMessages: (clientId, range) =>
    fetchAll(() =>
      inRange(scoped(requireClient().from('chat_sessions').select('*'), clientId), range, 'created_at').order('created_at')
    ),

  listLeads: (clientId, range) =>
    fetchAll(() =>
      inRange(scoped(requireClient().from('leads').select('*'), clientId), range, 'created_at').order('created_at', { ascending: false })
    ),

  listBookings: (clientId, range, by = 'appointment_time') =>
    fetchAll(() =>
      inRange(scoped(requireClient().from('bookings').select('*'), clientId), range, by).order('appointment_time')
    ),

  listReviewRequests: (clientId) =>
    fetchAll(() => scoped(requireClient().from('review_requests').select('*'), clientId).order('marked_complete_at', { ascending: false })),

  listIntegrations: (clientId) =>
    fetchAll(() => scoped(requireClient().from('client_integration_status').select('*'), clientId)),

  updateBookingStatus: (bookingId, status) =>
    single(requireClient().from('bookings').update({ status }).eq('id', bookingId).select().single()),

  async markJobComplete(booking) {
    const db = requireClient();
    await single(db.from('bookings').update({ status: 'completed' }).eq('id', booking.id).select().single());
    return single(
      db
        .from('review_requests')
        .insert({ client_id: booking.client_id, booking_id: booking.id, marked_complete_at: new Date().toISOString() })
        .select()
        .single()
    );
  },
};
