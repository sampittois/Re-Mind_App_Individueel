import { useState, useEffect, useCallback } from "react";
import "./styles/App.css";
import { supabase } from "./lib/supabaseClient";
import { addEnergyCheck, addStressCheck, loadLatestWellbeingSnapshot } from "./lib/session";

import Navbar from "./components/Navbar";
import Timer from "./components/Timer";
import PauseSuggestions from "./screens/PauseSuggestions";
import BreathingExercises from "./screens/BreathingExercises";
import BreathingExerciseDetail from "./screens/BreathingExerciseDetail";
import WorkdayReflectionOverlay from "./components/WorkdayReflectionOverlay";
import RatingCard from "./components/RatingCard";
import StressSlider from "./components/StressSlider";
import EnergySlider from "./components/EnergySlider";
import StatsSection from "./components/StatsSection";
import ProfileSection from "./screens/ProfileSection";
import ProfileSettings from "./screens/profilesettings";
import Reports from "./screens/Reports";
import UpgradePage from "./screens/UpgradePage";
import AdminPage from "./screens/AdminPage";
import CompanyManagementPage, {
  DEFAULT_CUSTOM_THEME,
  DEFAULT_THEME_ID,
  buildThemeVariables,
  getScopedStorageKeys,
  getThemeById,
  normalizeCustomTheme,
  readStoredValue,
} from "./screens/CompanyManagementPage";
import LoginPage from "./screens/LoginPage";
import RegisterPage from "./screens/RegisterPage";
import OnboardingPage from "./screens/OnboardingPage";

const DEFAULT_NAME = "John Doe";
const PROFILE_SELECT = "id, full_name, first_name, last_name, email, avatar_url, plan, work_start, work_end, break_frequency_mins, fixed_breaks, break_reminders, pause_habit, work_style, work_type, allow_reminders, dark_mode, use_company_colors, calendar_linked, company_management_enabled";
const LAST_PAGE_STORAGE_KEY = "remind:last-page";
const THEME_VARIABLES = [
  "--background",
  "--background-dark",
  "--text",
  "--text-light",
  "--border",
  "--primary-dark",
  "--primary",
  "--highlight-dark",
  "--highlight",
  "--highlight-light",
  "--highlight-hover",
  "--success",
  "--warning",
  "--warning-light",
  "--error",
  "--error-dark",
  "--info",
];

const AUTH_PAGES = new Set(["login", "register", "onboarding"]);
const RESTORABLE_PAGES = new Set(["home", "pause", "breathing", "exercise-detail", "reports", "profile", "settings", "upgrade", "bedrijfsbeheer", "admin"]);

function isRestorablePage(page) {
  return RESTORABLE_PAGES.has(page);
}

function readLastPage() {
  if (typeof window === "undefined") return null;

  try {
    const savedPage = window.sessionStorage.getItem(LAST_PAGE_STORAGE_KEY);
    return isRestorablePage(savedPage) ? savedPage : null;
  } catch {
    return null;
  }
}

function persistLastPage(page) {
  if (typeof window === "undefined" || !isRestorablePage(page)) return;

  try {
    window.sessionStorage.setItem(LAST_PAGE_STORAGE_KEY, page);
  } catch {
    // Ignore storage errors (private mode, disabled storage, etc.)
  }
}

function deriveNameParts(fullNameInput = "") {
  const fullName = fullNameInput.trim();
  if (!fullName) {
    return { fullName: "", firstName: "", lastName: "" };
  }

  const parts = fullName.split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");
  return { fullName, firstName, lastName };
}

function buildDisplayName(profile, user) {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;

  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  if (profileName) return profileName;

  const metaName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(" ").trim();
  if (metaName) return metaName;

  return DEFAULT_NAME;
}

function shouldForceOnboarding(user) {
  return Boolean(user?.user_metadata?.force_onboarding);
}

async function handleBackendDeleteAccount() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { error: sessionError };
  }

  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    return { error: new Error("No active session") };
  }

  const response = await fetch("http://localhost:3000/delete-account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    return { error: new Error(payload.error || "Could not delete account") };
  }

  return { error: null };
}

async function updateAuthNameMetadata(fullName, firstName, lastName, userMetadata = {}) {
  const { error } = await supabase.auth.updateUser({
    data: {
      ...userMetadata,
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
    },
  });

  return error || null;
}

