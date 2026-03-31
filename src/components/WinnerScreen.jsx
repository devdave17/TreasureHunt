import React, { useEffect } from "react";

const WinnerScreen = ({
  onReset,
  startTime,
  animation,
  isTimeExpired,
  timeRemaining,
  userDetails,
  solvedCount,
}) => {
  useEffect(() => {
    console.log("WinnerScreen animation prop:", animation);
    if (animation) {
      spawnConfetti();
    }

    return () => {
      // Clean up confetti when component unmounts
      document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
    };
  }, [animation]);

  const spawnConfetti = () => {
    console.log("Spawning confetti in WinnerScreen");
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
    console.log(
      "Confetti pieces created:",
      document.querySelectorAll(".confetti-piece").length,
    );
  };

  const formatTime = (startTime) => {
    if (!startTime) return "--:--";
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <>
      <div className="winner-trophy">{isTimeExpired ? "⏰" : "🏆"}</div>
      <div className="winner-title">
        {isTimeExpired ? "Time Expired!" : "Treasure Found!"}
      </div>
      <div className="winner-sub">
        {isTimeExpired
          ? `Time's up! You solved ${solvedCount}/5 riddles`
          : "You have conquered all 5 riddles!"}
      </div>

      {/* User Details */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--gold)",
          borderRadius: "8px",
          padding: "1rem",
          margin: "1rem 0",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "0.9rem",
            color: "var(--text-dim)",
            marginBottom: "0.5rem",
          }}
        >
          Participant Details
        </div>
        <div style={{ fontSize: "1rem", color: "var(--text)" }}>
          <div>
            <strong>Name:</strong> {userDetails.name}
          </div>
          <div>
            <strong>Email:</strong> {userDetails.email}
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: "1.15rem",
          color: "var(--text-dim)",
          maxWidth: "480px",
          lineHeight: "1.7",
          textAlign: "center",
        }}
      >
        {isTimeExpired
          ? `The 1-hour time limit has been reached. Your progress of ${solvedCount} riddles solved will be recorded under ${(<strong style={{ color: "var(--gold)" }}>ICPC Rules</strong>)}.`
          : "Exceptional work, Code Hunter! You've unlocked every chamber of the treasure vault. Your result will be recorded under " +
            <strong style={{ color: "var(--gold)" }}>ICPC Rules</strong> +
            "."}
      </p>
      <div className="winner-stats">
        <div className="stat-box">
          <div className="stat-val">{solvedCount}/5</div>
          <div className="stat-key">Riddles Solved</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">
            {isTimeExpired ? "00:00" : formatTime(startTime)}
          </div>
          <div className="stat-key">Time Elapsed</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{isTimeExpired ? "EXPIRED" : "✓"}</div>
          <div className="stat-key">Status</div>
        </div>
      </div>
      <div className="btn-group" style={{ justifyContent: "center" }}>
        <button className="btn-primary" onClick={onReset}>
          🔄 &nbsp;Play Again
        </button>
      </div>
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: ".75rem",
          color: "var(--text-dim)",
          letterSpacing: ".1em",
        }}
      >
        Powered by Cout &lt;&lt; Masters; &nbsp;·&nbsp; 6th April 2026
      </div>
    </>
  );
};

export default WinnerScreen;
