import { useState } from "react";
import "../styles/settings.css";

export default function SettingsDropdowns() {
  const [workType, setWorkType] = useState("");
  const [pauseFrequency, setPauseFrequency] = useState("");
  const [workManner, setWorkManner] = useState("");

  return (
    <div className="dropdowns-group">
      <div className="dropdown-wrapper">
        <select
          value={workType}
          onChange={(e) => setWorkType(e.target.value)}
          className="dropdown"
        >
          <option value="">Kies een type werk</option>
          <option value="kantoor">Kantoor</option>
          <option value="thuis">Thuiswerk</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="dropdown-wrapper">
        <select
          value={pauseFrequency}
          onChange={(e) => setPauseFrequency(e.target.value)}
          className="dropdown"
        >
          <option value="">Hoe vaak pauzeer je?</option>
          <option value="elk-uur">Elk uur</option>
          <option value="2-uur">Om de 2 uur</option>
          <option value="3-uur">Om de 3 uur</option>
        </select>
      </div>

      <div className="dropdown-wrapper">
        <select
          value={workManner}
          onChange={(e) => setWorkManner(e.target.value)}
          className="dropdown"
        >
          <option value="">Hoe werk jij meestaal?</option>
          <option value="pc">Computer werk</option>
          <option value="buiten">Buitenwerk</option>
          <option value="mengen">Gemengd</option>
        </select>
      </div>
    </div>
  );
}
