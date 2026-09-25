import { addDays, addHours, addMinutes, setHours, setMinutes, subDays, subHours } from 'date-fns';

export const TOREM_CLIENT_ID = 'd7b1ebe9-e914-4c39-891e-ee7617b74d3a';

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260919);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

let idCounter = 0;
const uuid = () => {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
};

const FIRST = ['Maria', 'James', 'Ana', 'David', 'Sofia', 'Michael', 'Elena', 'Chris', 'Priya', 'Luis', 'Sarah', 'Marcus', 'Jenna', 'Omar', 'Rachel', 'Tyler', 'Grace', 'Diego', 'Hannah', 'Kevin'];
const LAST = ['Garcia', 'Nguyen', 'Patel', 'Johnson', 'Martinez', 'Brown', 'Kim', 'Lopez', 'Williams', 'Chen', 'Davis', 'Torres', 'Miller', 'Reyes', 'Wilson'];
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];

const SCRIPTS = {
  roofing: [
    ['Do you do roof inspections after hail storms?', 'Yes! We offer free hail damage inspections. I can get one scheduled for you — what part of Houston are you in?'],
    ['I have a leak near my chimney, how fast can someone come out?', "Sorry to hear that. We can usually get a tech out within 24–48 hours. Can I grab your name and the best number to reach you?"],
    ['How much does a full roof replacement cost?', 'It depends on square footage and material, but most replacements run $9,000–$18,000. Want me to set up a free on-site estimate?'],
    ['Do you work with insurance claims?', 'Absolutely — we handle the claim process end to end. Would you like to book a consultation this week?'],
    ['Are you available Saturday morning?', 'We have 9am and 11am open this Saturday. Which works better for you?'],
    ['What roofing materials do you install?', 'We install architectural shingles, metal, and TPO for flat roofs. Happy to walk you through options on a quick call.'],
  ],
  remodeling: [
    ['We want to redo our kitchen, do you do design too?', 'We do! Design and build under one roof. Want to book a free in-home consultation to talk through your vision?'],
    ['How long does a bathroom remodel take?', 'Most bathroom remodels take 3–5 weeks. I can have a project manager call you — what number works?'],
    ['Do you offer financing?', 'Yes, we partner with two lenders for 0% intro financing. Would you like me to email you the details?'],
    ['Can you send someone to give a quote on a garage conversion?', 'Of course. We have Tuesday at 1pm and Thursday at 10am open for estimates.'],
    ['Are you licensed and insured?', 'Yes — fully licensed and insured in Texas. Happy to send our certificate with a quote. What is your email?'],
  ],
  painting: [
    ['How much to paint a 2,000 sq ft exterior?', 'Typically $4,500–$7,000 depending on prep and stories. Want a free estimate? I just need a name and address.'],
    ['Do you do cabinet painting?', 'Yes, cabinet refinishing is one of our most popular services. I can book a color consultation for you.'],
    ['Can you come this week?', 'We have Wednesday afternoon and Friday morning available for estimates. Which is better?'],
    ['Do you use low-VOC paint?', 'We do — Sherwin-Williams Harmony and Emerald lines by default. Want me to set up a walkthrough?'],
    ['I need two bedrooms painted before we move in next month', 'We can definitely fit that in. What is your move-in date so I can find you a slot?'],
  ],
  torem: [
    ['How does the chatbot work?', 'Torem trains an AI assistant on your website and FAQs, then answers customer questions and books appointments 24/7. Want to see a demo?'],
    ['What does it cost?', 'The Foundation plan starts at $40/month with no setup fee. Add booking, follow-up, or review generation as you grow.'],
    ['Do you integrate with CRMs?', 'Yes — every conversation, lead, and booking lands in your Torem dashboard. Want me to book a walkthrough?'],
  ],
};

const FOLLOWUPS = [
  ['Thanks, that helps. Let me talk to my spouse.', 'Of course! I will send a quick summary to your email so you have it handy.'],
  ['Can you send me the details?', "Done — I've sent it over. Anything else I can help with?"],
  ['Yes, book me for the earlier one.', "You're all set! I've confirmed the appointment and sent a calendar invite."],
  ['What is your address?', 'We are at 2100 Travis St, Houston TX 77002. Want directions sent to your phone?'],
];

