import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ParentReport } from "@/lib/game/parent-types";
import { cosmeticItem } from "@/lib/game/wardrobe";
import { PLANETS } from "@/lib/game/worlds";
import { courseMatch } from "@/lib/game/course";

const reportDate = (day: string) => day.split("-").reverse().join("/");
const dateTime = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(ms);

export function ParentLearningReport({ report }: { report: ParentReport }) {
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) detailRef.current?.focus();
  }, [selected]);
  const detail = report.facts.find((fact) => fact.key === selected);
  const comparable = report.current.firstResponses > 0 && report.previous.firstResponses > 0;
  return (
    <>
      <Card className="parent-report-card">
        <p className="course-eyebrow">Aprendizagem entre dias</p>
        <h2>Como as primeiras respostas evoluem</h2>
        <p>
          Uma observação por conta, por dia. Corrigir depois não apaga a primeira resposta. Pedir
          ajuda antes dela também fica registrado.
        </p>
        <div className="parent-periods">
          {[
            { label: "Últimos 7 dias", value: report.current },
            { label: "7 dias anteriores", value: report.previous },
          ].map(({ label, value }) => (
            <section key={label}>
              <h3>{label}</h3>
              <p>
                {reportDate(value.from)} a {reportDate(value.to)}
              </p>
              <strong className="parent-report-number">
                {value.independentPercent === null
                  ? "Sem registros"
                  : `${value.independentPercent}%`}
              </strong>
              <p>
                {value.independentCorrect} acertos independentes em {value.firstResponses} primeiras
                respostas diárias
              </p>
              <dl>
                <div>
                  <dt>Respostas na prática</dt>
                  <dd>{value.responses}</dd>
                </div>
                <div>
                  <dt>Pedidos de ajuda</dt>
                  <dd>{value.help}</dd>
                </div>
              </dl>
              <p className="parent-report-note">
                Tempo ativo médio dos acertos independentes:{" "}
                {value.averageIndependentMs === null
                  ? "sem amostra"
                  : `${(value.averageIndependentMs / 1000).toFixed(1).replace(".", ",")} s`}{" "}
                ({value.timedSamples} respostas).
              </p>
            </section>
          ))}
        </div>
        <p className="parent-report-note">
          {comparable
            ? "Os temas e as contas podem mudar entre os períodos. Compare também a mesma conta abaixo; esta comparação não certifica domínio."
            : "Ainda não há primeiras respostas nos dois períodos para comparar evolução."}{" "}
          Velocidade é observada separadamente.
        </p>
        <p className="parent-report-note">
          {report.detailedSince
            ? `Registros detalhados disponíveis a partir de ${dateTime(report.detailedSince)}.`
            : "Os registros detalhados começarão nas próximas partidas desta versão."}{" "}
          Não reconstruímos detalhes de versões anteriores.
        </p>
      </Card>
      <Card className="parent-report-card">
        <p className="course-eyebrow">Conta por conta · últimos 30 dias</p>
        <h2>Onde apoiar, onde observar</h2>
        <p>
          {reportDate(report.detailPeriod.from)} a {reportDate(report.detailPeriod.to)}. Cada ordem
          e operação tem seu próprio registro: 3 × 4, 4 × 3 e 12 ÷ 3 não são a mesma evidência.
        </p>
        {report.facts.length ? (
          <div className="parent-fact-buttons">
            {report.facts.map((fact) => (
              <Button
                variant={selected === fact.key ? "primary" : "secondary"}
                key={fact.key}
                aria-pressed={selected === fact.key}
                onClick={() => setSelected(fact.key)}
              >
                <strong>
                  {fact.fact.a} {fact.fact.op === "div" ? "÷" : "×"} {fact.fact.b}
                </strong>
                <span>
                  {fact.responses} {fact.responses === 1 ? "resposta" : "respostas"} · {fact.errors}{" "}
                  {fact.errors === 1 ? "erro" : "erros"} · {fact.help}{" "}
                  {fact.help === 1 ? "ajuda" : "ajudas"}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="parent-empty">
            Ainda não há respostas detalhadas neste período. Nenhuma dificuldade foi presumida.
          </p>
        )}
        {detail ? (
          <section
            ref={detailRef}
            tabIndex={-1}
            className="parent-fact-detail"
            aria-live="polite"
            aria-label="Detalhe da conta selecionada"
          >
            <h3>
              {detail.fact.a} {detail.fact.op === "div" ? "÷" : "×"} {detail.fact.b} · primeira
              resposta em cada dia
            </h3>
            {detail.days.length ? (
              <ul className="parent-event-list">
                {detail.days.map((day) => (
                  <li key={day.day}>
                    <strong>{reportDate(day.day)}</strong>
                    <span>
                      {day.ok
                        ? day.assisted
                          ? "Acerto assistido"
                          : "Acerto independente"
                        : day.assisted
                          ? "Erro após ajuda ou repetição"
                          : "Primeira resposta incorreta"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Houve pedido de ajuda, mas ainda não houve resposta a esta conta.</p>
            )}
            <details>
              <summary>Ver as {detail.events.length} ocorrências registradas</summary>
              <ul className="parent-event-list">
                {detail.events.map((event) => (
                  <li key={event.id}>
                    <div>
                      <strong>{dateTime(event.at)}</strong>
                      <small>
                        {courseMatch(event.matchId)?.name} · {event.matchId}
                      </small>
                    </div>
                    <div>
                      {event.kind === "help"
                        ? "Pediu ajuda"
                        : `${event.ok ? "Acertou" : "Errou"} · ${event.firstInAttempt ? "primeira resposta na partida" : "repetição/correção"}${event.assisted ? " · com apoio" : ""}`}
                      <small>
                        {(event.activeMs / 1000).toFixed(1).replace(".", ",")} s ativos nesta conta
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        ) : report.facts.length ? (
          <p className="parent-report-note">
            Escolha uma conta para ver primeiras respostas, correções e ajuda.
          </p>
        ) : null}
      </Card>
      <Card className="parent-report-card">
        <p className="course-eyebrow">Extrato do clube</p>
        <h2>Moedas, com origem e data</h2>
        <p>
          Saldo atual: <strong>{report.player.club?.balance ?? 0} moedas</strong>. Comprar não
          equipa automaticamente e nunca libera uma partida.
        </p>
        <p className="parent-report-note">
          Histórico detalhado até {dateTime(report.generatedAt)}. Datas no horário de São Paulo.
        </p>
        {report.coinEvents.length ? (
          <ul className="parent-event-list">
            {report.coinEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>
                    {event.kind === "reward"
                      ? "Primeira partida concluída do dia"
                      : (cosmeticItem(event.itemId ?? "")?.name ?? "Compra de cosmético")}
                  </strong>
                  <small>{dateTime(event.at)}</small>
                </div>
                <div>
                  <strong>
                    {event.amount > 0 ? "+" : ""}
                    {event.amount} moedas
                  </strong>
                  <small>Saldo após a operação: {event.balanceAfter}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="parent-empty">Nenhum recebimento ou compra registrado nesta versão.</p>
        )}
        <details>
          <summary>Saldo inicial e recompensas antigas</summary>
          <p>
            Saldo preservado na entrada desta versão: {report.openingBalance ?? 0} moedas. Não é um
            novo crédito.
          </p>
          {report.legacyRewards.length ? (
            <ul className="parent-event-list">
              {report.legacyRewards.map((row) => (
                <li key={row.day}>
                  <span>{reportDate(row.day)} · data disponível, sem horário</span>
                  <strong>+{row.amount} moedas</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>Não há recompensas antigas com data e valor disponíveis.</p>
          )}
          <p className="parent-report-note">
            Valores históricos preservados, sem completar 10 ou 20 para 30 moedas. Compras antigas
            sem registro individual não são reconstruídas.
          </p>
        </details>
      </Card>
      <Card className="parent-report-card">
        <p className="course-eyebrow">Arquivo preservado</p>
        <h2>As 12 etapas do percurso anterior</h2>
        <p>Este histórico não conclui partidas das quatro copas atuais.</p>
        {report.archivedLegacyAttemptAt ? (
          <p>
            Uma tentativa do percurso antigo foi arquivada em{" "}
            {dateTime(report.archivedLegacyAttemptAt)}, sem conclusão ou recompensa adicional.
          </p>
        ) : null}
        <ol className="parent-legacy-stages">
          {PLANETS.map((planet, index) => (
            <li key={index}>
              <span>
                Etapa {index + 1} · {planet.name}
              </span>
              <strong>
                {report.player.planetStars[index] > 0
                  ? "Concluída no percurso antigo"
                  : "Sem conclusão registrada"}
              </strong>
            </li>
          ))}
        </ol>
        <details>
          <summary>Resumos antigos de respostas</summary>
          <p>
            Somente os totais que existiam antes dos novos registros. Não indicam primeira resposta
            do dia ou quantidade de pedidos de ajuda.
          </p>
          {Object.keys(report.legacyFacts).length ? (
            <ul className="parent-event-list">
              {Object.entries(report.legacyFacts).map(([key, value]) => (
                <li key={key}>
                  <strong>{key.replace("x", " × ").replace("d", " ÷ ")}</strong>
                  <span>
                    {value.attempts} respostas · {value.correct} acertos · {value.wrong} erros
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum resumo antigo disponível.</p>
          )}
        </details>
      </Card>
    </>
  );
}
