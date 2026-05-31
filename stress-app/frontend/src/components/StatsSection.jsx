import React from 'react';
import '../styles/stats.css';

function formatStatNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.round(value));
  }

  const numericValue = Number(String(value ?? 0).trim().replace(",", "."));
  return Number.isFinite(numericValue) ? String(Math.round(numericValue)) : "0";
}

function StressIcon() {
  return (
    <svg className="stat-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 7H22V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 7L13.5 15.5L8.5 10.5L2 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EnergyIcon() {
  return (
    <svg className="stat-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 7L8 12H12L9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.8559 6H15.9999C16.5303 6 17.039 6.21071 17.4141 6.58579C17.7892 6.96086 17.9999 7.46957 17.9999 8V16C17.9999 16.5304 17.7892 17.0391 17.4141 17.4142C17.039 17.7893 16.5303 18 15.9999 18H13.0649" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 14V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.14 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V8C2 7.46957 2.21071 6.96086 2.58579 6.58579C2.96086 6.21071 3.46957 6 4 6H6.936" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PausesIcon() {
  return (
    <svg className="stat-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.6793 6.85217L19.7547 4.76522M19.7547 4.76522L18.5095 3.51304M19.7547 4.76522L21 6.01739M8.88029 10.9129H13.9391L8.88029 15.9999H13.9391M8.96685 2H13.9392M19.9061 13.4286C19.9061 18.1624 16.1215 22 11.453 22C6.78455 22 3 18.1624 3 13.4286C3 8.6947 6.78455 4.85714 11.453 4.85714C16.1215 4.85714 19.9061 8.6947 19.9061 13.4286Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function StatsSection({ stress, energy, pausesTaken, pausesSkipped }) {
  const stressValue = formatStatNumber(stress);
  const energyValue = formatStatNumber(energy);
  const pausesTakenValue = formatStatNumber(pausesTaken);
  const pausesSkippedValue = formatStatNumber(pausesSkipped);

  return (
    <section className="stats-section">
      <h2 className="section-title">Stats</h2>
      <div className="stats-grid">
        <div className="stat-card small">
          <div className="stat-row">
            <StressIcon />
            <div className="stat-label">Stress</div>
          </div>
          <div className="stat-number">{stressValue}/5</div>
          <div className="stat-sublabel">gemiddeld</div>
        </div>

        <div className="stat-card small">
          <div className="stat-row">
            <EnergyIcon />
            <div className="stat-label">Energie</div>
          </div>
          <div className="stat-number">{energyValue}/5</div>
          <div className="stat-sublabel">laag</div>
        </div>

        <div className="stat-card large">
          <div className="stat-row">
            <PausesIcon />
            <div className="stat-label">Pauzes</div>
          </div>
          <div className="stat-number-row">
            <div className="stat-number split">{pausesTakenValue}</div>
            <div className="stat-number split">{pausesSkippedValue}</div>
          </div>
          <div className="stat-sublabel split-labels">
            <span className="split-sublabel">genomen</span>
            <span className="split-sublabel">doorgewerkt</span>
          </div>
        </div>
      </div>
    </section>
  );
}
