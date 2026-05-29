import { useEffect, useState } from "react";
import "../styles/settings.css";

export default function SettingsToggles({ profile, onUpdateProfile, companyColorsForced = false }) {
  const [darkMode, setDarkMode] = useState(false);
  // Company-colors toggle reset: the toggle is kept out of the UI for now.

  useEffect(() => {
    setDarkMode(Boolean(profile?.dark_mode));
  }, [profile?.dark_mode]);

  async function updateToggle(setter, patch, nextValue) {
    setter(nextValue);
    await onUpdateProfile?.(patch);
  }

  return (
    <div className="toggles-group">
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

      {/* Company colors toggle reset:
      {(profile?.plan === "premium" || profile?.plan === "bedrijfslicentie" || profile?.plan === "admin") && (
        <div className="toggle-row">
          <label className="toggle-label">Bedrijfskleuren</label>
          <button ... >
            <span className="toggle-thumb" />
          </button>
        </div>
      )}
      */}
    </div>
  );
}
