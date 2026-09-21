import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRiskTypes } from "@/data/repository";
import { RiscoBadge } from "@/components/shared/risco-badge";
import type { NivelRisco } from "@/types/domain";

const NIVEIS: NivelRisco[] = ["baixo", "moderado", "alto", "muito_alto"];

export default function TiposRisco() {
  const tipos = useRiskTypes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tipos de Risco"
        description="Cada tipo tem seus próprios campos de avaliação, faixas de pontuação e medidas preventivas — parametrizável por empresa, não fixo no sistema."
      />

      {tipos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldAlert className="h-8 w-8 text-ink-soft" />
            <p className="font-medium text-ink">Nenhum tipo de risco cadastrado</p>
            <p className="text-sm text-ink-soft">
              Os tipos de risco são semeados pela migration inicial (Queda, Lesão por Pressão, Broncoaspiração,
              Deterioração Clínica, Tromboembolismo, Dispositivos, Delirium). Confirme se a migration 0002 foi
              aplicada no Supabase.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tipos.map((tipo) => (
            <Card key={tipo.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>{tipo.name}</CardTitle>
                  {tipo.description && <p className="mt-1 text-sm text-ink-soft">{tipo.description}</p>}
                </div>
                <Badge variant={tipo.ativo ? "recovery" : "neutral"}>{tipo.ativo ? "Ativo" : "Inativo"}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Campos avaliados ({tipo.campos.length})
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {tipo.campos.map((c) => (
                      <li key={c.chave} className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs text-ink-soft">
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Faixas de pontuação</p>
                  <div className="flex flex-wrap gap-2">
                    {NIVEIS.map((nivel) => {
                      const faixa = tipo.faixas.find((f) => f.nivel === nivel);
                      if (!faixa) return null;
                      return (
                        <div key={nivel} className="flex items-center gap-1.5">
                          <RiscoBadge nivel={nivel} />
                          <span className="text-xs text-ink-soft">{faixa.min}–{faixa.max}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
