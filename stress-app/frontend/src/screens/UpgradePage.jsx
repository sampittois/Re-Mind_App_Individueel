import { useState } from "react";
import "../styles/upgrade.css";
import CheckIcon from "../components/CheckIcon";
import backIcon from "../assets/back.svg";

export default function UpgradePage({ profile, onUpdateProfile, setCurrentPage }) {
  const [billingPeriod, setBillingPeriod] = useState("yearly");
  const isMonthly = billingPeriod === "monthly";
  const [pendingPlan, setPendingPlan] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  function getCardLast4(numberInput) {
    const digitsOnly = (numberInput || "").replace(/\D/g, "");
    return digitsOnly.length >= 4 ? digitsOnly.slice(-4) : null;
  }

  async function choosePlan(plan) {
    // Basic is free, immediately apply. Other plans require payment flow.
    if (plan === "basic") {
      if (onUpdateProfile) await onUpdateProfile({ plan });
      setCurrentPage?.("profile");
      return;
    }

    setPendingPlan(plan);
  }

  async function performPayment() {
    if (!pendingPlan) return;
    setIsPaying(true);

    // Simulate payment delay / call to payment provider.
    await new Promise((res) => setTimeout(res, 900));

    // On success, update profile with chosen plan.
    if (onUpdateProfile) await onUpdateProfile({ plan: pendingPlan });

    // Also call backend to persist the plan server-side (useful when verifying
    // payments server-side or when a service key is available). It's okay if
    // this fails — the client-side upsert already handled it — but calling the
    // backend provides a stronger guarantee.
    const paymentDetails = {
      cardholder_name: cardholderName.trim() || null,
      card_last4: getCardLast4(cardNumber),
      card_expiry: expiryDate.trim() || null,
      billing_email: billingEmail.trim() || null,
    };

    try {
      if (profile?.id) {
        await fetch("http://localhost:3000/set-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: profile.id, plan: pendingPlan, payment_details: paymentDetails }),
        });
      }
    } catch (err) {
      // Silently ignore -- the client upsert already saved the plan.
      // In production, you'd want to retry or surface an error.
      // eslint-disable-next-line no-console
      console.warn("Backend set-plan request failed:", err?.message || err);
    }

    setCardholderName("");
    setCardNumber("");
    setExpiryDate("");
    setBillingEmail("");

    setIsPaying(false);
    setPendingPlan(null);
    setCurrentPage?.("profile");
  }

  function cancelPayment() {
    setPendingPlan(null);
    setCardholderName("");
    setCardNumber("");
    setExpiryDate("");
    setBillingEmail("");
  }

  return (
    <div className="upgrade-root">
      <div className="upgrade-inner">
        <div className="upgrade-top-row">
          <button className="upgrade-back icon-action-btn" type="button" onClick={() => setCurrentPage?.("profile")} aria-label="Terug">
              <img src={backIcon} alt="Terug" />
            </button>
        </div>
        {pendingPlan ? (
          <div className="payment-modal" role="dialog" aria-modal="true">
            <div className="payment-card">
              <h3>Betaling voor {pendingPlan === "premium" ? "Premium" : "Bedrijfslicentie"}</h3>
              <p>Voer je betaalgegevens in om door te gaan.</p>

              <div className="payment-fields">
                <label className="payment-label" htmlFor="payment-cardholder">Naam op kaart</label>
                <input
                  id="payment-cardholder"
                  className="payment-input"
                  type="text"
                  placeholder="Naam zoals op kaart"
                  value={cardholderName}
                  onChange={(event) => setCardholderName(event.target.value)}
                />

                <label className="payment-label" htmlFor="payment-cardnumber">Kaartnummer</label>
                <input
                  id="payment-cardnumber"
                  className="payment-input"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />

                <div className="payment-inline-fields">
                  <div>
                    <label className="payment-label" htmlFor="payment-expiry">Vervaldatum</label>
                    <input
                      id="payment-expiry"
                      className="payment-input"
                      type="text"
                      placeholder="03/29"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="payment-label" htmlFor="payment-email">Facturatie e-mail</label>
                    <input
                      id="payment-email"
                      className="payment-input"
                      type="email"
                      placeholder="naam@bedrijf.be"
                      value={billingEmail}
                      onChange={(event) => setBillingEmail(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="payment-actions">
                <button className="plan-cta" onClick={performPayment} disabled={isPaying}>
                  {isPaying ? "Bezig..." : "Betaal"}
                </button>
                <button className="plan-cta plan-cta--secondary" onClick={cancelPayment} disabled={isPaying}>
                  Annuleer
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="upgrade-header">
          <div className="upgrade-header-left">
            <h1 className="upgrade-title">Kies een plan</h1>
          </div>

          <div className="billing-toggle" role="tablist" aria-label="Facturatieperiode">
            <button
              type="button"
              role="tab"
              aria-selected={isMonthly}
              className={`billing-option${isMonthly ? " billing-option--active" : ""}`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Maandelijks
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isMonthly}
              className={`billing-option${!isMonthly ? " billing-option--active" : ""}`}
              onClick={() => setBillingPeriod("yearly")}
            >
              Jaarlijks
            </button>
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
            <div className="plan-price">{isMonthly ? "€2,99/maand" : "€33/jaar"}</div>
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
            <div className="plan-price plan-price--compact">{isMonthly ? "€2,20/maand" : "€20/jaar"}<span className="per">per werknemer</span></div>
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

