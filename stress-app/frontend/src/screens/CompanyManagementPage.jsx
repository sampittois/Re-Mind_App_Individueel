import { useEffect, useState } from "react";
import { BackIcon, PlusIcon } from "../components/IconActions";
import closeIcon from "../assets/x.svg";
import "../styles/companyManagement.css";
import { supabase } from "../lib/supabaseClient";

export const COMPANY_THEME_OPTIONS = [
  {
    id: "sage",
    name: "Sage",
    description: "Rustig en vertrouwd",
    preview: ["#f7f4ef", "#7c8f85", "#5f6f67", "#e6ece8"],
    vars: {
      background: "#f7f4ef",
      backgroundDark: "#ece5db",
      text: "#202020",
      textLight: "#4a4a4a",
      border: "#c8c1b7",
      primaryDark: "#5f6f67",
      primary: "#7c8f85",
      highlightDark: "#8da097",
      highlight: "#b3c1ba",
      highlightLight: "#e6ece8",
      highlightHover: "#f2f5f3",
      success: "#7aa184",
      warning: "#d8c07d",
      warningLight: "#f5ead1",
      error: "#d58d8d",
      errorDark: "#9f5f5f",
      info: "#8ab0c4",
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

export const STORAGE_KEYS = {
  employees: "remind:company-employees",
  theme: "remind:company-theme",
  customTheme: "remind:company-custom-theme",
  companyColorsEnabled: "remind:company-colors-enabled",
};

export const DEFAULT_THEME_ID = "sage";

export const DEFAULT_CUSTOM_THEME = {
  vars: {
    background: "#f7f4ef",
    backgroundDark: "#ece5db",
    text: "#202020",
    textLight: "#4a4a4a",
    border: "#c8c1b7",
    primaryDark: "#5f6f67",
    primary: "#7c8f85",
    highlightDark: "#8da097",
    highlight: "#b3c1ba",
    highlightLight: "#e6ece8",
    highlightHover: "#f2f5f3",
    success: "#7aa184",
    warning: "#d8c07d",
    warningLight: "#f5ead1",
    error: "#d58d8d",
    errorDark: "#9f5f5f",
    info: "#8ab0c4",
  },
};

const CUSTOM_THEME_FIELDS = [
  { key: "background", label: "Achtergrond" },
  { key: "primary", label: "Hoofdkleur" },
  { key: "primaryDark", label: "Donkere accentkleur" },
  { key: "highlightLight", label: "Zachte achtergrond" },
  { key: "text", label: "Tekstkleur" },
  { key: "border", label: "Randkleur" },
];

export function readStoredValue(key, fallback) {
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

export function getThemeById(themeId) {
  return COMPANY_THEME_OPTIONS.find((theme) => theme.id === themeId) || COMPANY_THEME_OPTIONS[0];
}

export function normalizeCustomTheme(theme) {
  const nextTheme = theme && typeof theme === "object" ? theme : {};
  const nextVars = nextTheme.vars && typeof nextTheme.vars === "object" ? nextTheme.vars : {};

  return {
    vars: {
      background: nextVars.background || DEFAULT_CUSTOM_THEME.vars.background,
      backgroundDark: nextVars.backgroundDark || DEFAULT_CUSTOM_THEME.vars.backgroundDark,
      text: nextVars.text || DEFAULT_CUSTOM_THEME.vars.text,
      textLight: nextVars.textLight || DEFAULT_CUSTOM_THEME.vars.textLight,
      border: nextVars.border || DEFAULT_CUSTOM_THEME.vars.border,
      primaryDark: nextVars.primaryDark || DEFAULT_CUSTOM_THEME.vars.primaryDark,
      primary: nextVars.primary || DEFAULT_CUSTOM_THEME.vars.primary,
      highlightDark: nextVars.highlightDark || DEFAULT_CUSTOM_THEME.vars.highlightDark,
      highlight: nextVars.highlight || DEFAULT_CUSTOM_THEME.vars.highlight,
      highlightLight: nextVars.highlightLight || DEFAULT_CUSTOM_THEME.vars.highlightLight,
      highlightHover: nextVars.highlightHover || DEFAULT_CUSTOM_THEME.vars.highlightHover,
      success: nextVars.success || DEFAULT_CUSTOM_THEME.vars.success,
      warning: nextVars.warning || DEFAULT_CUSTOM_THEME.vars.warning,
      warningLight: nextVars.warningLight || DEFAULT_CUSTOM_THEME.vars.warningLight,
      error: nextVars.error || DEFAULT_CUSTOM_THEME.vars.error,
      errorDark: nextVars.errorDark || DEFAULT_CUSTOM_THEME.vars.errorDark,
      info: nextVars.info || DEFAULT_CUSTOM_THEME.vars.info,
    },
  };
}

function themeToPreview(theme) {
  return [theme.vars.background, theme.vars.primary, theme.vars.primaryDark, theme.vars.highlightLight];
}

const STALE_OFFLINE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

function getEmployeeStatusMeta(statusValue, referenceDate) {
  const normalizedStatus = String(statusValue || "").trim().toLowerCase();
  const isOnline = normalizedStatus === "actief" || normalizedStatus === "online";

  if (isOnline) {
    return { label: "Online", tone: "online" };
  }

  const referenceTime = referenceDate ? new Date(referenceDate).getTime() : Number.NaN;
  const isStaleOffline = Number.isFinite(referenceTime) && Date.now() - referenceTime > STALE_OFFLINE_THRESHOLD_MS;

  return {
    label: "Offline",
    tone: isStaleOffline ? "stale-offline" : "offline",
  };
}

function createDefaultEmployees() {
  return [
    {
      id: "employee-1",
      name: "Jane Smith",
      email: "jane@bedrijf.be",
      department: "Sales",
      status: "Online",
      usesCompanyColors: true,
      createdAt: "2026-05-12T08:00:00.000Z",
      lastSeenAt: "2026-05-12T08:00:00.000Z",
    },
    {
      id: "employee-2",
      name: "Bob Johnson",
      email: "bob@bedrijf.be",
      department: "IT",
      status: "Offline",
      usesCompanyColors: false,
      createdAt: "2026-05-10T08:00:00.000Z",
      lastSeenAt: "2026-05-10T08:00:00.000Z",
    },
    {
      id: "employee-3",
      name: "Liesbeth Channing",
      email: "liesbeth@bedrijf.be",
      department: "Marketing",
      status: "Online",
      usesCompanyColors: true,
      createdAt: "2026-05-08T08:00:00.000Z",
      lastSeenAt: "2026-05-08T08:00:00.000Z",
    },
    {
      id: "employee-4",
      name: "Steven Green",
      email: "steven@bedrijf.be",
      department: "Design",
      status: "Online",
      usesCompanyColors: true,
      createdAt: "2026-05-04T08:00:00.000Z",
      lastSeenAt: "2026-05-04T08:00:00.000Z",
    },
  ];
}

function createInitialForm() {
  return {
    name: "",
    email: "",
    department: "Sales",
    password: "",
  };
}

export function buildThemeVariables(theme) {
  return {
    "--background": theme.vars.background,
    "--background-dark": theme.vars.backgroundDark,
    "--text": theme.vars.text,
    "--text-light": theme.vars.textLight,
    "--border": theme.vars.border,
    "--primary-dark": theme.vars.primaryDark,
    "--primary": theme.vars.primary,
    "--highlight-dark": theme.vars.highlightDark,
    "--highlight": theme.vars.highlight,
    "--highlight-light": theme.vars.highlightLight,
    "--highlight-hover": theme.vars.highlightHover,
    "--success": theme.vars.success,
    "--warning": theme.vars.warning,
    "--warning-light": theme.vars.warningLight,
    "--error": theme.vars.error,
    "--error-dark": theme.vars.errorDark,
    "--info": theme.vars.info,
  };
}

export default function CompanyManagementPage({ profile, setCurrentPage, onThemeChange }) {
  const [employees, setEmployees] = useState(() => readStoredValue(STORAGE_KEYS.employees, createDefaultEmployees()));
  const [themeId, setThemeId] = useState(() => readStoredValue(STORAGE_KEYS.theme, DEFAULT_THEME_ID));
  const [customTheme, setCustomTheme] = useState(() => normalizeCustomTheme(readStoredValue(STORAGE_KEYS.customTheme, DEFAULT_CUSTOM_THEME)));
  const [companyColorsEnabled, setCompanyColorsEnabled] = useState(() => readStoredValue(STORAGE_KEYS.companyColorsEnabled, true));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [formValues, setFormValues] = useState(createInitialForm());
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [createEmployeeError, setCreateEmployeeError] = useState("");
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [deleteEmployeeError, setDeleteEmployeeError] = useState("");

  const activeTheme = themeId === "custom" ? customTheme : getThemeById(themeId);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) || null;
  const adminLabel = profile?.full_name || profile?.first_name || profile?.email || "Bedrijfsbeheerder";
  const themedVariables = buildThemeVariables(activeTheme);
  const selectedThemePreview = themeId === "custom" ? themeToPreview(activeTheme) : activeTheme.preview;

  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [employeeStats, setEmployeeStats] = useState(null);
  const [employeeStatsLoading, setEmployeeStatsLoading] = useState(false);
  const remindTheme = normalizeCustomTheme(DEFAULT_CUSTOM_THEME);

  async function loadEmployeeStatsForDay(employee, isoDate) {
    setEmployeeStatsLoading(true);
    setEmployeeStats(null);

    try {
      const email = employee?.email;
      if (!email) {
        setEmployeeStats({ hoursWorked: 0, breaksTaken: 0, status: "Offline" });
        return;
      }

      const { data: profileRow } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
      if (!profileRow?.id) {
        setEmployeeStats({ hoursWorked: 0, breaksTaken: 0, status: "Offline" });
        return;
      }

      const userId = profileRow.id;
      const dayStart = new Date(isoDate + "T00:00:00.000Z");
      const dayEnd = new Date(isoDate + "T23:59:59.999Z");

      const { data: sessions } = await supabase
        .from("work_sessions")
        .select("id, start_time, end_time")
        .eq("user_id", userId)
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString());

      let hoursWorked = 0;
      if (sessions && sessions.length) {
        hoursWorked = sessions.reduce((sum, s) => {
          if (s.end_time) {
            const start = new Date(s.start_time).getTime();
            const end = new Date(s.end_time).getTime();
            return sum + Math.max(0, (end - start) / (1000 * 60 * 60));
          }
          return sum;
        }, 0);
      }

      const { data: breaks } = await supabase
        .from("breaks")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", dayStart.toISOString())
        .lte("created_at", dayEnd.toISOString());

      const breaksTaken = breaks ? breaks.length : 0;

      const { data: openSessions } = await supabase
        .from("work_sessions")
        .select("id")
        .eq("user_id", userId)
        .is("end_time", null)
        .limit(1);

      const status = openSessions && openSessions.length ? "Online" : "Offline";

      setEmployeeStats({ hoursWorked, breaksTaken, status });
    } catch (e) {
      setEmployeeStats({ hoursWorked: 0, breaksTaken: 0, status: "Offline" });
    } finally {
      setEmployeeStatsLoading(false);
    }
  }

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeStatsForDay(selectedEmployee, selectedDay);
    } else {
      setEmployeeStats(null);
    }
  }, [selectedEmployee, selectedDay]);

  const visibleEmployees = employees.filter((e) => e.createdBy === adminLabel);

  useEffect(() => {
    onThemeChange?.(activeTheme);
  }, [activeTheme, onThemeChange]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.employees, employees);
  }, [employees]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.theme, themeId);
  }, [themeId]);

  

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.customTheme, customTheme);
  }, [customTheme]);

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.companyColorsEnabled, companyColorsEnabled);
    onThemeChange?.();
  }, [companyColorsEnabled, onThemeChange]);

  useEffect(() => {
    if (!isCreateOpen && !selectedEmployeeId) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
        setSelectedEmployeeId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen, selectedEmployeeId]);

  function openCreateModal() {
    setCreateEmployeeError("");
    setFormValues(createInitialForm());
    setIsCreateOpen(true);
  }

  // per-employee preference remains in data, but admin toggles are handled globally

  function updateCustomThemeField(field, value) {
    setCustomTheme((previous) => ({
      ...previous,
      vars: {
        ...previous.vars,
        [field]: value,
      },
    }));
  }

  function resetCustomThemeToRemind() {
    setCustomTheme(remindTheme);
    setThemeId("custom");
  }

  async function submitEmployee(event) {
    event.preventDefault();

    if (isCreatingEmployee) return;

    const name = formValues.name.trim();
    const email = formValues.email.trim();
    const password = formValues.password.trim();

    if (!name || !email) {
      setCreateEmployeeError("Naam en e-mail zijn verplicht.");
      return;
    }

    if (!password || password.length < 8) {
      setCreateEmployeeError("Geef een tijdelijk wachtwoord van minstens 8 tekens.");
      return;
    }

    try {
      setIsCreatingEmployee(true);
      setCreateEmployeeError("");

      const response = await fetch("http://localhost:3000/admin/create-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          department: formValues.department.trim() || "Sales",
          use_company_colors: Boolean(companyColorsEnabled),
          created_by: adminLabel,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Account kon niet worden aangemaakt.");
      }

      const nextEmployee = {
        id: payload?.employee?.id || createEmployeeId(),
        authUserId: payload?.employee?.id || null,
        name,
        email,
        department: formValues.department.trim() || "Sales",
        status: "Offline",
        usesCompanyColors: Boolean(companyColorsEnabled),
        mustChangePassword: true,
        adminCreated: true,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        createdBy: adminLabel,
        themeId: companyColorsEnabled ? themeId : DEFAULT_THEME_ID,
      };

      setEmployees((previous) => [nextEmployee, ...previous]);
      setSelectedEmployeeId(nextEmployee.id);
      setIsCreateOpen(false);
      setFormValues(createInitialForm());
    } catch (error) {
      if (error?.message === "Failed to fetch") {
        setCreateEmployeeError("Backend niet bereikbaar. Start de backend en probeer opnieuw.");
      } else {
        setCreateEmployeeError(error?.message || "Account kon niet worden aangemaakt.");
      }
    } finally {
      setIsCreatingEmployee(false);
    }
  }

  function requestRemoveEmployee(employeeId) {
    if (!employeeId) return;
    setDeleteEmployeeError("");
    setDeleteEmployeeId(employeeId);
  }

  function cancelRemoveEmployee() {
    if (isDeletingEmployee) return;
    setDeleteEmployeeId(null);
    setDeleteEmployeeError("");
  }

  async function confirmRemoveEmployee() {
    if (!deleteEmployeeId) return;

    const employeeToDelete = employees.find((employee) => employee.id === deleteEmployeeId);
    if (!employeeToDelete) {
      setDeleteEmployeeId(null);
      return;
    }

    const userId = employeeToDelete.authUserId || employeeToDelete.id;

    if (!userId || typeof userId !== "string" || userId.length < 16) {
      setDeleteEmployeeError("Dit account heeft geen geldige database-ID en kan niet server-side verwijderd worden.");
      return;
    }

    try {
      setIsDeletingEmployee(true);
      setDeleteEmployeeError("");

      const response = await fetch("http://localhost:3000/admin/delete-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Account kon niet verwijderd worden.");
      }

      setEmployees((previous) => previous.filter((employee) => employee.id !== deleteEmployeeId));
      setSelectedEmployeeId((current) => (current === deleteEmployeeId ? null : current));
      setDeleteEmployeeId(null);
    } catch (error) {
      if (error?.message === "Failed to fetch") {
        setDeleteEmployeeError("Backend niet bereikbaar. Start de backend en probeer opnieuw.");
      } else {
        setDeleteEmployeeError(error?.message || "Account kon niet verwijderd worden.");
      }
    } finally {
      setIsDeletingEmployee(false);
    }
  }

  return (
    <main className="company-management-page page" style={themedVariables}>
      <div className="company-management-header">
        <button className="company-management-back icon-action-btn back-btn" type="button" onClick={() => setCurrentPage?.("profile")} aria-label="Terug">
          <BackIcon />
        </button>

        <h1 className="company-management-title">Bedrijfsbeheer</h1>
      </div>

      <div className="company-management-stack">
        <section className="company-management-panel employees-panel">
          <div className="company-management-panel__header company-management-panel__header--employees">
            <div>
              <h2 className="company-management-panel__title">Werknemers</h2>
              <p className="company-management-panel__copy">Klik op een werknemer om hun prestaties en pauzes te bekijken.</p>
            </div>

            <button className="company-management-add" type="button" onClick={openCreateModal}>
              <PlusIcon />
              Werknemer toevoegen
            </button>
          </div>

          <div className="employee-table" role="table" aria-label="Werknemerslijst">
            <div className="employee-table__header" role="row">
              <span role="columnheader">Naam</span>
              <span role="columnheader">E-mail</span>
              <span role="columnheader">Afdeling</span>
              <span role="columnheader">Status</span>
            </div>

            <div className="employee-table__body">
              {visibleEmployees.map((employee) => {
                const employeeStatusMeta = getEmployeeStatusMeta(employee.status, employee.lastSeenAt || employee.createdAt);

                return (
                  <div
                    key={employee.id}
                    className={`employee-row${selectedEmployeeId === employee.id ? " employee-row--selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedEmployeeId(employee.id);
                      }
                    }}
                  >
                    <span className="employee-name">
                      {employee.name}
                    </span>
                    <span>{employee.email}</span>
                    <span>{employee.department}</span>
                    <span>
                      <span
                        className={`employee-status employee-status--${employeeStatusMeta.tone}`}
                      >
                        {employeeStatusMeta.label}
                      </span>
                    </span>
                  </div>
                );
                })}
            </div>
          </div>
        </section>

        <section className="company-management-panel theme-panel">
          <div className="company-management-panel__header">
            <div>
              <h2 className="company-management-panel__title">Bedrijfskleuren</h2>
              <p className="company-management-panel__copy">Kies een voorgesteld palet of stel je eigen kleuren in.</p>
            </div>
          </div>

          <div className="theme-swatches" role="list" aria-label="Bedrijfskleuren">
            {COMPANY_THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`theme-swatch${option.id === themeId ? " theme-swatch--active" : ""}`}
                onClick={() => setThemeId(option.id)}
                aria-pressed={option.id === themeId}
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

            <button
              type="button"
              className={`theme-swatch theme-swatch--custom${themeId === "custom" ? " theme-swatch--active" : ""}`}
              onClick={() => setThemeId("custom")}
              aria-pressed={themeId === "custom"}
            >
              <span className="theme-swatch__swatches" aria-hidden="true">
                {selectedThemePreview.map((color) => (
                  <span key={color} className="theme-swatch__chip" style={{ background: color }} />
                ))}
              </span>
              <span className="theme-swatch__label">Eigen kleuren</span>
              <span className="theme-swatch__description">Stel je eigen bedrijfsstijl samen</span>
            </button>
          </div>

          {themeId === "custom" ? (
            <div className="custom-theme-editor">
              <div className="custom-theme-editor__header">
                <div>
                  <h3 className="custom-theme-editor__title">Eigen kleuren instellen</h3>
                  <p className="company-management-panel__copy">Pas de belangrijkste kleuren aan en bekijk meteen het resultaat.</p>
                </div>

                <button className="company-management-add company-management-reset" type="button" onClick={resetCustomThemeToRemind}>
                  Herstel Re-Mind kleuren
                </button>
              </div>

              <div className="custom-theme-editor__grid">
                {CUSTOM_THEME_FIELDS.map((field) => (
                  <label className="company-field company-field--color" key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="color"
                      value={customTheme.vars[field.key]}
                      onChange={(event) => updateCustomThemeField(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="theme-preview theme-preview--compact">
                <div className="theme-preview__badge">Eigen palet</div>
                <h3 className="theme-preview__title">Eigen kleuren</h3>
                <p className="theme-preview__copy">Deze kleuren vormen het bedrijfspalet en kunnen voor alle gebruikers worden afgedwongen.</p>
                <div className="theme-preview__bars" aria-hidden="true">
                  {selectedThemePreview.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* new-user color default toggle removed; new accounts inherit global company setting */}

          <div className="company-toggle-row">
            <div>
              <h3 className="company-toggle-row__title">Bedrijfskleuren actief voor alle gebruikers</h3>
              <p className="company-management-panel__copy">Wanneer deze toggle aan staat, worden de bedrijfskleuren voor alle gebruikers afgedwongen. Wanneer uit, kunnen werknemers zelf kiezen in hun instellingen.</p>
            </div>

            <button
              className={`toggle-switch ${companyColorsEnabled ? "active" : ""}`}
              onClick={() => setCompanyColorsEnabled((previous) => !previous)}
              type="button"
              role="switch"
              aria-checked={companyColorsEnabled}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </section>
      </div>

      {isCreateOpen ? (
        <div className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-create-title" onMouseDown={() => setIsCreateOpen(false)}>
          <div className="company-modal__card" onMouseDown={(event) => event.stopPropagation()}>
            <button className="company-modal__close icon-remove-btn" type="button" onClick={() => setIsCreateOpen(false)} aria-label="Sluiten">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>

            <h2 id="company-create-title" className="company-modal__title">Nieuw werknemersaccount</h2>

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
              </div>

              <label className="company-field">
                <span>Wachtwoord (tijdelijk)</span>
                <input
                  type="password"
                  value={formValues.password}
                  onChange={(event) => setFormValues((previous) => ({ ...previous, password: event.target.value }))}
                  placeholder="Stel een tijdelijk wachtwoord in"
                />
              </label>

              {createEmployeeError ? <p className="company-form__error">{createEmployeeError}</p> : null}

              <div className="company-modal__actions">
                <button className="company-modal__primary" type="submit" disabled={isCreatingEmployee}>
                  {isCreatingEmployee ? "Account aanmaken..." : "Account aanmaken"}
                </button>
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
            <button className="company-modal__close icon-remove-btn" type="button" onClick={() => setSelectedEmployeeId(null)} aria-label="Sluiten">
              <img src={closeIcon} alt="" aria-hidden="true" />
            </button>

            {(() => {
              const selectedEmployeeStatusMeta = getEmployeeStatusMeta(
                employeeStats?.status || selectedEmployee.status,
                selectedEmployee.lastSeenAt || selectedEmployee.createdAt,
              );

              return (
                <div className="company-stats__header">
                  <div>
                    <h2 id="company-stats-title" className="company-modal__title">{selectedEmployee.name}</h2>
                    <p className="company-modal__copy company-modal__copy--stats">
                      <span>{selectedEmployee.email}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedEmployee.department}</span>
                      <span
                        className={`company-stats__status company-stats__status--${selectedEmployeeStatusMeta.tone}`}
                      >
                        {selectedEmployeeStatusMeta.label}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}
            <div className="company-stats-controls">
              <label className="company-field company-field--inline">
                <span>Dag</span>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                />
              </label>
            </div>

            <div className="company-stats-grid">
              <article className="company-stat-card">
                <span className="company-stat-card__label">Uren gewerkt</span>
                <strong className="company-stat-card__value">
                  {employeeStatsLoading ? "--" : `${(employeeStats?.hoursWorked || 0).toFixed((employeeStats?.hoursWorked || 0) % 1 === 0 ? 0 : 1)} uur`}
                </strong>
                <span className="company-stat-card__meta">Voor {new Date(selectedDay).toLocaleDateString("nl-NL")}</span>
              </article>

              <article className="company-stat-card">
                <span className="company-stat-card__label">Pauzes genomen</span>
                <strong className="company-stat-card__value">{employeeStatsLoading ? "--" : (employeeStats?.breaksTaken || 0)}</strong>
                <span className="company-stat-card__meta">Op {new Date(selectedDay).toLocaleDateString("nl-NL")}</span>
              </article>
            </div>

            <div className="company-modal__actions company-modal__actions--stats">
              <button
                className="company-modal__danger"
                type="button"
                onClick={() => requestRemoveEmployee(selectedEmployee.id)}
              >
                Verwijder account
              </button>
            </div>

          </div>
        </div>
      ) : null}

      {deleteEmployeeId ? (
        <div className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-delete-title" onMouseDown={cancelRemoveEmployee}>
          <div className="company-modal__card company-modal__card--confirm" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="company-delete-title" className="company-modal__title">Account verwijderen?</h2>
            <p className="company-modal__copy">Deze actie kan niet ongedaan gemaakt worden. Wil je dit werknemersaccount echt verwijderen?</p>

            <div className="company-modal__actions company-modal__actions--confirm">
              <button className="company-modal__danger" type="button" onClick={confirmRemoveEmployee} disabled={isDeletingEmployee}>
                {isDeletingEmployee ? "Verwijderen..." : "Ja, verwijder"}
              </button>
              <button className="company-modal__secondary" type="button" onClick={cancelRemoveEmployee} disabled={isDeletingEmployee}>
                Annuleer
              </button>
            </div>

            {deleteEmployeeError ? <p className="company-form__error">{deleteEmployeeError}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}