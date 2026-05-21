
import { useState } from "react";
import "../styles/login.css";
import Breathe from "./Breathe";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage({ onLogin, onGoToRegister, onSkip }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onLogin?.();
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-left-inner">
          <Breathe size={280} />
          <h2 className="login-left-title"><span className="text">Slim pauzeren,</span> <span className="primary">sterk presteren</span></h2>
          <p className="login-left-sub">Re:Mind helpt je de balans te behouden</p>
        </div>
      </section>

      <section className="login-right">
        <div className="login-right-inner">
          <h1 className="login-hero">Welkom terug bij <br /><span className="primary">Re:Mind</span></h1>
          <p className="login-body">Log in om je werkdag te verbeteren met effectieve pauzes.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-label">Email</label>
            <input className="form-input" placeholder="john.doe@voorbeeld.be" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form-label">Wachtwoord</label>
            <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="login-submit">Log in</button>
          </form>

          <div className="login-footer">
            <button type="button" className="auth-link-button" onClick={onSkip}>
              Ga naar de app
            </button>
            Heb je nog geen account? <button type="button" className="auth-link-button" onClick={onGoToRegister}>Registreer je</button>
          </div>
        </div>
      </section>
    </main>
  );
}
