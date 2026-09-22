import { useMemo, useState } from "react";
import { Grid3x3, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiscoBadge } from "@/components/shared/risco-badge";
import {
  useRiskAssessments,
  useRiskTypes,
  usePatientsRef,
  useAdmissoesAtivas,
  useUnitsRef,
  useHospitalsRef,
} from "@/data/repository";
import type { NivelRisco } from "@/types/domain";

const ORDEM_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 1, alto: 2, muito_alto: 3 };

// Intensidade da célula: proporção de pacientes em alto/muito_alto sobre o
// total de internados ativos daquela unidade com aquele tipo avaliado.
// Quanto maior a proporção, mais escuro o vermelho — é a leitura visual
// clássica de matriz de risco (heatmap), pensada pra achar foco em
// segundos, sem precisar ler número nenhum.
function corDaCelula(proporcao: number, temDado: boolean): string {
  if (!temDado) return "bg-surface-sunken text-ink-soft/40";
  if (proporcao === 0) return "bg-recovery-100 text-recovery-700";
  if (proporcao < 0.25) return "bg-attention-100 text-attention-700";
  if (proporcao < 0.5) return "bg-critical-100 text-critical-700";
  if (proporcao < 0.75) return "bg-critical-400 text-white";
  return "bg-critical-600 text-white";
}

export default function MatrizRisco() {
  const avaliacoes = useRiskAssessments();
  const tipos = useRiskTypes();
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();
  const unidades = useUnitsRef();
  const hospitais = useHospitalsRef();

  const [celulaAberta, setCelulaAberta] = useState<{ unitId: string; tipoId: string } | null>(null);

  const tiposAtivos = useMemo(() => tipos.filter((t) => t.ativo), [tipos]);

  // Última avaliação de cada paciente, por tipo de risco.
  const ultimaAvaliacaoPorPacienteTipo = useMemo(() => {
    const mapa = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = mapa.get(chave);
      if (!atual || new Date(a.created_at) > new Date(atual.created_at)) mapa.set(chave, a);
    }
    return mapa;
  }, [avaliacoes]);

  // Unidades que têm pelo menos 1 internado ativo agora — não faz sentido
  // mostrar linha de unidade vazia na matriz.
  const unidadesComInternado = useMemo(() => {
    const idsUnidade = new Set(admissoesAtivas.map((a) => a.unit_id).filter(Boolean));
    return unidades
      .filter((u) => idsUnidade.has(u.id))
      .map((u) => ({ ...u, hospitalNome: hospitais.find((h) => h.id === u.hospital_id)?.name ?? "—" }));
  }, [unidades, admissoesAtivas, hospitais]);

  const matriz = useMemo(() => {
    return unidadesComInternado.map((unidade) => {
      const pacientesDaUnidade = admissoesAtivas.filter((a) => a.unit_id === unidade.id).map((a) => a.patient_id);
      const celulas = tiposAtivos.map((tipo) => {
        const avaliados = pacientesDaUnidade
          .map((pacienteId) => ultimaAvaliacaoPorPacienteTipo.get(`${pacienteId}:${tipo.id}`))
          .filter((a): a is NonNullable<typeof a> => !!a);
        const emRisco = avaliados.filter((a) => ORDEM_NIVEL[a.nivel_risco] >= ORDEM_NIVEL.alto);
        return {
          tipoId: tipo.id,
          totalPacientes: pacientesDaUnidade.length,
          avaliados: avaliados.length,
          emRisco: emRisco.length,
          proporcao: avaliados.length > 0 ? emRisco.length / avaliados.length : 0,
          nomesEmRisco: emRisco.map((a) => ({
            nome: pacientes.find((p) => p.id === a.patient_id)?.full_name ?? "—",
            nivel: a.nivel_risco,
          })),
        };
      });
      return { unidade, celulas, totalPacientes: pacientesDaUnidade.length };
    });
  }, [unidadesComInternado, admissoesAtivas, tiposAtivos, ultimaAvaliacaoPorPacienteTipo, pacientes]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Matriz de Risco"
        description="Unidade × tipo de risco — onde estão os focos agora, entre os pacientes internados. Quanto mais escuro, maior a concentração de risco alto/muito alto."
      />

      {matriz.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Grid3x3 className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum internado ativo agora</p>
            <p className="text-sm text-ink-soft">A matriz aparece assim que houver internações ativas no inovare.fisio.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Grid3x3 className="h-4.5 w-4.5" /> Concentração de risco por unidade</CardTitle>
            <p className="text-sm text-ink-soft mt-0.5">
              Cada célula mostra quantos pacientes da unidade estão em nível Alto ou Muito Alto pra aquele tipo de
              risco, sobre o total já avaliado. Clique numa célula pra ver os nomes.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-4">
            <table className="w-full border-separate border-spacing-1.5 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-raised px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                    Unidade
                  </th>
                  {tiposAtivos.map((tipo) => (
                    <th key={tipo.id} className="min-w-[110px] px-2 py-1.5 text-center text-xs font-medium text-ink-soft">
                      {tipo.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.map(({ unidade, celulas, totalPacientes }) => (
                  <tr key={unidade.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-surface-raised px-2 py-1.5 text-sm font-medium text-ink">
                      {unidade.name}
                      <span className="ml-1.5 text-xs font-normal text-ink-soft">({totalPacientes})</span>
                      <p className="text-[11px] font-normal text-ink-soft">{unidade.hospitalNome}</p>
                    </td>
                    {celulas.map((celula) => (
                      <td key={celula.tipoId} className="p-0">
                        <button
                          type="button"
                          onClick={() =>
                            celula.emRisco > 0
                              ? setCelulaAberta({ unitId: unidade.id, tipoId: celula.tipoId })
                              : undefined
                          }
                          className={`flex h-14 w-full flex-col items-center justify-center rounded-md text-xs font-semibold transition-opacity ${corDaCelula(
                            celula.proporcao,
                            celula.avaliados > 0
                          )} ${celula.emRisco > 0 ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                          title={
                            celula.avaliados === 0
                              ? "Nenhum paciente avaliado ainda"
                              : `${celula.emRisco} de ${celula.avaliados} avaliado(s) em risco alto/muito alto`
                          }
                        >
                          <span className="text-sm">{celula.avaliados === 0 ? "—" : `${celula.emRisco}/${celula.avaliados}`}</span>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {celulaAberta && (() => {
        const linha = matriz.find((m) => m.unidade.id === celulaAberta.unitId);
        const celula = linha?.celulas.find((c) => c.tipoId === celulaAberta.tipoId);
        const tipo = tiposAtivos.find((t) => t.id === celulaAberta.tipoId);
        if (!linha || !celula) return null;
        return (
          <Card className="border-critical-400/40">
            <CardHeader>
              <CardTitle className="text-base">
                {linha.unidade.name} · {tipo?.name}
              </CardTitle>
              <p className="text-sm text-ink-soft mt-0.5">Pacientes em risco Alto ou Muito Alto neste cruzamento.</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {celula.nomesEmRisco.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                  <span className="text-sm text-ink">{p.nome}</span>
                  <RiscoBadge nivel={p.nivel} />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })()}

      <div className="flex items-start gap-2 rounded-md border border-line bg-surface-sunken/50 px-3 py-2.5 text-xs text-ink-soft">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Escala de cor: verde = ninguém em risco alto/muito alto · amarelo = até 25% dos avaliados · vermelho
          claro a escuro = de 25% a 100%. Célula cinza = ninguém da unidade foi avaliado ainda pra esse tipo de
          risco.
        </span>
      </div>
    </div>
  );
}
