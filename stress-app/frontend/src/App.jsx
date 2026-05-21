import { useState, useEffect } from "react";
import "./styles/App.css";
import { supabase } from "./lib/supabaseClient";

import Navbar from "./components/Navbar";
import Timer from "./components/Timer";
import PauseSuggestions from "./components/PauseSuggestions";
import BreathingExercises from "./components/BreathingExercises";
import BreathingExerciseDetail from "./components/BreathingExerciseDetail";
import RatingCard from "./components/RatingCard";
import StressSlider from "./components/StressSlider";
import EnergySlider from "./components/EnergySlider";
import StatsSection from "./components/StatsSection";
import ProfileSection from "./components/ProfileSection";
import Reports from "./components/Reports";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import OnboardingPage from "./components/OnboardingPage";

const DEFAULT_NAME = "John Doe";

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

export default function App() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [avatar, setAvatar] = useState(null);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(2);
  const [recentSessions, setRecentSessions] = useState([]);

  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [breathingReturnPage, setBreathingReturnPage] = useState("home");
  const [user, setUser] = useState(null);

  async function saveProfileName(nextName) {
    const cleanName = (nextName || "").trim();
    const fallbackName = cleanName || DEFAULT_NAME;

    if (!user?.id) {
      setName(fallbackName);
      return true;
    }

    const { fullName, firstName, lastName } = deriveNameParts(fallbackName);
    const previousName = name;
    setName(fullName);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        first_name: firstName || null,
        last_name: lastName || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to save profile name:", error);
      setName(previousName);
      return false;
    }

    return true;
  }

  async function handleOnboardingComplete(payload = {}) {
    const providedName = (payload.name || "").trim();
    const fallbackName = providedName || DEFAULT_NAME;
    const { fullName, firstName, lastName } = deriveNameParts(fallbackName);

    if (user?.id) {
      const fixedBreaks = Array.isArray(payload.fixedBreaks) ? payload.fixedBreaks : [];
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          first_name: (payload.firstName || firstName || "").trim() || null,
          last_name: (payload.lastName || lastName || "").trim() || null,
          work_start: payload.workStart || null,
          work_end: payload.workEnd || null,
          break_frequency_mins: Number.isFinite(payload.breakFrequencyMins) ? payload.breakFrequencyMins : null,
          fixed_breaks: fixedBreaks,
          pause_habit: payload.pauseHabit || null,
          work_style: payload.workStyle || null,
          allow_reminders: Boolean(payload.allowReminders),
          onboarding_completed: true,
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("Failed to save onboarding profile:", error);
      }
    }

    setName(fullName || DEFAULT_NAME);
    setCurrentPage("home");
  }


  let pageContent;

  if (currentPage === "exercise-detail") {
    pageContent = (
      <BreathingExerciseDetail
        exerciseId={selectedExercise}
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
    pageContent = <Reports setCurrentPage={setCurrentPage} />;
  } else if (currentPage === "pause") {
    pageContent = (
      <PauseSuggestions
        mode="page"
        showViewMore={false}
        onBack={() => setCurrentPage("home")}
        onStartBreathingExercise={() => openBreathingExercise("box", "pause")}
        user={user}
      />
    );
  } else if (currentPage === "profile") {
    pageContent = (
      <main className="page profile-page">
        <ProfileSection
          initialName={name}
          onSaveName={saveProfileName}
          onSaveAvatar={(a) => setAvatar(a)}
          onLogout={() => setCurrentPage("login")}
          user={user}
        />
      </main>
    );
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
        <OnboardingPage onComplete={handleOnboardingComplete} onSkip={() => setCurrentPage("home")} />
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
                onStressChange={setStressLevel}
              />
              <EnergySlider
                label="Wat is jouw energie level nu?"
                onEnergyChange={setEnergyLevel}
              />
            </div>

            <StatsSection
              stress={stressLevel}
              energy={energyLevel}
              pausesTaken={3}
              pausesSkipped={1}
            />

            {/* <section className="section">
              <h2>Supabase data</h2>
              {recentSessions.length > 0 ? (
                <ul>
                  {recentSessions.map((session) => (
                    <li key={session.id}>
                      Sessiestart: {new Date(session.start_time).toLocaleString()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Geen recente work sessions geladen.</p>
              )}
            </section> */}
          </div>

          <div className="home-right-column">
            <div className="timer-section">
              <Timer />
            </div>

            <PauseSuggestions
              onViewMore={() => setCurrentPage("pause")}
              onStartBreathingExercise={() => openBreathingExercise("box", "home")}
              user={user}
            />
          </div>
        </section>
      </main>
    );
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setCurrentPage("home");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

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

  return (
    <div className={currentPage !== "login" && currentPage !== "register" && currentPage !== "onboarding" ? "app appWithNavbar" : "app"}>
      {currentPage !== "login" && currentPage !== "register" && currentPage !== "onboarding" && <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} avatar={avatar} />}
      {pageContent}
    </div>
  );
}
