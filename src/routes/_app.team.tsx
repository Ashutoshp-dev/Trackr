import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

function TeamPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "admin" && role !== "manager") {
      navigate({ to: "/dashboard" });
    }
  }, [role, loading, navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, created_at").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleByUser = new Map(roles.map((r: any) => [r.user_id, r.role]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Everyone in your Trackr workspace.</p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No teammates yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur divide-y divide-border">
          {profiles.map((p) => (
            <div key={p.id} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {(p.full_name || p.email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
              </div>
              <RoleBadge role={(roleByUser.get(p.id) as string) ?? "member"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-primary/20 text-primary-glow",
    manager: "bg-warning/20 text-warning",
    member: "bg-muted text-muted-foreground",
  };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${map[role] ?? ""}`}>{role}</span>;
}
