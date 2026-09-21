import { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { RiscoBadge } from "@/components/shared/risco-badge";
import { useRiskAssessments, useRiskTypes, usePatientsRef, useAdmissoesAtivas } from "@/data/repository";
import { hojeLocalIso } from "@/lib/data-local";

export default function Reavaliacoes() {
  const avaliacoes = useRiskAssessments();
  const tipos = useRiskTypes();
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();

  const idsInternadosAtivos = useMemo(() => new Set(admissoesAtivas.map((a) => a.patient_id)), [admissoesAtivas]);

  // Só a avaliação mais recente de cada paciente+tipo importa — reavaliações
  // antigas já foram substituídas por uma mais nova.
  const pendentes = useMemo(() => {
    const hoje = hojeLocalIso();
    const maisRecentePorChave = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = maisRecentePorChave.get(chave);
      if (!atual || new Date(a.created_at) > new Date(atual.created_at)) maisRecentePorChave.set(chave, a);
    }
    return [...maisRecentePorChave.values()]
      .filter((a) => idsInternadosAtivos.has(a.patient_id) && a.reavaliar_em)
      .sort((a, b) => (a.reavaliar_em! < b.reavaliar_em! ? -1 : 1))
      .map((a) => ({ avaliacao: a, vencida: a.reavaliar_em! < hoje }));
  }, [avaliacoes, idsInternadosAtivos]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reavaliações"
        description="Avaliações de risco de pacientes internados com data de reavaliação vencida ou próxima de vencer."
      />

      <Card>
        {pendentes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ClipboardCheck className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhuma reavaliação pendente</p>
            <p className="text-sm text-ink-soft">Todas as avaliações de pacientes internados estão em dia.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Tipo de risco</th>
                  <th className="px-4 py-3 font-medium">Nível atual</th>
                  <th className="px-4 py-3 font-medium">Reavaliar em</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map(({ avaliacao, vencida }) => {
                  const paciente = pacientes.find((p) => p.id === avaliacao.patient_id);
                  const tipo = tipos.find((t) => t.id === avaliacao.risk_type_id);
                  return (
                    <tr key={avaliacao.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                      <td className="px-4 py-3 font-medium text-ink">{paciente?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{tipo?.name ?? "—"}</td>
                      <td className="px-4 py-3"><RiscoBadge nivel={avaliacao.nivel_risco} /></td>
                      <td className={`px-4 py-3 font-medium ${vencida ? "text-critical-600" : "text-ink-soft"}`}>
                        {avaliacao.reavaliar_em} {vencida ? "· vencida" : ""}
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
