import { useEffect, type ReactNode } from "react";
import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, FolderKanban, UserRoundCog, Users, LogOut } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/components/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = Route.useNavigate();
  const routerState = useRouterState();
  const { session, isAuthenticated, isHydrated, logout } = useAuth();

  useEffect(() => {
    if (!isHydrated || isAuthenticated) {
      return;
    }

    void navigate({ to: "/login", replace: true });
  }, [isHydrated, isAuthenticated, navigate]);

  if (!isHydrated || !isAuthenticated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  const isAdmin = session.user.role.toLowerCase() === "admin";
  const path = routerState.location.pathname;

  return (
    <div className="min-h-screen overflow-x-clip bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-extrabold tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              H
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hadyaa Admin Panel</p>
              <h1 className="truncate text-lg font-semibold sm:text-xl">
                Welcome, {session.user.displayName || session.user.email}
              </h1>
              <p className="text-sm text-muted-foreground">Role: {session.user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <ModeToggle />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                logout();
                void navigate({ to: "/login", replace: true });
              }}
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="rounded-xl border bg-background p-3">
          <nav className="space-y-1">
            <SideNavItem
              to="/dashboard/projects"
              isActive={path.startsWith("/dashboard/projects")}
              label="Projects"
              icon={<FolderKanban className="size-4" />}
            />
            <SideNavItem
              to="/dashboard/profile"
              isActive={path.startsWith("/dashboard/profile")}
              label="Profile & Bank"
              icon={<UserRoundCog className="size-4" />}
            />
            {isAdmin ? (
              <SideNavItem
                to="/dashboard/admin"
                isActive={path.startsWith("/dashboard/admin")}
                label="Admin Settings"
                icon={<Users className="size-4" />}
              />
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            <LayoutDashboard className="size-4" />
            Connected to backend: <code>{API_BASE_URL}</code>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideNavItem({
  to,
  isActive,
  label,
  icon,
}: Readonly<{
  to: "/dashboard/projects" | "/dashboard/profile" | "/dashboard/admin";
  isActive: boolean;
  label: string;
  icon: ReactNode;
}>) {
  return (
    <Button
      className="w-full justify-start"
      variant={isActive ? "secondary" : "ghost"}
      render={<Link to={to} />}
    >
      {icon}
      {label}
    </Button>
  );
}
