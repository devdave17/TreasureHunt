import "./HauntGame.css";

export default function Timer({ timeRemaining, isTimeExpired }) {
  const seconds = Math.max(0, Math.floor(Number(timeRemaining) || 0));
  const hours = Math.floor(seconds / 3600);
  const time = `${hours ? `${hours}:` : ""}${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className={`hg-timer ${isTimeExpired ? "expired" : seconds <= 300 ? "urgent" : seconds <= 600 ? "warning" : ""}`}><span>{isTimeExpired ? "THE CLOCK HAS STOPPED" : "TIME REMAINING"}</span><strong role="timer" aria-label={isTimeExpired ? "Time expired" : `${time} remaining`}>{isTimeExpired ? "TIME EXPIRED" : time}</strong></div>;
}
