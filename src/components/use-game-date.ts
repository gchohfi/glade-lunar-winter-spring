import { useEffect, useState } from "react";
import { todayKey } from "@/lib/game/types";

/** Refresh calendar UI across midnight/resume; never drives the match clock. */
export function useGameDate(): Date {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      const next = new Date();
      setDate((previous) => (todayKey(previous) === todayKey(next) ? previous : next));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return date;
}
