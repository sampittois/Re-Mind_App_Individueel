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

export default function App() {
  const [name, setName] = useState("John Doe");
  const [avatar, setAvatar] = useState(null);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(2);

  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [user, setUser] = useState(null);


  let pageContent;

  if (currentPage === "exercise-detail") {
    pageContent = (
      <BreathingExerciseDetail
        exerciseId={selectedExercise}
        onBack={() => setCurrentPage("breathing")}
        onChangeMethod={() => setCurrentPage("breathing")}
      />
    );
  } else if (currentPage === "breathing") {
    pageContent = (
      <BreathingExercises
        onBack={() => setCurrentPage("pause")}
        onSelectExercise={(id) => {
          setSelectedExercise(id);
          setCurrentPage("exercise-detail");
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
        user={user}
      />
    );
  } else if (currentPage === "profile") {
    pageContent = (
      <main className="page profile-page">
        <ProfileSection
          initialName={name}
          onSaveName={(n) => setName(n)}
          onSaveAvatar={(a) => setAvatar(a)}
          onLogout={() => setCurrentPage("login")}
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
        <OnboardingPage onComplete={() => setCurrentPage("home")} onSkip={() => setCurrentPage("home")} />
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
          </div>

          <div className="home-right-column">
            <div className="timer-section">
              <Timer />
            </div>

            <PauseSuggestions onViewMore={() => setCurrentPage("pause")} user={user} />
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

  return (
    <div className="app">
      {currentPage !== "login" && currentPage !== "register" && currentPage !== "onboarding" && <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} avatar={avatar} />}
      {pageContent}
    </div>
  );
}
