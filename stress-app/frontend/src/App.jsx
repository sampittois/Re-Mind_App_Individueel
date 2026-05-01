import { useMemo, useState } from "react";
import "./styles/App.css";

import Navbar from "./components/Navbar";
import WorkTimerCard from "./components/WorkTimerCard";
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
        <PauseSuggestions onNavigateToBreathing={() => setCurrentPage("breathing")} />
      ) : (
        <main className="page">
          <h1 className="greeting">Hallo {name}!</h1>

          <section className="section home-top-section">
            <div className="rating-timer-container">
              <div className="rating-cards-container">
                <RatingCard 
                  label="Hoe hoog is je stressniveau nu?"
                  icon="📈"
                  onRate={setStressLevel}
                />
                <RatingCard 
                  label="Wat is jouw energie level nu?"
                  icon="⚡"
                  onRate={setEnergyLevel}
                />
              </div>
              <div className="timer-section">
                <WorkTimerCard />
              </div>
            </div>
          </section>

          <StatsSection 
            stress={stressLevel}
            energy={energyLevel}
            pausesTaken={3}
            pausesSkipped={1}
          />

          <section className="section">
            <h2 className="section-title">Pauzesuggesties</h2>
            <div className="pause-suggestions-preview">
              <div className="pause-card-mini">
                <div className="pause-card-icon">🫁</div>
                <div className="pause-card-title">Ademhaling</div>
                <button className="pause-card-fav">♡</button>
              </div>
              <div className="pause-card-mini">
                <div className="pause-card-icon">🧘</div>
                <div className="pause-card-title">Stretchen</div>
                <button className="pause-card-fav">♡</button>
              </div>
              <div className="pause-card-mini">
                <div className="pause-card-icon">👁</div>
                <div className="pause-card-title">Oog reset</div>
                <button className="pause-card-fav">♡</button>
              </div>
            </div>
            <button className="btn-view-more" onClick={() => setCurrentPage("pause")}>
              Bekijk meer <span>›</span>
            </button>
          </section>
        </main>
      )}
    </div>
  );
}
