import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Stars from "./components/Stars";
import LandingScreen from "./components/LandingScreen";
import StartScreen from "./components/StartScreen";
import QuestScreen from "./components/QuestScreen";
import MapScreen from "./components/MapScreen";
import RiddleScreen from "./components/RiddleScreen";
import WinnerScreen from "./components/WinnerScreen";
import Timer from "./components/Timer";
import { gameApi } from "./services/gameApi";
import {
  getQuestDurationSeconds,
  getQuestStartAtMs,
} from "./utils/questTiming.js";

const GAME_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const PLAYER_SESSION_KEY = "treasurehunt_player_session";

const getPlayedQuestSessionKey = (playerId) =>
  `treasurehunt_played_quests_${String(playerId || "guest")}`;

const getPlayedQuestSetForSession = (playerId) => {
  try {
    const raw = sessionStorage.getItem(getPlayedQuestSessionKey(playerId));
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map((id) => String(id)).filter(Boolean));
  } catch {
    return new Set();
  }
};

const markQuestPlayedInSession = (playerId, questId) => {
  const safeQuestId = String(questId || "").trim();
  if (!safeQuestId) {
    return;
  }

  const playedSet = getPlayedQuestSetForSession(playerId);
  playedSet.add(safeQuestId);
  sessionStorage.setItem(
    getPlayedQuestSessionKey(playerId),
    JSON.stringify(Array.from(playedSet)),
  );
};

const toRoman = (num) => {
  const romans = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
  ];
  return romans[num - 1] || String(num);
};

