# Changelog — inovare.risco

Todo bump de versão em `src/lib/version.ts` (e `package.json`) precisa de
uma entrada aqui, na mesma entrega — mesmo padrão do inovare.fisio.

---

## v0.5.0 — 21/09/2026

**Central de Alertas + Auditoria (Cultura de Segurança)** — fecha a
primeira leva de 8 painéis da visão "risco visionário" pedida pelo
usuário. Sem tabela nova — tudo derivado dos dados que já existem,
lido em tempo real (Realtime).

- **Central de Alertas** (`/alertas`) + sininho na barra superior com
  contador de críticos: junta 5 tipos de alerta — risco alto/muito alto
  sem plano de ação em aberto, reavaliação vencida, plano de ação
  atrasado, paciente internado há mais de 1 dia sem nenhuma avaliação,
  e evento sentinela com dano nas últimas 48h. Não é notificação por
  push/e-mail (esse front não tem essa infra) — é leitura reativa dos
  dados, então aparece sozinho assim que a condição muda.
- **Auditoria** (`/auditoria`): ranking por profissional (avaliações
  feitas, reavaliações em dia, planos de ação no prazo como responsável,
  eventos notificados) + trilha recente com os últimos 40 registros de
  atividade (quem fez o quê e quando), composta a partir dos dados
  existentes.

Com isso fecham os 8 painéis da visão original: Matriz de Risco, Painel
Executivo, Eventos Sentinela, Kanban de Planos de Ação, Linha do tempo
do paciente, Alertas proativos e Auditoria/Cultura de Segurança.

---

## v0.4.0 — 21/09/2026

**Kanban de Planos de Ação + Linha do tempo do paciente** — sem tabela
nova, só UI/UX em cima do que já existia.

- **Planos de Ação** (`/planos-acao`) virou Kanban: 3 colunas (Pendente /
  Em andamento / Concluído), cartão por plano com paciente, responsável,
  prazo (destacado em vermelho se atrasado) e botões pra mover entre
  colunas — inclusive voltar ou reabrir um concluído por engano.
- **Linha do tempo do paciente**: dentro de Pacientes, ao abrir um
  paciente agora tem 2 abas — "Tipos de risco" (como já era) e "Linha do
  tempo", que junta em ordem cronológica avaliações de risco, criação e
  conclusão de planos de ação e eventos sentinela — a história completa
  do paciente numa tela só, sem pular entre módulos.

---

## v0.3.0 — 21/09/2026

**Eventos Sentinela / Notificação de Incidentes** (`/eventos-sentinela`) —
novo módulo, nova tabela (`risk_incidents`, migration `0006`). Até aqui o
risco só guardava a previsão (avaliação de risco); agora dá pra
registrar o que de fato aconteceu (queda, LPP, etc.) e o sistema cruza
automaticamente com a avaliação de risco vigente ANTES do evento —
mostra se a triagem tinha, ou não, identificado aquele paciente como
alto/muito alto.

- Formulário de notificação: paciente, tipo de risco, gravidade (escala
  near miss → óbito, vocabulário do RDC 36/2013), data/hora, descrição,
  fatores contribuintes e medidas tomadas. Ao escolher paciente + tipo +
  data, mostra na hora qual era o risco previsto até aquele momento.
- Vincula automaticamente à internação vigente na data do evento (mesmo
  que já tenha tido alta depois) e à avaliação de risco mais recente
  anterior ao evento.
- Indicador **"Sensibilidade da triagem"**: entre os eventos COM DANO,
  % que já tinham sido identificados como alto/muito alto antes de
  acontecer — é o número que prova (ou desmente) se a avaliação de
  risco está funcionando.
- **Importante**: rodar a migration `0006_eventos_sentinela.sql` no
  banco antes de publicar este build (cria a tabela `risk_incidents`,
  grants e RLS — mesmo processo das migrations anteriores).

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
