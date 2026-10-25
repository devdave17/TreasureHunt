import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import HorrorAtmosphere from "./components/HorrorAtmosphere";
import HauntDialog from "./components/HauntDialog";
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
  getQuestEndAtMs,
  getQuestStartAtMs,
} from "./utils/questTiming.js";

const GAME_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const PLAYER_SESSION_KEY = "treasurehunt_player_session";
const ACTIVE_QUEST_SESSION_KEY = "treasurehunt_active_quest";

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
    inputKey: question.inputKey || "",
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
  const [timerEndAtMs, setTimerEndAtMs] = useState(null);
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
  const isRecoveringQuestRef = useRef(false);
  const serverClockRef = useRef(null);

  const isPlayerLoggedIn = Boolean(userDetails.email && userDetails.name);

  const syncServerClock = (
    serverNowMs,
    clientRequestSentAtMs = Date.now(),
    clientResponseReceivedAtMs = Date.now(),
  ) => {
    const parsedServerNowMs = Number(serverNowMs);
    if (!Number.isFinite(parsedServerNowMs)) {
      return;
    }

    const requestSentMs = Number(clientRequestSentAtMs);
    const responseReceivedMs = Number(clientResponseReceivedAtMs);
    const roundTripMs =
      Number.isFinite(requestSentMs) &&
      Number.isFinite(responseReceivedMs) &&
      responseReceivedMs >= requestSentMs
        ? responseReceivedMs - requestSentMs
        : 0;
    const estimatedServerNowMs =
      parsedServerNowMs + Math.min(roundTripMs / 2, 2000);

    serverClockRef.current = {
      serverNowMs: estimatedServerNowMs,
      performanceNowMs: performance.now(),
    };
  };

  const getEffectiveServerNowMs = () => {
    const clock = serverClockRef.current;
    if (!clock) {
      return Date.now();
    }

    return clock.serverNowMs + (performance.now() - clock.performanceNowMs);
  };

  const refreshQuestLevelDistribution = async (questId, fallbackLevel = 0) => {
    const normalizedQuestId = String(questId || "").trim();
    if (!normalizedQuestId) {
      return;
    }

    try {
      const distribution =
        await gameApi.getQuestLevelDistribution(normalizedQuestId);
      const counts = Array.isArray(distribution?.counts)
        ? distribution.counts
        : [];
      const nextCounts = {};

      counts.forEach((entry) => {
        const level = Number(entry.level);
        const players = Number(entry.players);
        if (Number.isFinite(level) && level > 0) {
          nextCounts[level] =
            Number.isFinite(players) && players > 0 ? players : 0;
        }
      });

      const hasActivePlayers = Object.values(nextCounts).some(
        (count) => Number(count) > 0,
      );
      if (!hasActivePlayers && Number(fallbackLevel) > 0) {
        nextCounts[Number(fallbackLevel)] = 1;
      }

      setQuestLevelCounts(nextCounts);
    } catch (error) {
      console.error("Failed to refresh quest level distribution:", error);
    }
  };

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

  const recoverActiveQuest = async () => {
    const storedQuestId = String(
      localStorage.getItem(ACTIVE_QUEST_SESSION_KEY) || "",
    ).trim();
    const questId = String(activeQuestId || storedQuestId).trim();

    if (
      !questId ||
      !userDetails.id ||
      isRecoveringQuestRef.current ||
      currentScreen === "screen-winner"
    ) {
      return;
    }

    const questMeta = quests.find((quest) => String(quest.id) === questId);
    if (!questMeta) {
      return;
    }

    isRecoveringQuestRef.current = true;

    try {
      const progressResponse = await gameApi.getUserProgress(
        userDetails.id,
        questId,
        localStorage.getItem("player_token"),
      );
      syncServerClock(
        progressResponse?.serverNowMs,
        progressResponse?.clientRequestSentAtMs,
        progressResponse?.clientResponseReceivedAtMs,
      );
      const progress = progressResponse?.progress;

      if (!progress || progress.isSubmitted || progress.status === "submitted") {
        localStorage.removeItem(ACTIVE_QUEST_SESSION_KEY);
        return;
      }

      const questionsResponse = await fetch(
        `${GAME_API_BASE}/game/quests/${encodeURIComponent(questId)}/questions`,
      );
      const questionsPayload = await questionsResponse.json();
      const questionList = Array.isArray(questionsPayload?.questions)
        ? questionsPayload.questions
        : [];

      const nextEndAtMs = getQuestEndAtMs(questMeta);
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((nextEndAtMs - getEffectiveServerNowMs()) / 1000),
      );
      const completedLevels = Array.isArray(progress.completedQuestionLevels)
        ? progress.completedQuestionLevels
        : [];
      const completedLevelNumbers = new Set(
        completedLevels
          .map((entry) =>
            entry && typeof entry === "object"
              ? Number(entry.questionLevel || entry.level || entry.currentLevel)
              : Number(entry),
          )
          .filter((level) => Number.isFinite(level) && level > 0),
      );
      const nextLevel = Math.max(1, completedLevelNumbers.size + 1);

      setQuestions(questionList);
      setSelectedQuestId(questId);
      setActiveQuestId(questId);
      setActiveRiddle(Math.min(nextLevel, Math.max(questionList.length, 1)));
      setSolvedCount(completedLevelNumbers.size);
      const recoveredAttemptStartedAt = progress.attemptStartedAt
        ? Date.parse(progress.attemptStartedAt)
        : Date.now();
      setStartTime(
        Number.isFinite(recoveredAttemptStartedAt)
          ? recoveredAttemptStartedAt
          : Date.now(),
      );
      setTimerEndAtMs(nextEndAtMs);
      setTimeRemaining(nextRemainingSeconds);
      setQuestTimeLimitSeconds(
        Math.max(0, Math.ceil((nextEndAtMs - getQuestStartAtMs(questMeta)) / 1000)),
      );
      setIsTimeExpired(false);
      setFinalElapsedSeconds(null);
      setCurrentRiddle(null);
      setIsSolvedRiddle(false);
      hasAutoSubmittedRef.current = false;
      await refreshQuestLevelDistribution(questId, nextLevel);

      if (socketRef.current) {
        socketRef.current.emit("join-quest-room", questId);
        socketRef.current.emit("resume-quest-room", questId);
      }

      goScreen("screen-map");
    } catch (error) {
      console.error("Failed to recover active quest:", error);
    } finally {
      isRecoveringQuestRef.current = false;
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

    const onSocketConnect = () => {
      if (userDetails.id) {
        socket.emit("identify-player", String(userDetails.id));
      }
      const questId = String(activeQuestId || selectedQuestId || "").trim();
      if (questId) {
        socket.emit("join-quest-room", questId);
        if (activeQuestId) {
          socket.emit("resume-quest-room", activeQuestId);
          void refreshQuestLevelDistribution(questId, activeRiddle);
        }
      }
      void recoverActiveQuest();
    };

    if (userDetails.id) {
      socket.emit("identify-player", String(userDetails.id));
    }

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

    const onQuestTimerUpdated = (payload = {}) => {
      const payloadQuestId = String(payload.questId || "");
      if (
        !payloadQuestId ||
        payloadQuestId !== String(activeQuestId || "") ||
        !Number.isFinite(Number(payload.timerEndAtMs))
      ) {
        return;
      }

      const nextEndAtMs = Number(payload.timerEndAtMs);
      syncServerClock(payload.serverNowMs);
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((nextEndAtMs - getEffectiveServerNowMs()) / 1000),
      );
      setTimerEndAtMs(nextEndAtMs);
      setQuestTimeLimitSeconds(
        Math.max(
          0,
          Math.ceil(
            (nextEndAtMs - Number(payload.startAtMs || Date.now())) / 1000,
          ),
        ),
      );
      setTimeRemaining(nextRemainingSeconds);
      setIsTimeExpired(nextRemainingSeconds === 0);

      if (nextRemainingSeconds === 0) {
        void autoSubmitQuestAttempt("timeout");
        setFinalElapsedSeconds(
          Math.max(
            0,
            Math.floor(
              (getEffectiveServerNowMs() - (startTime || getEffectiveServerNowMs())) /
                1000,
            ),
          ),
        );
        goScreen("screen-winner");
      }
    };

    socket.on("quest-changed", syncQuestList);
    socket.on("quest-level-distribution", onQuestLevelDistribution);
    socket.on("player-blocked", onPlayerBlocked);
    socket.on("quest-timer-updated", onQuestTimerUpdated);
    socket.on("connect", onSocketConnect);

    return () => {
      const previousRoomQuestId = String(activeQuestId || selectedQuestId || "").trim();
      if (previousRoomQuestId) {
        socket.emit("leave-quest-room", previousRoomQuestId);
      }
      socket.off("quest-changed", syncQuestList);
      socket.off("quest-level-distribution", onQuestLevelDistribution);
      socket.off("player-blocked", onPlayerBlocked);
      socket.off("quest-timer-updated", onQuestTimerUpdated);
      socket.off("connect", onSocketConnect);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  // Socket handlers intentionally capture the quest session at subscription time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails.id, activeQuestId, selectedQuestId]);

  useEffect(() => {
    if (userDetails.id && quests.length > 0 && !activeQuestId) {
      void recoverActiveQuest();
    }
  // Recovery is triggered only when the authenticated quest list becomes available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails.id, quests, activeQuestId]);

  useEffect(() => {
    const isActiveQuestScreen =
      activeQuestId &&
      (currentScreen === "screen-map" || currentScreen === "screen-riddle");

    if (!isActiveQuestScreen) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue =
        "Your current quest progress may be lost if you refresh or leave this page.";
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeQuestId, currentScreen]);

  useEffect(() => {
    if (!timerEndAtMs || isBlockedByInvigilator) {
      return undefined;
    }

    const syncTimerFromClock = () => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((timerEndAtMs - getEffectiveServerNowMs()) / 1000),
      );
      setTimeRemaining(nextRemainingSeconds);

      if (nextRemainingSeconds === 0 && !isTimeExpired) {
        void autoSubmitQuestAttempt("timeout");
        if (startTime) {
          setFinalElapsedSeconds(
            Math.max(
              0,
              Math.floor((getEffectiveServerNowMs() - startTime) / 1000),
            ),
          );
        }
        setIsTimeExpired(true);
        goScreen("screen-winner");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTimerFromClock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", syncTimerFromClock);
    window.addEventListener("pageshow", syncTimerFromClock);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", syncTimerFromClock);
      window.removeEventListener("pageshow", syncTimerFromClock);
    };
  // Timer visibility handlers intentionally use the active timer snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timerEndAtMs,
    isBlockedByInvigilator,
    isTimeExpired,
    startTime,
  ]);

  // Timer effect
  useEffect(() => {
    if (timerEndAtMs && !isTimeExpired && !isBlockedByInvigilator) {
      const timer = setInterval(() => {
        const nextRemainingSeconds = Math.max(
          0,
          Math.ceil((timerEndAtMs - getEffectiveServerNowMs()) / 1000),
        );
        setTimeRemaining(nextRemainingSeconds);

        if (nextRemainingSeconds === 0) {
          void autoSubmitQuestAttempt("timeout");
          if (startTime) {
            setFinalElapsedSeconds(
              Math.max(
                0,
                Math.floor((getEffectiveServerNowMs() - startTime) / 1000),
              ),
            );
          }
          setIsTimeExpired(true);
          goScreen("screen-winner");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  // The interval is recreated when the timer state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerEndAtMs, isTimeExpired, isBlockedByInvigilator, startTime]);

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

    let timerEndAtMsForLaunch = getQuestEndAtMs(questMeta);
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
          const timerResponse = await gameApi.startQuestionTimer(
            userDetails.id,
            Number(firstQuestion.level) || 1,
            questIdForTimer,
            localStorage.getItem("player_token"),
          );
          if (Number.isFinite(Number(timerResponse?.timerEndAtMs))) {
            timerEndAtMsForLaunch = Number(timerResponse.timerEndAtMs);
          }
          syncServerClock(
            timerResponse?.serverNowMs,
            timerResponse?.clientRequestSentAtMs,
            timerResponse?.clientResponseReceivedAtMs,
          );

          if (timerResponse?.isTimeExpired) {
            setQuestError("This quest has already ended.");
            setIsLaunchingQuest(false);
            return;
          }
        } catch (timerError) {
          if (String(timerError?.message || "").toLowerCase().includes("blocked by invigilator")) {
            handleBlockedByInvigilator(
              "You have been blocked by the invigilator due to UMF (Unfair Means).",
            );
            setIsLaunchingQuest(false);
            return;
          }
          if (String(timerError?.message || "").toLowerCase().includes("already ended")) {
            setQuestError("This quest has already ended.");
            setIsLaunchingQuest(false);
            return;
          }
          console.error("Failed to initialize first question timer:", timerError);
        }
      }

      setQuestions(questionList);

      try {
        await refreshQuestLevelDistribution(
          questIdForTimer,
          Number(firstQuestion?.level) || 1,
        );
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
    const remainingSeconds = Math.max(
      0,
      Math.ceil((timerEndAtMsForLaunch - getEffectiveServerNowMs()) / 1000),
    );
    setTimerEndAtMs(timerEndAtMsForLaunch);
    setTimeRemaining(remainingSeconds);
    setQuestTimeLimitSeconds(questDurationSeconds);
    setIsTimeExpired(false);
    setFinalElapsedSeconds(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setIsLaunchingQuest(false);
    goScreen("screen-map");
    hasAutoSubmittedRef.current = false;
    markQuestPlayedInSession(userDetails.id, questToLaunch);
    localStorage.setItem(ACTIVE_QUEST_SESSION_KEY, String(questToLaunch));

    if (socketRef.current) {
      socketRef.current.emit("join-quest-room", String(questToLaunch));
      socketRef.current.emit("resume-quest-room", String(questToLaunch));
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
      const errorMessage = String(error?.message || "");
      if (errorMessage.toLowerCase().includes("quest has already ended")) {
        setTimeRemaining(0);
        setIsTimeExpired(true);
        await autoSubmitQuestAttempt("timeout");
        goScreen("screen-winner");
      } else if (errorMessage.toLowerCase().includes("blocked by invigilator")) {
        handleBlockedByInvigilator(
          "You have been blocked by the invigilator due to UMF (Unfair Means).",
        );
      } else {
        setRiddleSubmitError(errorMessage || "Unable to validate answer right now.");
      }
    } finally {
      setIsSubmittingRiddle(false);
    }
  };

  const showWinner = () => {
    if (startTime) {
      setFinalElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }
    localStorage.removeItem(ACTIVE_QUEST_SESSION_KEY);
    goScreen("screen-winner");
  };

  const resetGame = () => {
    localStorage.removeItem(ACTIVE_QUEST_SESSION_KEY);
    setCurrentScreen("screen-quest");
    setSolvedCount(0);
    setActiveRiddle(0);
    setStartTime(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setTimeRemaining(3600);
    setTimerEndAtMs(null);
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
    localStorage.removeItem(ACTIVE_QUEST_SESSION_KEY);
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
    localStorage.removeItem(ACTIVE_QUEST_SESSION_KEY);
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
    setTimerEndAtMs(null);
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
      <HorrorAtmosphere screen={currentScreen} />

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
          isActive={currentScreen === "screen-quest"}
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
            key={currentRiddle?.id || "riddle"}
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
        <HauntDialog className="horror-game-dialog" labelId="blocked-popup-title" onClose={() => setShowBlockedPopup(false)}>
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
        </HauntDialog>
      )}

      {showReplayWarning && (
        <HauntDialog className="horror-game-dialog" labelId="replay-warning-title" onClose={handleCancelReplayWarning}>
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
        </HauntDialog>
      )}

      {showExitConfirm && (
        <HauntDialog className="horror-game-dialog" labelId="exit-confirm-title" onClose={handleCancelExitQuest}>
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
        </HauntDialog>
      )}

    </>
  );
};

export default App;
