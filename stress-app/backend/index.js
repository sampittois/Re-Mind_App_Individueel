const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client. Prefer service role key on backend when present.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

app.post("/checkin", (req, res) => {
  const { stress, energy } = req.body;

  const needPause = stress >= 4 || energy <= 2;

  res.json({ needPause });
});

// Simple health endpoint to check Supabase connectivity. It attempts a small select
// against a table the app already uses.
app.get('/supabase-health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('work_sessions').select('id').limit(1);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Server-side endpoint to set a user's plan. This can be used after payment
// verification to ensure the plan is written using the backend (service key
// if available). Expects { user_id, plan } in the body.
app.post('/set-plan', async (req, res) => {
  try {
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        ok: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY ontbreekt op de backend.',
      });
    }

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
      plan: 'basic',
      use_company_colors: Boolean(use_company_colors),
      company_management_enabled: false,
      work_type: safeDepartment,
    };

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
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
