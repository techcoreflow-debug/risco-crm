import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { useAuth } from "@/auth/auth-provider";
import { useAppStore } from "@/store/app-store";
import { usePointerEventsGuard } from "@/lib/use-pointer-events-guard";

export function AppShell() {
  usePointerEventsGuard();
  const { profile } = useAuth();
  const activeCompanyId = useAppStore((s) => s.activeCompanyId);
  const setActiveCompanyId = useAppStore((s) => s.setActiveCompanyId);

  useEffect(() => {
    if (!profile) return;
    if (profile.company_id && profile.company_id !== activeCompanyId) {
      setActiveCompanyId(profile.company_id);
    }
  }, [profile, activeCompanyId, setActiveCompanyId]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
