import { useEffect, useState } from "react";
import "../styles/pauseSuggestions.css";
import PauseCard from "../components/PauseCard";
import { supabase } from "../lib/supabaseClient";
import { addBreak } from "../lib/session";
import { BackIcon, PlusIcon } from "../components/IconActions";

import breathing from "../assets/ademhaling.png";
import stretching from "../assets/stretchen.png";
import shortWalk from "../assets/korteWandeling.png";
import eyeReset from "../assets/oogReset.png";
import postureCheck from "../assets/houdingCheck.png";
import nameOneWin from "../assets/nameOneWin.png";
import handStretch from "../assets/handStretch.png";
import handToChestReset from "../assets/handToChestReset.png";
import drinkPause from "../assets/drinkPauze.png";
import closeIcon from "../assets/x.svg";
import bigSwirl from "../assets/big_swirl.svg";

const PREVIEW_DATA = [
  { id: "breath", title: "Ademhaling", icon: breathing },
  { id: "stretch", title: "Stretchen", icon: stretching },
  { id: "eye-reset", title: "Oog reset", icon: eyeReset },
];

const SHORT_BREAKS = [
  { id: "houding-check", title: "Houding check", icon: postureCheck },
  { id: "name-1-win", title: "Name 1 Win", icon: nameOneWin },
  { id: "hand-stretch", title: "Hand stretch", icon: handStretch },
  { id: "hand-to-chest-reset", title: "Hand to chest reset", icon: handToChestReset },
  { id: "drink-pauze", title: "Drink pauze", icon: drinkPause },
  { id: "oog-reset", title: "Oog reset", icon: eyeReset },
];

const LONG_BREAKS = [
  { id: "breath", title: "Ademhaling", icon: breathing },
  { id: "stretch", title: "Stretchen", icon: stretching },
  { id: "walk", title: "Wandeling", icon: shortWalk },
];

const ALL_SUGGESTIONS = [...SHORT_BREAKS, ...LONG_BREAKS];

const BREAK_DETAILS = {
  "houding-check": {
    steps: [
      "Zet je beide voeten plat op de grond.",
      "Recht je rug.",
      "Ontspan je schouders.",
      "Ontspan je kaak.",
    ],
    effect:
      "Een slechte houding beïnvloedt stress en focus direct. Zorg voor een goede houding voor minder stress en betere focus!",
  },
  "hand-to-chest-reset": {
    steps: [
      "Leg je hand op je borst.",
      "Adem 4x langzaam in en uit.",
      "Focus op de fysieke sensatie.",
    ],
    effect:
      "Deze oefening bevordert je lichaamsbewustzijn en zorgt voor onmiddellijke kalmering.",
  },
  "name-1-win": {
    steps: ["Benoem in je hoofd één ding dat je vandaag is gelukt."],
    effect:
      "Zorgt voor een positieve mindset door stil te staan bij kleine overwinningen.",
  },
  "drink-pauze": {
    steps: ["Drink wat water en/of ga je water bijvullen."],
    effect:
      "Hydratatie is belangrijk. Zorg ervoor dat je altijd wat water in je buurt hebt staan.",
  },
  "hand-stretch": {
    steps: [
      "Spreid je vingers wijd en ontspan ze terug.",
      "Draai je polsen een aantal keren rond.",
      "Herhaal dit 3 keer.",
    ],
    effect:
      "Je handen staan continu onder spanning bij het typen. Door deze reset kunnen je handen terug ontspannen.",
  },
  "oog-reset": {
    steps: [
      "Kijk naar een even vlak op zo’n 6 of meer meter afstand dat geen scherm is.",
      "Ontspan je blik.",
      "Knipper 10x bewust.",
    ],
    effect:
      "Je oogspieren worden ontlast en je visuele inspanning vermindert. Je ogen worden terug vochtig.",
  },
  walk: {
    steps: [
      "Stap een paar minuten weg van je scherm.",
      "Laat je ogen rusten op je omgeving.",
      "Adem rustig in en uit.",
    ],
    effect:
      "Even bewegen en afstand nemen helpt je hoofd resetten. Je vermindert spanning en komt terug met meer focus en energie.",
  },
  stretch: {
    steps: [
      "Sta recht en strek je armen boven je hoofd.",
      "Rol je schouders rustig naar achter.",
      "Buig zachtjes naar links en rechts.",
    ],
    effect:
      "Stretchen vermindert spanning in je lichaam en stimuleert je bloedsomloop. Zo voel je je losser en kan je je beter concentreren.",
  },
  breath: {
    steps: ["Adem rustig in en uit op jouw eigen tempo."],
    effect: "Een korte ademhalingsoefening helpt je zenuwstelsel kalmeren en je focus herstellen.",
  },
};

