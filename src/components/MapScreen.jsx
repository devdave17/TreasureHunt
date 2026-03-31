import React, { useEffect, useRef, useState } from "react";

const MapScreen = ({ solvedCount, activeRiddle, onNodeClick, onExit }) => {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [paths, setPaths] = useState([]);

  const nodes = [
    {
      id: "node-start",
      lp: 0.08,
      tp: 0.5,
      icon: "🏁",
      label: "START",
      type: "start",
    },
    {
      id: "node-1",
      lp: 0.24,
      tp: 0.28,
      icon: "📜",
      label: "Riddle I",
      difficulty: "EASY",
      type: "riddle",
      num: 1,
    },
    {
      id: "node-2",
      lp: 0.42,
      tp: 0.68,
      icon: "🧩",
      label: "Riddle II",
      difficulty: "EASY",
      type: "riddle",
      num: 2,
    },
    {
      id: "node-3",
      lp: 0.6,
      tp: 0.25,
      icon: "⚙️",
      label: "Riddle III",
      difficulty: "MEDIUM",
      type: "riddle",
      num: 3,
    },
    {
      id: "node-4",
      lp: 0.77,
      tp: 0.65,
      icon: "🔮",
      label: "Riddle IV",
      difficulty: "MEDIUM",
      type: "riddle",
      num: 4,
    },
    {
      id: "node-5",
      lp: 0.92,
      tp: 0.38,
      icon: "💎",
      label: "Riddle V",
      difficulty: "HARD",
      type: "riddle",
      num: 5,
    },
  ];

  useEffect(() => {
    drawPaths();
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

  useEffect(() => {
    updatePaths();
  }, [solvedCount]);

  const drawPaths = () => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return;

    const w = canvas.offsetWidth || 1000;
    const h = canvas.offsetHeight || 500;

    const newPaths = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i],
        b = nodes[i + 1];
      const x1 = a.lp * 1000,
        y1 = a.tp * 500;
      const x2 = b.lp * 1000,
        y2 = b.tp * 500;
      const cx = (x1 + x2) / 2,
        cy = (y1 + y2) / 2 + (Math.random() > 0.5 ? -40 : 40);

      newPaths.push({
        id: `path-${i}`,
        d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
        lit: i < solvedCount,
      });
    }
    setPaths(newPaths);
  };

  const updatePaths = () => {
    setPaths((prevPaths) =>
      prevPaths.map((path, i) => ({
        ...path,
        lit: i < solvedCount,
      })),
    );
  };

  const getNodeStatus = (node) => {
    if (node.type === "start") return "start-node";
    if (node.num <= solvedCount) return "solved";
    if (node.num === activeRiddle) return "active";
    return "locked";
  };

  const getNodeClass = (node) => {
    const status = getNodeStatus(node);
    return `map-node ${status}`;
  };

  const getBadgeClass = (difficulty) => {
    switch (difficulty) {
      case "EASY":
        return "badge-easy";
      case "MEDIUM":
        return "badge-medium";
      case "HARD":
        return "badge-hard";
      default:
        return "";
    }
  };

  const handleNodeClick = (node) => {
    const status = getNodeStatus(node);
    if (status === "active") {
      onNodeClick(node.num);
    } else if (status === "solved") {
      onNodeClick(node.num, true);
    }
  };

  const getStatusMessage = () => {
    const statusMap = {
      1: "// Riddle I unlocked — Enter the Echo Chamber",
      2: "// Riddle II unlocked — Face the Endless Loop",
      3: "// Riddle III unlocked — Unravel the Stack",
      4: "// Riddle IV unlocked — Consult the Binary Oracle",
      5: "// Riddle V unlocked — Final Challenge Awaits!",
    };
    return statusMap[activeRiddle] || "// Quest complete!";
  };

  const getActiveHint = () => {
    const riddle = nodes.find((n) => n.num === activeRiddle);
    return riddle
      ? `🗝️ ${riddle.label} — ${riddle.difficulty} · Click the glowing node to view your riddle.`
      : "All riddles solved!";
  };

  const progressPercentage = (solvedCount / 5) * 100;

  return (
    <>
      <div className="map-header">
        <div className="map-header-left">
          <div className="map-header-title">🗺️ Treasure Map</div>
          <div className="map-header-sub">{getStatusMessage()}</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.2rem",
            flexWrap: "wrap",
          }}
        >
          <div className="progress-bar-wrap">
            <span className="progress-label">Progress</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <span className="progress-label">{solvedCount}/5</span>
          </div>
          <button
            className="btn-secondary"
            onClick={onExit}
            style={{ fontSize: ".75rem", padding: ".5rem 1rem" }}
          >
            ⟵ Exit
          </button>
        </div>
      </div>

      <div className="map-canvas" ref={canvasRef}>
        <svg
          className="map-svg"
          ref={svgRef}
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
        >
          {paths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              className={`path-line ${path.lit ? "lit" : ""}`}
            />
          ))}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            id={node.id}
            className={getNodeClass(node)}
            style={{
              left: `${node.lp * 100}%`,
              top: `${node.tp * 100}%`,
            }}
            onClick={() => handleNodeClick(node)}
          >
            <div className="node-circle">{node.icon}</div>
            <div className="node-label">{node.label}</div>
            {node.difficulty && (
              <div className={`node-badge ${getBadgeClass(node.difficulty)}`}>
                {node.difficulty}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hint bar */}
      <div style={{ maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <div
          style={{
            background: "var(--bg3)",
            border: "1px solid #1e2d42",
            borderRadius: "6px",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: ".75rem",
              color: "var(--teal)",
              letterSpacing: ".1em",
            }}
          >
            ACTIVE NODE
          </div>
          <div
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: "1rem",
              color: "var(--text)",
              flex: 1,
            }}
          >
            {getActiveHint()}
          </div>
        </div>
      </div>
    </>
  );
};

export default MapScreen;
