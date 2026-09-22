import { useMemo } from "react";
import {
  useRiskAssessments,
  useRiskActionPlans,
  useRiskIncidents,
  useRiskTypes,
  usePatientsRef,
  useAdmissoesAtivas,
} from "@/data/repository";
import { hojeLocalIso } from "@/lib/data-local";
import type { NivelRisco } from "@/types/domain";

const ORDEM_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 1, alto: 2, muito_alto: 3 };
const TEM_DANO_GRAVIDADE = new Set(["dano_leve", "dano_moderado", "dano_grave", "obito"]);

export type SeveridadeAlerta = "critico" | "atencao";
export type TipoAlerta = "risco_sem_plano" | "reavaliacao_vencida" | "plano_atrasado" | "sem_avaliacao" | "evento_recente";

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  pacienteId: string;
  pacienteNome: string;
  titulo: string;
  detalhe: string;
  data: string; // pra ordenação — quanto mais antiga, mais urgente aparece primeiro dentro da mesma severidade
}

/**
 * Central de alertas proativos — não é notificação por push/e-mail (esse
 * front não tem infra pra isso), é uma leitura em tempo real dos dados
 * já carregados via Realtime: assim que um paciente sobe de nível, uma
 * reavaliação vence, ou um plano atrasa, o alerta aparece aqui e no
 * sininho da barra superior, sem precisar ninguém rodar relatório.
 */
export function useAlertas(): Alerta[] {
  const avaliacoes = useRiskAssessments();
  const planos = useRiskActionPlans();
  const incidentes = useRiskIncidents();
  const tipos = useRiskTypes();
  const pacientes = usePatientsRef();
  const admissoesAtivas = useAdmissoesAtivas();

  return useMemo(() => {
    const hoje = hojeLocalIso();
    const nomeDoPaciente = (id: string) => pacientes.find((p) => p.id === id)?.full_name ?? "—";
    const nomeDoTipo = (id: string) => tipos.find((t) => t.id === id)?.name ?? "—";

    // Última avaliação de cada paciente+tipo.
    const ultimaPorChave = new Map<string, (typeof avaliacoes)[number]>();
    for (const a of avaliacoes) {
      const chave = `${a.patient_id}:${a.risk_type_id}`;
      const atual = ultimaPorChave.get(chave);
      if (!atual || a.created_at > atual.created_at) ultimaPorChave.set(chave, a);
    }

    const idsInternados = new Set(admissoesAtivas.map((a) => a.patient_id));
    const alertas: Alerta[] = [];

    // 1) Risco alto/muito alto sem nenhum plano de ação em aberto.
    for (const av of ultimaPorChave.values()) {
      if (!idsInternados.has(av.patient_id)) continue;
      if (ORDEM_NIVEL[av.nivel_risco] < ORDEM_NIVEL.alto) continue;
      const temPlanoAberto = planos.some((p) => p.patient_id === av.patient_id && p.status !== "concluido");
      if (temPlanoAberto) continue;
      alertas.push({
        id: `plano-${av.id}`,
        tipo: "risco_sem_plano",
        severidade: av.nivel_risco === "muito_alto" ? "critico" : "atencao",
        pacienteId: av.patient_id,
        pacienteNome: nomeDoPaciente(av.patient_id),
        titulo: `Risco ${av.nivel_risco === "muito_alto" ? "muito alto" : "alto"} sem plano de ação`,
        detalhe: `${nomeDoTipo(av.risk_type_id)} — nenhuma medida preventiva em aberto pra esse paciente.`,
        data: av.created_at,
      });
    }

    // 2) Reavaliação vencida.
    for (const av of ultimaPorChave.values()) {
      if (!idsInternados.has(av.patient_id) || !av.reavaliar_em || av.reavaliar_em >= hoje) continue;
      alertas.push({
        id: `reav-${av.id}`,
        tipo: "reavaliacao_vencida",
        severidade: ORDEM_NIVEL[av.nivel_risco] >= ORDEM_NIVEL.alto ? "critico" : "atencao",
        pacienteId: av.patient_id,
        pacienteNome: nomeDoPaciente(av.patient_id),
        titulo: "Reavaliação vencida",
        detalhe: `${nomeDoTipo(av.risk_type_id)} — venceu em ${av.reavaliar_em}.`,
        data: av.reavaliar_em,
      });
    }

    // 3) Plano de ação atrasado.
    for (const p of planos) {
      if (p.status === "concluido" || !p.prazo || p.prazo >= hoje) continue;
      alertas.push({
        id: `atraso-${p.id}`,
        tipo: "plano_atrasado",
        severidade: "atencao",
        pacienteId: p.patient_id,
        pacienteNome: nomeDoPaciente(p.patient_id),
        titulo: "Plano de ação atrasado",
        detalhe: `${p.descricao} — prazo era ${p.prazo}.`,
        data: p.prazo,
      });
    }

    // 4) Internado há mais de 1 dia sem NENHUMA avaliação de risco ainda.
    for (const adm of admissoesAtivas) {
      if (adm.admission_date >= hoje) continue; // entrou hoje, ainda dá tempo
      const temAlguma = avaliacoes.some((a) => a.patient_id === adm.patient_id);
      if (temAlguma) continue;
      alertas.push({
        id: `semav-${adm.id}`,
        tipo: "sem_avaliacao",
        severidade: "critico",
        pacienteId: adm.patient_id,
        pacienteNome: nomeDoPaciente(adm.patient_id),
        titulo: "Internado sem nenhuma avaliação de risco",
        detalhe: `Internado desde ${adm.admission_date}, ainda sem nenhum tipo de risco avaliado.`,
        data: adm.admission_date,
      });
    }

    // 5) Evento sentinela com dano nas últimas 48h — pede revisão rápida.
    const corte48h = new Date();
    corte48h.setHours(corte48h.getHours() - 48);
    for (const ev of incidentes) {
      if (!TEM_DANO_GRAVIDADE.has(ev.gravidade)) continue;
      if (new Date(ev.ocorrido_em) < corte48h) continue;
      alertas.push({
        id: `evento-${ev.id}`,
        tipo: "evento_recente",
        severidade: "critico",
        pacienteId: ev.patient_id,
        pacienteNome: nomeDoPaciente(ev.patient_id),
        titulo: "Evento sentinela recente com dano",
        detalhe: `${nomeDoTipo(ev.risk_type_id)} — ocorrido em ${new Date(ev.ocorrido_em).toLocaleString("pt-BR")}.`,
        data: ev.ocorrido_em,
      });
    }

    return alertas.sort((a, b) => {
      if (a.severidade !== b.severidade) return a.severidade === "critico" ? -1 : 1;
      return a.data.localeCompare(b.data);
    });
  }, [avaliacoes, planos, incidentes, tipos, pacientes, admissoesAtivas]);
}
