import React, { useEffect } from "react";

const LandingScreen = ({ onStart }) => {
  useEffect(() => {
    spawnConfetti();

    return () => {
      // Clean up confetti when component unmounts
      document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
    };
  }, []);

  const spawnConfetti = () => {
    const colors = [
      "#f5c842",
      "#00e5c8",
      "#ff4a4a",
      "#39ff14",
      "#ffffff",
      "#ffa500",
    ];
    for (let i = 0; i < 60; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        --d: ${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay: ${(Math.random() * 2).toFixed(1)}s;
      `;
      document.body.appendChild(confetti);
    }
  };

  return (
    <>
      <div className="landing-badge">⚡ Cout &lt;&lt; Masters; presents</div>
      <div className="landing-chest">🏴‍☠️</div>
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
              5 stages on the treasure map — Easy → Medium → Hard. Each node
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
              Solve all 5 challenges before time runs out to claim the treasure!
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
          ⚔️ &nbsp; Begin Quest
        </button>
      </div>
      <div className="landing-footer">
        Powered by Cout &lt;&lt; Masters; &nbsp;|&nbsp; Coded for MCA Coders
      </div>
    </>
  );
};

export default LandingScreen;
