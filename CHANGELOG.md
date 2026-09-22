# Changelog — inovare.risco

Todo bump de versão em `src/lib/version.ts` (e `package.json`) precisa de
uma entrada aqui, na mesma entrega — mesmo padrão do inovare.fisio.

---

## v0.2.0 — 21/09/2026

**Primeira leva de painéis "visionários"** — pedido do usuário pra
transformar o risco de MVP em produto de gestão de risco hospitalar de
verdade. Visão completa (8 painéis propostos), começando pelos 2 de
maior valor de decisão:

- **Painel Executivo** (`/painel-executivo`): Índice de Risco Hospitalar
  (0-100, termômetro próprio ponderado por nível), cobertura de
  avaliação, % de planos de ação no prazo, tendência semanal de
  avaliações por nível (últimas 8 semanas), ranking dos tipos de risco
  mais críticos agora e ranking de unidades por índice de risco médio.
- **Matriz de Risco** (`/matriz-risco`): heatmap unidade × tipo de risco,
  colorido pela concentração de pacientes em nível Alto/Muito Alto —
  clica na célula e vê os nomes.

**Pendente pra próxima etapa** (ordem proposta e aceita pelo usuário):
Eventos Sentinela / Notificação de Incidentes (novo módulo, precisa de
tabela nova — cruza risco previsto × evento realmente ocorrido), depois
Kanban de Planos de Ação + Timeline do paciente, depois Alertas
proativos e Auditoria/Cultura de Segurança.

## v0.1.0 — 20/09/2026

Reconstrução completa após reset de ambiente — ver `/areas/inovare-risco.md`
na memória pra histórico. Primeira versão funcional: dashboard, pacientes,
reavaliações, planos de ação, tipos de risco (parametrizável), usuários,
configurações.
