import { buildSeed, MOCK_USERS } from './seed';

const db = buildSeed();
const SESSION_KEY = 'torem-crm-mock-session';
const listeners = new Set();

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));
const byClient = (rows, clientId) => (clientId ? rows.filter((r) => r.client_id === clientId) : rows);
const inRange = (rows, range, col) =>
  rows.filter((r) => (!range?.from || r[col] >= range.from.toISOString()) && (!range?.to || r[col] <= range.to.toISOString()));

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((cb) => cb(session));
}

export const mockApi = {
  mockUsers: MOCK_USERS,

  auth: {
    async getSession() {
      return readSession();
    },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async signInWithPassword(email) {
      await delay();
      const u = MOCK_USERS.find((m) => m.email === email);
      if (!u) return { error: { message: 'No mock user with that email. Pick one of the demo accounts.' } };
      writeSession({ user: { id: u.user_id, email: u.email } });
      return { error: null };
    },
    async signInAs(userId) {
      const u = MOCK_USERS.find((m) => m.user_id === userId);
      writeSession({ user: { id: u.user_id, email: u.email } });
    },
    async signInWithOtp() {
      return { error: { message: 'Magic links are disabled in demo mode.' } };
    },
    async resetPassword() {
      return { error: null };
    },
    async updatePassword() {
      return { error: null };
    },
    async signOut() {
      writeSession(null);
      return { error: null };
    },
    async getProfile(userId) {
      const u = MOCK_USERS.find((m) => m.user_id === userId);
      if (!u) throw new Error('Profile not found');
      return { user_id: u.user_id, client_id: u.client_id, role: u.role, full_name: u.full_name };
    },
  },

  async listClients() {
    await delay();
    return clone(db.clients);
  },

  async getClient(clientId) {
    await delay();
    return clone({
      client: db.clients.find((c) => c.id === clientId) ?? null,
      config: db.client_config.find((c) => c.client_id === clientId) ?? { client_id: clientId },
      addons: db.client_addons.filter((a) => a.client_id === clientId),
    });
  },

  async updateClient(clientId, patch) {
    await delay();
    const row = db.clients.find((c) => c.id === clientId);
    Object.assign(row, patch);
    return clone(row);
  },

  async updateClientConfig(clientId, patch) {
    await delay();
    let row = db.client_config.find((c) => c.client_id === clientId);
    if (!row) {
      row = { client_id: clientId };
      db.client_config.push(row);
    }
    Object.assign(row, patch, { updated_at: new Date().toISOString() });
    return clone(row);
  },

  async setAddon(clientId, addonName, enabled, monthlyPrice) {
    await delay();
    let row = db.client_addons.find((a) => a.client_id === clientId && a.addon_name === addonName);
    if (!row) {
      row = { id: `addon-${clientId}-${addonName}`, client_id: clientId, addon_name: addonName };
      db.client_addons.push(row);
    }
    Object.assign(row, { enabled, monthly_price: monthlyPrice, enabled_at: enabled ? new Date().toISOString() : row.enabled_at });
    return clone(row);
  },

  async listMessages(clientId, range) {
    await delay();
    return clone(inRange(byClient(db.chat_sessions, clientId), range, 'created_at'));
  },

  async listLeads(clientId, range) {
    await delay();
    return clone(inRange(byClient(db.leads, clientId), range, 'created_at').sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
  },

  async listBookings(clientId, range, by = 'appointment_time') {
    await delay();
    return clone(inRange(byClient(db.bookings, clientId), range, by).sort((a, b) => (a.appointment_time < b.appointment_time ? -1 : 1)));
  },

  async listReviewRequests(clientId) {
    await delay();
    return clone(byClient(db.review_requests, clientId).sort((a, b) => (a.marked_complete_at < b.marked_complete_at ? 1 : -1)));
  },

  async listIntegrations(clientId) {
    await delay();
    return clone(byClient(db.integrations, clientId));
  },

  async updateBookingStatus(bookingId, status) {
    await delay();
    const row = db.bookings.find((b) => b.id === bookingId);
    row.status = status;
    return clone(row);
  },

  async markJobComplete(booking) {
    await delay();
    const row = db.bookings.find((b) => b.id === booking.id);
    row.status = 'completed';
    const req = {
      id: `rr-${booking.id}`,
      client_id: booking.client_id,
      booking_id: booking.id,
      marked_complete_at: new Date().toISOString(),
      review_sent_at: null,
      review_link: null,
    };
    db.review_requests.unshift(req);
    return clone(req);
  },
};
