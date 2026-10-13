import { AuthGuard } from "@/components/auth/auth-guard";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SectionsProvider } from "@/features/sections/hooks/use-sections";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Creates the Knowledge Hub categories on first use */}
      <SectionsProvider>
        <AppSidebar />
        <div className="lg:pl-64">
          <AppTopbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </SectionsProvider>
    </AuthGuard>
  );
}
