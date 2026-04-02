import React, { useEffect, useMemo, useRef, useState } from "react";

const ICONS = ["📜", "🧩", "⚙️", "🔮", "💎", "🧭", "🏺", "🗝️", "📦", "🧠"];
const TRACK_Y = [0.28, 0.68, 0.25, 0.65, 0.36, 0.72, 0.26, 0.62];

const buildRiddleNodes = (questions) => {
  const total = Math.max(questions.length, 1);

  return questions.map((question, index) => {
    const step = index + 1;
    const lp = 0.16 + (0.76 * (index + 1)) / total;
    const tp = TRACK_Y[index % TRACK_Y.length];

    return {
      id: `node-${step}`,
      lp,
      tp,
      icon: ICONS[index % ICONS.length],
      label: question.title || `Riddle ${step}`,
      difficulty: String(question.difficulty || "MEDIUM").toUpperCase(),
      type: "riddle",
      num: step,
    };
  });
};

const MapScreen = ({ solvedCount, activeRiddle, onNodeClick, onExit, questions = [] }) => {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [paths, setPaths] = useState([]);

  const nodes = useMemo(() => {
    const startNode = {
      id: "node-start",
      lp: 0.08,
      tp: 0.5,
      icon: "🏁",
      label: "START",
      type: "start",
    };

    return [startNode, ...buildRiddleNodes(questions)];
  }, [questions]);

  useEffect(() => {
    drawPaths();
  }, [nodes]);

  useEffect(() => {
    setPaths((prevPaths) =>
      prevPaths.map((path, i) => ({
        ...path,
        lit: i < solvedCount,
      })),
    );
  }, [solvedCount]);

  const drawPaths = () => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return;

    const newPaths = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const x1 = a.lp * 1000;
      const y1 = a.tp * 500;
      const x2 = b.lp * 1000;
      const y2 = b.tp * 500;
      const cx = (x1 + x2) / 2;
      const curveBias = ((i % 2 === 0 ? -1 : 1) * (28 + (i % 3) * 14));
      const cy = (y1 + y2) / 2 + curveBias;

      newPaths.push({
        id: `path-${i}`,
        d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
        lit: i < solvedCount,
      });
    }
    setPaths(newPaths);
  };

  const getNodeStatus = (node) => {
    if (node.type === "start") return "start-node";
    if (node.num <= solvedCount) return "solved";
    if (node.num === activeRiddle) return "active";
    return "locked";
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

  const totalRiddles = nodes.filter((node) => node.type === "riddle").length;
  const progressPercentage = totalRiddles > 0 ? (solvedCount / totalRiddles) * 100 : 0;

  const getStatusMessage = () => {
    const activeNode = nodes.find((n) => n.num === activeRiddle);
    if (!activeNode) {
      return totalRiddles > 0
        ? "// Quest complete! The treasure vault is unlocked."
        : "// No quest questions found. Ask admin to add questions.";
    }

    return `// ${activeNode.label} unlocked — ${activeNode.difficulty} zone is live`;
  };

  const getActiveHint = () => {
    const riddle = nodes.find((n) => n.num === activeRiddle);
    return riddle
      ? `🗝️ ${riddle.label} — ${riddle.difficulty} · Click the glowing node to view your riddle.`
      : "All riddles solved!";
  };

  return (
    <>
      <div className="map-header map-shell">
        <div className="map-header-left map-hud-block">
          <div className="map-header-title">Treasure Route Console</div>
          <div className="map-header-sub">{getStatusMessage()}</div>
        </div>

        <div className="map-hud-block map-hud-right">
          <div className="progress-bar-wrap">
            <span className="progress-label">Progress</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <span className="progress-label">
              {solvedCount}/{totalRiddles}
            </span>
          </div>

          <div className="map-chip-row">
            <span className="map-chip">Solved: {solvedCount}</span>
            <span className="map-chip">Active: {activeRiddle || "DONE"}</span>
          </div>

          <button className="btn-secondary map-exit-btn" onClick={onExit}>
            ⟵ Exit
          </button>
        </div>
      </div>

      <div className="map-shell">
        <div className="map-legend">
          <span className="legend-title">Legend</span>
          <span className="legend-item">
            <em className="legend-dot dot-active" /> Active
          </span>
          <span className="legend-item">
            <em className="legend-dot dot-solved" /> Solved
          </span>
          <span className="legend-item">
            <em className="legend-dot dot-locked" /> Locked
          </span>
        </div>
      </div>

      <div className="map-canvas map-shell" ref={canvasRef}>
        <svg className="map-svg" ref={svgRef} viewBox="0 0 1000 500" preserveAspectRatio="none">
          {paths.map((path) => (
            <path key={path.id} d={path.d} className={`path-line ${path.lit ? "lit" : ""}`} />
          ))}
        </svg>

        {nodes.map((node) => {
          const status = getNodeStatus(node);
          return (
            <div
              key={node.id}
              id={node.id}
              className={`map-node ${status}`}
              style={{
                left: `${node.lp * 100}%`,
                top: `${node.tp * 100}%`,
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="node-circle">{node.icon}</div>
              <div className="node-card">
                <div className="node-label">{node.label}</div>
                {node.num ? (
                  <div className="node-sub">Checkpoint {node.num}</div>
                ) : (
                  <div className="node-sub">Entry Gate</div>
                )}
              </div>
              {node.difficulty && (
                <div className={`node-badge ${getBadgeClass(node.difficulty)}`}>{node.difficulty}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="map-shell">
        <div className="map-hint-bar">
          <div className="map-hint-tag">ACTIVE NODE</div>
          <div className="map-hint-text">{getActiveHint()}</div>
        </div>
      </div>
    </>
  );
};

export default MapScreen;
