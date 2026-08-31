import { create } from "zustand";
import { applyMissionResult, claimPrize as claimPrizeState } from "./adaptive.ts";
import { applyPracticeResult } from "./practice.ts";
import { setSoundEnabled } from "./audio.ts";
import { migrateState } from "./progress.ts";
import { settleShields } from "./shields.ts";
import { fireParentNotify } from "./notify.ts";
import { firstPlanetForRank } from "./worlds.ts";
import {
  STORAGE_KEY,
  EXTRA_TIME_OPTIONS,
  emptyState,
  type MissionRecord,
  type PlayerState,
  type RankId,
  type Fact,
} from "./types.ts";

type MissionApplyInput = Omit<MissionRecord, "id"> & {
  factsTried: Array<{ fact: Fact; ok: boolean; ms: number }>;
  bestCombo?: number;
  planetIndex?: number;
};

type PracticeApplyInput = {
  factsTried: Array<{ fact: Fact; ok: boolean; ms: number }>;
};

type PlayerStore = PlayerState & {
  hydrated: boolean;
  setChildName: (name: string) => void;
  setPrizeName: (name: string) => void;
  setRank: (rankId: RankId) => void;
  setPlanet: (index: number) => void;
  setSound: (on: boolean) => void;
  setExtraTime: (sec: number) => void;
  setNotifyParents: (on: boolean) => void;
  markAlertsRead: () => void;
  finishOnboarding: (name: string) => void;
  applyMission: (input: MissionApplyInput) => ReturnType<typeof applyMissionResult>;
  applyPractice: (input: PracticeApplyInput) => ReturnType<typeof applyPracticeResult>;
  claimPrize: () => void;
  replaceState: (state: PlayerState) => void;
  snapshot: () => PlayerState;
};

function pickState(s: PlayerState): PlayerState {
  return migrateState({
    version: 3,
    childName: s.childName,
    rankId: s.rankId,
    consecutiveWins: s.consecutiveWins,
    consecutiveFails: s.consecutiveFails,
    totalMissionsPassed: s.totalMissionsPassed,
    prizeCycle: s.prizeCycle,
    prizesEarned: s.prizesEarned,
    prizesClaimed: s.prizesClaimed,
    facts: s.facts,
    missions: s.missions,
    days: s.days,
    sound: s.sound,
    onboarded: s.onboarded,
    level: s.level,
    xp: s.xp,
    selectedPlanet: s.selectedPlanet,
    furthestPlanet: s.furthestPlanet,
    planetStars: s.planetStars,
    planetBestMs: s.planetBestMs,
    bestCombo: s.bestCombo,
    extraTimeSec: s.extraTimeSec,
    parentAlerts: s.parentAlerts,
    notifyParents: s.notifyParents,
    prizeName: s.prizeName,
    shields: s.shields,
    lastSettledDay: s.lastSettledDay,
  });
}

function readLocal(): PlayerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: PlayerState } | PlayerState;
    const state = parsed && typeof parsed === "object" && "childName" in parsed
      ? parsed
      : (parsed as { state?: PlayerState }).state;
    if (!state) return null;
    return migrateState(state);
  } catch {
    return null;
  }
}

function writeLocal(state: PlayerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export const usePlayer = create<PlayerStore>()((set, get) => ({
  ...emptyState(),
  hydrated: false,
  setChildName: (childName) => {
    set({ childName });
    writeLocal(pickState(get()));
  },
  setPrizeName: (prizeName) => {
    set({ prizeName: prizeName.slice(0, 40) });
    writeLocal(pickState(get()));
  },
  setRank: (rankId) => {
    const planet = firstPlanetForRank(rankId);
    set({
      rankId,
      selectedPlanet: planet,
      furthestPlanet: Math.max(get().furthestPlanet, planet),
      consecutiveWins: 0,
      consecutiveFails: 0,
    });
    writeLocal(pickState(get()));
  },
  setPlanet: (index) => {
    const furthest = get().furthestPlanet;
    const selectedPlanet = Math.max(0, Math.min(furthest, index));
    set({ selectedPlanet });
    writeLocal(pickState(get()));
  },
  setSound: (sound) => {
    setSoundEnabled(sound);
    set({ sound });
    writeLocal(pickState(get()));
  },
  setExtraTime: (sec) => {
    const extraTimeSec = (EXTRA_TIME_OPTIONS as readonly number[]).includes(sec)
      ? sec
      : 15;
    set({ extraTimeSec });
    writeLocal(pickState(get()));
  },
  setNotifyParents: (notifyParents) => {
    set({ notifyParents });
    writeLocal(pickState(get()));
  },
  markAlertsRead: () => {
    const parentAlerts = (get().parentAlerts ?? []).map((a) => ({ ...a, read: true }));
    set({ parentAlerts });
    writeLocal(pickState(get()));
  },
  finishOnboarding: (name) => {
    set({ childName: name.trim(), onboarded: true });
    writeLocal(pickState(get()));
  },
  applyMission: (input) => {
    const result = applyMissionResult(pickState(get()), input);
    set({ ...result.state });
    writeLocal(result.state);
    if (result.state.notifyParents && result.newAlerts.length > 0) {
      fireParentNotify(result.newAlerts[0]);
    }
    return result;
  },
  applyPractice: (input) => {
    const result = applyPracticeResult(pickState(get()), input);
    set({ ...result.state });
    writeLocal(result.state);
    if (result.state.notifyParents && result.newAlerts.length > 0) {
      fireParentNotify(result.newAlerts[0]);
    }
    return result;
  },
  claimPrize: () => {
    const next = claimPrizeState(pickState(get()));
    set({ ...next });
    writeLocal(next);
  },
  replaceState: (state) => {
    const next = settleShields(migrateState(state));
    set({ ...next, hydrated: true });
    writeLocal(next);
  },
  snapshot: () => pickState(get()),
}));

export function hydratePlayer(): void {
  const local = readLocal();
  const current = usePlayer.getState();
  if (current.hydrated && current.onboarded && current.totalMissionsPassed >= (local?.totalMissionsPassed ?? 0)) {
    return;
  }
  if (local) {
    // Assenta escudos/dias perdidos já na hidratação e GRAVA o resultado —
    // o consumo nunca fica para uma recontagem futura.
    const settled = settleShields(local);
    setSoundEnabled(settled.sound);
    usePlayer.setState({ ...settled, hydrated: true });
    writeLocal(settled);
  } else if (!current.hydrated) {
    usePlayer.setState({ hydrated: true });
  }
}

// A hidratação do localStorage fica com o effect do <CloudSync> (montado no
// __root): hidratar já no load do módulo faria o primeiro render do cliente
// divergir do HTML do servidor (mismatch de hidratação do React).
