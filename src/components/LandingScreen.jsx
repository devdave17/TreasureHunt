import { useState } from "react";
import "./LandingScreen.css";

const rules = [
  { title: "Crack the clue", label: "SOLVE", text: "Solve each coding problem. The correct output becomes the key to your next riddle." },
  { title: "Follow the shadows", label: "EXPLORE", text: "Unlock your path across the map, from Easy to Medium to Hard. One stage at a time." },
  { title: "Beat the darkness", label: "COMPETE", text: "ICPC rules: ranked by riddles solved, with ties broken by time and test cases passed." },
  { title: "Claim the treasure", label: "CONQUER", text: "Complete every challenge in your selected quest before the clock runs out." },
];

export default function LandingScreen({ onStart }) {
  const [isLogoAvailable, setIsLogoAvailable] = useState(true);

  return (
    <div className="haunt-landing">
      <div className="haunt-stage">
        <img
          className="haunt-backdrop"
          src="/halloween/moonlit-shrine.png"
          alt=""
          fetchPriority="high"
          width="1672"
          height="941"
        />
        <header className="haunt-header">
          <div className="haunt-brand">
            {isLogoAvailable ? (
              <img src="/logo.png" alt="CELEBRO, Coding Club, IIIT Vadodara" onError={() => setIsLogoAvailable(false)} />
            ) : <span className="haunt-brand-fallback">CM</span>}
            <div>
              <span className="haunt-brand-name">CELEBRO</span>
              <span className="haunt-brand-note">CODING CLUB, IIIT VADODARA</span>
            </div>
          </div>
          <nav className="haunt-nav" aria-label="Landing page">
            <a href="#hunt-how-to-play">How to play</a>
            <button type="button" onClick={onStart}>Player login <span aria-hidden="true">↗</span></button>
          </nav>
        </header>

        <main className="haunt-hero">
          <div className="haunt-copy">
            <p className="haunt-eyebrow"><span aria-hidden="true">✦</span> HALLOWEEN TECH CODING CONTEST</p>
            <h1 className="haunt-title" aria-label="Treasure of Code" tabIndex={-1}>
              <span>Treasure</span>
              <span className="haunt-title-bottom"><em>of</em> Code</span>
            </h1>
            <p className="haunt-tagline">Some secrets are buried.<br />Others are waiting to be <strong>decoded.</strong></p>
            <p className="haunt-description">Step beyond the moonlit gates. Crack the clues, solve the code, and unlock the next stage of the hunt.</p>
            <button type="button" className="haunt-enter" onClick={onStart}>Enter the hunt <span aria-hidden="true">→</span></button>
            <p className="haunt-login-note">Log in with your registered institute account.</p>
            <div className="haunt-event" aria-label="Event details">
              <span>6 APRIL 2026</span><i aria-hidden="true" /><span>CBT FORMAT</span><i aria-hidden="true" /><span>OPEN TO ALL</span>
            </div>
          </div>
          <div className="haunt-scene-label" aria-hidden="true"><span>01 / THE GATEWAY</span><p>Every answer opens a door.</p></div>
        </main>
        <div className="haunt-stage-bottom"><span>FOLLOW THE CLUES. TRUST YOUR CODE.</span><a href="#hunt-how-to-play">Discover the rules <span aria-hidden="true">↓</span></a></div>
      </div>

      <section className="haunt-guide" id="hunt-how-to-play" aria-labelledby="haunt-guide-title">
        <div className="haunt-guide-heading">
          <div><p className="haunt-section-label">THE RULES OF THE HUNT</p><h2 id="haunt-guide-title">Four steps into the unknown.</h2></div>
          <p>A sharp mind is your only way through.</p>
        </div>
        <div className="haunt-rules">
          {rules.map((rule, index) => (
            <article className="haunt-rule" key={rule.label}>
              <div className="haunt-rule-index"><span>0{index + 1}</span><span>{rule.label}</span></div>
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="haunt-footer"><span>CELEBRO <b aria-hidden="true">✦</b> Treasure of Code</span><span>Hosted by Coding Club, IIIT Vadodara.</span></footer>
    </div>
  );
}
