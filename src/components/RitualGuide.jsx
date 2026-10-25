import { useEffect, useRef, useState } from 'react';
import DreadEntity from './DreadEntity';
import { RuneIcon } from './HauntSymbols';

const steps = [
  { icon: 'door', title: 'Enter the game', label: 'CROSS THE THRESHOLD', text: 'Log in to your account. Step into the mysterious world of Treasure of Code.', whisper: 'The door closes behind you.' },
  { icon: 'key', title: 'Get your input key', label: 'CLAIM THE FIRST FRAGMENT', text: 'Receive your input key at the beginning of the game. Use it exactly as instructed in the question.', whisper: 'Every key has a purpose.' },
  { icon: 'code', title: 'Write and run your code', label: 'PERFORM THE INVOCATION', text: 'Write your solution in your own coding environment. Use the input key, execute your program, and obtain the output.', whisper: 'Your editor. Your code. Your way through.' },
  { icon: 'send', title: 'Submit the output', label: 'MAKE YOUR OFFERING', text: 'Check your program’s output, then enter it in the website’s designated submission field.', whisper: 'The system is listening.' },
  { icon: 'lock', title: 'Unlock the next question', label: 'BREAK THE SEAL', text: 'Only a correct, validated output unlocks the next question. Incorrect? Review your code and retry according to the event rules.', whisper: 'The wrong answer opens nothing.' },
  { icon: 'repeat', title: 'Repeat until the end', label: 'DESCEND AGAIN', text: 'Use each applicable challenge’s input key. Solve, execute, and submit the correct output. Repeat through the final challenge.', whisper: 'One more question. One step deeper.' },
  { icon: 'treasure', title: 'Reach the treasure', label: 'SURVIVE THE FINAL SEAL', text: 'Complete the challenges, follow your progress on the leaderboard, and compete for the ultimate treasure.', whisper: 'Leave your name among the survivors.' },
];

function RitualVisual({ index, icon }) {
  return <div className={`ritual-visual ritual-visual-${index}`} aria-hidden="true">
    {index === 0 ? <div className="ritual-door"><i/><i/><RuneIcon name="key"/></div> : index === 2 ? <div className="ritual-terminal"><span>YOUR LOCAL CODING ENVIRONMENT</span><code><b>&gt;</b> read(input_key)<br/><b>&gt;</b> write_solution()<br/><b>&gt;</b> execute<span className="ritual-caret">_</span></code></div> : index === 5 ? <div className="ritual-infinity"><span>∞</span><code>SOLVE / RUN / SUBMIT / REPEAT</code></div> : <><RuneIcon name={icon}/><code>{['', 'input_key', '', 'program_output', 'correct output → next question', '', 'THE TREASURE'][index]}</code></>}
  </div>;
}

export default function RitualGuide({ onStart }) {
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  useEffect(() => {
    const chapters = Array.from(listRef.current?.querySelectorAll('.ritual-act') || []);
    const observer = new IntersectionObserver(() => {
      const focusLine = innerHeight * .33;
      const visible = chapters.map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.bottom > 0 && rect.top < innerHeight);
      const focused = visible.find(({ rect }) => rect.top <= focusLine && rect.bottom > focusLine) || visible.sort((a, b) => Math.abs(a.rect.top - focusLine) - Math.abs(b.rect.top - focusLine))[0];
      if (focused) setActive(Number(focused.element.dataset.chapter));
    }, { rootMargin: '-12% 0px -30% 0px', threshold: [0.15, 0.35, 0.6] });
    chapters.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return <section className="ritual-guide" id="hunt-how-to-play" aria-labelledby="haunt-guide-title">
    <div className="ritual-intro"><p className="haunt-section-label">HOW TO PLAY / THE SURVIVAL PROTOCOL</p><h2 id="haunt-guide-title">Break the<br/><em>seven seals.</em></h2><p>Every correct output takes you deeper.<br/>Scroll to learn the ritual.</p><span className="ritual-intro-cross" aria-hidden="true">†</span></div>
    <ol className="ritual-flow" aria-label="Gameplay sequence">{['Input Key', 'Write Code', 'Execute', 'Submit Output', 'Unlock Next Question', 'Repeat'].map((label, i) => <li key={label}>{label}{i < 5 && <span aria-hidden="true">↘</span>}</li>)}</ol>
    <div className="ritual-descent">
      <aside className="ritual-rail" aria-label="Gameplay steps"><div className="ritual-sigil" aria-hidden="true" style={{ '--seal': active }}><div className="ritual-orbit"/><div className="ritual-orbit inner-orbit"/><DreadEntity/><span className="ritual-sigil-cross cross-one">+</span><span className="ritual-sigil-cross cross-two">+</span></div><div className="ritual-rail-copy"><span className="ritual-rail-label">SEAL {String(active + 1).padStart(2, '0')} / 07</span><p>{steps[active].whisper}</p></div><nav aria-label="Jump to gameplay step">{steps.map((step, i) => <a key={step.title} href={`#ritual-step-${i + 1}`} aria-label={`Step ${i + 1}: ${step.title}`} aria-current={active === i ? 'step' : undefined}>{i + 1}</a>)}</nav><span className="ritual-scroll-note" aria-hidden="true">KEEP DESCENDING ↓</span></aside>
      <ol className="ritual-acts" ref={listRef}>{steps.map((step, i) => <li key={step.title} data-chapter={i} className={`ritual-act${active === i ? ' is-current' : ''}`} id={`ritual-step-${i + 1}`}><span className="ritual-act-number" aria-hidden="true">0{i + 1}</span><div className="ritual-act-copy"><p className="ritual-act-label"><RuneIcon name={step.icon}/>{step.label}</p><h3>{step.title}</h3><p className="ritual-explanation">{step.text}</p><RitualVisual index={i} icon={step.icon}/>{i === 6 && <button className="haunt-enter" onClick={onStart}>Enter the hunt <span aria-hidden="true">→</span></button>}</div></li>)}</ol>
    </div>
    <aside className="ritual-oath" aria-labelledby="ritual-oath-title"><RuneIcon name="skull"/><div><p className="haunt-section-label">READ BEFORE YOU ENTER</p><h3 id="ritual-oath-title">The rules do not bend.</h3><ul><li>Follow each question’s instructions for its input key.</li><li>Write and execute code in your own coding environment.</li><li>Submit the program output in the website’s designated answer field.</li><li>Only a correct, validated output unlocks the next question.</li><li>Repeat until all challenges are complete. Follow the official event rules.</li></ul></div></aside>
  </section>;
}
