import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RiscoBadge } from "@/components/shared/risco-badge";
import { calcularNivelRisco } from "@/data/repository";
import type { RiskType } from "@/types/domain";

interface Props {
  tipo: RiskType;
  onConcluir: (dados: { respostas: Record<string, number | string | boolean>; pontuacao: number; observacoes: string }) => void;
  onCancelar: () => void;
  salvando?: boolean;
}

/**
 * Formulário dinâmico — os campos vêm de `tipo.campos` (JSONB
 * parametrizável por empresa, não fixo no código). Cada campo "escala"
 * soma o valor da opção escolhida (multiplicado pelo peso) na pontuação
 * final; "sim_nao" soma o peso só quando marcado "sim"; "numero" soma o
 * próprio valor × peso; "texto" não entra na pontuação, é só registro.
 */
export function FormularioAvaliacaoRisco({ tipo, onConcluir, onCancelar, salvando }: Props) {
  const [respostas, setRespostas] = useState<Record<string, number | string | boolean>>({});
  const [observacoes, setObservacoes] = useState("");

  const pontuacao = useMemo(() => {
    let total = 0;
    for (const campo of tipo.campos) {
      const peso = campo.peso ?? 1;
      const valor = respostas[campo.chave];
      if (campo.tipo === "escala" && typeof valor === "number") total += valor * peso;
      else if (campo.tipo === "sim_nao" && valor === true) total += peso;
      else if (campo.tipo === "numero" && typeof valor === "number") total += valor * peso;
    }
    return total;
  }, [respostas, tipo.campos]);

  const nivelPrevisto = useMemo(() => calcularNivelRisco(pontuacao, tipo.faixas), [pontuacao, tipo.faixas]);

  function setValor(chave: string, valor: number | string | boolean) {
    setRespostas((r) => ({ ...r, [chave]: valor }));
  }

  const todosPreenchidos = tipo.campos.every((c) => respostas[c.chave] !== undefined);

  return (
    <div className="flex flex-col gap-4">
      {tipo.campos.map((campo) => (
        <div key={campo.chave} className="flex flex-col gap-1.5">
          <Label>{campo.label}</Label>
          {campo.tipo === "escala" && (
            <Select
              value={respostas[campo.chave] !== undefined ? String(respostas[campo.chave]) : ""}
              onValueChange={(v) => setValor(campo.chave, Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(campo.opcoes ?? []).map((op) => (
                  <SelectItem key={op.valor} value={String(op.valor)}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {campo.tipo === "sim_nao" && (
            <Select
              value={respostas[campo.chave] === undefined ? "" : respostas[campo.chave] ? "sim" : "nao"}
              onValueChange={(v) => setValor(campo.chave, v === "sim")}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          )}
          {campo.tipo === "numero" && (
            <Input
              type="number"
              value={typeof respostas[campo.chave] === "number" ? String(respostas[campo.chave]) : ""}
              onChange={(e) => setValor(campo.chave, Number(e.target.value))}
            />
          )}
          {campo.tipo === "texto" && (
            <Input
              value={typeof respostas[campo.chave] === "string" ? (respostas[campo.chave] as string) : ""}
              onChange={(e) => setValor(campo.chave, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          className="rounded-md border border-line-strong bg-surface-raised px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinical-500/40"
        />
      </div>

      <div className="flex items-center justify-between rounded-md bg-surface-sunken px-3 py-2.5">
        <span className="text-sm text-ink-soft">Pontuação: <strong className="text-ink">{pontuacao}</strong></span>
        <RiscoBadge nivel={nivelPrevisto} />
      </div>

      {tipo.medidas_preventivas[nivelPrevisto]?.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-clinical-300 bg-clinical-50 p-3 text-sm">
          <span className="font-medium text-clinical-700">Medidas preventivas sugeridas:</span>
          <ul className="list-disc pl-5 text-clinical-700">
            {tipo.medidas_preventivas[nivelPrevisto].map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button
          type="button"
          disabled={!todosPreenchidos || salvando}
          onClick={() => onConcluir({ respostas, pontuacao, observacoes })}
        >
          {salvando ? "Salvando…" : "Concluir avaliação"}
        </Button>
      </div>
    </div>
  );
}
