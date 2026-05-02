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
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsPage,
});

const projectSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  description: z.string().trim().max(500).optional(),
});

function ProjectsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const canCreate = role === "admin" || role === "manager";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, created_by")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = projectSchema.safeParse({ name, description });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: parsed.data.name, description: parsed.data.description, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      // auto-add creator as project member so they show in member list
      await supabase.from("project_members").insert({ project_id: data.id, user_id: user!.id });
      return data;
    },
    onSuccess: () => {
      toast.success("Project created");
      setOpen(false);
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {role === "member" ? "Projects you're part of." : "All your team's projects."}
          </p>
        </div>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q4 Marketing Campaign" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No projects yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-card hover:shadow-elegant hover:border-primary/40 transition-smooth group"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant mb-4">
                <FolderKanban className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg group-hover:text-primary-glow transition-smooth">{p.name}</h3>
              {p.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
