
import { useState } from "react";
import "../styles/login.css";
import Breathe from "./Breathe";
import { supabase } from "../lib/supabaseClient";

export default function RegisterPage({ onRegister, onGoToLogin, onSkip }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }
    if (!acceptedTerms) {
      setError("Je moet akkoord gaan met de voorwaarden.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else onRegister?.();
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-left-inner">
          <Breathe size={280} />
          <h2 className="login-left-title">
            <span className="text">Slim pauzeren,</span> <span className="primary">sterk presteren</span>
          </h2>
          <p className="login-left-sub">Re:Mind helpt je de balans te behouden</p>
        </div>
      </section>

      <section className="login-right">
        <div className="login-right-inner">
          <h1 className="login-hero">
            Begin je reis naar <br />
            <span className="primary">balans</span>
          </h1>
          <p className="login-body">Registreer je om toegang te krijgen tot persoonlijke pauzes en inzichten.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-label">Email</label>
            <input className="form-input" placeholder="john.doe@voorbeeld.be" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form-label">Wachtwoord</label>
            <input type="password" className="form-input" placeholder="Minstens 8 tekens" value={password} onChange={(e) => setPassword(e.target.value)} />

            <label className="form-label">Wachtwoord opnieuw</label>
            <input type="password" className="form-input" placeholder="Herhaal je wachtwoord" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

            <label className="form-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
              <span>Ik ga akkoord met de voorwaarden</span>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-submit">Account aanmaken</button>
          </form>

          <div className="login-footer">
            <button type="button" className="auth-link-button" onClick={() => onSkip?.()}>
              Ga naar de app
            </button>
            Heb je al een account? <button type="button" className="auth-link-button" onClick={() => onGoToLogin?.()}>Log in</button>
          </div>
        </div>
      </section>
    </main>
  );
}
