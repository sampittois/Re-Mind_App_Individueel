import StressSlider from "./StressSlider";
import EnergySlider from "./EnergySlider";
import StatsSection from "./StatsSection";
import breakIcon from "../assets/break.svg";
import highEnergyIcon from "../assets/highEnergy.svg";
import highStressIcon from "../assets/highStress.svg";
import warningIcon from "../assets/warning.svg";
import "../styles/reportsDay.css";

export default function ReportsDay() {
  // sample timeline data
  const timeline = [
    { id: 1, time: "08:00", type: "stress", stress: 2, energy: 4, text: "Goede start van de dag" },
    { id: 2, time: "10:00", type: "pause", text: "Koffiepauze" },
    { id: 3, time: "11:45", type: "stress", stress: 4, energy: 3, text: "Drukke vergadering" },
    { id: 4, time: "12:00", type: "pause", text: "Lunchpauze" },
    { id: 5, time: "13:00", type: "stress", stress: 5, energy: 2, text: "Piekmoment" },
    { id: 6, time: "14:45", type: "warning", stress: 5, energy: 2, text: "Waarschuwing: Hoge stress + lage energie" },
    { id: 7, time: "16:00", type: "stress", stress: 3, energy: 3, text: "Wat beter na pauze" },
    { id: 8, time: "17:00", type: "break", text: "Einde werkdag" }
  ];

  const renderIcon = (item) => {
    if (item.type === "break") return breakIcon;
    if (item.type === "warning") return warningIcon;
    if (item.stress != null && item.energy != null) {
      if (item.energy > item.stress) return highEnergyIcon;
      if (item.stress > item.energy) return highStressIcon;
    }
    return highEnergyIcon;
  };

  return (
    <div className="reports-layout">
      <aside className="reports-left">
        <div className="rating-cards-container">
          <StressSlider label="Hoe hoog is je stressniveau nu?" />
          <EnergySlider label="Wat is jouw energie level nu?" />
        </div>

        <StatsSection stress={3} energy={2} pausesTaken={3} pausesSkipped={1} />
      </aside>

      <section className="reports-right">
        <h1>Vandaag in momenten</h1>
        <p className="reports-desc">Je dagelijkse tijdlijn met check-ins, pauzes en belangrijke momenten</p>

        <div className="timeline">
          {timeline.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-icon">
                <img src={renderIcon(item)} alt="icon" />
              </div>

              <div className={`timeline-content ${item.type === "warning" ? "timeline-warning" : ""}`}>
                <div className="timeline-time">{item.time}</div>

                <div className="timeline-topic">
                  {item.type === "pause" ? "Pauze" : item.type === "warning" ? "Waarschuwing" : "Stress"}
                  {item.type !== "pause" && item.stress != null ? `: ${item.stress}/5` : null}
                  {item.type !== "pause" && item.energy != null ? ` • Energie: ${item.energy}/5` : null}
                </div>

                <div className="timeline-info">{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
