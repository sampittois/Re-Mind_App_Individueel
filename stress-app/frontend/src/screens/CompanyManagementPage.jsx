import { useEffect, useState } from "react";
import { BackIcon, PlusIcon } from "../components/IconActions";
import closeIcon from "../assets/x.svg";
import "../styles/companyManagement.css";
import { supabase } from "../lib/supabaseClient";

export const COMPANY_THEME_OPTIONS = [
  {
    id: "sage",
    name: "Re-Mind",
    description: "Standaard Re-Mind stijl",
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
];

export const STORAGE_KEYS = {
  employees: "remind:company-employees",
  theme: "remind:company-theme",
  customTheme: "remind:company-custom-theme",
  companyColorsEnabled: "remind:company-colors-enabled",
};

export function getScopedStorageKeys(scopeId) {
  if (!scopeId) {
    return STORAGE_KEYS;
  }

  return {
    employees: `${STORAGE_KEYS.employees}:${scopeId}`,
    theme: `${STORAGE_KEYS.theme}:${scopeId}`,
    customTheme: `${STORAGE_KEYS.customTheme}:${scopeId}`,
    companyColorsEnabled: `${STORAGE_KEYS.companyColorsEnabled}:${scopeId}`,
  };
}

export const DEFAULT_THEME_ID = "custom";

export const DEFAULT_CUSTOM_THEME = {
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
};

const MISSING_STORAGE_VALUE = Symbol("missing-storage-value");

function readStoredValueWithLegacy(scopeId, scopedKey, legacyKey, fallback) {
  const scopedValue = readStoredValue(scopedKey, MISSING_STORAGE_VALUE);
  if (scopedValue !== MISSING_STORAGE_VALUE) {
    return scopedValue;
  }

  // For scoped manager/employee accounts, do not fall back to legacy global keys.
  // This prevents another account's saved palette from leaking into this account.
  if (scopeId) {
    return fallback;
  }

  return readStoredValue(legacyKey, fallback);
}

const CUSTOM_THEME_FIELDS = [
  { key: "background", label: "Achtergrond" },
  { key: "backgroundDark", label: "Achtergrond (donker)" },
  { key: "text", label: "Tekst" },
  { key: "textLight", label: "Tekst (licht)" },
  { key: "border", label: "Rand" },
  { key: "primary", label: "Hoofdkleur" },
  { key: "primaryDark", label: "Donkere accentkleur" },
  { key: "highlight", label: "Highlight" },
  { key: "highlightDark", label: "Highlight (donker)" },
  { key: "highlightLight", label: "Highlight (licht)" },
  { key: "highlightHover", label: "Highlight (hover)" },
  { key: "success", label: "Succes" },
  { key: "warning", label: "Waarschuwing" },
  { key: "warningLight", label: "Waarschuwing (licht)" },
  { key: "error", label: "Fout" },
  { key: "errorDark", label: "Fout (donker)" },
  { key: "info", label: "Info" },
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

export default function CompanyManagementPage({ profile, setCurrentPage, onThemeChange, onApplyColors, themeScopeId = null }) {
  const storageKeys = getScopedStorageKeys(themeScopeId);
  const [employees, setEmployees] = useState([]);
  const [themeId, setThemeId] = useState(() => readStoredValueWithLegacy(themeScopeId, storageKeys.theme, STORAGE_KEYS.theme, DEFAULT_THEME_ID));
  const [customTheme, setCustomTheme] = useState(() => normalizeCustomTheme(readStoredValueWithLegacy(themeScopeId, storageKeys.customTheme, STORAGE_KEYS.customTheme, DEFAULT_CUSTOM_THEME)));
  const [companyColorsEnabled, setCompanyColorsEnabled] = useState(() => readStoredValueWithLegacy(themeScopeId, storageKeys.companyColorsEnabled, STORAGE_KEYS.companyColorsEnabled, true));
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [formValues, setFormValues] = useState(createInitialForm());
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [createEmployeeError, setCreateEmployeeError] = useState("");
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [deleteEmployeeError, setDeleteEmployeeError] = useState("");
  const [colorApplyMessage, setColorApplyMessage] = useState("");
  const [employeesLoaded, setEmployeesLoaded] = useState(false);

  const activeTheme = customTheme;
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) || null;
  const adminLabel = profile?.full_name || profile?.first_name || profile?.email || "Bedrijfsbeheerder";
  const adminOwnerKey = profile?.id || adminLabel;
  const themedVariables = buildThemeVariables(activeTheme);
  const selectedThemePreview = themeToPreview(activeTheme);

  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [employeeStats, setEmployeeStats] = useState(null);
  const [employeeStatsLoading, setEmployeeStatsLoading] = useState(false);
  const remindTheme = normalizeCustomTheme(DEFAULT_CUSTOM_THEME);

  useEffect(() => {
    setEmployeesLoaded(false);
    const companyId = profile?.company_id || themeScopeId || null;
    const managerId = profile?.id || null;

    if (!companyId) {
      setEmployees([]);
      setEmployeesLoaded(true);
      return undefined;
    }

    let cancelled = false;

    async function loadEmployeesFromServer() {
      try {
        const query = new URLSearchParams({ company_id: companyId });
        if (managerId) {
          query.set("manager_id", managerId);
        }

        const response = await fetch(`http://localhost:3000/admin/employees?${query.toString()}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Werknemers konden niet geladen worden.");
        }

        if (cancelled) {
          return;
        }

        const normalizedEmployees = Array.isArray(payload?.employees)
          ? payload.employees.map((employee) => ({
            ...employee,
            createdBy: employee?.createdBy || managerId || adminOwnerKey,
          }))
          : [];

        setEmployees(normalizedEmployees);
      } catch {
        setEmployees([]);
      }
      finally {
        if (!cancelled) {
          setEmployeesLoaded(true);
        }
      }
    }

    loadEmployeesFromServer();

    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, profile?.id, themeScopeId, adminOwnerKey]);

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

  const visibleEmployees = employees;

  useEffect(() => {
    writeStoredValue(storageKeys.theme, themeId);
  }, [themeId, storageKeys.theme]);

  useEffect(() => {
    if (themeId !== "custom") {
      setThemeId("custom");
    }
  }, [themeId]);

  

  useEffect(() => {
    writeStoredValue(storageKeys.companyColorsEnabled, companyColorsEnabled);
    onThemeChange?.({ companyColorsEnabled });
  }, [companyColorsEnabled, onThemeChange, storageKeys.companyColorsEnabled]);

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
    setColorApplyMessage("");
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
    setColorApplyMessage("");
  }

  async function applyColorsToApp() {
    /* Company color editing reset:
    const nextTheme = normalizeCustomTheme(customTheme);
    setCustomTheme(nextTheme);
    setThemeId("custom");
    writeStoredValue(storageKeys.theme, "custom");
    writeStoredValue(storageKeys.customTheme, nextTheme);

    // Persist the theme to the server so employees on other devices can read it.
    let didPersistTheme = true;
    try {
      if (profile && profile.id) {
        const { error } = await supabase
          .from("profiles")
          .upsert({ id: profile.id, company_theme: nextTheme }, { onConflict: "id" });

        if (error) {
          console.error("Failed to persist company theme:", error);
          didPersistTheme = false;
        }
      }
    } catch (e) {
      console.error("Failed to persist company theme:", e);
      didPersistTheme = false;
    }

    const didPersistProfileToggle = await onApplyColors?.({
      theme: nextTheme,
      companyColorsEnabled,
    });
    if (didPersistProfileToggle === false || didPersistTheme === false) {
      setColorApplyMessage("Kleuren lokaal toegepast, maar niet volledig opgeslagen. Probeer opnieuw.");
      onThemeChange?.(nextTheme);
      return;
    }

    onThemeChange?.(nextTheme);
    setColorApplyMessage("Kleuren toegepast op de app en opgeslagen.");
    */
    setColorApplyMessage("Kleurenfunctionaliteit staat voorlopig uit.");
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

    const managerId = profile?.id || null;
    const companyId = profile?.company_id || themeScopeId || null;

    if (!managerId || !companyId) {
      setCreateEmployeeError("Manager- of bedrijfsgegevens zijn nog niet geladen. Probeer binnen enkele seconden opnieuw.");
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
          created_by: managerId,
          company_id: companyId,
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
        createdBy: managerId,
        companyId,
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
    <main className="company-management-page page">
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
              {!employeesLoaded ? (
                <div className="employee-table__empty-state" aria-live="polite">
                  <span className="employee-table__empty-state-title">Werknemers laden...</span>
                </div>
              ) : visibleEmployees.length ? visibleEmployees.map((employee) => {
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
                }) : (
                <div className="employee-table__empty-state" aria-live="polite">
                  <span className="employee-table__empty-state-title">Geen werknemers toegevoegd</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="company-management-panel theme-panel">
          <div className="company-management-panel__header">
            <div>
              <h2 className="company-management-panel__title">Bedrijfskleuren</h2>
              <p className="company-management-panel__copy">Klik om de kleuren aan te passen.</p>
            </div>
          </div>

          <div className="custom-theme-editor">
            <div className="custom-theme-editor__header">
              <div>
                <h3 className="custom-theme-editor__title">Re-Mind kleuren</h3>
                <p className="company-management-panel__copy">Alle Re-Mind kleuren zijn hier aanpasbaar voor jouw organisatie.</p>
              </div>

              <div className="custom-theme-editor__actions">
                <button className="company-management-add company-management-reset" type="button" onClick={resetCustomThemeToRemind}>
                  Herstel Re-Mind kleuren
                </button>
                <button className="company-management-add" type="button" onClick={applyColorsToApp}>
                  Toepassen
                </button>
              </div>
            </div>

            {colorApplyMessage ? <p className="company-management-panel__copy">{colorApplyMessage}</p> : null}

            <div className="theme-color-grid" role="list" aria-label="Re-Mind kleuren">
              {CUSTOM_THEME_FIELDS.map((field) => (
                <label className="theme-color-tile" key={field.key} title={field.label}>
                  <input
                    type="color"
                    value={customTheme.vars[field.key]}
                    onChange={(event) => updateCustomThemeField(field.key, event.target.value)}
                    aria-label={field.label}
                  />
                  <span className="theme-color-tile__label">{field.label}</span>
                </label>
              ))}
            </div>

            <div className="theme-preview theme-preview--compact">
              <div className="theme-preview__badge">Voorbeeld</div>
              <h3 className="theme-preview__title">Huidige bedrijfskleuren</h3>
              <p className="theme-preview__copy">Dit palet wordt gebruikt wanneer bedrijfskleuren actief zijn.</p>
              <div className="theme-preview__bars" aria-hidden="true">
                {selectedThemePreview.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
            </div>
          </div>

          {/* new-user color default toggle removed; new accounts inherit global company setting */}

          <div className="company-toggle-row">
            <div>
              <h3 className="company-toggle-row__title">Bedrijfskleuren voor accounts die jij maakte</h3>
              <p className="company-management-panel__copy">Wanneer deze toggle aan staat, worden jouw bedrijfskleuren afgedwongen voor alle accounts die je hebt aangemaakt. Jouw eigen account gebruikt de toggle in je profielinstellingen.</p>
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