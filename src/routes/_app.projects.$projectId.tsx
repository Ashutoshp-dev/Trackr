import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./_app.dashboard";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: ProjectDetail,
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(160),
  description: z.string().trim().max(1000).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().optional(),
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const canManage = role === "admin" || role === "manager";

  const [taskOpen, setTaskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberId, setMemberId] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, profiles(id, full_name, email)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data ?? [];
    },
    enabled: canManage,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_assigned_to_fkey(id, full_name, email)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const parsed = taskSchema.safeParse({
        title,
        description: desc,
        assigned_to: assignee || null,
        priority,
        due_date: dueDate || undefined,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        title: parsed.data.title,
        description: parsed.data.description,
        assigned_to: parsed.data.assigned_to,
        priority: parsed.data.priority,
        due_date: parsed.data.due_date || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created");
      setTaskOpen(false);
      setTitle(""); setDesc(""); setAssignee(""); setPriority("medium"); setDueDate("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error("Pick a member");
      const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: memberId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member added");
      setMemberOpen(false);
      setMemberId("");
      qc.invalidateQueries({ queryKey: ["project-members", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const memberOptions = members.map((m: any) => ({ id: m.user_id, name: m.profiles?.full_name || m.profiles?.email || "User" }));
  const nonMembers = allProfiles.filter((p) => !members.some((m: any) => m.user_id === p.id));

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-smooth">
        <ArrowLeft className="h-4 w-4 mr-1" /> All projects
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project?.name}</h1>
          {project?.description && <p className="text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
        </div>
        {canManage && (
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" /> New task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        {memberOptions.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Add members first</div>}
                        {memberOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button onClick={() => createTask.mutate()} disabled={createTask.isPending} className="w-full bg-gradient-primary text-primary-foreground">
                  {createTask.isPending ? "Creating..." : "Create task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-lg">Tasks</h2>
          {tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              No tasks yet.
            </div>
          )}
          {tasks.map((t: any) => {
            const canEdit = canManage || t.assigned_to === user?.id;
            const isOverdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "done";
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{t.title}</h3>
                      <PriorityBadge p={t.priority} />
                      {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Overdue</span>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    <div className="text-xs text-muted-foreground mt-2 flex gap-4 flex-wrap">
                      <span>Assigned: <span className="text-foreground">{t.profiles?.full_name || t.profiles?.email || "Unassigned"}</span></span>
                      {t.due_date && <span>Due: {t.due_date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <Select value={t.status} onValueChange={(v) => updateTaskStatus.mutate({ id: t.id, status: v })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={t.status} />
                    )}
                    {canManage && (
                      <Button variant="ghost" size="icon" onClick={() => deleteTask.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Members</h2>
            {canManage && (
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add member</DialogTitle></DialogHeader>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger><SelectValue placeholder="Pick a user" /></SelectTrigger>
                    <SelectContent>
                      {nonMembers.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Everyone is already a member</div>}
                      {nonMembers.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addMember.mutate()} disabled={addMember.isPending} className="w-full bg-gradient-primary text-primary-foreground">
                    {addMember.isPending ? "Adding..." : "Add member"}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur divide-y divide-border">
            {members.length === 0 && <p className="p-4 text-sm text-muted-foreground">No members yet.</p>}
            {members.map((m: any) => (
              <div key={m.user_id} className="p-4 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">{m.profiles?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.profiles?.email}</div>
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(m.user_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-primary/20 text-primary-glow",
    high: "bg-destructive/20 text-destructive",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[p]}`}>{p}</span>;
}
