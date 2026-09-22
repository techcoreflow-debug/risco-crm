-- Corrige bug da migration 0003: o filtro "company_id is not null" excluía
-- justamente os admins de PLATAFORMA (is_platform_admin=true), que no
-- fisio têm company_id nulo por definição (enxergam todas as empresas).
-- risco_profiles.company_id é NOT NULL, então usamos a primeira empresa
-- cadastrada como valor de preenchimento — não restringe nada na prática,
-- porque toda policy do risco já libera acesso total pra
-- is_platform_admin=true, independente do company_id armazenado.

insert into risco_profiles (id, company_id, full_name, role, is_platform_admin, ativo)
select
  p.id,
  coalesce(p.company_id, (select id from companies order by created_at limit 1)),
  p.full_name,
  'admin'::risco_role,
  p.is_platform_admin,
  true
from profiles p
where (p.role = 'admin' or p.is_platform_admin = true)
on conflict (id) do update
  set role = 'admin',
      is_platform_admin = excluded.is_platform_admin,
      ativo = true,
      company_id = coalesce(risco_profiles.company_id, excluded.company_id);
