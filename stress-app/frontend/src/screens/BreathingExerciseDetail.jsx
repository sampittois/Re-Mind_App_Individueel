import { useState, useEffect, useRef } from "react";
import breathingIcon from "../assets/swirl.png";

const EXERCISE_DATA = {
    box: {
        title: "Box breathing",
        steps: [
            { label: "Adem in", duration: "4s" },
            { label: "Houden", duration: "4s" },
            { label: "Adem uit", duration: "4s" },
            { label: "Houden", duration: "4s" }
        ]
    },
    coherent: {
        title: "Coherent breathing",
        steps: [
            { label: "Adem in", duration: "5s" },
            { label: "Adem uit", duration: "5s" }
        ]
    },
    vishama: {
        title: "Vishama Vritti (ongelijk ademen)",
        steps: [
            { label: "Adem in", duration: "4s" },
            { label: "Adem uit", duration: "6s" }
        ]
    },
    ratio: {
        title: "1:2 ratio breathing",
        steps: [
            { label: "Adem in", duration: "4s" },
            { label: "Adem uit", duration: "8s" }
        ]
    },
    physio: {
        title: "Physiological sigh",
        steps: [
            { label: "Adem in", duration: "2s" },
            { label: "Nog eens in", duration: "1s" },
            { label: "Adem uit", duration: "5s" }
        ]
    }
};

const STEP_VISUALS = {
    "Adem in": { className: "exercise-circle--inhale", label: "Adem in" },
    "Adem uit": { className: "exercise-circle--exhale", label: "Adem uit" },
    "Nog eens in": { className: "exercise-circle--inhale-short", label: "Nog eens in" },
};

const getCircleStateClass = (stepLabel, previousStepLabel) => {
    if (stepLabel === "Houden") {
        if (previousStepLabel === "Adem uit") return "exercise-circle--exhale";
        return "exercise-circle--inhale";
    }

    return STEP_VISUALS[stepLabel]?.className || "exercise-circle--idle";
};

// Helper function to convert duration string (e.g., "4s") to milliseconds
const durationToMs = (duration) => {
    const seconds = parseFloat(duration);
    return seconds * 1000;
};

export default function BreathingExerciseDetail({ exerciseId, onBack }) {
    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const timerRef = useRef(null);

    const exercise = EXERCISE_DATA[exerciseId] || EXERCISE_DATA.box;
    const currentStep = exercise.steps[currentStepIndex] || exercise.steps[0];
    const previousStep = exercise.steps[currentStepIndex - 1];
    const circleStateClass = isActive
        ? getCircleStateClass(currentStep?.label, previousStep?.label)
        : "exercise-circle--idle";
    const currentStepDurationMs = durationToMs(currentStep?.duration || "0s");

    const handleStart = () => {
        setIsActive(true);
        setCurrentStepIndex(0);
    };

    const handleStop = () => {
        setIsActive(false);
        setCurrentStepIndex(0);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleToggle = () => {
        if (isActive) {
          handleStop();
          return;
        }

        handleStart();
    };

    // Handle step cycling
    useEffect(() => {
        if (!isActive) return;

        const currentStep = exercise.steps[currentStepIndex];
        const duration = durationToMs(currentStep.duration);

        timerRef.current = setTimeout(() => {
            setCurrentStepIndex((prevIndex) => {
                return (prevIndex + 1) % exercise.steps.length;
            });
        }, duration);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isActive, currentStepIndex, exercise.steps]);

    return (
        <main className="exercise-detail-page">
            <div className="exercise-detail-top-row">
                <button className="back-btn exercise-detail-back" onClick={onBack} aria-label="Terug" type="button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="exercise-detail-stage">
                <p className={`exercise-phase ${isActive ? "is-visible" : ""}`} aria-live="polite">
                    {isActive ? currentStep.label : ""}
                </p>

                <div
                    className={`exercise-circle ${isActive ? "is-active" : "is-idle"} ${circleStateClass}`}
                    style={{
                        "--circle-transition-duration": isActive ? `${currentStepDurationMs}ms` : "350ms",
                    }}
                >
                    <img src={breathingIcon} alt="" aria-hidden="true" className="exercise-circle-icon" />
                </div>

                <button className="exercise-toggle-btn" onClick={handleToggle} type="button">
                    {isActive ? "Stop" : "Start"}
                </button>
            </div>
        </main>
    );
}
