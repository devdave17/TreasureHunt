import React, { useState, useEffect, useRef } from "react";

const StartScreen = ({
  onSubmit,
  onBack,
  loginError = "",
  isLoggingIn = false,
}) => {
  const [institute_email, setInstituteEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 300);
  }, []);

  const handleSubmit = () => {
    const trimmedEmail = institute_email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both institute email and password.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    onSubmit(trimmedEmail, trimmedPassword);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleEmailChange = (e) => {
    setInstituteEmail(e.target.value);
    setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError("");
  };

  return (
    <>
      <div className="panel anim-reveal">
        <div className="panel-title">🔐 &nbsp;Player Login</div>
        <div className="panel-sub">
          Login with your registered{" "}
          <strong style={{ color: "var(--gold)" }}>
            Institute Email and Password
          </strong>{" "}
          Only registered users can continue.
        </div>

        <div className="input-group">
          <div className="input-label">Institute Email</div>
          <input
            ref={emailRef}
            type="email"
            className="key-input"
            placeholder="Enter your institute email..."
            autoComplete="off"
            spellCheck="false"
            value={institute_email}
            onChange={handleEmailChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="input-group">
          <div className="input-label">Password</div>
          <div className="password-field">
            <input
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              className="key-input key-input--with-toggle"
              placeholder="Enter password..."
              autoComplete="off"
              spellCheck="false"
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="password-toggle-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.35 1.83l2.92 2.92A11.81 11.81 0 0 0 23 12c-1.73-4.39-5.99-7.5-11-7.5-1.4 0-2.73.24-3.96.69l2.16 2.16C10.78 7.13 11.38 7 12 7m-9.19-4.31L1.39 4.11l3.04 3.04.61.61A11.8 11.8 0 0 0 1 12c1.73 4.39 5.99 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.57.57 1.42 1.42 1.41-1.41zM7.53 10.36l1.55 1.55A2.5 2.5 0 0 0 12 14.92l1.55 1.55c-.47.2-1 .33-1.55.33a5 5 0 0 1-5-5c0-.56.12-1.08.33-1.54"
                  />
                </svg>
              ) : (
                <svg
                  className="password-toggle-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="error-msg">{error || loginError}</div>

        <div className="btn-group" style={{ marginTop: ".5rem" }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={isLoggingIn}>
            {isLoggingIn ? "⏳ Logging in..." : "Login →"}
          </button>
          <button className="btn-secondary" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      <div className="divider"></div>
    </>
  );
};

export default StartScreen;
