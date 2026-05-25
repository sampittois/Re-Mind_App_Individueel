const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client (uses anon key from backend/.env)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
    const { user_id, plan } = req.body || {};
    if (!user_id || !plan) return res.status(400).json({ ok: false, error: 'Missing user_id or plan' });

    // Upsert the profile row with the plan
    const nextProfile = { id: user_id, plan };
    const { data, error } = await supabase.from('profiles').upsert(nextProfile, { onConflict: 'id' }).select().maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
