import { useMemo } from "react";
import { ShieldAlert, ClipboardCheck, ListChecks, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiscoBadge } from "@/components/shared/risco-badge";
import {
  useRiskAssessments,
  useRiskActionPlans,
  usePatientsRef,
  useAdmissoesAtivas,
  nivelMaisAlto,
} from "@/data/repository";
import { hojeLocalIso } from "@/lib/data-local";
import type { NivelRisco } from "@/types/domain";

const NIVEIS: NivelRisco[] = ["muito_alto", "alto", "moderado", "baixo"];

export default function Dashboard() {
  const avaliacoes = useRiskAssessments();
  const planos = useRiskActionPlans();
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();

  // Última avaliação de cada paciente por tipo de risco — o "estado atual"
  // considerado pra classificar o paciente num nível.
  const ultimaAvaliacaoPorPacienteTipo = useMemo(() => {
    const mapa = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = mapa.get(chave);
      if (!atual || new Date(a.created_at) > new Date(atual.created_at)) mapa.set(chave, a);
    }
    return mapa;
  }, [avaliacoes]);

  const idsInternadosAtivos = useMemo(() => new Set(admissoesAtivas.map((a) => a.patient_id)), [admissoesAtivas]);

  const nivelAtualPorPaciente = useMemo(() => {
    const porPaciente = new Map<string, NivelRisco[]>();
    for (const av of ultimaAvaliacaoPorPacienteTipo.values()) {
      if (!idsInternadosAtivos.has(av.patient_id)) continue;
      const lista = porPaciente.get(av.patient_id) ?? [];
      lista.push(av.nivel_risco);
      porPaciente.set(av.patient_id, lista);
    }
    const resultado = new Map<string, NivelRisco>();
    for (const [pacienteId, niveis] of porPaciente) {
      const maior = nivelMaisAlto(niveis);
      if (maior) resultado.set(pacienteId, maior);
    }
    return resultado;
  }, [ultimaAvaliacaoPorPacienteTipo, idsInternadosAtivos]);

  const contagemPorNivel = useMemo(() => {
    const contagem: Record<NivelRisco, number> = { baixo: 0, moderado: 0, alto: 0, muito_alto: 0 };
    for (const nivel of nivelAtualPorPaciente.values()) contagem[nivel]++;
    return contagem;
  }, [nivelAtualPorPaciente]);

  const semAvaliacao = admissoesAtivas.filter((a) => !nivelAtualPorPaciente.has(a.patient_id)).length;

  const hoje = hojeLocalIso();
  const reavaliacoesVencidas = avaliacoes.filter((a) => a.reavaliar_em && a.reavaliar_em < hoje).length;
  const planosAbertos = planos.filter((p) => p.status !== "concluido").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Panorama de risco dos pacientes internados — nível atual, reavaliações pendentes e planos de ação em aberto."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-clinical-50 text-clinical-600"><UserRound className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Internados ativos</p>
              <p className="font-display text-2xl font-semibold text-ink">{admissoesAtivas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-critical-100 text-critical-600"><ShieldAlert className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Sem avaliação de risco</p>
              <p className="font-display text-2xl font-semibold text-ink">{semAvaliacao}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-attention-100 text-attention-600"><ClipboardCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Reavaliações vencidas</p>
              <p className="font-display text-2xl font-semibold text-ink">{reavaliacoesVencidas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-recovery-100 text-recovery-600"><ListChecks className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Planos de ação em aberto</p>
              <p className="font-display text-2xl font-semibold text-ink">{planosAbertos}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pacientes internados por nível de risco</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {NIVEIS.map((nivel) => (
            <div key={nivel} className="flex items-center gap-3">
              <RiscoBadge nivel={nivel} className="w-24 justify-center" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-clinical-500"
                  style={{ width: `${admissoesAtivas.length > 0 ? (contagemPorNivel[nivel] / admissoesAtivas.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-8 text-right text-sm font-medium text-ink">{contagemPorNivel[nivel]}</span>
            </div>
          ))}
          {admissoesAtivas.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-soft">Nenhum paciente internado ativo no momento.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-ink-soft">{pacientes.length} pacientes cadastrados no inovare.fisio (mesmo banco).</p>
    </div>
  );
}