const BREAK_TYPE_BY_ID = {
  "houding-check": "posture",
  "hand-to-chest-reset": "calming",
  "name-1-win": "mindset",
  "drink-pauze": "hydration",
  "hand-stretch": "stretch",
  "oog-reset": "eye-reset",
  walk: "walk",
  stretch: "stretch",
  breath: "breathing",
};

export default function PauseSuggestions({
  onViewMore,
  showViewMore = true,
  mode = "preview",
  onBack,
  onStartBreathingExercise,
  user,
  profile,
  setCurrentPage,
  externalSelectedSuggestion = null,
  externalOverlaySource = null,
  onExternalSuggestionConsumed = null,
}) {
  const plan = profile?.plan || "basic";
  const [activeTab, setActiveTab] = useState("short");
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [overlaySource, setOverlaySource] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("favorite_pauses")
        .select("pause_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to load pause favorites:", error);
        return;
      }

      if (!isMounted) return;
      setFavoriteIds(new Set((data || []).map((row) => row.pause_id)));
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!externalSelectedSuggestion) return;

    setSelectedSuggestion(externalSelectedSuggestion);
    setOverlaySource(externalOverlaySource || "external");
    onExternalSuggestionConsumed?.();
  }, [externalSelectedSuggestion, externalOverlaySource, onExternalSuggestionConsumed]);

  async function toggleFavorite(pauseId) {
    const currentlyFavorite = favoriteIds.has(pauseId);

    // Enforce basic plan favorite limit of 5
    if (!currentlyFavorite && plan === "basic" && favoriteIds.size >= 5) {
      // Redirect to upgrade page
      setCurrentPage?.("upgrade");
      return;
    }

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(pauseId)) next.delete(pauseId);
      else next.add(pauseId);
      return next;
    });

    if (!user?.id) return;

    if (currentlyFavorite) {
      const { error } = await supabase
        .from("favorite_pauses")
        .delete()
        .eq("user_id", user.id)
        .eq("pause_id", pauseId);

      if (error) {
        console.error("Failed to remove pause favorite:", error);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(pauseId);
          return next;
        });
      }

      return;
    }

    const { error } = await supabase.from("favorite_pauses").insert([
      {
        user_id: user.id,
        pause_id: pauseId,
      },
    ]);

    if (error) {
      console.error("Failed to add pause favorite:", error);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(pauseId);
        return next;
      });
    }
  }

  async function handleCompleteBreak() {
    if (!selectedSuggestion) return;

    const breakType = BREAK_TYPE_BY_ID[selectedSuggestion.id] || selectedSuggestion.id;
    const { error } = await addBreak({ type: breakType, duration_minutes: 5 });

    if (error) {
      console.error("Failed to register completed break:", error);
    }

    setSelectedSuggestion(null);
    setOverlaySource(null);
  }

  function openSuggestionOverlay(item, source) {
    setSelectedSuggestion(item);
    setOverlaySource(source);
  }

  function closeSuggestionOverlay() {
    setSelectedSuggestion(null);
    setOverlaySource(null);
  }

  const selectedDetail = selectedSuggestion ? BREAK_DETAILS[selectedSuggestion.id] : null;

  if (mode === "page") {
    const visibleSuggestions =
      activeTab === "short"
        ? SHORT_BREAKS
        : activeTab === "long"
          ? LONG_BREAKS
          : ALL_SUGGESTIONS.filter((item) => favoriteIds.has(item.id));

    return (
      <main className="pause-suggestions-page page">
        <img className="pause-suggestions-page__swirl" src={bigSwirl} alt="" aria-hidden="true" />

        <div className="pause-page-top-row">
          <button
            className="back-btn pause-page-back icon-action-btn"
            onClick={() => onBack?.()}
            aria-label="Terug"
            type="button"
          >
            <BackIcon />
          </button>

          <div className="pause-page-tabs" role="tablist" aria-label="Pauzesuggesties filters">
            <button
              className={`pause-page-tab ${activeTab === "short" ? "active" : ""}`}
              onClick={() => setActiveTab("short")}
              type="button"
              role="tab"
              aria-selected={activeTab === "short"}
            >
              Korte pauzes
            </button>
            <button
              className={`pause-page-tab ${activeTab === "long" ? "active" : ""}`}
              onClick={() => setActiveTab("long")}
              type="button"
              role="tab"
              aria-selected={activeTab === "long"}
            >
              Lange pauzes
            </button>
            <button
              className={`pause-page-tab ${activeTab === "favorites" ? "active" : ""}`}
              onClick={() => setActiveTab("favorites")}
              type="button"
              role="tab"
              aria-selected={activeTab === "favorites"}
            >
              Favorieten
            </button>
          </div>
        </div>

        <section className="pause-page-grid" aria-live="polite">
          {visibleSuggestions.map((item) => {
            const isFavorite = favoriteIds.has(item.id);

            return (
              <PauseCard
                key={item.id}
                icon={item.icon}
                title={item.title}
                isFavorite={isFavorite}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onSelect={() => openSuggestionOverlay(item, "page")}
              />
            );
          })}

          {activeTab === "favorites" && visibleSuggestions.length === 0 ? (
            <p className="pause-page-empty">Nog geen favorieten.</p>
          ) : null}

        {activeTab === "favorites" && plan === "basic" && favoriteIds.size >= 5 ? (
          <PauseCard
            key="upgrade-card"
            icon={<PlusIcon />}
            title="Upgrade plan"
            onSelect={() => setCurrentPage?.("upgrade")}
            className="icon-add-btn icon-add-btn--large"
          />
        ) : null}
        </section>

        {selectedSuggestion ? (
          <SuggestionOverlay
            suggestion={selectedSuggestion}
            details={selectedDetail}
            isFavorite={favoriteIds.has(selectedSuggestion.id)}
            showIntro={overlaySource === "preview"}
            onClose={closeSuggestionOverlay}
            onComplete={handleCompleteBreak}
            onStartBreathingExercise={onStartBreathingExercise}
            onToggleFavorite={() => toggleFavorite(selectedSuggestion.id)}
          />
        ) : null}
      </main>
    );
  }

  return (
    <section className="pause-suggestions">
      <h2 className="pause-suggestions__title">Pauzesuggesties</h2>

      <div className="pause-suggestions__grid">
        {PREVIEW_DATA.map((item) => {
          const isFavorite = favoriteIds.has(item.id);

          return (
            <PauseCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              isFavorite={isFavorite}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onSelect={() => openSuggestionOverlay(item, "preview")}
            />
          );
        })}
      </div>

      {showViewMore ? (
        <button className="pause-suggestions__cta" onClick={onViewMore} type="button">
          <span>Bekijk meer</span>
          <span aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      ) : null}

      {selectedSuggestion ? (
        <SuggestionOverlay
          suggestion={selectedSuggestion}
          details={selectedDetail}
          isFavorite={favoriteIds.has(selectedSuggestion.id)}
          showIntro={overlaySource === "preview"}
          onClose={closeSuggestionOverlay}
          onComplete={handleCompleteBreak}
          onStartBreathingExercise={onStartBreathingExercise}
          onToggleFavorite={() => toggleFavorite(selectedSuggestion.id)}
        />
      ) : null}
    </section>
  );
}

