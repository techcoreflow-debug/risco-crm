import { useMemo, useState, type FormEvent } from "react";
import { ListChecks, Plus, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Combobox } from "@/components/ui/combobox";
import { useRiskActionPlans, useRiscoProfiles, usePatientsRef, useAdmissoesAtivas, repository } from "@/data/repository";
import { notificarErro, notificarSucesso } from "@/store/toast-store";
import { useAppStore } from "@/store/app-store";
import { hojeLocalIso } from "@/lib/data-local";
import type { StatusPlanoAcao } from "@/types/domain";

const STATUS_LABEL: Record<StatusPlanoAcao, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STATUS_VARIANT: Record<StatusPlanoAcao, "neutral" | "attention" | "recovery"> = {
  pendente: "neutral",
  em_andamento: "attention",
  concluido: "recovery",
};

export default function PlanosAcao() {
  const planos = useRiskActionPlans();
  const responsaveis = useRiscoProfiles();
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();
  const empresaId = useAppStore((s) => s.activeCompanyId);
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");

  const idsInternadosAtivos = useMemo(() => new Set(admissoesAtivas.map((a) => a.patient_id)), [admissoesAtivas]);
  const pacientesInternados = useMemo(() => pacientes.filter((p) => idsInternadosAtivos.has(p.id)), [pacientes, idsInternadosAtivos]);
  const opcoesPacientes = useMemo(() => pacientesInternados.map((p) => ({ value: p.id, label: p.full_name })), [pacientesInternados]);

  const planosOrdenados = useMemo(
    () => [...planos].sort((a, b) => (a.status === "concluido" ? 1 : 0) - (b.status === "concluido" ? 1 : 0)),
    [planos]
  );

  function abrirNovo() {
    setPacienteId("");
    setResponsavelId("");
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pacienteId) {
      notificarErro("Selecione o paciente", "O plano de ação precisa estar vinculado a um paciente.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await repository.riskActionPlans.create({
        company_id: empresaId,
        patient_id: pacienteId,
        descricao: String(form.get("descricao") ?? ""),
        responsavel_id: responsavelId || null,
        status: "pendente",
        prazo: String(form.get("prazo") ?? "") || null,
      });
      notificarSucesso("Plano de ação criado.");
      setOpen(false);
    } catch (erro) {
      notificarErro("Não foi possível criar o plano de ação", erro);
    } finally {
      setSalvando(false);
    }
  }

  async function avancarStatus(id: string, statusAtual: StatusPlanoAcao) {
    const proximo: StatusPlanoAcao = statusAtual === "pendente" ? "em_andamento" : "concluido";
    try {
      await repository.riskActionPlans.update(id, {
        status: proximo,
        concluido_em: proximo === "concluido" ? hojeLocalIso() : null,
      });
    } catch (erro) {
      notificarErro("Não foi possível atualizar o plano", erro);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Planos de Ação"
        description="Medidas preventivas com responsável e prazo, vinculadas a cada paciente."
        actions={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo plano</Button>
            </SheetTrigger>
            <SheetContent>
              <form className="flex h-full flex-col" onSubmit={handleSubmit}>
                <SheetHeader>
                  <SheetTitle>Novo plano de ação</SheetTitle>
                  <SheetDescription>Vincule uma medida preventiva a um paciente internado, com responsável e prazo.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Paciente</Label>
                    <Combobox value={pacienteId} onValueChange={setPacienteId} options={opcoesPacientes} placeholder="Buscar paciente…" searchPlaceholder="Nome do paciente…" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="descricao">Descrição da medida</Label>
                    <textarea
                      id="descricao"
                      name="descricao"
                      required
                      rows={3}
                      placeholder="Ex.: Grades elevadas + sinalização de risco de queda no leito"
                      className="rounded-md border border-line-strong bg-surface-raised px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinical-500/40"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Responsável</Label>
                    <Select value={responsavelId} onValueChange={setResponsavelId}>
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="prazo">Prazo</Label>
                    <Input id="prazo" name="prazo" type="date" />
                  </div>
                </div>
                <SheetFooter>
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={salvando}>{salvando ? "Salvando…" : "Criar plano"}</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <Card>
        {planosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ListChecks className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum plano de ação cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Medida</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Prazo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {planosOrdenados.map((plano) => {
                  const paciente = pacientes.find((p) => p.id === plano.patient_id);
                  const responsavel = responsaveis.find((r) => r.id === plano.responsavel_id);
                  return (
                    <tr key={plano.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                      <td className="px-4 py-3 font-medium text-ink">{paciente?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{plano.descricao}</td>
                      <td className="px-4 py-3 text-ink-soft">{responsavel?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{plano.prazo ?? "—"}</td>
                      <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[plano.status]}>{STATUS_LABEL[plano.status]}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {plano.status !== "concluido" && (
                          <Button variant="ghost" size="sm" onClick={() => avancarStatus(plano.id, plano.status)}>
                            <Check className="h-4 w-4" /> {plano.status === "pendente" ? "Iniciar" : "Concluir"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
