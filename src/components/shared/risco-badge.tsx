import type { GravidadeIncidente, NivelRisco } from "@/types/domain";

const LABEL: Record<NivelRisco, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  muito_alto: "Muito alto",
};

/** Classe de cor por nível — reaproveita os tokens attention/critical/recovery já no tema. */
export function corDoNivel(nivel: NivelRisco): string {
  switch (nivel) {
    case "baixo":
      return "border-recovery-400/40 bg-recovery-100 text-recovery-600";
    case "moderado":
      return "border-attention-400/40 bg-attention-100 text-attention-600";
    case "alto":
      return "border-critical-400/40 bg-critical-100 text-critical-600";
    case "muito_alto":
      return "border-critical-600/60 bg-critical-400 text-white";
  }
}

export function RiscoBadge({ nivel, className = "" }: { nivel: NivelRisco; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${corDoNivel(nivel)} ${className}`}
    >
      {LABEL[nivel]}
    </span>
  );
}

const LABEL_GRAVIDADE: Record<GravidadeIncidente, string> = {
  near_miss: "Quase evento",
  sem_dano: "Sem dano",
  dano_leve: "Dano leve",
  dano_moderado: "Dano moderado",
  dano_grave: "Dano grave",
  obito: "Óbito",
};

/** Escala de gravidade de eventos sentinela — segue o vocabulário do RDC 36/2013 (NCC MERP simplificado). */
export function corDaGravidade(gravidade: GravidadeIncidente): string {
  switch (gravidade) {
    case "near_miss":
      return "border-clinical-400/40 bg-clinical-50 text-clinical-700";
    case "sem_dano":
      return "border-recovery-400/40 bg-recovery-100 text-recovery-600";
    case "dano_leve":
      return "border-attention-400/40 bg-attention-100 text-attention-700";
    case "dano_moderado":
      return "border-critical-400/40 bg-critical-100 text-critical-700";
    case "dano_grave":
      return "border-critical-600/60 bg-critical-400 text-white";
    case "obito":
      return "border-ink/60 bg-ink text-white";
  }
}

export function GravidadeBadge({ gravidade, className = "" }: { gravidade: GravidadeIncidente; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${corDaGravidade(gravidade)} ${className}`}
    >
      {LABEL_GRAVIDADE[gravidade]}
    </span>
  );
}
