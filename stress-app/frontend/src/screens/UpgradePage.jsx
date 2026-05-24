import "../styles/upgrade.css";

export default function UpgradePage({ profile, onUpdateProfile, setCurrentPage }) {
  async function choosePlan(plan) {
    if (onUpdateProfile) {
      await onUpdateProfile({ plan });
    }
    setCurrentPage?.("profile");
  }

  return (
    <div className="upgrade-root">
      <div className="upgrade-inner">
        <div className="upgrade-header">
          <h1 className="upgrade-title">Kies een plan</h1>
          <div className="billing-toggle" role="tablist" aria-label="Billing period">
            <button className="billing-option">Maandelijks</button>
            <button className="billing-option billing-option--active">Jaarlijks</button>
          </div>
        </div>

        <div className="plans-row">
          <article className="plan-card">
            <h2 className="plan-heading">Basis plan</h2>
            <hr className="plan-divider" />
            <div className="plan-price">Gratis</div>
            <ul className="plan-features">
              <li><span className="check">✓</span>Pauzesuggesties</li>
              <li><span className="check">✓</span>Check-ins</li>
              <li><span className="check">✓</span>Dagelijks rapport</li>
              <li><span className="check">✓</span>Afsluitroutine</li>
            </ul>
            <div className="plan-cta-wrap">
              <button className="plan-cta" onClick={() => choosePlan("basic")}>Kies dit plan</button>
            </div>
          </article>

          <article className="plan-card plan-card--featured">
            <h2 className="plan-heading">Premium plan</h2>
            <hr className="plan-divider" />
            <div className="plan-price">€33/jaar</div>
            <ul className="plan-features">
              <li><span className="check">✓</span>Alle basis functies</li>
              <li><span className="check">✓</span>Personalizatie opties</li>
              <li><span className="check">✓</span>Diepere inzichten</li>
              <li><span className="check">✓</span>Wekelijks rapport</li>
            </ul>
            <div className="plan-cta-wrap">
              <button className="plan-cta" onClick={() => choosePlan("premium")}>Kies dit plan</button>
            </div>
          </article>

          <article className="plan-card">
            <h2 className="plan-heading">Bedrijfslicentie</h2>
            <hr className="plan-divider" />
            <div className="plan-price">€20/jaar<span className="per">per werknemer</span></div>
            <ul className="plan-features">
              <li><span className="check">✓</span>Alle basis functies</li>
              <li><span className="check">✓</span>Premium functies</li>
              <li><span className="check">✓</span>Bedrijfspersonalisatie</li>
            </ul>
            <div className="plan-cta-wrap">
              <button className="plan-cta" onClick={() => choosePlan("bedrijfslicentie")}>Kies dit plan</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

