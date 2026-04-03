import { useEffect, useState } from "react";
import App from "./App.jsx";
import RankingScreen from "./components/RankingScreen.jsx";

const getRankingQuestId = () => {
  const pathname = String(window.location.pathname || "");
  const searchParams = new URLSearchParams(window.location.search);

  const routeMatch = pathname.match(/^\/ranking\/([^/?#]+)\/?$/i);
  if (routeMatch) {
    return decodeURIComponent(routeMatch[1]);
  }

  if (/^\/ranking(?:\.html)?\/?$/i.test(pathname)) {
    const queryQuestId = searchParams.get("questId") || searchParams.get("id") || "";
    return String(queryQuestId).trim();
  }

  return "";
};

function AppRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const questId = getRankingQuestId(pathname);

  if (questId) {
    return <RankingScreen questId={questId} onBack={() => window.location.assign("/")} />;
  }

  return <App />;
}

export default AppRouter;