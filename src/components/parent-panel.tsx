import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { AppShell } from "@/components/app-shell";
import { CourseConnectionGate } from "@/components/course-connection-gate";
import { ParentLearningReport } from "@/components/parent-learning-report";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CHAMPIONSHIPS, COURSE_MATCHES, normalizeCourse } from "@/lib/game/course";
import { useCourseSync } from "@/lib/game/connected-store";
import { getParentAccess, setParentAccess } from "@/lib/game/parent-access";
import type { ParentReport, ParentStatus } from "@/lib/game/parent-types";
import type { PlayerState } from "@/lib/game/types";
import {
  closeParents,
  loadParentReport,
  parentStatus,
  setParentPin,
  unlockParents,
} from "@/lib/server/parents";

const errorText = (error: unknown) => {
  if (error instanceof Error && /Unauthorized|401/.test(error.message))
    return "Entre novamente na conta do responsável para continuar.";
  if (
    error instanceof Error &&
    /^(O acesso|Abra os Pais|Entre novamente|Use um PIN|Digite os seis|O armazenamento)/.test(
      error.message,
    )
  )
    return error.message;
  return "Não recebemos confirmação. Confira a conexão e tente novamente.";
};

export function ParentPanel() {
  const accountId = useCourseSync((state) => state.accountId);
  return <ParentArea key={accountId ?? "signed-out"} />;
}
function ParentArea() {
  const sync = useCourseSync();
  const refresh = useCourseSync((state) => state.refresh);
  const navigate = useNavigate();
  const [status, setStatus] = useState<ParentStatus | null>(null);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [expires, setExpires] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reset, setReset] = useState(false);
  const mounted = useRef(true);
  const sequence = useRef(0);
  useEffect(() => {
    mounted.current = true;
    const requestCounter = sequence;
    return () => {
      mounted.current = false;
      requestCounter.current++;
      const access = getParentAccess();
      setParentAccess(null);
      if (access) void closeParents({ data: { grant: access.token } }).catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    if (!sync.accountId) return;
    let live = true;
    void refresh()
      .then(() => parentStatus())
      .then((value) => {
        if (live) setStatus(value);
      })
      .catch((error) => {
        if (live) setMessage(errorText(error));
      });
    return () => {
      live = false;
    };
  }, [sync.accountId, refresh]);
  useEffect(() => {
    if (!expires) return;
    const timeout = window.setTimeout(
      () => {
        sequence.current++;
        setParentAccess(null);
        setReport(null);
        setExpires(0);
        setMessage("O acesso de dez minutos terminou. Digite seu PIN novamente.");
      },
      Math.max(0, expires - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [expires]);
  const refreshReport = async () => {
    const request = ++sequence.current;
    try {
      const value = await loadParentReport();
      if (mounted.current && request === sequence.current && getParentAccess()) setReport(value);
    } catch (error) {
      if (mounted.current && request === sequence.current) {
        setReport(null);
        setMessage(errorText(error));
      }
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !status) return;
    const setting = !status.configured || reset;
    if (setting && pin !== confirmation) {
      setMessage("Os dois PINs precisam ser iguais.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const value = await (setting ? setParentPin : unlockParents)({ data: { pin } });
      if (!mounted.current) {
        if (value.grant) void closeParents({ data: { grant: value.grant } }).catch(() => undefined);
        return;
      }
      setPin("");
      setConfirmation("");
      if (!value.ok || !value.grant || !value.expiresAt) {
        setMessage(value.message ?? "Acesso não confirmado.");
        setStatus({ ...status, lockedUntil: value.lockedUntil ?? 0 });
        return;
      }
      setParentAccess({ token: value.grant, expiresAt: value.expiresAt });
      setExpires(value.expiresAt);
      setStatus({ ...status, configured: true, lockedUntil: 0 });
      setReset(false);
      await sync.refresh();
      await refreshReport();
    } catch (error) {
      if (mounted.current) {
        setMessage(errorText(error));
        void parentStatus()
          .then((value) => {
            if (mounted.current) setStatus(value);
          })
          .catch(() => undefined);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const leave = async (destination: "game" | "login") => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const access = getParentAccess();
      if (access) await closeParents({ data: { grant: access.token } });
      sequence.current++;
      setParentAccess(null);
      setReport(null);
      setExpires(0);
      if (destination === "login") await signOut("/login?parents=true");
      else await navigate({ to: "/" });
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const ready = !!sync.accountId && sync.status !== "signed-out" && sync.status !== "loading";
  const setting = status && (!status.configured || reset);
  return (
    <AppShell
      compact
      right={
        <Button variant="ghost" disabled={busy} onClick={() => void leave("game")}>
          <ArrowLeft className="size-4" />
          Voltar ao jogo
        </Button>
      }
    >
      {!ready ? <CourseConnectionGate /> : null}
      {ready ? (
        <div className="course-parents">
          <div className="course-page-heading">
            <p className="course-eyebrow">Espaço dos pais · acesso protegido</p>
            <h1>Aprender, no ritmo dele.</h1>
            <p>
              Conclusão, prática e aprendizagem são coisas diferentes. Aqui você acompanha cada uma
              delas.
            </p>
          </div>
          {message ? (
            <p className="course-connection" role="alert">
              {message}
            </p>
          ) : null}
          {report && sync.status !== "offline" ? (
            <>
              <div className="parent-access-bar">
                <span>
                  <ShieldCheck className="size-4" /> Acesso temporário; bloqueia ao voltar ao jogo.
                </span>
                <Button variant="secondary" disabled={busy} onClick={() => void leave("login")}>
                  Sair da conta
                </Button>
              </div>
              {sync.legacyAvailable ? (
                <Card className="parent-report-card">
                  <h2>Histórico local encontrado</h2>
                  <p>
                    Confirme que pertence à criança desta conta. A importação é única e não
                    substitui progresso mais recente.
                  </p>
                  <Button
                    disabled={sync.busy}
                    onClick={async () => {
                      await sync.importLegacy();
                      await refreshReport();
                    }}
                  >
                    Este histórico é nosso · preservar conquistas
                  </Button>
                  <Button variant="ghost" onClick={sync.dismissLegacy}>
                    Não pertence a esta conta
                  </Button>
                </Card>
              ) : null}
              <div className="course-parent-summary">
                <Card>
                  <p>Percurso concluído</p>
                  <h2>
                    {normalizeCourse(report.player).completedMatches.length}
                    <small> / 20 partidas</small>
                  </h2>
                  <span>Concluir, inclusive com ajuda, não comprova domínio.</span>
                </Card>
                <Card>
                  <p>Prática recente</p>
                  <h2>
                    {report.current.responses}
                    <small> respostas</small>
                  </h2>
                  <span>Últimos sete dias, incluindo correções e repetições.</span>
                </Card>
                <Card>
                  <p>Evidência diária</p>
                  <h2>
                    {report.current.independentCorrect}
                    <small> acertos independentes</small>
                  </h2>
                  <span>
                    Em {report.current.firstResponses} primeiras respostas por conta e dia.
                  </span>
                </Card>
              </div>
              <div className="course-parent-grid">
                <CourseSettingsForm player={report.player} saved={refreshReport} />
                <div className="course-parent-side">
                  <Card>
                    <h2 className="font-display text-lg">Percurso de aprendizagem</h2>
                    <div className="course-parent-cups">
                      {CHAMPIONSHIPS.map((cup) => {
                        const completed = COURSE_MATCHES.filter(
                          (match) =>
                            match.championshipId === cup.id &&
                            normalizeCourse(report.player).completedMatches.includes(match.id),
                        ).length;
                        return (
                          <div key={cup.id}>
                            <div>
                              <strong>{cup.name}</strong>
                              <span>{completed}/5</span>
                            </div>
                            <Progress value={completed} max={5} />
                            <p>{cup.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                  <Card className="parent-report-card">
                    <h2>Combinado em família</h2>
                    <p>
                      {report.player.prizeName ||
                        "Opcional: combinem um passeio ou outra experiência."}
                    </p>
                    <p>
                      {Math.min(10, report.player.prizeCycle)} de 10 partidas concluídas, incluindo
                      replays.
                    </p>
                    <p className="parent-report-note">
                      Ao chegar a dez, o contador espera a entrega. Partidas durante a espera não
                      viram créditos do próximo ciclo.
                    </p>
                    {report.player.prizeCycle >= 10 ? (
                      <Button
                        disabled={sync.busy}
                        onClick={async () => {
                          const result = await sync.send({ type: "claim-prize" });
                          if (result && ["applied", "duplicate"].includes(result.status)) {
                            await refreshReport();
                            setMessage("Entrega registrada. Começa um novo ciclo de dez partidas.");
                          } else
                            setMessage(
                              useCourseSync.getState().message ??
                                "Não recebemos confirmação da entrega.",
                            );
                        }}
                      >
                        Marcar prêmio entregue
                      </Button>
                    ) : null}
                  </Card>
                </div>
              </div>
              <ParentLearningReport report={report} />
              <Card className="parent-report-card">
                <h2>Segurança e privacidade</h2>
                <p>
                  Sem anúncios, chat, ranking público ou compras com dinheiro real. PIN numérico de
                  seis dígitos, com bloqueio após cinco erros.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReport(null);
                    setReset(true);
                    setPin("");
                    setConfirmation("");
                    void parentStatus()
                      .then(setStatus)
                      .catch((error) => setMessage(errorText(error)));
                  }}
                >
                  Alterar ou recuperar PIN
                </Button>
              </Card>
            </>
          ) : (
            <Card className="parent-pin-card">
              <LockKeyhole className="size-7" aria-hidden="true" />
              <h2>{setting ? "Defina o PIN dos Pais" : "Só para o responsável"}</h2>
              {!status ? (
                <>
                  <p role="status">Verificando o acesso da conta…</p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void parentStatus()
                        .then(setStatus)
                        .catch((error) => setMessage(errorText(error)))
                    }
                  >
                    Conferir acesso
                  </Button>
                </>
              ) : setting && !status.recentAuth ? (
                <>
                  <p>
                    Para definir ou recuperar o PIN, entre novamente na conta do responsável. Essa
                    confirmação vale por cinco minutos.
                  </p>
                  <Button disabled={busy} onClick={() => void leave("login")}>
                    Entrar novamente para definir PIN
                  </Button>
                </>
              ) : (
                <form onSubmit={(event) => void submit(event)}>
                  <p>
                    {setting
                      ? "Escolha seis números e guarde com você. Não use o nome ou a data de nascimento da criança."
                      : "Digite seu PIN. O acesso dura dez minutos e termina ao voltar ao jogo."}
                  </p>
                  <label>
                    <span>{setting ? "Novo PIN de seis números" : "PIN de seis números"}</span>
                    <Input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={pin}
                      onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                  {setting ? (
                    <label>
                      <span>Confirme o PIN</span>
                      <Input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ""))}
                      />
                    </label>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={busy || pin.length !== 6 || (!!setting && confirmation.length !== 6)}
                  >
                    {busy
                      ? "Confirmando…"
                      : setting
                        ? "Salvar PIN e abrir Pais"
                        : "Abrir espaço dos Pais"}
                  </Button>
                  {status.lockedUntil > Date.now() ? (
                    <p role="status">
                      Bloqueado até{" "}
                      {new Date(status.lockedUntil).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      .
                    </p>
                  ) : null}
                </form>
              )}
              {status?.configured && !setting ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setReset(true);
                    setPin("");
                    setMessage("");
                    void parentStatus()
                      .then(setStatus)
                      .catch((error) => setMessage(errorText(error)));
                  }}
                >
                  Esqueci o PIN
                </Button>
              ) : null}
            </Card>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

function CourseSettingsForm({
  player,
  saved,
}: {
  player: PlayerState;
  saved: () => Promise<void>;
}) {
  const sync = useCourseSync();
  const [childName, setChildName] = useState(player.childName);
  const [prizeName, setPrizeName] = useState(player.prizeName);
  const [sound, setSound] = useState(player.sound);
  const [durationSec, setDurationSec] = useState(normalizeCourse(player).durationSec);
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    const result = await sync.send({
      type: "settings",
      childName: childName.trim(),
      prizeName: prizeName.trim(),
      sound,
      durationSec,
    });
    if (result && ["applied", "duplicate"].includes(result.status)) {
      await saved();
      setMessage("Preferências salvas. Uma tentativa em andamento conserva o tempo original.");
    } else
      setMessage(
        useCourseSync.getState().message ??
          "Não recebemos confirmação. Suas alterações permanecem neste formulário.",
      );
  };
  return (
    <Card className="course-settings">
      <form onSubmit={(event) => void save(event)}>
        <h2>Preferências para as próximas partidas</h2>
        <label>
          <span>Nome do jogador</span>
          <Input
            value={childName}
            maxLength={24}
            onChange={(event) => setChildName(event.target.value)}
          />
        </label>
        <fieldset>
          <legend>Tempo para responder as contas</legend>
          <p>
            O relógio conta só o tempo de resposta. Ajuda, chutes e pausas não consomem esse prazo.
          </p>
          <div className="course-duration-options">
            {([120, 180, 300] as const).map((value) => (
              <Button
                key={value}
                variant={durationSec === value ? "primary" : "secondary"}
                aria-pressed={durationSec === value}
                onClick={() => setDurationSec(value)}
              >
                {value / 60} min
              </Button>
            ))}
          </div>
        </fieldset>
        <label>
          <span>Prêmio combinado a cada 10 partidas</span>
          <Input
            value={prizeName}
            maxLength={40}
            placeholder="Um passeio, escolher o jantar…"
            onChange={(event) => setPrizeName(event.target.value)}
          />
          <small>Opcional. Não muda o conteúdo ou as moedas.</small>
        </label>
        <div className="course-sound-setting">
          <div>
            <strong>Som do jogo</strong>
            <p>Bipes curtos durante as jogadas.</p>
          </div>
          <Button
            variant={sound ? "primary" : "secondary"}
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          >
            {sound ? "Ligado" : "Mudo"}
          </Button>
        </div>
        <Button type="submit" className="w-full" disabled={sync.busy}>
          {sync.busy ? "Salvando…" : "Salvar preferências"}
        </Button>
        <p className="course-action-status" role="status">
          {message}
        </p>
      </form>
    </Card>
  );
}
