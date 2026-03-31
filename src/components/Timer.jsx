import React from "react";

const Timer = ({ timeRemaining, isTimeExpired }) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (isTimeExpired) return "#ff4a4a";
    if (timeRemaining <= 300) return "#ffa500"; // Last 5 minutes - orange
    if (timeRemaining <= 600) return "#f5c842"; // Last 10 minutes - yellow
    return "#00e5c8"; // Normal - teal
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "var(--bg2)",
        border: `2px solid ${getTimeColor()}`,
        borderRadius: "8px",
        padding: "12px 20px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "1.1rem",
        fontWeight: "bold",
        color: getTimeColor(),
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span>⏱️</span>
      <span>{isTimeExpired ? "TIME EXPIRED" : formatTime(timeRemaining)}</span>
    </div>
  );
};

export default Timer;
