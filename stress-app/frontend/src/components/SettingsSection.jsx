import { useEffect, useState } from "react";
import "../styles/settings.css";
import CustomDropdown from "./CustomDropdown";
import SettingsDropdowns from "./SettingsDropdowns";
import SettingsToggles from "./SettingsToggles";

function normalizeTime(value, fallback) {
  if (typeof value !== "string" || !value) return fallback;
  return value.slice(0, 5);
}

function normalizePauses(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ id: 1, start: "12:00", end: "12:30" }];
  }

  return value.map((pause, index) => ({
    id: pause?.id ?? index + 1,
    start: normalizeTime(pause?.start, "12:00"),
    end: normalizeTime(pause?.end, "12:30"),
  }));
}

function createPauseId() {
  return Date.now() + Math.random();
}

export default function SettingsSection({ profile, onUpdateProfile }) {
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [pauses, setPauses] = useState([{ id: 1, start: "12:00", end: "12:30" }]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState("60");

  useEffect(() => {
    setWorkStart(normalizeTime(profile?.work_start, "08:00"));
    setWorkEnd(normalizeTime(profile?.work_end, "17:00"));
    setPauses(normalizePauses(profile?.fixed_breaks));
    setRemindersEnabled(Boolean(profile?.allow_reminders));
    setReminderFrequency(profile?.break_frequency_mins ? String(profile.break_frequency_mins) : "60");
  }, [profile?.work_start, profile?.work_end, profile?.fixed_breaks, profile?.allow_reminders, profile?.break_frequency_mins]);

  async function saveProfileFields(nextFields) {
    await onUpdateProfile?.(nextFields);
  }

  const addPause = async () => {
    const nextPauses = [...pauses, { id: createPauseId(), start: "12:00", end: "12:30" }];
    setPauses(nextPauses);
    await saveProfileFields({ fixed_breaks: nextPauses });
  };

  const updatePause = async (id, field, value) => {
    const nextPauses = pauses.map((pause) => (pause.id === id ? { ...pause, [field]: value } : pause));
    setPauses(nextPauses);
    await saveProfileFields({ fixed_breaks: nextPauses });
  };

  const removePause = async (id) => {
    const nextPauses = pauses.filter((pause) => pause.id !== id);
    const normalizedPauses = nextPauses.length > 0 ? nextPauses : [{ id: createPauseId(), start: "12:00", end: "12:30" }];
    setPauses(normalizedPauses);
    await saveProfileFields({ fixed_breaks: normalizedPauses });
  };

  const updateWorkStart = async (value) => {
    setWorkStart(value);
    await saveProfileFields({ work_start: value || null });
  };

  const updateWorkEnd = async (value) => {
    setWorkEnd(value);
    await saveProfileFields({ work_end: value || null });
  };

  const updateReminderFrequency = async (value) => {
    setReminderFrequency(value);
    await saveProfileFields({ break_frequency_mins: value ? Number(value) : null });
  };

  const toggleReminders = async () => {
    const nextValue = !remindersEnabled;
    setRemindersEnabled(nextValue);
    await saveProfileFields({ allow_reminders: nextValue });
  };

  const reminderFrequencyOptions = [
    { value: "30", label: "Elke 30 minuten" },
    { value: "45", label: "Elke 45 minuten" },
    { value: "60", label: "Elke 1 uur" },
    { value: "90", label: "Elke 1,5 uur" },
    { value: "120", label: "Elke 2 uur" },
  ];

  return (
    <section className="settings-section">
      {/* Hours section */}
      <div className="settings-hours-container">
        {/* Working hours */}
        <div className="time-inputs-row">
          <div className="time-input-group">
            <label className="settings-label">Start van je werkdag</label>
            <input
              type="time"
              value={workStart}
              onChange={(e) => updateWorkStart(e.target.value)}
              className="time-input"
            />
          </div>
          <div className="time-input-group">
            <label className="settings-label">Einde van je werkdag</label>
            <input
              type="time"
              value={workEnd}
              onChange={(e) => updateWorkEnd(e.target.value)}
              className="time-input"
            />
          </div>
        </div>

        {/* Fixed pauses */}
        <div className="pauses-group">
          <h4 className="pauses-title">Heb je vaste pauzes?</h4>
          {pauses.map((pause) => (
            <div key={pause.id} className="pause-row">
              <div className="time-input-group">
                <label className="settings-label">Start uur</label>
                <input
                  type="time"
                  value={pause.start}
                  onChange={(e) => updatePause(pause.id, "start", e.target.value)}
                  className="time-input"
                />
              </div>
              <div className="time-input-group">
                <label className="settings-label">Eind uur</label>
                <input
                  type="time"
                  value={pause.end}
                  onChange={(e) => updatePause(pause.id, "end", e.target.value)}
                  className="time-input"
                />
              </div>
              {pauses.length > 1 && (
                <button
                  className="remove-pause-btn"
                  onClick={() => removePause(pause.id)}
                  type="button"
                  aria-label="Verwijder pauze"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="add-pause-btn" onClick={addPause} type="button">
            +
          </button>
        </div>
      </div>

      <div className="reminders-group">
        <div className="toggle-row">
          <label className="toggle-label">Break reminders</label>
          <button
            className={`toggle-switch ${remindersEnabled ? "active" : ""}`}
            onClick={toggleReminders}
            type="button"
            role="switch"
            aria-checked={remindersEnabled}
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        <div className="dropdown-wrapper">
          <CustomDropdown
            value={reminderFrequency}
            onChange={updateReminderFrequency}
            placeholder="Hoe vaak moet de app je pauze herinneren?"
            options={reminderFrequencyOptions}
          />
        </div>
      </div>

      {/* Dropdowns section */}
      <SettingsDropdowns profile={profile} onUpdateProfile={onUpdateProfile} />

      {/* Toggles section */}
      <SettingsToggles profile={profile} onUpdateProfile={onUpdateProfile} />
    </section>
  );
}
