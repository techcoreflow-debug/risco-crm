-- Eventos Sentinela / Notificação de Incidentes.
--
-- Até aqui o risco só guardava a PREVISÃO (risk_assessments — "esse
-- paciente está em risco alto de queda"). Essa tabela guarda o que de
-- fato ACONTECEU (o paciente caiu, teve LPP, etc.) — é o cruzamento
-- previsto × realizado que prova (ou desmente) se a triagem de risco
-- está funcionando, e é a base de qualquer indicador real de segurança
-- do paciente (taxa de queda COM DANO, por exemplo).
--
-- Classificação de gravidade segue o vocabulário usado nos protocolos de
-- segurança do paciente (RDC 36/2013 / NCC MERP simplificado): da
-- notificação sem nenhum dano até o óbito.

create type gravidade_incidente as enum (
  'near_miss',      -- quase aconteceu, não chegou a atingir o paciente
  'sem_dano',       -- aconteceu, mas sem dano identificável
  'dano_leve',
  'dano_moderado',
  'dano_grave',
  'obito'
);

create table risk_incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  admission_id uuid references admissions (id) on delete set null,
  risk_type_id uuid not null references risk_types (id) on delete restrict,
  -- Avaliação de risco vigente no momento do evento, se houver — é o que
  -- permite comparar "o que foi previsto" com "o que aconteceu". Fica nula
  -- quando o paciente nunca tinha sido avaliado pra esse tipo de risco
  -- (o que É, em si, um dado relevante: evento em quem não foi avaliado).
  risk_assessment_id uuid references risk_assessments (id) on delete set null,
  nivel_risco_previsto nivel_risco,
  gravidade gravidade_incidente not null,
  ocorrido_em timestamptz not null,
  descricao text not null,
  fatores_contribuintes text,
  medidas_tomadas text,
  notificado_por uuid not null references risco_profiles (id),
  created_at timestamptz not null default now()
);

create index risk_incidents_company_id_idx on risk_incidents (company_id);
create index risk_incidents_patient_id_idx on risk_incidents (patient_id);
create index risk_incidents_risk_type_id_idx on risk_incidents (risk_type_id);
create index risk_incidents_ocorrido_em_idx on risk_incidents (ocorrido_em);

alter table risk_incidents enable row level security;

create policy risk_incidents_leitura on risk_incidents for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());
create policy risk_incidents_escrita on risk_incidents for all
  using (is_risco_platform_admin() or company_id = current_risco_company_id())
  with check (is_risco_platform_admin() or company_id = current_risco_company_id());

grant select, insert, update, delete on risk_incidents to authenticated;

alter publication supabase_realtime add table risk_incidents;
