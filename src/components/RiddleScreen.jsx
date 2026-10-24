import { useEffect, useRef, useState } from "react";
import "./HauntGame.css";

function Challenge({ riddle, onSubmit, onBack, isSolved, submissionError, isSubmitting }) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(focusTimer);
  }, [riddle?.id]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting || isSolved) return;
    const key = answer.trim().toUpperCase();
    if (!key) { setError("Please enter your program's output key."); inputRef.current?.focus(); return; }
    setError("");
    onSubmit(key);
  };
  if (!riddle) return null;
  return <main className="hg-page hg-challenge">
    <header className="hg-topline"><span>TREASURE OF CODE <b> / THE ARCHIVE</b></span><button className="hg-button hg-secondary" onClick={onBack}>← Back to map</button></header>
    <div className="hg-challenge-grid">
      <aside className="hg-clue hg-reveal"><img src="/halloween/haunted-archive.png" alt="A violet crystal above an open manuscript in a candlelit archive" /><div className="hg-clue-copy"><p className="hg-eyebrow">{riddle.stage || `CHECKPOINT ${riddle.num || ""}`}</p><h1 tabIndex={-1}>{riddle.title}</h1><span className={`hg-status ${isSolved ? "solved" : ""}`}>{isSolved ? "✓ Solved" : riddle.difficulty || "Challenge unlocked"}</span><blockquote>{riddle.riddle}</blockquote><p className="hg-clue-note">Read between the lines.<br />The answer is your next key.</p></div></aside>
      <div className="hg-challenge-work hg-reveal">
        <section className="hg-problem"><p className="hg-eyebrow">{isSolved ? "CHECKPOINT COMPLETE" : "01 / THE CHALLENGE"}</p><h2>{isSolved ? "A secret, uncovered." : "Decode the mystery."}</h2>{isSolved ? <p className="hg-solved-message">You have solved this challenge. Return to the map to continue your hunt.</p> : <div className="hg-problem-content" dangerouslySetInnerHTML={{ __html: riddle.problem }} />}</section>
        {!isSolved ? <form className="hg-answer" onSubmit={handleSubmit} aria-busy={isSubmitting}><p className="hg-eyebrow">02 / UNLOCK THE NEXT STAGE</p><label htmlFor="hunt-answer">Your output key</label><p id="hunt-answer-help">Enter the output from your solution.</p><input ref={inputRef} id="hunt-answer" value={answer} onChange={(e) => { setAnswer(e.target.value); setError(""); }} placeholder="Type or paste your output…" autoComplete="off" spellCheck={false} disabled={isSubmitting} aria-invalid={Boolean(error || submissionError)} aria-describedby="hunt-answer-help hunt-answer-error" /><p className="hg-error" id="hunt-answer-error" role="alert">{error || submissionError}</p><button className="hg-button" disabled={isSubmitting} type="submit">{isSubmitting ? "Checking your key…" : "Submit key →"}</button><span className="hg-answer-note">Every correct answer opens a door.</span></form> : <button className="hg-button" onClick={onBack}>Continue the hunt →</button>}
      </div>
    </div><footer className="hg-footer"><span>TRUST YOUR LOGIC. FOLLOW THE CLUES.</span><span>CELEBRO · CODING CLUB, IIIT VADODARA</span></footer>
  </main>;
}
export default function RiddleScreen({ riddle, submissionError = "", isSubmitting = false, ...props }) {
  return riddle ? <Challenge key={riddle.id} riddle={riddle} submissionError={submissionError} isSubmitting={isSubmitting} {...props} /> : null;
}
