import { useEffect, useState } from "react";
import StressSlider from "../components/StressSlider";
import EnergySlider from "../components/EnergySlider";
import StatsSection from "../components/StatsSection";
import breakIcon from "../assets/break.svg";
import highEnergyIcon from "../assets/highEnergy.svg";
import highStressIcon from "../assets/highStress.svg";
import warningIcon from "../assets/warning.svg";
import { addEnergyCheck, addStressCheck, loadCurrentDayTimeline } from "../lib/session";
import { fetchCalendarEventsForDay } from "../lib/calendar";
import "../styles/reportsDay.css";

function formatReportDate(dateValue) {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatTodayDate() {
  return formatReportDate(new Date());
}

function isSliderValue(value) {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

function formatEventTime(event) {
  if (event.allDay) return "Hele dag";
  if (!event.start) return "";

  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start));
}

export default function ReportsDay({
  profile,
  user,
  reportUserId = null,
  sidePanelOpen = false,
  stressLevel,
  energyLevel,
  onStressLevelChange,
  onEnergyLevelChange,
}) {
  const [reportData, setReportData] = useState({
    timeline: [],
    stressLevel: 3,
    energyLevel: 2,
    pausesTaken: 0,
    pausesSkipped: 0,
  });
  const [loading, setLoading] = useState(true);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState("");
  const targetUserId = reportUserId || profile?.id || user?.id || null;

  async function refreshReport() {
    const { data, error } = await loadCurrentDayTimeline(targetUserId);

    if (error) {
      console.error("Failed to load daily report data:", error);
      return;
    }

    if (data) {
      setReportData(data);
    }
  }

  async function handleStressChange(value) {
    onStressLevelChange?.(value);
    setReportData((previous) => ({ ...previous, stressLevel: value }));
    const { error } = await addStressCheck(value, null, targetUserId);
    if (error) {
      console.error("Failed to save stress check-in:", error);
      return;
    }

    await refreshReport();
  }

  async function handleEnergyChange(value) {
    onEnergyLevelChange?.(value);
    setReportData((previous) => ({ ...previous, energyLevel: value }));
    const { error } = await addEnergyCheck(value, null, targetUserId);
    if (error) {
      console.error("Failed to save energy check-in:", error);
      return;
    }

    await refreshReport();
  }

  useEffect(() => {
    let active = true;

    async function loadReport() {
      const { data, error } = await loadCurrentDayTimeline(targetUserId);

      if (!active) return;

      if (error) {
        console.error("Failed to load daily report data:", error);
      }

      if (data) {
        setReportData(data);
      }

      setLoading(false);
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    let active = true;

    async function loadAgendaEvents() {
      if (!profile?.calendar_linked || targetUserId !== (user?.id || profile?.id)) {
        setAgendaEvents([]);
        setAgendaError("");
        return;
      }

      setAgendaLoading(true);
      setAgendaError("");
      const { data, error } = await fetchCalendarEventsForDay(new Date());

      if (!active) return;

      if (error) {
        setAgendaError(error.message || "Agenda-items laden is mislukt.");
        setAgendaEvents([]);
      } else {
        setAgendaEvents(data?.events || []);
      }

      setAgendaLoading(false);
    }

    loadAgendaEvents();

    return () => {
      active = false;
    };
  }, [profile?.calendar_linked, profile?.id, targetUserId, user?.id]);

  const renderIcon = (item) => {
    if (item.iconType === "break") return breakIcon;
    if (item.iconType === "highEnergy") return highEnergyIcon;
    if (item.iconType === "highStress") return highStressIcon;
    if (item.iconType === "warning") return warningIcon;
    if (item.type === "energy") return item.value >= 4 ? highEnergyIcon : warningIcon;
    if (item.type === "stress") {
      if (item.value >= 4) return highStressIcon;
      if (item.value <= 2) return highEnergyIcon;
    }
    return warningIcon;
  };

  const activeStressLevel = isSliderValue(stressLevel) ? stressLevel : reportData.stressLevel;
  const activeEnergyLevel = isSliderValue(energyLevel) ? energyLevel : reportData.energyLevel;

  return (
    <div className="reports-layout">
      <aside id="reports-side-panel" className={`reports-left${sidePanelOpen ? " reports-left--open" : ""}`}>
        <div className="rating-cards-container">
          <StressSlider label="Hoe hoog is je stressniveau nu?" value={activeStressLevel} onStressChange={handleStressChange} />
          <EnergySlider label="Wat is jouw energie level nu?" value={activeEnergyLevel} onEnergyChange={handleEnergyChange} />
        </div>

        <StatsSection
          stress={activeStressLevel}
          energy={activeEnergyLevel}
          pausesTaken={reportData.pausesTaken}
          pausesSkipped={reportData.pausesSkipped}
        />
      </aside>

      <section className="reports-right">
        <h1>Vandaag in momenten</h1>
        <p className="reports-date">{formatTodayDate()}</p>
        <p className="reports-desc">Je dagelijkse tijdlijn met check-ins, pauzes en belangrijke momenten</p>

        {loading && reportData.timeline.length === 0 ? <p>Daggegevens laden...</p> : null}

        <div className="timeline">
          {reportData.timeline.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-icon">
                <img src={renderIcon(item)} alt="icon" />
              </div>

              <div className={`timeline-content ${item.iconType === "warning" ? "timeline-warning" : ""}`}>
                <div className="timeline-time">{item.time}</div>

                <div className="timeline-topic">{item.title}</div>

                <div className="timeline-info">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {!loading && reportData.timeline.length === 0 ? <p>Er zijn nog geen opgeslagen check-ins voor deze gebruiker.</p> : null}

        {profile?.calendar_linked ? (
          <section className="report-agenda-card" aria-label="Gekoppelde agenda">
            <div className="report-agenda-card__header">
              <h2>Agenda</h2>
              {agendaLoading ? <span>laden...</span> : null}
            </div>

            {agendaError ? <p className="report-agenda-card__error">{agendaError}</p> : null}

            {!agendaLoading && !agendaError && agendaEvents.length === 0 ? (
              <p className="report-agenda-card__empty">Geen agenda-items voor vandaag.</p>
            ) : null}

            <div className="report-agenda-card__list">
              {agendaEvents.map((event) => (
                <article key={event.id} className="report-agenda-card__item">
                  <time>{formatEventTime(event)}</time>
                  <div>
                    <h3>{event.title}</h3>
                    {event.location ? <p>{event.location}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
