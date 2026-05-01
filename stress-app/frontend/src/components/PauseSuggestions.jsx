import { useState } from "react";
import "../styles/pauseSuggestions.css";
import PauseCard from "./PauseCard";

import breathing from "../assets/ademhaling.png";
import stretching from "../assets/stretchen.png";
import eyeReset from "../assets/oogReset.png";

const DATA = [
  { id: "breath", title: "Ademhaling", icon: breathing },
  { id: "stretch", title: "Stretchen", icon: stretching },
  { id: "eye-reset", title: "Oog reset", icon: eyeReset },
];

export default function PauseSuggestions({ onViewMore, showViewMore = true }) {
  const [favorites, setFavorites] = useState(() => new Set());

  return (
    <section className="pause-suggestions">
      <h2 className="pause-suggestions__title">Pauzesuggesties</h2>

      <div className="pause-suggestions__grid">
        {DATA.map((item) => {
          const isFavorite = favorites.has(item.id);

          return (
            <PauseCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              isFavorite={isFavorite}
              onToggleFavorite={() => {
                setFavorites((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                });
              }}
            />
          );
        })}
      </div>

      {showViewMore ? (
        <button className="pause-suggestions__cta" onClick={onViewMore} type="button">
          <span>Bekijk meer</span>
          <span aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg></span>
        </button>
      ) : null}
    </section>
  );
}
