import React from "react";

const LandingScreen = ({ onStart }) => {
  const [isLogoAvailable, setIsLogoAvailable] = React.useState(true);

  return (
    <>
      <div className="landing-badge">⚡ Cout &lt;&lt; Masters; presents</div>
      <div className="landing-logo" aria-label="Cout Masters logo">
        {isLogoAvailable ? (
          <img
            src="/CC-logo.png"
            alt="Cout Masters logo"
            className="landing-logo-image"
            onError={() => setIsLogoAvailable(false)}
          />
        ) : (
          "CM"
        )}
      </div>
      <h1 className="landing-title">
        Treasure
        <br />
        of Code
      </h1>
      <div className="landing-sub">
        6th April 2026 &nbsp;·&nbsp; CBT Format &nbsp;·&nbsp; MCA
      </div>
      <p className="landing-desc">
        A coding treasure hunt where every correct output becomes your next key.
        Solve puzzles, unlock riddles, and race to claim the ultimate prize.
      </p>

      <div className="rules-grid">
        <div className="rule-card" style={{ "--delay": "0.7s" }}>
          <div className="rule-icon">🗝️</div>
          <div>
            <div className="rule-title">Enter the Key</div>
            <div className="rule-text">
              Use the output of each solved problem as the key to unlock the
              next riddle.
            </div>
          </div>
        </div>
        <div className="rule-card" style={{ "--delay": "0.8s" }}>
          <div className="rule-icon">🗺️</div>
          <div>
            <div className="rule-title">Follow the Map</div>
            <div className="rule-text">
              Dynamic stages on the treasure map — Easy → Medium → Hard. Each node
              unlocks a new puzzle.
            </div>
          </div>
        </div>
        <div className="rule-card" style={{ "--delay": "0.9s" }}>
          <div className="rule-icon">⚖️</div>
          <div>
            <div className="rule-title">ICPC Rules</div>
            <div className="rule-text">
              Ranked by riddles solved. Ties broken by time and test cases
              passed.
            </div>
          </div>
        </div>
        <div className="rule-card" style={{ "--delay": "1s" }}>
          <div className="rule-icon">🏆</div>
          <div>
            <div className="rule-title">Win the Hunt</div>
            <div className="rule-text">
              Solve every challenge in your selected quest before time runs out
              to claim the treasure!
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button className="btn-primary" onClick={onStart}>
          Login
        </button>
      </div>
      <div className="landing-footer">
        Powered by Cout &lt;&lt; Masters; &nbsp;|&nbsp; Coded for MCA Coders
      </div>
    </>
  );
};

export default LandingScreen;
