import type {
  RiscoProfile,
  RiskType,
  RiskAssessment,
  RiskActionPlan,
  RiskIncident,
  PatientRef,
  AdmissionRef,
  HospitalRef,
  UnitRef,
} from "@/types/domain";

/**
 * Tipos do banco de dados do inovare.risco — espelham as migrations 0001
 * a 0003. `Row` reaproveita os tipos de `src/types/domain.ts`. As tabelas
 * `patients`/`admissions`/`hospitals`/`units` são do projeto inovare.fisio
 * (mesmo banco Supabase) — o risco só tem policy de LEITURA nelas.
 */
export interface Database {
  public: {
    Tables: {
      risco_profiles: { Row: RiscoProfile; Insert: Partial<RiscoProfile>; Update: Partial<RiscoProfile> };
      risk_types: { Row: RiskType; Insert: Partial<RiskType>; Update: Partial<RiskType> };
      risk_assessments: { Row: RiskAssessment; Insert: Partial<RiskAssessment>; Update: Partial<RiskAssessment> };
      risk_action_plans: { Row: RiskActionPlan; Insert: Partial<RiskActionPlan>; Update: Partial<RiskActionPlan> };
      risk_incidents: { Row: RiskIncident; Insert: Partial<RiskIncident>; Update: Partial<RiskIncident> };
      patients: { Row: PatientRef; Insert: never; Update: never };
      admissions: { Row: AdmissionRef; Insert: never; Update: never };
      hospitals: { Row: HospitalRef; Insert: never; Update: never };
      units: { Row: UnitRef; Insert: never; Update: never };
    };
  };
}
