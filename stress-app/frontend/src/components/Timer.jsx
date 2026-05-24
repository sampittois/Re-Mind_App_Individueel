import { useEffect, useMemo, useState } from "react";
import "../styles/timer.css";
import Breathe from "./Breathe";
import { addBreak } from "../lib/session";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function normalizeTime(value) {
  if (typeof value !== "string" || value.length < 5) {
    return null;
  }

  return value.slice(0, 5);
}

function buildDateAtTime(baseDate, timeValue) {
  const [hours, minutes] = timeValue.split(":").map((part) => Number.parseInt(part, 10));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function formatClockTime(dateValue) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateValue);
}

function buildReminderSchedule(profile, referenceDate = new Date()) {
  if (!profile?.allow_reminders) {
    return [];
  }

  const reminders = [];
  const workStart = normalizeTime(profile?.work_start);
  const workEnd = normalizeTime(profile?.work_end);
  const breakFrequencyMins = Number(profile?.break_frequency_mins);
  const dayStart = workStart ? buildDateAtTime(referenceDate, workStart) : null;
  const dayEnd = workEnd ? buildDateAtTime(referenceDate, workEnd) : null;

  if (dayStart && dayEnd && Number.isFinite(breakFrequencyMins) && breakFrequencyMins > 0 && dayStart < dayEnd) {
    let reminderTime = new Date(dayStart);
    reminderTime.setMinutes(reminderTime.getMinutes() + breakFrequencyMins);

    while (reminderTime < dayEnd) {
      reminders.push({
        key: `interval-${reminderTime.toISOString()}`,
        at: reminderTime.getTime(),
        source: "interval",
        label: `elke ${breakFrequencyMins} minuten`,
      });

      reminderTime = new Date(reminderTime.getTime() + breakFrequencyMins * 60 * 1000);
    }
  }

  const fixedBreaks = Array.isArray(profile?.fixed_breaks) ? profile.fixed_breaks : [];

  fixedBreaks.forEach((pause, index) => {
    const pauseStart = normalizeTime(pause?.start);
    const reminderDate = pauseStart ? buildDateAtTime(referenceDate, pauseStart) : null;

    if (!reminderDate) {
      return;
    }

    if (dayStart && reminderDate < dayStart) {
      return;
    }

    if (dayEnd && reminderDate >= dayEnd) {
      return;
    }

    reminders.push({
      key: `fixed-${pause?.id ?? index}-${pauseStart}`,
      at: reminderDate.getTime(),
      source: "fixed",
      label: `Vaste pauze om ${pauseStart}`,
    });
  });

  const uniqueReminders = new Map();
  reminders.forEach((reminder) => {
    const duplicateKey = `${reminder.at}`;

    if (!uniqueReminders.has(duplicateKey)) {
      uniqueReminders.set(duplicateKey, reminder);
    }
  });

  return Array.from(uniqueReminders.values()).sort((left, right) => left.at - right.at);
}

function BreathingLogo({ progress = 0, active = false }) {
  const timerSize = 200;
  const timerStroke = 4;
  const radius = (timerSize - timerStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - safeProgress);

  return (
    <div className={`breathingLogo${active ? " breathingLogo--active" : ""}`} aria-hidden="true" style={{ position: "relative" }}>
      <Breathe size={280} className="breathing-logo-ball" />
      <svg
        className="breathingLogo__ring"
        width={timerSize}
        height={timerSize}
        viewBox={`0 0 ${timerSize} ${timerSize}`}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
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
    </div>
  );
}

