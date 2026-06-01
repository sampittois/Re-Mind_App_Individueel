const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
const calendarTokenSecret = process.env.CALENDAR_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CALENDAR_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    eventsUrl: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    eventsUrl: 'https://graph.microsoft.com/v1.0/me/calendarView',
    clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET,
    scope: 'offline_access Calendars.Read',
  },
};

let supabaseClient = null;
let supabaseAdminClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL ontbreekt (of VITE_SUPABASE_URL voor lokale fallback).");
  }

  if (!supabaseAnonKey && !supabaseServiceRoleKey) {
    throw new Error("Geen Supabase key gevonden (SUPABASE_ANON_KEY of SUPABASE_SERVICE_ROLE_KEY).");
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);
  return supabaseClient;
}

function getSupabaseAdminClient() {
  if (supabaseAdminClient) return supabaseAdminClient;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL ontbreekt (of VITE_SUPABASE_URL voor lokale fallback).");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt op de backend. Voeg de service_role key toe aan backend/.env (SUPABASE_SERVICE_ROLE_KEY) en herstart de server.");
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return supabaseAdminClient;
}

function getCalendarProvider(provider) {
  const normalizedProvider = String(provider || '').trim().toLowerCase();
  const config = CALENDAR_PROVIDERS[normalizedProvider];

  if (!config) {
    throw new Error('Onbekende agenda provider.');
  }

  if (!config.clientId || !config.clientSecret) {
    throw new Error(`OAuth configuratie ontbreekt voor ${normalizedProvider}.`);
  }

  return { name: normalizedProvider, config };
}

async function requireUser(req) {
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!accessToken) {
    const error = new Error('Missing access token');
    error.status = 401;
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData?.user?.id) {
    const error = new Error(userError?.message || 'Invalid session');
    error.status = 401;
    throw error;
  }

  return { supabase, user: userData.user };
}

function requireCalendarSecret() {
  if (!calendarTokenSecret) {
    throw new Error('CALENDAR_TOKEN_SECRET ontbreekt op de backend.');
  }

  return crypto.createHash('sha256').update(calendarTokenSecret).digest();
}

function signCalendarState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', requireCalendarSecret())
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

function verifyCalendarState(state) {
  const [body, signature] = String(state || '').split('.');
  if (!body || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', requireCalendarSecret())
    .update(body)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.userId || !payload?.provider || Number(payload.exp || 0) < Date.now()) {
    return null;
  }

  return payload;
}

function encryptCalendarToken(token) {
  if (!token) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', requireCalendarSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptCalendarToken(encryptedToken) {
  if (!encryptedToken) return null;

  const [ivValue, authTagValue, encryptedValue] = String(encryptedToken).split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', requireCalendarSecret(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function getCalendarRedirectUri(provider) {
  return `${backendPublicUrl.replace(/\/$/, '')}/calendar/callback/${provider}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sendCalendarCallbackPage(res, { status = 200, title, message, returnPath = '/?calendar=error' }) {
  const appUrl = `${frontendUrl.replace(/\/$/, '')}${returnPath}`;

  return res.status(status).send(`<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f6f4ef; color: #1f2a24; }
      main { width: min(420px, calc(100vw - 32px)); padding: 28px; background: #fff; border: 1px solid #ded8cb; border-radius: 12px; box-shadow: 0 16px 40px rgba(31, 42, 36, 0.12); }
      h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.2; }
      p { margin: 0 0 22px; color: #5f6d64; line-height: 1.5; }
      a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 10px; background: #27483a; color: #fff; text-decoration: none; font-weight: 700; }
    </style>
    <script>
      function returnToApp(event) {
        event.preventDefault();
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = "${escapeHtml(appUrl)}";
          window.opener.focus();
          window.close();
          return;
        }

        window.location.href = "${escapeHtml(appUrl)}";
      }
    </script>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="${escapeHtml(appUrl)}" onclick="returnToApp(event)">Terug naar de app</a>
    </main>
  </body>
</html>`);
}

async function exchangeCalendarCode(provider, code) {
  const { config } = getCalendarProvider(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: getCalendarRedirectUri(provider),
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'Agenda koppelen is mislukt.');
  }

  return payload;
}

async function refreshCalendarAccessToken(provider, refreshToken) {
  const { config } = getCalendarProvider(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'Agenda token vernieuwen is mislukt.');
  }

  return payload;
}

function getDayRange(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Ongeldige datum. Gebruik YYYY-MM-DD.');
  }

  return {
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59`,
  };
}

