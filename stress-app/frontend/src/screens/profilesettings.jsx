import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles/profilesettings.css";

export default function ProfileSettings({ profile, user, initialName = "", onGoBack, onSaveName, onDeleteAccount }) {
  const [name, setName] = useState(initialName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      const { error: passwordError } = await supabase.auth.updateUser({ password: cleanPassword });
      if (passwordError) {
        setError(passwordError.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Wachtwoord bijgewerkt.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setError("");
    setSuccess("");

    const confirmed = window.confirm("Weet je zeker dat je je account definitief wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.");
    if (!confirmed) {
      return;
    }

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

  return (
    <div className="profilesettings-page__layout">
      <div className="profilesettings-page__header">
        <div>
          <p className="profilesettings-page__eyebrow">Accountinstellingen</p>
          <h1 className="profilesettings-page__title">Alles op een plek</h1>
          <p className="profilesettings-page__copy">Bekijk je e-mail, wijzig je naam of wachtwoord en verwijder je account wanneer nodig.</p>
        </div>

        <button className="action-btn" type="button" onClick={onGoBack}>
          Terug naar profiel
        </button>
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
            <p className="profilesettings-page__card-copy">Kies een nieuw wachtwoord voor je account.</p>
          </div>

          <form className="profilesettings-page__form" onSubmit={handlePasswordSubmit}>
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
              {isSavingPassword ? "Wijzigen..." : "Wachtwoord wijzigen"}
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
    </div>
  );
}