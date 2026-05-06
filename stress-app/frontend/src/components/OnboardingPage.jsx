import { useState } from "react";
import "../styles/login.css";
import Breathe from "./Breathe";

export default function OnboardingPage({ onComplete }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workContext, setWorkContext] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();

    if (!firstName.trim()) {
      setError("Vul je voornaam in.");
      return;
    }

    if (!lastName.trim()) {
      setError("Vul je achternaam in.");
      return;
    }

    if (!workContext) {
      setError("Kies een werkcontext.");
      return;
    }

    setError("");
    onComplete?.();
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
            Even een korte <br />
            <span className="primary">setup</span>
          </h1>
          <p className="login-body">Deze setup kan nog aangepast worden bij je profiel.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="onboarding-step-indicators">
              <span className="step-dot" />
              <span className="step-dot step-dot--active" />
              <span className="step-dot" />
              <span className="step-dot" />
            </div>

            <div className="onboarding-row">
              <div className="onboarding-field">
                <label className="form-label">Voornaam</label>
                <input
                  className="form-input"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="onboarding-field">
                <label className="form-label">Achternaam</label>
                <input
                  className="form-input"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <label className="form-label">Werkcontext</label>
            <select
              className="form-input form-select"
              value={workContext}
              onChange={(e) => setWorkContext(e.target.value)}
            >
              <option value="">Kies een type werk</option>
              <option value="office">Kantoor werk</option>
              <option value="field">Veldwerk</option>
              <option value="hybrid">Hybride werk</option>
              <option value="remote">Thuis werken</option>
            </select>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="login-submit">
              Ga verder
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
