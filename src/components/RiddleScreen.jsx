import { useEffect, useRef, useState } from 'react';
import { RuneIcon } from './HauntSymbols';
import OfficialLogo from './OfficialLogo';
import './HauntGame.css';
import { prepareVictoryAudio } from '../utils/victoryAudio';

function Challenge({ riddle, onSubmit, onBack, isSolved, submissionError, isSubmitting }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const headingRef = useRef(null);
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      const desktop = window.matchMedia('(min-width: 901px) and (pointer: fine)').matches;
      (desktop ? inputRef.current || headingRef.current : headingRef.current)?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(focusTimer);
  }, [riddle?.id]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting || isSolved) return;
    // Keep the established output normalization and submission callback intact.
    const key = answer.trim().toUpperCase();
    if (!key) { setError("Please enter your program's output."); inputRef.current?.focus(); return; }
    setError('');
    void prepareVictoryAudio();
    onSubmit(key);
  };
  if (!riddle) return null;
  return <main className="hg-page hg-challenge">
    <header className="hg-topline"><span>TREASURE OF CODE <b> / THE CHALLENGE CHAMBER</b></span><button className="hg-button hg-secondary" onClick={onBack}>← Back to map</button></header>
    <div className="horror-question-heading"><div><p className="hg-eyebrow">{riddle.stage || `CHECKPOINT ${riddle.num || ''}`}</p><h1 ref={headingRef} tabIndex={-1}>{riddle.title}</h1></div>{isSolved && <span className="hg-status solved">✓ Solved</span>}</div>
    <div className="dread-workflow" aria-label="Solving workflow"><span>01 / READ THE CLUE</span><i aria-hidden="true">→</i><span>02 / CODE & RUN LOCALLY</span><i aria-hidden="true">→</i><span>03 / TRANSMIT YOUR OUTPUT</span></div>
    <div className="horror-question-layout">
      <div className="horror-question-reading">
        <section className="horror-riddle-panel" aria-labelledby="riddle-text-heading"><div className="horror-panel-heading"><span className="horror-section-number">01</span><h2 id="riddle-text-heading">Riddle Text</h2><RuneIcon name="skull"/></div><blockquote>{riddle.riddle}</blockquote><p className="horror-panel-note">Every word could be a clue. Read between the lines.</p></section>
        <section className="hg-problem" aria-labelledby="problem-heading"><div className="horror-panel-heading"><span className="horror-section-number">02</span><h2 id="problem-heading">Problem Statement</h2><RuneIcon name="code"/></div>{isSolved ? <p className="hg-solved-message">You have solved this challenge. Return to the map to continue your hunt.</p> : <><div className="hg-problem-content" dangerouslySetInnerHTML={{ __html: riddle.problem }}/></>}</section>
      </div>
      <aside className="horror-answer-column">{!isSolved && <section className="hg-input-key dread-input-tray" aria-labelledby="challenge-input-label"><p className="hg-eyebrow" id="challenge-input-label"><RuneIcon name="key"/> INPUT KEY</p><pre>{riddle.inputKey}</pre><p>Use this input as instructed. Run your solution in your own coding environment.</p></section>}{!isSolved ? <form className="hg-answer" onSubmit={handleSubmit} aria-busy={isSubmitting}><div className="dread-console-bar" aria-hidden="true"><i/><i/><i/><code>OUTPUT_CHANNEL</code><span>{isSubmitting ? "VALIDATING" : "AWAITING OUTPUT"}</span></div><div className="horror-panel-heading"><span className="horror-section-number">03</span><h2>Answer Box</h2><RuneIcon name="lock"/></div><p className="horror-answer-intro">The next seal demands<br/><em>the correct output.</em></p><label htmlFor="hunt-answer">Program output</label><p id="hunt-answer-help">Run your code with the provided input key, then type or paste the resulting output below.</p><div className="dread-output-field"><span aria-hidden="true">&gt;_</span><input ref={inputRef} id="hunt-answer" value={answer} onChange={(e) => { setAnswer(e.target.value); setError(''); }} placeholder="Enter your output…" autoComplete="off" spellCheck={false} disabled={isSubmitting} aria-invalid={Boolean(error || submissionError)} aria-describedby="hunt-answer-help hunt-answer-error"/></div><p className="hg-error" id="hunt-answer-error" role="alert">{error || submissionError}</p><button className="hg-button dread-transmit" disabled={isSubmitting} type="submit"><RuneIcon name="send"/>{isSubmitting ? 'Checking your output…' : 'Submit Output →'}</button><span className="hg-answer-note"><RuneIcon name="lock"/> Only a correct, validated output unlocks the next question.</span><div className="horror-answer-loop" aria-hidden="true"><code>write → run → submit → unlock</code></div></form> : <div className="horror-solved-panel"><RuneIcon name="treasure"/><h2>Curse broken.</h2><p>This chamber is complete. Your next clue awaits on the map.</p><button className="hg-button" onClick={onBack}>Continue the hunt →</button></div>}</aside>
    </div>
    <footer className="hg-footer"><span>TRUST YOUR LOGIC. BREAK THE CURSE.</span><span className="dread-footer-brand"><OfficialLogo/>CEREBRO · CODING CLUB, IIIT VADODARA</span></footer>
  </main>;
}

export default function RiddleScreen({ riddle, submissionError = '', isSubmitting = false, ...props }) {
  return riddle ? <Challenge key={riddle.id} riddle={riddle} submissionError={submissionError} isSubmitting={isSubmitting} {...props}/> : null;
}
