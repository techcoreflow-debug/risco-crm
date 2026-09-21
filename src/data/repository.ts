import { useMemo } from "react";
import {
  useSupabaseCollection,
  inserirLinha,
  atualizarLinha,
  excluirLinha,
} from "@/data/supabase-collection";
import { useAppStore } from "@/store/app-store";
import type {
  RiscoProfile,
  RiskType,
  RiskAssessment,
  RiskActionPlan,
  PatientRef,
  AdmissionRef,
  HospitalRef,
  UnitRef,
  NivelRisco,
  FaixaRisco,
} from "@/types/domain";

function useActiveCompanyId() {
  return useAppStore((s) => s.activeCompanyId);
}

// ---- Hooks de leitura (Realtime) --------------------------------------

export function useRiscoProfiles() {
  return useSupabaseCollection<RiscoProfile>("risco_profiles", { company_id: useActiveCompanyId() }, "full_name");
}

export function useRiskTypes() {
  return useSupabaseCollection<RiskType>("risk_types", { company_id: useActiveCompanyId() }, "name");
}

export function useRiskAssessments() {
  return useSupabaseCollection<RiskAssessment>(
    "risk_assessments",
    { company_id: useActiveCompanyId() },
    "created_at",
    true
  );
}

export function useRiskActionPlans() {
  return useSupabaseCollection<RiskActionPlan>(
    "risk_action_plans",
    { company_id: useActiveCompanyId() },
    "created_at",
    true
  );
}

/** Leitura somente — tabela é do projeto fisio, mesmo banco. */
export function usePatientsRef() {
  return useSupabaseCollection<PatientRef>("patients", { company_id: useActiveCompanyId() }, "full_name");
}

/** Leitura somente — tabela é do projeto fisio, mesmo banco. */
export function useAdmissionsRef() {
  return useSupabaseCollection<AdmissionRef>("admissions", { company_id: useActiveCompanyId() }, "admission_date", true);
}

export function useHospitalsRef() {
  return useSupabaseCollection<HospitalRef>("hospitals", { company_id: useActiveCompanyId() }, "name");
}

export function useUnitsRef() {
  return useSupabaseCollection<UnitRef>("units", { company_id: useActiveCompanyId() }, "name");
}

/** Internações em andamento (status "internado") — o universo relevante pra avaliação de risco. */
export function useAdmissoesAtivas() {
  const admissoes = useAdmissionsRef();
  return useMemo(() => admissoes.filter((a) => a.status === "internado"), [admissoes]);
}

// ---- Cálculo de nível de risco -----------------------------------------

/**
 * Soma as respostas ponderadas pelo peso de cada campo e resolve o nível
 * de risco a partir das faixas cadastradas no tipo de risco (parametrizável
 * por empresa — não fixo no código). Cai no nível mais alto se a pontuação
 * passar de todas as faixas, e no mais baixo se ficar abaixo de todas —
 * nunca deixa uma avaliação sem nível por faixa mal cadastrada.
 */
export function calcularNivelRisco(
  pontuacao: number,
  faixas: FaixaRisco[]
): NivelRisco {
  const faixaEncontrada = faixas.find((f) => pontuacao >= f.min && pontuacao <= f.max);
  if (faixaEncontrada) return faixaEncontrada.nivel;
  const ordenadas = [...faixas].sort((a, b) => a.min - b.min);
  if (ordenadas.length === 0) return "baixo";
  return pontuacao < ordenadas[0].min ? ordenadas[0].nivel : ordenadas[ordenadas.length - 1].nivel;
}

const ORDEM_NIVEL: Record<NivelRisco, number> = { baixo: 0, moderado: 1, alto: 2, muito_alto: 3 };

/** O nível mais grave entre uma lista de avaliações — usado no badge combinado do paciente. */
export function nivelMaisAlto(niveis: NivelRisco[]): NivelRisco | null {
  if (niveis.length === 0) return null;
  return niveis.reduce((maior, atual) => (ORDEM_NIVEL[atual] > ORDEM_NIVEL[maior] ? atual : maior));
}

// ---- CRUD ---------------------------------------------------------------

export const repository = {
  riskTypes: {
    create: (dados: Partial<RiskType>) => inserirLinha<RiskType>("risk_types", dados),
    update: (id: string, dados: Partial<RiskType>) => atualizarLinha("risk_types", id, dados),
    remove: (id: string) => excluirLinha("risk_types", id),
  },
  riskAssessments: {
    create: (dados: Partial<RiskAssessment>) => inserirLinha<RiskAssessment>("risk_assessments", dados),
    update: (id: string, dados: Partial<RiskAssessment>) => atualizarLinha("risk_assessments", id, dados),
    remove: (id: string) => excluirLinha("risk_assessments", id),
  },
  riskActionPlans: {
    create: (dados: Partial<RiskActionPlan>) => inserirLinha<RiskActionPlan>("risk_action_plans", dados),
    update: (id: string, dados: Partial<RiskActionPlan>) => atualizarLinha("risk_action_plans", id, dados),
    remove: (id: string) => excluirLinha("risk_action_plans", id),
  },
  riscoProfiles: {
    update: (id: string, dados: Partial<RiscoProfile>) => atualizarLinha("risco_profiles", id, dados),
  },
};
