import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ListChecks, Clock, CheckCircle2, AlertTriangle, FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, role } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ["dash-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assigned_to, project_id, projects(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["dash-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().slice(0, 10);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground">Welcome back</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {role === "admin" ? "Admin Dashboard" : role === "manager" ? "Manager Dashboard" : "My Dashboard"}
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListChecks} label={role === "member" ? "My tasks" : "Total tasks"} value={total} accent="bg-primary/20 text-primary-glow" />
        <StatCard icon={Clock} label="In progress" value={inProgress} accent="bg-warning/20 text-warning" />
        <StatCard icon={CheckCircle2} label="Completed" value={done} accent="bg-success/20 text-success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue} accent="bg-destructive/20 text-destructive" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-card">
          <h2 className="font-semibold text-lg">Recent tasks</h2>
          <div className="mt-4 divide-y divide-border">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground py-6">No tasks yet.</p>}
            {tasks.slice(0, 8).map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{(t.projects as any)?.name}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-card">
          <h2 className="font-semibold text-lg flex items-center gap-2"><FolderKanban className="h-5 w-5" /> Projects</h2>
          <div className="mt-4 space-y-2">
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">{p.name}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    todo: "bg-muted text-muted-foreground",
    in_progress: "bg-warning/20 text-warning",
    done: "bg-success/20 text-success",
  };
  const label: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
