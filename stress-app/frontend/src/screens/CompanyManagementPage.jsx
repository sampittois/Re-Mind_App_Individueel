import { useEffect, useState } from "react";
import backIcon from "../assets/back.svg";
import plusIcon from "../assets/plus.svg";
import closeIcon from "../assets/x.svg";
import swirl from "../assets/swirl.png";
import "../styles/companyManagement.css";

const COMPANY_THEME_OPTIONS = [
  {
    id: "sage",
    name: "Sage",
    description: "Rustig en vertrouwd",
    preview: ["#fffcf5", "#769382", "#596e62", "#e4ebe6"],
    vars: {
      background: "#fffcf5",
      backgroundDark: "#f4edd9",
      text: "#1a1a1a",
      textLight: "#414141",
      border: "#c0c3b8",
      primaryDark: "#596e62",
      primary: "#769382",
      highlightDark: "#7e8f83",
      highlight: "#a8bfaf",
      highlightLight: "#e4ebe6",
      highlightHover: "#f2f5f3",
      success: "#6baf8e",
      warning: "#e3cb91",
      warningLight: "#f6efdd",
      error: "#da8383",
      errorDark: "#a46262",
      info: "#8cb2c8",
    },
  },
  {
    id: "clay",
    name: "Clay",
    description: "Warmer met zachte accenten",
    preview: ["#fff8f1", "#c98274", "#8e5d53", "#f1ddd6"],
    vars: {
      background: "#fff8f1",
      backgroundDark: "#f5e9df",
      text: "#2c1f1b",
      textLight: "#604940",
      border: "#cfb8ae",
      primaryDark: "#8e5d53",
      primary: "#c98274",
      highlightDark: "#c4988f",
      highlight: "#e0b1a6",
      highlightLight: "#f1ddd6",
      highlightHover: "#faefea",
      success: "#89a58f",
      warning: "#e1bc88",
      warningLight: "#f7ebd8",
      error: "#cf7d7d",
      errorDark: "#9e5959",
      info: "#8aaec1",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Koel en helder",
    preview: ["#f6fbfb", "#6a97a8", "#4f6f7c", "#dcecf0"],
    vars: {
      background: "#f6fbfb",
      backgroundDark: "#e8f1f2",
      text: "#172428",
      textLight: "#43606a",
      border: "#bfd0d4",
      primaryDark: "#4f6f7c",
      primary: "#6a97a8",
      highlightDark: "#7fb0bb",
      highlight: "#9cc3cc",
      highlightLight: "#dcecf0",
      highlightHover: "#eef7f8",
      success: "#6ea68c",
      warning: "#dcbc77",
      warningLight: "#f5ead3",
      error: "#cf8b83",
      errorDark: "#9f625b",
      info: "#7fadc2",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Dieper en zakelijker",
    preview: ["#f4f6ef", "#68806f", "#40544a", "#dde5da"],
    vars: {
      background: "#f4f6ef",
      backgroundDark: "#e4eadc",
      text: "#1d241f",
      textLight: "#49564d",
      border: "#bac5b9",
      primaryDark: "#40544a",
      primary: "#68806f",
      highlightDark: "#7f9683",
      highlight: "#a4b7a8",
      highlightLight: "#dde5da",
      highlightHover: "#eff3ee",
      success: "#6d9b7c",
      warning: "#d9be86",
      warningLight: "#f4ead3",
      error: "#d38a8a",
      errorDark: "#9e5b5b",
      info: "#8eb0c4",
    },
  },
  {
    id: "sunlit",
    name: "Sunlit",
    description: "Licht en uitnodigend",
    preview: ["#fffdf4", "#d8ba74", "#a78b49", "#f3e7be"],
    vars: {
      background: "#fffdf4",
      backgroundDark: "#f4ecd2",
      text: "#27211a",
      textLight: "#5a5344",
      border: "#d5c7a1",
      primaryDark: "#a78b49",
      primary: "#d8ba74",
      highlightDark: "#d9c68c",
      highlight: "#ead79d",
      highlightLight: "#f3e7be",
      highlightHover: "#fbf4de",
      success: "#7fa981",
      warning: "#d8b76b",
      warningLight: "#f8edd2",
      error: "#db8d8d",
      errorDark: "#a45e5e",
      info: "#8faec4",
    },
  },
];

const STORAGE_KEYS = {
  employees: "remind:company-employees",
  theme: "remind:company-theme",
  newEmployeeColors: "remind:company-new-employee-colors",
};

const DEFAULT_THEME_ID = "sage";

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function createEmployeeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `employee-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getThemeById(themeId) {
  return COMPANY_THEME_OPTIONS.find((theme) => theme.id === themeId) || COMPANY_THEME_OPTIONS[0];
}

function formatHours(hoursWorked) {
  const normalizedHours = Number.isFinite(hoursWorked) ? hoursWorked : 0;
  return `${new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(normalizedHours)} uur`;
}

function createDefaultEmployees() {
  return [
    {
      id: "employee-1",
      name: "Jane Smith",
      email: "jane@bedrijf.be",
      department: "Sales",
      status: "Actief",
      hoursWorked: 36.5,
      breaksTaken: 12,
      usesCompanyColors: true,
      createdAt: "2026-05-12T08:00:00.000Z",
    },
    {
      id: "employee-2",
      name: "Bob Johnson",
      email: "bob@bedrijf.be",
      department: "IT",
      status: "Inactief",
      hoursWorked: 28,
      breaksTaken: 8,
      usesCompanyColors: false,
      createdAt: "2026-05-10T08:00:00.000Z",
    },
    {
      id: "employee-3",
      name: "Liesbeth Channing",
      email: "liesbeth@bedrijf.be",
      department: "Marketing",
      status: "Actief",
      hoursWorked: 41,
      breaksTaken: 15,
      usesCompanyColors: true,
      createdAt: "2026-05-08T08:00:00.000Z",
    },
    {
      id: "employee-4",
      name: "Steven Green",
      email: "steven@bedrijf.be",
      department: "Design",
      status: "Actief",
      hoursWorked: 33.5,
      breaksTaken: 10,
      usesCompanyColors: true,
      createdAt: "2026-05-04T08:00:00.000Z",
    },
  ];
}

function createInitialForm() {
  return {
    name: "",
    email: "",
    department: "Sales",
    status: "Actief",
    hoursWorked: "",
    breaksTaken: "",
  };
}

function paletteForEmployee(employee, selectedTheme) {
  return employee.usesCompanyColors ? selectedTheme : COMPANY_THEME_OPTIONS[0];
}

export default function CompanyManagementPage({ profile, setCurrentPage }) {
  const [employees, setEmployees] = useState(() => readStoredValue(STORAGE_KEYS.employees, createDefaultEmployees()));
  const [themeId, setThemeId] = useState(() => readStoredValue(STORAGE_KEYS.theme, DEFAULT_THEME_ID));
  const [newEmployeeColorsDefault, setNewEmployeeColorsDefault] = useState(() => readStoredValue(STORAGE_KEYS.newEmployeeColors, true));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [formValues, setFormValues] = useState(createInitialForm());

  const activeTheme = getThemeById(themeId);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) || null;
  const adminLabel = profile?.full_name || profile?.first_name || profile?.email || "Bedrijfsbeheerder";

  const themedVariables = {
    "--background": activeTheme.vars.background,
    "--background-dark": activeTheme.vars.backgroundDark,
    "--text": activeTheme.vars.text,
    "--text-light": activeTheme.vars.textLight,
    "--border": activeTheme.vars.border,
    "--primary-dark": activeTheme.vars.primaryDark,
    "--primary": activeTheme.vars.primary,
    "--highlight-dark": activeTheme.vars.highlightDark,
    "--highlight": activeTheme.vars.highlight,
    "--highlight-light": activeTheme.vars.highlightLight,
    "--highlight-hover": activeTheme.vars.highlightHover,
    "--success": activeTheme.vars.success,
    "--warning": activeTheme.vars.warning,
    "--warning-light": activeTheme.vars.warningLight,
    "--error": activeTheme.vars.error,
    "--error-dark": activeTheme.vars.errorDark,
    "--info": activeTheme.vars.info,
  };

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.employees, employees);
  }, [employees]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.theme, themeId);
  }, [themeId]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.newEmployeeColors, newEmployeeColorsDefault);
  }, [newEmployeeColorsDefault]);

  useEffect(() => {
    if (!isCreateOpen && !selectedEmployeeId) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      setIsCreateOpen(false);
      setSelectedEmployeeId(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen, selectedEmployeeId]);

  function openCreateModal() {
    setFormValues(createInitialForm());
    setIsCreateOpen(true);
  }

  function submitEmployee(event) {
    event.preventDefault();

    const name = formValues.name.trim();
    const email = formValues.email.trim();

    if (!name || !email) {
      return;
    }

    const nextEmployee = {
      id: createEmployeeId(),
      name,
      email,
      department: formValues.department.trim() || "Sales",
      status: formValues.status || "Actief",
      hoursWorked: Number.isFinite(Number(formValues.hoursWorked)) && formValues.hoursWorked !== "" ? Number(formValues.hoursWorked) : 0,
      breaksTaken: Number.isFinite(Number(formValues.breaksTaken)) && formValues.breaksTaken !== "" ? Number(formValues.breaksTaken) : 0,
      usesCompanyColors: Boolean(newEmployeeColorsDefault),
      createdAt: new Date().toISOString(),
      createdBy: adminLabel,
      themeId: newEmployeeColorsDefault ? activeTheme.id : DEFAULT_THEME_ID,
    };

    setEmployees((previous) => [nextEmployee, ...previous]);
    setSelectedEmployeeId(nextEmployee.id);
    setIsCreateOpen(false);
    setFormValues(createInitialForm());
  }

  return (
    <main className="company-management-page page" style={themedVariables}>
      <img className="company-management-page__swirl" src={swirl} alt="" aria-hidden="true" />

      <div className="company-management-header">
        <button className="company-management-back" type="button" onClick={() => setCurrentPage?.("profile")} aria-label="Terug">
          <img src={backIcon} alt="Terug" />
        </button>

        <div>
          <p className="company-management-eyebrow">Bedrijfsbeheer</p>
          <h1 className="company-management-title">Werknemers en bedrijfskleuren</h1>
          <p className="company-management-intro">
            {adminLabel} kan hier accounts aanmaken, de bedrijfskleuren kiezen en nieuwe accounts automatisch met die kleuren laten starten.
          </p>
        </div>

        <button className="company-management-add" type="button" onClick={openCreateModal}>
          <img src={plusIcon} alt="" aria-hidden="true" />
          Werknemer toevoegen
        </button>
      </div>

      <div className="company-management-grid">
        <section className="company-management-panel employees-panel">
          <div className="company-management-panel__header">
            <div>
              <h2 className="company-management-panel__title">Werknemers</h2>
              <p className="company-management-panel__copy">Klik op een werknemer om hun prestaties en pauzes te bekijken.</p>
            </div>
          </div>

          <div className="employee-table" role="table" aria-label="Werknemerslijst">
            <div className="employee-table__header" role="row">
              <span role="columnheader">Naam</span>
              <span role="columnheader">E-mail</span>
              <span role="columnheader">Afdeling</span>
              <span role="columnheader">Status</span>
            </div>

            <div className="employee-table__body">
              {employees.map((employee) => {
                const employeeTheme = paletteForEmployee(employee, activeTheme);

                return (
                  <button
                    key={employee.id}
                    type="button"
                    className={`employee-row${selectedEmployeeId === employee.id ? " employee-row--selected" : ""}`}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                  >
                    <span className="employee-name">
                      {employee.name}
                      {employee.usesCompanyColors ? <span className="employee-badge">Bedrijfskleuren</span> : null}
                    </span>
                    <span>{employee.email}</span>
                    <span>{employee.department}</span>
                    <span>
                      <span
                        className={`employee-status employee-status--${employee.status === "Actief" ? "active" : "inactive"}`}
                        style={{
                          background: employeeTheme.vars.highlightLight,
                          color: employeeTheme.vars.primaryDark,
                          borderColor: employeeTheme.vars.border,
                        }}
                      >
                        {employee.status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="company-management-panel theme-panel">
          <div className="company-management-panel__header">
            <div>
              <h2 className="company-management-panel__title">Bedrijfskleuren</h2>
              <p className="company-management-panel__copy">Klik om een palet te kiezen. De nieuwe accounts nemen dit over als de toggle aan staat.</p>
            </div>
          </div>

          <div className="theme-swatches" role="list" aria-label="Bedrijfskleuren">
            {COMPANY_THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`theme-swatch${option.id === activeTheme.id ? " theme-swatch--active" : ""}`}
                onClick={() => setThemeId(option.id)}
                aria-pressed={option.id === activeTheme.id}
              >
                <span className="theme-swatch__swatches" aria-hidden="true">
                  {option.preview.map((color) => (
                    <span key={color} className="theme-swatch__chip" style={{ background: color }} />
                  ))}
                </span>
                <span className="theme-swatch__label">{option.name}</span>
                <span className="theme-swatch__description">{option.description}</span>
              </button>
            ))}
          </div>

          <div className="company-toggle-row">
            <div>
              <h3 className="company-toggle-row__title">Nieuwe accounts gebruiken deze kleuren</h3>
              <p className="company-management-panel__copy">Wanneer deze toggle aan staat, krijgen nieuw aangemaakte werknemers automatisch het gekozen bedrijfspalet.</p>
            </div>

            <button
              className={`toggle-switch ${newEmployeeColorsDefault ? "active" : ""}`}
              onClick={() => setNewEmployeeColorsDefault((previous) => !previous)}
              type="button"
              role="switch"
              aria-checked={newEmployeeColorsDefault}
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          <div className="theme-preview">
            <div className="theme-preview__badge">Voorbeeld</div>
            <h3 className="theme-preview__title">{activeTheme.name}</h3>
            <p className="theme-preview__copy">{activeTheme.description}</p>
            <div className="theme-preview__bars" aria-hidden="true">
              {activeTheme.preview.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {isCreateOpen ? (
        <div className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-create-title" onMouseDown={() => setIsCreateOpen(false)}>
          <div className="company-modal__card" onMouseDown={(event) => event.stopPropagation()}>
            <button className="company-modal__close" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Sluiten">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>

            <h2 id="company-create-title" className="company-modal__title">Nieuw werknemersaccount</h2>
            <p className="company-modal__copy">Maak een nieuw account aan. De geselecteerde bedrijfskleuren worden gebruikt als de toggle actief is.</p>

            <form className="company-form" onSubmit={submitEmployee}>
              <label className="company-field">
                <span>Naam</span>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) => setFormValues((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Bijvoorbeeld: Sophie De Smet"
                />
              </label>

              <label className="company-field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((previous) => ({ ...previous, email: event.target.value }))}
                  placeholder="sophie@bedrijf.be"
                />
              </label>

              <div className="company-form__grid">
                <label className="company-field">
                  <span>Afdeling</span>
                  <input
                    type="text"
                    value={formValues.department}
                    onChange={(event) => setFormValues((previous) => ({ ...previous, department: event.target.value }))}
                    placeholder="Sales"
                  />
                </label>

                <label className="company-field">
                  <span>Status</span>
                  <select
                    value={formValues.status}
                    onChange={(event) => setFormValues((previous) => ({ ...previous, status: event.target.value }))}
                  >
                    <option value="Actief">Actief</option>
                    <option value="Inactief">Inactief</option>
                  </select>
                </label>
              </div>

              <div className="company-form__grid">
                <label className="company-field">
                  <span>Uren gewerkt</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formValues.hoursWorked}
                    onChange={(event) => setFormValues((previous) => ({ ...previous, hoursWorked: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="company-field">
                  <span>Pauzes genomen</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formValues.breaksTaken}
                    onChange={(event) => setFormValues((previous) => ({ ...previous, breaksTaken: event.target.value }))}
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="company-modal__actions">
                <button className="company-modal__primary" type="submit">Account aanmaken</button>
                <button className="company-modal__secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Annuleer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedEmployee ? (
        <div className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-stats-title" onMouseDown={() => setSelectedEmployeeId(null)}>
          <div className="company-modal__card company-modal__card--stats" onMouseDown={(event) => event.stopPropagation()}>
            <button className="company-modal__close" type="button" onClick={() => setSelectedEmployeeId(null)} aria-label="Sluiten">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>

            <div className="company-stats__header">
              <div>
                <p className="company-management-eyebrow">Werknemerstatistieken</p>
                <h2 id="company-stats-title" className="company-modal__title">{selectedEmployee.name}</h2>
                <p className="company-modal__copy">{selectedEmployee.email} · {selectedEmployee.department}</p>
              </div>

              <span className={`company-stats__status company-stats__status--${selectedEmployee.status === "Actief" ? "active" : "inactive"}`}>
                {selectedEmployee.status}
              </span>
            </div>

            <div className="company-stats-grid">
              <article className="company-stat-card">
                <span className="company-stat-card__label">Uren gewerkt</span>
                <strong className="company-stat-card__value">{formatHours(selectedEmployee.hoursWorked)}</strong>
                <span className="company-stat-card__meta">Sinds {new Date(selectedEmployee.createdAt).toLocaleDateString("nl-NL")}</span>
              </article>

              <article className="company-stat-card">
                <span className="company-stat-card__label">Pauzes genomen</span>
                <strong className="company-stat-card__value">{selectedEmployee.breaksTaken}</strong>
                <span className="company-stat-card__meta">Totaal geregistreerde pauzes</span>
              </article>
            </div>

            <div className="company-stats-footnote">
              <span>Bedrijfskleuren</span>
              <strong>{selectedEmployee.usesCompanyColors ? "Actief voor dit account" : "Uit voor dit account"}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}