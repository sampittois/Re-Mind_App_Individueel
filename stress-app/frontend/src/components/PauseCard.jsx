import heartIcon from "../assets/heart.svg";

export default function PauseCard({ icon, title, isFavorite, onToggleFavorite }) {
  return (
    <article className="pause-suggestion-card">
      <div className="pause-suggestion-card__media">
        <img src={icon} alt="" aria-hidden="true" />
      </div>

      <div className="pause-suggestion-card__body">
        <h3 className="pause-suggestion-card__title">{title}</h3>
      </div>

      <button
        className={`pause-suggestion-card__favorite ${isFavorite ? "is-active" : ""}`}
        onClick={onToggleFavorite}
        aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
        aria-pressed={isFavorite}
        type="button"
      >
        <span className="pause-suggestion-card__favorite-fill" aria-hidden="true" />
        <img src={heartIcon} alt="" aria-hidden="true" />
      </button>
    </article>
  );
}
