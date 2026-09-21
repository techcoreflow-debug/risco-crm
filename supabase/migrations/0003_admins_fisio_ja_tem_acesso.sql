-- Bootstrap: quem já é admin no inovare.fisio ganha acesso de admin ao
-- inovare.risco automaticamente — resolve o problema de "a tela de
-- Usuários exige um admin pra existir, mas ainda não existe nenhum".
insert into risco_profiles (id, company_id, full_name, role, is_platform_admin, ativo)
select p.id, p.company_id, p.full_name, 'admin'::risco_role, p.is_platform_admin, true
from profiles p
where (p.role = 'admin' or p.is_platform_admin = true) and p.company_id is not null
on conflict (id) do update set role = 'admin', is_platform_admin = excluded.is_platform_admin, ativo = true;
