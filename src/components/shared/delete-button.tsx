import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificarErro, notificarSucesso } from "@/store/toast-store";

interface DeleteButtonProps {
  itemLabel: string;
  onConfirm: () => Promise<void>;
  /** Reservado pra quando o risco ganhar permissões granulares por módulo — sem efeito hoje. */
  moduleSlug?: string;
}

/**
 * Ação de exclusão padrão — mesmo padrão do inovare.fisio (confirmação
 * nativa, erro sempre exibido, nunca falha em silêncio).
 */
export function DeleteButton({ itemLabel, onConfirm }: DeleteButtonProps) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Excluir "${itemLabel}"? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      await onConfirm();
      notificarSucesso(`"${itemLabel}" excluído.`);
    } catch (erro) {
      notificarErro(`Não foi possível excluir "${itemLabel}"`, erro);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} disabled={excluindo} aria-label={`Excluir ${itemLabel}`}>
      <Trash2 className="h-4 w-4 text-critical-400" />
    </Button>
  );
}
