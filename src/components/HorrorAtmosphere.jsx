import { useEffect, useRef, useState } from 'react';
import { PumpkinMark } from './HauntSymbols';
import DreadEntity from './DreadEntity';

const preferenceKey = 'toc-horror-effects';
const atmosphericScreens = new Set(['screen-landing', 'screen-quest']);

export default function HorrorAtmosphere({ screen }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'off'; } catch { return true; }
  });
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [encounter, setEncounter] = useState(null);
  const lantern = useRef(null);
  const reveal = useRef(null);
  const atmospheric = atmosphericScreens.has(screen);
  const running = enabled && !reduced && visible;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { setEncounter(null); setReduced(media.matches); };
    const onVisibility = () => { setEncounter(null); setVisible(!document.hidden); };
    media.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { media.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.effects = running ? 'on' : 'off';
    document.documentElement.dataset.horrorScreen = screen;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch { /* Storage is optional. */ }
    return () => { delete document.documentElement.dataset.effects; delete document.documentElement.dataset.horrorScreen; };
  }, [enabled, running, screen]);

  // A persistent presentation layer survives navigation. It never prevents a click,
  // delays a route, changes focus, reads credentials, or touches a gameplay timer.
  useEffect(() => {
    if (!running) return;
    let dismiss;
    let frame = 0;
    let scrollFrame = 0;
    let sequence = 0;
    let lastBurst = 0;
    let lastScrollVisit = 0;
    let distance = 0;
    let previousY = window.scrollY;
    let recent = '';
    let lastKeyAt = 0;
    const activeScreen = () => document.documentElement.dataset.horrorScreen;
    const show = (kind = 'summon', x = innerWidth * .7, y = innerHeight * .6) => {
      if (Date.now() - lastBurst < 200) return false;
      lastBurst = Date.now();
      clearTimeout(dismiss);
      setEncounter({ id: ++sequence, kind, x, y, side: x > innerWidth / 2 ? 'left' : 'right' });
      dismiss = window.setTimeout(() => setEncounter(null), 1100);
      return true;
    };
    reveal.current = () => show('summon');
    const onClick = event => {
      const control = event.target.closest?.('button,a,[role="button"],summary');
      if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true' || control.closest('.horror-controls,.qa-toolbar')) return;
      const rect = control.getBoundingClientRect();
      show('click', event.detail ? event.clientX : rect.left + rect.width / 2, event.detail ? event.clientY : rect.top + rect.height / 2);
    };
    const onKey = event => {
      if (!atmosphericScreens.has(activeScreen()) || event.ctrlKey || event.altKey || event.metaKey || event.repeat || event.target.closest?.('input,textarea,select,[contenteditable],form')) return;
      if (Date.now() - lastKeyAt > 1500) recent = '';
      lastKeyAt = Date.now();
      recent = (recent + event.key.toLowerCase()).slice(-3);
      if (recent === 'boo') { show('summon'); recent = ''; }
    };
    const onPointer = event => {
      if (!atmosphericScreens.has(activeScreen()) || event.pointerType === 'touch' || frame) return;
      frame = requestAnimationFrame(() => {
        lantern.current?.style.setProperty('--lantern-x', `${event.clientX}px`);
        lantern.current?.style.setProperty('--lantern-y', `${event.clientY}px`);
        frame = 0;
      });
    };
    const onScroll = () => {
      if (scrollFrame || !atmosphericScreens.has(activeScreen())) return;
      scrollFrame = requestAnimationFrame(() => {
        const y = window.scrollY;
        distance += Math.abs(y - previousY);
        previousY = y;
        document.documentElement.style.setProperty('--h-scroll-shift', `${Math.min(110, y * .07)}px`);
        if (distance > 500 && Date.now() - lastScrollVisit > 9000 && !document.activeElement?.closest('input,textarea,[contenteditable],form')) {
          if (show('scroll', innerWidth * .25, innerHeight * .6)) {
            lastScrollVisit = Date.now(); distance = 0;
          }
        }
        scrollFrame = 0;
      });
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(dismiss); cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); reveal.current = null;
      document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointermove', onPointer); window.removeEventListener('scroll', onScroll);
      document.documentElement.style.removeProperty('--h-scroll-shift');
    };
  }, [running]);

  return <>
    {running && <div className={`horror-atmosphere ${atmospheric ? '' : 'workspace-atmosphere'}`} aria-hidden="true">
      {atmospheric && <><div className="horror-lantern" ref={lantern}/><div className="horror-bat-flight"/><div className="horror-watching-eyes"><i/><i/></div></>}
      <div className="dread-route-reveal" key={screen}><i className="dread-route-scratch"/><DreadEntity/><span>THE DARKNESS FOLLOWS.</span></div>
      {encounter && <div key={encounter.id} className={`dread-encounter encounter-${encounter.kind} encounter-${encounter.side}`} style={{ '--strike-x': `${encounter.x}px`, '--strike-y': `${encounter.y}px` }}><div className="dread-click-mark"><i/><i/><i/></div><div className="dread-popout"><DreadEntity/><span>{encounter.kind === 'scroll' ? 'KEEP GOING.' : 'IT NOTICED YOU.'}</span></div><div className="dread-edge-grab"/></div>}
    </div>}
    <div className="horror-controls">
      {atmospheric && <button type="button" className="horror-pumpkin" onClick={() => reveal.current?.()} disabled={!running} aria-label="Meet the resident ghost" title="Wake what lives here"><PumpkinMark/></button>}
      <button type="button" className="horror-effects-toggle" aria-pressed={enabled} onClick={() => { setEncounter(null); setEnabled(value => !value); }} title={reduced ? 'Your reduced-motion preference is respected.' : 'Toggle horror motion and pop-out reactions'}><span className={running ? 'effects-lit' : ''} aria-hidden="true"/>Effects: {!enabled ? 'off' : reduced ? 'reduced' : 'on'}</button>
    </div>
  </>;
}

export function HauntedScene({ variant = 'mansion', className = '' }) {
  const asset = variant === 'graveyard' ? 'cursed-graveyard' : variant === 'vault' ? 'treasure-vault' : 'haunted-mansion';
  return <div className={`horror-scene ${className}`} aria-hidden="true"><img src={`/halloween/${asset}.svg`} alt="" width="1600" height="1000"/><div className="horror-fog fog-one"/><div className="horror-fog fog-two"/><div className="horror-window-eyes"><i/><i/></div><div className="horror-embers">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--ember-index': i }}/>)}</div></div>;
}
