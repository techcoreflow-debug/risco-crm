-- inovare.risco — estrutura inicial
-- Roda no MESMO projeto Supabase do inovare.fisio (mesmo banco). Reaproveita
-- as tabelas patients/admissions/companies do fisio via policy de LEITURA
-- aditiva (nunca escreve nelas) — evita duplicar cadastro de paciente.

create type risco_role as enum ('admin', 'fisioterapeuta', 'enfermagem', 'outro');
create type nivel_risco as enum ('baixo', 'moderado', 'alto', 'muito_alto');
create type status_plano_acao as enum ('pendente', 'em_andamento', 'concluido');

-- Autorização própria do risco — login compartilhado com auth.users do
-- fisio (mesmo id), mas uma conta só acessa o risco se tiver linha aqui.
create table risco_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  role risco_role not null default 'fisioterapeuta',
  is_platform_admin boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index risco_profiles_company_id_idx on risco_profiles (company_id);

create table risk_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  campos jsonb not null default '[]'::jsonb,
  faixas jsonb not null default '[]'::jsonb,
  medidas_preventivas jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table risk_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  patient_id uuid not null references patients (id) on delete cascade,
  admission_id uuid references admissions (id) on delete set null,
  risk_type_id uuid not null references risk_types (id) on delete cascade,
  assessed_by uuid not null references risco_profiles (id),
  respostas jsonb not null default '{}'::jsonb,
  pontuacao numeric not null default 0,
  nivel_risco nivel_risco not null,
  observacoes text,
  reavaliar_em date,
  created_at timestamptz not null default now()
);

create index risk_assessments_company_id_idx on risk_assessments (company_id);
create index risk_assessments_patient_id_idx on risk_assessments (patient_id);

create table risk_action_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  risk_assessment_id uuid references risk_assessments (id) on delete set null,
  patient_id uuid not null references patients (id) on delete cascade,
  descricao text not null,
  responsavel_id uuid references risco_profiles (id) on delete set null,
  status status_plano_acao not null default 'pendente',
  prazo date,
  concluido_em date,
  created_at timestamptz not null default now()
);

create index risk_action_plans_company_id_idx on risk_action_plans (company_id);
create index risk_action_plans_patient_id_idx on risk_action_plans (patient_id);

-- ---- Funções auxiliares de RLS (mesmo padrão do inovare.fisio) ----------

create function current_risco_company_id() returns uuid
language sql stable security definer as $$
  select company_id from risco_profiles where id = auth.uid()
$$;

create function is_risco_platform_admin() returns boolean
language sql stable security definer as $$
  select coalesce((select is_platform_admin from risco_profiles where id = auth.uid()), false)
$$;

-- ---- RLS: tabelas do risco ------------------------------------------------

alter table risco_profiles enable row level security;
alter table risk_types enable row level security;
alter table risk_assessments enable row level security;
alter table risk_action_plans enable row level security;

create policy risco_profiles_leitura on risco_profiles for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());
create policy risco_profiles_escrita_admin on risco_profiles for update
  using (is_risco_platform_admin() or (company_id = current_risco_company_id() and exists (
    select 1 from risco_profiles p where p.id = auth.uid() and p.role = 'admin'
  )));

create policy risk_types_leitura on risk_types for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());
create policy risk_types_escrita on risk_types for all
  using (is_risco_platform_admin() or company_id = current_risco_company_id())
  with check (is_risco_platform_admin() or company_id = current_risco_company_id());

create policy risk_assessments_leitura on risk_assessments for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());
create policy risk_assessments_escrita on risk_assessments for all
  using (is_risco_platform_admin() or company_id = current_risco_company_id())
  with check (is_risco_platform_admin() or company_id = current_risco_company_id());

create policy risk_action_plans_leitura on risk_action_plans for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());
create policy risk_action_plans_escrita on risk_action_plans for all
  using (is_risco_platform_admin() or company_id = current_risco_company_id())
  with check (is_risco_platform_admin() or company_id = current_risco_company_id());

-- ---- RLS aditiva: leitura das tabelas do fisio ----------------------------
-- O risco NUNCA escreve em patients/admissions — só lê, pra reaproveitar o
-- cadastro sem duplicar. Essas policies se somam às que o fisio já tem
-- (RLS é permissivo por padrão — múltiplas policies de SELECT se combinam
-- com OR), então não alteram nada do funcionamento atual do fisio.

create policy risco_le_patients on patients for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());

create policy risco_le_admissions on admissions for select
  using (is_risco_platform_admin() or company_id = current_risco_company_id());

-- ---- Realtime --------------------------------------------------------------

alter publication supabase_realtime add table risco_profiles;
alter publication supabase_realtime add table risk_types;
alter publication supabase_realtime add table risk_assessments;
alter publication supabase_realtime add table risk_action_plans;
