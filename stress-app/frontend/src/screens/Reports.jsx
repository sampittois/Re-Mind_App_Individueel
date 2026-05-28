import { useState } from "react";
import ReportsDay from "./ReportsDay";
import ReportsWeek from "./ReportsWeek";
import premiumIcon from "../assets/premium.svg";
import { BackIcon } from "../components/IconActions";
import "../styles/reports.css";

export default function Reports({ setCurrentPage, profile, user }) {
  const [view, setView] = useState("day");
  const plan = profile?.plan || "basic";
  const reportUserId = profile?.id || user?.id || null;

  return (
    <main className={`reports-page page${view === "week" ? " reports-week-page" : ""}`}>
      <div className="reports-top-row">
        <button className="back-btn reports-back icon-action-btn" onClick={() => setCurrentPage && setCurrentPage("home")} aria-label="Terug">
          <BackIcon />
        </button>

        <div className="reports-toggle">
          <button className={`toggle-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>
            Dag
          </button>

          <button
            className={`toggle-btn ${view === "week" ? "active" : ""}`}
            onClick={() => {
              if (plan === "basic") {
                // Redirect to upgrade when basic users try to open weekly reports
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

      {view === "day" ? <ReportsDay profile={profile} user={user} reportUserId={reportUserId} /> : <ReportsWeek profile={profile} user={user} reportUserId={reportUserId} />}
    </main>
  );
}