const mapQuestionToRiddle = (question, index, total) => {
  const step = index + 1;
  const safeDifficulty = String(question.difficulty || "MEDIUM").toUpperCase();

  return {
    id: question.id,
    num: step,
    icon: ["📜", "🧩", "⚙️", "🔮", "💎", "🧭", "🏺", "🗝️", "📦", "🧠"][
      (step - 1) % 10
    ],
    title: question.title || `Riddle ${toRoman(step)}`,
    stage: `STAGE ${step} OF ${total}`,
    difficulty: safeDifficulty,
    riddle: question.riddleText || "Decode the challenge and unlock the path.",
    problem:
      question.problemStatement || "Solve the coding problem to proceed.",
    prevNum: Math.max(0, step - 1),
  };
};

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("screen-landing");
  const [solvedCount, setSolvedCount] = useState(0);
  const [activeRiddle, setActiveRiddle] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [currentRiddle, setCurrentRiddle] = useState(null);
  const [isSolvedRiddle, setIsSolvedRiddle] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [questTimeLimitSeconds, setQuestTimeLimitSeconds] = useState(3600);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [userDetails, setUserDetails] = useState({
    id: "",
    email: "",
    name: "",
    score: 0,
    currentLevel: 1,
    completedLevels: [],
  });
  const [quests, setQuests] = useState([]);
  const [selectedQuestId, setSelectedQuestId] = useState("");
  const [activeQuestId, setActiveQuestId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questLevelCounts, setQuestLevelCounts] = useState({});
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [questError, setQuestError] = useState("");
  const [shouldShowProfileModal, setShouldShowProfileModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLaunchingQuest, setIsLaunchingQuest] = useState(false);
  const [questLockNotice, setQuestLockNotice] = useState(null);
  const [riddleSubmitError, setRiddleSubmitError] = useState("");
  const [isSubmittingRiddle, setIsSubmittingRiddle] = useState(false);
  const [finalElapsedSeconds, setFinalElapsedSeconds] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showReplayWarning, setShowReplayWarning] = useState(false);
  const [pendingQuestLaunchId, setPendingQuestLaunchId] = useState("");
  const [replayWarningQuestName, setReplayWarningQuestName] = useState("");
  const [isBlockedByInvigilator, setIsBlockedByInvigilator] = useState(false);
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const hasAutoSubmittedRef = useRef(false);
  const socketRef = useRef(null);

  const isPlayerLoggedIn = Boolean(userDetails.email && userDetails.name);

  const handleBlockedByInvigilator = (message) => {
    setIsBlockedByInvigilator(true);
    setShowBlockedPopup(true);
    setRiddleSubmitError("");
    setSolvedCount(0);
    setFinalElapsedSeconds(null);
    setIsTimeExpired(false);
    goScreen("screen-winner");

    if (message) {
      console.warn(message);
    }
  };

  const autoSubmitQuestAttempt = async (reason = "timeout") => {
    if (isBlockedByInvigilator) {
      return;
    }

    if (hasAutoSubmittedRef.current) {
      return;
    }

    const questIdForSubmit = activeQuestId || selectedQuestId;
    if (!questIdForSubmit || !userDetails.id) {
      return;
    }

    hasAutoSubmittedRef.current = true;

    try {
      await gameApi.finalizeQuestAttempt(
        questIdForSubmit,
        userDetails.id,
        {
          reason,
          solvedCount,
          totalQuestions: questions.length,
          currentLevel: activeRiddle,
        },
        localStorage.getItem("player_token"),
      );
    } catch (error) {
      console.error("Failed to auto-submit quest attempt:", error);
      hasAutoSubmittedRef.current = false;
    }
  };

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(PLAYER_SESSION_KEY);
      if (!savedSession) return;

      const parsed = JSON.parse(savedSession);
      if (parsed?.email && parsed?.name) {
        setUserDetails({
          id: parsed.id || "",
          email: parsed.email,
          name: parsed.name,
          score: Number(parsed.score) || 0,
          currentLevel: Number(parsed.currentLevel) || 1,
          completedLevels: Array.isArray(parsed.completedLevels)
            ? parsed.completedLevels
            : [],
        });
        setCurrentScreen("screen-quest");
      }
    } catch {
      localStorage.removeItem(PLAYER_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoadingQuests(true);
        const response = await fetch(`${GAME_API_BASE}/game/quests`);
        const data = await response.json();
        const questList = Array.isArray(data) ? data : [];
        setQuests(questList);
        setSelectedQuestId((currentSelected) => {
          if (
            currentSelected &&
            questList.some((quest) => quest.id === currentSelected)
          ) {
            return currentSelected;
          }

          return questList[0]?.id || "";
        });
      } catch {
        setQuestError("Unable to load quests right now. Please try again.");
      } finally {
        setLoadingQuests(false);
      }
    };

    fetchQuests();

    const socket = io(GAME_API_BASE, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const currentRoomQuestId = String(activeQuestId || selectedQuestId || "").trim();
    if (currentRoomQuestId) {
      socket.emit("join-quest-room", currentRoomQuestId);
    }

    const syncQuestList = (payload = {}) => {
      if (payload.action === "deleted") {
        setQuests((prev) => {
          const next = prev.filter((quest) => quest.id !== payload.questId);
          setSelectedQuestId((currentSelected) => {
            if (currentSelected !== payload.questId) {
              return currentSelected;
            }

            return next[0]?.id || "";
          });
          return next;
        });
        return;
      }

      if (payload.quest) {
        setQuests((prev) => {
          const next = [
            ...prev.filter((quest) => quest.id !== payload.quest.id),
            payload.quest,
          ];
          next.sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          );
          return next;
        });

        setSelectedQuestId(
          (currentSelected) => currentSelected || payload.quest.id,
        );
      }
    };

    const onQuestLevelDistribution = (payload = {}) => {
      const payloadQuestId = String(payload.questId || "");
      const currentQuestId = String(activeQuestId || selectedQuestId || "");
      if (!payloadQuestId || !currentQuestId || payloadQuestId !== currentQuestId) {
        return;
      }

      const counts = Array.isArray(payload.counts) ? payload.counts : [];
      const nextCounts = {};
      counts.forEach((entry) => {
        const level = Number(entry.level);
        const players = Number(entry.players);
        if (Number.isFinite(level) && level > 0) {
          nextCounts[level] = Number.isFinite(players) && players > 0 ? players : 0;
        }
      });

      setQuestLevelCounts(nextCounts);
    };

    const onPlayerBlocked = (payload = {}) => {
      if (!payload?.isBlocked) {
        return;
      }

      const targetUserId = String(payload.userId || "");
      if (!targetUserId || targetUserId !== String(userDetails.id || "")) {
        return;
      }

      handleBlockedByInvigilator(
        payload.message || "You have been blocked by the invigilator due to UMF (Unfair Means).",
      );
    };

    socket.on("quest-changed", syncQuestList);
    socket.on("quest-level-distribution", onQuestLevelDistribution);
    socket.on("player-blocked", onPlayerBlocked);

    return () => {
      const previousRoomQuestId = String(activeQuestId || selectedQuestId || "").trim();
      if (previousRoomQuestId) {
        socket.emit("leave-quest-room", previousRoomQuestId);
      }
      socket.off("quest-changed", syncQuestList);
      socket.off("quest-level-distribution", onQuestLevelDistribution);
      socket.off("player-blocked", onPlayerBlocked);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [userDetails.id, activeQuestId, selectedQuestId]);

  // Timer effect
  useEffect(() => {
    if (startTime && !isTimeExpired && !isBlockedByInvigilator && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            void autoSubmitQuestAttempt("timeout");
            if (startTime) {
              setFinalElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
            }
            setIsTimeExpired(true);
            goScreen("screen-winner");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [startTime, isTimeExpired, isBlockedByInvigilator, timeRemaining, activeQuestId, selectedQuestId, userDetails.id, solvedCount, questions.length]);

  const goScreen = (screenId) => {
    setCurrentScreen(screenId);
    window.scrollTo(0, 0);
  };

  const goToStart = () => {
    if (isPlayerLoggedIn) {
      goScreen("screen-quest");
      return;
    }
    goScreen("screen-start");
  };

  const submitStartKey = async (email, password) => {
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch(`${GAME_API_BASE}/game/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setLoginError(
          payload?.error || "Login failed. Please check your details.",
        );
        setIsLoggingIn(false);
        return;
      }

      const player = payload?.player || {};
      const token = payload?.token || payload?.accessToken || "";
      const nextUser = {
        id: player.id || "",
        email: player.email || email,
        name: player.name || "",
        score: Number(player.score) || 0,
        currentLevel: Number(player.currentLevel) || 1,
        completedLevels: Array.isArray(player.completedLevels)
          ? player.completedLevels
          : [],
      };

      setUserDetails(nextUser);
      localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(nextUser));
      sessionStorage.setItem(
        getPlayedQuestSessionKey(nextUser.id),
        JSON.stringify([]),
      );

      // Save player token for API calls
      if (token) {
        localStorage.setItem("player_token", token);
      }

      setQuestError("");
      setShouldShowProfileModal(true);
      goScreen("screen-quest");
    } catch {
      setLoginError("Unable to connect right now. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const launchSelectedQuest = async (questId, options = {}) => {
    const skipReplayWarning = Boolean(options?.skipReplayWarning);
    const questToLaunch = questId || selectedQuestId;
    const questMeta =
      quests.find((quest) => quest.id === questToLaunch) || null;

    if (!questToLaunch) {
      setQuestError("Please select a quest before starting.");
      return;
    }

    if (!questMeta) {
      setQuestError(
        "Selected quest is no longer available. Please choose another quest.",
      );
      return;
    }

    const startAtMs = getQuestStartAtMs(questMeta);
    const nowMs = Date.now();
    const isLive = nowMs >= startAtMs;
    const questDurationSeconds = getQuestDurationSeconds(questMeta);

    if (!isLive) {
      setQuestLockNotice({
        questName: questMeta.name || "Selected quest",
        startAtMs,
      });
      return;
    }

    setQuestLockNotice(null);

    if (!skipReplayWarning) {
      const playedQuestSet = getPlayedQuestSetForSession(userDetails.id);
      if (playedQuestSet.has(String(questToLaunch))) {
        setPendingQuestLaunchId(String(questToLaunch));
        setReplayWarningQuestName(questMeta?.name || "this quest");
        setShowReplayWarning(true);
        return;
      }
    }

    if (questToLaunch !== selectedQuestId) {
      setSelectedQuestId(questToLaunch);
    }

    setIsLaunchingQuest(true);
    setQuestError("");
    setQuestLevelCounts({});

    try {
      const response = await fetch(
        `${GAME_API_BASE}/game/quests/${questToLaunch}/questions`,
      );
      const payload = await response.json();
      const questionList = Array.isArray(payload?.questions)
        ? payload.questions
        : [];

      if (questionList.length === 0) {
        setQuestError(
          "Selected quest has no questions yet. Ask admin to add questions.",
        );
        setIsLaunchingQuest(false);
        return;
      }

      const questIdForTimer = String(questToLaunch);
      const firstQuestion = questionList[0];
      if (firstQuestion) {
        try {
          await gameApi.startQuestionTimer(
            userDetails.id,
            Number(firstQuestion.level) || 1,
            questIdForTimer,
            localStorage.getItem("player_token"),
          );
        } catch (timerError) {
          if (String(timerError?.message || "").toLowerCase().includes("blocked by invigilator")) {
            handleBlockedByInvigilator(
              "You have been blocked by the invigilator due to UMF (Unfair Means).",
            );
            setIsLaunchingQuest(false);
            return;
          }
          console.error("Failed to initialize first question timer:", timerError);
        }
      }

      setQuestions(questionList);

      try {
        const distribution = await gameApi.getQuestLevelDistribution(questIdForTimer);
        const counts = Array.isArray(distribution?.counts) ? distribution.counts : [];
        const nextCounts = {};
        counts.forEach((entry) => {
          const level = Number(entry.level);
          const players = Number(entry.players);
          if (Number.isFinite(level) && level > 0) {
            nextCounts[level] = Number.isFinite(players) && players > 0 ? players : 0;
          }
        });
        setQuestLevelCounts(nextCounts);
      } catch (distributionError) {
        console.error("Failed to fetch quest level distribution:", distributionError);
      }
    } catch {
      setQuestError("Failed to load quest questions. Please retry.");
      setIsLaunchingQuest(false);
      return;
    }

    setStartTime(Date.now());
    setActiveQuestId(String(questToLaunch));
    setSolvedCount(0);
    setActiveRiddle(1);
    setTimeRemaining(questDurationSeconds);
    setQuestTimeLimitSeconds(questDurationSeconds);
    setIsTimeExpired(false);
    setFinalElapsedSeconds(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setIsLaunchingQuest(false);
    goScreen("screen-map");
    hasAutoSubmittedRef.current = false;
    markQuestPlayedInSession(userDetails.id, questToLaunch);

    if (socketRef.current) {
      socketRef.current.emit("join-quest-room", String(questToLaunch));
    }
  };

  const openRiddle = async (riddleNum, isSolved = false) => {
    const question = questions[riddleNum - 1];
    if (!question) return;

    const riddle = mapQuestionToRiddle(
      question,
      riddleNum - 1,
      questions.length,
    );
    setRiddleSubmitError("");
    setCurrentRiddle(riddle);
    setIsSolvedRiddle(isSolved);
    if (!isSolved) {
      setActiveRiddle(riddleNum);
    }
    goScreen("screen-riddle");
  };

  const submitRiddleKey = async (key) => {
    const submittedAnswer = String(key || "").trim();
    console.log("[submitRiddleKey] input", {
      questId: activeQuestId || selectedQuestId,
      questionId: questions[activeRiddle - 1]?.id || null,
      activeRiddle,
      submittedAnswer,
    });

    if (!submittedAnswer) {
      setRiddleSubmitError("Please enter an answer.");
      return;
    }

    const currentQuestion = questions[activeRiddle - 1];
    if (!currentQuestion || !selectedQuestId) {
      setRiddleSubmitError("Question context is missing. Please return to map and retry.");
      return;
    }

    setIsSubmittingRiddle(true);
    setRiddleSubmitError("");

    try {
      const questIdForValidation = activeQuestId || selectedQuestId;

      if (!questIdForValidation) {
        setRiddleSubmitError("Quest context is missing. Please return to quest lobby and start again.");
        setIsSubmittingRiddle(false);
        return;
      }

      const validation = await gameApi.submitAnswer(
        questIdForValidation,
        currentQuestion.id,
        submittedAnswer,
        localStorage.getItem("player_token"),
        userDetails.id,
      );

      if (!validation?.isCorrect) {
        setRiddleSubmitError("Incorrect answer. Please check your output and try again.");
        setIsSubmittingRiddle(false);
        return;
      }

      try {
        await gameApi.updateProgress(
          userDetails.id,
          questIdForValidation,
          currentQuestion.id,
          currentQuestion.level || activeRiddle,
          Number(currentQuestion.score) || 10,
          localStorage.getItem("player_token"),
        );
      } catch (progressError) {
        console.error("Progress update failed after correct answer:", progressError);
      }

      setSolvedCount((prev) => prev + 1);

      if (activeRiddle >= questions.length) {
        showWinner();
      } else {
        setActiveRiddle((prev) => prev + 1);
        goScreen("screen-map");
      }
    } catch (error) {
      console.error("Answer validation failed:", error);
      if (String(error?.message || "").toLowerCase().includes("blocked by invigilator")) {
        handleBlockedByInvigilator(
          "You have been blocked by the invigilator due to UMF (Unfair Means).",
        );
      } else {
        setRiddleSubmitError(error?.message || "Unable to validate answer right now.");
      }
    } finally {
      setIsSubmittingRiddle(false);
    }
  };

  const showWinner = () => {
    if (startTime) {
      setFinalElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }
    goScreen("screen-winner");
  };

  const resetGame = () => {
    setCurrentScreen("screen-quest");
    setSolvedCount(0);
    setActiveRiddle(0);
    setStartTime(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setTimeRemaining(3600);
    setQuestTimeLimitSeconds(3600);
    setIsTimeExpired(false);
    setFinalElapsedSeconds(null);
    setQuestions([]);
    setQuestLevelCounts({});
    setActiveQuestId("");
    setQuestError("");
    setLoginError("");
    setIsLaunchingQuest(false);
    setQuestLockNotice(null);
    setShowExitConfirm(false);
    setShowReplayWarning(false);
    setPendingQuestLaunchId("");
    setReplayWarningQuestName("");
    setIsBlockedByInvigilator(false);
    setShowBlockedPopup(false);
    hasAutoSubmittedRef.current = false;
  };

  const handleRequestExitQuest = () => {
    setShowExitConfirm(true);
  };

  const handleCancelExitQuest = () => {
    setShowExitConfirm(false);
  };

  const handleConfirmExitQuest = () => {
    if (socketRef.current) {
      const questRoomId = String(activeQuestId || selectedQuestId || "").trim();
      if (questRoomId) {
        socketRef.current.emit("leave-quest-room", questRoomId);
      }
    }
    resetGame();
  };

  const handleCancelReplayWarning = () => {
    setShowReplayWarning(false);
    setPendingQuestLaunchId("");
    setReplayWarningQuestName("");
  };

  const handleConfirmReplayWarning = () => {
    const nextQuestId = pendingQuestLaunchId || selectedQuestId;
    setShowReplayWarning(false);
    setPendingQuestLaunchId("");
    setReplayWarningQuestName("");
    if (nextQuestId) {
      void launchSelectedQuest(nextQuestId, { skipReplayWarning: true });
    }
  };

  const handleBackToLanding = () => {
    goScreen("screen-landing");
  };

  const handleLogout = () => {
    if (socketRef.current) {
      const questRoomId = String(activeQuestId || selectedQuestId || "").trim();
      if (questRoomId) {
        socketRef.current.emit("leave-quest-room", questRoomId);
      }
    }
    localStorage.removeItem(PLAYER_SESSION_KEY);
    setUserDetails({
      id: "",
      email: "",
      name: "",
      score: 0,
      currentLevel: 1,
      completedLevels: [],
    });
    setSelectedQuestId("");
    setActiveQuestId("");
    setQuestions([]);
    setQuestLevelCounts({});
    setSolvedCount(0);
    setActiveRiddle(0);
    setStartTime(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setTimeRemaining(3600);
    setIsTimeExpired(false);
    setFinalElapsedSeconds(null);
    setQuestError("");
    setLoginError("");
    setIsLaunchingQuest(false);
    setQuestLockNotice(null);
    setIsBlockedByInvigilator(false);
    setShowBlockedPopup(false);
    hasAutoSubmittedRef.current = false;
    goScreen("screen-landing");
  };

  const handleBackToMap = () => {
    goScreen("screen-map");
  };

  return (
    <>
      <Stars />

      <section
        className={`screen ${currentScreen === "screen-landing" ? "active" : ""}`}
        id="screen-landing"
      >
        <LandingScreen onStart={goToStart} />
      </section>

      <section
        className={`screen ${currentScreen === "screen-start" ? "active" : ""}`}
        id="screen-start"
      >
        <StartScreen
          onSubmit={submitStartKey}
          onBack={handleBackToLanding}
          loginError={loginError}
          isLoggingIn={isLoggingIn}
        />
      </section>

      <section
        className={`screen ${currentScreen === "screen-quest" ? "active" : ""}`}
        id="screen-quest"
      >
        <QuestScreen
          userDetails={userDetails}
          quests={quests}
          selectedQuestId={selectedQuestId}
          onQuestChange={setSelectedQuestId}
          loadingQuests={loadingQuests}
          questError={questError}
          isLaunching={isLaunchingQuest}
          onOpenQuest={launchSelectedQuest}
          onLogout={handleLogout}
          shouldShowProfileModal={shouldShowProfileModal}
          onProfileModalShown={() => setShouldShowProfileModal(false)}
          questLockNotice={questLockNotice}
          onCloseQuestLockNotice={() => setQuestLockNotice(null)}
        />
      </section>

      <section
        className={`screen ${currentScreen === "screen-map" ? "active" : ""}`}
        id="screen-map"
      >
        <>
          <Timer timeRemaining={timeRemaining} isTimeExpired={isTimeExpired} />
          <MapScreen
            solvedCount={solvedCount}
            activeRiddle={activeRiddle}
            onNodeClick={openRiddle}
            onExit={handleRequestExitQuest}
            questions={questions}
            levelCounts={questLevelCounts}
          />
        </>
      </section>

      <section
        className={`screen ${currentScreen === "screen-riddle" ? "active" : ""}`}
        id="screen-riddle"
      >
        <>
          <Timer timeRemaining={timeRemaining} isTimeExpired={isTimeExpired} />
          <RiddleScreen
            riddle={currentRiddle}
            isSolved={isSolvedRiddle}
            onSubmit={submitRiddleKey}
            onBack={handleBackToMap}
            submissionError={riddleSubmitError}
            isSubmitting={isSubmittingRiddle}
          />
        </>
      </section>

      <section
        className={`screen ${currentScreen === "screen-winner" ? "active" : ""}`}
        id="screen-winner"
      >
        <WinnerScreen
          onReset={resetGame}
          onExit={resetGame}
          animation={true}
          isTimeExpired={isTimeExpired}
          isBlockedByInvigilator={isBlockedByInvigilator}
          finalElapsedSeconds={finalElapsedSeconds}
          questTimeLimitSeconds={questTimeLimitSeconds}
          userDetails={userDetails}
          solvedCount={solvedCount}
          totalRiddles={questions.length}
        />
      </section>

      {showBlockedPopup && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="blocked-popup-title">
          <div className="profile-modal exit-confirm-modal anim-reveal">
            <div className="exit-confirm-heading" id="blocked-popup-title">Blocked by Invigilator</div>
            <p className="exit-confirm-message">
              You have been blocked by the invigilator due to UMF (Unfair Means). You are disqualified and out of this competition.
            </p>
            <div className="exit-confirm-actions">
              <button className="btn-primary" onClick={() => setShowBlockedPopup(false)}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplayWarning && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="replay-warning-title">
          <div className="profile-modal exit-confirm-modal anim-reveal">
            <div className="exit-confirm-heading" id="replay-warning-title">Warning: Quest Already Played</div>
            <p className="exit-confirm-message">
              You have already played {replayWarningQuestName || "this quest"} in this login session.
              If you play it again, your current stats may reset and it can affect your ranking.
              Do you still want to continue?
            </p>
            <div className="exit-confirm-actions">
              <button className="btn-primary" onClick={handleConfirmReplayWarning}>
                Yes, Play Again
              </button>
              <button className="btn-secondary" onClick={handleCancelReplayWarning}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
          <div className="profile-modal exit-confirm-modal anim-reveal">
            <div className="exit-confirm-heading" id="exit-confirm-title">Are You Sure to Exit?</div>
            <p className="exit-confirm-message">
              If you exit now, this active quest attempt will be closed and your current run data may be cleared.
              Recorded results are saved separately. Do you want to continue?
            </p>
            <div className="exit-confirm-actions">
              <button className="btn-primary" onClick={handleConfirmExitQuest}>
                Yes, Exit
              </button>
              <button className="btn-secondary" onClick={handleCancelExitQuest}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default App;