function getTimeZoneOffset(dateTime, timeZone) {
  const date = new Date(`${dateTime}Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offsetMinutes = (localAsUtc - date.getTime()) / 60000;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');

  return `${sign}${hours}:${minutes}`;
}

function normalizeGoogleEvents(items = []) {
  return items.map((event) => ({
    id: `google-${event.id}`,
    provider: 'google',
    title: event.summary || 'Geen titel',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    allDay: Boolean(event.start?.date),
    location: event.location || '',
  }));
}

function normalizeMicrosoftEvents(items = []) {
  return items.map((event) => ({
    id: `microsoft-${event.id}`,
    provider: 'microsoft',
    title: event.subject || 'Geen titel',
    start: event.start?.dateTime || null,
    end: event.end?.dateTime || null,
    allDay: Boolean(event.isAllDay),
    location: event.location?.displayName || '',
  }));
}

async function ensureCompanyForManager(supabase, managerId, fallbackName) {
  if (!managerId) {
    return null;
  }

  const { data: managerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, company_id')
    .eq('id', managerId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!managerProfile?.id) {
    throw new Error('Managerprofiel niet gevonden.');
  }

  if (managerProfile.company_id) {
    return managerProfile.company_id;
  }

  const companyName = (fallbackName || managerProfile.full_name || managerProfile.email || 'Bedrijf').trim();
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .upsert(
      {
        manager_id: managerId,
        name: companyName,
      },
      { onConflict: 'manager_id' },
    )
    .select('id')
    .single();

  if (companyError) {
    throw companyError;
  }

  const { error: linkError } = await supabase
    .from('profiles')
    .update({ company_id: company.id })
    .eq('id', managerId);

  if (linkError) {
    throw linkError;
  }

  return company.id;
}

app.post("/checkin", (req, res) => {
  const { stress, energy } = req.body;

  const needPause = stress >= 4 || energy <= 2;

  res.json({ needPause });
});

// Simple health endpoint to check Supabase connectivity. It attempts a small select
// against a table the app already uses.
app.get('/supabase-health', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('work_sessions').select('id').limit(1);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/recent-login-emails/validate', async (req, res) => {
  try {
    const rawEmails = Array.isArray(req.body?.emails) ? req.body.emails : [];
    const normalizedEmails = [...new Set(
      rawEmails
        .filter((email) => typeof email === 'string')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )];

    if (!normalizedEmails.length) {
      return res.json({ ok: true, validEmails: [] });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const existingEmails = new Set(
      (data?.users || [])
        .map((user) => (user.email || '').trim().toLowerCase())
        .filter(Boolean),
    );

    return res.json({
      ok: true,
      validEmails: normalizedEmails.filter((email) => existingEmails.has(email)),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/admin/overview', async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();

    const [profilesCountResult, sessionsCountResult, paymentsCountResult, profilesResult, recentUsersResult, recentSessionsResult, recentPaymentsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('work_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('payment_details').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('plan'),
      supabase
        .from('profiles')
        .select('id, full_name, email, plan, updated_at, created_at, company_management_enabled')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('work_sessions')
        .select('id, user_id, start_time, end_time, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('payment_details')
        .select('id, user_id, plan, payment_status, billing_email, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const firstError = [profilesCountResult.error, sessionsCountResult.error, paymentsCountResult.error, profilesResult.error, recentUsersResult.error, recentSessionsResult.error, recentPaymentsResult.error].find(Boolean);
    if (firstError) {
      return res.status(500).json({ ok: false, error: firstError.message });
    }

    const profiles = profilesResult.data || [];
    const recentSessions = recentSessionsResult.data || [];
    const sessionUserIds = [...new Set(recentSessions.map((session) => session.user_id).filter(Boolean))];
    const sessionUsersResult = sessionUserIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email')
          .in('id', sessionUserIds)
      : { data: [], error: null };

    if (sessionUsersResult.error) {
      return res.status(500).json({ ok: false, error: sessionUsersResult.error.message });
    }

    const sessionUserMap = new Map((sessionUsersResult.data || []).map((profile) => [profile.id, profile]));
    const planCounts = profiles.reduce((accumulator, profile) => {
      const plan = profile?.plan || 'basic';
      accumulator[plan] = (accumulator[plan] || 0) + 1;
      return accumulator;
    }, {});

    const sessionsWithUsers = recentSessions.map((session) => {
      const linkedProfile = sessionUserMap.get(session.user_id) || {};
      const displayName = linkedProfile.full_name || [linkedProfile.first_name, linkedProfile.last_name].filter(Boolean).join(' ').trim() || linkedProfile.email || session.user_id;

      return {
        ...session,
        user_display_name: displayName,
        is_active: !session.end_time,
      };
    });

    res.json({
      ok: true,
      stats: {
        totalUsers: profiles.length,
        basicUsers: planCounts.basic || 0,
        premiumUsers: planCounts.premium || 0,
        companyUsers: planCounts.bedrijfslicentie || 0,
        adminUsers: planCounts.admin || 0,
        totalSessions: sessionsCountResult.count || 0,
        totalPayments: paymentsCountResult.count || 0,
      },
      recentUsers: recentUsersResult.data || [],
      recentSessions: sessionsWithUsers,
      recentPayments: recentPaymentsResult.data || [],
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/admin/company', async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const companyId = String(req.query.company_id || '').trim();

    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'Missing company_id' });
    }

    const { data, error } = await supabase
      .from('companies')
      .select('id, manager_id, name, theme, force_company_colors, created_at, updated_at')
      .eq('id', companyId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, company: data || null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/admin/employees', async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const companyId = String(req.query.company_id || '').trim();
    const managerId = String(req.query.manager_id || '').trim();

    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && managerId) {
      const { data: managerProfile, error: managerProfileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', managerId)
        .maybeSingle();

      if (managerProfileError) {
        return res.status(500).json({ ok: false, error: managerProfileError.message });
      }

      resolvedCompanyId = managerProfile?.company_id || '';
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({ ok: false, error: 'Missing company_id or manager_id' });
    }

    let query = supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, work_type, use_company_colors, created_at, updated_at, company_management_enabled')
      .eq('company_id', resolvedCompanyId)
      .order('created_at', { ascending: false });

    if (managerId) {
      query = query.neq('id', managerId);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const profileMap = new Map((data || []).map((row) => [row.id, row]));
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) {
      return res.status(500).json({ ok: false, error: usersError.message });
    }

    const existingAuthUserIds = new Set((usersData?.users || []).map((user) => user?.id).filter(Boolean));

    if (managerId) {
      const managerCreatedUserIds = (usersData?.users || [])
        .filter((user) => {
          const metadata = user?.user_metadata || {};
          return metadata?.created_by === managerId || metadata?.created_by === String(managerId);
        })
        .map((user) => user.id)
        .filter(Boolean);

      if (managerCreatedUserIds.length) {
        const { data: managerCreatedProfiles, error: managerCreatedProfilesError } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, work_type, use_company_colors, created_at, updated_at, company_management_enabled, company_id')
          .in('id', managerCreatedUserIds);

        if (managerCreatedProfilesError) {
          return res.status(500).json({ ok: false, error: managerCreatedProfilesError.message });
        }

        (managerCreatedProfiles || []).forEach((row) => {
          if (row?.id && row.id !== managerId) {
            profileMap.set(row.id, row);
          }
        });
      }
    }

    const employees = [...profileMap.values()]
      .filter((row) => row && row.company_management_enabled !== true)
      .filter((row) => existingAuthUserIds.has(row.id))
      .map((row) => {
        const fullName = (row.full_name || '').trim();
        const combinedName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();

        return {
          id: row.id,
          authUserId: row.id,
          name: fullName || combinedName || row.email || row.id,
          email: row.email || '',
          department: row.work_type || 'Sales',
          status: 'Offline',
          usesCompanyColors: Boolean(row.use_company_colors),
          mustChangePassword: true,
          adminCreated: true,
          createdAt: row.created_at || row.updated_at || new Date().toISOString(),
          lastSeenAt: row.updated_at || row.created_at || new Date().toISOString(),
          createdBy: managerId || null,
          companyId: row.company_id || resolvedCompanyId,
        };
      });

    return res.json({ ok: true, employees });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Server-side endpoint to set a user's plan. This can be used after payment
// verification to ensure the plan is written using the backend (service key
// if available). Expects { user_id, plan } in the body.
app.post('/set-plan', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { user_id, plan, payment_details } = req.body || {};
    if (!user_id || !plan) return res.status(400).json({ ok: false, error: 'Missing user_id or plan' });

    // Upsert the profile row with the plan
    const nextProfile = { id: user_id, plan };
    const { data, error } = await supabase.from('profiles').upsert(nextProfile, { onConflict: 'id' }).select().maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Store payment details (optional fields, demo mode accepted).
    const paymentRow = {
      user_id,
      plan,
      cardholder_name: payment_details?.cardholder_name || null,
      card_last4: payment_details?.card_last4 || null,
      card_expiry: payment_details?.card_expiry || null,
      billing_email: payment_details?.billing_email || null,
      payment_status: 'paid',
    };

    const { error: paymentError } = await supabase.from('payment_details').insert([paymentRow]);
    if (paymentError) {
      return res.status(500).json({ ok: false, error: paymentError.message });
    }

    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Create an employee account from bedrijfsbeheer.
// Requires SUPABASE_SERVICE_ROLE_KEY so auth admin APIs are available.
app.post('/admin/create-employee', async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();

    const {
      name,
      email,
      password,
      department,
      use_company_colors,
      created_by,
      company_id,
    } = req.body || {};

    const safeName = (name || '').trim();
    const safeEmail = (email || '').trim().toLowerCase();
    const safePassword = (password || '').trim();
    const safeDepartment = (department || 'Sales').trim() || 'Sales';

    if (!safeName || !safeEmail || !safePassword) {
      return res.status(400).json({ ok: false, error: 'Naam, e-mail en wachtwoord zijn verplicht.' });
    }

    if (safePassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'Wachtwoord moet minstens 8 tekens bevatten.' });
    }

    async function findAuthUserByEmail(emailAddress) {
      const normalizedEmail = String(emailAddress || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return null;
      }

      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) {
        throw usersError;
      }

      return (usersData?.users || []).find((user) => (user?.email || '').trim().toLowerCase() === normalizedEmail) || null;
    }

    async function createEmployeeUser() {
      return supabase.auth.admin.createUser({
        email: safeEmail,
        password: safePassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: safeName,
          force_onboarding: true,
          admin_created: true,
          created_by: created_by || null,
          company_id: null,
        },
      });
    }

    const [firstName = safeName, ...rest] = safeName.split(/\s+/);
    const lastName = rest.join(' ') || null;

    let { data: createdUser, error: createUserError } = await createEmployeeUser();

    if (createUserError && /email.*already.*use|already exists|user.*already/i.test(createUserError.message || '')) {
      const existingAuthUser = await findAuthUserByEmail(safeEmail);
      const existingAuthUserId = existingAuthUser?.id || null;
      const { data: existingProfile } = existingAuthUserId
        ? await supabase.from('profiles').select('id').eq('id', existingAuthUserId).maybeSingle()
        : { data: null };

      if (!existingProfile?.id && existingAuthUserId) {
        const { error: deleteExistingUserError } = await supabase.auth.admin.deleteUser(existingAuthUserId);
        if (deleteExistingUserError) {
          return res.status(409).json({ ok: false, error: createUserError.message });
        }

        ({ data: createdUser, error: createUserError } = await createEmployeeUser());
      }
    }

    if (createUserError) {
      return res.status(400).json({ ok: false, error: createUserError.message });
    }

    const user = createdUser?.user;
    if (!user?.id) {
      return res.status(500).json({ ok: false, error: 'Kon gebruiker niet aanmaken.' });
    }

    const profilePayload = {
      id: user.id,
      full_name: safeName,
      first_name: firstName,
      last_name: lastName,
      email: safeEmail,
      plan: 'basic',
      use_company_colors: Boolean(use_company_colors),
      company_management_enabled: false,
      work_type: safeDepartment,
      company_id: null,
    };

    let companyId = null;
    if (company_id) {
      companyId = String(company_id).trim() || null;
    }

    if (!companyId && created_by) {
      try {
        companyId = await ensureCompanyForManager(supabase, created_by, null);
      } catch (companyError) {
        return res.status(500).json({ ok: false, error: companyError.message });
      }
    }

    if (companyId) {
      profilePayload.company_id = companyId;
      const { error: metadataUpdateError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata || {}),
          company_id: companyId,
        },
      });

      if (metadataUpdateError) {
        return res.status(500).json({ ok: false, error: metadataUpdateError.message });
      }
    }

    const { error: upsertProfileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (upsertProfileError) {
      return res.status(500).json({ ok: false, error: upsertProfileError.message });
    }

    return res.json({
      ok: true,
      employee: {
        id: user.id,
        email: safeEmail,
        name: safeName,
        department: safeDepartment,
        created_by: created_by || null,
        company_id: companyId,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/admin/delete-employee', async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const { user_id } = req.body || {};

    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'Missing user_id' });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return res.status(500).json({ ok: false, error: deleteError.message });
    }

    // Also remove the profile row if it exists (clean up)
    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', user_id);
    if (profileDeleteError) {
      // Log and continue — user has been deleted from auth even if profile deletion failed
      console.error('Failed to delete profile for user', user_id, profileDeleteError.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/calendar/connect-url', async (req, res) => {
  try {
    const { supabase, user } = await requireUser(req);
    const { name, config } = getCalendarProvider(req.query.provider || 'google');
    const state = signCalendarState({
      userId: user.id,
      provider: name,
      nonce: crypto.randomBytes(12).toString('base64url'),
      exp: Date.now() + 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: getCalendarRedirectUri(name),
      response_type: 'code',
      scope: config.scope,
      state,
    });

    if (name === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    return res.json({ ok: true, provider: name, url: `${config.authUrl}?${params.toString()}` });
  } catch (err) {
    return res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.get('/calendar/callback/:provider', async (req, res) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    const state = verifyCalendarState(req.query.state);

    if (!state || state.provider !== provider) {
      return sendCalendarCallbackPage(res, {
        status: 400,
        title: 'Agenda koppelen mislukt',
        message: 'Deze agenda-koppeling is verlopen of ongeldig. Ga terug naar de app en probeer opnieuw.',
      });
    }

    if (!req.query.code) {
      return sendCalendarCallbackPage(res, {
        status: 400,
        title: 'Agenda koppelen geannuleerd',
        message: 'Er werd geen toestemming ontvangen. Je kan veilig terug naar de app.',
      });
    }

    const tokens = await exchangeCalendarCode(provider, req.query.code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return sendCalendarCallbackPage(res, {
        status: 400,
        title: 'Agenda niet volledig gekoppeld',
        message: 'Er werd geen offline toegang ontvangen. Ga terug naar de app en probeer opnieuw.',
      });
    }

    const supabase = getSupabaseAdminClient();
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null;
    const encryptedAccessToken = tokens.access_token ? encryptCalendarToken(tokens.access_token) : null;
    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: state.userId,
          provider,
          access_token_ciphertext: encryptedAccessToken,
          encrypted_refresh_token: encryptCalendarToken(refreshToken),
          token_expires_at: tokenExpiresAt,
          connected_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: 'user_id,provider' },
      );

    if (connectionError) {
      return sendCalendarCallbackPage(res, {
        status: 500,
        title: 'Agenda opslaan mislukt',
        message: connectionError.message,
      });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ calendar_linked: true })
      .eq('id', state.userId);

    if (profileError) {
      return sendCalendarCallbackPage(res, {
        status: 500,
        title: 'Profiel bijwerken mislukt',
        message: profileError.message,
      });
    }

    return sendCalendarCallbackPage(res, {
      title: 'Agenda gekoppeld',
      message: 'Je agenda is gekoppeld. Je kan dit venster sluiten of teruggaan naar de app.',
      returnPath: '/?calendar=connected',
    });
  } catch (err) {
    return sendCalendarCallbackPage(res, {
      status: 500,
      title: 'Agenda koppelen mislukt',
      message: err.message,
    });
  }
});

app.get('/calendar/connections', async (req, res) => {
  try {
    const { supabase, user } = await requireUser(req);
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('provider, connected_at, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    const connections = data || [];
    if (connections.length) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ calendar_linked: true })
        .eq('id', user.id);

      if (profileError) {
        return res.status(500).json({ ok: false, error: profileError.message });
      }
    }

    return res.json({ ok: true, calendarLinked: connections.length > 0, connections });
  } catch (err) {
    return res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.get('/calendar/events', async (req, res) => {
  try {
    const { supabase, user } = await requireUser(req);
    const date = String(req.query.date || '').trim();
    const timeZone = String(req.query.timezone || 'Europe/Brussels').trim();
    const { start, end } = getDayRange(date);
    const offset = getTimeZoneOffset(start, timeZone);

    const { data: connections, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('provider, encrypted_refresh_token')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (connectionError) {
      return res.status(500).json({ ok: false, error: connectionError.message });
    }

    if (!(connections || []).length) {
      return res.json({ ok: true, calendarLinked: false, events: [] });
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ calendar_linked: true })
      .eq('id', user.id);

    if (profileError) {
      return res.status(500).json({ ok: false, error: profileError.message });
    }

    const eventGroups = await Promise.all((connections || []).map(async (connection) => {
      const refreshToken = decryptCalendarToken(connection.encrypted_refresh_token);
      const tokenResponse = await refreshCalendarAccessToken(connection.provider, refreshToken);
      const accessToken = tokenResponse.access_token;
      const tokenUpdate = {};

      if (accessToken) {
        tokenUpdate.access_token_ciphertext = encryptCalendarToken(accessToken);
      }

      if (tokenResponse.refresh_token) {
        tokenUpdate.encrypted_refresh_token = encryptCalendarToken(tokenResponse.refresh_token);
      }

      if (tokenResponse.expires_in) {
        tokenUpdate.token_expires_at = new Date(Date.now() + Number(tokenResponse.expires_in) * 1000).toISOString();
      }

      if (Object.keys(tokenUpdate).length) {
        await supabase
          .from('calendar_connections')
          .update(tokenUpdate)
          .eq('user_id', user.id)
          .eq('provider', connection.provider);
      }

      if (connection.provider === 'google') {
        const params = new URLSearchParams({
          timeMin: `${start}${offset}`,
          timeMax: `${end}${offset}`,
          singleEvents: 'true',
          orderBy: 'startTime',
          timeZone,
        });
        const response = await fetch(`${CALENDAR_PROVIDERS.google.eventsUrl}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error?.message || 'Google Calendar events ophalen is mislukt.');
        return normalizeGoogleEvents(payload.items || []);
      }

      if (connection.provider === 'microsoft') {
        const params = new URLSearchParams({
          startDateTime: start,
          endDateTime: end,
          $select: 'id,subject,start,end,isAllDay,location',
          $orderby: 'start/dateTime',
        });
        const response = await fetch(`${CALENDAR_PROVIDERS.microsoft.eventsUrl}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: `outlook.timezone="${timeZone}"`,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error?.message || 'Microsoft Calendar events ophalen is mislukt.');
        return normalizeMicrosoftEvents(payload.value || []);
      }

      return [];
    }));

    const events = eventGroups
      .flat()
      .sort((left, right) => new Date(left.start || 0) - new Date(right.start || 0));

    return res.json({ ok: true, calendarLinked: true, events });
  } catch (err) {
    return res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

app.post('/delete-account', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!accessToken) {
      return res.status(401).json({ ok: false, error: 'Missing access token' });
    }

    const supabase = getSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData?.user?.id) {
      return res.status(401).json({ ok: false, error: userError?.message || 'Invalid session' });
    }

    const userId = userData.user.id;

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(500).json({ ok: false, error: deleteError.message });
    }

    const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', userId);
    if (profileDeleteError) {
      console.error('Failed to delete profile for account', userId, profileDeleteError.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
