import { useMemo, useState, type FormEvent } from "react";
import { AlertOctagon, Plus, CheckCircle2, XCircle, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { RiscoBadge, GravidadeBadge } from "@/components/shared/risco-badge";
import {
  useRiskIncidents,
  useRiskTypes,
  useRiskAssessments,
  usePatientsRef,
  useAdmissionsRef,
  repository,
} from "@/data/repository";
import { useAuth } from "@/auth/auth-provider";
import { useAppStore } from "@/store/app-store";
import { notificarErro, notificarSucesso } from "@/store/toast-store";
import { hojeLocalIso } from "@/lib/data-local";
import type { GravidadeIncidente, NivelRisco } from "@/types/domain";

const ORDEM_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 1, alto: 2, muito_alto: 3 };

const GRAVIDADES: GravidadeIncidente[] = ["near_miss", "sem_dano", "dano_leve", "dano_moderado", "dano_grave", "obito"];
const LABEL_GRAVIDADE: Record<GravidadeIncidente, string> = {
  near_miss: "Quase evento (near miss)",
  sem_dano: "Aconteceu, sem dano",
  dano_leve: "Dano leve",
  dano_moderado: "Dano moderado",
  dano_grave: "Dano grave",
  obito: "Óbito",
};
const TEM_DANO: Record<GravidadeIncidente, boolean> = {
  near_miss: false,
  sem_dano: false,
  dano_leve: true,
  dano_moderado: true,
  dano_grave: true,
  obito: true,
};

function agoraParaInputDatetime() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 16);
}

