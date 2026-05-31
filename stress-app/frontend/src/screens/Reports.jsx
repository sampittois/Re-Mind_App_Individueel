import { useState } from "react";
import ReportsDay from "./ReportsDay";
import ReportsWeek from "./ReportsWeek";
import premiumIcon from "../assets/premium.svg";
import statsIcon from "../assets/stats.svg";
import { BackIcon } from "../components/IconActions";
import "../styles/reports.css";

export default function Reports({ setCurrentPage, profile, user }) {
  const [view, setView] = useState("day");
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const plan = profile?.plan || "basic";
  const reportUserId = profile?.id || user?.id || null;

  return (
    <main className={`reports-page page${view === "week" ? " reports-week-page" : ""}`}>
      <div className="reports-top-row">
        <div className="reports-top-actions">
          <button className="back-btn reports-back icon-action-btn" onClick={() => setCurrentPage && setCurrentPage("home")} aria-label="Terug">
            <BackIcon />
          </button>

          <button
            className="reports-panel-toggle icon-action-btn"
            type="button"
            onClick={() => setSidePanelOpen((open) => !open)}
            aria-label={sidePanelOpen ? "Sluit statistieken" : "Open statistieken"}
            aria-expanded={sidePanelOpen}
            aria-controls="reports-side-panel"
          >
            <img src={statsIcon} alt="" aria-hidden="true" />
          </button>
        </div>

        <div className="reports-toggle">
          <button className={`toggle-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>
            Dag
          </button>

          <button
            className={`toggle-btn ${view === "week" ? "active" : ""}`}
            onClick={() => {
              const isCompanyAccount = Boolean(profile?.company_id);
              if (plan === "basic" && !isCompanyAccount) {
                // Redirect to upgrade when non-company basic users try to open weekly reports
                setCurrentPage?.("upgrade");
                return;
              }
              setView("week");
            }}
          >
            {plan === "basic" ? <img src={premiumIcon} alt="premium" className="premium-icon" /> : null} Week
          </button>
        </div>
      </div>

      {view === "day" ? (
        <ReportsDay profile={profile} user={user} reportUserId={reportUserId} sidePanelOpen={sidePanelOpen} />
      ) : (
        <ReportsWeek profile={profile} user={user} reportUserId={reportUserId} sidePanelOpen={sidePanelOpen} />
      )}
    </main>
  );
}
