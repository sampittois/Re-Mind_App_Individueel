import { useEffect, useState } from "react";
import "../styles/login.css";
import "../styles/settings.css";
import Breathe from "../components/Breathe";
import CustomDropdown from "../components/CustomDropdown";
import { PlusIcon } from "../components/IconActions";

function normalizePauseName(value) {
  return value === "kofie" ? "kofie" : "lunch";
}

export default function OnboardingPage({ onComplete, onSkip, initialFirstName = "", initialLastName = "" }) {
  const [step, setStep] = useState(1);

  // Step 1: basic user info
  const [firstName, setFirstName] = useState(initialFirstName || "");
  const [lastName, setLastName] = useState(initialLastName || "");

  useEffect(() => {
    if (!firstName && initialFirstName) {
      setFirstName(initialFirstName);
    }
    if (!lastName && initialLastName) {
      setLastName(initialLastName);
    }
  }, [firstName, lastName, initialFirstName, initialLastName]);

  // Step 2: working hours / breaks (use same inputs as profile)
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [breakFrequencyMins, setBreakFrequencyMins] = useState(60);

  const [pauses, setPauses] = useState([{ id: 1, name: "lunch", start: "12:00", end: "12:30" }]);

  const [workType, setWorkType] = useState("");

  const pauseNameOptions = [
    { value: "lunch", label: "lunch" },
    { value: "kofie", label: "kofie" },
  ];

  const addPause = () => {
    const newId = Math.max(...pauses.map((p) => p.id), 0) + 1;
    setPauses([...pauses, { id: newId, name: "lunch", start: "12:00", end: "12:30" }]);
  };

  const updatePause = (id, field, value) => {
    setPauses(pauses.map((p) => (p.id === id ? { ...p, [field]: field === "name" ? normalizePauseName(value) : value } : p)));
  };

  const removePause = (id) => {
    setPauses(pauses.filter((p) => p.id !== id));
  };

  // Step 3: pause habit & work style
  const [pauseHabit, setPauseHabit] = useState("");
  const [workStyle, setWorkStyle] = useState("");

  const pauseOptions = [
    { value: "", label: "Hoe vaak pauzeer je?" },
    { value: "elk-uur", label: "Ik vergeet vaak te pauzeren" },
    { value: "2-uur", label: "Ik neem soms pauzes" },
    { value: "3-uur", label: "Ik neem regelmatig pauzes" },
  ];

  const workStyleOptions = [
    { value: "", label: "Hoe werk jij meestal?" },
    { value: "pc", label: "Lange focusblokken" },
    { value: "buiten", label: "Veel korte taken" },
    { value: "mengen", label: "Afwisselend" },
  ];

  // Step 4: reminders
  const [allowReminders, setAllowReminders] = useState(false);

  function goNext(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    // final
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`.trim();

    onComplete?.({
      name: fullName,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      workStart,
      workType,
      workEnd,
      breakFrequencyMins,
      fixedBreaks: pauses,
      pauseHabit,
      workStyle,
      allowReminders,
    });
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function renderStep() {
  const workTypeOptions = [
    { value: "", label: "Kies een type werk" },
    { value: "kantoor", label: "Kantoor" },
    { value: "thuis", label: "Thuiswerk / remote" },
    { value: "hybrid", label: "Hybrid (kantoor + remote)" },
  ];
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
            <div className="time-inputs-row">
              <div className="time-input-group">
                <label className="settings-label">Start van je werkdag</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="time-input"
                />
              </div>
              <div className="time-input-group">
                <label className="settings-label">Einde van je werkdag</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="time-input"
                />
              </div>
            </div>

            <div className="pauses-group">
              <h4 className="pauses-title">Heb je vaste pauzes?</h4>
              <div className="pause-row pause-row--header" aria-hidden="true">
                <span className="pause-row__label pause-row__label--spacer" />
                <span className="pause-row__label">Start uur</span>
                <span className="pause-row__label">Eind uur</span>
                <span className="pause-row__label" />
              </div>
              {pauses.map((pause) => (
                <div key={pause.id} className="pause-row pause-row--break-item">
                  <CustomDropdown
                    value={pause.name}
                    onChange={(value) => updatePause(pause.id, "name", value)}
                    placeholder="Kies een pauze"
                    options={pauseNameOptions}
                    compact
                  />

                  <div className="time-input-group">
                    <input
                      type="time"
                      value={pause.start}
                      onChange={(e) => updatePause(pause.id, "start", e.target.value)}
                      className="time-input"
                    />
                  </div>

                  <div className="time-input-group">
                    <input
                      type="time"
                      value={pause.end}
                      onChange={(e) => updatePause(pause.id, "end", e.target.value)}
                      className="time-input"
                    />
                  </div>

                  {pauses.length > 1 && (
                    <button
                      type="button"
                      className="remove-pause-btn icon-action-btn"
                      onClick={() => removePause(pause.id)}
                      aria-label="Verwijder pauze"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="add-pause-btn icon-add-btn" onClick={addPause}>
                <PlusIcon />
              </button>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <label className="form-label">Pauzegewoonte</label>
            <div className="dropdown-wrapper">
              <CustomDropdown
                value={pauseHabit}
                onChange={setPauseHabit}
                placeholder="Hoe vaak pauzeer je?"
                options={pauseOptions}
              />
            </div>

            <label className="form-label">Werkstijl</label>
            <div className="dropdown-wrapper">
              <CustomDropdown
                value={workStyle}
                onChange={setWorkStyle}
                placeholder="Hoe werk jij meestal?"
                options={workStyleOptions}
              />
            </div>
          </>
        );

      case 4:
        return (
          <>
            <p className="login-body">We sturen je korte, subtiele reminders wanneer je te lang doorwerkt.</p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.5rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label className="form-label">Reminders toestaan?</label>

                <div
                  role="switch"
                  tabIndex={0}
                  aria-checked={allowReminders}
                  className={`toggle-switch ${allowReminders ? "active" : ""}`}
                  onClick={() => setAllowReminders((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setAllowReminders((v) => !v);
                    }
                  }}
                  style={{ outline: "none" }}
                >
                  <div className="toggle-thumb" />
                </div>

                <span style={{ marginLeft: 6 }}>{allowReminders ? "Aan" : "Uit"}</span>
              </div>

              <label className="form-label">Werktype</label>
              <div className="dropdown-wrapper">
                <CustomDropdown
                  value={workType}
                  onChange={setWorkType}
                  placeholder="Kies een type werk"
                  options={workTypeOptions}
                />
              </div>
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

          <p className="login-footer">
            Je kunt deze stappen voorlopig overslaan en meteen naar de app gaan.{' '}
            <button type="button" className="auth-link-button" onClick={onSkip}>
              Ga naar de app
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
