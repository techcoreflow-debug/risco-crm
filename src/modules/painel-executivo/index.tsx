import { useMemo } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ShieldCheck, Gauge, ListChecks, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { corDoNivel } from "@/components/shared/risco-badge";
import {
  useRiskAssessments,
  useRiskActionPlans,
  useRiskTypes,
  useAdmissoesAtivas,
  useUnitsRef,
} from "@/data/repository";
import { dataParaIsoLocal, hojeLocalIso } from "@/lib/data-local";
import type { NivelRisco } from "@/types/domain";

const ORDEM_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 1, alto: 2, muito_alto: 3 };
const PONTOS_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 33, alto: 66, muito_alto: 100 };
const CORES_NIVEL: Record<NivelRisco, string> = { baixo: "#4f8f5f", moderado: "#d98d3d", alto: "#bd4238", muito_alto: "#8f2e26" };
const LABEL_NIVEL: Record<NivelRisco, string> = { baixo: "Baixo", moderado: "Moderado", alto: "Alto", muito_alto: "Muito alto" };

function inicioDaSemanaIso(dataIso: string) {
  const d = new Date(`${dataIso}T00:00:00`);
  const diaSemana = d.getDay();
  d.setDate(d.getDate() - diaSemana);
  return dataParaIsoLocal(d);
}

