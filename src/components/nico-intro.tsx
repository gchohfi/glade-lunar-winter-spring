import { useEffect, useRef, useState, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Film, ImageIcon, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { introHistory, NICO_INTRO_POSTER, NICO_INTRO_VIDEO } from "@/lib/game/intro";
import "./nico-intro.css";

export function NicoIntro({
  accountId,
  soundEnabled,
  homeActionRef,
}: {
  accountId: string;
  soundEnabled: boolean;
  homeActionRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const checked = useRef(false);
  const entryButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      /* Optional presentation cache. */
    }
    if (introHistory.claim(accountId, new Date(), storage)) setOpen(true);
  }, [accountId]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="nico-intro-replay">
          <Film className="size-4" aria-hidden="true" />
          Ver abertura do Nico
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="nico-intro-overlay" />
        <Dialog.Content
          className="nico-intro-dialog"
          onPointerDownOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            entryButton.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            homeActionRef.current?.focus();
          }}
        >
          <header className="nico-intro-header">
            <div>
              <Dialog.Title>Seu lugar no time</Dialog.Title>
              <Dialog.Description>Nico + você. No mesmo time.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button ref={entryButton} className="nico-intro-enter">
                Entrar no jogo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </header>
          {open && <IntroFilm soundEnabled={soundEnabled} onFinish={() => setOpen(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function IntroFilm({ soundEnabled, onFinish }: { soundEnabled: boolean; onFinish(): void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = useRef(true);
  const userPaused = useRef(false);
  const resumeWhenVisible = useRef(false);
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [still, setStill] = useState(false);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [visible, setVisible] = useState(true);
  const staticView = reducedMotion !== false || still || failed;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  // Do not let a hidden introduction keep playing sound or close the Home.
  useEffect(() => {
    const update = () => {
      const shown = document.visibilityState === "visible";
      setVisible(shown);
      const video = videoRef.current;
      if (!video) return;
      if (!shown) {
        resumeWhenVisible.current = !video.paused && !userPaused.current;
        video.pause();
      } else if (resumeWhenVisible.current && !userPaused.current) {
        resumeWhenVisible.current = false;
        void video.play().catch(() => {
          if (live.current) setWaiting(false);
        });
      }
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (staticView || !video) return;
    if (document.visibilityState === "visible") {
      void video.play().catch((error: unknown) => {
        if (!live.current || (error instanceof Error && error.name === "AbortError")) return;
        setWaiting(false);
        if (error instanceof Error && error.name === "NotSupportedError") setFailed(true);
      });
    }
    return () => video.pause();
  }, [staticView]);

  useEffect(() => {
    if (staticView || !waiting || !visible) return;
    // Optional movie: an unavailable download cannot block the child indefinitely.
    const timeout = window.setTimeout(() => setFailed(true), 6000);
    return () => window.clearTimeout(timeout);
  }, [staticView, waiting, visible]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      // Honor the visible Pause action even if the browser just suspended media.
      userPaused.current = true;
      resumeWhenVisible.current = false;
      video.pause();
      setPlaying(false);
    } else {
      userPaused.current = false;
      setWaiting(true);
      void video.play().catch(() => {
        if (live.current) setWaiting(false);
      });
    }
  };

  const enableSound = () => {
    const video = videoRef.current;
    if (!video || !soundEnabled) return;
    const enabled = !soundOn;
    // Unmute inside the actual user gesture, not after an asynchronous update.
    video.muted = !enabled;
    setSoundOn(enabled);
  };

  return (
    <>
      <div className="nico-intro-screen">
        {staticView ? (
          <img
            src={NICO_INTRO_POSTER}
            alt="Nico, o leão com uniforme do Corinthians, recebe você com a bola no campo."
            width={1280}
            height={720}
          />
        ) : (
          <video
            ref={videoRef}
            src={NICO_INTRO_VIDEO}
            poster={NICO_INTRO_POSTER}
            width={1280}
            height={720}
            playsInline
            muted={!soundEnabled || !soundOn}
            preload="auto"
            aria-label="Abertura: Nico convida você para jogar, chuta ao gol e comemora."
            onPlaying={() => {
              setPlaying(true);
              setWaiting(false);
            }}
            onPause={() => {
              setPlaying(false);
              setWaiting(false);
            }}
            onWaiting={() => setWaiting(true)}
            onError={() => setFailed(true)}
            onEnded={onFinish}
          />
        )}
      </div>
      <footer className="nico-intro-footer">
        <p role="status" aria-live="polite">
          {failed
            ? "O vídeo não carregou. Seu jogo está pronto para você."
            : staticView
              ? "Tudo pronto. Entre no jogo quando quiser."
              : waiting
                ? "Preparando a abertura. Você já pode entrar no jogo."
                : "Uma partida de cada vez, no seu ritmo."}
        </p>
        {!staticView && (
          <div className="nico-intro-controls" aria-label="Controles da abertura">
            <Button variant="ghost" onClick={togglePlayback}>
              {playing ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {playing ? "Pausar vídeo" : "Assistir à abertura"}
            </Button>
            {soundEnabled ? (
              <Button variant="ghost" onClick={enableSound} aria-pressed={soundOn}>
                {soundOn ? (
                  <Volume2 className="size-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="size-4" aria-hidden="true" />
                )}
                {soundOn ? "Desligar som" : "Ativar som"}
              </Button>
            ) : (
              <span className="nico-intro-sound-note">Som desligado nos Pais</span>
            )}
            <Button variant="ghost" onClick={() => setStill(true)}>
              <ImageIcon className="size-4" aria-hidden="true" />
              Ver sem animação
            </Button>
          </div>
        )}
      </footer>
    </>
  );
}
