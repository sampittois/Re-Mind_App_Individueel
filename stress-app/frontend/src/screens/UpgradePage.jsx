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
        <h1 className="upgrade-title">Kies een plan</h1>

        <div className="plans-row">
          <article className="plan-card">
            <h2 className="plan-heading">Basis plan</h2>
            <div className="plan-price">Gratis</div>
            <ul className="plan-features">
              <li>Pauzesuggesties</li>
              <li>Check-ins</li>
              <li>Dagelijks rapport</li>
              <li>Afsluitroutine</li>
            </ul>
            <div className="plan-cta-wrap">
              <button className="plan-cta" onClick={() => choosePlan("basic")}>Kies dit plan</button>
            </div>
          </article>

          <article className="plan-card plan-card--featured">
            <h2 className="plan-heading">Premium plan</h2>
            <div className="plan-price">€33/jaar</div>
            <ul className="plan-features">
              <li>Alle basis functies</li>
              <li>Personalizatie opties</li>
              <li>Diepere inzichten</li>
              <li>Wekelijks rapport</li>
            </ul>
            <div className="plan-cta-wrap">
              <button className="plan-cta" onClick={() => choosePlan("premium")}>Kies dit plan</button>
            </div>
          </article>

          <article className="plan-card">
            <h2 className="plan-heading">Bedrijfslicentie</h2>
            <div className="plan-price">€20/jaar<br/><span className="small">per werknemer</span></div>
            <ul className="plan-features">
              <li>Alle basis functies</li>
              <li>Premium functies</li>
              <li>Bedrijfspersonalisatie</li>
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
