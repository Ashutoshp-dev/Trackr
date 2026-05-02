import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./_app.dashboard";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/_app/tasks")({
  component: MyTasks,
});

function MyTasks() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, projects(id, name), profiles!tasks_assigned_to_fkey(id, full_name, email)")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (role === "member") q = q.eq("assigned_to", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!role,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{role === "member" ? "My Tasks" : "All Tasks"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "member" ? "Tasks assigned to you." : "Every task you can see across projects."}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No tasks yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t: any) => {
            const isOverdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "done";
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <Link to="/projects/$projectId" params={{ projectId: t.project_id }} className="text-xs text-muted-foreground hover:text-foreground">
                      {t.projects?.name}
                    </Link>
                    <h3 className="font-semibold mt-1">{t.title}</h3>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    <div className="text-xs text-muted-foreground mt-2 flex gap-4 flex-wrap">
                      {role !== "member" && <span>Assigned: <span className="text-foreground">{t.profiles?.full_name || t.profiles?.email || "Unassigned"}</span></span>}
                      {t.due_date && <span className={isOverdue ? "text-destructive" : ""}>Due: {t.due_date}{isOverdue && " (overdue)"}</span>}
                    </div>
                  </div>
                  <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
