// Tipos de domínio do inovare.risco — espelham as migrations 0001/0002.
// Convenção igual à do inovare.fisio: snake_case, 1:1 com as colunas.

export type RiscoRole = "admin" | "fisioterapeuta" | "enfermagem" | "outro";
export type NivelRisco = "baixo" | "moderado" | "alto" | "muito_alto";
export type StatusPlanoAcao = "pendente" | "em_andamento" | "concluido";

export interface RiscoProfile {
  id: string; // mesmo id de auth.users — login compartilhado com o fisio
  company_id: string; // mesmo company_id do projeto fisio (mesmo banco)
  full_name: string;
  role: RiscoRole;
  is_platform_admin: boolean;
  ativo: boolean;
  created_at: string;
}

/** Um campo do formulário dinâmico de avaliação (JSONB em risk_types.campos). */
export interface CampoAvaliacaoRisco {
  chave: string;
  label: string;
  tipo: "escala" | "sim_nao" | "texto" | "numero";
  opcoes?: { valor: number; label: string }[]; // pra tipo "escala"
  peso?: number; // multiplicador na pontuação final
}

/** Uma faixa de pontuação → nível de risco (JSONB em risk_types.faixas). */
export interface FaixaRisco {
  nivel: NivelRisco;
  min: number;
  max: number;
}

export interface RiskType {
  id: string;
  company_id: string;
  code: string; // ex.: "queda", "lesao_pressao"
  name: string; // ex.: "Risco de Queda"
  description: string | null;
  campos: CampoAvaliacaoRisco[]; // formulário parametrizável, não fixo no código
  faixas: FaixaRisco[]; // pontuação → nível
  medidas_preventivas: Record<NivelRisco, string[]>; // sugestões por nível
  ativo: boolean;
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  company_id: string;
  patient_id: string; // FK -> fisio.patients (leitura, mesmo banco)
  admission_id: string | null; // FK -> fisio.admissions (leitura, mesmo banco)
  risk_type_id: string;
  assessed_by: string; // FK -> risco_profiles.id
  respostas: Record<string, number | string | boolean>; // valores dados a cada campo
  pontuacao: number;
  nivel_risco: NivelRisco;
  observacoes: string | null;
  reavaliar_em: string | null; // data (ISO) da próxima reavaliação sugerida
  created_at: string;
}

export interface RiskActionPlan {
  id: string;
  company_id: string;
  risk_assessment_id: string | null;
  patient_id: string;
  descricao: string;
  responsavel_id: string | null; // FK -> risco_profiles.id
  status: StatusPlanoAcao;
  prazo: string | null; // data (ISO)
  concluido_em: string | null;
  created_at: string;
}

// Projeções somente-leitura das tabelas do fisio (mesmo banco, mesmo
// projeto Supabase) — o risco NUNCA escreve nelas, só lê via as policies
// aditivas `risco_le_patients` / `risco_le_admissions`.
export interface PatientRef {
  id: string;
  company_id: string;
  full_name: string;
  birth_date: string | null;
  document: string | null;
  sexo: "M" | "F" | null;
}

export interface AdmissionRef {
  id: string;
  company_id: string;
  patient_id: string;
  hospital_id: string;
  unit_id: string;
  bed_id: string | null;
  status: string;
  admission_date: string;
  discharge_date: string | null;
}

// Projeções somente-leitura de referência (hospital/unidade), só pra
// exibir nome em vez de id — mesmo esquema de leitura aditiva.
export interface HospitalRef {
  id: string;
  company_id: string;
  name: string;
}

export interface UnitRef {
  id: string;
  company_id: string;
  hospital_id: string;
  name: string;
}
