import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { gameApi } from "../services/gameApi";

const formatTimestamp = (value) => {
  if (!value) {
    return "-";
  }

  if (typeof value === "object" && value !== null) {
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString();
    }

    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString();
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "-";
  }

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
};

const RANK_MEDAL_IMAGES = {
  1: "/1%20price.png",
  2: "/2%20price.png",
  3: "/3%20price.png",
};

function RankingScreen({ questId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadRanking = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await gameApi.getQuestRanking(questId);
        if (!isMounted) {
          return;
        }
        setPayload(data);
      } catch (rankingError) {
        if (!isMounted) {
          return;
        }
        setError(rankingError?.message || "Failed to load ranking.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (questId) {
      loadRanking();
    } else {
      setLoading(false);
      setError("Missing quest id in ranking link.");
    }

    return () => {
      isMounted = false;
    };
  }, [questId]);

  const rankingRows = useMemo(() => {
    return Array.isArray(payload?.rankings) ? payload.rankings : [];
  }, [payload]);

  const completionRows = useMemo(() => {
    if (!selectedParticipant) {
      return [];
    }

    const questionTimes = selectedParticipant.questionCompletionSeconds || {};
    const isIndexedArray = Array.isArray(questionTimes);

    return Object.entries(questionTimes)
      .map(([level, seconds]) => ({
        level: isIndexedArray ? Number(level) + 1 : Number(level),
        seconds: Number(seconds) || 0,
      }))
      .filter((row) => Number.isFinite(row.level) && row.level > 0)
      .sort((a, b) => a.level - b.level);
  }, [selectedParticipant]);

  const quest = payload?.quest || null;
  const summary = payload?.summary || { participantCount: 0, completedCount: 0 };

  return (
    <section className="screen ranking-screen active" id="screen-ranking">
      <div className="ranking-shell panel">
        <div className="ranking-hero">
          <div className="ranking-kicker">Quest Leaderboard</div>
          <h1 className="ranking-title">{quest?.name || "Quest Ranking"}</h1>
          <p className="ranking-subtitle">
            {quest?.description || "Quest-wide results are shown here for direct sharing."}
          </p>

          <div className="ranking-meta">
            <span className="ranking-pill">{quest?.code || "No Code"}</span>
            <span className="ranking-pill">{summary.participantCount} participants</span>
            <span className="ranking-pill">{summary.completedCount} completed</span>
            <span className="ranking-pill">{quest?.totalQuestions || 0} questions</span>
          </div>
        </div>

        <div className="ranking-body">
          <div className="ranking-toolbar">
            <button className="btn btn-secondary ranking-back" type="button" onClick={onBack}>
              Back
            </button>
          </div>

          {loading ? (
            <div className="ranking-state">Loading ranking...</div>
          ) : error ? (
            <div className="ranking-state ranking-state-error">{error}</div>
          ) : rankingRows.length === 0 ? (
            <div className="ranking-state">No progress has been recorded for this quest yet.</div>
          ) : (
            <div className="ranking-list">
              {rankingRows.map((row) => (
                <article
                  key={row.userId}
                  className={`ranking-card ranking-card-clickable rank-${Math.min(row.rank, 3)}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for ${row.name}`}
                  onClick={() => setSelectedParticipant(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedParticipant(row);
                    }
                  }}
                >
                  <div className="ranking-card-left">
                    {RANK_MEDAL_IMAGES[row.rank] ? (
                      <div className="ranking-rank-badge">
                        <img
                          src={RANK_MEDAL_IMAGES[row.rank]}
                          alt={`Rank ${row.rank} medal`}
                          className="ranking-rank-medal"
                        />
                        <span className="ranking-rank-label">#{row.rank}</span>
                      </div>
                    ) : (
                      <div className="ranking-rank">#{row.rank}</div>
                    )}
                    <div>
                      <h2>{row.name}</h2>
                      <p>{row.email || "No email available"}</p>
                    </div>
                  </div>

                  <div className="ranking-card-right">
                    <div>
                      <span>Total Score</span>
                      <strong>{Number(row.totalScore) || 0}</strong>
                    </div>
                    <div>
                      <span>Map Score</span>
                      <strong>{Number(row.mapScore) || 0}</strong>
                    </div>
                    <div>
                      <span>Hacker Rank Score</span>
                      <strong>{Number(row.hackerRankScore) || 0}</strong>
                    </div>
                    <div>
                      <span>Solved</span>
                      <strong>{row.solvedQuestions}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {selectedParticipant && (
          <div className="ranking-modal-backdrop" onClick={() => setSelectedParticipant(null)}>
            <div className="ranking-modal" onClick={(event) => event.stopPropagation()}>
              <div className="ranking-modal-header">
                <h3>Participant Details</h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedParticipant(null)}
                >
                  Close
                </button>
              </div>

              <div className="ranking-modal-grid">
                <div className="ranking-info-card">
                  <h4>Profile</h4>
                  <p><strong>Name:</strong> {selectedParticipant.name || "Unknown player"}</p>
                  <p><strong>Email:</strong> {selectedParticipant.email || "-"}</p>
                  <p><strong>User ID:</strong> {selectedParticipant.userId || "-"}</p>
                  {RANK_MEDAL_IMAGES[selectedParticipant.rank] ? (
                    <div className="ranking-profile-rank ranking-profile-rank-medal">
                      <img
                        src={RANK_MEDAL_IMAGES[selectedParticipant.rank]}
                        alt={`Rank ${selectedParticipant.rank} medal`}
                        className="ranking-profile-rank-image"
                      />
                      <p><strong>Rank:</strong> #{selectedParticipant.rank}</p>
                    </div>
                  ) : (
                    <p><strong>Rank:</strong> #{selectedParticipant.rank}</p>
                  )}
                </div>

                <div className="ranking-info-card">
                  <h4>Progress</h4>
                  <p><strong>Total Score:</strong> {Number(selectedParticipant.totalScore) || 0}</p>
                  <p><strong>Map Score:</strong> {Number(selectedParticipant.mapScore) || 0}</p>
                  <p><strong>Hacker Rank Score:</strong> {Number(selectedParticipant.hackerRankScore) || 0}</p>
                  <p><strong>Solved Questions:</strong> {Number(selectedParticipant.solvedQuestions) || 0}</p>
                  <p><strong>Current Level:</strong> {Number(selectedParticipant.currentLevel) || 0}</p>
                  <p><strong>Total Time:</strong> {formatSeconds(Number(selectedParticipant.totalCompletionSeconds))}</p>
                </div>

                <div className="ranking-info-card">
                  <h4>Activity</h4>
                  <p><strong>Quest Start:</strong> {formatTimestamp(selectedParticipant.questStartTime)}</p>
                  <p><strong>Question Start:</strong> {formatTimestamp(selectedParticipant.questionStartTime)}</p>
                  <p><strong>Last Active:</strong> {formatTimestamp(selectedParticipant.lastActive)}</p>
                  <p><strong>Progress Updated:</strong> {formatTimestamp(selectedParticipant.progressUpdatedAt)}</p>
                </div>

                <div className="ranking-info-card">
                  <h4>Completed Levels</h4>
                  {Array.isArray(selectedParticipant.completedQuestionLevels) && selectedParticipant.completedQuestionLevels.length > 0 ? (
                    <div className="levels-passed">
                      {selectedParticipant.completedQuestionLevels.map((level) => (
                        <span key={`level-${selectedParticipant.userId}-${level}`} className="level-badge-simple">
                          L{level}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>No completed levels yet.</p>
                  )}
                </div>
              </div>

              <div className="ranking-time-breakdown">
                <h4>Question Completion Time</h4>
                {completionRows.length === 0 ? (
                  <p>No per-question completion timings available.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="users-table ranking-breakdown-table">
                      <thead>
                        <tr>
                          <th>Level</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completionRows.map((row) => (
                          <tr key={`completion-${selectedParticipant.userId}-${row.level}`}>
                            <td>L{row.level}</td>
                            <td>{formatSeconds(row.seconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

RankingScreen.propTypes = {
  questId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default RankingScreen;