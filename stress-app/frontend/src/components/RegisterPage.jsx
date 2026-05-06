import { useState } from "react";
import "../styles/login.css";
import Breathe from "./Breathe";

export default function RegisterPage({ onRegister, onGoToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Vul je naam in.");
      return;
    }

    if (password.length < 8) {
      setError("Je wachtwoord moet minstens 8 tekens lang zijn.");
      return;
    }

    if (password !== confirmPassword) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }

    if (!acceptedTerms) {
      setError("Je moet de voorwaarden accepteren om een account te maken.");
      return;
    }

    setError("");
    onRegister?.();
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
            Maak je account aan bij <br />
            <span className="primary">Re:Mind</span>
          </h1>
          <p className="login-body">Registreer je om toegang te krijgen tot persoonlijke pauzes en inzichten.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-label">Naam</label>
            <input className="form-input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />

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
            Heb je al een account? <button type="button" className="auth-link-button" onClick={onGoToLogin}>Log in</button>
          </div>
        </div>
      </section>
    </main>
  );
}
