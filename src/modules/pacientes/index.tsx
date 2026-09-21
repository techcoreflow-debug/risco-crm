import { useMemo, useState } from "react";
import { Search, UserRound, ShieldAlert } from "lucide-react";
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
import { RiscoBadge } from "@/components/shared/risco-badge";
import { FormularioAvaliacaoRisco } from "@/components/shared/formulario-avaliacao-risco";
import {
  usePatientsRef,
  useAdmissoesAtivas,
  useRiskTypes,
  useRiskAssessments,
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
  const { profile } = useAuth();
  const empresaId = useAppStore((s) => s.activeCompanyId);
  const [busca, setBusca] = useState("");
  const [pacienteAberto, setPacienteAberto] = useState<string | null>(null);
  const [tipoEmAvaliacao, setTipoEmAvaliacao] = useState<string | null>(null);
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

      <Sheet open={!!pacienteAberto} onOpenChange={(open) => { if (!open) { setPacienteAberto(null); setTipoEmAvaliacao(null); } }}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{pacienteSelecionado?.full_name}</SheetTitle>
            <SheetDescription>Avaliações de risco por tipo — cada tipo mantém seu próprio histórico.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {!tipoSelecionado ? (
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
