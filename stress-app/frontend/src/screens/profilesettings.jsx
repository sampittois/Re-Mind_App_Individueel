import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BackIcon } from "../components/IconActions";
import "../styles/profilesettings.css";

export default function ProfileSettings({ profile, user, initialName = "", onGoBack, onSaveName, onDeleteAccount, passwordResetMode = false, onRequestPasswordReset }) {
  const [name, setName] = useState(initialName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(initialName || "");
  }, [initialName]);

  const email = profile?.email || user?.email || "";

  async function handleNameSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Vul een naam in.");
      return;
    }

    setIsSavingName(true);
    try {
      const didSave = await onSaveName?.(cleanName);
      if (didSave === false) {
        setError("Naam kon niet worden opgeslagen.");
        return;
      }

      setSuccess("Naam bijgewerkt.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanPassword = newPassword.trim();
    if (cleanPassword.length < 8) {
      setError("Wachtwoord moet minstens 8 tekens bevatten.");
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    setIsSavingPassword(true);
    try {
      if (!passwordResetMode) {
        const cleanCurrentPassword = currentPassword.trim();
        if (!cleanCurrentPassword) {
          setError("Vul je huidige wachtwoord in.");
          return;
        }

        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password: cleanCurrentPassword,
        });

        if (loginError) {
          setError("Je huidige wachtwoord is onjuist.");
          return;
        }
      }

      const { error: passwordError } = await supabase.auth.updateUser({ password: cleanPassword });
      if (passwordError) {
        setError(passwordError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Wachtwoord bijgewerkt.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handlePasswordResetEmail() {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Geen e-mailadres beschikbaar om een resetlink te sturen.");
      return;
    }

    setIsSendingReset(true);
    try {
      const result = await onRequestPasswordReset?.();
      if (result?.error) {
        setError(result.error.message);
        return;
      }

      setSuccess("We hebben een e-mail gestuurd met een link om je wachtwoord te herstellen.");
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleDeleteAccount() {
    setError("");
    setSuccess("");

    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteAccount() {
    setDeleteConfirmOpen(false);

    setIsDeleting(true);
    try {
      const result = await onDeleteAccount?.();
      if (result?.error) {
        setError(result.error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function cancelDeleteAccount() {
    if (isDeleting) {
      return;
    }

    setDeleteConfirmOpen(false);
  }

  return (
    <div className="profilesettings-page__layout">
      <div className="profilesettings-page__header">
        <button className="profilesettings-back icon-action-btn" type="button" onClick={onGoBack} aria-label="Terug">
          <BackIcon />
        </button>

        <div>
          <h1 className="profilesettings-page__title">Accountinstellingen</h1>
        </div>
      </div>

      {error ? <p className="profilesettings-page__status profilesettings-page__status--error">{error}</p> : null}
      {success ? <p className="profilesettings-page__status profilesettings-page__status--success">{success}</p> : null}

      <div className="profilesettings-page__grid">
        <section className="profilesettings-page__card">
          <div>
            <h2 className="profilesettings-page__card-title">Account info</h2>
            <p className="profilesettings-page__card-copy">Je belangrijkste accountgegevens.</p>
          </div>

          <div className="profilesettings-page__field">
            <label className="profilesettings-page__label" htmlFor="account-email">E-mail</label>
            <div className="profilesettings-page__value" id="account-email">
              {email || "Geen e-mailadres beschikbaar"}
            </div>
          </div>

          <form className="profilesettings-page__form" onSubmit={handleNameSubmit}>
            <div className="profilesettings-page__field">
              <label className="profilesettings-page__label" htmlFor="account-name">Naam</label>
              <input
                id="account-name"
                className="profilesettings-page__input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>

            <p className="profilesettings-page__hint">Deze naam wordt ook opgeslagen in je profiel en database.</p>

            <button className="action-btn" type="submit" disabled={isSavingName}>
              {isSavingName ? "Opslaan..." : "Naam opslaan"}
            </button>
          </form>
        </section>

        <section className="profilesettings-page__card">
          <div>
            <h2 className="profilesettings-page__card-title">Wachtwoord wijzigen</h2>
            <p className="profilesettings-page__card-copy">
              {passwordResetMode
                ? "Stel hier een nieuw wachtwoord in via de herstel link uit je e-mail."
                : "Kies een nieuw wachtwoord voor je account. Vul eerst je huidige wachtwoord in."}
            </p>
          </div>

          <form className="profilesettings-page__form" onSubmit={handlePasswordSubmit}>
            {!passwordResetMode ? (
              <div className="profilesettings-page__field">
                <label className="profilesettings-page__label" htmlFor="current-password">Huidig wachtwoord</label>
                <input
                  id="current-password"
                  type="password"
                  className="profilesettings-page__input"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
            ) : null}

            <div className="profilesettings-page__field">
              <label className="profilesettings-page__label" htmlFor="new-password">Nieuw wachtwoord</label>
              <input
                id="new-password"
                type="password"
                className="profilesettings-page__input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="profilesettings-page__field">
              <label className="profilesettings-page__label" htmlFor="confirm-password">Bevestig wachtwoord</label>
              <input
                id="confirm-password"
                type="password"
                className="profilesettings-page__input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button className="action-btn" type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? "Wijzigen..." : passwordResetMode ? "Nieuw wachtwoord opslaan" : "Wachtwoord wijzigen"}
            </button>

            <button className="action-btn profilesettings-page__link-button" type="button" onClick={handlePasswordResetEmail} disabled={isSendingReset}>
              {isSendingReset ? "Versturen..." : "Wachtwoord vergeten? Ontvang een resetmail"}
            </button>
          </form>
        </section>

        <section className="profilesettings-page__card profilesettings-page__card--danger">
          <div>
            <h2 className="profilesettings-page__card-title">Account verwijderen</h2>
            <p className="profilesettings-page__card-copy">Hiermee verwijder je je account en de gekoppelde gegevens definitief.</p>
          </div>

          <button className="action-btn profilesettings-page__danger-button" type="button" onClick={handleDeleteAccount} disabled={isDeleting}>
            {isDeleting ? "Verwijderen..." : "Verwijder account"}
          </button>
        </section>
      </div>

      {deleteConfirmOpen ? (
        <div className="profilesettings-delete-modal" role="dialog" aria-modal="true" aria-labelledby="profilesettings-delete-title" onMouseDown={cancelDeleteAccount}>
          <div className="profilesettings-delete-modal__card" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="profilesettings-delete-title" className="profilesettings-delete-modal__title">Account verwijderen?</h2>
            <p className="profilesettings-delete-modal__copy">
              Deze actie kan niet ongedaan worden gemaakt. Je account, profiel en gekoppelde gegevens worden definitief verwijderd.
            </p>

            <div className="profilesettings-delete-modal__actions">
              <button className="action-btn profilesettings-delete-modal__danger" type="button" onClick={confirmDeleteAccount} disabled={isDeleting}>
                {isDeleting ? "Verwijderen..." : "Ja, verwijder"}
              </button>
              <button className="action-btn profilesettings-delete-modal__secondary" type="button" onClick={cancelDeleteAccount} disabled={isDeleting}>
                Annuleer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}