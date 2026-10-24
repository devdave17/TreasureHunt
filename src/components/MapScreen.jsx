import "./HauntGame.css";
import "./HauntMap.css";

// Routes grow with the question list; desktop snakes across three stops per row.
function routeLayout(total, mobile = false) {
  const width = mobile ? 400 : 1000;
  const start = { x: mobile ? 112 : 160, y: 90 };
  const stops = Array.from({ length: total }, (_, index) => {
    const row = Math.floor(index / 3);
    return mobile
      ? { x: index % 2 ? 280 : 120, y: 280 + index * 255 }
      : { x: [200, 500, 800][row % 2 ? 2 - index % 3 : index % 3], y: 270 + row * 290 };
  });
  const last = stops.at(-1) || start;
  const finish = { x: mobile ? 200 : last.x, y: last.y + 245 };
  const points = [start, ...stops, finish];
  const paths = points.slice(1).map((point, index) => {
    const from = points[index];
    if (mobile || index === 0 || index === points.length - 2) {
      const middleY = (from.y + point.y) / 2;
      return `M ${from.x} ${from.y} C ${from.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
    }
    if (from.y === point.y) return `M ${from.x} ${from.y} C ${from.x + (point.x - from.x) / 3} ${from.y - 35}, ${point.x - (point.x - from.x) / 3} ${point.y + 35}, ${point.x} ${point.y}`;
    const bendX = from.x > 500 ? 970 : 30;
    return `M ${from.x} ${from.y} C ${bendX} ${from.y}, ${bendX} ${point.y}, ${point.x} ${point.y}`;
  });
  return { width, height: finish.y + 155, start, stops, finish, paths };
}
function Road({ layout, mobile, solvedCount, activeRiddle, total }) {
  return <svg className={`hm-road ${mobile ? "hm-mobile-road" : "hm-desktop-road"}`} viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
    {layout.paths.map((path, index) => {
      const state = index < solvedCount || solvedCount >= total ? "travelled" : index + 1 === activeRiddle ? "open" : "unexplored";
      return <g key={index} className={`hm-road-segment ${state}`}><path d={path} className="hm-road-shadow"/><path d={path} className="hm-road-edge"/><path d={path} className="hm-road-surface"/><path d={path} className="hm-road-markings"/></g>;
    })}
  </svg>;
}
function placement(desktop, mobile) {
  return { "--map-x": `${desktop.x / 10}%`, "--map-y": `${desktop.y}px`, "--mobile-x": `${mobile.x / 4}%`, "--mobile-y": `${mobile.y}px` };
}
export default function MapScreen({ solvedCount = 0, activeRiddle, onNodeClick, onExit, questions = [], levelCounts = {} }) {
  const total = questions.length;
  const progress = total ? Math.min(100, Math.max(0, solvedCount / total * 100)) : 0;
  const active = questions[activeRiddle - 1];
  const desktop = routeLayout(total);
  const mobile = routeLayout(total, true);
  return <main className="hg-page hg-map">
    <header className="hg-topline"><span>TREASURE OF CODE <b> / THE HUNT</b></span><button className="hg-button hg-secondary" onClick={onExit}>Exit quest ↗</button></header>
    <section className="hm-heading hg-reveal"><div><p className="hg-eyebrow">YOUR PATH THROUGH THE UNKNOWN</p><h1 tabIndex={-1}>The haunted <em>trail.</em></h1><p>Follow the road. Decode each checkpoint. Reach the treasure vault.</p></div><div className="hm-progress"><span>{solvedCount} <small>/ {total} solved</small></span><progress value={progress} max="100" aria-label="Quest completion"/><span className="hm-progress-label">{Math.round(progress)}% OF THE TRAIL COMPLETE</span></div></section>
    <div className="hm-map-toolbar"><span>{active ? `NEXT / ${active.title || `Riddle ${activeRiddle}`}` : total ? "ALL CHECKPOINTS CLEARED" : "WAITING FOR CHALLENGES"}</span><div className="hg-legend"><span>● Current</span><span>✓ Solved</span><span>○ Locked</span></div></div>
    {total === 0 ? <div className="hg-empty">No challenges are available for this quest yet.</div> : <div className="hm-world hg-reveal" style={{ "--map-height": `${desktop.height}px`, "--mobile-height": `${mobile.height}px` }} aria-label="Quest route from the entrance gate to the treasure vault">
      <div className="hm-terrain" aria-hidden="true"/>
      <Road layout={desktop} solvedCount={solvedCount} activeRiddle={activeRiddle} total={total}/><Road layout={mobile} mobile solvedCount={solvedCount} activeRiddle={activeRiddle} total={total}/>
      <div className="hm-landmark hm-gate" style={placement(desktop.start,mobile.start)}><img src="/halloween/moonlit-shrine.png" alt=""/><span>THE ENTRANCE GATE</span><small>Your journey begins</small></div>
      <ol className="hm-stops">
        {questions.map((question,index) => {
          const num = index + 1;
          const solved = num <= solvedCount;
          const current = !solved && num === activeRiddle;
          const status = solved ? "solved" : current ? "current" : "locked";
          const players = Number(levelCounts[num]) || 0;
          return <li key={question.id || num} className={`hm-stop ${status}`} style={placement(desktop.stops[index],mobile.stops[index])}>
            <button disabled={!solved && !current} onClick={() => solved ? onNodeClick(num,true) : onNodeClick(num)} aria-current={current ? "step" : undefined} aria-label={`Checkpoint ${num}: ${question.title || `Riddle ${num}`}. ${solved ? "Solved. Review clue" : current ? "Unlocked. Open challenge" : "Locked"}`}>
              {current && <span className="hm-you">YOU ARE HERE</span>}
              <span className="hm-node"><span>{solved ? "✓" : String(num).padStart(2,"0")}</span></span>
              <span className="hm-stop-label"><span className="hm-stop-status">{solved ? `CHECKPOINT ${num} / SOLVED` : current ? `CHECKPOINT ${num} / UNLOCKED` : `CHECKPOINT ${num} / LOCKED`}</span><strong>{question.title || `Riddle ${num}`}</strong><span className="hm-stop-meta">{String(question.difficulty || "MEDIUM").toUpperCase()} <i>·</i> {players} player{players === 1 ? "" : "s"}</span><span className="hm-stop-action">{solved ? "Review clue ↗" : current ? "Open challenge →" : `Solve checkpoint ${num-1} first`}</span></span>
            </button>
          </li>;
        })}
      </ol>
      <div className={`hm-landmark hm-vault ${solvedCount >= total ? "unlocked" : ""}`} style={placement(desktop.finish,mobile.finish)}><img src="/halloween/treasure-vault.png" alt=""/><span>THE TREASURE VAULT</span><small>{solvedCount >= total ? "The treasure is yours" : "Complete the trail to unlock"}</small></div>
      <div className="hm-map-note" aria-hidden="true">NIGHTFALL TERRITORY<br/><span>FOLLOW THE LANTERN ROAD</span></div>
    </div>}
    <footer className="hg-footer"><span>THE GATES OPEN TO THOSE WHO DECODE.</span><span>{solvedCount} of {total} checkpoints solved</span></footer>
  </main>;
}
