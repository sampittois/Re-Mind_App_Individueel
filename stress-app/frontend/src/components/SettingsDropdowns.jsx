import { useState } from "react";
import CustomDropdown from "./CustomDropdown";
import "../styles/settings.css";

export default function SettingsDropdowns() {
  const [workType, setWorkType] = useState("");
  const [pauseFrequency, setPauseFrequency] = useState("");
  const [workManner, setWorkManner] = useState("");

  const workTypeOptions = [
    { value: "", label: "Kies een type werk" },
    { value: "kantoor", label: "Kantoor" },
    { value: "thuis", label: "Thuiswerk / remote" },
    { value: "hybrid", label: "Hybrid (kantoor + remote)" },
  ];

  const pauseFrequencyOptions = [
    { value: "", label: "Hoe vaak pauzeer je?" },
    { value: "elk-uur", label: "Ik vergeet vaak te pauzeren" },
    { value: "2-uur", label: "Ik neem soms pauzes" },
    { value: "3-uur", label: "Ik neem regelmatig pauzes" },
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
          onChange={setWorkType}
          placeholder="Kies een type werk"
          options={workTypeOptions}
        />
      </div>

      <div className="dropdown-wrapper">
        <CustomDropdown
          value={pauseFrequency}
          onChange={setPauseFrequency}
          placeholder="Hoe vaak pauzeer je?"
          options={pauseFrequencyOptions}
        />
      </div>

      <div className="dropdown-wrapper">
        <CustomDropdown
          value={workManner}
          onChange={setWorkManner}
          placeholder="Hoe werk jij meestaal?"
          options={workMannerOptions}
        />
      </div>
    </div>
  );
}
