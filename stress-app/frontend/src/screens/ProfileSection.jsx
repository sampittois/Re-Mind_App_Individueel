import { useEffect, useRef, useState } from "react";
import "../styles/profile.css";
import editIcon from "../assets/edit.svg";
import checkIcon from "../assets/check.svg";
import xIcon from "../assets/x.svg";
import PauseCard from "../components/PauseCard";
import SettingsSection from "../components/SettingsSection";
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
import plusIcon from "../assets/plus.svg";

const ALL_SUGGESTIONS = [
  { id: "houding-check", title: "Houding check", icon: postureCheck },
  { id: "name-1-win", title: "Name 1 Win", icon: nameOneWin },
  { id: "hand-stretch", title: "Hand stretch", icon: handStretch },
  { id: "hand-to-chest-reset", title: "Hand to chest reset", icon: handToChestReset },
  { id: "drink-pauze", title: "Drink pauze", icon: drinkPause },
  { id: "oog-reset", title: "Oog reset", icon: eyeReset },
  { id: "breath", title: "Ademhaling", icon: breathing },
  { id: "stretch", title: "Stretchen", icon: stretching },
  { id: "walk", title: "Wandeling", icon: shortWalk },
];

const SUGGESTION_BY_ID = new Map(ALL_SUGGESTIONS.map((item) => [item.id, item]));

export default function ProfileSection({ profile, initialName = "John Doe", onSaveName, onSaveAvatar, onLogout, user, onUpdateProfile, hasStoredName = true, setCurrentPage }) {
  const [name, setName] = useState(hasStoredName ? initialName : "");
  useEffect(() => {
    setName(hasStoredName ? initialName : "");
  }, [initialName, hasStoredName]);
  const [editing, setEditing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(profile?.avatar_url ?? null);
  const fileRef = useRef(null);
  const [favoriteIds, setFavoriteIds] = useState(() => []);
  const isAdminPlan = profile?.plan === "admin";

  useEffect(() => {
    setAvatarSrc(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  useEffect(() => {
    let isMounted = true;

    async function loadFavorites() {
      if (!user?.id) {
        if (isMounted) setFavoriteIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("favorite_pauses")
        .select("pause_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to load profile favorites:", error);
        return;
      }

      if (!isMounted) return;
      setFavoriteIds((data || []).map((row) => row.pause_id));
    }

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const favorites = favoriteIds
    .map((id) => SUGGESTION_BY_ID.get(id))
    .filter(Boolean);

  async function removeFavorite(pauseId) {
    setFavoriteIds((prev) => prev.filter((id) => id !== pauseId));

    if (!user?.id) return;

    const { error } = await supabase
      .from("favorite_pauses")
      .delete()
      .eq("user_id", user.id)
      .eq("pause_id", pauseId);

    if (error) {
      console.error("Failed to remove profile favorite:", error);
      setFavoriteIds((prev) => (prev.includes(pauseId) ? prev : [...prev, pauseId]));
    }
  }

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const nextAvatar = typeof reader.result === "string" ? reader.result : null;
      if (!nextAvatar) return;

      setAvatarSrc(nextAvatar);

      if (onSaveAvatar) {
        await onSaveAvatar(nextAvatar);
        return;
      }

      await onUpdateProfile?.({ avatar_url: nextAvatar });
    };

    reader.readAsDataURL(f);
  }

  async function onRemoveAvatar() {
    setAvatarSrc(null);
    if (onSaveAvatar) {
      await onSaveAvatar(null);
      return;
    }

    await onUpdateProfile?.({ avatar_url: null });
  }

  async function handleNameSaveToggle() {
    if (!editing) {
      setEditing(true);
      if (!hasStoredName && name === initialName) {
        setName("");
      }
      return;
    }

    if (!onSaveName) {
      setEditing(false);
      return;
    }

    setIsSavingName(true);
    try {
      const didSave = await onSaveName(name);
      if (didSave !== false) {
        setEditing(false);
      }
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <div className="profile-section">
      <div className="profile-info-column">
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
          {avatarSrc && (
            <button
              className="avatar-remove-btn icon-action-btn"
              type="button"
              onClick={onRemoveAvatar}
              aria-label="Verwijder profielfoto"
            >
              <img src={xIcon} alt="remove" />
            </button>
          )}
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
              placeholder={hasStoredName ? "Naam bewerken" : "Voeg je naam toe"}
            />
          ) : (
            <h2 className={`profile-name ${!hasStoredName ? "profile-name--placeholder" : ""}`}>
              {hasStoredName ? name : "Voeg je naam toe"}
            </h2>
          )}

          <button
            className="edit-pencil"
            type="button"
            onClick={handleNameSaveToggle}
            disabled={isSavingName}
            aria-label={editing ? "Opslaan" : "Bewerk naam"}
          >
            <img src={editing ? checkIcon : editIcon} alt="edit" className="edit-icon" />
          </button>
        </div>

        <div className="profile-actions">
          <button
            className="action-btn"
            type="button"
            onClick={() => {
              setCurrentPage?.("upgrade");
            }}
          >
            Upgrade Plan
          </button>
          {profile?.plan !== "basic" ? (
            <button
              className="action-btn"
              type="button"
              onClick={async () => {
                await onUpdateProfile?.({ calendar_linked: !Boolean(profile?.calendar_linked) });
              }}
            >
              Link Agenda
            </button>
          ) : null}

          {profile?.plan === "bedrijfslicentie" || isAdminPlan ? (
            <button
              className="action-btn"
              type="button"
              onClick={() => setCurrentPage?.("bedrijfsbeheer")}
            >
              Bedrijfsbeheer
            </button>
          ) : null}

          <button
            className="action-btn"
            type="button"
            onClick={() => setCurrentPage?.("settings")}
          >
            Instellingen
          </button>

          {isAdminPlan ? (
            <button
              className="action-btn"
              type="button"
              onClick={() => setCurrentPage?.("admin")}
            >
              Admin dashboard
            </button>
          ) : null}
          <button className="action-btn logout-btn" type="button" onClick={() => onLogout?.()}>Log uit</button>
        </div>
      </div>

      <section
        className={`favorites-section ${favorites.length === 0 ? "favorites-section--hidden" : ""}`}
        aria-hidden={favorites.length === 0}
      >
        <h3 className="favorites-title">Favorieten</h3>
        <div className="favorites-column">
          {favorites.map((item) => (
            <PauseCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              isFavorite={true}
              favoriteIcon={xIcon}
              onToggleFavorite={() => removeFavorite(item.id)}
            />
          ))}
          {profile?.plan === "basic" && favorites.length >= 5 ? (
            <PauseCard
              key="upgrade-card"
              icon={plusIcon}
              title="Upgrade plan"
              onSelect={() => setCurrentPage?.("upgrade")}
            />
          ) : null}
        </div>
      </section>

      <SettingsSection profile={profile} onUpdateProfile={onUpdateProfile} />
    </div>
  );
}
