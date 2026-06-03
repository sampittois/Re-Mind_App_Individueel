import { useEffect, useState } from "react";
import "../styles/settings.css";

export default function SettingsToggles({ profile, onUpdateProfile, onCompanyColorsChange, companyColorsForced = false }) {
  const [darkMode, setDarkMode] = useState(false);
  const [companyColors, setCompanyColors] = useState(false);

  useEffect(() => {
    setDarkMode(Boolean(profile?.dark_mode));
    setCompanyColors(Boolean(profile?.use_company_colors || companyColorsForced));
  }, [profile?.dark_mode, profile?.use_company_colors, companyColorsForced]);

  async function updateToggle(setter, patch, nextValue) {
    setter(nextValue);
    await onUpdateProfile?.(patch);
    if (typeof patch.use_company_colors === "boolean") {
      onCompanyColorsChange?.(nextValue);
    }
  }

  return (
    <div className="toggles-group">
      <div className="toggle-row hidden">
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

      {(Boolean(profile?.company_id) || Boolean(profile?.company_management_enabled)) ? (
        <div className="toggle-row">
          <label className="toggle-label">Bedrijfskleuren</label>
          <button
            className={`toggle-switch ${companyColorsForced ? "disabled" : companyColors ? "active" : ""}`}
            onClick={() => updateToggle(setCompanyColors, { use_company_colors: !companyColors }, !companyColors)}
            disabled={companyColorsForced}
            type="button"
            role="switch"
            aria-checked={companyColors}
            aria-disabled={companyColorsForced}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      ) : null}
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
