import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/timer.css";
import Breathe from "./Breathe";
import BreakSuggestionsOverlay from "./BreakSuggestionsOverlay";
import { addBreak, addBreakReminderDecision } from "../lib/session";

const TIMER_STATE_STORAGE_KEY = "remind.timerState";
const DAY_TARGET_SECONDS = 8 * 60 * 60;
const ORIGINAL_BREATHING_LOGO_SIZE = 280;
const MIN_BREATHING_LOGO_SIZE = 180;

function loadTimerState(key = TIMER_STATE_STORAGE_KEY) {
  if (typeof window === "undefined") {
    return null;
  }

  if (!key) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
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
      ringSegments: Array.isArray(parsed.ringSegments) ? parsed.ringSegments : [],
    };
  } catch {
    return null;
  }
}

function saveTimerState(snapshot, key = TIMER_STATE_STORAGE_KEY) {
  if (typeof window === "undefined") {
    return;
  }

  if (!key) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
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

function getWorkdayDurationSeconds(profile) {
  const startMinutes = parseTimeToMinutes(profile?.work_start);
  const endMinutes = parseTimeToMinutes(profile?.work_end);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return DAY_TARGET_SECONDS;
  }

  const durationMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
  return Math.max(60, durationMinutes * 60);
}

function getWorkdayProgress(profile, now = Date.now()) {
  return Math.min(1, Math.max(0, getWorkdayProgressRatio(profile, now)));
}

function getWorkdayProgressRatio(profile, now = Date.now()) {
  const startMinutes = parseTimeToMinutes(profile?.work_start);
  const endMinutes = parseTimeToMinutes(profile?.work_end);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return 0;
  }

  const workdayDurationSeconds = getWorkdayDurationSeconds(profile);
  const workdayDurationMinutes = workdayDurationSeconds / 60;
  if (workdayDurationMinutes <= 0) {
    return 0;
  }

  const currentDate = new Date(now);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes() + currentDate.getSeconds() / 60 + currentDate.getMilliseconds() / 60000;
  const isOvernight = endMinutes < startMinutes;
  const elapsedMinutes = isOvernight && currentMinutes < endMinutes ? currentMinutes + 24 * 60 - startMinutes : currentMinutes - startMinutes;

  return elapsedMinutes / workdayDurationMinutes;
}

function createRingSegment(startProgress, endProgress, stroke) {
  return { startProgress, endProgress, stroke };
}

function normalizeRingSegments(segments = []) {
  return segments
    .map((segment) => ({
      startProgress: Number.isFinite(segment?.startProgress) ? segment.startProgress : 0,
      endProgress: Number.isFinite(segment?.endProgress) ? segment.endProgress : null,
      stroke: typeof segment?.stroke === "string" && segment.stroke ? segment.stroke : "var(--primary-dark)",
    }))
    .filter((segment) => Number.isFinite(segment.startProgress));
}

