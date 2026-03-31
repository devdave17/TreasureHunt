import React, { useState, useEffect, useRef } from "react";

const StartScreen = ({ onSubmit, onBack }) => {
  const [institute_email, setInstituteEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const emailRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 300);
    spawnConfetti();

    return () => {
      // Clean up confetti when component unmounts
      document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
    };
  }, []);

  const spawnConfetti = () => {
    const colors = [
      "#f5c842",
      "#00e5c8",
      "#ff4a4a",
      "#39ff14",
      "#ffffff",
      "#ffa500",
    ];
    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        --d: ${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay: ${(Math.random() * 2).toFixed(1)}s;
      `;
      document.body.appendChild(confetti);
    }
  };

  const handleSubmit = () => {
    const trimmedInstituteEmail = institute_email.trim();
    const trimmedName = name.trim().toUpperCase();
    if (!trimmedInstituteEmail || !trimmedName) {
      setError("Please enter both institute email and name.");
      return;
    }
    if (!trimmedInstituteEmail.includes("@")) {
      setError("Please enter a valid institute email.");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Please enter a valid name.");
      return;
    }
    onSubmit(trimmedInstituteEmail, trimmedName);
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

  const handleNameChange = (e) => {
    setName(e.target.value);
    setError("");
  };

  return (
    <>
      <div className="panel anim-reveal">
        <div className="panel-title">🗝️ &nbsp;Enter Your Starting Key</div>
        <div className="panel-sub">
          Enter Your{" "}
          <strong style={{ color: "var(--gold)" }}>
            Institute Email and Name
          </strong>{" "}
          Enter it below to unlock your first riddle and begin the treasure
          hunt.
        </div>

        <div className="input-group">
          <div className="input-label">// Institute Email</div>
          <input
            ref={emailRef}
            type="email"
            className="key-input"
            placeholder="Enter institute email here..."
            autoComplete="off"
            spellCheck="false"
            value={institute_email}
            onChange={handleEmailChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="input-group">
          <div className="input-label">// Your Name</div>
          <input
            ref={nameRef}
            type="text"
            className="key-input"
            placeholder="Enter name here..."
            autoComplete="off"
            spellCheck="false"
            value={name}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
          />
          <div className="input-hint">
            # Key will be displayed on screen or handed physically by event
            staff
          </div>
        </div>
        <div className="error-msg">{error}</div>

        <div className="btn-group" style={{ marginTop: ".5rem" }}>
          <button className="btn-primary" onClick={handleSubmit}>
            🔓 &nbsp;Unlock Map
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