export default function Timer({ onOpenReflection, onBreakLogged, profile }) {
  const [workStarted, setWorkStarted] = useState(false);
  const [workStartedAt, setWorkStartedAt] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeReminder, setActiveReminder] = useState(null);
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState(() => new Set());

  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);

  const dayTargetSeconds = 8 * 60 * 60;
  const reminderSchedule = useMemo(() => buildReminderSchedule(profile), [profile]);

  useEffect(() => {
    let timer = null;

    if (workStarted && !finished && !onBreak && !activeReminder) {
      timer = setInterval(() => setWorkSeconds((p) => p + 1), 1000);
    }
    if (workStarted && !finished && onBreak) {
      timer = setInterval(() => setBreakSeconds((p) => p + 1), 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workStarted, finished, onBreak, activeReminder]);

  useEffect(() => {
    if (!workStarted || finished || onBreak || activeReminder) {
      return undefined;
    }

    const checkForReminder = () => {
      const now = Date.now();
      const nextReminder = reminderSchedule.find((reminder) => {
        if (dismissedReminderKeys.has(reminder.key)) {
          return false;
        }

        if (workStartedAt && reminder.at < workStartedAt) {
          return false;
        }

        return reminder.at <= now;
      });

      if (nextReminder) {
        setActiveReminder(nextReminder);
      }
    };

    checkForReminder();
    const reminderTimer = setInterval(checkForReminder, 1000);

    return () => clearInterval(reminderTimer);
  }, [workStarted, finished, onBreak, activeReminder, reminderSchedule, dismissedReminderKeys, workStartedAt]);

  const mainTime = useMemo(() => formatTime(workSeconds), [workSeconds]);

  const progress = useMemo(() => {
    return Math.min(1, workSeconds / dayTargetSeconds);
  }, [workSeconds]);

  const logoActive = workStarted && !onBreak && !finished && !activeReminder;

  const startDay = () => {
    setWorkStarted(true);
    setWorkStartedAt(Date.now());
    setFinished(false);
    setOnBreak(false);
    setActiveReminder(null);
    setDismissedReminderKeys(new Set());
    setWorkSeconds(0);
    setBreakSeconds(0);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
    setActiveReminder(null);
    onOpenReflection?.();
  };

  const dismissDueReminders = () => {
    const now = Date.now();
    const dueReminderKeys = reminderSchedule
      .filter((reminder) => reminder.at <= now)
      .map((reminder) => reminder.key);

    if (dueReminderKeys.length === 0) {
      return;
    }

    setDismissedReminderKeys((previous) => {
      const next = new Set(previous);
      dueReminderKeys.forEach((key) => next.add(key));
      return next;
    });
  };

  const continueWorking = () => {
    dismissDueReminders();

    setActiveReminder(null);
  };

  const takeBreak = () => {
    dismissDueReminders();

    setActiveReminder(null);
    setOnBreak(true);
    setBreakSeconds(0);
  };

  const endBreak = async () => {
    const durationMinutes = Math.max(1, Math.round(breakSeconds / 60));
    setOnBreak(false);
    setBreakSeconds(0);

    const { error } = await addBreak({ type: "walk", duration_minutes: durationMinutes });
    if (error) {
      console.error("Failed to register timer break:", error);
      return;
    }

    onBreakLogged?.();
  };

  const openReflection = () => {
    if (onOpenReflection) {
      onOpenReflection();
      return;
    }

    alert("Reflectie (demo)");
  };

  return (
    <div className="timer-card">
      <div className="hrRow">
        <BreathingLogo progress={progress} active={logoActive} />

        <div style={{ minWidth: 140, display: "flex", justifyContent: "center" }}>
          <div className="bigTime">{workStarted ? mainTime : "--:--"}</div>
        </div>

        <div className="btnStack">
          {!workStarted && !finished && (
            <>
              <button className="btn" onClick={startDay}>
                Start werkdag
              </button>
              <div className="muted">
                Je kan op elk moment pauzeren
              </div>
            </>
          )}

          {workStarted && !finished && !onBreak && (
            <>
              <button className="btn" onClick={takeBreak}>
                Neem een pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
            </>
          )}

          {workStarted && !finished && onBreak && (
            <>
              <button className="btn" onClick={endBreak}>
                Beëindig pauze
              </button>
              <button className="btn" onClick={endDay}>
                Beëindig werkdag
              </button>
              <div className="muted">
                Pauzetijd: {formatTime(breakSeconds)}
              </div>
            </>
          )}

          {finished && (
            <>
              <div className="finished-message">Je bent klaar voor vandaag!</div>
              <button className="btn" onClick={openReflection}>
                Vul nu de reflectie in
              </button>
              <button className="btn" onClick={startDay}>
                Start nieuwe werkdag
              </button>
            </>
          )}
        </div>
      </div>

      {activeReminder ? (
        <div className="timer-reminder-overlay" role="dialog" aria-modal="true" aria-label="Break reminder">
          <div className="timer-reminder-card">
            <p className="timer-reminder-card__eyebrow">Break reminder</p>
            <h2 className="timer-reminder-card__title">Het is tijd voor een pauze</h2>
            <p className="timer-reminder-card__copy">
              {activeReminder.source === "fixed"
                ? `Je vaste pauze staat gepland om ${formatClockTime(new Date(activeReminder.at))}.`
                : `Je ingestelde reminder staat op ${activeReminder.label.toLowerCase()}.`}
            </p>

            <div className="timer-reminder-card__actions">
              <button className="btn timer-reminder-card__secondary" onClick={continueWorking} type="button">
                Doorgaan met werken
              </button>
              <button className="btn" onClick={takeBreak} type="button">
                Neem een pauze
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}