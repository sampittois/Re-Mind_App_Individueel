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
import xIcon from "../assets/x.svg";

const EMPTY_LISTS = { today: [], tomorrow: [] };

export default function WorkdayReflectionOverlay({ open, onClose, onSubmit, showFinishedTitle = true, initialTab = "today" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [draftItem, setDraftItem] = useState("");
  // items are objects: { id, text, done }
  const [itemsByTab, setItemsByTab] = useState({ today: [], tomorrow: [] });

  useEffect(() => {
    if (!open) return undefined;

    setActiveTab(initialTab);
    setDraftItem("");
    setItemsByTab(EMPTY_LISTS);

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

  if (!open) {
    return null;
  }

  const currentItems = itemsByTab[activeTab] || [];

  function handleAddItem(event) {
    event?.preventDefault?.();

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
          {activeTab === "today" ? "Waar wil je vandaag aan werken?" : "Waar wil je morgen aan werken?"}
        </p>
        <div className="workday-overlay__switch" role="tablist" aria-label="Reflectie dagkeuze">
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

        <form className="workday-overlay__form" onSubmit={handleAddItem}>
          <div className="workday-overlay__entry-row">
            <input
              className="workday-overlay__input"
              type="text"
              value={draftItem}
              onChange={(event) => setDraftItem(event.target.value)}
              placeholder={activeTab === "today" ? "Voeg een taak voor vandaag toe" : "Voeg een taak voor morgen toe"}
              aria-label={activeTab === "today" ? "Taak voor vandaag" : "Taak voor morgen"}
              autoFocus
            />

            <button className="workday-overlay__add icon-add-btn" type="button" onClick={handleAddItem} aria-label="Taak toevoegen">
              <PlusIcon />
            </button>
          </div>
        </form>

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

        <button className="workday-overlay__submit" type="button" onClick={handleDone}>
          Klaar
        </button>
      </div>
    </div>
  );
}
