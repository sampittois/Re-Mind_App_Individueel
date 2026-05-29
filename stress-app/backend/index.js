const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

    const [firstName = safeName, ...rest] = safeName.split(/\s+/);
    const lastName = rest.join(' ') || null;

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
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
      plan: 'premium',
      use_company_colors: Boolean(use_company_colors),
      company_management_enabled: false,
      work_type: safeDepartment,
      company_id: null,
    };

    let companyId = null;
    if (created_by) {
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
