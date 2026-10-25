import { HauntedScene } from './HorrorAtmosphere';
import { RuneIcon } from './HauntSymbols';
import RitualGuide from './RitualGuide';
import DreadEntity from './DreadEntity';
import OfficialLogo from './OfficialLogo';
import './LandingScreen.css';

export default function LandingScreen({ onStart }) {
  return <div className="haunt-landing">
    <div className="haunt-stage">
      <HauntedScene className="haunt-backdrop"/>
      <header className="haunt-header">
        <a className="haunt-brand" href="#screen-landing" aria-label="CEREBRO — Treasure of Code home"><OfficialLogo/><span><span className="haunt-brand-name">CEREBRO<span className="brand-period">.</span></span><span className="haunt-brand-note">CODING CLUB · IIIT VADODARA</span></span></a>
        <nav className="haunt-nav" aria-label="Landing page"><a href="#hunt-how-to-play"><RuneIcon name="skull"/> How to Play</a><button type="button" onClick={onStart}>Player Login <span aria-hidden="true">↗</span></button></nav>
      </header>
      <main className="haunt-hero">
        <div className="haunt-copy">
          <p className="haunt-night-label"><span aria-hidden="true"/> THE GATES OPEN ON HALLOWEEN</p>
          <h1 className="haunt-title" aria-label="Treasure of Code" tabIndex={-1}><span className="haunt-title-first" aria-hidden="true" data-text="Treasure">Treasure</span><span className="haunt-title-bottom"><em>of</em> Code<span className="title-period">.</span></span></h1>
          <p className="haunt-conducted">{'Conducted By COUT<<MASTERS;'}</p>
          <p className="haunt-tagline">Some secrets are buried.<br/>Others are waiting to be <strong>decoded.</strong></p>
          <p className="haunt-description">Beyond these gates, every clue is a curse. Write the code. Break the spell. Find what the darkness is hiding.</p>
          <button type="button" className="haunt-enter" onClick={onStart}><RuneIcon name="key"/> Enter the hunt <span aria-hidden="true">→</span></button>
          <p className="haunt-login-note">Your registered account is your way in.</p>
          <div className="haunt-event" aria-label="Event details"><span><b>31</b> OCTOBER 2026</span><i aria-hidden="true"/><span>OPEN TO ALL</span></div>
        </div>
        <DreadEntity className="hero-stalker"/><div className="haunt-scene-label"><span>THE HOUSE IS AWAKE.</span><p>Are you brave enough to enter?</p><code aria-hidden="true">&gt; awaiting_brave_soul_</code></div>
      </main>
      <div className="haunt-stage-bottom"><span><span aria-hidden="true">✦</span> CRACK THE CODE. BREAK THE CURSE.</span><a href="#hunt-how-to-play">Learn the ritual <span aria-hidden="true">↓</span></a></div>
    </div>
    <RitualGuide onStart={onStart}/>
    <footer className="haunt-footer"><span><OfficialLogo/> CEREBRO <b aria-hidden="true">×</b> Treasure of Code</span><span className="haunt-footer-organizer"><OfficialLogo seal/>Conducted by {'COUT<<MASTERS;'}<br/>Coding Club, IIIT Vadodara</span><a href="#screen-landing">Back to the gates ↑</a></footer>
  </div>;
}
