import { useEffect, useRef, useState } from "react";
import "../styles/profile.css";
import xIcon from "../assets/x.svg";
import PauseCard from "../components/PauseCard";
import SettingsSection from "../components/SettingsSection";
import CheckIcon from "../components/CheckIcon";
import PencilIcon from "../components/PencilIcon";
import { supabase } from "../lib/supabaseClient";
import { fetchCalendarConnections, startCalendarLink } from "../lib/calendar";
import { PlusIcon } from "../components/IconActions"
import breathing from "../assets/ademhaling.png";
import stretching from "../assets/stretchen.png";
import shortWalk from "../assets/korteWandeling.png";
import eyeReset from "../assets/oogReset.png";
import postureCheck from "../assets/houdingCheck.png";
import nameOneWin from "../assets/nameOneWin.png";
import handStretch from "../assets/handStretch.png";
import handToChestReset from "../assets/handToChestReset.png";
import drinkPause from "../assets/drinkPauze.png";

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
const CALENDAR_PROVIDER_LABELS = {
  google: "Google",
};

export default function ProfileSection({ profile, initialName = "John Doe", companyName = "", canEditCompanyName = false, onSaveName, onSaveCompanyName, onSaveAvatar, onLogout, user, onUpdateProfile, onCompanyColorsChange, hasStoredName = true, setCurrentPage, companyColorsForced = false }) {
  const [name, setName] = useState(hasStoredName ? initialName : "");
  const [companyValue, setCompanyValue] = useState(companyName);
  useEffect(() => {
    setName(hasStoredName ? initialName : "");
  }, [initialName, hasStoredName]);
  useEffect(() => {
    setCompanyValue(companyName);
  }, [companyName]);
  const [editing, setEditing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(profile?.avatar_url ?? null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const fileRef = useRef(null);
  const [favoriteIds, setFavoriteIds] = useState(() => []);
  const [isLinkingCalendar, setIsLinkingCalendar] = useState(false);
  const [linkingCalendarProvider, setLinkingCalendarProvider] = useState("");
  const [calendarLinkError, setCalendarLinkError] = useState("");
  const [calendarLinkDialogOpen, setCalendarLinkDialogOpen] = useState(false);
  const [calendarConnectUrls, setCalendarConnectUrls] = useState({ google: "" });
  const isAdminPlan = profile?.plan === "admin";
  const canEditCompany = Boolean(canEditCompanyName);
  const canViewCompanyName = Boolean(canEditCompany || profile?.company_id);
  const updateProfileRef = useRef(onUpdateProfile);

  useEffect(() => {
    setAvatarSrc(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

  useEffect(() => {
    updateProfileRef.current = onUpdateProfile;
  }, [onUpdateProfile]);

  useEffect(() => {
    let active = true;

    async function syncCalendarLinkedState() {
      if (!user?.id || profile?.plan === "basic" || profile?.calendar_linked) return;

      const { data, error } = await fetchCalendarConnections();
      if (!active || error || !data?.calendarLinked) return;

      await updateProfileRef.current?.({ calendar_linked: true });
    }

    syncCalendarLinkedState();

    return () => {
      active = false;
    };
  }, [profile?.calendar_linked, profile?.plan, user?.id]);

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
          setIsAvatarOpen(false);
          return;
      }

      await onUpdateProfile?.({ avatar_url: nextAvatar });
        setIsAvatarOpen(false);
    };

    reader.readAsDataURL(f);
  }

  async function onRemoveAvatar() {
    setAvatarSrc(null);
    setIsAvatarOpen(false);
    if (onSaveAvatar) {
      await onSaveAvatar(null);
      return;
    }

    await onUpdateProfile?.({ avatar_url: null });
  }

  // close gallery on Escape
  useEffect(() => {
    if (!isAvatarOpen) return undefined;

    function onKey(event) {
      if (event.key === "Escape") setIsAvatarOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAvatarOpen]);

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

  async function handleCompanySaveToggle() {
    if (!editingCompany) {
      setEditingCompany(true);
      return;
    }

    if (!onSaveCompanyName) {
      setEditingCompany(false);
      return;
    }

    setIsSavingCompany(true);
    try {
      const trimmedCompanyName = companyValue.trim();
      if (!trimmedCompanyName) {
        setEditingCompany(false);
        return;
      }

      await onSaveCompanyName({ name: trimmedCompanyName });
      setEditingCompany(false);
    } finally {
      setIsSavingCompany(false);
    }
  }

  function openCalendarLinkDialog() {
    setCalendarLinkError("");
    setCalendarLinkDialogOpen(true);

    if (!calendarConnectUrls.google) {
      loadCalendarConnectUrls();
    }
  }

  async function loadCalendarConnectUrls() {
    setIsLinkingCalendar(true);
    setLinkingCalendarProvider("all");

    try {
      const googleResult = await startCalendarLink("google");

      const firstError = googleResult.error;
      if (firstError) setCalendarLinkError(firstError.message || "Agenda koppelen is mislukt.");

      setCalendarConnectUrls({
        google: googleResult.data?.url || "",
      });
    } finally {
      setIsLinkingCalendar(false);
      setLinkingCalendarProvider("");
    }
  }

  function closeCalendarLinkDialog() {
    setCalendarLinkDialogOpen(false);
    setCalendarLinkError("");
  }

  return (
    <div className="profile-section">
      <div className="profile-info-column">
        <div className="avatar-wrap">
          <button
            className="avatar-button"
            type="button"
            onClick={() => {
              if (avatarSrc) {
                setIsAvatarOpen(true);
                return;
              }

              fileRef.current?.click();
            }}
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

          {isAvatarOpen && avatarSrc ? (
            <div className="avatar-gallery-overlay" role="dialog" aria-modal="true" onMouseDown={() => setIsAvatarOpen(false)}>
              <div className="avatar-gallery-card" onMouseDown={(e) => e.stopPropagation()}>
                <button className="avatar-gallery-close icon-remove-btn" type="button" onClick={() => setIsAvatarOpen(false)} aria-label="Sluit">
                  <img src={xIcon} alt="" aria-hidden="true" />
                </button>

                <img src={avatarSrc} alt="Grote profielfoto" className="avatar-gallery-img" />

                <div className="avatar-gallery-actions">
                  <button className="action-btn" type="button" onClick={async () => { await onRemoveAvatar(); }}>
                    Reset
                  </button>
                  <button className="action-btn" type="button" onClick={() => fileRef.current?.click()}>
                    Change
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="profile-name-row">
          <button
            className="edit-pencil"
            type="button"
            onClick={handleNameSaveToggle}
            disabled={isSavingName}
            aria-label={editing ? "Opslaan" : "Bewerk naam"}
          >
            {editing ? <CheckIcon className="edit-icon" /> : <PencilIcon className="edit-icon" />}
          </button>

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
        </div>

        <div className="company-name-row" hidden={!canViewCompanyName}>
          {canEditCompany ? (
            <button
              className="edit-pencil"
              type="button"
              onClick={handleCompanySaveToggle}
              disabled={isSavingCompany}
              aria-label={editingCompany ? "Opslaan bedrijfsnaam" : "Bewerk bedrijfsnaam"}
            >
              {editingCompany ? <CheckIcon className="edit-icon" /> : <PencilIcon className="edit-icon" />}
            </button>
          ) : null}

          {editingCompany && canEditCompany ? (
            <input
              className="name-input company-name-input"
              value={companyValue}
              onChange={(event) => setCompanyValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                handleCompanySaveToggle();
              }}
              aria-label="Bedrijfsnaam"
              placeholder="Voeg je bedrijfsnaam toe"
            />
          ) : (
            <h3 className={`company-name ${companyValue.trim() ? "" : "company-name--placeholder"}`}>
              {companyValue.trim() || "Voeg je bedrijfsnaam toe"}
            </h3>
          )}
        </div>

        <div className="profile-actions">
          {(() => {
            const isCompanyAccount = Boolean(profile?.company_id);
            const canUpgrade = profile?.plan === "basic" && !isCompanyAccount;
            if (!canUpgrade) return null;

            return (
              <button
                className="action-btn"
                type="button"
                onClick={() => {
                  setCurrentPage?.("upgrade");
                }}
              >
                Upgrade Plan
              </button>
            );
          })()}
          {profile?.plan !== "basic" ? (
            <button className="action-btn" type="button" onClick={openCalendarLinkDialog} disabled={isLinkingCalendar}>
              {isLinkingCalendar && linkingCalendarProvider === "all" ? "Agenda-opties laden..." : "Link Agenda"}
            </button>
          ) : null}
          {calendarLinkError ? <p className="profile-action-error">{calendarLinkError}</p> : null}

          {calendarLinkDialogOpen ? (
            <div className="calendar-link-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-link-title" onMouseDown={closeCalendarLinkDialog}>
              <div className="calendar-link-modal__card" onMouseDown={(event) => event.stopPropagation()}>
                <button className="pause-suggestion-card__favorite calendar-link-modal__close" type="button" onClick={closeCalendarLinkDialog} aria-label="Sluit agenda koppelen">
                  <img src={xIcon} alt="" aria-hidden="true" className="pause-suggestion-card__favorite-custom" />
                </button>
                <h2 id="calendar-link-title">Agenda koppelen</h2>
                <p>Koppel je Google Agenda met read-only toegang.</p>
                <div className="calendar-link-modal__actions">
                  {["google"].map((provider) => {
                    const providerLabel = CALENDAR_PROVIDER_LABELS[provider];
                    const url = calendarConnectUrls[provider];

                    return url ? (
                      <a
                        className="action-btn calendar-link-modal__primary"
                        href={url}
                        target="remind-calendar-link"
                        rel="opener"
                        onClick={closeCalendarLinkDialog}
                        key={provider}
                      >
                        Google Agenda koppelen
                      </a>
                    ) : (
                      <button className="action-btn calendar-link-modal__primary" type="button" disabled key={provider}>
                        {isLinkingCalendar ? `${providerLabel} laden...` : "Google Agenda koppelen"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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
          {profile?.plan === "basic" && !profile?.company_id && favorites.length >= 5 ? (
            <PauseCard
              key="upgrade-card"
              icon={<PlusIcon />}
              title="Upgrade plan"
              onSelect={() => setCurrentPage?.("upgrade")}
            />
          ) : null}
        </div>
      </section>

      <SettingsSection profile={profile} onUpdateProfile={onUpdateProfile} onCompanyColorsChange={onCompanyColorsChange} companyColorsForced={companyColorsForced} />
    </div>
  );
}
