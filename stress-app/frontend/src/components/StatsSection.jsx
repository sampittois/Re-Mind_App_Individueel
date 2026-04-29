export default function StatsSection({ stress, energy, pausesTaken, pausesSkipped }) {
  return (
    <section className="stats-section">
      <h2 className="section-title">Stats</h2>
      <div className="stats-grid">
        <div className="stat-block">
          <div className="stat-label">Stress</div>
          <div className="stat-value">{stress}/5</div>
          <div className="stat-sublabel">gemiddeld</div>
        </div>
        
        <div className="stat-block">
          <div className="stat-label">Energie</div>
          <div className="stat-value">{energy}/5</div>
          <div className="stat-sublabel">laag</div>
        </div>
        
        <div className="stat-block">
          <div className="stat-value-split">
            <div className="split-item">{pausesTaken}</div>
            <div className="split-item">{pausesSkipped}</div>
          </div>
          <div className="stat-label">Pauzes</div>
          <div className="stat-sublabel">
            <span className="split-sublabel">genomen</span>
            <span className="split-sublabel">doorgewerkt</span>
          </div>
        </div>
      </div>
    </section>
  );
}
