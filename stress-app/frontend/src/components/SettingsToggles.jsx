import { useState } from "react";
import "../styles/settings.css";

export default function SettingsToggles() {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [companyColors, setCompanyColors] = useState(true);

  return (
    <div className="toggles-group">
      <div className="toggle-row">
        <label className="toggle-label">Reminders toestaan?</label>
        <button
          className={`toggle-switch ${remindersEnabled ? "active" : ""}`}
          onClick={() => setRemindersEnabled(!remindersEnabled)}
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
          onClick={() => setDarkMode(!darkMode)}
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
          onClick={() => setCompanyColors(!companyColors)}
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
