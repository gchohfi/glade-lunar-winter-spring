import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCourseSync } from "@/lib/game/connected-store";
import { usePlayer } from "@/lib/game/store";
import { setSoundEnabled, wireAudioUnlock } from "@/lib/game/audio";

export function CloudSync() {
  const { user, isPending } = useCurrentUserState();
  const userId = user && !user.isDevFallback ? user.id : null;
  const sound = usePlayer((s) => s.sound);
  const connectedAccount = useCourseSync((s) => s.accountId);
  useEffect(() => {
    wireAudioUnlock();
  }, []);
  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);
  useEffect(() => {
    if (!isPending) void useCourseSync.getState().connect(userId);
  }, [isPending, userId, connectedAccount]);
  useEffect(() => {
    const online = () => void useCourseSync.getState().refresh();
    const offline = () =>
      useCourseSync.setState({
        status: "offline",
        message: "Sem conexão. A partida está pausada.",
      });
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  return null;
}

// Old screens may request a refresh, but cannot overwrite a cloud snapshot.
export function persistCloud(): void {
  void useCourseSync.getState().refresh();
}
