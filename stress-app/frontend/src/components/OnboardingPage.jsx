import { useState } from "react";
import "../styles/login.css";
import Breathe from "./Breathe";

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(1);

  // Step 1: basic user info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Step 2: working hours / breaks
  const [workStart, setWorkStart] = useState(9);
  const [workEnd, setWorkEnd] = useState(17);
  const [breakFrequencyMins, setBreakFrequencyMins] = useState(60);

  // Step 3: pause habit & work style
  const [pauseHabit, setPauseHabit] = useState("");
  const [workStyle, setWorkStyle] = useState("");

  // Step 4: reminders
  const [allowReminders, setAllowReminders] = useState(false);

  const [error, setError] = useState("");

  function goNext(e) {
    if (e && e.preventDefault) e.preventDefault();

    // validation per step
    if (step === 1) {
      if (!firstName.trim()) return setError("Vul je voornaam in.");
      if (!lastName.trim()) return setError("Vul je achternaam in.");
    }

    if (step === 2) {
      if (workStart >= workEnd) return setError("Kies geldige werkuren.");
      if (!breakFrequencyMins || breakFrequencyMins <= 0) return setError("Kies een geldige pauze-interval.");
    }

    if (step === 3) {
      if (!pauseHabit) return setError("Kies een pauzegewoonte.");
      if (!workStyle) return setError("Kies een werkstijl.");
    }

    setError("");

    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    // final
    onComplete?.({
      name: `${firstName} ${lastName}`,
      workStart,
      workEnd,
      breakFrequencyMins,
      pauseHabit,
      workStyle,
      allowReminders,
    });
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <>
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
            <p className="login-body">We gebruiken je naam om je profiel te personaliseren.</p>
          </>
        );

      case 2:
        return (
          <>
            <label className="form-label">Werkuren</label>
            <div className="onboarding-row">
              <div className="onboarding-field">
                <label className="form-label">Start uur</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="form-input"
                  value={workStart}
                  onChange={(e) => setWorkStart(Number(e.target.value))}
                />
              </div>
              <div className="onboarding-field">
                <label className="form-label">Eind uur</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="form-input"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(Number(e.target.value))}
                />
              </div>
            </div>

            <label className="form-label">Hoe vaak pauze (minuten)</label>
            <input
              type="number"
              min={15}
              className="form-input"
              value={breakFrequencyMins}
              onChange={(e) => setBreakFrequencyMins(Number(e.target.value))}
            />
          </>
        );

      case 3:
        return (
          <>
            <label className="form-label">Pauzegewoonte</label>
            <select
              className="form-input form-select"
              value={pauseHabit}
              onChange={(e) => setPauseHabit(e.target.value)}
            >
              <option value="">Hoe vaak pauzeer je?</option>
              <option value="often">Vaak</option>
              <option value="sometimes">Soms</option>
              <option value="rarely">Zelden</option>
            </select>

            <label className="form-label">Werkstijl</label>
            <select
              className="form-input form-select"
              value={workStyle}
              onChange={(e) => setWorkStyle(e.target.value)}
            >
              <option value="">Hoe werk jij meestal?</option>
              <option value="focused">Gefocust - lange sessies</option>
              <option value="chunked">Gedeeld - korte taken</option>
              <option value="interruptible">Onderbreekbaar - veel meetings</option>
            </select>
          </>
        );

      case 4:
        return (
          <>
            <p className="login-body">We sturen je korte, subtiele reminders wanneer je te lang doorwerkt.</p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <label className="form-label">Reminders toestaan?</label>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={allowReminders}
                  onChange={(e) => setAllowReminders(e.target.checked)}
                />
                <span style={{ marginLeft: 6 }}>{allowReminders ? "Aan" : "Uit"}</span>
              </label>
            </div>
          </>
        );

      default:
        return null;
    }
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

          <form className="login-form" onSubmit={goNext}>
            <div className="onboarding-step-indicators">
              <span className={`step-dot ${step === 1 ? "step-dot--active" : ""}`} />
              <span className={`step-dot ${step === 2 ? "step-dot--active" : ""}`} />
              <span className={`step-dot ${step === 3 ? "step-dot--active" : ""}`} />
              <span className={`step-dot ${step === 4 ? "step-dot--active" : ""}`} />
            </div>

            {renderStep()}

            {error && <p className="form-error">{error}</p>}

            <div className="onboarding-actions">
              {step > 1 && (
                <button type="button" className="login-secondary" onClick={goBack}>
                  Ga Terug
                </button>
              )}

              <button
                type="submit"
                className={step > 1 ? "login-submit login-submit--small" : "login-submit"}
              >
                {step < 4 ? "Ga verder" : "Klaar"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
