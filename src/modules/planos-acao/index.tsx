import { useMemo, useState, type FormEvent } from "react";
import { ListChecks, Plus, ChevronRight, ChevronLeft, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Combobox } from "@/components/ui/combobox";
import { useRiskActionPlans, useRiscoProfiles, usePatientsRef, useAdmissoesAtivas, repository } from "@/data/repository";
import { notificarErro, notificarSucesso } from "@/store/toast-store";
import { useAppStore } from "@/store/app-store";
import { hojeLocalIso } from "@/lib/data-local";
import type { RiskActionPlan, StatusPlanoAcao } from "@/types/domain";

const COLUNAS: { status: StatusPlanoAcao; titulo: string; corBorda: string; corTitulo: string }[] = [
  { status: "pendente", titulo: "Pendente", corBorda: "border-t-ink-soft/40", corTitulo: "text-ink-soft" },
  { status: "em_andamento", titulo: "Em andamento", corBorda: "border-t-attention-400", corTitulo: "text-attention-700" },
  { status: "concluido", titulo: "Concluído", corBorda: "border-t-recovery-400", corTitulo: "text-recovery-700" },
];

const PROXIMO: Record<StatusPlanoAcao, StatusPlanoAcao | null> = {
  pendente: "em_andamento",
  em_andamento: "concluido",
  concluido: null,
};
const ANTERIOR: Record<StatusPlanoAcao, StatusPlanoAcao | null> = {
  pendente: null,
  em_andamento: "pendente",
  concluido: "em_andamento",
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

  const hoje = hojeLocalIso();

  const colunasComPlanos = useMemo(() => {
    return COLUNAS.map((coluna) => ({
      ...coluna,
      planos: planos
        .filter((p) => p.status === coluna.status)
        .sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999")),
    }));
  }, [planos]);

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

  async function moverPara(id: string, novoStatus: StatusPlanoAcao) {
    try {
      await repository.riskActionPlans.update(id, {
        status: novoStatus,
        concluido_em: novoStatus === "concluido" ? hoje : null,
      });
    } catch (erro) {
      notificarErro("Não foi possível mover o plano", erro);
    }
  }

  function Cartao({ plano }: { plano: RiskActionPlan }) {
    const paciente = pacientes.find((p) => p.id === plano.patient_id);
    const responsavel = responsaveis.find((r) => r.id === plano.responsavel_id);
    const atrasado = plano.status !== "concluido" && !!plano.prazo && plano.prazo < hoje;
    const proximo = PROXIMO[plano.status];
    const anterior = ANTERIOR[plano.status];
    return (
      <div className={`flex flex-col gap-2 rounded-md border bg-surface-raised p-3 shadow-sm ${atrasado ? "border-critical-400/60" : "border-line"}`}>
        <p className="text-sm font-medium text-ink">{paciente?.full_name ?? "—"}</p>
        <p className="text-sm text-ink-soft line-clamp-3">{plano.descricao}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          {responsavel && <span>{responsavel.full_name}</span>}
          {plano.prazo && (
            <span className={atrasado ? "font-medium text-critical-600" : ""}>
              {atrasado ? "Atrasado desde " : "Prazo "}
              {new Date(`${plano.prazo}T00:00:00`).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {anterior ? (
            <Button variant="ghost" size="sm" onClick={() => moverPara(plano.id, anterior)} title="Voltar etapa">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          ) : <span />}
          {plano.status === "concluido" ? (
            <Button variant="ghost" size="sm" onClick={() => moverPara(plano.id, "em_andamento")} title="Reabrir">
              <Undo2 className="h-3.5 w-3.5" /> Reabrir
            </Button>
          ) : proximo ? (
            <Button size="sm" onClick={() => moverPara(plano.id, proximo)}>
              {proximo === "concluido" ? "Concluir" : "Iniciar"} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Planos de Ação"
        description="Medidas preventivas com responsável e prazo, vinculadas a cada paciente — arraste mentalmente da esquerda pra direita."
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

      {planos.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ListChecks className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum plano de ação cadastrado</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {colunasComPlanos.map((coluna) => (
            <Card key={coluna.status} className={`border-t-4 ${coluna.corBorda}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`flex items-center justify-between text-sm font-semibold uppercase tracking-wide ${coluna.corTitulo}`}>
                  {coluna.titulo}
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-soft">{coluna.planos.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {coluna.planos.length === 0 ? (
                  <p className="py-6 text-center text-xs text-ink-soft">Nada aqui.</p>
                ) : (
                  coluna.planos.map((plano) => <Cartao key={plano.id} plano={plano} />)
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
