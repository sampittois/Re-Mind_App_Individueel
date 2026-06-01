import { useEffect, useState } from "react";
import "../styles/settings.css";
import "../styles/workday-overlay.css";
import { BackIcon, PlusIcon } from "./IconActions";
import {
  fetchTodosForDays,
  createTodoForDay,
  updateTodo,
  deleteTodo,
  formatIsoDate,
} from "../lib/todos";
import { fetchCalendarEventsForDay } from "../lib/calendar";
import xIcon from "../assets/x.svg";

const EMPTY_LISTS = { today: [], tomorrow: [] };

function formatCalendarTime(event) {
  if (event.allDay) return "Hele dag";
  if (!event.start) return "";

  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start));
}

export default function WorkdayReflectionOverlay({
  open,
  onClose,
  onSubmit,
  showFinishedTitle = true,
  initialTab = "today",
  profile = null,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [draftItem, setDraftItem] = useState("");
  // items are objects: { id, text, done }
  const [itemsByTab, setItemsByTab] = useState({ today: [], tomorrow: [] });
  const [calendarItems, setCalendarItems] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    setActiveTab(initialTab);
    setDraftItem("");
    setItemsByTab(EMPTY_LISTS);
    setCalendarItems([]);
    setCalendarError("");

    // load persistent todos for today and tomorrow
    (async () => {
      try {
        const today = formatIsoDate(new Date());
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = formatIsoDate(tomorrowDate);

        const { data, error } = await fetchTodosForDays([today, tomorrow]);
        if (error) {
          console.error("Failed loading todos:", error);
          return;
        }

        const byTab = { today: [], tomorrow: [] };
        (data || []).forEach((row) => {
          const item = { id: row.id, text: row.text, done: row.done };
          if (String(row.day) === today) byTab.today.push(item);
          else if (String(row.day) === tomorrow) byTab.tomorrow.push(item);
        });

        setItemsByTab(byTab);
      } catch (e) {
        console.error(e);
      }
    })();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, initialTab]);

  useEffect(() => {
    if (!open || activeTab !== "calendar") return undefined;

    let active = true;

    async function loadCalendarItems() {
      if (profile && !profile.calendar_linked) {
        setCalendarItems([]);
        setCalendarError("");
        setCalendarLoading(false);
        return;
      }

      setCalendarLoading(true);
      setCalendarError("");

      const { data, error } = await fetchCalendarEventsForDay(new Date());

      if (!active) return;

      if (error) {
        setCalendarItems([]);
        setCalendarError(error.message || "Agenda-items laden is mislukt.");
      } else {
        setCalendarItems(data?.events || []);
      }

      setCalendarLoading(false);
    }

    loadCalendarItems();

    return () => {
      active = false;
    };
  }, [activeTab, open, profile]);

  if (!open) {
    return null;
  }

  const currentItems = itemsByTab[activeTab] || [];
  const isCalendarTab = activeTab === "calendar";
  const questionText = isCalendarTab
    ? "Wat staat er vandaag in je agenda?"
    : activeTab === "today"
      ? "Waar wil je vandaag aan werken?"
      : "Waar wil je morgen aan werken?";
  const inputLabel = activeTab === "today" ? "Taak voor vandaag" : "Taak voor morgen";
  const inputPlaceholder = activeTab === "today" ? "Voeg een taak voor vandaag toe" : "Voeg een taak voor morgen toe";

  function handleAddItem(event) {
    event?.preventDefault?.();
    if (isCalendarTab) return;

    const nextText = draftItem.trim();
    if (!nextText) return;

    (async () => {
      try {
        const day = activeTab === "today" ? new Date() : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();
        const { data, error } = await createTodoForDay(day, nextText);
        if (error) {
          console.error("Failed to create todo:", error);
          return;
        }

        const newItem = { id: data.id, text: data.text, done: data.done };
        setItemsByTab((previous) => ({
          ...previous,
          [activeTab]: [...(previous[activeTab] || []), newItem],
        }));
        setDraftItem("");
      } catch (e) {
        console.error(e);
      }
    })();
  }

  function handleDeleteItem(id) {
    (async () => {
      try {
        const { error } = await deleteTodo(id);
        if (error) {
          console.error("Failed to delete todo:", error);
          return;
        }

        setItemsByTab((previous) => ({
          ...previous,
          [activeTab]: (previous[activeTab] || []).filter((it) => it.id !== id),
        }));
      } catch (e) {
        console.error(e);
      }
    })();
  }

  function handleToggleDone(id) {
    (async () => {
      try {
        const prev = itemsByTab[activeTab] || [];
        const current = prev.find((it) => it.id === id);
        const newDone = !current?.done;
        const { data, error } = await updateTodo(id, { done: newDone });
        if (error) {
          console.error("Failed to update todo:", error);
          return;
        }

        setItemsByTab((previous) => ({
          ...previous,
          [activeTab]: (previous[activeTab] || []).map((it) => (it.id === id ? { ...it, done: data.done } : it)),
        }));
      } catch (e) {
        console.error(e);
      }
    })();
  }

  function handleDone() {
    onSubmit?.(itemsByTab);
  }

  return (
    <div
      className="workday-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={showFinishedTitle ? "workday-overlay-title" : undefined}
      aria-label={showFinishedTitle ? undefined : "Werkdagreflectie"}
      onMouseDown={() => onClose?.()}
    >
      <div className="workday-overlay__card" onMouseDown={(event) => event.stopPropagation()}>
        <button className="workday-overlay__close icon-remove-btn" type="button" onClick={() => onClose?.()} aria-label="Sluiten">
          <img src={xIcon} alt="" aria-hidden="true" />
        </button>

        {showFinishedTitle ? (
          <h2 className="workday-overlay__title" id="workday-overlay-title">
            Werkdag afgerond.
          </h2>
        ) : null}
        <p className="workday-overlay__question">
          {questionText}
        </p>
        <div className="workday-overlay__switch-row" role="tablist" aria-label="Reflectie weergave">
          <div className="workday-overlay__switch" aria-label="Reflectie dagkeuze">
            <button
              className={`workday-overlay__switch-btn ${activeTab === "today" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("today")}
              role="tab"
              aria-selected={activeTab === "today"}
            >
              Vandaag
            </button>

            <button
              className={`workday-overlay__switch-btn ${activeTab === "tomorrow" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab("tomorrow")}
              role="tab"
              aria-selected={activeTab === "tomorrow"}
            >
              Morgen
            </button>
          </div>

          <button
            className={`workday-overlay__calendar-btn ${isCalendarTab ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("calendar")}
            role="tab"
            aria-selected={isCalendarTab}
            aria-label="Agenda-items tonen"
            title="Agenda-items"
          >
            <svg
              className="workday-overlay__calendar-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M16 2v4" />
              <path d="M3 10h18" />
              <path d="M8 2v4" />
              <path d="M17 14h-6" />
              <path d="M13 18H7" />
              <path d="M7 14h.01" />
              <path d="M17 18h.01" />
            </svg>
          </button>
        </div>

        {!isCalendarTab ? (
          <form className="workday-overlay__form" onSubmit={handleAddItem}>
            <div className="workday-overlay__entry-row">
              <input
                className="workday-overlay__input"
                type="text"
                value={draftItem}
                onChange={(event) => setDraftItem(event.target.value)}
                placeholder={inputPlaceholder}
                aria-label={inputLabel}
                autoFocus
              />

              <button className="workday-overlay__add icon-add-btn" type="button" onClick={handleAddItem} aria-label="Taak toevoegen">
                <PlusIcon />
              </button>
            </div>
          </form>
        ) : null}

        {isCalendarTab ? (
          <ul className="workday-overlay__list workday-overlay__list--calendar" aria-label="Agenda-items voor vandaag">
            {calendarLoading ? <li className="workday-overlay__empty">Agenda-items laden...</li> : null}
            {!calendarLoading && calendarError ? <li className="workday-overlay__empty">{calendarError}</li> : null}
            {!calendarLoading && !calendarError && calendarItems.length === 0 ? (
              <li className="workday-overlay__empty">
                {profile?.calendar_linked ? "Geen agenda-items voor vandaag." : "Koppel je agenda om items te tonen."}
              </li>
            ) : null}
            {!calendarLoading && !calendarError
              ? calendarItems.map((event) => (
                  <li className="workday-overlay__item workday-overlay__calendar-item" key={event.id}>
                    <time className="workday-overlay__calendar-time">{formatCalendarTime(event)}</time>
                    <span className="workday-overlay__calendar-text">
                      <span className="workday-overlay__item-label">{event.title}</span>
                      {event.location ? <span className="workday-overlay__calendar-location">{event.location}</span> : null}
                    </span>
                  </li>
                ))
              : null}
          </ul>
        ) : (
          <ul className="workday-overlay__list" aria-label={activeTab === "today" ? "Taken voor vandaag" : "Taken voor morgen"}>
            {currentItems.length ? (
              currentItems.map((item) => (
              <li className={`workday-overlay__item ${item.done ? "done" : ""}`} key={item.id}>
                <button
                  className={`workday-overlay__check ${item.done ? "done" : ""}`}
                  type="button"
                  onClick={() => handleToggleDone(item.id)}
                  aria-pressed={item.done}
                  aria-label={item.done ? `Markeer niet voltooid: ${item.text}` : `Markeer voltooid: ${item.text}`}
                >
                  {item.done ? (
                    <svg className="workday-overlay__check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                      <path d="M20 6L9 17L4 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>

                <span className={`workday-overlay__item-label ${item.done ? "done" : ""}`}>{item.text}</span>

                <button
                  className="workday-overlay__delete icon-remove-btn"
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  aria-label={`Taak verwijderen: ${item.text}`}
                >
                  <img src={xIcon} alt="" aria-hidden="true" />
                </button>
              </li>
            ))
            ) : (
              <li className="workday-overlay__empty">Nog geen taken toegevoegd.</li>
            )}
          </ul>
        )}

        <button className="workday-overlay__submit" type="button" onClick={handleDone}>
          Klaar
        </button>
      </div>
    </div>
  );
}
