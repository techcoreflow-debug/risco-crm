import type { RiscoRole } from "@/types/domain";

/**
 * Modelo simples pra v0.1: admin vê tudo; os demais papéis (fisioterapeuta,
 * enfermagem, outro) veem o assistencial mas não a administração (usuários/
 * configurações). Sem tabela de permissões granulares por módulo ainda —
 * se precisar, seguir o padrão do inovare.fisio (role_permissions).
 */
const SLUGS_SOMENTE_ADMIN = ["usuarios", "configuracoes"];

export function podeVerModulo(role: RiscoRole, isPlatformAdmin: boolean, slug: string): boolean {
  if (isPlatformAdmin || role === "admin") return true;
  return !SLUGS_SOMENTE_ADMIN.includes(slug);
}
