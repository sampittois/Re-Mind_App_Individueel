import "../styles/navbar.css";
import logo from "../assets/logo_primary.png";

export default function Navbar({ currentPage, setCurrentPage, avatar, onOpenReflection, profile }) {
  return (
    <header className="nav">
      <div className="navInner">
        <div className="brand">
          <img src={logo} alt="Re:Mind" className="brandLogo" />
        </div>

        <div className="navRight">
          <nav className="links">
            <button
              className={`link ${currentPage === "home" ? "active" : ""}`}
              onClick={() => setCurrentPage("home")}
              type="button"
            >
              Home
            </button>

            <button
              className={`link ${currentPage === "reports" ? "active" : ""}`}
              onClick={() => setCurrentPage("reports")}
              type="button"
            >
              Rapporten
            </button>

            <button
              className={`link ${currentPage === "pause" ? "active" : ""}`}
              onClick={() => setCurrentPage("pause")}
              type="button"
            >
              Pauzesuggesties
            </button>
          </nav>

          <button className="link" type="button" onClick={onOpenReflection} aria-label="Werkdagreflectie openen">
            To-do
          </button>

          <button
            className={`profile ${currentPage === "profile" ? "active" : ""}`}
            aria-label="Profiel"
            type="button"
            onClick={() => setCurrentPage("profile")}
          >
            {avatar ? (
              <img src={avatar} alt="Profiel" className="profile-avatar" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
          </button>

          {profile?.plan === "admin" ? (
            <button
              className={`link ${currentPage === "admin" ? "active" : ""}`}
              onClick={() => setCurrentPage("admin")}
              type="button"
            >
              Admin
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
