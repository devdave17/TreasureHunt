import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Stars from "./components/Stars";
import LandingScreen from "./components/LandingScreen";
import StartScreen from "./components/StartScreen";
import QuestScreen from "./components/QuestScreen";
import MapScreen from "./components/MapScreen";
import RiddleScreen from "./components/RiddleScreen";
import WinnerScreen from "./components/WinnerScreen";
import Timer from "./components/Timer";
import { getQuestDurationSeconds, getQuestStartAtMs } from "./utils/questTiming.js";

const GAME_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";
const PLAYER_SESSION_KEY = "treasurehunt_player_session";

const toRoman = (num) => {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
  return romans[num - 1] || String(num);
};

const mapQuestionToRiddle = (question, index, total) => {
  const step = index + 1;
  const safeDifficulty = String(question.difficulty || "MEDIUM").toUpperCase();

  return {
    id: question.id,
    num: step,
    icon: ["📜", "🧩", "⚙️", "🔮", "💎", "🧭", "🏺", "🗝️", "📦", "🧠"][(step - 1) % 10],
    title: question.title || `Riddle ${toRoman(step)}`,
    stage: `STAGE ${step} OF ${total}`,
    difficulty: safeDifficulty,
    riddle: question.riddleText || "Decode the challenge and unlock the path.",
    problem: question.problemStatement || "Solve the coding problem to proceed.",
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
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [userDetails, setUserDetails] = useState({ id: "", email: "", name: "", score: 0, currentLevel: 1, completedLevels: [] });
  const [quests, setQuests] = useState([]);
  const [selectedQuestId, setSelectedQuestId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [questError, setQuestError] = useState("");
  const [shouldShowProfileModal, setShouldShowProfileModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLaunchingQuest, setIsLaunchingQuest] = useState(false);
  const [questLockNotice, setQuestLockNotice] = useState(null);

  const isPlayerLoggedIn = Boolean(userDetails.email && userDetails.name);

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
          completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : []
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
          if (currentSelected && questList.some((quest) => quest.id === currentSelected)) {
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
      transports: ["websocket"]
    });

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
          const next = [...prev.filter((quest) => quest.id !== payload.quest.id), payload.quest];
          next.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
          return next;
        });

        setSelectedQuestId((currentSelected) => currentSelected || payload.quest.id);
      }
    };

    socket.on("quest-changed", syncQuestList);

    return () => {
      socket.off("quest-changed", syncQuestList);
      socket.disconnect();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (startTime && !isTimeExpired && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimeExpired(true);
            goScreen("screen-winner");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [startTime, isTimeExpired, timeRemaining]);

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
        setLoginError(payload?.error || "Login failed. Please check your details.");
        setIsLoggingIn(false);
        return;
      }

      const player = payload?.player || {};
      const nextUser = {
        id: player.id || "",
        email: player.email || email,
        name: player.name || "",
        score: Number(player.score) || 0,
        currentLevel: Number(player.currentLevel) || 1,
        completedLevels: Array.isArray(player.completedLevels) ? player.completedLevels : []
      };

      setUserDetails(nextUser);
      localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(nextUser));
      setQuestError("");
      setShouldShowProfileModal(true);
      goScreen("screen-quest");
    } catch {
      setLoginError("Unable to connect right now. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const launchSelectedQuest = async (questId) => {
    const questToLaunch = questId || selectedQuestId;
    const questMeta = quests.find((quest) => quest.id === questToLaunch) || null;

    if (!questToLaunch) {
      setQuestError("Please select a quest before starting.");
      return;
    }

    if (!questMeta) {
      setQuestError("Selected quest is no longer available. Please choose another quest.");
      return;
    }

    const startAtMs = getQuestStartAtMs(questMeta);
    const nowMs = Date.now();
    const isLive = nowMs >= startAtMs;
    const questDurationSeconds = getQuestDurationSeconds(questMeta);

    if (!isLive) {
      setQuestLockNotice({
        questName: questMeta.name || "Selected quest",
        startAtMs
      });
      return;
    }

    setQuestLockNotice(null);

    if (questToLaunch !== selectedQuestId) {
      setSelectedQuestId(questToLaunch);
    }

    setIsLaunchingQuest(true);
    setQuestError("");

    try {
      const response = await fetch(`${GAME_API_BASE}/game/quests/${questToLaunch}/questions`);
      const payload = await response.json();
      const questionList = Array.isArray(payload?.questions) ? payload.questions : [];

      if (questionList.length === 0) {
        setQuestError("Selected quest has no questions yet. Ask admin to add questions.");
        setIsLaunchingQuest(false);
        return;
      }

      setQuestions(questionList);
    } catch {
      setQuestError("Failed to load quest questions. Please retry.");
      setIsLaunchingQuest(false);
      return;
    }

    setStartTime(Date.now());
    setSolvedCount(0);
    setActiveRiddle(1);
    setTimeRemaining(questDurationSeconds);
    setIsTimeExpired(false);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setIsLaunchingQuest(false);
    goScreen("screen-map");
  };

  const openRiddle = (riddleNum, isSolved = false) => {
    const question = questions[riddleNum - 1];
    if (!question) return;

    const riddle = mapQuestionToRiddle(question, riddleNum - 1, questions.length);
    setCurrentRiddle(riddle);
    setIsSolvedRiddle(isSolved);
    setActiveRiddle(riddleNum);
    goScreen("screen-riddle");
  };

  const submitRiddleKey = (key) => {
    if (String(key || "").trim().length > 0) {
      // Correct!
      setSolvedCount((prev) => prev + 1);

      if (activeRiddle >= questions.length) {
        // Winner!
        showWinner();
      } else {
        setActiveRiddle((prev) => prev + 1);
        goScreen("screen-map");
      }
    } else {
      // Show error (would need to implement error handling in RiddleScreen)
      console.log(
        '❌ Incorrect key. Check your program\'s output. (Demo: type "SKIP" to advance)',
      );
    }
  };

  const showWinner = () => {
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
    setIsTimeExpired(false);
    setQuestions([]);
    setQuestError("");
    setLoginError("");
    setIsLaunchingQuest(false);
    setQuestLockNotice(null);
  };

  const handleBackToLanding = () => {
    goScreen("screen-landing");
  };

  const handleLogout = () => {
    localStorage.removeItem(PLAYER_SESSION_KEY);
    setUserDetails({ id: "", email: "", name: "", score: 0, currentLevel: 1, completedLevels: [] });
    setSelectedQuestId("");
    setQuestions([]);
    setSolvedCount(0);
    setActiveRiddle(0);
    setStartTime(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);
    setTimeRemaining(3600);
    setIsTimeExpired(false);
    setQuestError("");
    setLoginError("");
    setIsLaunchingQuest(false);
    setQuestLockNotice(null);
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
            onExit={() => goScreen("screen-quest")}
            questions={questions}
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
          />
        </>
      </section>

      <section
        className={`screen ${currentScreen === "screen-winner" ? "active" : ""}`}
        id="screen-winner"
      >
        <WinnerScreen
          startTime={startTime}
          onReset={resetGame}
          animation={true}
          isTimeExpired={isTimeExpired}
          timeRemaining={timeRemaining}
          userDetails={userDetails}
          solvedCount={solvedCount}
          totalRiddles={questions.length}
        />
      </section>
    </>
  );
};

export default App;
