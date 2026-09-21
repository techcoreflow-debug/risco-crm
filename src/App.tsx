import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, type ComponentType } from "react";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { todosOsModulos } from "@/app/modules-registry";
import { AuthProvider, useAuth } from "@/auth/auth-provider";
import { podeVerModulo } from "@/lib/permissions";
import { Toaster } from "@/components/shared/toaster";
import Login from "@/modules/auth/login";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase";

const pageComponents: Record<string, ComponentType> = {
  dashboard: lazy(() => import("@/modules/dashboard")),
  pacientes: lazy(() => import("@/modules/pacientes")),
  reavaliacoes: lazy(() => import("@/modules/reavaliacoes")),
  "planos-acao": lazy(() => import("@/modules/planos-acao")),
  "tipos-risco": lazy(() => import("@/modules/tipos-risco")),
  usuarios: lazy(() => import("@/modules/usuarios")),
  configuracoes: lazy(() => import("@/modules/configuracoes")),
};

function PageFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-52 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  );
}

function TelaCarregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
    </div>
  );
}

function AuthGate() {
  const { session, profile, loading, profileLoading, semAcessoAoRisco, refreshProfile, signOut } = useAuth();

  if (loading) return <TelaCarregando />;
  if (!session) return <Login />;
  if (profileLoading) return <TelaCarregando />;

  if (semAcessoAoRisco) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
        <p className="font-display font-semibold text-ink">Essa conta não tem acesso ao inovare.risco</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Seu login funciona (é o mesmo do inovare.fisio), mas ainda não foi liberado acesso a este sistema.
          Peça a um administrador para te cadastrar em Usuários, dentro do inovare.risco.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.open("https://fisio.inovaretech.com", "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-4 w-4" /> Ir para inovare.fisio
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
        <p className="font-display font-semibold text-ink">Preparando seu acesso…</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refreshProfile()}>Atualizar</Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>Sair</Button>
        </div>
      </div>
    );
  }

  const perfil = profile;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {todosOsModulos.map((mod) => {
          const Component = pageComponents[mod.slug];
          const bloqueado = !podeVerModulo(perfil.role, perfil.is_platform_admin, mod.slug);
          return (
            <Route
              key={mod.slug}
              path={mod.path}
              element={
                bloqueado ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Suspense fallback={<PageFallback />}>
                    <Component />
                  </Suspense>
                )
              }
            />
          );
        })}
      </Route>
    </Routes>
  );
}

function TelaConfiguracaoAusente() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-critical-400" />
      <p className="font-display font-semibold text-ink">Supabase não configurado neste build</p>
      <p className="max-w-md text-sm text-ink-soft">
        Faltam <code className="rounded bg-surface-sunken px-1 py-0.5">VITE_SUPABASE_URL</code> e/ou{" "}
        <code className="rounded bg-surface-sunken px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code>. Configure essas
        variáveis no provedor de deploy e refaça o build — variáveis do Vite são embutidas em tempo de build.
      </p>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <TelaConfiguracaoAusente />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
