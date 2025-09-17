import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import GlobalSearch from "./GlobalSearch.jsx";
import {
  isLoggedIn,
  login,
  registerWithUsername,
  logout,
  getUser,
} from "../lib/auth.js";

export default function Navbar() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [logged, setLogged] = useState(isLoggedIn());
  const [user, setUser] = useState(getUser());
  const [showReg, setShowReg] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const loginWrapRef = React.useRef(null);
  const regWrapRef = React.useRef(null);

  // Validation functions
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    return password.length >= 6 && /[A-Z]/.test(password);
  }

  function validateUsername(username) {
    return username.length >= 3 && username.length <= 20;
  }

  async function onLogin(kind) {
    // Client-side validation
    if (kind === "register") {
      if (!validateUsername(username)) {
        setAuthMsg("Username must be 3-20 characters long");
        return;
      }
      if (!validateEmail(email)) {
        setAuthMsg("Please enter a valid email address");
        return;
      }
      if (!validatePassword(password)) {
        setAuthMsg(
          "Password must be at least 6 characters long and contain at least one uppercase letter"
        );
        return;
      }
    } else {
      if (!validateEmail(email)) {
        setAuthMsg("Please enter a valid email address");
        return;
      }
      if (!validatePassword(password)) {
        setAuthMsg(
          "Password must be at least 6 characters long and contain at least one uppercase letter"
        );
        return;
      }
    }

    setAuthMsg("...");
    const res =
      kind === "register"
        ? await registerWithUsername(username, email, password)
        : await login(email, password);
    if (res.ok) {
      setAuthMsg(kind === "register" ? "Registered" : "Logged in");
      setLogged(true);
      setUser(res.user || getUser());
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {}
      }, 30);
    } else {
      setAuthMsg(res.message || "Failed");
    }
  }

  React.useEffect(() => {
    function onDoc(e) {
      if (
        showLogin &&
        loginWrapRef.current &&
        !loginWrapRef.current.contains(e.target)
      )
        setShowLogin(false);
      if (
        showReg &&
        regWrapRef.current &&
        !regWrapRef.current.contains(e.target)
      )
        setShowReg(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setShowLogin(false);
        setShowReg(false);
      }
    }
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
    };
  }, [showLogin, showReg]);

  React.useEffect(() => {
    setShowLogin(false);
    setShowReg(false);
  }, [location.pathname]);

  return (
    <header className="nav">
      <div className="w-full px-3 md:px-4 min-h-[56px] py-1.5 flex flex-wrap items-center gap-2 sm:gap-2.5 md:gap-3">
        <div className="order-1 flex items-center gap-3 shrink-0">
          <NavLink
            to="/"
            className="flex items-center font-display text-base sm:text-lg md:text-xl group transition duration-150 hover:scale-[1.05]"
          >
            <img
              src="/favicon.ico"
              alt="FantasyLab"
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg transition duration-150 group-hover:brightness-150"
            />
            <span className="transition font-semibold bg-gradient-to-r from-[#7c5cff] via-[#00D5C4] to-[#eaeaea] bg-clip-text text-transparent pr-2 sm:pr-3 group-hover:brightness-110 group-hover:drop-shadow-[0_0_10px_#00d5c4aa]">
              FantasyLab
            </span>
          </NavLink>
          <div className="flex items-center gap-3">
            <Tab to="/fixtures" label="Fixtures" />
            <Tab to="/squad" label="Squad" />
          </div>
        </div>

        <div className="order-2 lg:order-3 ml-auto flex items-center gap-3">
          {logged ? (
            <div className="flex items-center gap-3">
              <span
                className="w-[60px] sm:w-[100px] md:w-[130px] truncate select-none text-base sm:text-lg md:text-xl font-extrabold tracking-wide bg-gradient-to-r from-[#00E7D7] via-[#00D5C4] to-[#00b3a8] bg-clip-text text-transparent drop-shadow-[0_0_18px_#00D5C4bb] transition-transform duration-150 hover:scale-[1.2] pr-2 sm:pr-3 flex items-center justify-center text-center hover:from-[#7c5cff] hover:via-[#00D5C4] hover:to-[#eaeaea]"
                title={user?.email || user?.username || "Account"}
              >
                {user?.username || user?.email || "Signed in"}
              </span>
              <button
                className="tab-pill nav-auth-btn inline-block no-underline px-2 sm:px-3 py-1.5 sm:py-2 relative rounded-xl transition duration-150 text-white/85 hover:text-white hover:bg-[#37003c] hover:scale-[1.05] sm:hover:scale-[1.06] md:hover:scale-[1.08] hover:shadow-[0_0_18px_#7c5cff55]"
                onClick={() => {
                  logout();
                  window.location.reload();
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative" ref={loginWrapRef}>
                <button
                  className="tab-pill nav-auth-btn inline-block no-underline px-2 sm:px-3 py-1.5 sm:py-2 relative rounded-xl transition duration-150 text-white/85 hover:text-white hover:bg-[#37003c] hover:scale-[1.05] sm:hover:scale-[1.06] md:hover:scale-[1.08] hover:shadow-[0_0_18px_#7c5cff55]"
                  onClick={() => {
                    setShowLogin((s) => !s);
                    setShowReg(false);
                  }}
                >
                  Login
                </button>
                {showLogin && (
                  <div className="dropdown-panel">
                    <div className="mb-2 font-semibold">Sign in</div>
                    <div className="flex flex-col gap-2">
                      <input
                        className="field h-9 text-sm"
                        placeholder="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        className="field h-9 text-sm"
                        placeholder="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        className="btn h-8"
                        onClick={() => onLogin("login")}
                      >
                        Login
                      </button>
                      <span className="text-xs text-base-300">{authMsg}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={regWrapRef}>
                <button
                  className="tab-pill nav-auth-btn inline-block no-underline px-2 sm:px-3 py-1.5 sm:py-2 relative rounded-xl transition duration-150 text-white/85 hover:text-white hover:bg-[#37003c] hover:scale-[1.05] sm:hover:scale-[1.06] md:hover:scale-[1.08] hover:shadow-[0_0_18px_#7c5cff55]"
                  onClick={() => {
                    setShowReg((s) => !s);
                    setShowLogin(false);
                  }}
                >
                  Register
                </button>
                {showReg && (
                  <div className="dropdown-panel">
                    <div className="mb-2 font-semibold">Create account</div>
                    <div className="flex flex-col gap-2">
                      <input
                        className="field h-9 text-sm"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <input
                        className="field h-9 text-sm"
                        placeholder="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        className="field h-9 text-sm"
                        placeholder="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        className="btn h-8"
                        onClick={() => onLogin("register")}
                      >
                        Register
                      </button>
                      <span className="text-xs text-base-300">{authMsg}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <a
            href="https://github.com/your-org/fantasylab"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex no-underline px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base md:text-lg relative rounded-xl transition duration-150 text-white/85 hover:text-white hover:bg-[#37003c] hover:scale-[1.05] sm:hover:scale-[1.06] md:hover:scale-[1.08] hover:shadow-[0_0_18px_#7c5cff55] group"
            title="GitHub"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="transition group-hover:scale-110"
            >
              <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.24c-3.34.72-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.23-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.9 1.23 3.22 0 4.62-2.81 5.64-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>
        </div>

        <div className="order-3 lg:order-2 flex-1 basis-[280px] lg:basis-[380px] min-w-[220px] w-full flex justify-center search-under">
          <div className="w-full max-w-[560px]">
            <GlobalSearchWrapper>
              <GlobalSearch />
            </GlobalSearchWrapper>
          </div>
        </div>
      </div>
    </header>
  );
}

function Tab({ to, label }) {
  return (
    <NavLink to={to} end={to === "/"}>
      {({ isActive }) => (
        <span
          className={[
            "tab-pill inline-block no-underline px-2 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base md:text-lg relative rounded-xl transition duration-150 text-white/85 hover:text-white hover:bg-[#37003c] hover:scale-[1.05] sm:hover:scale-[1.06] md:hover:scale-[1.08] hover:shadow-[0_0_18px_#7c5cff55]",
            isActive ? "bg-white/10 text-white" : "",
          ].join(" ")}
        >
          {label}
          {isActive && (
            <span className="tab-underline pointer-events-none absolute left-2 right-2 bottom-1.5 h-[3px] rounded bg-[#00D5C4] shadow-[0_0_16px_#00D5C4]" />
          )}
        </span>
      )}
    </NavLink>
  );
}

function GlobalSearchWrapper({ children }) {
  return (
    <div className="relative w-full flex justify-center">
      <div className="rounded-lg bg-transparent shadow-none px-0 py-0 flex items-center w-full">
        {children}
      </div>
    </div>
  );
}
