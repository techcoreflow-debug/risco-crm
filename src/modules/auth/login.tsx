import { useState, type FormEvent } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/auth/auth-provider";
import { notificarErro } from "@/store/toast-store";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export default function Login() {
  const { signInWithPassword } = useAuth();
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const senha = String(form.get("password") ?? "");

    setCarregando(true);
    try {
      const { error } = await signInWithPassword(email, senha);
      if (error) notificarErro("Não foi possível entrar", error);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-clinical-500 text-white">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">{APP_NAME}</span>
          <p className="text-sm text-ink-soft">Gestão de risco de pacientes hospitalizados</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required placeholder="voce@empresa.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button type="submit" disabled={carregando} className="mt-1">
                {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-ink-soft">
              O mesmo login do inovare.fisio funciona aqui, se sua conta tiver acesso ao risco.
              Novo acesso é criado por um administrador em Usuários.
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Um produto <span className="font-medium text-ink-soft">InovareTech</span> · v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
