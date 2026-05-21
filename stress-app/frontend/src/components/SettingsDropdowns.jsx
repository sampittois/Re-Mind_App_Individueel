import { useEffect, useState } from "react";
import CustomDropdown from "./CustomDropdown";
import "../styles/settings.css";

export default function SettingsDropdowns({ profile, onUpdateProfile }) {
  const [workType, setWorkType] = useState("");
  const [pauseFrequency, setPauseFrequency] = useState("");
  const [workManner, setWorkManner] = useState("");

  useEffect(() => {
    setWorkType(profile?.work_type ?? "");
    setPauseFrequency(profile?.break_frequency_mins ? String(profile.break_frequency_mins) : "");
    setWorkManner(profile?.work_style ?? "");
  }, [profile?.work_type, profile?.break_frequency_mins, profile?.work_style]);

  async function updateWorkType(value) {
    setWorkType(value);
    await onUpdateProfile?.({ work_type: value || null });
  }

  async function updatePauseFrequency(value) {
    setPauseFrequency(value);
    await onUpdateProfile?.({ break_frequency_mins: value ? Number(value) : null });
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

  const pauseFrequencyOptions = [
    { value: "", label: "Hoe vaak pauzeer je?" },
    { value: "60", label: "Ik vergeet vaak te pauzeren" },
    { value: "120", label: "Ik neem soms pauzes" },
    { value: "180", label: "Ik neem regelmatig pauzes" },
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
          value={pauseFrequency}
          onChange={updatePauseFrequency}
          placeholder="Hoe vaak pauzeer je?"
          options={pauseFrequencyOptions}
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
