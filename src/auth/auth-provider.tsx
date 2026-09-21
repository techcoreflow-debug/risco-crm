import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { notificarErro } from "@/store/toast-store";
import type { RiscoProfile } from "@/types/domain";

interface AuthState {
  session: Session | null;
  profile: RiscoProfile | null;
  loading: boolean;
  /** true enquanto existe sessão mas o perfil ainda não carregou */
  profileLoading: boolean;
  /**
   * true quando a sessão é válida (login compartilhado com o fisio funcionou)
   * mas não existe linha em risco_profiles para esse usuário — ou seja, a
   * conta não tem acesso ao inovare.risco. Diferente de profile===null
   * durante o carregamento: só fica true depois de já ter checado.
   */
  semAcessoAoRisco: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<RiscoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [semAcessoAoRisco, setSemAcessoAoRisco] = useState(false);
  const usuarioAnteriorRef = useRef<string | null>(null);

  async function loadProfile(userId: string, primeiraVez: boolean) {
    if (primeiraVez) setProfileLoading(true);
    const { data, error } = await supabase.from("risco_profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      notificarErro("Não foi possível carregar seu perfil", error.message);
      if (primeiraVez) setProfile(null);
    } else if (data) {
      setProfile(data as RiscoProfile);
      setSemAcessoAoRisco(false);
    } else if (primeiraVez) {
      // Login válido (mesma auth.users do fisio), mas sem linha em
      // risco_profiles — conta não tem acesso ao inovare.risco.
      setProfile(null);
      setSemAcessoAoRisco(true);
    }
    if (primeiraVez) setProfileLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        usuarioAnteriorRef.current = data.session.user.id;
        loadProfile(data.session.user.id, true);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setSemAcessoAoRisco(false);
        usuarioAnteriorRef.current = null;
        if (window.location.pathname !== "/") {
          window.history.replaceState(null, "", "/");
        }
        return;
      }
      if (event === "TOKEN_REFRESHED") return;
      const mudouDeUsuario = usuarioAnteriorRef.current !== newSession.user.id;
      usuarioAnteriorRef.current = newSession.user.id;
      if (event === "SIGNED_IN" && !mudouDeUsuario) return;
      loadProfile(newSession.user.id, mudouDeUsuario || event === "INITIAL_SESSION");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id, true);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoading, semAcessoAoRisco, signInWithPassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
