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
      ) : (
        <main className="page home-page">
          <h1 className="greeting">Hallo {name}!</h1>

          <section className="section home-top-section">
            <div className="rating-timer-container">
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
              <div className="timer-section">
                <Timer />
              </div>
            </div>
          </section>

          <div className="home-panels">
            <StatsSection
              stress={stressLevel}
              energy={energyLevel}
              pausesTaken={3}
              pausesSkipped={1}
            />

            <PauseSuggestions onViewMore={() => setCurrentPage("pause")} />
          </div>
        </main>
      )}
    </div>
  );
}
