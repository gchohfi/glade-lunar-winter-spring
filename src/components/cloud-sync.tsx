import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadProgress, saveProgress } from "@/lib/server/player";
import { hydratePlayer, usePlayer } from "@/lib/game/store";
import { setSoundEnabled, wireAudioUnlock } from "@/lib/game/audio";

export function CloudSync() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = usePlayer((s) => s.hydrated);
  const pushed = useRef(false);

  useEffect(() => {
    wireAudioUnlock();
    hydratePlayer();
    const t = window.setTimeout(() => {
      if (!usePlayer.getState().hydrated) usePlayer.setState({ hydrated: true });
    }, 200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hydrated) setSoundEnabled(usePlayer.getState().sound);
  }, [hydrated]);

  useEffect(() => {
    if (isPending || !user || !hydrated || pushed.current) return;
    pushed.current = true;
    const local = usePlayer.getState().snapshot();
    void loadProgress()
      .then(async (remote) => {
        if (
          remote &&
          (remote.totalMissionsPassed > local.totalMissionsPassed ||
            (remote.totalMissionsPassed === local.totalMissionsPassed &&
              remote.onboarded &&
              !local.onboarded))
        ) {
          usePlayer.getState().replaceState(remote);
          return;
        }
        if (local.onboarded || local.totalMissionsPassed > 0 || local.childName) {
          await saveProgress({ data: local });
        }
      })
      .catch(() => {
        pushed.current = false;
      });
  }, [user, isPending, hydrated]);

  return null;
}

export function persistCloud(): void {
  const state = usePlayer.getState().snapshot();
  void saveProgress({ data: state }).catch(() => undefined);
}
