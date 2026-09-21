// Edge Function: create-risco-user
//
// Mesmo padrão do create-user do inovare.fisio, mas gerenciando acesso ao
// inovare.risco (tabela risco_profiles) em vez do fisio. Diferença
// importante: como o login é COMPARTILHADO entre os dois produtos (mesma
// auth.users), "create" primeiro confere se o e-mail já existe — se
// existir, só libera o acesso ao risco pro usuário já existente, sem
// tentar criar uma conta duplicada (o que falharia de qualquer forma,
// e-mail é único em auth.users).
//
// Ações (campo `action` no corpo):
//   - "create": cria (ou reaproveita) o usuário em auth.users e garante a
//     linha em risco_profiles com a empresa/papel informados.
//   - "delete": remove só a linha de risco_profiles (NÃO apaga a conta —
//     ela pode continuar tendo acesso ao fisio).
//   - "reset-password": define uma nova senha, ação de admin.
//
// Deploy: supabase functions deploy create-risco-user

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function erro(mensagem: string, status: number) {
  return new Response(JSON.stringify({ error: mensagem }), { status, headers: CORS_HEADERS });
}

function ok(corpo: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, ...corpo }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return erro("Não autenticado.", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const clienteChamador = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: usuarioChamador }, error: erroAuth } = await clienteChamador.auth.getUser();
    if (erroAuth || !usuarioChamador) return erro(`Sessão inválida: ${erroAuth?.message ?? "usuário não encontrado"}`, 401);

    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: perfilChamador, error: erroBuscarPerfil } = await clienteAdmin
      .from("risco_profiles")
      .select("is_platform_admin, role, company_id")
      .eq("id", usuarioChamador.id)
      .maybeSingle();
    if (erroBuscarPerfil) return erro(`Falha ao checar permissão: ${erroBuscarPerfil.message}`, 500);
    const podeGerenciar = perfilChamador?.is_platform_admin || perfilChamador?.role === "admin";
    if (!podeGerenciar) return erro("Só um admin do inovare.risco pode gerenciar usuários por aqui.", 403);

    const corpo = await req.json();
    const action = corpo.action ?? "create";

    if (action === "delete") {
      const { user_id: userId } = corpo;
      if (!userId) return erro("Informe o usuário.", 400);
      if (userId === usuarioChamador.id) return erro("Você não pode remover seu próprio acesso por aqui.", 400);
      // Só remove a AUTORIZAÇÃO do risco — a conta em si (auth.users)
      // continua existindo, pode ter acesso ao fisio.
      const { error: erroExcluir } = await clienteAdmin.from("risco_profiles").delete().eq("id", userId);
      if (erroExcluir) return erro(erroExcluir.message, 400);
      return ok();
    }

    if (action === "reset-password") {
      const { user_id: userId, password } = corpo;
      if (!userId) return erro("Informe o usuário.", 400);
      const novaSenha = password || Math.random().toString(36).slice(-10);
      const { error: erroSenha } = await clienteAdmin.auth.admin.updateUserById(userId, { password: novaSenha });
      if (erroSenha) return erro(erroSenha.message, 400);
      return ok({ password: password ? undefined : novaSenha });
    }

    // action === "create" (padrão)
    const { email, password, full_name: fullName, company_id: companyId, role } = corpo;
    if (!email || !companyId || !role) return erro("Preencha e-mail, empresa e papel.", 400);

    // E-mail já existe (provavelmente conta do fisio)? Reaproveita — nunca
    // tenta criar duplicado, e-mail é único em auth.users de qualquer forma.
    const { data: listaExistente, error: erroListar } = await clienteAdmin.auth.admin.listUsers();
    if (erroListar) return erro(`Falha ao checar e-mails existentes: ${erroListar.message}`, 500);
    const usuarioExistente = listaExistente.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());

    let userId: string;
    if (usuarioExistente) {
      userId = usuarioExistente.id;
    } else {
      if (!password) return erro("Informe uma senha inicial pra um e-mail novo.", 400);
      const { data: criado, error: erroCriar } = await clienteAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email.split("@")[0] },
      });
      if (erroCriar || !criado.user) return erro(erroCriar?.message ?? "Falha ao criar usuário.", 400);
      userId = criado.user.id;
    }

    const { error: erroPerfil } = await clienteAdmin.from("risco_profiles").upsert({
      id: userId,
      company_id: companyId,
      full_name: fullName || email.split("@")[0],
      role,
      ativo: true,
    });
    if (erroPerfil) return erro(`Usuário disponível, mas falhou ao liberar acesso ao risco: ${erroPerfil.message}`, 500);

    return ok({ user_id: userId, reaproveitado: !!usuarioExistente });
  } catch (e) {
    return erro(e instanceof Error ? e.message : "Erro inesperado.", 500);
  }
});
