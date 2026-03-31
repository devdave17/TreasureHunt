import React, { useState, useEffect } from "react";
import Stars from "./components/Stars";
import LandingScreen from "./components/LandingScreen";
import StartScreen from "./components/StartScreen";
import MapScreen from "./components/MapScreen";
import RiddleScreen from "./components/RiddleScreen";
import WinnerScreen from "./components/WinnerScreen";

// Demo keys — in real event these would be actual outputs
const DEMO_KEYS = {
  start: "TREASURE2026", // initial key
  1: "ECHO42", // output of problem 1 unlocks riddle 2
  2: "LOOP99",
  3: "STACK777",
  4: "BINARY01",
};

const RIDDLES = [
  {
    num: 1,
    icon: "📜",
    title: "Riddle I — The Echo Chamber",
    stage: "STAGE 1 OF 5",
    difficulty: "EASY",
    riddle:
      '"I repeat everything you say, yet I say nothing of my own. I live inside every terminal. What am I?"',
    problem:
      "Problem 1 is now unlocked on HackerRank. Write a program that echoes a given input string in uppercase. Your output is your key to the next riddle.",
    prevNum: 0,
  },
  {
    num: 2,
    icon: "🧩",
    title: "Riddle II — The Endless Loop",
    stage: "STAGE 2 OF 5",
    difficulty: "EASY",
    riddle:
      '"I run and run but never move. I repeat until you tell me to stop. What am I?"',
    problem:
      "Problem 2 is unlocked! Find the sum of all numbers from 1 to N where N is provided as input. Submit your output as the next key.",
    prevNum: 1,
  },
  {
    num: 3,
    icon: "⚙️",
    title: "Riddle III — The Stack's Secret",
    stage: "STAGE 3 OF 5",
    difficulty: "MEDIUM",
    riddle:
      '"Last in, first out — I remember in reverse. Parentheses fear me. What data structure am I?"',
    problem:
      'Problem 3 unlocked! Check if a given string of brackets is balanced. Return "VALID" or "INVALID". That word is your next key.',
    prevNum: 2,
  },
  {
    num: 4,
    icon: "🔮",
    title: "Riddle IV — The Binary Oracle",
    stage: "STAGE 4 OF 5",
    difficulty: "MEDIUM",
    riddle:
      '"I see the world in only two states — zero and one. I can search a sorted list in O(log n). What algorithm am I?"',
    problem:
      "Problem 4 unlocked! Implement binary search on a sorted array. Return the index of the target, or -1 if not found. Output is your final key.",
    prevNum: 3,
  },
  {
    num: 5,
    icon: "💎",
    title: "Riddle V — The Final Cipher",
    stage: "STAGE 5 OF 5 · FINAL BOSS",
    difficulty: "HARD",
    riddle:
      '"I can hold the whole world in my nodes and edges. I find the shortest path through chaos. I am the map itself. What am I?"',
    problem:
      "FINAL CHALLENGE! Implement Dijkstra's shortest path algorithm on a weighted graph. Find the minimum cost from source to all vertices. This is your ultimate test. There is no next key — only victory.",
    prevNum: 4,
  },
];

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("screen-landing");
  const [solvedCount, setSolvedCount] = useState(0);
  const [activeRiddle, setActiveRiddle] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [currentRiddle, setCurrentRiddle] = useState(null);
  const [isSolvedRiddle, setIsSolvedRiddle] = useState(false);

  const goScreen = (screenId) => {
    setCurrentScreen(screenId);
    window.scrollTo(0, 0);
  };

  const goToStart = () => {
    goScreen("screen-start");
  };

  const submitStartKey = (instituteEmail, name) => {
    console.log("Starting game with:", { instituteEmail, name });
    setStartTime(Date.now());
    setSolvedCount(0);
    setActiveRiddle(1);
    goScreen("screen-map");
  };

  const openRiddle = (riddleNum, isSolved = false) => {
    const riddle = RIDDLES[riddleNum - 1];
    setCurrentRiddle(riddle);
    setIsSolvedRiddle(isSolved);
    setActiveRiddle(riddleNum);
    goScreen("screen-riddle");
  };

  const submitRiddleKey = (key) => {
    const expectedKey = DEMO_KEYS[activeRiddle];

    // Demo: accept correct key OR "SKIP" for demo purposes
    if (key === expectedKey || key === "SKIP" || key === "DEMO") {
      // Correct!
      setSolvedCount((prev) => prev + 1);

      if (activeRiddle === 5) {
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
    setCurrentScreen("screen-landing");
    setSolvedCount(0);
    setActiveRiddle(0);
    setStartTime(null);
    setCurrentRiddle(null);
    setIsSolvedRiddle(false);

    // Clear confetti
    document.querySelectorAll(".confetti-piece").forEach((c) => c.remove());
  };

  const handleBackToLanding = () => {
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
        <StartScreen onSubmit={submitStartKey} onBack={handleBackToLanding} />
      </section>

      <section
        className={`screen ${currentScreen === "screen-map" ? "active" : ""}`}
        id="screen-map"
      >
        <MapScreen
          solvedCount={solvedCount}
          activeRiddle={activeRiddle}
          onNodeClick={openRiddle}
          onExit={handleBackToLanding}
        />
      </section>

      <section
        className={`screen ${currentScreen === "screen-riddle" ? "active" : ""}`}
        id="screen-riddle"
      >
        <RiddleScreen
          riddle={currentRiddle}
          isSolved={isSolvedRiddle}
          onSubmit={submitRiddleKey}
          onBack={handleBackToMap}
        />
      </section>

      <section
        className={`screen ${currentScreen === "screen-winner" ? "active" : ""}`}
        id="screen-winner"
      >
        <WinnerScreen
          startTime={startTime}
          onReset={resetGame}
          animation={true}
        />
      </section>
    </>
  );
};

export default App;