function readCompanyThemeFromStorage(storageKeys) {
  const themeId = readStoredValue(storageKeys.theme, DEFAULT_THEME_ID);
  const customTheme = normalizeCustomTheme(readStoredValue(storageKeys.customTheme, DEFAULT_CUSTOM_THEME));

  return themeId === "custom" ? customTheme : getThemeById(themeId);
}

function applyCompanyThemeToRoot(theme, useCompanyColors) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (!useCompanyColors) {
    THEME_VARIABLES.forEach((variable) => root.style.removeProperty(variable));
    return;
  }

  const themeVariables = buildThemeVariables(theme);
  THEME_VARIABLES.forEach((variable) => {
    const value = themeVariables[variable];
    if (value) {
      root.style.setProperty(variable, value);
    }
  });
}

export default function App() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [avatar, setAvatar] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(2);
  const [pausesTaken, setPausesTaken] = useState(0);
  const [pausesSkipped, setPausesSkipped] = useState(0);

  const [currentPage, setCurrentPage] = useState("login");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedExerciseAutoStart, setSelectedExerciseAutoStart] = useState(false);
  const [breathingReturnPage, setBreathingReturnPage] = useState("home");
  const [user, setUser] = useState(null);
  const [pauseSuggestionToOpen, setPauseSuggestionToOpen] = useState(null);
  const [pauseSuggestionOverlaySource, setPauseSuggestionOverlaySource] = useState(null);
  const [workdayReflectionOpen, setWorkdayReflectionOpen] = useState(false);
  const [workdayReflectionShowFinishedTitle, setWorkdayReflectionShowFinishedTitle] = useState(false);
  const [companyThemeRevision, setCompanyThemeRevision] = useState(0);
  const [passwordResetMode, setPasswordResetMode] = useState(false);
  const accountEmail = profile?.email || user?.email || "";
  const managerScopeCandidate = profile?.id || user?.id || null;
  const managerScopedStorageKeys = getScopedStorageKeys(managerScopeCandidate);
  const hasManagerScopedTheme = managerScopeCandidate
    ? readStoredValue(managerScopedStorageKeys.theme, null) !== null
      || readStoredValue(managerScopedStorageKeys.customTheme, null) !== null
      || readStoredValue(managerScopedStorageKeys.companyColorsEnabled, null) !== null
    : false;
  const companyThemeScopeId =
    user?.user_metadata?.created_by
    || ((profile?.company_management_enabled || hasManagerScopedTheme) ? managerScopeCandidate : null)
    || null;
  const companyStorageKeys = getScopedStorageKeys(companyThemeScopeId);
  const handleCompanyThemeChange = useCallback(() => {
    setCompanyThemeRevision((previous) => previous + 1);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAvatar(null);
    setName(DEFAULT_NAME);
    setPasswordResetMode(false);
    setCurrentPage("login");
  }

  async function saveProfilePatch(patch) {
    if (!user?.id) {
      setProfile((previous) => ({ ...(previous || {}), ...patch }));
      return true;
    }

    const nextProfile = { id: user.id, ...(profile || {}), ...patch };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(nextProfile, { onConflict: "id" })
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      console.error("Failed to save profile patch:", error);
      return false;
    }

    setProfile(data || nextProfile);
    return true;
  }

  async function saveProfileName(nextName) {
    const cleanName = (nextName || "").trim();
    if (!cleanName) {
      return false;
    }

    if (!user?.id) {
      setName(cleanName);
      return true;
    }

    const { fullName, firstName, lastName } = deriveNameParts(cleanName);
    const previousName = name;
    setName(fullName);

    const didSave = await saveProfilePatch({
      full_name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
    });

    if (!didSave) {
      setName(previousName);
      return false;
    }

    const authUpdateError = await updateAuthNameMetadata(fullName, firstName, lastName, user?.user_metadata || {});
    if (authUpdateError) {
      console.error("Failed to sync profile name to auth metadata:", authUpdateError);
    }

    return true;
  }

  async function handleOnboardingComplete(payload = {}) {
    const providedName = (payload.name || "").trim();
    const fallbackName = providedName || DEFAULT_NAME;
    const { fullName, firstName, lastName } = deriveNameParts(fallbackName);

    if (user?.id) {
      const fixedBreaks = Array.isArray(payload.fixedBreaks) ? payload.fixedBreaks : [];
      const didSave = await saveProfilePatch({
        full_name: fullName,
        first_name: (payload.firstName || firstName || "").trim() || null,
        last_name: (payload.lastName || lastName || "").trim() || null,
        work_start: payload.workStart || null,
        work_end: payload.workEnd || null,
        break_frequency_mins: Number.isFinite(payload.breakFrequencyMins) ? payload.breakFrequencyMins : null,
        fixed_breaks: fixedBreaks,
        pause_habit: payload.pauseHabit || null,
        work_style: payload.workStyle || null,
        work_type: payload.workType || null,
        allow_reminders: Boolean(payload.allowReminders),
      });

      if (!didSave) {
        console.error("Failed to save onboarding profile");
      }

      const authUpdateError = await updateAuthNameMetadata(
        fullName,
        (payload.firstName || firstName || "").trim(),
        (payload.lastName || lastName || "").trim(),
        {
          ...(user?.user_metadata || {}),
          force_onboarding: false,
        },
      );

      if (authUpdateError) {
        console.error("Failed to clear onboarding flag:", authUpdateError);
      }
    }

    setName(fullName || DEFAULT_NAME);
    setCurrentPage("home");
  }

  async function handleDeleteAccount() {
    const result = await handleBackendDeleteAccount();
    if (result.error) {
      return result;
    }

    await handleLogout();
    return result;
  }

  function openBreathingExercise(exerciseId, returnPage = "home", autoStart = false) {
    setSelectedExercise(exerciseId);
    setSelectedExerciseAutoStart(autoStart);
    setBreathingReturnPage(returnPage);
    setCurrentPage("exercise-detail");
  }

  function openPauseSuggestionFromTimer(suggestion, source = "timer") {
    setPauseSuggestionToOpen(suggestion);
    setPauseSuggestionOverlaySource(source);
    setCurrentPage("pause");
  }

  function clearExternalPauseSuggestion() {
    setPauseSuggestionToOpen(null);
    setPauseSuggestionOverlaySource(null);
  }

  function openWorkdayReflection(source = "manual") {
    setWorkdayReflectionShowFinishedTitle(source === "finished-day");
    setWorkdayReflectionOpen(true);
  }

  function closeWorkdayReflection() {
    setWorkdayReflectionOpen(false);
    setWorkdayReflectionShowFinishedTitle(false);
  }

  function handleWorkdayReflectionSubmit() {
    setWorkdayReflectionOpen(false);
    setWorkdayReflectionShowFinishedTitle(false);
  }

  async function refreshWellbeingSnapshot() {
    const { data, error } = await loadLatestWellbeingSnapshot();
    if (error) {
      console.error("Failed to load wellbeing snapshot:", error);
      return;
    }

    if (!data) {
      return;
    }

    setStressLevel(data.stressLevel ?? 3);
    setEnergyLevel(data.energyLevel ?? 2);
    setPausesTaken(data.pausesTaken ?? 0);
    setPausesSkipped(data.pausesSkipped ?? 0);
  }

  async function handleStressChange(value) {
    setStressLevel(value);

    const { error } = await addStressCheck(value);
    if (error) {
      console.error("Failed to save stress check-in:", error);
      return;
    }

    await refreshWellbeingSnapshot();
  }

  async function handleEnergyChange(value) {
    setEnergyLevel(value);

    const { error } = await addEnergyCheck(value);
    if (error) {
      console.error("Failed to save energy check-in:", error);
      return;
    }

    await refreshWellbeingSnapshot();
  }


  let pageContent;

  if (currentPage === "exercise-detail") {
    pageContent = (
      <BreathingExerciseDetail
        exerciseId={selectedExercise}
        autoStart={selectedExerciseAutoStart}
        onBack={() => setCurrentPage(breathingReturnPage)}
      />
    );
  } else if (currentPage === "breathing") {
    pageContent = (
      <BreathingExercises
        onBack={() => setCurrentPage("pause")}
        onSelectExercise={(id) => {
          openBreathingExercise(id, "breathing");
        }}
      />
    );
  } else if (currentPage === "reports") {
    pageContent = <Reports setCurrentPage={setCurrentPage} profile={profile} />;
    pageContent = <Reports setCurrentPage={setCurrentPage} profile={profile} user={user} />;
  } else if (currentPage === "pause") {
    pageContent = (
      <PauseSuggestions
        mode="page"
        showViewMore={false}
        onBack={() => setCurrentPage("home")}
        onStartBreathingExercise={() => openBreathingExercise("box", "pause")}
        user={user}
        profile={profile}
        setCurrentPage={setCurrentPage}
        externalSelectedSuggestion={pauseSuggestionToOpen}
        externalOverlaySource={pauseSuggestionOverlaySource}
        onExternalSuggestionConsumed={clearExternalPauseSuggestion}
      />
    );
  } else if (currentPage === "profile") {
    pageContent = (
      <main className="page profile-page">
        <ProfileSection
          profile={profile}
          initialName={name}
          onSaveName={saveProfileName}
          onSaveAvatar={async (nextAvatar) => {
            setAvatar(nextAvatar);
            const didSave = await saveProfilePatch({ avatar_url: nextAvatar });
            if (!didSave) {
              setAvatar(profile?.avatar_url ?? null);
            }
            return didSave;
          }}
          onLogout={async () => {
            await handleLogout();
          }}
          user={user}
          onUpdateProfile={saveProfilePatch}
          hasStoredName={Boolean(profile?.full_name || profile?.first_name || profile?.last_name)}
          setCurrentPage={setCurrentPage}
        />
      </main>
    );
  } else if (currentPage === "settings") {
    pageContent = (
      <main className="page settings-page">
        <ProfileSettings
          profile={profile}
          user={user}
          initialName={name}
          onGoBack={() => setCurrentPage("profile")}
          onSaveName={saveProfileName}
          onDeleteAccount={handleDeleteAccount}
          passwordResetMode={passwordResetMode}
          accountEmail={accountEmail}
          onRequestPasswordReset={async () => {
            if (!accountEmail) {
              return { error: new Error("Geen e-mailadres beschikbaar") };
            }

            const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
            const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, redirectTo ? { redirectTo } : undefined);
            return { error };
          }}
        />
      </main>
    );
  } else if (currentPage === "bedrijfsbeheer") {
    pageContent = (
      <CompanyManagementPage
        profile={profile}
        setCurrentPage={setCurrentPage}
        onThemeChange={handleCompanyThemeChange}
        themeScopeId={profile?.id || user?.id || null}
      />
    );
  } else if (currentPage === "admin") {
    pageContent = <AdminPage profile={profile} setCurrentPage={setCurrentPage} />;
  } else if (currentPage === "login") {
    pageContent = (
      <main className="page login-root">
        <LoginPage
          onLogin={() => setCurrentPage("home")}
          onGoToRegister={() => setCurrentPage("register")}
          onSkip={() => setCurrentPage("home")}
        />
      </main>
    );
  } else if (currentPage === "register") {
    pageContent = (
      <main className="page login-root">
        <RegisterPage
          onRegister={() => setCurrentPage("onboarding")}
          onGoToLogin={() => setCurrentPage("login")}
          onSkip={() => setCurrentPage("home")}
        />
      </main>
    );
  } else if (currentPage === "onboarding") {
    pageContent = (
      <main className="page login-root">
        <OnboardingPage
          onComplete={handleOnboardingComplete}
          onSkip={() => setCurrentPage("home")}
          initialFirstName={profile?.first_name || user?.user_metadata?.first_name || ""}
          initialLastName={profile?.last_name || user?.user_metadata?.last_name || ""}
        />
      </main>
    );
  } else {
    pageContent = (
      <main className="page home-page">
        <h1 className="greeting">Hallo {name}!</h1>

        <section className="section home-layout">
          <div className="home-left-column">
            <div className="rating-cards-container">
              <StressSlider
                label="Hoe hoog is je stressniveau nu?"
                value={stressLevel}
                onStressChange={handleStressChange}
              />
              <EnergySlider
                label="Wat is jouw energie level nu?"
                value={energyLevel}
                onEnergyChange={handleEnergyChange}
              />
            </div>

            <StatsSection
              stress={stressLevel}
              energy={energyLevel}
              pausesTaken={pausesTaken}
              pausesSkipped={pausesSkipped}
            />
          </div>

          <div className="home-right-column">
            <div className="timer-section">
              <Timer
                profile={profile}
                onOpenReflection={() => openWorkdayReflection("finished-day")}
                onBreakLogged={refreshWellbeingSnapshot}
                onReminderDecisionLogged={refreshWellbeingSnapshot}
                onStartBreathingExercise={() => openBreathingExercise("box", "home", true)}
                onOpenSuggestion={(suggestion) => openPauseSuggestionFromTimer(suggestion, "timer")}
              />
            </div>

            <PauseSuggestions
              onViewMore={() => setCurrentPage("pause")}
              onStartBreathingExercise={() => openBreathingExercise("box", "home")}
              user={user}
              profile={profile}
              setCurrentPage={setCurrentPage}
              externalSelectedSuggestion={pauseSuggestionToOpen}
              externalOverlaySource={pauseSuggestionOverlaySource}
              onExternalSuggestionConsumed={clearExternalPauseSuggestion}
            />
          </div>
        </section>
      </main>
    );
  }
  if (currentPage === "upgrade") {
    pageContent = (
      <main className="page upgrade-page">
        <UpgradePage profile={profile} onUpdateProfile={saveProfilePatch} setCurrentPage={setCurrentPage} />
      </main>
    );
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        setPasswordResetMode(false);
        if (shouldForceOnboarding(session.user)) {
          setCurrentPage("onboarding");
          return;
        }

        setCurrentPage((previousPage) => {
          if (AUTH_PAGES.has(previousPage)) {
            return "home";
          }
          return previousPage;
        });
      } else if (event === "PASSWORD_RECOVERY") {
        setPasswordResetMode(true);
        setCurrentPage("settings");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.id) {
        setProfile(null);
        setAvatar(null);
        setName(DEFAULT_NAME);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Failed to load profile:", error);
        return;
      }

      setProfile(data || null);
      setName(buildDisplayName(data, user));
      setAvatar(data?.avatar_url ?? null);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!shouldForceOnboarding(user)) return;
    if (currentPage === "onboarding") return;
    setCurrentPage("onboarding");
  }, [user, currentPage]);

  useEffect(() => {
    const hasCompanyScope = Boolean(companyThemeScopeId);
    const isManagedEmployee = Boolean(user?.user_metadata?.created_by);
    const companyEnabled = hasCompanyScope ? readStoredValue(companyStorageKeys.companyColorsEnabled, true) : false;
    const theme = readCompanyThemeFromStorage(companyStorageKeys);
    const shouldApply = hasCompanyScope
      && (isManagedEmployee ? (companyEnabled || Boolean(profile?.use_company_colors)) : Boolean(profile?.use_company_colors));
    applyCompanyThemeToRoot(theme, shouldApply);
  }, [companyThemeScopeId, companyStorageKeys, profile?.id, profile?.use_company_colors, user?.user_metadata?.created_by, companyThemeRevision]);

  useEffect(() => {
    let active = true;

    async function loadWellbeingSnapshot() {
      if (!user?.id) {
        if (active) {
          setStressLevel(3);
          setEnergyLevel(2);
          setPausesTaken(0);
          setPausesSkipped(0);
        }
        return;
      }

      const { data, error } = await loadLatestWellbeingSnapshot();
      if (!active) return;

      if (error) {
        console.error("Failed to load wellbeing snapshot:", error);
        return;
      }

      if (!data) {
        setStressLevel(3);
        setEnergyLevel(2);
        setPausesTaken(0);
        setPausesSkipped(0);
        return;
      }

      setStressLevel(data.stressLevel ?? 3);
      setEnergyLevel(data.energyLevel ?? 2);
      setPausesTaken(data.pausesTaken ?? 0);
      setPausesSkipped(data.pausesSkipped ?? 0);
    }

    loadWellbeingSnapshot();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileName() {
      if (!user?.id) {
        if (isMounted) {
          setName(DEFAULT_NAME);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load profile name:", error);
      }

      if (!isMounted) return;
      setName(buildDisplayName(data, user));
    }

    loadProfileName();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    persistLastPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistLastPage(currentPage);
        return;
      }

      const savedPage = readLastPage();
      if (!savedPage) return;

      setCurrentPage((previousPage) => {
        if (AUTH_PAGES.has(previousPage) || previousPage === savedPage) {
          return previousPage;
        }
        return savedPage;
      });
    };

    const handlePageHide = () => {
      persistLastPage(currentPage);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [currentPage]);

  return (
    <div className={currentPage !== "login" && currentPage !== "register" && currentPage !== "onboarding" ? "app appWithNavbar" : "app"}>
      {currentPage !== "login" && currentPage !== "register" && currentPage !== "onboarding" && (
        <Navbar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          avatar={avatar}
          onOpenReflection={openWorkdayReflection}
          profile={profile}
        />
      )}
      {pageContent}
      <WorkdayReflectionOverlay
        open={workdayReflectionOpen}
        onClose={closeWorkdayReflection}
        onSubmit={handleWorkdayReflectionSubmit}
        showFinishedTitle={workdayReflectionShowFinishedTitle}
      />
    </div>
  );
}
