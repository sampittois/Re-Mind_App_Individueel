import { useState, useRef } from "react";
import "../styles/profile.css";
import editIcon from "../assets/edit.svg";
import checkIcon from "../assets/check.svg";
import xIcon from "../assets/x.svg";
import PauseCard from "./PauseCard";
import SettingsSection from "./SettingsSection";
import breathing from "../assets/ademhaling.png";
import stretching from "../assets/stretchen.png";
import eyeReset from "../assets/oogReset.png";

export default function ProfileSection({ initialName = "John Doe", onSaveName }) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(null);
  const fileRef = useRef(null);
  const [favorites, setFavorites] = useState(() => {
    return [
      { id: "breath", title: "Ademhaling", icon: breathing },
      { id: "stretch", title: "Stretchen", icon: stretching },
      { id: "eye-reset", title: "Oog reset", icon: eyeReset },
    ];
  });

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatarSrc(url);
  }

  return (
    <div className="profile-section">
      <div className="avatar-wrap">
        <button
          className="avatar-button"
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Wijzig profielfoto"
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profielfoto" className="avatar-img" />
          ) : (
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="avatar-svg">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </button>
        <input
          ref={fileRef}
          onChange={onFileChange}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
        />
      </div>

      <div className="profile-name-row">
        {editing ? (
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Naam bewerken"
          />
        ) : (
          <h2 className="profile-name">{name}</h2>
        )}

        <button
          className="edit-pencil"
          type="button"
          onClick={() => {
            if (editing) {
              onSaveName?.(name);
              setEditing(false);
            } else {
              setEditing(true);
            }
          }}
          aria-label={editing ? "Opslaan" : "Bewerk naam"}
        >
          <img src={editing ? checkIcon : editIcon} alt="edit" className="edit-icon" />
        </button>
      </div>

      <div className="profile-actions">
        <button className="action-btn">Upgrade Plan</button>
        <button className="action-btn">Link Agenda</button>
        <button className="action-btn">Bedrijfsbeheer</button>
      </div>

      <section className="favorites-section">
        <h3 className="favorites-title">Favorieten</h3>
        <div className="favorites-column">
          {Array.from(favorites).map((item) => (
            <PauseCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              isFavorite={true}
              favoriteIcon={xIcon}
              onToggleFavorite={() => {
                setFavorites((prev) => prev.filter((p) => p.id !== item.id));
              }}
            />
          ))}
        </div>
      </section>

      <SettingsSection />
    </div>
  );
}
