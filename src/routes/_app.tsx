import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FolderKanban, ListChecks, Users, LogOut, Shield } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/tasks", label: "My Tasks", icon: ListChecks },
    ...(role === "admin" || role === "manager"
      ? [{ to: "/team", label: "Team", icon: Users }]
      : []),
    ...(role === "admin"
      ? [{ to: "/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="px-2 py-2"><Logo /></div>
        <nav className="mt-8 flex-1 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-smooth ${
                  active
                    ? "bg-sidebar-accent text-foreground shadow-elegant"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border pt-4 mt-4">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium truncate">{user.email}</div>
            <div className="text-xs text-muted-foreground capitalize">{role ?? "—"}</div>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 border-b border-border bg-card/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Logo />
        <Button onClick={handleSignOut} variant="ghost" size="sm">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur flex justify-around py-2">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center text-xs text-muted-foreground p-2 [&.active]:text-primary-glow" activeProps={{ className: "active" }}>
            <item.icon className="h-5 w-5" />
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
      </div>

      <main className="flex-1 md:p-8 p-4 pt-20 pb-24 md:pt-8 md:pb-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
