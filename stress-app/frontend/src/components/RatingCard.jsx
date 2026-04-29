import { useState } from "react";

export default function RatingCard({ label, icon, onRate }) {
  const [rating, setRating] = useState(null);

  const handleRate = (value) => {
    setRating(value);
    if (onRate) onRate(value);
  };

  return (
    <div className="rating-card">
      <div className="rating-label">
        {icon && <span className="rating-icon">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="rating-scale">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            className={`rating-dot ${rating === value ? "active" : ""}`}
            onClick={() => handleRate(value)}
            aria-label={`Rate ${value}`}
          />
        ))}
      </div>
    </div>
  );
}
