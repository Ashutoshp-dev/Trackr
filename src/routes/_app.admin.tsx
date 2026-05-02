import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && role !== "admin") navigate({ to: "/dashboard" });
  }, [role, loading, navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: role === "admin",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
    enabled: role === "admin",
  });

  const roleByUser = new Map(roles.map((r: any) => [r.user_id, r.role]));

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "admin" | "manager" | "member" }) => {
      // delete existing roles, insert new one
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      qc.invalidateQueries({ queryKey: ["team-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage roles and permissions.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur divide-y divide-border">
        {profiles.map((p) => {
          const isSelf = p.id === user?.id;
          return (
            <div key={p.id} className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.full_name || "—"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              <Select
                value={(roleByUser.get(p.id) as string) ?? "member"}
                onValueChange={(v: any) => changeRole.mutate({ userId: p.id, newRole: v })}
                disabled={isSelf}
              >
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
