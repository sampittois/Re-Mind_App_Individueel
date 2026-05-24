import { useEffect, useMemo, useState } from "react";
import "../styles/timer.css";
import Breathe from "./Breathe";
import { addBreak } from "../lib/session";

const TIMER_STATE_STORAGE_KEY = "remind.timerState";
const DAY_TARGET_SECONDS = 8 * 60 * 60;

function loadTimerState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TIMER_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      workStarted: Boolean(parsed.workStarted),
      workStartedAt: Number.isFinite(parsed.workStartedAt) ? parsed.workStartedAt : null,
      onBreak: Boolean(parsed.onBreak),
      finished: Boolean(parsed.finished),
      activeReminder: parsed.activeReminder && typeof parsed.activeReminder === "object" ? parsed.activeReminder : null,
      dismissedReminderKeys: Array.isArray(parsed.dismissedReminderKeys) ? parsed.dismissedReminderKeys : [],
      workSeconds: Number.isFinite(parsed.workSeconds) ? Math.max(0, Math.floor(parsed.workSeconds)) : 0,
      breakSeconds: Number.isFinite(parsed.breakSeconds) ? Math.max(0, Math.floor(parsed.breakSeconds)) : 0,
      lastTickAt: Number.isFinite(parsed.lastTickAt) ? parsed.lastTickAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function saveTimerState(snapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TIMER_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore localStorage write issues.
  }
}

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
  const dayStart = workStart ? buildDateAtTime(referenceDate, workStart) : null;
  const dayEnd = workEnd ? buildDateAtTime(referenceDate, workEnd) : null;

  const breakFrequencyMins = Number(profile?.break_frequency_mins);

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
  const initialTimerState = useMemo(() => loadTimerState(), []);
  const [workStarted, setWorkStarted] = useState(initialTimerState?.workStarted ?? false);
  const [workStartedAt, setWorkStartedAt] = useState(initialTimerState?.workStartedAt ?? null);
  const [onBreak, setOnBreak] = useState(initialTimerState?.onBreak ?? false);
  const [finished, setFinished] = useState(initialTimerState?.finished ?? false);
  const [activeReminder, setActiveReminder] = useState(initialTimerState?.activeReminder ?? null);
  const [dismissedReminderKeys, setDismissedReminderKeys] = useState(() => new Set(initialTimerState?.dismissedReminderKeys ?? []));

  const [workSeconds, setWorkSeconds] = useState(initialTimerState?.workSeconds ?? 0);
  const [breakSeconds, setBreakSeconds] = useState(initialTimerState?.breakSeconds ?? 0);
  const [lastTickAt, setLastTickAt] = useState(() => initialTimerState?.lastTickAt ?? Date.now());

  const reminderSchedule = useMemo(() => buildReminderSchedule(profile), [profile]);

  useEffect(() => {
    saveTimerState({
      workStarted,
      workStartedAt,
      onBreak,
      finished,
      activeReminder,
      dismissedReminderKeys: Array.from(dismissedReminderKeys),
      workSeconds,
      breakSeconds,
      lastTickAt,
    });
  }, [workStarted, workStartedAt, onBreak, finished, activeReminder, dismissedReminderKeys, workSeconds, breakSeconds, lastTickAt]);

  useEffect(() => {
    const notificationsApi = window.electronNotifications;
    if (!notificationsApi) {
      return undefined;
    }

    const frequencyMins = Number(profile?.break_frequency_mins);
    const shouldRunNotifications =
      workStarted &&
      !finished &&
      !onBreak &&
      Boolean(profile?.allow_reminders) &&
      Number.isFinite(frequencyMins) &&
      frequencyMins > 0;

    if (!shouldRunNotifications) {
      void notificationsApi.stopBreakReminders();
      return undefined;
    }

    const intervalMs = Math.round(frequencyMins * 60 * 1000);
    void notificationsApi.startBreakReminders(intervalMs);
  }, [workStarted, finished, onBreak, profile?.allow_reminders, profile?.break_frequency_mins]);

  useEffect(() => {
    if (!workStarted || finished) {
      return undefined;
    }

    const syncElapsed = () => {
      const now = Date.now();

      if (activeReminder && !onBreak) {
        setLastTickAt(now);
        return;
      }

      const elapsedSeconds = Math.floor((now - lastTickAt) / 1000);
      if (elapsedSeconds <= 0) {
        return;
      }

      if (onBreak) {
        setBreakSeconds((previous) => previous + elapsedSeconds);
      } else {
        setWorkSeconds((previous) => previous + elapsedSeconds);
      }

      setLastTickAt((previous) => previous + elapsedSeconds * 1000);
    };

    syncElapsed();
    const timer = setInterval(syncElapsed, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [workStarted, finished, onBreak, activeReminder, lastTickAt]);

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
    return Math.min(1, workSeconds / DAY_TARGET_SECONDS);
  }, [workSeconds]);

  const logoActive = workStarted && !onBreak && !finished && !activeReminder;

  const startDay = () => {
    const now = Date.now();
    setWorkStarted(true);
    setWorkStartedAt(now);
    setFinished(false);
    setOnBreak(false);
    setActiveReminder(null);
    setDismissedReminderKeys(new Set());
    setWorkSeconds(0);
    setBreakSeconds(0);
    setLastTickAt(now);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
    setActiveReminder(null);
    setLastTickAt(Date.now());
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
    setLastTickAt(Date.now());
  };

  const takeBreak = () => {
    dismissDueReminders();

    setActiveReminder(null);
    setOnBreak(true);
    setBreakSeconds(0);
    setLastTickAt(Date.now());
  };

  const endBreak = async () => {
    const durationMinutes = Math.max(1, Math.round(breakSeconds / 60));
    setOnBreak(false);
    setBreakSeconds(0);
    setLastTickAt(Date.now());

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
              Je ingestelde reminder staat gepland voor {formatClockTime(new Date(activeReminder.at))}.
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