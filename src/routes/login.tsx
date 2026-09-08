import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
  signOut,
  getBearerToken,
} from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { parents?: boolean } => ({
    parents: search.parents === true || search.parents === "true" ? true : undefined,
  }),
  component: Login,
});

function Login() {
  const { parents } = Route.useSearch();
  const destination = parents ? "/pais" : "/";
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    if (mode === "signup" && password !== confirmation) {
      setMessage("As senhas precisam ser iguais. Confira a confirmação.");
      return;
    }
    setBusy(true);
    try {
      // Use the supported sign-out flow before changing from a preview bearer
      // to email credentials; otherwise an old bearer can shadow the new cookie.
      if (getBearerToken()) {
        await signOut(parents ? "/login?parents=true" : "/login");
        return;
      }
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              callbackURL: destination,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: destination,
            });
      if (result.error) {
        const code = result.error.code;
        setMessage(
          code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Confira o e-mail e a senha."
            : code?.includes("USER_ALREADY_EXISTS")
              ? "Já existe uma conta com este e-mail. Use “Já tenho conta” para entrar."
              : code?.includes("PASSWORD_TOO_SHORT")
                ? "Use uma senha com pelo menos 8 caracteres."
                : "Não conseguimos confirmar o acesso. Confira os dados e tente novamente.",
        );
        return;
      }
      const session = await authClient.getSession();
      if (session.error || !session.data?.user) {
        setMessage(
          mode === "signup"
            ? "A conta foi criada. Entre com seu e-mail e senha para continuar."
            : "Não conseguimos confirmar a sessão. Tente entrar novamente.",
        );
        if (mode === "signup") {
          setMode("signin");
          setPassword("");
          setConfirmation("");
        }
        return;
      }
      window.location.assign(destination);
    } catch {
      setMessage("Sem confirmação de acesso. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  const social = async (providerId: string) => {
    if (busy) return;
    setMessage("");
    setBusy(true);
    try {
      await signIn(providerId, {
        callbackURL: destination,
        errorCallbackURL: parents ? "/login?parents=true" : "/login",
      });
    } catch {
      setMessage(
        "O acesso não foi concluído. Tente novamente e permita a janela de entrada, se solicitada.",
      );
    } finally {
      setBusy(false);
    }
  };
  const changeMode = (next: "signin" | "signup") => {
    setMode(next);
    setMessage("");
    setPassword("");
    setConfirmation("");
  };

  return (
    <main className="course-login">
      <div className="course-login-content">
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "ghost" }), "course-login-back no-underline")}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>
        <div className="course-login-heading">
          <ShieldCheck aria-hidden="true" />
          <p className="course-eyebrow">Missão Tabuada · acesso do responsável</p>
          <h1>
            Um adulto conecta.
            <br />A criança joga.
          </h1>
          <p>
            Use a conta do responsável para guardar as partidas e continuar no mesmo time em outro
            aparelho.
          </p>
        </div>
        {isPending ? (
          <Card className="course-login-card">
            <p role="status">Verificando sua conta…</p>
          </Card>
        ) : !authEnabled ? (
          <Card className="course-login-card">
            <p>O acesso está indisponível neste momento.</p>
          </Card>
        ) : user ? (
          <Card className="course-login-card">
            <h2>Você já está conectado.</h2>
            <p>
              Entre no campeonato ou use o menu da conta para sair antes de trocar de responsável.
            </p>
            <div className="course-login-session">
              <Link to={destination} className={cn(buttonVariants(), "no-underline")}>
                {parents ? "Abrir espaço dos Pais" : "Abrir campeonato"}
              </Link>
              <UserButton />
            </div>
          </Card>
        ) : (
          <Card className="course-login-card">
            {emailAndPasswordEnabled ? (
              <>
                <div className="course-login-modes" aria-label="Escolha como acessar">
                  <Button
                    variant={mode === "signin" ? "primary" : "secondary"}
                    aria-pressed={mode === "signin"}
                    disabled={busy}
                    onClick={() => changeMode("signin")}
                  >
                    Já tenho conta
                  </Button>
                  <Button
                    variant={mode === "signup" ? "primary" : "secondary"}
                    aria-pressed={mode === "signup"}
                    disabled={busy}
                    onClick={() => changeMode("signup")}
                  >
                    Criar conta
                  </Button>
                </div>
                <form onSubmit={(event) => void submit(event)} className="course-login-form">
                  {mode === "signup" ? (
                    <label>
                      <span>Seu nome, responsável</span>
                      <Input
                        autoComplete="name"
                        value={name}
                        maxLength={80}
                        required
                        disabled={busy}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label>
                    <span>E-mail do responsável</span>
                    <Input
                      type="email"
                      autoComplete="username"
                      value={email}
                      maxLength={254}
                      required
                      disabled={busy}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Senha</span>
                    <Input
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      minLength={mode === "signup" ? 8 : undefined}
                      maxLength={128}
                      required
                      disabled={busy}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    {mode === "signup" ? (
                      <small>Pelo menos 8 caracteres. Não use o nome da criança.</small>
                    ) : null}
                  </label>
                  {mode === "signup" ? (
                    <label>
                      <span>Confirme a senha</span>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={confirmation}
                        minLength={8}
                        maxLength={128}
                        required
                        disabled={busy}
                        onChange={(event) => setConfirmation(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy
                      ? "Confirmando acesso…"
                      : mode === "signup"
                        ? "Criar conta do responsável"
                        : "Entrar no campeonato"}
                  </Button>
                </form>
                <p className="course-login-divider">Ou continue com</p>
              </>
            ) : null}
            <div className="course-login-providers">
              {GROK_PROVIDERS.map((provider) => (
                <Button
                  key={provider.providerId}
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void social(provider.providerId)}
                >
                  {provider.label}
                </Button>
              ))}
            </div>
            <p className="course-action-status" role="alert" aria-live="polite">
              {message}
            </p>
            <p className="course-login-privacy">
              Não é preciso cadastrar um e-mail da criança. Nenhum perfil ou resultado é público.
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
