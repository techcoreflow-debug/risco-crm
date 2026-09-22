import { useMemo, type ReactNode } from "react";
import { ClipboardList, ClipboardCheck, ListChecks, AlertOctagon, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiscoBadge, GravidadeBadge } from "@/components/shared/risco-badge";
import {
  useRiskAssessments,
  useRiskActionPlans,
  useRiskIncidents,
  useRiscoProfiles,
  usePatientsRef,
  useRiskTypes,
} from "@/data/repository";
import { hojeLocalIso } from "@/lib/data-local";

export default function Auditoria() {
  const avaliacoes = useRiskAssessments();
  const planos = useRiskActionPlans();
  const incidentes = useRiskIncidents();
  const profissionais = useRiscoProfiles();
  const pacientes = usePatientsRef();
  const tipos = useRiskTypes();

  const hoje = hojeLocalIso();

  // Avaliação "vigente" = a mais recente de cada paciente+tipo — é sobre
  // essas que faz sentido cobrar reavaliação em dia (uma avaliação
  // antiga, já substituída, não é mais responsabilidade de ninguém).
  const vigentes = useMemo(() => {
    const mapa = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = mapa.get(chave);
      if (!atual || a.created_at > atual.created_at) mapa.set(chave, a);
    }
    return [...mapa.values()];
  }, [avaliacoes]);

  const ranking = useMemo(() => {
    return profissionais
      .map((prof) => {
        const avaliacoesFeitas = avaliacoes.filter((a) => a.assessed_by === prof.id);
        const vigentesDele = vigentes.filter((a) => a.assessed_by === prof.id && a.reavaliar_em);
        const emDia = vigentesDele.filter((a) => a.reavaliar_em! >= hoje).length;
        const planosComoResponsavel = planos.filter((p) => p.responsavel_id === prof.id);
        const planosComPrazo = planosComoResponsavel.filter((p) => p.prazo);
        const planosNoPrazo = planosComPrazo.filter((p) =>
          p.status === "concluido" ? (p.concluido_em ?? "") <= (p.prazo ?? "") : (p.prazo ?? "") >= hoje
        );
        const eventosNotificados = incidentes.filter((i) => i.notificado_por === prof.id).length;
        return {
          prof,
          avaliacoesFeitas: avaliacoesFeitas.length,
          vigentesTotal: vigentesDele.length,
          vigentesEmDia: emDia,
          planosTotal: planosComoResponsavel.length,
          planosComPrazo: planosComPrazo.length,
          planosNoPrazo: planosNoPrazo.length,
          eventosNotificados,
        };
      })
      .filter((r) => r.avaliacoesFeitas > 0 || r.planosTotal > 0 || r.eventosNotificados > 0)
      .sort((a, b) => b.avaliacoesFeitas - a.avaliacoesFeitas);
  }, [profissionais, avaliacoes, vigentes, planos, incidentes, hoje]);

  // Trilha recente — junta os 3 tipos de registro (não existe tabela de
  // log própria; a trilha é composta direto dos dados, que já carregam
  // "quem" e "quando").
  const trilha = useMemo(() => {
    type Item = { id: string; data: string; node: ReactNode };
    const itens: Item[] = [];
    for (const a of avaliacoes) {
      const prof = profissionais.find((p) => p.id === a.assessed_by);
      const paciente = pacientes.find((p) => p.id === a.patient_id);
      const tipo = tipos.find((t) => t.id === a.risk_type_id);
      itens.push({
        id: `av-${a.id}`,
        data: a.created_at,
        node: (
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-clinical-600" />
            <div className="flex-1">
              <p className="text-sm text-ink">
                <span className="font-medium">{prof?.full_name ?? "—"}</span> avaliou {paciente?.full_name ?? "—"} · {tipo?.name ?? "—"}
              </p>
            </div>
            <RiscoBadge nivel={a.nivel_risco} />
          </div>
        ),
      });
    }
    for (const p of planos) {
      const paciente = pacientes.find((pt) => pt.id === p.patient_id);
      const resp = profissionais.find((pr) => pr.id === p.responsavel_id);
      itens.push({
        id: `pl-${p.id}`,
        data: p.created_at,
        node: (
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-attention-600" />
            <div className="flex-1">
              <p className="text-sm text-ink">
                Plano criado pra <span className="font-medium">{paciente?.full_name ?? "—"}</span>
                {resp ? ` · responsável: ${resp.full_name}` : ""}
              </p>
              <p className="text-xs text-ink-soft">{p.descricao}</p>
            </div>
          </div>
        ),
      });
    }
    for (const ev of incidentes) {
      const prof = profissionais.find((p) => p.id === ev.notificado_por);
      const paciente = pacientes.find((p) => p.id === ev.patient_id);
      const tipo = tipos.find((t) => t.id === ev.risk_type_id);
      itens.push({
        id: `ev-${ev.id}`,
        data: ev.created_at,
        node: (
          <div className="flex items-start gap-3">
            <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-critical-600" />
            <div className="flex-1">
              <p className="text-sm text-ink">
                <span className="font-medium">{prof?.full_name ?? "—"}</span> notificou evento — {paciente?.full_name ?? "—"} · {tipo?.name ?? "—"}
              </p>
            </div>
            <GravidadeBadge gravidade={ev.gravidade} />
          </div>
        ),
      });
    }
    return itens.sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40);
  }, [avaliacoes, planos, incidentes, profissionais, pacientes, tipos]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoria"
        description="Cultura de segurança — quem está avaliando, se as reavaliações estão em dia, e a trilha recente de atividade."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4.5 w-4.5" /> Por profissional</CardTitle>
          <p className="text-sm text-ink-soft mt-0.5">Só entram aqui profissionais com pelo menos 1 avaliação, plano ou evento registrado.</p>
        </CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">Sem atividade registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-medium">Profissional</th>
                    <th className="px-4 py-3 font-medium">Avaliações feitas</th>
                    <th className="px-4 py-3 font-medium">Reavaliação em dia</th>
                    <th className="px-4 py-3 font-medium">Planos no prazo</th>
                    <th className="px-4 py-3 font-medium">Eventos notificados</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.prof.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                      <td className="px-4 py-3 font-medium text-ink">{r.prof.full_name}</td>
                      <td className="px-4 py-3 text-ink-soft">{r.avaliacoesFeitas}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {r.vigentesTotal === 0 ? "—" : (
                          <span className={r.vigentesEmDia < r.vigentesTotal ? "font-medium text-critical-600" : ""}>
                            {r.vigentesEmDia}/{r.vigentesTotal}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {r.planosComPrazo === 0 ? "—" : `${r.planosNoPrazo}/${r.planosComPrazo}`}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{r.eventosNotificados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-4.5 w-4.5" /> Trilha recente</CardTitle>
          <p className="text-sm text-ink-soft mt-0.5">Últimos 40 registros — avaliações, planos de ação e eventos sentinela, mais recentes primeiro.</p>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-line p-0">
          {trilha.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">Sem atividade registrada ainda.</p>
          ) : (
            trilha.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <p className="mb-1 text-[11px] text-ink-soft">{new Date(item.data).toLocaleString("pt-BR")}</p>
                {item.node}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
