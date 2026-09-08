import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCourseSync } from "@/lib/game/connected-store";
import { MascotScene } from "@/components/mascot-scene";

export function CourseConnectionGate() {
  const sync = useCourseSync();
  if (sync.status === "loading")
    return (
      <p role="status" className="course-connection">
        Buscando seu campeonato…
      </p>
    );
  if (sync.status === "signed-out")
    return (
      <section className="course-connection course-entry">
        <div className="course-entry-copy">
          <p className="course-eyebrow">Com Nico, uma partida de cada vez</p>
          <h2>Seu próximo campeonato começa aqui.</h2>
          <p>
            Jogue com as tabuadas, faça gols e avance nas suas copas. O Nico ajuda quando precisar.
          </p>
          <p>Um adulto conecta a conta para guardar as partidas e continuar em outro aparelho.</p>
          <Link to="/login" className={buttonVariants({ size: "lg" })}>
            Entrar com o responsável
          </Link>
          <small>Conta do adulto. Progresso da criança.</small>
        </div>
        <MascotScene mood="guide" className="course-entry-scene" priority />
      </section>
    );
  if (sync.status === "offline" || sync.status === "error")
    return (
      <section className="course-connection" role="status">
        <h2>Partida pausada</h2>
        <p>{sync.message}</p>
        <Button disabled={sync.busy} onClick={() => void sync.refresh()}>
          Reconectar e conferir progresso
        </Button>
      </section>
    );
  if (sync.legacyAvailable)
    return (
      <section className="course-connection">
        <h2>Responsável: encontramos conquistas neste aparelho</h2>
        <p>
          Se este histórico pertence à criança desta conta, guarde as moedas, itens e partidas
          antigas. O novo percurso começa na Copa do Bairro.
        </p>
        <Link to="/pais" className={buttonVariants()}>Conferir histórico nos Pais</Link>
        <Button variant="ghost" disabled={sync.busy} onClick={sync.dismissLegacy}>
          Não pertence a esta conta
        </Button>
      </section>
    );
  return sync.message ? (
    <p className="course-connection" role="status">
      {sync.message}
    </p>
  ) : null;
}
