import { useEffect, useState } from "react";
import CustomDropdown from "./CustomDropdown";
import "../styles/settings.css";

export default function SettingsDropdowns({ profile, onUpdateProfile }) {
  const [workType, setWorkType] = useState("");
  const [workManner, setWorkManner] = useState("");

  useEffect(() => {
    setWorkType(profile?.work_type ?? "");
    setWorkManner(profile?.work_style ?? "");
  }, [profile?.work_type, profile?.work_style]);

  async function updateWorkType(value) {
    setWorkType(value);
    await onUpdateProfile?.({ work_type: value || null });
  }

  async function updateWorkManner(value) {
    setWorkManner(value);
    await onUpdateProfile?.({ work_style: value || null });
  }

  const workTypeOptions = [
    { value: "", label: "Kies een type werk" },
    { value: "kantoor", label: "Kantoor" },
    { value: "thuis", label: "Thuiswerk / remote" },
    { value: "hybrid", label: "Hybrid (kantoor + remote)" },
  ];

  const workMannerOptions = [
    { value: "", label: "Hoe werk jij meestaal?" },
    { value: "pc", label: "Lange focusblokken" },
    { value: "buiten", label: "Veel korte taken" },
    { value: "mengen", label: "Afwisselend" },
  ];

  return (
    <div className="dropdowns-group">
      <div className="dropdown-wrapper">
        <CustomDropdown
          value={workType}
          onChange={updateWorkType}
          placeholder="Kies een type werk"
          options={workTypeOptions}
        />
      </div>

      <div className="dropdown-wrapper">
        <CustomDropdown
          value={workManner}
          onChange={updateWorkManner}
          placeholder="Hoe werk jij meestaal?"
          options={workMannerOptions}
        />
      </div>
    </div>
  );
}
