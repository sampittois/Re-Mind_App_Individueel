import { useEffect, useState } from "react";
import "../styles/settings.css";
import CustomDropdown from "./CustomDropdown";
import SettingsDropdowns from "./SettingsDropdowns";
import SettingsToggles from "./SettingsToggles";
import { PlusIcon } from "./IconActions";

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

function normalizeReminderAmount(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return { amount: "", unit: "minutes" };
  }

  if (value % 60 === 0 && value >= 60) {
    return { amount: String(value / 60), unit: "hours" };
  }

  return { amount: String(value), unit: "minutes" };
}

function createPauseId() {
  return Date.now() + Math.random();
}

export default function SettingsSection({ profile, onUpdateProfile }) {
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [pauses, setPauses] = useState([{ id: 1, start: "12:00", end: "12:30" }]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderAmount, setReminderAmount] = useState("");
  const [reminderUnit, setReminderUnit] = useState("minutes");

  useEffect(() => {
    setWorkStart(normalizeTime(profile?.work_start, "08:00"));
    setWorkEnd(normalizeTime(profile?.work_end, "17:00"));
    setPauses(normalizePauses(profile?.fixed_breaks));
    setRemindersEnabled(Boolean(profile?.allow_reminders));
    const normalizedReminder = normalizeReminderAmount(profile?.break_frequency_mins);
    setReminderAmount(normalizedReminder.amount);
    setReminderUnit(normalizedReminder.unit);
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

  const updateReminderAmount = async (value) => {
    setReminderAmount(value);

    const numericAmount = Number(value);
    const frequencyMins =
      Number.isFinite(numericAmount) && numericAmount > 0
        ? reminderUnit === "hours"
          ? Math.round(numericAmount * 60)
          : Math.round(numericAmount)
        : null;

    await saveProfileFields({ break_frequency_mins: frequencyMins });
  };

  const updateReminderUnit = async (value) => {
    setReminderUnit(value);

    const numericAmount = Number(reminderAmount);
    const frequencyMins =
      Number.isFinite(numericAmount) && numericAmount > 0
        ? value === "hours"
          ? Math.round(numericAmount * 60)
          : Math.round(numericAmount)
        : null;

    await saveProfileFields({ break_frequency_mins: frequencyMins });
  };

  const toggleReminders = async () => {
    const nextValue = !remindersEnabled;
    setRemindersEnabled(nextValue);
    await saveProfileFields({ allow_reminders: nextValue });
  };

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
                  className="remove-pause-btn icon-action-btn"
                  onClick={() => removePause(pause.id)}
                  type="button"
                  aria-label="Verwijder pauze"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="add-pause-btn" onClick={addPause} type="button" aria-label="Pauze toevoegen">
            <PlusIcon />
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

        <div className="time-inputs-row reminders-interval-row">
          <div className="time-input-group">
            <label className="settings-label">Elke hoeveel tijd?</label>
            <input
              type="number"
              min="1"
              step="1"
              value={reminderAmount}
              onChange={(e) => updateReminderAmount(e.target.value)}
              className="time-input"
              placeholder="1"
            />
          </div>

          <div className="time-input-group">
            <label className="settings-label">Eenheid</label>
            <CustomDropdown
              value={reminderUnit}
              onChange={updateReminderUnit}
              placeholder="Kies eenheid"
              options={[
                { value: "minutes", label: "Minuten" },
                { value: "hours", label: "Uren" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Dropdowns section */}
      <SettingsDropdowns profile={profile} onUpdateProfile={onUpdateProfile} />

      {/* Toggles section */}
      <SettingsToggles profile={profile} onUpdateProfile={onUpdateProfile} />
    </section>
  );
}
