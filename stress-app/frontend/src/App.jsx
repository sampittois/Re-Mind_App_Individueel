import { useMemo, useState } from "react";
import "./styles/App.css";

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

export default function App() {
  const [name] = useState("John Doe");
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(2);

  const [currentPage, setCurrentPage] = useState("home");
  const [selectedExercise, setSelectedExercise] = useState(null);


  return (
    <div className="app">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {currentPage === "exercise-detail" ? (
        <BreathingExerciseDetail
          exerciseId={selectedExercise}
          onBack={() => setCurrentPage("breathing")}
          onChangeMethod={() => setCurrentPage("breathing")}
        />
      ) : currentPage === "breathing" ? (
        <BreathingExercises
          onBack={() => setCurrentPage("pause")}
          onSelectExercise={(id) => {
            setSelectedExercise(id);
            setCurrentPage("exercise-detail");
          }}
        />
      ) : currentPage === "pause" ? (
        <main className="pause-page-shell">
          <PauseSuggestions showViewMore={false} />
        </main>
      ) : currentPage === "profile" ? (
        <main className="page profile-page">
          <ProfileSection initialName={name} />
        </main>
      ) : (
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

              <PauseSuggestions onViewMore={() => setCurrentPage("pause")} />
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