function BreathingLogo({ progress = 0, segments = [], active = false, size = ORIGINAL_BREATHING_LOGO_SIZE }) {
  const timerSize = size;
  const timerStroke = 4;
  const radius = (timerSize - timerStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`breathingLogo${active ? " breathingLogo--active" : ""}`} aria-hidden="true" style={{ position: "relative" }}>
      <Breathe className="breathing-logo-ball" size={timerSize} />
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
        {segments.map((segment, index) => {
          const startProgress = Math.max(0, Math.min(1, segment.startProgress ?? 0));
          const endProgress = Math.max(startProgress, Math.min(1, segment.endProgress ?? progress));
          const segmentLength = endProgress - startProgress;

          if (segmentLength <= 0) {
            return null;
          }

          return (
            <circle
              key={`${segment.stroke}-${startProgress}-${endProgress}-${index}`}
              cx={timerSize / 2}
              cy={timerSize / 2}
              r={radius}
              stroke={segment.stroke}
              strokeWidth={timerStroke}
              fill="none"
              strokeDasharray={`${circumference * segmentLength} ${circumference}`}
              strokeDashoffset={-circumference * startProgress}
              strokeLinecap="round"
              className="breathingLogo__segment"
              transform={`rotate(-90 ${timerSize / 2} ${timerSize / 2})`}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function Timer({
  onOpenReflection,
  onBreakLogged,
  onReminderDecisionLogged,
  profile,
  onStartBreathingExercise,
  onOpenSuggestion,
  showCard = true,
  cardContainerId = null,
}) {
  const storageKey = useMemo(() => {
    return profile?.id ? `${TIMER_STATE_STORAGE_KEY}.${profile.id}` : null;
  }, [profile?.id]);

  const initialTimerState = useMemo(() => loadTimerState(storageKey), [storageKey]);
  const [workStarted, setWorkStarted] = useState(initialTimerState?.workStarted ?? false);
  const [workStartedAt, setWorkStartedAt] = useState(initialTimerState?.workStartedAt ?? null);
  const [onBreak, setOnBreak] = useState(initialTimerState?.onBreak ?? false);
  const [finished, setFinished] = useState(initialTimerState?.finished ?? false);
  const [activeReminder, setActiveReminder] = useState(initialTimerState?.activeReminder ?? null);
  const [nextReminderAt, setNextReminderAt] = useState(initialTimerState?.nextReminderAt ?? null);
  const [activeBreakType, setActiveBreakType] = useState(initialTimerState?.breakType ?? "walk");
  const [breakSuggestionsRequest, setBreakSuggestionsRequest] = useState(null);
  const [ringSegments, setRingSegments] = useState(() => normalizeRingSegments(initialTimerState?.ringSegments ?? []));

  const [workSeconds, setWorkSeconds] = useState(initialTimerState?.workSeconds ?? 0);
  const [breakSeconds, setBreakSeconds] = useState(initialTimerState?.breakSeconds ?? 0);
  const [lastTickAt, setLastTickAt] = useState(() => initialTimerState?.lastTickAt ?? Date.now());
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [breathingLogoSize, setBreathingLogoSize] = useState(ORIGINAL_BREATHING_LOGO_SIZE);
  const [cardContainer, setCardContainer] = useState(null);

  const hrRowRef = useRef(null);
  const timerTimeRef = useRef(null);
  const btnStackRef = useRef(null);
  const timerCardRef = useRef(null);

  useEffect(() => {
    if (!showCard || !cardContainerId || typeof document === "undefined") {
      setCardContainer(null);
      return;
    }

    setCardContainer(document.getElementById(cardContainerId));
  }, [showCard, cardContainerId]);

  // When the storage key changes (user switched), reload timer state for the new user
  useEffect(() => {
    const state = loadTimerState(storageKey);
    if (!state) {
      setWorkStarted(false);
      setWorkStartedAt(null);
      setOnBreak(false);
      setFinished(false);
      setActiveReminder(null);
      setNextReminderAt(null);
      setActiveBreakType("walk");
      setBreakSuggestionsRequest(null);
      setRingSegments([]);
      setWorkSeconds(0);
      setBreakSeconds(0);
      setLastTickAt(Date.now());
      return;
    }

    setWorkStarted(Boolean(state.workStarted));
    setWorkStartedAt(state.workStartedAt ?? null);
    setOnBreak(Boolean(state.onBreak));
    setFinished(Boolean(state.finished));
    setActiveReminder(state.activeReminder ?? null);
    setNextReminderAt(state.nextReminderAt ?? null);
    setActiveBreakType(state.breakType ?? "walk");
    setBreakSuggestionsRequest(null);
    setRingSegments(normalizeRingSegments(state.ringSegments ?? []));
    setWorkSeconds(state.workSeconds ?? 0);
    setBreakSeconds(state.breakSeconds ?? 0);
    setLastTickAt(state.lastTickAt ?? Date.now());
  }, [storageKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const frequencyMins = Number(profile?.break_frequency_mins);
  const reminderIntervalMs =
    Boolean(profile?.allow_reminders) && Number.isFinite(frequencyMins) && frequencyMins > 0
      ? Math.round(frequencyMins * 60 * 1000)
      : null;
  const isTimerTicking = workStarted && !finished && !onBreak;

  useEffect(() => {
    saveTimerState(
      {
        workStarted,
        workStartedAt,
        onBreak,
        finished,
        activeReminder,
        nextReminderAt,
        breakType: activeBreakType,
        ringSegments,
        workSeconds,
        breakSeconds,
        lastTickAt,
      },
      storageKey
    );
  }, [workStarted, workStartedAt, onBreak, finished, activeReminder, nextReminderAt, activeBreakType, ringSegments, workSeconds, breakSeconds, lastTickAt, storageKey]);

  useEffect(() => {
    const notificationsApi = window.electronNotifications;
    if (!notificationsApi) {
      return undefined;
    }

    const shouldRunNotifications = isTimerTicking && Boolean(reminderIntervalMs);

    if (!shouldRunNotifications) {
      void notificationsApi.stopBreakReminders();
      return undefined;
    }

    void notificationsApi.startBreakReminders(reminderIntervalMs);

    return () => {
      void notificationsApi.stopBreakReminders();
    };
  }, [isTimerTicking, reminderIntervalMs]);

  useEffect(() => {
    if (!isTimerTicking) {
      setNextReminderAt(null);
      setActiveReminder(null);
      return;
    }

    if (!reminderIntervalMs) {
      return;
    }

    if (!Number.isFinite(nextReminderAt) || nextReminderAt <= Date.now()) {
      setNextReminderAt(Date.now() + reminderIntervalMs);
    }
  }, [isTimerTicking, reminderIntervalMs, nextReminderAt]);

  useEffect(() => {
    if (!workStarted || finished) {
      return undefined;
    }

    const syncElapsed = () => {
      const now = Date.now();

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
  }, [workStarted, finished, onBreak, lastTickAt]);

  useEffect(() => {
    if (!isTimerTicking || activeReminder || !reminderIntervalMs || !Number.isFinite(nextReminderAt)) {
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
  }, [isTimerTicking, activeReminder, nextReminderAt, reminderIntervalMs, frequencyMins]);

  const mainTime = useMemo(() => formatTime(workSeconds), [workSeconds]);

  const progress = useMemo(() => {
    return getWorkdayProgress(profile, clockNow);
  }, [clockNow, profile]);

  const renderedRingSegments = useMemo(() => {
    if (ringSegments.length === 0 && !workStartedAt) {
      return [];
    }

    const currentProgress = getWorkdayProgress(profile, clockNow);

    return ringSegments.map((segment) => {
      if (segment.endProgress != null) {
        return segment;
      }

      return {
        ...segment,
        endProgress: currentProgress,
      };
    });
  }, [clockNow, profile, ringSegments, workStartedAt]);

  const logoActive = workStarted && !onBreak && !finished;

  useEffect(() => {
    const row = hrRowRef.current;
    const timerTime = timerTimeRef.current;
    const btnStack = btnStackRef.current;

    if (!row) {
      return undefined;
    }

    const updateBreathingLogoSize = () => {
      const rowStyles = window.getComputedStyle(row);

      if (rowStyles.flexDirection === "column") {
        setBreathingLogoSize((current) => (current === ORIGINAL_BREATHING_LOGO_SIZE ? current : ORIGINAL_BREATHING_LOGO_SIZE));
        return;
      }

      const availableWidth = row.clientWidth;
      const timeWidth = timerTime?.offsetWidth ?? 0;
      const controlsWidth = btnStack?.offsetWidth ?? 0;
      const gap = Number.parseFloat(rowStyles.columnGap || rowStyles.gap || "0") || 0;
      const availableForLogo = availableWidth - timeWidth - controlsWidth - gap * 2;
      const nextSize = Math.max(MIN_BREATHING_LOGO_SIZE, Math.min(ORIGINAL_BREATHING_LOGO_SIZE, Math.floor(availableForLogo)));

      setBreathingLogoSize((current) => (current === nextSize ? current : nextSize));
    };

    updateBreathingLogoSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateBreathingLogoSize);
      observer.observe(row);

      if (timerTime) {
        observer.observe(timerTime);
      }

      if (btnStack) {
        observer.observe(btnStack);
      }

      window.addEventListener("resize", updateBreathingLogoSize);

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", updateBreathingLogoSize);
      };
    }

    window.addEventListener("resize", updateBreathingLogoSize);

    return () => {
      window.removeEventListener("resize", updateBreathingLogoSize);
    };
  }, [workStarted, finished, onBreak, showCard, cardContainer]);

  // Ensure timer-card height matches the stacked sliders' height
  useEffect(() => {
    const timerCard = timerCardRef.current;
    const slidersContainer = document.querySelector(".rating-cards-container");

    if (!timerCard || !slidersContainer) return undefined;

    const applyHeight = () => {
      const height = slidersContainer.offsetHeight;
      // add a bit of padding to match visual spacing
      timerCard.style.minHeight = `${Math.max(height, 220)}px`;
    };

    applyHeight();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(applyHeight);
      ro.observe(slidersContainer);
      window.addEventListener("resize", applyHeight);

      return () => {
        ro.disconnect();
        window.removeEventListener("resize", applyHeight);
      };
    }

    window.addEventListener("resize", applyHeight);
    return () => window.removeEventListener("resize", applyHeight);
  }, [showCard, cardContainer]);

  const startDay = async () => {
    const now = Date.now();
    const startProgress = getWorkdayProgress(profile, now);
    const initialSegments = startProgress > 0
      ? [createRingSegment(0, startProgress, "var(--error)"), createRingSegment(startProgress, null, "var(--primary-dark)")]
      : [createRingSegment(0, null, "var(--primary-dark)")];

    setWorkStarted(true);
    setWorkStartedAt(now);
    setFinished(false);
    setOnBreak(false);
    setActiveReminder(null);
    setBreakSuggestionsRequest(null);
    setActiveBreakType("walk");
    setNextReminderAt(reminderIntervalMs ? now + reminderIntervalMs : null);
    setRingSegments(initialSegments);
    setWorkSeconds(0);
    setBreakSeconds(0);
    setLastTickAt(now);

    // Rollover todos: move tomorrow -> today and remove today's done tasks
    try {
      const { error } = await import("../lib/todos").then((m) => m.rolloverTodosToToday());
      if (error) console.error("Failed to rollover todos:", error);
    } catch (e) {
      console.error("Rollover todos failed:", e);
    }

    onOpenReflection?.("manual");
  };

  const endDay = () => {
    resetTimerForReflection();
    onOpenReflection?.("finished-day");
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

  const beginBreak = () => {
    const currentProgress = getWorkdayProgress(profile, clockNow);

    setRingSegments((previous) => {
      const nextSegments = previous.slice();
      const activeSegment = nextSegments[nextSegments.length - 1];

      if (activeSegment && activeSegment.endProgress == null) {
        activeSegment.endProgress = currentProgress;
      }

      nextSegments.push(createRingSegment(currentProgress, null, "var(--primary)"));
      return nextSegments;
    });

    setOnBreak(true);
    setBreakSeconds(0);
    setLastTickAt(Date.now());
    setNextReminderAt(null);
  };

  const takeBreak = (fromReminder = false) => {
    if (fromReminder) {
      void logReminderDecision("taken");
      setActiveReminder(null);
    }

    beginBreak();
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

    setBreakSuggestionsRequest(null);
    setActiveBreakType(suggestion?.type || "walk");
  };

  const endBreak = async () => {
    const durationMinutes = Math.max(1, Math.round(breakSeconds / 60));
    const breakType = activeBreakType || "walk";
    const currentProgress = getWorkdayProgress(profile, clockNow);

    setRingSegments((previous) => {
      const nextSegments = previous.slice();
      const activeSegment = nextSegments[nextSegments.length - 1];

      if (activeSegment && activeSegment.endProgress == null) {
        activeSegment.endProgress = currentProgress;
      }

      nextSegments.push(createRingSegment(currentProgress, null, "var(--primary-dark)"));
      return nextSegments;
    });

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

  const resetTimerForReflection = () => {
    const now = Date.now();

    setWorkStarted(false);
    setWorkStartedAt(null);
    setOnBreak(false);
    setFinished(false);
    setActiveReminder(null);
    setNextReminderAt(null);
    setActiveBreakType("walk");
    setBreakSuggestionsRequest(null);
    setRingSegments([]);
    setWorkSeconds(0);
    setBreakSeconds(0);
    setLastTickAt(now);
  };

  const openReflection = () => {
    resetTimerForReflection();

    if (onOpenReflection) {
      onOpenReflection();
      return;
    }

    alert("Reflectie (demo)");
  };

  const timerCard = (
    <div className="timer-card" ref={timerCardRef}>
      <div className="hrRow" ref={hrRowRef}>
        <BreathingLogo progress={progress} segments={renderedRingSegments} active={logoActive} size={breathingLogoSize} />

        <div ref={timerTimeRef} style={{ minWidth: 140, display: "flex", justifyContent: "center" }}>
          <div className="bigTime">{workStarted ? mainTime : "--:--"}</div>
        </div>

        <div className="btnStack" ref={btnStackRef}>
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

          {finished && <div className="finished-message">Je bent klaar voor vandaag!</div>}
        </div>
      </div>

    </div>
  );

  return (
    <>
      {showCard && cardContainer ? createPortal(timerCard, cardContainer) : null}

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
    </>
  );
}
