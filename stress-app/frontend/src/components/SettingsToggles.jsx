import { useEffect, useState } from "react";
import "../styles/settings.css";

export default function SettingsToggles({ profile, onUpdateProfile }) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [companyColors, setCompanyColors] = useState(true);

  useEffect(() => {
    setRemindersEnabled(Boolean(profile?.allow_reminders));
    setDarkMode(Boolean(profile?.dark_mode));
    setCompanyColors(Boolean(profile?.use_company_colors ?? true));
  }, [profile?.allow_reminders, profile?.dark_mode, profile?.use_company_colors]);

  async function updateToggle(setter, patch, nextValue) {
    setter(nextValue);
    await onUpdateProfile?.(patch);
  }

  return (
    <div className="toggles-group">
      <div className="toggle-row">
        <label className="toggle-label">Reminders toestaan?</label>
        <button
          className={`toggle-switch ${remindersEnabled ? "active" : ""}`}
          onClick={() => updateToggle(setRemindersEnabled, { allow_reminders: !remindersEnabled }, !remindersEnabled)}
          type="button"
          role="switch"
          aria-checked={remindersEnabled}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      <div className="toggle-row">
        <label className="toggle-label">Dark mode</label>
        <button
          className={`toggle-switch ${darkMode ? "active" : ""}`}
          onClick={() => updateToggle(setDarkMode, { dark_mode: !darkMode }, !darkMode)}
          type="button"
          role="switch"
          aria-checked={darkMode}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      <div className="toggle-row">
        <label className="toggle-label">Bedrijfskleuren</label>
        <button
          className={`toggle-switch ${companyColors ? "active" : ""}`}
          onClick={() => updateToggle(setCompanyColors, { use_company_colors: !companyColors }, !companyColors)}
          type="button"
          role="switch"
          aria-checked={companyColors}
        >
          <span className="toggle-thumb" />
        </button>
      </div>
    </div>
  );
}
