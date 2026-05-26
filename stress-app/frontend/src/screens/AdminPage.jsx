import { useEffect, useMemo, useState } from "react";
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

function formatActivityLabel(item) {
  if (!item) return "Onbekend";
  if (item.payment_status) return `Payment ${item.payment_status}`;
  if (item.start_time) return "Work session";
  return "Update";
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

  const recentActivity = useMemo(() => {
    const sessions = (overview.recentSessions || []).map((session) => ({
      id: `session-${session.id}`,
      label: "Sessie",
      detail: session.user_id,
      value: formatDateTime(session.created_at),
    }));

    const payments = (overview.recentPayments || []).map((payment) => ({
      id: `payment-${payment.id}`,
      label: formatActivityLabel(payment),
      detail: `${formatPlan(payment.plan)} · ${payment.billing_email || payment.user_id}`,
      value: formatDateTime(payment.created_at),
    }));

    return [...payments, ...sessions].slice(0, 8);
  }, [overview.recentPayments, overview.recentSessions]);

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

        <section className="admin-metrics">
          <article className="admin-card admin-card--metric">
            <span className="admin-card__label">Gebruikers</span>
            <strong className="admin-card__value">{overview.stats.totalUsers}</strong>
          </article>
          <article className="admin-card admin-card--metric">
            <span className="admin-card__label">Sessies</span>
            <strong className="admin-card__value">{overview.stats.totalSessions}</strong>
          </article>
          <article className="admin-card admin-card--metric">
            <span className="admin-card__label">Betalingen</span>
            <strong className="admin-card__value">{overview.stats.totalPayments}</strong>
          </article>
          <article className="admin-card admin-card--metric">
            <span className="admin-card__label">Admin accounts</span>
            <strong className="admin-card__value">{overview.stats.adminUsers}</strong>
          </article>
        </section>

        <section className="admin-grid">
          <article className="admin-card">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Snelle acties</span>
                <h2 className="admin-card__title">Alles in één klik</h2>
              </div>
            </div>
            <div className="admin-action-list">
              <button className="admin-action" type="button" onClick={() => setCurrentPage?.("home")}>Home</button>
              <button className="admin-action" type="button" onClick={() => setCurrentPage?.("reports")}>Rapporten</button>
              <button className="admin-action" type="button" onClick={() => setCurrentPage?.("pause")}>Pauzesuggesties</button>
              <button className="admin-action" type="button" onClick={() => setCurrentPage?.("profile")}>Profiel</button>
              <button className="admin-action" type="button" onClick={() => setCurrentPage?.("bedrijfsbeheer")}>Bedrijfsbeheer</button>
            </div>
          </article>

          <article className="admin-card">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Planverdeling</span>
                <h2 className="admin-card__title">Gebruikersrollen</h2>
              </div>
            </div>
            <div className="admin-plan-list">
              <div className="admin-plan-row"><span>Basic</span><strong>{overview.stats.basicUsers}</strong></div>
              <div className="admin-plan-row"><span>Premium</span><strong>{overview.stats.premiumUsers}</strong></div>
              <div className="admin-plan-row"><span>Bedrijfslicentie</span><strong>{overview.stats.companyUsers}</strong></div>
              <div className="admin-plan-row"><span>Admin</span><strong>{overview.stats.adminUsers}</strong></div>
            </div>
          </article>

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

          <article className="admin-card">
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

          <article className="admin-card admin-card--wide">
            <div className="admin-card__header">
              <div>
                <span className="admin-card__label">Recente activiteit</span>
                <h2 className="admin-card__title">Betalingen en sessies</h2>
              </div>
            </div>
            <div className="admin-activity-list">
              {recentActivity.map((item) => (
                <div className="admin-activity-row" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span>{item.value}</span>
                </div>
              ))}
              {!recentActivity.length && !loading ? <p className="admin-empty">Geen recente activiteit.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
