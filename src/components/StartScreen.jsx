import React, { useState, useEffect, useRef } from "react";

const StartScreen = ({
  onSubmit,
  onBack,
  loginError = "",
  isLoggingIn = false,
}) => {
  const [institute_email, setInstituteEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError("Please enter both email and master password.");
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
            Email and Master Password
          </strong>{" "}
          Only registered users can continue.
        </div>

        <div className="input-group">
          <div className="input-label">// Email</div>
          <input
            ref={emailRef}
            type="email"
            className="key-input"
            placeholder="Enter your registered email..."
            autoComplete="off"
            spellCheck="false"
            value={institute_email}
            onChange={handleEmailChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="input-group">
          <div className="input-label">// Master Password</div>
          <input
            ref={passwordRef}
            type="password"
            className="key-input"
            placeholder="Enter master password..."
            autoComplete="off"
            spellCheck="false"
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
          />
          <div className="input-hint">
            # Same master password for all participants
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

      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: ".75rem",
          color: "var(--text-dim)",
          textAlign: "center",
          lineHeight: "1.8",
          maxWidth: "460px",
        }}
      >
        &gt; <span style={{ color: "var(--teal)" }}>DEMO MODE</span>: Type any
        key to explore the map
        <br />
        &gt; In the actual event, the key will be provided by the team
        <br />
        &gt; Each subsequent key = output of your previous solution
      </div>
    </>
  );
};

export default StartScreen;
