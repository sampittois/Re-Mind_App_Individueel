import { useEffect, useMemo, useState } from "react";
import swirl from "../assets/swirl.png";
import "../styles/timer.css";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function BreathingLogo({ progress = 0, active = false }) {
  const outerSize = active ? 220 : 280;
  const innerSize = active ? 200 : 240;
  const timerSize = 200;
  const timerStroke = 4;
  const radius = (timerSize - timerStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - safeProgress);

  return (
    <div className={`breathingLogo${active ? " breathingLogo--active" : ""}`} aria-hidden="true">
      <div
        className="breathingLogo__layer breathingLogo__layer--outer"
        style={{ width: outerSize, height: outerSize }}
      />
      <div
        className="breathingLogo__layer breathingLogo__layer--inner"
        style={{ width: innerSize, height: innerSize }}
      />
      <svg
        className="breathingLogo__ring"
        width={timerSize}
        height={timerSize}
        viewBox={`0 0 ${timerSize} ${timerSize}`}
      >
        <circle
          cx={timerSize / 2}
          cy={timerSize / 2}
          r={radius}
          stroke="var(--border-color-default)"
          strokeWidth={timerStroke}
          fill="none"
        />
        <circle
          cx={timerSize / 2}
          cy={timerSize / 2}
          r={radius}
          stroke="var(--primary-dark)"
          strokeWidth={timerStroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${timerSize / 2} ${timerSize / 2})`}
        />
      </svg>
      <img className="breathingLogo__icon" src={swirl} alt="" />
    </div>
  );
}

export default function Timer() {
  const [workStarted, setWorkStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [finished, setFinished] = useState(false);

  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const dayTargetSeconds = 8 * 60 * 60;

  useEffect(() => {
    let timer = null;

    if (workStarted && !finished && !onBreak) {
      timer = setInterval(() => setWorkSeconds((p) => p + 1), 1000);
    }
    if (workStarted && !finished && onBreak) {
      timer = setInterval(() => setBreakSeconds((p) => p + 1), 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workStarted, finished, onBreak]);

  const mainTime = useMemo(() => formatTime(workSeconds), [workSeconds]);

  const progress = useMemo(() => {
    return Math.min(1, workSeconds / dayTargetSeconds);
  }, [workSeconds]);

  const logoActive = workStarted && !onBreak && !finished;

  const startDay = () => {
    setWorkStarted(true);
    setFinished(false);
    setOnBreak(false);
    setWorkSeconds(0);
    setBreakSeconds(0);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
  };

  const takeBreak = () => setOnBreak(true);
  const endBreak = () => setOnBreak(false);

  return (
    <div className="card" style={{ borderRadius: 22, padding: 22 }}>
      <div className="hrRow">
        <BreathingLogo progress={progress} active={logoActive} />

        <div style={{ minWidth: 140, display: "flex", justifyContent: "center" }}>
          <div className="bigTime">{workStarted ? mainTime : "--:--"}</div>
        </div>

        <div className="btnStack">
          {!workStarted && !finished && (
            <>
              <button className="btn btnPrimary" onClick={startDay}>
                Start werkdag
              </button>
              <div className="muted" style={{ fontWeight: 700, fontSize: 12 }}>
                Je kan op elk moment pauzeren
              </div>
            </>
          )}

          {workStarted && !finished && !onBreak && (
            <>
              <button className="btn btnPrimary" onClick={takeBreak}>
                Neem een pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
            </>
          )}

          {workStarted && !finished && onBreak && (
            <>
              <button className="btn btnPrimary" onClick={endBreak}>
                Beëindig pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
              <div className="muted" style={{ fontSize: 12 }}>
                Pauzetijd: {formatTime(breakSeconds)}
              </div>
            </>
          )}

          {finished && (
            <>
              <div style={{ fontWeight: 900 }}>Je bent klaar voor vandaag!</div>
              <button className="btn btnPrimary" onClick={() => alert("Reflectie (demo)")}> 
                Vul nu de reflectie in
              </button>
              <button className="btn" onClick={startDay}>
                Start nieuwe werkdag
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}