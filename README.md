# inovare.risco

SaaS de gestão de risco assistencial de pacientes hospitalizados — produto
irmão do **inovare.fisio**, com o qual compartilha o mesmo projeto Supabase
(mesmo banco de dados) e o mesmo login (`auth.users`). Cada produto tem sua
própria tabela de autorização (`profiles` no fisio, `risco_profiles` aqui),
então uma conta pode ter acesso a um, ao outro, ou aos dois.

## Por que compartilha banco com o fisio

O objetivo era reaproveitar o cadastro de pacientes e internações já
mantido pelo fisio, sem duplicar dados. O risco só tem policy de LEITURA
em `patients`/`admissions`/`companies` (nunca escreve nelas) e mantém suas
próprias tabelas: `risco_profiles`, `risk_types`, `risk_assessments`,
`risk_action_plans`.

## Stack

Mesma do inovare.fisio: React 19 + TypeScript + Vite + Tailwind CSS v4 +
Radix UI + Zustand + react-router-dom v7 + Supabase (client JS + Realtime).

## Rodando localmente

```
npm install
cp .env.example .env.local   # preencher VITE_SUPABASE_ANON_KEY
npm run dev
```

## Migrations

Aplicar em ordem no MESMO projeto Supabase do fisio:
1. `0001_estrutura_inicial.sql` — tabelas próprias + policies de leitura aditivas no fisio + Realtime
2. `0002_tipos_risco_fase1.sql` — semeia os 7 tipos de risco (Fase 1, foco fisioterapia)
3. `0003_admins_fisio_ja_tem_acesso.sql` — bootstrap: admins do fisio ganham acesso admin ao risco

## Edge Functions

`create-risco-user` — gestão de usuários (criar/remover acesso/redefinir
senha). Reaproveita conta existente do fisio pelo e-mail em vez de tentar
duplicar. Deploy: `supabase functions deploy create-risco-user`.

## Fase 2 (não implementada)

Segurança medicamentosa, infecção, sangramento, nutrição, checklist
cirúrgico, eventos adversos — dependem de enfermagem/médicos alimentando
dados; decisão de negócio futura, não só técnica.
