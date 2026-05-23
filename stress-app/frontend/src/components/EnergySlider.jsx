import { useState } from "react";
import "../styles/sliders.css";
import energyIcon from "../assets/energieLevel.svg";

export default function EnergySlider({ label, onEnergyChange, value }) {
  const [energyLevel, setEnergyLevel] = useState(1);
  const activeLevel = Number.isFinite(value) && value >= 1 && value <= 5 ? value : energyLevel;

  const handleClick = (value) => {
    setEnergyLevel(value);
    if (onEnergyChange) onEnergyChange(value);
  };

  return (
    <div className="slider-card energy-slider-card">
      <div className="slider-label">
        <img src={energyIcon} alt="Energy icon" className="slider-icon-img" />
        <span className="slider-header-text">{label}</span>
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
                type="button"
                className={`slider-dot pos-${value} ${activeLevel === value ? "active" : ""}`}
                onClick={() => handleClick(value)}
                aria-label={`Set energy level to ${value}`}
                aria-pressed={activeLevel === value}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
