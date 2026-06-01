import { useEffect, useState } from "react";
import "../styles/login.css";
import Breathe from "../components/Breathe";
import { supabase } from "../lib/supabaseClient";
import { loadRecentLoginEmails, normalizeEmail, saveRecentLoginEmails } from "../lib/recentLoginEmails";

const RECENT_EMAILS_VALIDATE_URL = `${import.meta.env.VITE_BACKEND_URL}/recent-login-emails/validate`;

export default function LoginPage({ onLogin, onGoToRegister, onSkip }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [recentEmails, setRecentEmails] = useState(() => loadRecentLoginEmails());

  useEffect(() => {
    let isActive = true;

    async function syncRecentEmails() {
      const storedEmails = loadRecentLoginEmails();
      if (!storedEmails.length) {
        if (isActive) {
          setRecentEmails([]);
        }
        return;
      }

      try {
        const response = await fetch(RECENT_EMAILS_VALIDATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails: storedEmails }),
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const validEmails = Array.isArray(payload?.validEmails)
          ? payload.validEmails.filter((savedEmail) => typeof savedEmail === "string" && normalizeEmail(savedEmail))
          : storedEmails;

        if (!isActive) {
          return;
        }

        setRecentEmails(validEmails);
        saveRecentLoginEmails(validEmails);
      } catch {
        if (isActive) {
          setRecentEmails(storedEmails);
        }
      }
    }

    syncRecentEmails();

    return () => {
      isActive = false;
    };
  }, []);

  const visibleRecentEmails = recentEmails.filter((savedEmail) => {
    const normalizedSavedEmail = normalizeEmail(savedEmail);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return true;
    }

    return normalizedSavedEmail.includes(normalizedEmail);
  });

  function rememberEmail(nextEmail) {
    const normalizedEmail = (nextEmail || "").trim();
    if (!normalizedEmail) return;

    setRecentEmails((currentEmails) => {
      const nextEmails = [normalizedEmail, ...currentEmails.filter((savedEmail) => savedEmail !== normalizedEmail)].slice(0, 5);
      saveRecentLoginEmails(nextEmails);
      return nextEmails;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }

    const userId = data?.user?.id;
    if (userId) {
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError || !profileRow?.id) {
        await supabase.auth.signOut();
        setError("Dit account bestaat niet meer en kan niet worden gebruikt om in te loggen.");
        return;
      }
    }

    rememberEmail(email);
    onLogin?.();
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-left-inner">
          <Breathe size={280} />
          <h2 className="login-left-title"><span className="text">Slim pauzeren,</span> <span className="primary">sterk presteren</span></h2>
          <p className="login-left-sub">Re:Mind helpt je de balans te behouden</p>
        </div>
      </section>

      <section className="login-right">
        <div className="login-right-inner">
          <div className="hero-row">
            <Breathe size={160} />
            <div>
              <h1 className="login-hero">Welkom terug bij <br /><span className="primary">Re:Mind</span></h1>
              <p className="login-body">Log in om je werkdag te verbeteren met effectieve pauzes.</p>
            </div>
          </div>

          <div className="login-mobile-hero">
            <h2 className="login-left-title">
              <span className="text">Slim pauzeren,</span> <span className="primary">sterk presteren</span>
            </h2>
            <p className="login-left-sub">Re:Mind helpt je de balans te behouden</p>
          </div>

          <div className="login-form-container">
            <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-field login-form-field--with-dropdown">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                className="form-input"
                placeholder="john.doe@voorbeeld.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
              />

              {emailFocused && visibleRecentEmails.length > 0 ? (
                <div className="recent-email-dropdown" role="listbox" aria-label="Recente e-mails">
                  <div className="recent-email-dropdown__header">Recente accounts</div>
                  <div className="recent-email-dropdown__items">
                    {visibleRecentEmails.map((savedEmail) => (
                      <button
                        key={savedEmail}
                        type="button"
                        className="recent-email-dropdown__item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setEmail(savedEmail);
                          setEmailFocused(false);
                        }}
                      >
                        <span className="recent-email-dropdown__email">{savedEmail}</span>
                        <span className="recent-email-dropdown__hint">Gebruik dit account</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <label className="form-label" htmlFor="login-password">Wachtwoord</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="login-submit">Log in</button>
            </form>
          </div>

          <div className="login-footer">
            Heb je nog geen account? <button type="button" className="auth-link-button" onClick={onGoToRegister}>Registreer je</button>
          </div>
        </div>
      </section>
    </main>
  );
}
