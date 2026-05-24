import { useEffect, useMemo, useState } from "react";
import "../styles/timer.css";
import Breathe from "./Breathe";
import BreakSuggestionsOverlay from "./BreakSuggestionsOverlay";
import { addBreak, addBreakReminderDecision } from "../lib/session";

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
      nextReminderAt: Number.isFinite(parsed.nextReminderAt) ? parsed.nextReminderAt : null,
      breakType: typeof parsed.breakType === "string" && parsed.breakType.trim() ? parsed.breakType : "walk",
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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatClockTime(dateValue) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateValue);
}

function buildReminderPayload(reminderAt, frequencyMins) {
  return {
    key: `interval-${reminderAt}`,
    at: reminderAt,
    source: "interval",
    label: `elke ${frequencyMins} minuten`,
  };
}

function parseTimeToMinutes(value) {
  if (typeof value !== "string") {
    return null;
  }

  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function isNowNearFixedBreak(fixedBreaks, marginMins = 30) {
  if (!Array.isArray(fixedBreaks) || fixedBreaks.length === 0) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return fixedBreaks.some((pause) => {
    const startMinutes = parseTimeToMinutes(pause?.start);
    const endMinutes = parseTimeToMinutes(pause?.end);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return false;

    const windowStart = Math.max(0, startMinutes - marginMins);
    const windowEnd = endMinutes + marginMins;

    return nowMinutes >= windowStart && nowMinutes <= windowEnd;
  });
}

function getBreakSuggestionMode(profile) {
  // Only treat as 'lunch' when the current time is near a configured fixed break
  if (isNowNearFixedBreak(profile?.fixed_breaks, 30)) {
    return "lunch";
  }

  const frequencyMins = Number(profile?.break_frequency_mins);
  if (Number.isFinite(frequencyMins) && frequencyMins <= 20) {
    return "short";
  }

  if (Number.isFinite(frequencyMins) && frequencyMins >= 60) {
    return "long";
  }

  return "balanced";
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

export default function Timer({ onOpenReflection, onBreakLogged, onReminderDecisionLogged, profile, onStartBreathingExercise, onOpenSuggestion }) {
  const initialTimerState = useMemo(() => loadTimerState(), []);
  const [workStarted, setWorkStarted] = useState(initialTimerState?.workStarted ?? false);
  const [workStartedAt, setWorkStartedAt] = useState(initialTimerState?.workStartedAt ?? null);
  const [onBreak, setOnBreak] = useState(initialTimerState?.onBreak ?? false);
  const [finished, setFinished] = useState(initialTimerState?.finished ?? false);
  const [activeReminder, setActiveReminder] = useState(initialTimerState?.activeReminder ?? null);
  const [nextReminderAt, setNextReminderAt] = useState(initialTimerState?.nextReminderAt ?? null);
  const [activeBreakType, setActiveBreakType] = useState(initialTimerState?.breakType ?? "walk");
  const [breakSuggestionsRequest, setBreakSuggestionsRequest] = useState(null);

  const [workSeconds, setWorkSeconds] = useState(initialTimerState?.workSeconds ?? 0);
  const [breakSeconds, setBreakSeconds] = useState(initialTimerState?.breakSeconds ?? 0);
  const [lastTickAt, setLastTickAt] = useState(() => initialTimerState?.lastTickAt ?? Date.now());

  const frequencyMins = Number(profile?.break_frequency_mins);
  const reminderIntervalMs =
    Boolean(profile?.allow_reminders) && Number.isFinite(frequencyMins) && frequencyMins > 0
      ? Math.round(frequencyMins * 60 * 1000)
      : null;

  useEffect(() => {
    saveTimerState({
      workStarted,
      workStartedAt,
      onBreak,
      finished,
      activeReminder,
      nextReminderAt,
      breakType: activeBreakType,
      workSeconds,
      breakSeconds,
      lastTickAt,
    });
  }, [workStarted, workStartedAt, onBreak, finished, activeReminder, nextReminderAt, activeBreakType, workSeconds, breakSeconds, lastTickAt]);

  useEffect(() => {
    const notificationsApi = window.electronNotifications;
    if (!notificationsApi) {
      return undefined;
    }

    const shouldRunNotifications =
      workStarted &&
      !finished &&
      !onBreak &&
      Boolean(reminderIntervalMs);

    if (!shouldRunNotifications) {
      void notificationsApi.stopBreakReminders();
      return undefined;
    }

    void notificationsApi.startBreakReminders(reminderIntervalMs);

    return () => {
      void notificationsApi.stopBreakReminders();
    };
  }, [workStarted, finished, onBreak, reminderIntervalMs]);

  useEffect(() => {
    if (!workStarted || finished) {
      setNextReminderAt(null);
      return;
    }

    if (onBreak || !reminderIntervalMs) {
      return;
    }

    if (!Number.isFinite(nextReminderAt) || nextReminderAt <= Date.now()) {
      setNextReminderAt(Date.now() + reminderIntervalMs);
    }
  }, [workStarted, finished, onBreak, reminderIntervalMs, nextReminderAt]);

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
    if (!workStarted || finished || onBreak || activeReminder || !reminderIntervalMs || !Number.isFinite(nextReminderAt)) {
      return undefined;
    }

    const checkForReminder = () => {
      const now = Date.now();
      if (now >= nextReminderAt) {
        setActiveReminder(buildReminderPayload(nextReminderAt, frequencyMins));
      }
    };

    checkForReminder();
    const reminderTimer = setInterval(checkForReminder, 1000);

    return () => clearInterval(reminderTimer);
  }, [workStarted, finished, onBreak, activeReminder, nextReminderAt, reminderIntervalMs, frequencyMins]);

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
    setBreakSuggestionsRequest(null);
    setActiveBreakType("walk");
    setNextReminderAt(reminderIntervalMs ? now + reminderIntervalMs : null);
    setWorkSeconds(0);
    setBreakSeconds(0);
    setLastTickAt(now);
  };

  const endDay = () => {
    setFinished(true);
    setOnBreak(false);
    setActiveReminder(null);
    setBreakSuggestionsRequest(null);
    setActiveBreakType("walk");
    setNextReminderAt(null);
    setLastTickAt(Date.now());
    onOpenReflection?.();
  };

  const logReminderDecision = async (action) => {
    const { error } = await addBreakReminderDecision(action);
    if (error) {
      console.error("Failed to store reminder decision:", error);
      return;
    }

    onReminderDecisionLogged?.();
  };

  const continueWorking = async () => {
    await logReminderDecision("skipped");

    setActiveReminder(null);
    setNextReminderAt(reminderIntervalMs ? Date.now() + reminderIntervalMs : null);
    setLastTickAt(Date.now());
  };

  const takeBreak = (fromReminder = false) => {
    setBreakSuggestionsRequest({
      fromReminder,
      mode: getBreakSuggestionMode(profile),
    });
  };

  const startBreakFromSuggestion = async (suggestion) => {
    // If the suggestion is a breathing exercise, open the breathing flow instead
    if (suggestion?.type === "breathing") {
      setBreakSuggestionsRequest(null);
      // follow the same pattern as PauseSuggestions: launch breathing exercise
      if (onStartBreathingExercise) {
        onStartBreathingExercise();
        return;
      }

      // fallback: treat as a short breathing break
    }

    // If a parent provided a handler to open the PauseSuggestions overlay, prefer that
    if (onOpenSuggestion) {
      setBreakSuggestionsRequest(null);
      onOpenSuggestion(suggestion);
      return;
    }

    if (breakSuggestionsRequest?.fromReminder) {
      await logReminderDecision("taken");
    }

    setBreakSuggestionsRequest(null);
    setActiveReminder(null);
    setOnBreak(true);
    setActiveBreakType(suggestion?.type || "walk");
    setNextReminderAt(null);
    setBreakSeconds(0);
    setLastTickAt(Date.now());
  };

  const endBreak = async () => {
    const durationMinutes = Math.max(1, Math.round(breakSeconds / 60));
    const breakType = activeBreakType || "walk";
    setOnBreak(false);
    setBreakSeconds(0);
    setActiveBreakType("walk");
    setNextReminderAt(reminderIntervalMs ? Date.now() + reminderIntervalMs : null);
    setLastTickAt(Date.now());

    const { error } = await addBreak({ type: breakType, duration_minutes: durationMinutes });
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
              <button className="btn" onClick={() => takeBreak(false)}>
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
              Je ingestelde reminder staat ingesteld op {activeReminder?.label ?? formatClockTime(new Date(activeReminder.at))}.
            </p>

            <div className="timer-reminder-card__actions">
              <button className="btn timer-reminder-card__secondary" onClick={continueWorking} type="button">
                Doorgaan met werken
              </button>
              <button className="btn" onClick={() => takeBreak(true)} type="button">
                Neem een pauze
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {breakSuggestionsRequest ? (
        <BreakSuggestionsOverlay
          open={Boolean(breakSuggestionsRequest)}
          mode={breakSuggestionsRequest.mode}
          onClose={() => setBreakSuggestionsRequest(null)}
          onSelectSuggestion={startBreakFromSuggestion}
          onStartBreathingExercise={onStartBreathingExercise}
        />
      ) : null}
    </div>
  );
}