const CLIENTS = [
  {
    id: TOREM_CLIENT_ID,
    business_name: 'Torem AI',
    website_url: 'https://toremai.com',
    contact_email: 'toremaiautomation@gmail.com',
    plan_tier: 'full_stack',
    status: 'active',
    trade: 'torem',
    primary_color: '#007AE3',
    logo_url: '',
    addons: ['booking', 'review_generation', 'automated_followup'],
    volume: 1.2,
    createdDaysAgo: 400,
  },
  {
    id: '11111111-1111-4111-8111-111111111111',
    business_name: 'Bayou City Roofing',
    website_url: 'https://bayoucityroofing.com',
    contact_email: 'office@bayoucityroofing.com',
    plan_tier: 'full_stack',
    status: 'active',
    trade: 'roofing',
    primary_color: '#B45309',
    logo_url: '',
    addons: ['booking', 'review_generation', 'automated_followup'],
    volume: 2.2,
    createdDaysAgo: 140,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    business_name: 'Lone Star Remodeling',
    website_url: 'https://lonestarremodel.com',
    contact_email: 'hello@lonestarremodel.com',
    plan_tier: 'growth',
    status: 'active',
    trade: 'remodeling',
    primary_color: '#0F766E',
    logo_url: '',
    addons: ['booking'],
    volume: 1.4,
    createdDaysAgo: 75,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    business_name: 'Houston Pro Painters',
    website_url: 'https://houstonpropainters.com',
    contact_email: 'info@houstonpropainters.com',
    plan_tier: 'foundation',
    status: 'active',
    trade: 'painting',
    primary_color: '#7C3AED',
    logo_url: '',
    addons: [],
    volume: 0.9,
    createdDaysAgo: 30,
  },
];

const ADDON_PRICES = { booking: 20, review_generation: 10, automated_followup: 15 };