function SuggestionOverlay({
  suggestion,
  details,
  isFavorite,
  showIntro,
  onClose,
  onComplete,
  onStartBreathingExercise,
  onToggleFavorite,
}) {
  const isBreathingSuggestion = suggestion.id === "breath";

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label={`${suggestion.title} details`}>
      <div className="pause-overlay__card">
        <button className="pause-overlay__close icon-remove-btn" type="button" aria-label="Overlay sluiten" onClick={onClose}>
          <img src={closeIcon} alt="" aria-hidden="true" />
        </button>

        {isBreathingSuggestion ? (
          <p className="pause-overlay__intro pause-overlay__intro--breath">
            Volg de bol: adem rustig in, hou even vast en adem daarna langzaam uit.
          </p>
        ) : showIntro ? (
          <p className="pause-overlay__intro">Dit lijkt wel een goede keuze!</p>
        ) : null}

        <PauseCard
          icon={suggestion.icon}
          title={suggestion.title}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          disableHover
        />

        {isBreathingSuggestion ? null : (
          <>
            <ol className="pause-overlay__steps">
              {(details?.steps || []).map((step, index) => (
                <li key={`${suggestion.id}-${index}`}>{step}</li>
              ))}
            </ol>

            <h3 className="pause-overlay__subtitle">Wat doet het?</h3>
            <p className="pause-overlay__effect">{details?.effect || "Deze pauze helpt je om terug tot rust te komen."}</p>
          </>
        )}

        <button
          className={`pause-overlay__done ${isBreathingSuggestion ? "pause-overlay__done--breath" : ""}`}
          type="button"
          onClick={isBreathingSuggestion ? onStartBreathingExercise : onComplete}
        >
          {isBreathingSuggestion ? "Doe de oefening" : "Klaar"}
        </button>
      </div>
    </div>
  );
}
