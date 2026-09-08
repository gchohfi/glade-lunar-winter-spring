import { create } from "zustand";
import { loadProgress, saveProgress, importLegacyProgress } from "@/lib/server/player";
import { emptyState, STORAGE_KEY, type PlayerState } from "./types";
import { usePlayer } from "./store";
import type { CourseCommand, CourseEnvelope, CourseRequest, CourseResponse } from "./course-types";

type Status = "loading" | "signed-out" | "ready" | "offline" | "error";
type Journal = { attemptId: string; revision: number; elapsedMs: number };
type SyncState = {
  status: Status;
  envelope: CourseEnvelope | null;
  busy: boolean;
  message: string | null;
  deviceId: string;
  accountId: string | null;
  legacyAvailable: boolean;
  connect(accountId: string | null): Promise<void>;
  refresh(): Promise<void>;
  send(command: CourseCommand): Promise<CourseResponse | null>;
  importLegacy(): Promise<void>;
  dismissLegacy(): void;
};

const PREFIX = "missao-course-v3:";
const LEGACY = PREFIX + "legacy-backup";
function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Server remains authoritative. */
  }
}
function isUnauthorized(error: unknown) {
  return error instanceof Error && /Unauthorized|401/.test(error.message);
}
function deviceId() {
  try {
    const key = PREFIX + "device";
    const id = sessionStorage.getItem(key) ?? crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
const keyFor = (account: string, kind: string, device = "") =>
  PREFIX + account + ":" + kind + device;

export function rememberAnswerTime(attemptId: string, revision: number, elapsedMs: number) {
  const s = useCourseSync.getState();
  if (!s.accountId || !s.deviceId) return false;
  return write(keyFor(s.accountId, "journal", s.deviceId), { attemptId, revision, elapsedMs });
}

function mirror(envelope: CourseEnvelope) {
  // Old store is a display/cache mirror only. Never upload its snapshot.
  usePlayer.getState().replaceState(envelope.state);
}

export const useCourseSync = create<SyncState>((set, get) => ({
  status: "loading",
  envelope: null,
  busy: false,
  message: null,
  deviceId: "",
  accountId: null,
  legacyAvailable: false,
  async connect(accountId) {
    if (
      accountId === get().accountId &&
      get().deviceId &&
      (get().status !== "loading" || get().busy)
    )
      return;
    const id = get().deviceId || deviceId();
    if (!read(LEGACY) && !read(PREFIX + "mirror-written")) {
      const legacy = read<PlayerState | { state: PlayerState }>(STORAGE_KEY);
      const value = legacy && "state" in legacy ? legacy.state : legacy;
      if (value?.onboarded) write(LEGACY, value);
    }
    set({
      accountId,
      deviceId: id,
      envelope: null,
      busy: false,
      message: null,
      status: accountId ? "loading" : "signed-out",
      legacyAvailable: false,
    });
    usePlayer.setState({ ...emptyState(), course: undefined, hydrated: true });
    if (accountId) await get().refresh();
  },
  async refresh() {
    const { accountId, deviceId: id, busy } = get();
    if (!accountId || busy) return;
    if (!navigator.onLine) {
      set({ status: "offline", message: "Sem conexão. A partida está pausada." });
      return;
    }
    set({ busy: true, message: null });
    try {
      const pendingKey = keyFor(accountId, "pending", id);
      let pending = read<CourseRequest>(pendingKey);
      let remote = await loadProgress();
      if (get().accountId !== accountId) return;
      const journalKey = keyFor(accountId, "journal", id);
      const journal = read<Journal>(journalKey);
      if (
        !pending &&
        journal &&
        remote?.activeAttempt?.id === journal.attemptId &&
        remote.activeAttempt.ownerDeviceId === id &&
        remote.revision === journal.revision
      ) {
        pending = {
          protocolVersion: 3,
          expectedRevision: journal.revision,
          operationId: crypto.randomUUID(),
          deviceId: id,
          command: { type: "pause", attemptId: journal.attemptId, elapsedMs: journal.elapsedMs },
        };
        if (!write(pendingKey, pending))
          throw new Error("Não foi possível guardar a interrupção neste aparelho.");
      }
      let recoveryMessage: string | null = null;
      if (pending) {
        try {
          const response = await saveProgress({ data: pending });
          if (get().accountId !== accountId) return;
          remote = response;
          recoveryMessage =
            response.status === "conflict" || response.status === "rejected"
              ? (response.message ??
                "O outro aparelho atualizou a partida. Confira o progresso recebido.")
              : null;
          remove(pendingKey);
        } catch (error) {
          if (!(error instanceof Error) || !/PIN|acesso aos Pais/i.test(error.message)) throw error;
          recoveryMessage =
            "Abra os Pais com seu PIN para conferir a operação pendente. Nenhuma nova operação será enviada antes disso.";
        }
      }
      remove(journalKey);
      const envelope =
        remote ??
        ({
          protocolVersion: 3,
          revision: 0,
          state: emptyState(),
          activeAttempt: null,
          storage: "temporary",
        } satisfies CourseEnvelope);
      set({
        envelope,
        status: "ready",
        legacyAvailable: !remote && Boolean(read(LEGACY)),
        message: recoveryMessage,
      });
      write(PREFIX + "mirror-written", true);
      mirror(envelope);
    } catch (error) {
      if (get().accountId === accountId)
        set({
          status: isUnauthorized(error) ? "signed-out" : navigator.onLine ? "error" : "offline",
          message: isUnauthorized(error)
            ? "Peça ao responsável para entrar novamente. A operação pendente continua guardada."
            : "Não conseguimos confirmar o salvamento. Reconecte para continuar.",
        });
    } finally {
      if (get().accountId === accountId) set({ busy: false });
    }
  },
  async send(command) {
    const { accountId, envelope, deviceId: id, busy, status } = get();
    if (!accountId || !envelope || busy || status !== "ready") return null;
    if (read<CourseRequest>(keyFor(accountId, "pending", id))) {
      set({
        message:
          "Há uma operação pendente. Reconecte e, se necessário, abra os Pais com o PIN antes de continuar.",
      });
      return null;
    }
    if (!navigator.onLine) {
      set({
        status: "offline",
        message: "Sem conexão. Nada foi confirmado. Reconecte para continuar.",
      });
      return null;
    }
    const journalKey = keyFor(accountId, "journal", id);
    const journal = read<Journal>(journalKey);
    // A logo/back navigation may leave a fraction of a question uncheckpointed.
    // Settle it before resume, purchase, or any other untimed command can erase it.
    if (
      !("elapsedMs" in command) &&
      journal &&
      journal.elapsedMs > 0 &&
      journal.revision === envelope.revision &&
      journal.attemptId === envelope.activeAttempt?.id &&
      envelope.activeAttempt.ownerDeviceId === id &&
      envelope.activeAttempt.phase === "answer"
    ) {
      const settled = await get().send({
        type: "checkpoint",
        attemptId: journal.attemptId,
        elapsedMs: Math.min(
          journal.elapsedMs,
          envelope.activeAttempt.timeLimitMs - envelope.activeAttempt.mathElapsedMs,
        ),
      });
      if (
        !settled ||
        !["applied", "duplicate"].includes(settled.status) ||
        get().accountId !== accountId
      )
        return settled;
      return get().send(command);
    }
    const request: CourseRequest = {
      protocolVersion: 3,
      expectedRevision: envelope.revision,
      operationId: crypto.randomUUID(),
      deviceId: id,
      command,
    };
    const pendingKey = keyFor(accountId, "pending", id);
    // Persist BEFORE sending; retry lost replies with the identical operation id.
    if (!write(pendingKey, request)) {
      set({
        status: "error",
        message:
          "O aparelho não consegue guardar a tentativa com segurança. Libere espaço antes de continuar.",
      });
      return null;
    }
    remove(journalKey);
    set({ busy: true, message: null });
    try {
      const response = await saveProgress({ data: request });
      if (get().accountId !== accountId) return null;
      remove(pendingKey);
      const afterJournal = read<Journal>(journalKey);
      if (afterJournal?.revision === envelope.revision) remove(journalKey);
      set({
        envelope: response,
        legacyAvailable: false,
        message:
          response.status === "rejected" || response.status === "conflict"
            ? (response.message ?? "O progresso mudou. Confira antes de continuar.")
            : null,
      });
      mirror(response);
      return response;
    } catch (error) {
      if (
        get().accountId === accountId &&
        error instanceof Error &&
        /PIN|acesso aos Pais/i.test(error.message)
      ) {
        set({ status: "ready", message: error.message });
      } else if (get().accountId === accountId)
        set({
          status: isUnauthorized(error) ? "signed-out" : navigator.onLine ? "error" : "offline",
          message: isUnauthorized(error)
            ? "Peça ao responsável para entrar novamente. A tentativa continua guardada."
            : "Confirmação pendente. A partida foi pausada; reconecte para verificar, sem repetir cobranças.",
        });
      return null;
    } finally {
      if (get().accountId === accountId) set({ busy: false });
    }
  },
  async importLegacy() {
    const { accountId, busy } = get();
    const legacy = read<PlayerState>(LEGACY);
    if (!accountId || busy || !legacy || !navigator.onLine) return;
    set({ busy: true, message: null });
    const operationKey = keyFor(accountId, "import-id");
    const operationId = read<string>(operationKey) ?? crypto.randomUUID();
    write(operationKey, operationId);
    try {
      const response = await importLegacyProgress({
        data: { protocolVersion: 3, operationId, legacyState: legacy },
      });
      if (get().accountId !== accountId) return;
      set({
        envelope: response,
        legacyAvailable: false,
        message:
          response.message ??
          "Conquistas anteriores preservadas. O novo percurso começa na Copa do Bairro.",
      });
      mirror(response);
    } catch {
      if (get().accountId === accountId)
        set({
          status: "error",
          message: "A importação ainda não foi confirmada. Seu histórico local continua guardado.",
        });
    } finally {
      if (get().accountId === accountId) set({ busy: false });
    }
  },
  dismissLegacy() {
    set({ legacyAvailable: false });
  },
}));
