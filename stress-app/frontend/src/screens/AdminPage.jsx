import { useEffect, useState } from "react";
import "../styles/admin.css";
import backIcon from "../assets/back.svg";

const API_BASE = "http://localhost:3000";

const EMPTY_OVERVIEW = {
  stats: {
    totalUsers: 0,
    basicUsers: 0,
    premiumUsers: 0,
    companyUsers: 0,
    adminUsers: 0,
    totalSessions: 0,
    totalPayments: 0,
  },
  recentUsers: [],
  recentSessions: [],
  recentPayments: [],
};

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPlan(plan) {
  if (plan === "premium") return "Premium";
  if (plan === "bedrijfslicentie") return "Bedrijfslicentie";
  if (plan === "admin") return "Admin";
  return "Basic";
}

function planClass(plan) {
  if (plan === "premium") return "admin-badge--premium";
  if (plan === "bedrijfslicentie") return "admin-badge--company";
  if (plan === "admin") return "admin-badge--admin";
  return "admin-badge--basic";
}

function formatActiveStatus(isActive) {
  return isActive ? "Actief" : "Inactief";
}

export default function AdminPage({ profile, setCurrentPage }) {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [databaseHealthy, setDatabaseHealthy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = profile?.plan === "admin";

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const [overviewResponse, healthResponse] = await Promise.all([
        fetch(`${API_BASE}/admin/overview`),
        fetch(`${API_BASE}/supabase-health`),
      ]);

      const overviewData = await overviewResponse.json().catch(() => null);
      const healthData = await healthResponse.json().catch(() => null);

      if (!overviewResponse.ok) {
        throw new Error(overviewData?.error || "Kon admin-overzicht niet laden.");
      }

      setOverview(overviewData || EMPTY_OVERVIEW);
      setBackendHealthy(Boolean(overviewResponse.ok));
      setDatabaseHealthy(Boolean(healthResponse.ok && healthData?.ok));
    } catch (loadError) {
      setError(loadError?.message || "Kon admin-overzicht niet laden.");
      setBackendHealthy(false);
      setDatabaseHealthy(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    loadDashboard();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <main className="admin-page page">
        <div className="admin-shell">
          <section className="admin-card admin-card--locked">
            <p className="admin-eyebrow">Admin access</p>
            <h1 className="admin-title">Geen toegang</h1>
            <p className="admin-copy">Alleen het account met het admin-plan kan deze pagina zien.</p>
            <button className="admin-button" type="button" onClick={() => setCurrentPage?.("home")}>Terug naar home</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page page">
      <div className="admin-shell">
        <header className="admin-hero">
          <button className="admin-back" type="button" onClick={() => setCurrentPage?.("home")} aria-label="Terug">
            <img src={backIcon} alt="Terug" />
          </button>

          <div className="admin-hero__copy">
            <p className="admin-eyebrow">Admin dashboard</p>
            <h1 className="admin-title">Control center</h1>
            <p className="admin-copy">
              Dit is de centrale pagina om de app te monitoren, snel te schakelen tussen functies en de
              belangrijkste statistieken in één overzicht te zien.
            </p>
          </div>

          <div className="admin-hero__actions">
            <button className="admin-button" type="button" onClick={loadDashboard} disabled={loading}>
              {loading ? "Laden..." : "Ververs"}
            </button>
          </div>
        </header>

        <div className="admin-summary-row">
          <section className="admin-metrics">
            <article className="admin-card admin-card--metric">
              <span className="admin-card__label">Gebruikers</span>
              <strong className="admin-card__value">{overview.stats.totalUsers}</strong>
              <span className="admin-card__hint">Totaal aantal profielen in de database.</span>
            </article>
            <article className="admin-card admin-card--metric">
              <span className="admin-card__label">Sessies</span>
              <strong className="admin-card__value">{overview.stats.totalSessions}</strong>
              <span className="admin-card__hint">Alle opgeslagen work sessions.</span>
            </article>
            <article className="admin-card admin-card--metric">
              <span className="admin-card__label">Betalingen</span>
              <strong className="admin-card__value">{overview.stats.totalPayments}</strong>
              <span className="admin-card__hint">Geregistreerde payment details.</span>
            </article>
            <article className="admin-card admin-card--metric">
              <span className="admin-card__label">Admin accounts</span>
              <strong className="admin-card__value">{overview.stats.adminUsers}</strong>
              <span className="admin-card__hint">Manueel aan admin toegewezen profielen.</span>
            </article>
          </section>

          <article className="admin-card admin-card--status">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Systeemstatus</span>
                <h2 className="admin-card__title">Backend en database</h2>
              </div>
            </div>
            <div className="admin-status-list">
              <div className="admin-status-row"><span>Backend</span><strong className={backendHealthy ? "admin-status--ok" : "admin-status--bad"}>{backendHealthy ? "Online" : "Offline"}</strong></div>
              <div className="admin-status-row"><span>Supabase</span><strong className={databaseHealthy ? "admin-status--ok" : "admin-status--bad"}>{databaseHealthy ? "Online" : "Offline"}</strong></div>
              <div className="admin-status-row"><span>Plan</span><strong>Hidden admin</strong></div>
            </div>
            {error ? <p className="admin-error">{error}</p> : null}
          </article>
        </div>

        <section className="admin-grid">
          <article className="admin-card admin-card--wide">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Recente gebruikers</span>
                <h2 className="admin-card__title">Laatste profielwijzigingen</h2>
              </div>
            </div>
            <div className="admin-table">
              <div className="admin-table__head">
                <span>Gebruiker</span>
                <span>Plan</span>
                <span>Bijgewerkt</span>
              </div>
              {(overview.recentUsers || []).map((userRow) => (
                <div className="admin-table__row" key={userRow.id}>
                  <div>
                    <strong>{userRow.full_name || userRow.email || userRow.id}</strong>
                    <span>{userRow.email || userRow.id}</span>
                  </div>
                  <span className={`admin-badge ${planClass(userRow.plan)}`}>{formatPlan(userRow.plan)}</span>
                  <span>{formatDateTime(userRow.updated_at || userRow.created_at)}</span>
                </div>
              ))}
              {!(overview.recentUsers || []).length && !loading ? <p className="admin-empty">Geen gebruikers gevonden.</p> : null}
            </div>
          </article>

          <article className="admin-card admin-card--wide">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Recente sessies</span>
                <h2 className="admin-card__title">Tijd, gebruiker en status</h2>
              </div>
            </div>
            <p className="admin-card__copy">Hier zie je de laatste work sessions. De UUID is vervangen door een leesbare gebruikersnaam, met het startmoment en of de sessie nog actief is.</p>
            <div className="admin-table">
              <div className="admin-table__head">
                <span>Tijd</span>
                <span>Gebruiker</span>
                <span>Actief</span>
              </div>
              {(overview.recentSessions || []).map((session) => (
                <div className="admin-table__row" key={session.id}>
                  <div>
                    <strong>{formatDateTime(session.start_time || session.created_at)}</strong>
                    <span>{session.end_time ? `Einde: ${formatDateTime(session.end_time)}` : "Nog geen einde geregistreerd"}</span>
                  </div>
                  <span>{session.user_display_name || session.user_id}</span>
                  <span className={`admin-badge ${session.is_active ? "admin-badge--company" : "admin-badge--basic"}`}>
                    {formatActiveStatus(session.is_active)}
                  </span>
                </div>
              ))}
              {!(overview.recentSessions || []).length && !loading ? <p className="admin-empty">Geen recente sessies gevonden.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
