import { useState } from "react";
import "./sliders.css";

export default function EnergySlider({ label, icon, onEnergyChange }) {
  const [energyLevel, setEnergyLevel] = useState(1);

  const handleClick = (value) => {
    setEnergyLevel(value);
    if (onEnergyChange) onEnergyChange(value);
  };

  return (
    <div className="slider-card energy-slider-card">
      <div className="slider-label">
        {icon && <span className="slider-icon">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="slider-scale-container">
        <div className="slider-numbers">
          {[1, 2, 3, 4, 5].map((num) => (
            <span key={num} className="slider-number">
              {num}
            </span>
          ))}
        </div>
        <div className="slider-dots-wrapper">
          <div className="slider-line"></div>
          <div className="slider-dots">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                className={`slider-dot ${energyLevel === value ? "active" : ""} ${energyLevel >= value ? "filled" : ""}`}
                onClick={() => handleClick(value)}
                aria-label={`Set energy level to ${value}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
