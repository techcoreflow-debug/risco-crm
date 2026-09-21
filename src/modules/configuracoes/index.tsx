import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth/auth-provider";
import { APP_NAME, APP_VERSION } from "@/lib/version";

export default function Configuracoes() {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Preferências da conta e da empresa no inovare.risco." />

      <Card>
        <CardHeader><CardTitle>Sua conta</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p><span className="text-ink-soft">Nome:</span> {profile?.full_name}</p>
          <p><span className="text-ink-soft">Papel:</span> {profile?.role}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sobre</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-ink-soft">
          <p>{APP_NAME} · v{APP_VERSION}</p>
          <p>Compartilha o mesmo banco de dados e login do inovare.fisio — os cadastros de pacientes e internações vêm de lá.</p>
        </CardContent>
      </Card>
    </div>
  );
}
