import { useEffect, useState } from "react";
import "../styles/settings.css";

export default function SettingsToggles({ profile, onUpdateProfile, companyColorsForced = false }) {
  const [darkMode, setDarkMode] = useState(false);
  const [companyColors, setCompanyColors] = useState(true);
  const isManagerOwnProfile = Boolean(profile?.company_management_enabled || profile?.plan === "bedrijfslicentie" || profile?.plan === "admin");
  const isForcedEmployee = Boolean(companyColorsForced) && !isManagerOwnProfile;

  useEffect(() => {
    setDarkMode(Boolean(profile?.dark_mode));
    setCompanyColors(Boolean(isForcedEmployee || (profile?.use_company_colors ?? true)));
  }, [profile?.dark_mode, profile?.use_company_colors, isForcedEmployee]);

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

      {(profile?.plan === "premium" || profile?.plan === "bedrijfslicentie" || profile?.plan === "admin") && (
        <div className="toggle-row">
          <label className="toggle-label">Bedrijfskleuren</label>
          <button
            className={`toggle-switch ${companyColors ? "active" : ""}${isForcedEmployee ? " disabled" : ""}`}
            onClick={() => {
              if (isForcedEmployee) return;
              updateToggle(setCompanyColors, { use_company_colors: !companyColors }, !companyColors);
            }}
            type="button"
            role="switch"
            aria-checked={companyColors}
            disabled={isForcedEmployee}
            aria-disabled={isForcedEmployee}
            title={isForcedEmployee ? "Bedrijfskleuren zijn afgedwongen door de manager" : undefined}
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      )}
    </div>
  );
}
