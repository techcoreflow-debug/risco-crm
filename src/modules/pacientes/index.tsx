import { useMemo, useState, type ReactNode } from "react";
import { Search, UserRound, ShieldAlert, History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RiscoBadge, GravidadeBadge } from "@/components/shared/risco-badge";
import { FormularioAvaliacaoRisco } from "@/components/shared/formulario-avaliacao-risco";
import {
  usePatientsRef,
  useAdmissoesAtivas,
  useRiskTypes,
  useRiskAssessments,
  useRiskActionPlans,
  useRiskIncidents,
  useRiscoProfiles,
  nivelMaisAlto,
  repository,
} from "@/data/repository";
import { useAuth } from "@/auth/auth-provider";
import { notificarErro, notificarSucesso } from "@/store/toast-store";
import { useAppStore } from "@/store/app-store";
import { hojeLocalIso } from "@/lib/data-local";
import type { NivelRisco } from "@/types/domain";

function idade(nascimento: string | null) {
  if (!nascimento) return null;
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return anos;
}

export default function Pacientes() {
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();
  const tiposRisco = useRiskTypes();
  const avaliacoes = useRiskAssessments();
  const planos = useRiskActionPlans();
  const incidentes = useRiskIncidents();
  const profissionais = useRiscoProfiles();
  const { profile } = useAuth();
  const empresaId = useAppStore((s) => s.activeCompanyId);
  const [busca, setBusca] = useState("");
  const [pacienteAberto, setPacienteAberto] = useState<string | null>(null);
  const [tipoEmAvaliacao, setTipoEmAvaliacao] = useState<string | null>(null);
  const [aba, setAba] = useState<"tipos" | "timeline">("tipos");
  const [salvando, setSalvando] = useState(false);

  const pacientesInternados = useMemo(() => {
    const idsAtivos = new Set(admissoesAtivas.map((a) => a.patient_id));
    return pacientes.filter((p) => idsAtivos.has(p.id));
  }, [pacientes, admissoesAtivas]);

  const ultimaAvaliacaoPorTipo = useMemo(() => {
    const mapa = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = mapa.get(chave);
      if (!atual || new Date(a.created_at) > new Date(atual.created_at)) mapa.set(chave, a);
    }
    return mapa;
  }, [avaliacoes]);

  function nivelDoPaciente(pacienteId: string): NivelRisco | null {
    const niveis: NivelRisco[] = [];
    for (const tipo of tiposRisco) {
      const av = ultimaAvaliacaoPorTipo.get(`${pacienteId}:${tipo.id}`);
      if (av) niveis.push(av.nivel_risco);
    }
    return nivelMaisAlto(niveis);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pacientesInternados;
    return pacientesInternados.filter((p) => p.full_name.toLowerCase().includes(termo));
  }, [busca, pacientesInternados]);

  const pacienteSelecionado = pacientes.find((p) => p.id === pacienteAberto) ?? null;
  const tipoSelecionado = tiposRisco.find((t) => t.id === tipoEmAvaliacao) ?? null;

  // Linha do tempo do paciente — junta avaliação, plano de ação e evento
  // sentinela numa única lista cronológica, pra ver a história completa
  // sem pular de tela em tela.
  type ItemTimeline = { id: string; data: string; kind: "avaliacao" | "plano" | "plano_concluido" | "evento"; node: ReactNode };
  const timeline: ItemTimeline[] = useMemo(() => {
    if (!pacienteSelecionado) return [];
    const itens: ItemTimeline[] = [];

    for (const a of avaliacoes.filter((a) => a.patient_id === pacienteSelecionado.id)) {
      const tipo = tiposRisco.find((t) => t.id === a.risk_type_id);
      itens.push({
        id: `av-${a.id}`,
        data: a.created_at,
        kind: "avaliacao",
        node: (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Avaliação de risco — {tipo?.name ?? "—"}</p>
              {a.observacoes && <p className="text-xs text-ink-soft">{a.observacoes}</p>}
            </div>
            <RiscoBadge nivel={a.nivel_risco} />
          </div>
        ),
      });
    }

    for (const p of planos.filter((p) => p.patient_id === pacienteSelecionado.id)) {
      const responsavel = profissionais.find((r) => r.id === p.responsavel_id);
      itens.push({
        id: `pl-${p.id}`,
        data: p.created_at,
        kind: "plano",
        node: (
          <div>
            <p className="text-sm font-medium text-ink">Plano de ação criado</p>
            <p className="text-xs text-ink-soft">{p.descricao}{responsavel ? ` · ${responsavel.full_name}` : ""}</p>
          </div>
        ),
      });
      if (p.status === "concluido" && p.concluido_em) {
        itens.push({
          id: `pl-c-${p.id}`,
          data: `${p.concluido_em}T12:00:00`,
          kind: "plano_concluido",
          node: (
            <div>
              <p className="text-sm font-medium text-ink">Plano de ação concluído</p>
              <p className="text-xs text-ink-soft">{p.descricao}</p>
            </div>
          ),
        });
      }
    }

    for (const i of incidentes.filter((i) => i.patient_id === pacienteSelecionado.id)) {
      const tipo = tiposRisco.find((t) => t.id === i.risk_type_id);
      itens.push({
        id: `ev-${i.id}`,
        data: i.ocorrido_em,
        kind: "evento",
        node: (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Evento sentinela — {tipo?.name ?? "—"}</p>
              <p className="text-xs text-ink-soft">{i.descricao}</p>
            </div>
            <GravidadeBadge gravidade={i.gravidade} />
          </div>
        ),
      });
    }

    return itens.sort((a, b) => b.data.localeCompare(a.data));
  }, [pacienteSelecionado, avaliacoes, planos, incidentes, tiposRisco, profissionais]);

  const CORES_KIND: Record<ItemTimeline["kind"], string> = {
    avaliacao: "bg-clinical-500",
    plano: "bg-attention-400",
    plano_concluido: "bg-recovery-500",
    evento: "bg-critical-500",
  };

  async function concluirAvaliacao(dados: { respostas: Record<string, number | string | boolean>; pontuacao: number; observacoes: string }) {
    if (!pacienteSelecionado || !tipoSelecionado || !profile) return;
    const admissao = admissoesAtivas.find((a) => a.patient_id === pacienteSelecionado.id);
    setSalvando(true);
    try {
      const faixaAplicada = tipoSelecionado.faixas.find((f) => dados.pontuacao >= f.min && dados.pontuacao <= f.max);
      const daquiA7dias = new Date();
      daquiA7dias.setDate(daquiA7dias.getDate() + 7);
      await repository.riskAssessments.create({
        company_id: empresaId,
        patient_id: pacienteSelecionado.id,
        admission_id: admissao?.id ?? null,
        risk_type_id: tipoSelecionado.id,
        assessed_by: profile.id,
        respostas: dados.respostas,
        pontuacao: dados.pontuacao,
        nivel_risco: faixaAplicada?.nivel ?? "baixo",
        observacoes: dados.observacoes || null,
        reavaliar_em: daquiA7dias.toISOString().slice(0, 10),
      });
      notificarSucesso("Avaliação registrada.");
      setTipoEmAvaliacao(null);
    } catch (erro) {
      notificarErro("Não foi possível registrar a avaliação", erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pacientes"
        description="Pacientes internados (dados do inovare.fisio) com o risco avaliado em cada tipo cadastrado."
      />

      <Card>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome…" className="pl-9" />
          </div>
          <p className="text-sm text-ink-soft">{filtrados.length} de {pacientesInternados.length} internados</p>
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UserRound className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum paciente internado encontrado</p>
            <p className="text-sm text-ink-soft">Ajuste os termos da busca, ou não há internações ativas no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Idade</th>
                  <th className="px-4 py-3 font-medium">Nível de risco</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((paciente) => {
                  const nivel = nivelDoPaciente(paciente.id);
                  return (
                    <tr key={paciente.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                      <td className="px-4 py-3 font-medium text-ink">{paciente.full_name}</td>
                      <td className="px-4 py-3 text-ink-soft">{idade(paciente.birth_date) ?? "—"}</td>
                      <td className="px-4 py-3">
                        {nivel ? <RiscoBadge nivel={nivel} /> : <span className="text-ink-soft">Sem avaliação</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setPacienteAberto(paciente.id)}>
                          <ShieldAlert className="h-4 w-4" /> Avaliar risco
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Sheet open={!!pacienteAberto} onOpenChange={(open) => { if (!open) { setPacienteAberto(null); setTipoEmAvaliacao(null); setAba("tipos"); } }}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{pacienteSelecionado?.full_name}</SheetTitle>
            <SheetDescription>Avaliações de risco por tipo — cada tipo mantém seu próprio histórico.</SheetDescription>
          </SheetHeader>
          {!tipoSelecionado && (
            <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
              <button
                type="button"
                onClick={() => setAba("tipos")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-medium transition-colors ${
                  aba === "tipos" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-soft"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Tipos de risco
              </button>
              <button
                type="button"
                onClick={() => setAba("timeline")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs font-medium transition-colors ${
                  aba === "timeline" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-soft"
                }`}
              >
                <History className="h-3.5 w-3.5" /> Linha do tempo
              </button>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {!tipoSelecionado && aba === "timeline" ? (
              timeline.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-soft">Nenhum evento registrado ainda pra este paciente.</p>
              ) : (
                <div className="flex flex-col gap-4 pl-1">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative flex gap-3 border-l border-line pb-1 pl-4 last:pb-0">
                      <span className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${CORES_KIND[item.kind]}`} />
                      <div className="flex-1">
                        <p className="mb-0.5 text-[11px] text-ink-soft">{new Date(item.data).toLocaleString("pt-BR")}</p>
                        {item.node}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : !tipoSelecionado ? (
              <div className="flex flex-col gap-2">
                {tiposRisco.map((tipo) => {
                  const av = pacienteSelecionado ? ultimaAvaliacaoPorTipo.get(`${pacienteSelecionado.id}:${tipo.id}`) : undefined;
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => setTipoEmAvaliacao(tipo.id)}
                      className="flex items-center justify-between rounded-md border border-line px-3 py-2.5 text-left hover:bg-surface-sunken"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{tipo.name}</p>
                        {av && (
                          <p className="text-xs text-ink-soft">
                            Última avaliação: {av.created_at.slice(0, 10)}
                            {av.reavaliar_em && av.reavaliar_em < hojeLocalIso() ? " · reavaliação vencida" : ""}
                          </p>
                        )}
                      </div>
                      {av ? <RiscoBadge nivel={av.nivel_risco} /> : <span className="text-xs text-ink-soft">Avaliar</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <FormularioAvaliacaoRisco
                tipo={tipoSelecionado}
                onConcluir={concluirAvaliacao}
                onCancelar={() => setTipoEmAvaliacao(null)}
                salvando={salvando}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
