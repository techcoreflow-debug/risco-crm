-- Corrige "permission denied for table risco_profiles" e erros equivalentes
-- nas outras tabelas do risco. RLS controla QUAIS linhas aparecem, mas o
-- Postgres exige separadamente um GRANT básico na tabela para o role
-- authenticated — migrations rodadas fora do fluxo padrão do dashboard
-- não recebem esse grant automaticamente.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on risco_profiles to authenticated;
grant select, insert, update, delete on risk_types to authenticated;
grant select, insert, update, delete on risk_assessments to authenticated;
grant select, insert, update, delete on risk_action_plans to authenticated;

-- Sem isso, sequences internas (se houver) também bloqueiam insert.
grant usage, select on all sequences in schema public to authenticated;
