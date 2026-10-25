import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

const animatedScreens = new Set(["screen-landing", "screen-start", "screen-quest", "screen-map", "screen-riddle", "screen-winner"]);

// Player-only transitions. Read the active DOM screen for callbacks held by sockets/timers.
export function useHauntNavigation(currentScreen, setCurrentScreen) {
  const pending = useRef(null);
  const version = useRef(0);

  const cancelPending = () => {
    version.current += 1;
    if (pending.current) {
      pending.current.animation.cancel();
      pending.current.element.inert = false;
      pending.current = null;
    }
  };

  useEffect(() => () => {
    version.current += 1;
    if (pending.current) {
      pending.current.animation.cancel();
      pending.current.element.inert = false;
    }
  }, []);

  return (nextScreen, onEnter) => {
    if (pending.current?.destination === nextScreen) return;
    cancelPending();
    const activeScreen = document.querySelector(".screen.active")?.id || currentScreen;
    if (nextScreen === activeScreen) { onEnter?.(); return; }

    const isThemedPair = animatedScreens.has(activeScreen) && animatedScreens.has(nextScreen);
    if (!isThemedPair) {
      onEnter?.();
      setCurrentScreen(nextScreen);
      window.scrollTo(0, 0);
      return;
    }
    const outgoing = document.getElementById(activeScreen);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.effects === "off";

    const showDestination = () => {
      flushSync(() => { onEnter?.(); setCurrentScreen(nextScreen); });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (isThemedPair) {
        document.querySelector(`#${nextScreen} h1`)?.focus({ preventScroll: true });
      }
    };

    if (reduceMotion || !outgoing?.animate) {
      showDestination();
      return;
    }

    const navigationVersion = version.current;
    const direction = nextScreen === "screen-landing" ? 1 : -1;
    outgoing.inert = true;
    const animation = outgoing.animate(
      [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: `translateX(${direction * 18}px)` }],
      { duration: 180, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" },
    );
    pending.current = { animation, element: outgoing, destination: nextScreen };
    animation.finished.then(() => {
      if (navigationVersion !== version.current) return;
      showDestination();
      animation.cancel();
      outgoing.inert = false;
      pending.current = null;
    }, () => {
      // Cancellation is expected when a newer navigation wins or the app unmounts.
    });
  };
}
