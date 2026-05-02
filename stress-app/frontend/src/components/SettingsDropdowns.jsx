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
          <option value="thuis">Thuiswerk / remote</option>
          <option value="hybrid">Hybrid (kantoor + remote)</option>
        </select>
      </div>

      <div className="dropdown-wrapper">
        <select
          value={pauseFrequency}
          onChange={(e) => setPauseFrequency(e.target.value)}
          className="dropdown"
        >
          <option value="">Hoe vaak pauzeer je?</option>
          <option value="elk-uur">Ik vergeet vaak te pauzeren</option>
          <option value="2-uur">Ik neem soms pauzes</option>
          <option value="3-uur">Ik neem regelmatig pauzes</option>
        </select>
      </div>

      <div className="dropdown-wrapper">
        <select
          value={workManner}
          onChange={(e) => setWorkManner(e.target.value)}
          className="dropdown"
        >
          <option value="">Hoe werk jij meestaal?</option>
          <option value="pc">Lange focusblokken</option>
          <option value="buiten">Veel korte taken</option>
          <option value="mengen">Afwisselend</option>
        </select>
      </div>
    </div>
  );
}
