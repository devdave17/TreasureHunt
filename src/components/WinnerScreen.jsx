import "./HauntGame.css";

export default function WinnerScreen({ onReset, onExit, isTimeExpired, isBlockedByInvigilator = false, finalElapsedSeconds, questTimeLimitSeconds = 3600, userDetails = {}, solvedCount = 0, totalRiddles = 0 }) {
  const outcome = isBlockedByInvigilator ? "blocked" : isTimeExpired ? "expired" : "complete";
  const elapsed = Number.isFinite(finalElapsedSeconds) && finalElapsedSeconds >= 0 ? `${String(Math.floor(finalElapsedSeconds / 60)).padStart(2, "0")}:${String(Math.floor(finalElapsedSeconds % 60)).padStart(2, "0")}` : "--:--";
  const limit = Math.max(0, Number(questTimeLimitSeconds) || 0);
  const limitLabel = limit % 60 ? `${Math.floor(limit / 60)}m ${limit % 60}s` : `${limit / 60}-minute`;
  const content = {
    complete: { eyebrow: "THE FINAL DOOR IS OPEN", title: "Treasure found.", text: `You have conquered all ${totalRiddles} riddles. Every clue decoded. Every chamber unlocked.`, note: "Your result is recorded under ICPC rules.", art: "treasure-vault" },
    expired: { eyebrow: "THE HUNT HAS ENDED", title: "Time has expired.", text: `The ${limitLabel} time limit has been reached. Your progress of ${solvedCount} solved riddles has been auto-submitted under ICPC rules.`, note: "Your recorded progress is shown below.", art: "moonlit-shrine" },
    blocked: { eyebrow: "ATTEMPT DISQUALIFIED", title: "Blocked by invigilator.", text: "You have been blocked by the invigilator due to UMF (Unfair Means). This attempt is disqualified and excluded from competition ranking.", note: "Contact the invigilator if you need clarification.", art: "haunted-archive" },
  }[outcome];
  return <main className={`hg-page hg-results ${outcome}`}>
    <header className="hg-topline"><span>TREASURE OF CODE <b> / THE RESULTS</b></span><span className="hg-eyebrow">THE END OF THIS CHAPTER</span></header>
    <div className="hg-result-layout"><div className="hg-result-art hg-reveal"><img src={`/halloween/${content.art}.png`} alt="" /><span>{outcome === "complete" ? "THE VAULT / UNLOCKED" : "THE HUNT / CLOSED"}</span></div><div className="hg-result-copy hg-reveal"><p className="hg-eyebrow">{content.eyebrow}</p><h1 tabIndex={-1}>{content.title}</h1><p className="hg-result-description">{content.text}</p><div className="hg-participant"><span>CODE HUNTER</span><strong>{userDetails.name || "Participant"}</strong><p>{userDetails.email}</p></div><dl className="hg-result-stats"><div><dt>Riddles solved</dt><dd>{solvedCount}<small> / {totalRiddles}</small></dd></div><div><dt>Time elapsed</dt><dd>{elapsed}</dd></div><div><dt>Status</dt><dd className="hg-result-status">{isBlockedByInvigilator ? "BLOCKED" : "SUBMITTED"}</dd></div></dl><p className="hg-result-note">{content.note}</p><div className="hg-result-actions"><button className="hg-button" onClick={onReset}>Back to quests →</button><button className="hg-button hg-secondary" onClick={onExit || onReset}>Exit</button></div></div></div>
    <footer className="hg-footer"><span>EVERY ENDING HOLDS ANOTHER BEGINNING.</span><span>CELEBRO · CODING CLUB, IIIT VADODARA</span></footer>
  </main>;
}