export default function PainelExecutivo() {
  const avaliacoes = useRiskAssessments();
  const planos = useRiskActionPlans();
  const tipos = useRiskTypes();
  const admissoesAtivas = useAdmissoesAtivas();
  const unidades = useUnitsRef();

  const hoje = hojeLocalIso();

  // Última avaliação de cada paciente por tipo — a "foto" atual.
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

  // Nível mais grave de cada paciente internado, entre todos os tipos.
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
      const maior = niveis.reduce((m, n) => (ORDEM_NIVEL[n] > ORDEM_NIVEL[m] ? n : m));
      resultado.set(pacienteId, maior);
    }
    return resultado;
  }, [ultimaAvaliacaoPorPacienteTipo, idsInternadosAtivos]);

  // Cobertura de avaliação — % de internados ativos com pelo menos 1 tipo avaliado.
  const cobertura = admissoesAtivas.length > 0 ? Math.round((nivelAtualPorPaciente.size / admissoesAtivas.length) * 100) : 0;

  // Índice de Risco Hospitalar — média ponderada (0-100) do nível de cada
  // paciente avaliado. Não é um indicador ONA oficial, é um termômetro
  // próprio pra dar 1 número só de "temperatura geral" — sobe se mais
  // gente estiver em nível alto/muito alto, desce se a maioria estiver
  // baixo/moderado.
  const indiceRiscoHospitalar = useMemo(() => {
    if (nivelAtualPorPaciente.size === 0) return null;
    const soma = Array.from(nivelAtualPorPaciente.values()).reduce((acc, n) => acc + PONTOS_NIVEL[n], 0);
    return Math.round(soma / nivelAtualPorPaciente.size);
  }, [nivelAtualPorPaciente]);

  const distribuicaoNivel = useMemo(() => {
    const contagem: Record<NivelRisco, number> = { baixo: 0, moderado: 0, alto: 0, muito_alto: 0 };
    for (const nivel of nivelAtualPorPaciente.values()) contagem[nivel]++;
    return (["baixo", "moderado", "alto", "muito_alto"] as NivelRisco[])
      .map((nivel) => ({ nivel, name: LABEL_NIVEL[nivel], value: contagem[nivel] }))
      .filter((d) => d.value > 0);
  }, [nivelAtualPorPaciente]);

  // Planos de ação — eficácia: % concluído dentro do prazo (sem prazo = não conta pro cálculo).
  const planosComPrazo = planos.filter((p) => p.prazo);
  const planosNoPrazo = planosComPrazo.filter((p) =>
    p.status === "concluido" ? (p.concluido_em ?? "") <= (p.prazo ?? "") : (p.prazo ?? "") >= hoje
  );
  const taxaPlanosNoPrazo = planosComPrazo.length > 0 ? Math.round((planosNoPrazo.length / planosComPrazo.length) * 100) : null;

  // Tendência — avaliações novas por semana, empilhadas por nível, últimas 8 semanas.
  const tendenciaSemanal = useMemo(() => {
    const hoje8semanas = new Date();
    hoje8semanas.setDate(hoje8semanas.getDate() - 56);
    const corte = dataParaIsoLocal(hoje8semanas);
    const porSemana = new Map<string, Record<NivelRisco, number>>();
    for (const a of avaliacoes) {
      const dataIso = a.created_at.slice(0, 10);
      if (dataIso < corte) continue;
      const semana = inicioDaSemanaIso(dataIso);
      const atual = porSemana.get(semana) ?? { baixo: 0, moderado: 0, alto: 0, muito_alto: 0 };
      atual[a.nivel_risco] += 1;
      porSemana.set(semana, atual);
    }
    return Array.from(porSemana.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([semana, valores]) => ({
        semana: semana.slice(8, 10) + "/" + semana.slice(5, 7),
        Baixo: valores.baixo,
        Moderado: valores.moderado,
        Alto: valores.alto,
        "Muito alto": valores.muito_alto,
      }));
  }, [avaliacoes]);

  // Ranking de tipos de risco por prevalência de alto/muito_alto entre avaliados.
  const rankingTipos = useMemo(() => {
    return tipos
      .filter((t) => t.ativo)
      .map((tipo) => {
        const avaliadosDoTipo = Array.from(ultimaAvaliacaoPorPacienteTipo.values()).filter(
          (a) => a.risk_type_id === tipo.id && idsInternadosAtivos.has(a.patient_id)
        );
        const emAlto = avaliadosDoTipo.filter((a) => ORDEM_NIVEL[a.nivel_risco] >= ORDEM_NIVEL.alto).length;
        return {
          nome: tipo.name,
          avaliados: avaliadosDoTipo.length,
          emAlto,
          proporcao: avaliadosDoTipo.length > 0 ? emAlto / avaliadosDoTipo.length : 0,
        };
      })
      .filter((t) => t.avaliados > 0)
      .sort((a, b) => b.proporcao - a.proporcao)
      .slice(0, 6);
  }, [tipos, ultimaAvaliacaoPorPacienteTipo, idsInternadosAtivos]);

  // Ranking de unidades por índice de risco médio.
  const rankingUnidades = useMemo(() => {
    const porUnidade = new Map<string, number[]>();
    for (const adm of admissoesAtivas) {
      const nivel = nivelAtualPorPaciente.get(adm.patient_id);
      if (!nivel || !adm.unit_id) continue;
      const lista = porUnidade.get(adm.unit_id) ?? [];
      lista.push(PONTOS_NIVEL[nivel]);
      porUnidade.set(adm.unit_id, lista);
    }
    return Array.from(porUnidade.entries())
      .map(([unitId, pontos]) => ({
        nome: unidades.find((u) => u.id === unitId)?.name ?? "—",
        indice: Math.round(pontos.reduce((a, b) => a + b, 0) / pontos.length),
        pacientes: pontos.length,
      }))
      .sort((a, b) => b.indice - a.indice)
      .slice(0, 6);
  }, [admissoesAtivas, nivelAtualPorPaciente, unidades]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Painel Executivo"
        description="Temperatura geral do risco assistencial — pra decisão rápida, sem precisar entrar em cada paciente."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-clinical-50 text-clinical-600"><Gauge className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Índice de Risco Hospitalar</p>
              <p className="font-display text-2xl font-semibold text-ink">{indiceRiscoHospitalar ?? "—"}{indiceRiscoHospitalar !== null && <span className="text-sm text-ink-soft">/100</span>}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-recovery-100 text-recovery-600"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Cobertura de avaliação</p>
              <p className="font-display text-2xl font-semibold text-ink">{cobertura}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-attention-100 text-attention-600"><ListChecks className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Planos de ação no prazo</p>
              <p className="font-display text-2xl font-semibold text-ink">{taxaPlanosNoPrazo === null ? "—" : `${taxaPlanosNoPrazo}%`}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-critical-100 text-critical-600"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Internados avaliados</p>
              <p className="font-display text-2xl font-semibold text-ink">{nivelAtualPorPaciente.size}<span className="text-sm text-ink-soft"> / {admissoesAtivas.length}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Avaliações por semana — últimas 8 semanas</CardTitle>
            <p className="text-sm text-ink-soft mt-0.5">Volume de avaliações registradas, por nível de risco.</p>
          </CardHeader>
          <CardContent className="h-64">
            {tendenciaSemanal.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-soft">Sem avaliações nas últimas 8 semanas.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tendenciaSemanal} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ea" vertical={false} />
                  <XAxis dataKey="semana" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#47566b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#47566b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dbe2ea", fontSize: 13 }} />
                  <Legend />
                  <Area type="monotone" dataKey="Baixo" stackId="1" stroke={CORES_NIVEL.baixo} fill={CORES_NIVEL.baixo} fillOpacity={0.75} />
                  <Area type="monotone" dataKey="Moderado" stackId="1" stroke={CORES_NIVEL.moderado} fill={CORES_NIVEL.moderado} fillOpacity={0.75} />
                  <Area type="monotone" dataKey="Alto" stackId="1" stroke={CORES_NIVEL.alto} fill={CORES_NIVEL.alto} fillOpacity={0.75} />
                  <Area type="monotone" dataKey="Muito alto" stackId="1" stroke={CORES_NIVEL.muito_alto} fill={CORES_NIVEL.muito_alto} fillOpacity={0.85} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internados por nível</CardTitle>
            <p className="text-sm text-ink-soft mt-0.5">Estado atual, entre quem já foi avaliado.</p>
          </CardHeader>
          <CardContent className="h-64">
            {distribuicaoNivel.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-soft">Sem avaliações ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribuicaoNivel} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {distribuicaoNivel.map((d) => (
                      <Cell key={d.nivel} fill={CORES_NIVEL[d.nivel]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dbe2ea", fontSize: 13 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tipos de risco mais críticos agora</CardTitle>
            <p className="text-sm text-ink-soft mt-0.5">% dos avaliados em nível Alto ou Muito Alto, por tipo.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {rankingTipos.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">Sem avaliações suficientes ainda.</p>
            ) : (
              rankingTipos.map((t) => (
                <div key={t.nome} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-ink" title={t.nome}>{t.nome}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <div className="h-full rounded-full bg-critical-500" style={{ width: `${Math.round(t.proporcao * 100)}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-ink-soft">{t.emAlto}/{t.avaliados}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unidades por Índice de Risco</CardTitle>
            <p className="text-sm text-ink-soft mt-0.5">Média do nível de risco dos internados avaliados, por unidade.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {rankingUnidades.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">Sem avaliações suficientes ainda.</p>
            ) : (
              rankingUnidades.map((u) => (
                <div key={u.nome} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{u.nome}</p>
                    <p className="text-xs text-ink-soft">{u.pacientes} paciente(s) avaliado(s)</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${corDoNivel(u.indice >= 66 ? "alto" : u.indice >= 33 ? "moderado" : "baixo")}`}>
                    {u.indice}/100
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
