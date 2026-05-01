import { useState } from "react";
import "../styles/sliders.css";
import stressIcon from "../assets/stressLevel.svg";

export default function StressSlider({ label, onStressChange }) {
  const [stressLevel, setStressLevel] = useState(1);

  const handleClick = (value) => {
    setStressLevel(value);
    if (onStressChange) onStressChange(value);
  };

  return (
    <div className="slider-card stress-slider-card">
      <div className="slider-label">
        <img src={stressIcon} alt="Stress icon" className="slider-icon-img" />
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
                className={`slider-dot pos-${value} ${stressLevel === value ? "active" : ""}`}
                onClick={() => handleClick(value)}
                aria-label={`Set stress level to ${value}`}
                aria-pressed={stressLevel === value}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
