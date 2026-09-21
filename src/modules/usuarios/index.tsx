import { useState, type FormEvent } from "react";
import { Users, Plus, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { DeleteButton } from "@/components/shared/delete-button";
import { useRiscoProfiles, repository } from "@/data/repository";
import { chamarEdgeFunction } from "@/lib/edge-function";
import { notificarErro, notificarSucesso } from "@/store/toast-store";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/auth/auth-provider";
import type { RiscoRole } from "@/types/domain";

const PAPEL_LABEL: Record<RiscoRole, string> = {
  admin: "Administrador",
  fisioterapeuta: "Fisioterapeuta",
  enfermagem: "Enfermagem",
  outro: "Outro",
};

export default function Usuarios() {
  const usuarios = useRiscoProfiles();
  const empresaId = useAppStore((s) => s.activeCompanyId);
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [papel, setPapel] = useState<RiscoRole>("fisioterapeuta");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await chamarEdgeFunction("create-risco-user", {
        action: "create",
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        full_name: String(form.get("full_name") ?? "").trim(),
        role: papel,
        company_id: empresaId,
      });
      notificarSucesso("Usuário criado com acesso ao inovare.risco.");
      setOpen(false);
    } catch (erro) {
      notificarErro("Não foi possível criar o usuário", erro);
    } finally {
      setSalvando(false);
    }
  }

  async function handleResetSenha(id: string, email: string) {
    try {
      await chamarEdgeFunction("create-risco-user", { action: "reset-password", user_id: id });
      notificarSucesso(`Link de redefinição enviado para ${email}.`);
    } catch (erro) {
      notificarErro("Não foi possível redefinir a senha", erro);
    }
  }

  async function handleRemoverAcesso(id: string) {
    try {
      await chamarEdgeFunction("create-risco-user", { action: "delete", user_id: id });
      notificarSucesso("Acesso ao inovare.risco removido.");
    } catch (erro) {
      notificarErro("Não foi possível remover o acesso", erro);
    }
  }

  async function handleAtivarToggle(id: string, ativo: boolean) {
    try {
      await repository.riscoProfiles.update(id, { ativo: !ativo });
    } catch (erro) {
      notificarErro("Não foi possível atualizar o usuário", erro);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Quem tem acesso ao inovare.risco e com qual papel. O login é o mesmo do inovare.fisio — criar aqui só libera o acesso a este sistema."
        actions={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> Novo usuário</Button>
            </SheetTrigger>
            <SheetContent>
              <form className="flex h-full flex-col" onSubmit={handleSubmit}>
                <SheetHeader>
                  <SheetTitle>Novo usuário</SheetTitle>
                  <SheetDescription>
                    Se o e-mail já existir no inovare.fisio, só libera o acesso ao risco — não duplica a conta.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input id="full_name" name="full_name" required placeholder="Nome do profissional" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" required placeholder="voce@empresa.com" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password">Senha inicial</Label>
                    <PasswordInput id="password" name="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Papel</Label>
                    <Select value={papel} onValueChange={(v) => setPapel(v as RiscoRole)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAPEL_LABEL).map(([valor, label]) => (
                          <SelectItem key={valor} value={valor}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={salvando}>{salvando ? "Criando…" : "Criar usuário"}</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <Card>
        {usuarios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Users className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum usuário com acesso ao risco ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                    <td className="px-4 py-3 font-medium text-ink">{u.full_name}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {u.is_platform_admin ? <Badge variant="critical">Admin InovareTech</Badge> : PAPEL_LABEL[u.role]}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleAtivarToggle(u.id, u.ativo)} disabled={u.id === profile?.id}>
                        <Badge variant={u.ativo ? "recovery" : "neutral"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Redefinir senha de ${u.full_name}`} onClick={() => handleResetSenha(u.id, u.full_name)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {u.id !== profile?.id && (
                          <DeleteButton
                            itemLabel={u.full_name}
                            onConfirm={() => handleRemoverAcesso(u.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
