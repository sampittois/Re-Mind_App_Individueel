import { useEffect, useState } from "react";
import "../styles/pauseSuggestions.css";
import PauseCard from "./PauseCard";
import { supabase } from "../lib/supabaseClient";

import breathing from "../assets/ademhaling.png";
import stretching from "../assets/stretchen.png";
import shortWalk from "../assets/korteWandeling.png";
import eyeReset from "../assets/oogReset.png";
import postureCheck from "../assets/houdingCheck.png";
import nameOneWin from "../assets/nameOneWin.png";
import handStretch from "../assets/handStretch.png";
import handToChestReset from "../assets/handToChestReset.png";
import drinkPause from "../assets/drinkPauze.png";
import swirl from "../assets/swirl.png";
import backIcon from "../assets/back.svg";

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

export default function PauseSuggestions({
  onViewMore,
  showViewMore = true,
  mode = "preview",
  onBack,
  user,
}) {
  const [activeTab, setActiveTab] = useState("short");
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

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

  async function toggleFavorite(pauseId) {
    const currentlyFavorite = favoriteIds.has(pauseId);

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

  if (mode === "page") {
    const visibleSuggestions =
      activeTab === "short"
        ? SHORT_BREAKS
        : activeTab === "long"
          ? LONG_BREAKS
          : ALL_SUGGESTIONS.filter((item) => favoriteIds.has(item.id));

    return (
      <main className="pause-suggestions-page page">
        <div className="pause-page-top-row">
          <button
            className="back-btn pause-page-back"
            onClick={() => onBack?.()}
            aria-label="Terug"
            type="button"
          >
            <img src={backIcon} alt="Terug" />
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
              />
            );
          })}

          {activeTab === "favorites" && visibleSuggestions.length === 0 ? (
            <p className="pause-page-empty">Nog geen favorieten.</p>
          ) : null}
        </section>

        <div
          className="pause-page-swirl"
          aria-hidden="true"
          style={{
            backgroundColor: "var(--highlight-light)",
            WebkitMaskImage: `url(${swirl})`,
            maskImage: `url(${swirl})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
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
    </section>
  );
}

