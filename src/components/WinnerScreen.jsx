import React from "react";

const WinnerScreen = ({
  onReset,
  isTimeExpired,
  isBlockedByInvigilator = false,
  finalElapsedSeconds,
  questTimeLimitSeconds = 3600,
  userDetails,
  solvedCount,
  totalRiddles = 0,
}) => {
  const formatElapsedSeconds = (elapsedSeconds) => {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return "--:--";
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const secs = String(elapsedSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const formatTimeLimitLabel = (secondsTotal) => {
    const safeSeconds = Math.max(0, Number(secondsTotal) || 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;

    if (secs === 0) {
      return `${mins}-minute`;
    }

    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  };

  return (
    <>
      <div className="winner-trophy">
        {isBlockedByInvigilator ? "⛔" : isTimeExpired ? "⏰" : "🏆"}
      </div>
      <div className="winner-title">
        {isBlockedByInvigilator
          ? "Blocked by Invigilator"
          : isTimeExpired
            ? "Time Expired!"
            : "Treasure Found!"}
      </div>
      <div className="winner-sub">
        {isBlockedByInvigilator
          ? "Your attempt has been disqualified due to UMF."
          : isTimeExpired
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
        {isBlockedByInvigilator
          ? "You have been blocked by the invigilator due to UMF (Unfair Means). This attempt is disqualified and excluded from competition ranking."
          : isTimeExpired
            ? `The ${formatTimeLimitLabel(questTimeLimitSeconds)} time limit has been reached. Your progress of ${solvedCount} solved riddles has been auto-submitted under ICPC Rules.`
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
            {formatElapsedSeconds(finalElapsedSeconds)}
          </div>
          <div className="stat-key">Time Elapsed</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{isBlockedByInvigilator ? "BLOCKED" : "SUBMITTED"}</div>
          <div className="stat-key">Status</div>
        </div>
      </div>
      <div className="btn-group" style={{ justifyContent: "center", gap: "1rem" }}>
        <button className="btn-primary" onClick={onReset}>
          Go Back
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
        Powered by Cout &lt;&lt; Masters;
      </div>
    </>
  );
};

export default WinnerScreen;
