import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  formatCountdownLabel,
  formatDateTimeLabel,
} from "../utils/questTiming.js";

const QuestScreen = ({
  userDetails,
  quests = [],
  selectedQuestId = "",
  onQuestChange,
  loadingQuests = false,
  questError = "",
  isLaunching = false,
  onOpenQuest,
  onLogout,
  shouldShowProfileModal = false,
  onProfileModalShown = () => {},
  questLockNotice = null,
  onCloseQuestLockNotice = () => {},
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [lockNowMs, setLockNowMs] = useState(Date.now());
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (shouldShowProfileModal && !showProfileModal) {
      setShowProfileModal(true);
      onProfileModalShown();
    }
  }, [shouldShowProfileModal, showProfileModal, onProfileModalShown]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileModal(false);
      }
    };

    if (showProfileModal) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileModal]);

  useEffect(() => {
    if (!questLockNotice) {
      return;
    }

    setLockNowMs(Date.now());
    const timer = setInterval(() => {
      setLockNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [questLockNotice]);

  const userInitial = useMemo(() => {
    return (
      String(userDetails?.name || "?")
        .trim()
        .charAt(0)
        .toUpperCase() || "?"
    );
  }, [userDetails]);

  const lockStartAtMs = Number(questLockNotice?.startAtMs) || 0;
  const lockSecondsLeft = Math.max(
    0,
    Math.ceil((lockStartAtMs - lockNowMs) / 1000),
  );
  const lockIsLive = lockSecondsLeft === 0;

  return (
    <>
      <div className="panel anim-reveal quest-dashboard-panel">
        <div className="quest-topbar">
          <div className="profile-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="account-chip"
              onClick={() => setShowProfileModal((prev) => !prev)}
            >
              <span className="account-initial">{userInitial}</span>
            </button>

            {showProfileModal && (
              <div className="profile-dropdown anim-dropdown-open">
                <div className="profile-dropdown-header">
                  <div className="profile-avatar profile-avatar-dropdown">
                    {userInitial}
                  </div>
                  <div className="profile-dropdown-info">
                    <div className="profile-dropdown-name">
                      {userDetails?.name || "Unknown"}
                    </div>
                    <div className="profile-dropdown-email">
                      {userDetails?.email || "-"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>

        <div className="panel-title">🗺️ &nbsp;Quest Lobby</div>
        <div className="panel-sub">
          Welcome,{" "}
          <strong style={{ color: "var(--gold)" }}>{userDetails?.name}</strong>{" "}
          ({userDetails?.email}). Please select a quest card below to continue.
        </div>

        <div className="quest-grid">
          {loadingQuests && (
            <div className="quest-empty">Loading quests...</div>
          )}

          {!loadingQuests && quests.length === 0 && (
            <div className="quest-empty">No quests available right now.</div>
          )}

          {!loadingQuests &&
            quests.map((quest) => {
              const isSelected = selectedQuestId === quest.id;

              return (
                <div
                  key={quest.id}
                  className={`quest-card ${isSelected ? "active" : ""}`}
                >
                  <div className="quest-card-top">
                    <div>
                      <div className="quest-card-title">{quest.name}</div>
                      <div className="quest-card-subtitle">
                        {quest.code ? `Code: ${quest.code}` : "Treasure Quest"}
                      </div>
                    </div>
                    <span className="quest-badge">QUEST</span>
                  </div>

                  <div className="quest-card-desc">
                    {quest.description ||
                      "Complete this quest to unlock all checkpoints and reach the treasure."}
                  </div>

                  <div className="quest-card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => onQuestChange?.(quest.id)}
                      disabled={isLaunching}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => onOpenQuest?.(quest.id)}
                      disabled={isLaunching}
                    >
                      {isLaunching && isSelected
                        ? "⏳ Starting..."
                        : "Start Quest"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="error-msg">{questError}</div>
      </div>

      {questLockNotice && (
        <div className="modal-overlay" onClick={onCloseQuestLockNotice}>
          <div
            className="profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-modal-title">Quest Locked</div>
            <div
              className="profile-name"
              style={{ fontSize: "1.1rem", marginBottom: "0.45rem" }}
            >
              {questLockNotice.questName}
            </div>
            <div className="profile-detail-list" style={{ marginTop: 0 }}>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Status</span>
                <span className="profile-detail-value">
                  {lockIsLive ? "Live now" : "Not live yet"}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Opens In</span>
                <span className="profile-detail-value">
                  {formatCountdownLabel(lockSecondsLeft)}
                </span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Live At</span>
                <span className="profile-detail-value">
                  {formatDateTimeLabel(lockStartAtMs)}
                </span>
              </div>
            </div>
            <div className="btn-group" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                onClick={onCloseQuestLockNotice}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestScreen;
