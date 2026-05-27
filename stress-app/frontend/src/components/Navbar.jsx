import { useEffect, useRef, useState } from "react";
import "../styles/navbar.css";
import logo from "../assets/logo_primary.png";
import menuIcon from "../assets/menu.svg";

export default function Navbar({ currentPage, setCurrentPage, avatar, onOpenReflection, profile }) {
  const navInnerRef = useRef(null);
  const brandRef = useRef(null);
  const navRightRef = useRef(null);
  const menuToggleRef = useRef(null);
  const linksMeasureRef = useRef(null);
  const todoMeasureRef = useRef(null);

  const [isCompact, setIsCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateCompactNav = () => {
      if (!navInnerRef.current || !brandRef.current || !navRightRef.current || !linksMeasureRef.current || !todoMeasureRef.current) {
        return;
      }

      const innerWidth = navInnerRef.current.clientWidth;
      const brandWidth = brandRef.current.offsetWidth;
      const profileWidth = navRightRef.current.querySelector(".profile")?.offsetWidth || 0;
      const linksWidth = linksMeasureRef.current.scrollWidth;
      const todoWidth = todoMeasureRef.current.scrollWidth;
      const estimatedGap = 28;
      const requiredWidth = brandWidth + linksWidth + todoWidth + profileWidth + estimatedGap * 4;

      setIsCompact(requiredWidth > innerWidth);
    };

    updateCompactNav();

    const resizeObserver = new ResizeObserver(updateCompactNav);

    if (navInnerRef.current) {
      resizeObserver.observe(navInnerRef.current);
    }
    if (brandRef.current) {
      resizeObserver.observe(brandRef.current);
    }
    if (navRightRef.current) {
      resizeObserver.observe(navRightRef.current);
    }

    window.addEventListener("resize", updateCompactNav);

    return () => {
      window.removeEventListener("resize", updateCompactNav);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isCompact && menuOpen) {
      setMenuOpen(false);
    }
  }, [isCompact, menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleOutsideClick = (event) => {
      const toggleEl = menuToggleRef.current;
      const navEl = navRightRef.current;
      if (!toggleEl || !navEl) {
        return;
      }

      if (!toggleEl.contains(event.target) && !navEl.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  const handleNavClick = (page) => {
    setCurrentPage(page);
    setMenuOpen(false);
  };

  const handleReflectionClick = () => {
    onOpenReflection();
    setMenuOpen(false);
  };

  return (
    <header className="nav">
      <div className="navInner" ref={navInnerRef}>
        <div className="brand" ref={brandRef}>
          <img src={logo} alt="Re:Mind" className="brandLogo" />
        </div>

        <div className="linksMeasure" ref={linksMeasureRef} aria-hidden="true">
          {profile?.plan === "admin" ? <span>Admin</span> : null}
          <span>Home</span>
          <span>Rapporten</span>
          <span>Pauzesuggesties</span>
        </div>
        <div className="todoMeasure" ref={todoMeasureRef} aria-hidden="true">
          <span>To-do</span>
        </div>

        <div className="navRight" ref={navRightRef}>
          <nav className={`links ${isCompact ? "compact" : ""} ${menuOpen ? "open" : ""}`}>
            {profile?.plan === "admin" ? (
              <button
                className={`link ${currentPage === "admin" ? "active" : ""}`}
                onClick={() => handleNavClick("admin")}
                type="button"
              >
                Admin
              </button>
            ) : null}

            <button
              className={`link ${currentPage === "home" ? "active" : ""}`}
              onClick={() => handleNavClick("home")}
              type="button"
            >
              Home
            </button>

            <button
              className={`link ${currentPage === "reports" ? "active" : ""}`}
              onClick={() => handleNavClick("reports")}
              type="button"
            >
              Rapporten
            </button>

            <button
              className={`link ${currentPage === "pause" ? "active" : ""}`}
              onClick={() => handleNavClick("pause")}
              type="button"
            >
              Pauzesuggesties
            </button>

            {isCompact ? (
              <button className="link" type="button" onClick={handleReflectionClick} aria-label="Werkdagreflectie openen">
                To-do
              </button>
            ) : null}
          </nav>

          {!isCompact ? (
            <button className="link" type="button" onClick={handleReflectionClick} aria-label="Werkdagreflectie openen">
              To-do
            </button>
          ) : null}

          {isCompact ? (
            <button
              ref={menuToggleRef}
              className={`burger ${menuOpen ? "open" : ""}`}
              type="button"
              aria-label="Navigatiemenu openen"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span
                className="burgerIcon"
                aria-hidden="true"
                style={{
                  WebkitMaskImage: `url(${menuIcon})`,
                  maskImage: `url(${menuIcon})`,
                }}
              ></span>
            </button>
          ) : null}

          <button
            className={`profile ${currentPage === "profile" ? "active" : ""}`}
            aria-label="Profiel"
            type="button"
            onClick={() => handleNavClick("profile")}
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
        </div>
      </div>
    </header>
  );
}
