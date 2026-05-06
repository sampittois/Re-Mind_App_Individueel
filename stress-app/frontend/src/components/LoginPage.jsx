import { useState } from "react";
import "../styles/login.css";
import swirl from "../assets/swirl.png";

function BreathingLogoSimple({ size = 220 }) {
  const timerSize = size;
  const timerStroke = 4;
  const radius = (timerSize - timerStroke) / 2;

  return (
    <div className="login-breathingLogo" aria-hidden="true">
      <div className="breathingLogo__layer breathingLogo__layer--outer" style={{ width: size, height: size }} />
      <div className="breathingLogo__layer breathingLogo__layer--inner" style={{ width: size - 20, height: size - 20 }} />

      <svg className="breathingLogo__ring" width={timerSize} height={timerSize} viewBox={`0 0 ${timerSize} ${timerSize}`}>
        <circle cx={timerSize / 2} cy={timerSize / 2} r={radius} stroke="var(--border-color-default)" strokeWidth={timerStroke} fill="none" />
        <circle cx={timerSize / 2} cy={timerSize / 2} r={radius} stroke="var(--primary-dark)" strokeWidth={timerStroke} fill="none" strokeDasharray={2 * Math.PI * radius} strokeDashoffset={0} strokeLinecap="round" transform={`rotate(-90 ${timerSize / 2} ${timerSize / 2})`} />
      </svg>
      <img className="breathingLogo__icon" src={swirl} alt="" />
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onLogin?.();
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-left-inner">
          <BreathingLogoSimple size={220} />
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

            <button type="submit" className="login-submit">Log in</button>
          </form>

          <div className="login-footer">Heb je nog geen account? Registreer je</div>
        </div>
      </section>
    </main>
  );
}
