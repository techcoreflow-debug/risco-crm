import { useMemo, useState } from "react";
import { Bell, ShieldAlert, ClipboardCheck, ListChecks, UserRound, AlertOctagon, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useAlertas, type TipoAlerta } from "@/data/alertas";

const ICONE_TIPO: Record<TipoAlerta, typeof ShieldAlert> = {
  risco_sem_plano: ShieldAlert,
  reavaliacao_vencida: ClipboardCheck,
  plano_atrasado: ListChecks,
  sem_avaliacao: UserRound,
  evento_recente: AlertOctagon,
};

const FILTROS: { valor: TipoAlerta | "todos"; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "risco_sem_plano", label: "Risco sem plano" },
  { valor: "reavaliacao_vencida", label: "Reavaliação vencida" },
  { valor: "plano_atrasado", label: "Plano atrasado" },
  { valor: "sem_avaliacao", label: "Sem avaliação" },
  { valor: "evento_recente", label: "Evento recente" },
];

export default function Alertas() {
  const alertas = useAlertas();
  const [filtro, setFiltro] = useState<TipoAlerta | "todos">("todos");

  const filtrados = useMemo(() => (filtro === "todos" ? alertas : alertas.filter((a) => a.tipo === filtro)), [alertas, filtro]);
  const criticos = alertas.filter((a) => a.severidade === "critico").length;
  const atencao = alertas.filter((a) => a.severidade === "atencao").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central de Alertas"
        description="Tudo que pede atenção agora — atualizado em tempo real, sem precisar rodar relatório."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-critical-100 text-critical-600"><Bell className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Críticos</p>
              <p className="font-display text-2xl font-semibold text-ink">{criticos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-attention-100 text-attention-600"><Bell className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-ink-soft">Pra ficar de olho</p>
              <p className="font-display text-2xl font-semibold text-ink">{atencao}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f.valor ? "border-clinical-500 bg-clinical-50 text-clinical-700" : "border-line text-ink-soft hover:bg-surface-sunken"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 className="h-8 w-8 text-recovery-500" />
            <p className="font-medium text-ink">Nada pendente por aqui</p>
            <p className="text-sm text-ink-soft">Assim que algo pedir atenção, aparece nesta lista.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {filtrados.map((a) => {
              const Icone = ICONE_TIPO[a.tipo];
              return (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      a.severidade === "critico" ? "bg-critical-100 text-critical-600" : "bg-attention-100 text-attention-700"
                    }`}
                  >
                    <Icone className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{a.titulo}</p>
                    <p className="text-xs text-ink-soft">{a.pacienteNome} · {a.detalhe}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
