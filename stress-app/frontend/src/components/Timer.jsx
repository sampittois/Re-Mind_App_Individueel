import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/timer.css";
import Breathe from "./Breathe";
import BreakSuggestionsOverlay from "./BreakSuggestionsOverlay";
import { addBreak, addBreakReminderDecision, startSession } from "../lib/session";

const TIMER_STATE_STORAGE_KEY = "remind.timerState";
const FIXED_BREAK_REMINDERS_STORAGE_KEY = "remind.fixedBreakReminderDecisions";
const DAY_TARGET_SECONDS = 8 * 60 * 60;
const ORIGINAL_BREATHING_LOGO_SIZE = 280;
const MIN_BREATHING_LOGO_SIZE = 180;
const LATE_START_THRESHOLD_MINUTES = 5;

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

function buildFixedBreakReminderPayload(fixedBreak, breakIndex, dateKey) {
  const start = typeof fixedBreak?.start === "string" ? fixedBreak.start : "";
  const end = typeof fixedBreak?.end === "string" ? fixedBreak.end : "";
  const name = typeof fixedBreak?.name === "string" && fixedBreak.name.trim() ? fixedBreak.name.trim() : "pauze";
  const normalizedName = name.toLowerCase();

  return {
    key: `fixed-${dateKey}-${fixedBreak?.id ?? breakIndex}-${normalizedName}-${start}`,
    at: Date.now(),
    source: "fixed",
    breakId: fixedBreak?.id ?? breakIndex,
    breakName: normalizedName,
    breakStart: start,
    breakEnd: end,
    dateKey,
    label: start,
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

function getLocalDateKey(dateValue = new Date()) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFixedBreakReminderDecisionKey(profileId, reminder) {
  return `${profileId || "anonymous"}:${reminder?.key || ""}`;
}

function loadFixedBreakReminderDecisions() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(FIXED_BREAK_REMINDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hasFixedBreakReminderDecision(profileId, reminder) {
  const decisions = loadFixedBreakReminderDecisions();
  return Boolean(decisions[getFixedBreakReminderDecisionKey(profileId, reminder)]);
}

function storeFixedBreakReminderDecision(profileId, reminder, action) {
  if (typeof window === "undefined" || reminder?.source !== "fixed") {
    return;
  }

  try {
    const decisions = loadFixedBreakReminderDecisions();
    const todayKey = reminder.dateKey || getLocalDateKey();
    const nextDecisions = Object.fromEntries(
      Object.entries(decisions).filter(([, value]) => value?.dateKey === todayKey)
    );

    nextDecisions[getFixedBreakReminderDecisionKey(profileId, reminder)] = {
      action,
      dateKey: todayKey,
      decidedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(FIXED_BREAK_REMINDERS_STORAGE_KEY, JSON.stringify(nextDecisions));
  } catch {
    // Ignore localStorage write issues.
  }
}

function getDueFixedBreakReminder(profile, now = new Date()) {
  if (!Array.isArray(profile?.fixed_breaks) || profile.fixed_breaks.length === 0) {
    return null;
  }

  const nowClock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateKey = getLocalDateKey(now);

  for (let index = 0; index < profile.fixed_breaks.length; index += 1) {
    const fixedBreak = profile.fixed_breaks[index];
    const start = typeof fixedBreak?.start === "string" ? fixedBreak.start.slice(0, 5) : "";

    if (start !== nowClock) {
      continue;
    }

    const end = typeof fixedBreak?.end === "string" ? fixedBreak.end.slice(0, 5) : "";
    const reminder = buildFixedBreakReminderPayload({ ...fixedBreak, start, end }, index, dateKey);
    if (!hasFixedBreakReminderDecision(profile?.id, reminder)) {
      return reminder;
    }
  }

  return null;
}

function isLunchReminder(reminder) {
  return reminder?.source === "fixed" && reminder?.breakName === "lunch";
}

function isCoffeeReminder(reminder) {
  return reminder?.source === "fixed" && ["koffie", "kofie"].includes(reminder?.breakName);
}

function getFixedBreakDurationMinutes(reminder) {
  const startMinutes = parseTimeToMinutes(reminder?.breakStart);
  const endMinutes = parseTimeToMinutes(reminder?.breakEnd);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return null;
  }

  return endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
}

function isNowNearLunchBreak(fixedBreaks, marginMins = 30) {
  if (!Array.isArray(fixedBreaks) || fixedBreaks.length === 0) return false;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return fixedBreaks.some((pause) => {
    if (pause?.name !== "lunch") return false;

    const startMinutes = parseTimeToMinutes(pause?.start);
    const endMinutes = parseTimeToMinutes(pause?.end);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return false;

    const windowStart = Math.max(0, startMinutes - marginMins);
    const windowEnd = endMinutes + marginMins;

    return nowMinutes >= windowStart && nowMinutes <= windowEnd;
  });
}

function getBreakSuggestionMode(profile) {
  // Only treat as 'lunch' when the current time is near a configured lunch break.
  if (isNowNearLunchBreak(profile?.fixed_breaks, 30)) {
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

function getReminderBreakSuggestionMode(reminder, profile) {
  if (!isCoffeeReminder(reminder)) {
    return getBreakSuggestionMode(profile);
  }

  const durationMinutes = getFixedBreakDurationMinutes(reminder);
  return Number.isFinite(durationMinutes) && durationMinutes <= 20 ? "short" : "long";
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

function clampProgress(value) {
  return Math.min(1, Math.max(0, value));
}

function getMinutesAfterWorkdayStart(profile, now = Date.now()) {
  const startMinutes = parseTimeToMinutes(profile?.work_start);
  const endMinutes = parseTimeToMinutes(profile?.work_end);

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return 0;
  }

  const currentDate = new Date(now);
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes() + currentDate.getSeconds() / 60 + currentDate.getMilliseconds() / 60000;
  const isOvernight = endMinutes < startMinutes;

  return isOvernight && currentMinutes < endMinutes ? currentMinutes + 24 * 60 - startMinutes : currentMinutes - startMinutes;
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

  const elapsedMinutes = getMinutesAfterWorkdayStart(profile, now);

  return elapsedMinutes / workdayDurationMinutes;
}

function getSegmentTone(segment) {
  if (typeof segment?.tone === "string" && segment.tone) {
    return segment.tone;
  }

  if (segment?.stroke === "var(--primary)" || segment?.stroke === "var(--primary-light)") {
    return "break";
  }

  if (segment?.stroke === "var(--error)" || segment?.stroke === "var(--error-300)") {
    return "error";
  }

  return "work";
}

function createRingSegment(startProgress, endProgress, tone = "work") {
  return { startProgress, endProgress, tone };
}

function getInitialRingSegments(profile, now = Date.now()) {
  const elapsedMinutes = getMinutesAfterWorkdayStart(profile, now);
  const durationMinutes = getWorkdayDurationSeconds(profile) / 60;
  const elapsedProgress = durationMinutes > 0 ? clampProgress(elapsedMinutes / durationMinutes) : 0;

  if (elapsedMinutes >= LATE_START_THRESHOLD_MINUTES && elapsedProgress > 0) {
    return [
      createRingSegment(0, elapsedProgress, "error"),
      createRingSegment(elapsedProgress, null, "work"),
    ];
  }

  return [createRingSegment(0, null, "work")];
}

function shouldRestoreLateStartSegments(segments) {
  return (
    segments.length === 1 &&
    segments[0]?.tone === "work" &&
    segments[0]?.startProgress === 0 &&
    segments[0]?.endProgress == null
  );
}

function getRestoredRingSegments(segments, profile, workStartedAt) {
  const normalizedSegments = normalizeRingSegments(segments);

  if (!Number.isFinite(workStartedAt) || !shouldRestoreLateStartSegments(normalizedSegments)) {
    return normalizedSegments;
  }

  const restoredSegments = getInitialRingSegments(profile, workStartedAt);
  return restoredSegments.some((segment) => segment.tone === "error") ? restoredSegments : normalizedSegments;
}

function normalizeRingSegments(segments = []) {
  return segments
    .map((segment) => ({
      startProgress: Number.isFinite(segment?.startProgress) ? segment.startProgress : 0,
      endProgress: Number.isFinite(segment?.endProgress) ? segment.endProgress : null,
      tone: getSegmentTone(segment),
    }))
    .filter((segment) => Number.isFinite(segment.startProgress));
}

function getSegmentStroke(tone) {
  if (tone === "error") return "var(--error-300, #da8383)";
  if (tone === "break") return "var(--primary, #769382)";
  return "var(--primary-dark, #1f2a24)";
}

function getProgressPoint(progress, radius, center) {
  const angle = progress * 2 * Math.PI - Math.PI / 2;

  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function getArcPath(startProgress, endProgress, radius, center) {
  const start = getProgressPoint(startProgress, radius, center);
  const end = getProgressPoint(endProgress, radius, center);
  const largeArcFlag = endProgress - startProgress > 0.5 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function BreathingLogo({ progress = 0, segments = [], active = false, size = ORIGINAL_BREATHING_LOGO_SIZE }) {
  const timerSize = size;
  const timerStroke = 4;
  const radius = (timerSize - timerStroke) / 2;
  const center = timerSize / 2;
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
          cx={center}
          cy={center}
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

          if (segmentLength >= 0.999) {
            return (
              <circle
                key={`${segment.tone}-${segment.startProgress ?? 0}-${index}`}
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={timerStroke}
                fill="none"
                strokeLinecap="round"
                className={`breathingLogo__segment breathingLogo__segment--${segment.tone}`}
                style={{ stroke: getSegmentStroke(segment.tone) }}
              />
            );
          }

          return (
            <path
              key={`${segment.tone}-${segment.startProgress ?? 0}-${index}`}
              d={getArcPath(startProgress, endProgress, radius, center)}
              strokeWidth={timerStroke}
              fill="none"
              strokeLinecap="round"
              className={`breathingLogo__segment breathingLogo__segment--${segment.tone}`}
              style={{ stroke: getSegmentStroke(segment.tone) }}
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
  const [ringSegments, setRingSegments] = useState(() => getRestoredRingSegments(initialTimerState?.ringSegments ?? [], profile, initialTimerState?.workStartedAt));

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
    setRingSegments(getRestoredRingSegments(state.ringSegments ?? [], profile, state.workStartedAt));
    setWorkSeconds(state.workSeconds ?? 0);
    setBreakSeconds(state.breakSeconds ?? 0);
    setLastTickAt(state.lastTickAt ?? Date.now());
  }, [profile?.work_end, profile?.work_start, storageKey]);

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

  useEffect(() => {
    if (!isTimerTicking || activeReminder || !profile?.id || !profile?.allow_reminders) {
      return undefined;
    }

    const checkForFixedBreakReminder = () => {
      const reminder = getDueFixedBreakReminder(profile);
      if (reminder) {
        setActiveReminder(reminder);
      }
    };

    checkForFixedBreakReminder();
    const fixedBreakTimer = setInterval(checkForFixedBreakReminder, 1000);

    return () => clearInterval(fixedBreakTimer);
  }, [isTimerTicking, activeReminder, profile]);

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
    const initialSegments = getInitialRingSegments(profile, now);

    const { error: sessionError } = await startSession();
    if (sessionError) {
      console.error("Failed to start work session:", sessionError);
    }

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
    const reminder = activeReminder;
    storeFixedBreakReminderDecision(profile?.id, reminder, "skipped");
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

      nextSegments.push(createRingSegment(currentProgress, null, "break"));
      return nextSegments;
    });

    setOnBreak(true);
    setBreakSeconds(0);
    setLastTickAt(Date.now());
    setNextReminderAt(null);
  };

  const takeBreak = (fromReminder = false) => {
    const reminder = activeReminder;

    if (fromReminder) {
      storeFixedBreakReminderDecision(profile?.id, reminder, "taken");
      void logReminderDecision("taken");
      setActiveReminder(null);
    }

    beginBreak();
    if (isLunchReminder(reminder)) {
      setActiveBreakType("lunch");
      return;
    }

    setBreakSuggestionsRequest({
      fromReminder,
      mode: getReminderBreakSuggestionMode(reminder, profile),
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

      nextSegments.push(createRingSegment(currentProgress, null, "work"));
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
            <p className="timer-reminder-card__eyebrow">
              {isLunchReminder(activeReminder) ? "Lunchpauze" : "Break reminder"}
            </p>
            <h2 className="timer-reminder-card__title">
              {isLunchReminder(activeReminder) ? "Smakelijk" : "Het is tijd voor een pauze"}
            </h2>
            <p className="timer-reminder-card__copy">
              {isLunchReminder(activeReminder)
                ? `Je lunchpauze staat ingesteld om ${activeReminder?.label ?? formatClockTime(new Date(activeReminder.at))}.`
                : `Je ingestelde reminder staat ingesteld op ${activeReminder?.label ?? formatClockTime(new Date(activeReminder.at))}.`}
            </p>

            <div className="timer-reminder-card__actions">
              <button className="btn timer-reminder-card__secondary" onClick={continueWorking} type="button">
                {isLunchReminder(activeReminder) ? "Doorwerken" : "Doorgaan met werken"}
              </button>
              <button className="btn" onClick={() => takeBreak(true)} type="button">
                {isLunchReminder(activeReminder) ? "Neem de pauze" : "Neem een pauze"}
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
