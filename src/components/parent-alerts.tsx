import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { persistCloud } from "@/components/cloud-sync";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { unreadAlerts, footballAlertText } from "@/lib/game/alerts";
import { enableDeviceNotify, notificationPermission } from "@/lib/game/notify";
import { usePlayer } from "@/lib/game/store";
import { TIMEZONE } from "@/lib/game/types";

function whenLabel(at: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(at));
}

export function ParentAlerts() {
  const player = usePlayer();
  const setNotifyParents = usePlayer((s) => s.setNotifyParents);
  const markAlertsRead = usePlayer((s) => s.markAlertsRead);
  const unread = unreadAlerts(player);
  const [perm, setPerm] = useState(notificationPermission);

  useEffect(() => {
    setPerm(notificationPermission());
  }, []);

  const turnOn = async () => {
    const granted = await enableDeviceNotify();
    setPerm(notificationPermission());
    setNotifyParents(true);
    persistCloud();
    if (granted) {
      /* permission already stored */
    }
  };

  return (
    <Card className={unread.length > 0 ? "border-accent/30 bg-wash" : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Avisos de nível</h2>
          <p className="mt-1 text-sm text-muted">
            Você fica sabendo nos níveis 5, 10, 15, 20, 25 e 30, em cada categoria nova e quando
            chega a hora do prêmio.
          </p>
        </div>
        {player.notifyParents && perm === "granted" ? (
          <Bell className="size-5 shrink-0 text-accent" strokeWidth={2} />
        ) : (
          <BellOff className="size-5 shrink-0 text-faint" strokeWidth={2} />
        )}
      </div>

      {perm === "granted" && player.notifyParents ? (
        <p className="mt-3 text-sm text-muted">
          Avisos ligados neste aparelho. No celular, entre com a mesma conta e deixe esta página
          aberta — ou olhe aqui quando puder.
        </p>
      ) : perm === "denied" ? (
        <p className="mt-3 text-sm text-muted">
          O aparelho bloqueou pop-ups. Os avisos continuam nesta página. Para o sino do sistema,
          libere notificações nas Ajustes do Safari.
        </p>
      ) : perm === "unsupported" ? (
        <p className="mt-3 text-sm text-muted">
          Este navegador não mostra sino. Os marcos ficam registrados aqui.
        </p>
      ) : (
        <Button className="mt-4" onClick={() => void turnOn()}>
          Ativar avisos neste aparelho
        </Button>
      )}

      {!player.notifyParents && perm === "granted" ? (
        <Button className="mt-3" variant="secondary" onClick={() => void turnOn()}>
          Quero receber os marcos
        </Button>
      ) : null}

      {unread.length > 0 ? (
        <div className="mt-4 space-y-3">
          {unread.slice(0, 6).map((alert) => (
            <div key={alert.id} className="rounded-md border border-accent/20 bg-surface p-3">
              <p className="font-display">{footballAlertText(alert).title}</p>
              <p className="mt-1 text-sm text-muted">{footballAlertText(alert).body}</p>
              <p className="mt-1 text-xs text-faint">{whenLabel(alert.at)}</p>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => {
              markAlertsRead();
              persistCloud();
            }}
          >
            Marcar como lidos
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Nenhum marco novo por agora.</p>
      )}
    </Card>
  );
}
