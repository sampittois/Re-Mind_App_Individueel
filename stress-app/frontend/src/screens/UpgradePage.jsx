import "../styles/upgrade.css";
import CheckIcon from "../components/CheckIcon";
import backIcon from "../assets/back.svg";

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
          <div className="upgrade-header-left">
            <button className="upgrade-back" type="button" onClick={() => setCurrentPage?.("profile")} aria-label="Terug">
              <img src={backIcon} alt="Terug" />
            </button>
            <h1 className="upgrade-title">Kies een plan</h1>
          </div>

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
              <li><CheckIcon className="plan-check" title="Geselecteerd"/>Pauzesuggesties</li>
              <li><CheckIcon className="plan-check"/>Check-ins</li>
              <li><CheckIcon className="plan-check"/>Dagelijks rapport</li>
              <li><CheckIcon className="plan-check"/>Afsluitroutine</li>
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
              <li><CheckIcon className="plan-check"/>Alle basis functies</li>
              <li><CheckIcon className="plan-check"/>Personalizatie opties</li>
              <li><CheckIcon className="plan-check"/>Diepere inzichten</li>
              <li><CheckIcon className="plan-check"/>Wekelijks rapport</li>
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
              <li><CheckIcon className="plan-check"/>Alle basis functies</li>
              <li><CheckIcon className="plan-check"/>Premium functies</li>
              <li><CheckIcon className="plan-check"/>Bedrijfspersonalisatie</li>
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

