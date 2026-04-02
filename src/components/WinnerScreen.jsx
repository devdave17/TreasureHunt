import React from "react";

const WinnerScreen = ({
  onReset,
  startTime,
  isTimeExpired,
  timeRemaining,
  userDetails,
  solvedCount,
  totalRiddles = 0,
}) => {
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
          ? `Time's up! You solved ${solvedCount}/${totalRiddles} riddles`
          : `You have conquered all ${totalRiddles} riddles!`}
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
          ? `The 1-hour time limit has been reached. Your progress of ${solvedCount} solved riddles will be recorded under ICPC Rules.`
          : "Exceptional work, Code Hunter! You've unlocked every chamber of the treasure vault. Your result will be recorded under ICPC Rules."}
      </p>
      <div className="winner-stats">
        <div className="stat-box">
          <div className="stat-val">
            {solvedCount}/{totalRiddles}
          </div>
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
