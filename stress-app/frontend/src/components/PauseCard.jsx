import heartIcon from "../assets/heart.svg";

export default function PauseCard({
  icon,
  title,
  isFavorite,
  onToggleFavorite,
  favoriteIcon,
  onSelect,
  disableHover = false,
  compact = false,
  showFavorite = true,
}) {
  const cardClassName = [
    "pause-suggestion-card",
    disableHover ? "pause-suggestion-card--no-hover" : "",
    compact ? "pause-suggestion-card--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isSelectable = typeof onSelect === "function";

  return (
    <article
      className={cardClassName}
      onClick={isSelectable ? onSelect : undefined}
      onKeyDown={
        isSelectable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-label={isSelectable ? `${title} details openen` : undefined}
    >
      <div className="pause-suggestion-card__media">
        <img src={icon} alt="" aria-hidden="true" />
      </div>

      <div className="pause-suggestion-card__body">
        <h3 className="pause-suggestion-card__title">{title}</h3>
      </div>
      {showFavorite ? (
        <button
          className={`pause-suggestion-card__favorite ${isFavorite ? "is-active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.();
          }}
          aria-label={isFavorite ? "Verwijder uit favorieten" : "Voeg toe aan favorieten"}
          aria-pressed={isFavorite}
          type="button"
        >
          {/* if a custom favoriteIcon is provided (e.g., x.svg for Favorites list), use it and hide the fill */}
          {favoriteIcon ? (
            <img src={favoriteIcon} alt="" aria-hidden="true" className="pause-suggestion-card__favorite-custom" />
          ) : (
            <>
              <span className="pause-suggestion-card__favorite-fill" aria-hidden="true">
                <svg viewBox="0 0 21 19" role="presentation" focusable="false">
                  <path d="M2.38655 2.51462C3.27463 1.58452 4.47895 1.06202 5.73469 1.06202C6.99043 1.06202 8.19476 1.58452 9.08284 2.51462L10.4704 3.96703L11.858 2.51462C12.2948 2.04077 12.8174 1.66281 13.3951 1.40279C13.9729 1.14277 14.5943 1.00591 15.2231 1.00019C15.8519 0.994463 16.4755 1.11999 17.0575 1.36945C17.6395 1.61891 18.1683 1.9873 18.6129 2.45312C19.0576 2.91895 19.4092 3.47289 19.6473 4.08261C19.8855 4.69233 20.0053 5.34563 19.9998 6.00439C19.9944 6.66314 19.8637 7.31416 19.6155 7.91946C19.3673 8.52475 19.0066 9.0722 18.5542 9.52986L10.4704 18L2.38655 9.52986C1.49874 8.59949 1 7.33779 1 6.02224C1 4.70669 1.49874 3.445 2.38655 2.51462Z" fill="currentColor" />
                </svg>
              </span>
              <img src={heartIcon} alt="" aria-hidden="true" />
            </>
          )}
        </button>
      ) : null}
    </article>
  );
}
