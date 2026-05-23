import { useState } from "react";
import ReportsDay from "./ReportsDay";
import ReportsWeek from "./ReportsWeek";
import premiumIcon from "../assets/premium.svg";
import backIcon from "../assets/back.svg";
import "../styles/reports.css";

export default function Reports({ setCurrentPage }) {
  const [view, setView] = useState("day");

  return (
    <main className={`reports-page page${view === "week" ? " reports-week-page" : ""}`}>
      <div className="reports-top-row">
        <button className="back-btn reports-back" onClick={() => setCurrentPage && setCurrentPage("home")} aria-label="Terug">
          <img src={backIcon} alt="Terug" />
        </button>

        <div className="reports-toggle">
          <button className={`toggle-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>
            Dag
          </button>

          <button className={`toggle-btn ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>
            <img src={premiumIcon} alt="premium" className="premium-icon" /> Week
          </button>
        </div>
      </div>

      {view === "day" ? <ReportsDay /> : <ReportsWeek />}
    </main>
  );
}
