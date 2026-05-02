import { useState } from "react";
import "../styles/settings.css";
import SettingsDropdowns from "./SettingsDropdowns";
import SettingsToggles from "./SettingsToggles";

export default function SettingsSection() {
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [pauses, setPauses] = useState([
    { id: 1, start: "12:00", end: "12:30" }
  ]);

  const addPause = () => {
    const newId = Math.max(...pauses.map(p => p.id), 0) + 1;
    setPauses([...pauses, { id: newId, start: "12:00", end: "12:30" }]);
  };

  const updatePause = (id, field, value) => {
    setPauses(pauses.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePause = (id) => {
    setPauses(pauses.filter(p => p.id !== id));
  };

  return (
    <section className="settings-section">
      {/* Hours section */}
      <div className="settings-hours-container">
        {/* Working hours */}
        <div className="time-inputs-row">
          <div className="time-input-group">
            <label className="settings-label">Start van je werkdag</label>
            <input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="time-input"
            />
          </div>
          <div className="time-input-group">
            <label className="settings-label">Einde van je werkdag</label>
            <input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="time-input"
            />
          </div>
        </div>

        {/* Fixed pauses */}
        <div className="pauses-group">
          <h4 className="pauses-title">Heb je vaste pauzes?</h4>
          {pauses.map((pause) => (
            <div key={pause.id} className="pause-row">
              <div className="time-input-group">
                <label className="settings-label">Start uur</label>
                <input
                  type="time"
                  value={pause.start}
                  onChange={(e) => updatePause(pause.id, "start", e.target.value)}
                  className="time-input"
                />
              </div>
              <div className="time-input-group">
                <label className="settings-label">Eind uur</label>
                <input
                  type="time"
                  value={pause.end}
                  onChange={(e) => updatePause(pause.id, "end", e.target.value)}
                  className="time-input"
                />
              </div>
              {pauses.length > 1 && (
                <button
                  className="remove-pause-btn"
                  onClick={() => removePause(pause.id)}
                  type="button"
                  aria-label="Verwijder pauze"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="add-pause-btn" onClick={addPause} type="button">
            +
          </button>
        </div>
      </div>

      {/* Dropdowns section */}
      <SettingsDropdowns />

      {/* Toggles section */}
      <SettingsToggles />
    </section>
  );
}