export default function EventosSentinela() {
  const incidentes = useRiskIncidents();
  const tipos = useRiskTypes();
  const avaliacoes = useRiskAssessments();
  const pacientes = usePatientsRef();
  const admissoes = useAdmissionsRef();
  const { profile } = useAuth();
  const empresaId = useAppStore((s) => s.activeCompanyId);

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [gravidade, setGravidade] = useState<GravidadeIncidente>("sem_dano");
  const [ocorridoEm, setOcorridoEm] = useState(agoraParaInputDatetime());
  const [descricao, setDescricao] = useState("");
  const [fatoresContribuintes, setFatoresContribuintes] = useState("");
  const [medidasTomadas, setMedidasTomadas] = useState("");

  const opcoesPacientes = useMemo(() => pacientes.map((p) => ({ value: p.id, label: p.full_name })), [pacientes]);
  const opcoesTipos = useMemo(() => tipos.filter((t) => t.ativo).map((t) => ({ value: t.id, label: t.name })), [tipos]);

  // Internação vigente do paciente na data/hora do evento (pode ser uma
  // internação já encerrada, se o evento é retroativo) — usada só pra
  // guardar o vínculo, não é obrigatória.
  const admissaoDoEvento = useMemo(() => {
    if (!pacienteId || !ocorridoEm) return null;
    const dataEvento = ocorridoEm.slice(0, 10);
    const candidatas = admissoes.filter(
      (a) =>
        a.patient_id === pacienteId &&
        a.admission_date <= dataEvento &&
        (!a.discharge_date || a.discharge_date >= dataEvento)
    );
    return candidatas.sort((a, b) => b.admission_date.localeCompare(a.admission_date))[0] ?? null;
  }, [pacienteId, ocorridoEm, admissoes]);

  // O que a triagem tinha previsto ANTES do evento — só conta avaliação
  // feita até a data/hora do incidente (senão dava pra "prever depois",
  // o que não tem valor nenhum de comparação).
  const avaliacaoVigenteNoEvento = useMemo(() => {
    if (!pacienteId || !tipoId || !ocorridoEm) return null;
    const isoEvento = new Date(ocorridoEm).toISOString();
    const candidatas = avaliacoes.filter(
      (a) => a.patient_id === pacienteId && a.risk_type_id === tipoId && a.created_at <= isoEvento
    );
    return candidatas.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  }, [pacienteId, tipoId, ocorridoEm, avaliacoes]);

  function abrirNovo() {
    setPacienteId("");
    setTipoId("");
    setGravidade("sem_dano");
    setOcorridoEm(agoraParaInputDatetime());
    setDescricao("");
    setFatoresContribuintes("");
    setMedidasTomadas("");
    setAberto(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pacienteId || !tipoId || !profile) return;
    setSalvando(true);
    try {
      await repository.riskIncidents.create({
        company_id: empresaId,
        patient_id: pacienteId,
        admission_id: admissaoDoEvento?.id ?? null,
        risk_type_id: tipoId,
        risk_assessment_id: avaliacaoVigenteNoEvento?.id ?? null,
        nivel_risco_previsto: avaliacaoVigenteNoEvento?.nivel_risco ?? null,
        gravidade,
        ocorrido_em: new Date(ocorridoEm).toISOString(),
        descricao: descricao.trim(),
        fatores_contribuintes: fatoresContribuintes.trim() || null,
        medidas_tomadas: medidasTomadas.trim() || null,
        notificado_por: profile.id,
      });
      notificarSucesso("Evento notificado.");
      setAberto(false);
    } catch (erro) {
      notificarErro("Não foi possível notificar o evento", erro);
    } finally {
      setSalvando(false);
    }
  }

  const incidentesOrdenados = useMemo(
    () => [...incidentes].sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em)),
    [incidentes]
  );

  // Sensibilidade da triagem: entre os eventos QUE TIVERAM DANO, quantos
  // já tinham sido previstos como alto/muito alto antes de acontecer. É o
  // indicador central desse módulo — se estiver baixo, a triagem não está
  // pegando quem realmente corre risco.
  const eventosComDano = incidentesOrdenados.filter((i) => TEM_DANO[i.gravidade]);
  const eventosComDanoPrevistos = eventosComDano.filter(
    (i) => i.nivel_risco_previsto && ORDEM_NIVEL[i.nivel_risco_previsto] >= ORDEM_NIVEL.alto
  );
  const sensibilidade = eventosComDano.length > 0 ? Math.round((eventosComDanoPrevistos.length / eventosComDano.length) * 100) : null;

  const hoje = hojeLocalIso();
  const eventos30dias = incidentesOrdenados.filter((i) => i.ocorrido_em.slice(0, 10) >= new Date(new Date(hoje).setDate(new Date(hoje).getDate() - 30)).toISOString().slice(0, 10));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos Sentinela"
        description="O que de fato aconteceu com o paciente — cruzado com o que a triagem de risco tinha previsto."
        actions={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Notificar evento
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-critical-100 text-critical-600"><AlertOctagon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Eventos nos últimos 30 dias</p>
              <p className="font-display text-2xl font-semibold text-ink">{eventos30dias.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-attention-100 text-attention-600"><AlertOctagon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Com dano (todos os registros)</p>
              <p className="font-display text-2xl font-semibold text-ink">{eventosComDano.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-recovery-100 text-recovery-600"><CheckCircle2 className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Sensibilidade da triagem</p>
              <p className="font-display text-2xl font-semibold text-ink">{sensibilidade === null ? "—" : `${sensibilidade}%`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-line bg-surface-sunken/50 px-3 py-2.5 text-xs text-ink-soft">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          "Sensibilidade da triagem" = entre os eventos COM DANO, quantos já tinham avaliação de risco Alto ou
          Muito Alto registrada ANTES de acontecer. Baixo aqui é sinal de que a avaliação de risco não está
          pegando quem realmente precisa — vale investigar o tipo de risco e a unidade envolvidos.
        </span>
      </div>

      <Card>
        <CardHeader><CardTitle>Eventos notificados</CardTitle></CardHeader>
        <CardContent className="p-0">
          {incidentesOrdenados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <AlertOctagon className="h-8 w-8 text-ink-soft" />
              <p className="font-medium text-ink">Nenhum evento notificado ainda</p>
              <p className="text-sm text-ink-soft">Quando algo acontecer de fato (queda, LPP, etc.), notifique aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-medium">Data/hora</th>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Tipo de risco</th>
                    <th className="px-4 py-3 font-medium">Gravidade</th>
                    <th className="px-4 py-3 font-medium">Risco previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentesOrdenados.map((i) => {
                    const paciente = pacientes.find((p) => p.id === i.patient_id);
                    const tipo = tipos.find((t) => t.id === i.risk_type_id);
                    const foiPrevisto = i.nivel_risco_previsto && ORDEM_NIVEL[i.nivel_risco_previsto] >= ORDEM_NIVEL.alto;
                    return (
                      <tr key={i.id} className="border-b border-line last:border-0 hover:bg-surface-sunken/60">
                        <td className="px-4 py-3 text-ink-soft">{new Date(i.ocorrido_em).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 font-medium text-ink">{paciente?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-ink-soft">{tipo?.name ?? "—"}</td>
                        <td className="px-4 py-3"><GravidadeBadge gravidade={i.gravidade} /></td>
                        <td className="px-4 py-3">
                          {i.nivel_risco_previsto ? (
                            <div className="flex items-center gap-1.5">
                              <RiscoBadge nivel={i.nivel_risco_previsto} />
                              {TEM_DANO[i.gravidade] && (
                                foiPrevisto ? (
                                  <CheckCircle2 className="h-4 w-4 text-recovery-500" aria-label="Risco tinha sido identificado" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-critical-500" aria-label="Risco NÃO tinha sido identificado como alto" />
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-ink-soft">Sem avaliação prévia</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent className="sm:max-w-lg">
          <form className="flex h-full flex-col" onSubmit={handleSubmit}>
            <SheetHeader>
              <SheetTitle>Notificar evento sentinela</SheetTitle>
              <SheetDescription>Registre o que de fato aconteceu — isso não substitui a notificação formal à CCIH/SESMT quando aplicável.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <Label>Paciente</Label>
                <Combobox value={pacienteId} onValueChange={setPacienteId} options={opcoesPacientes} placeholder="Buscar paciente…" searchPlaceholder="Nome…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de risco</Label>
                <Select value={tipoId} onValueChange={setTipoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {opcoesTipos.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ocorrido_em">Data e hora do evento</Label>
                <Input id="ocorrido_em" type="datetime-local" required value={ocorridoEm} onChange={(e) => setOcorridoEm(e.target.value)} />
              </div>

              {pacienteId && tipoId && (
                <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-sunken/50 px-3 py-2.5 text-sm">
                  <span className="text-xs uppercase tracking-wide text-ink-soft">Risco previsto até essa data</span>
                  {avaliacaoVigenteNoEvento ? (
                    <div className="flex items-center gap-2">
                      <RiscoBadge nivel={avaliacaoVigenteNoEvento.nivel_risco} />
                      <span className="text-xs text-ink-soft">avaliado em {avaliacaoVigenteNoEvento.created_at.slice(0, 10)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-attention-700">Nenhuma avaliação registrada pra esse tipo antes dessa data.</span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>Gravidade</Label>
                <Select value={gravidade} onValueChange={(v) => setGravidade(v as GravidadeIncidente)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRAVIDADES.map((g) => <SelectItem key={g} value={g}>{LABEL_GRAVIDADE[g]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricao">O que aconteceu</Label>
                <Textarea id="descricao" required rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o evento com objetividade — fatos, não julgamento." />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fatores">Fatores contribuintes (opcional)</Label>
                <Textarea id="fatores" rows={2} value={fatoresContribuintes} onChange={(e) => setFatoresContribuintes(e.target.value)} placeholder="Ex.: leito sem grade elevada, paciente sozinho no momento…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="medidas">Medidas tomadas (opcional)</Label>
                <Textarea id="medidas" rows={2} value={medidasTomadas} onChange={(e) => setMedidasTomadas(e.target.value)} placeholder="O que foi feito imediatamente após o evento." />
              </div>
            </div>
            <SheetFooter>
              <Button type="button" variant="secondary" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando || !pacienteId || !tipoId || !descricao.trim()}>
                {salvando ? "Salvando…" : "Notificar evento"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
