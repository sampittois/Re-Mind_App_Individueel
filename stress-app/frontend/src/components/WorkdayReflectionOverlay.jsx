import { useEffect } from "react";

export default function WorkdayReflectionOverlay({ open, value, onChange, onClose, onSubmit }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <div className="workday-overlay" role="dialog" aria-modal="true" aria-labelledby="workday-overlay-title" onMouseDown={() => onClose?.()}>
      <div className="workday-overlay__card" onMouseDown={(event) => event.stopPropagation()}>
        <h2 className="workday-overlay__title" id="workday-overlay-title">
          Werkdag afgerond.
        </h2>
        <p className="workday-overlay__question">Waar wil je morgen zeker nog aan werken?</p>
        <p className="workday-overlay__helper">We herinneren je er morgen nog eens aan.</p>

        <form className="workday-overlay__form" onSubmit={handleSubmit}>
          <div className="workday-overlay__editor">
            <textarea
              className="workday-overlay__textarea"
              value={value}
              onChange={(event) => onChange?.(event.target.value)}
              aria-label="Reflectie voor morgen"
              autoFocus
            />

            <button className="workday-overlay__submit" type="submit">
              Klaar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
