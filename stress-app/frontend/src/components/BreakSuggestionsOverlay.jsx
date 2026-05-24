import { useEffect } from "react";
import xIcon from "../assets/x.svg";

const BREAK_MODES = {
  short: {
    eyebrow: "Korte pauze",
    title: "Kies een korte pauze",
    copy: "Deze pauze past goed bij een korte onderbreking van 20 minuten of minder.",
    suggestions: [
      {
        id: "short-stretch",
        title: "Stretch je schouders los",
        copy: "Sta even recht en maak je nek, schouders en rug los.",
        durationLabel: "3-5 min",
        type: "stretch",
      },
      {
        id: "short-breath",
        title: "Rustig ademhalen",
        copy: "Neem een minuut de tijd om in en uit te ademen op een rustig tempo.",
        durationLabel: "2-3 min",
        type: "breathing",
      },
      {
        id: "short-walk",
        title: "Even opstaan en water halen",
        copy: "Loop kort weg van je scherm en drink meteen iets.",
        durationLabel: "3-5 min",
        type: "walk",
      },
    ],
  },
  long: {
    eyebrow: "Langere pauze",
    title: "Kies een langere pauze",
    copy: "Deze pauze past goed bij een langere onderbreking van een uur of langer.",
    suggestions: [
      {
        id: "long-walk",
        title: "Maak een rustige wandeling",
        copy: "Ga even buiten of loop een rondje door het gebouw.",
        durationLabel: "10-15 min",
        type: "walk",
      },
      {
        id: "long-stretch",
        title: "Doe een langere stretch",
        copy: "Geef je lichaam wat extra ruimte en beweging.",
        durationLabel: "8-10 min",
        type: "stretch",
      },
      {
        id: "long-breath",
        title: "Adem een paar minuten bewust",
        copy: "Gebruik een rustig ritme om je hoofd even te laten zakken.",
        durationLabel: "5-10 min",
        type: "breathing",
      },
    ],
  },
  lunch: {
    eyebrow: "Lunchpauze",
    title: "Even eten is een goede pauze",
    copy: "Dit lijkt op een vaste pauze rond de middag. Dat is een goed moment om iets te eten.",
    suggestions: [
      {
        id: "lunch-eat",
        title: "Ga iets eten",
        copy: "Leg je scherm weg en neem je lunch rustig.",
        durationLabel: "20-30 min",
        type: "walk",
      },
      {
        id: "lunch-drink",
        title: "Drink er iets bij",
        copy: "Pak water, thee of koffie naast je maaltijd.",
        durationLabel: "15-20 min",
        type: "walk",
      },
      {
        id: "lunch-reset",
        title: "Neem een echte schermpauze",
        copy: "Sta op, beweeg even en kom daarna terug met nieuwe energie.",
        durationLabel: "20-30 min",
        type: "walk",
      },
    ],
  },
  balanced: {
    eyebrow: "Pauze",
    title: "Kies een pauze die nu past",
    copy: "Dit is een tussenpauze, dus je kunt kiezen wat het beste werkt voor dit moment.",
    suggestions: [
      {
        id: "balanced-stretch",
        title: "Een korte stretch",
        copy: "Maak je nek, schouders en rug even los.",
        durationLabel: "5 min",
        type: "stretch",
      },
      {
        id: "balanced-walk",
        title: "Loop een klein rondje",
        copy: "Weg van het scherm voor wat frisse focus.",
        durationLabel: "5-10 min",
        type: "walk",
      },
      {
        id: "balanced-breath",
        title: "Adem rustig door",
        copy: "Neem even ruimte om te vertragen en te resetten.",
        durationLabel: "3-5 min",
        type: "breathing",
      },
    ],
  },
};

export default function BreakSuggestionsOverlay({ open, mode = "balanced", onClose, onSelectSuggestion }) {
  const content = BREAK_MODES[mode] || BREAK_MODES.balanced;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

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

  return (
    <div
      className="timer-break-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-suggestions-title"
      aria-describedby="break-suggestions-copy"
      onMouseDown={() => onClose?.()}
    >
      <div className="timer-break-overlay__card" onMouseDown={(event) => event.stopPropagation()}>
        <button className="timer-break-overlay__close" type="button" onClick={() => onClose?.()} aria-label="Overlay sluiten">
          <img src={xIcon} alt="" aria-hidden="true" className="timer-break-overlay__close-icon" />
        </button>

        <p className="timer-break-overlay__eyebrow">{content.eyebrow}</p>
        <h2 className="timer-break-overlay__title" id="break-suggestions-title">
          {content.title}
        </h2>
        <p className="timer-break-overlay__copy" id="break-suggestions-copy">
          {content.copy}
        </p>

        <div className="timer-break-overlay__grid">
          {content.suggestions.map((suggestion) => (
            <button
              className="timer-break-option"
              type="button"
              key={suggestion.id}
              onClick={() => onSelectSuggestion?.(suggestion)}
            >
              <span className="timer-break-option__duration">{suggestion.durationLabel}</span>
              <span className="timer-break-option__title">{suggestion.title}</span>
              <span className="timer-break-option__copy">{suggestion.copy}</span>
            </button>
          ))}
        </div>

        <button className="btn timer-break-overlay__back" type="button" onClick={() => onClose?.()}>
          Terug
        </button>
      </div>
    </div>
  );
}