const DEFAULT_HOURS = {
  monday: { open: '08:00', close: '18:00' },
  tuesday: { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday: { open: '08:00', close: '18:00' },
  friday: { open: '08:00', close: '17:00' },
  saturday: { open: '09:00', close: '13:00' },
  sunday: null,
  slot_interval_minutes: 60,
};

function randomTimestamp(daysAgoMax) {
  const day = subDays(new Date(), between(0, daysAgoMax));
  // Weighted toward business hours but with a real after-hours tail (the marketing pitch).
  const hour = chance(0.62) ? between(8, 17) : pick([6, 7, 18, 19, 20, 21, 22, 23, 0, 1]);
  return setMinutes(setHours(day, hour), between(0, 59));
}

export function buildSeed() {
  const now = new Date();
  const clients = [];
  const client_config = [];
  const client_addons = [];
  const chat_sessions = [];
  const leads = [];
  const bookings = [];
  const review_requests = [];
  const integrations = [];

  for (const c of CLIENTS) {
    const { trade, addons, volume, createdDaysAgo, primary_color, logo_url, ...row } = c;
    clients.push({ ...row, created_at: subDays(now, createdDaysAgo).toISOString() });
    client_config.push({
      client_id: c.id,
      system_prompt: `You are the assistant for ${c.business_name}. Be friendly, concise, and always try to capture the customer's contact info or book an appointment.`,
      logo_url,
      primary_color,
      business_hours: DEFAULT_HOURS,
      booking_window_days: 30,
      updated_at: subDays(now, 3).toISOString(),
    });
    for (const [name, price] of Object.entries(ADDON_PRICES)) {
      client_addons.push({
        id: uuid(),
        client_id: c.id,
        addon_name: name,
        enabled: addons.includes(name),
        monthly_price: price,
        enabled_at: addons.includes(name) ? subDays(now, createdDaysAgo - 2).toISOString() : null,
      });
    }
    if (addons.includes('booking')) {
      integrations.push({ client_id: c.id, provider: 'google_calendar', connected_at: subDays(now, createdDaysAgo - 3).toISOString(), expires_at: addHours(now, 1).toISOString() });
    }

    const historyDays = Math.min(createdDaysAgo, 90);
    const convCount = Math.round(historyDays * 1.1 * volume);
    for (let i = 0; i < convCount; i++) {
      const start = randomTimestamp(historyDays);
      const sessionId = `session-${start.getTime()}-${between(100, 999)}`;
      const turns = [pick(SCRIPTS[trade]), ...(chance(0.7) ? [pick(FOLLOWUPS)] : []), ...(chance(0.35) ? [pick(FOLLOWUPS)] : [])];
      turns.forEach(([u, a], idx) => {
        chat_sessions.push({
          id: uuid(),
          session_id: sessionId,
          client_id: c.id,
          user_message: u,
          ai_response: a,
          created_at: addMinutes(start, idx * between(1, 4)).toISOString(),
        });
      });

      if (!chance(0.42)) continue;
      const first = pick(FIRST);
      const last = pick(LAST);
      const hasEmail = chance(0.85);
      const hasPhone = chance(0.6);
      const email = hasEmail ? `${first.toLowerCase()}.${last.toLowerCase()}@${pick(DOMAINS)}` : null;
      const phone = hasPhone ? `(${between(281, 832)}) ${between(200, 999)}-${between(1000, 9999)}` : null;
      const booked = addons.includes('booking') && chance(0.45);
      const followedUp = !booked && addons.includes('automated_followup') && (email || phone) && chance(0.7);
      const leadCreated = addMinutes(start, between(2, 9));
      leads.push({
        id: uuid(),
        client_id: c.id,
        session_ref: sessionId,
        email,
        phone,
        booking_completed: booked,
        followed_up_at: followedUp ? addHours(leadCreated, between(20, 30)).toISOString() : null,
        created_at: leadCreated.toISOString(),
      });

      if (!booked) continue;
      const apptDay = addDays(leadCreated, between(1, 14));
      const appt = setMinutes(setHours(apptDay, pick([9, 10, 11, 13, 14, 15, 16])), 0);
      const past = appt < now;
      let status = 'confirmed';
      // Some past jobs stay 'confirmed' so the demo has work waiting to be marked complete.
      if (past) status = chance(0.6) ? 'completed' : chance(0.6) ? 'confirmed' : chance(0.5) ? 'no_show' : 'cancelled';
      else if (chance(0.06)) status = 'cancelled';
      const booking = {
        id: uuid(),
        client_id: c.id,
        session_ref: sessionId,
        customer_name: `${first} ${last}`,
        customer_email: email ?? `${first.toLowerCase()}@${pick(DOMAINS)}`,
        appointment_time: appt.toISOString(),
        calendar_event_id: `gcal_${between(100000, 999999)}`,
        status,
        created_at: addMinutes(leadCreated, 3).toISOString(),
      };
      bookings.push(booking);

      if (status === 'completed' && addons.includes('review_generation') && chance(0.75)) {
        const marked = addHours(appt, between(2, 30));
        const sent = chance(0.8);
        review_requests.push({
          id: uuid(),
          client_id: c.id,
          booking_id: booking.id,
          marked_complete_at: marked.toISOString(),
          review_sent_at: sent ? addMinutes(marked, between(15, 240)).toISOString() : null,
          review_link: sent ? `https://g.page/r/${c.business_name.replace(/\s+/g, '').toLowerCase()}/review` : null,
        });
      }
    }
  }

  // A couple of legacy rows with no client_id, matching the real table.
  for (let i = 0; i < 4; i++) {
    const start = subHours(now, between(600, 900));
    chat_sessions.push({
      id: uuid(),
      session_id: `session-${start.getTime()}`,
      client_id: null,
      user_message: pick(SCRIPTS.torem)[0],
      ai_response: pick(SCRIPTS.torem)[1],
      created_at: start.toISOString(),
    });
  }

  chat_sessions.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  return { clients, client_config, client_addons, chat_sessions, leads, bookings, review_requests, integrations };
}

export const MOCK_USERS = [
  { user_id: 'u-admin', email: 'admin@toremai.com', full_name: 'Torem Admin', role: 'admin', client_id: TOREM_CLIENT_ID },
  { user_id: 'u-roof', email: 'office@bayoucityroofing.com', full_name: 'Ray Delgado', role: 'client', client_id: '11111111-1111-4111-8111-111111111111' },
  { user_id: 'u-remodel', email: 'hello@lonestarremodel.com', full_name: 'Kim Nguyen', role: 'client', client_id: '22222222-2222-4222-8222-222222222222' },
  { user_id: 'u-paint', email: 'info@houstonpropainters.com', full_name: 'Andre Baptiste', role: 'client', client_id: '33333333-3333-4333-8333-333333333333' },
];
