import React, { useState, useEffect, useRef } from "react";

const RiddleScreen = ({ riddle, onSubmit, onBack, isSolved }) => {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);

    // Remove any existing confetti when entering riddle screen
    document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
  }, [riddle]);

  const handleSubmit = () => {
    const trimmedKey = key.trim().toUpperCase();
    if (trimmedKey.length < 2) {
      setError("Please enter your program's output key.");
      return;
    }
    setKey("");
    onSubmit(trimmedKey);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleInputChange = (e) => {
    setKey(e.target.value);
    setError("");
  };

  if (!riddle) return null;

  return (
    <>
      <div className="riddle-header">
        <div className="riddle-stage">
          {isSolved ? riddle.stage + " ✓ SOLVED" : riddle.stage}
        </div>
        <div className="riddle-title">{riddle.title}</div>
      </div>

      <div className="riddle-scroll anim-reveal">
        <div className="riddle-icon">{isSolved ? "✅" : riddle.icon}</div>
        <div className="riddle-text">{riddle.riddle}</div>
      </div>

      <div className="riddle-problem">
        <div className="riddle-problem-label">// Problem Statement</div>
        <div className="riddle-problem-text">
          {isSolved ? (
            <span style={{ color: "var(--green)" }}>
              ✓ Solved! Well done, code hunter.
            </span>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: riddle.problem }} />
          )}
        </div>
      </div>

      {!isSolved && (
        <div className="key-output-panel">
          <div className="input-group">
            <div className="input-label">
              // Enter Output Key (from previous solution)
            </div>
            <input
              ref={inputRef}
              type="text"
              className="key-input"
              placeholder="Paste your program's output..."
              autoComplete="off"
              spellCheck="false"
              value={key}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <div className="input-hint">
              # Output from Problem {riddle.prevNum} → unlocks next riddle
            </div>
          </div>
          <div className="error-msg">{error}</div>
          <div className="btn-group">
            <button className="btn-primary" onClick={handleSubmit}>
              🔓 &nbsp;Submit Key
            </button>
            <button className="btn-secondary" onClick={onBack}>
              ← Back to Map
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RiddleScreen;
