import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, BarChart3, Shield, Zap, Layers } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">Features</a>
            <a href="#roles" className="hover:text-foreground transition-smooth">Roles</a>
            <a href="#workflow" className="hover:text-foreground transition-smooth">Workflow</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="container relative mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground mb-6 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Built for fast-moving teams
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Where teams turn tasks into <span className="text-gradient">shipped work</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Trackr gives admins control, managers clarity, and members focus. One workspace, role-based access, zero noise.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-base px-8">
                Start free
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="text-base px-8">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Layers, title: "Projects & tasks", desc: "Spin up projects, break work into tasks, assign with priorities and due dates." },
            { icon: Shield, title: "Role-based access", desc: "Admins manage everything. Managers run projects. Members see only their tasks." },
            { icon: BarChart3, title: "Live dashboard", desc: "Status at a glance — open, in-progress, done, overdue. No spreadsheets." },
            { icon: Users, title: "Team management", desc: "Add members to projects, change roles, remove access in one click." },
            { icon: Zap, title: "Fast & focused", desc: "Members never see noise from other teams. Just their work, their deadlines." },
            { icon: CheckCircle2, title: "Status tracking", desc: "Every status change is captured. Always know who's blocked and who's shipping." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/50 p-6 shadow-card hover:shadow-elegant transition-smooth backdrop-blur">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="container mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold tracking-tight">Three roles. Zero confusion.</h2>
          <p className="mt-3 text-muted-foreground">Permissions baked into the database — not the UI.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { tag: "Admin", desc: "Full control. Manages users, roles, projects, and tasks across the org.", color: "from-primary to-primary-glow" },
            { tag: "Manager", desc: "Runs projects. Creates tasks, assigns to members, tracks delivery.", color: "from-warning to-primary" },
            { tag: "Member", desc: "Focused execution. Sees only the tasks assigned to them. Updates status.", color: "from-success to-primary-glow" },
          ].map((r) => (
            <div key={r.tag} className="relative rounded-2xl border border-border bg-card/50 p-8 backdrop-blur overflow-hidden">
              <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${r.color} opacity-20 blur-2xl`} />
              <div className="relative">
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{r.tag}</div>
                <p className="mt-3 text-lg">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="workflow" className="container mx-auto px-6 py-20">
        <div className="rounded-3xl border border-border bg-gradient-hero p-12 md:p-16 text-center shadow-card">
          <h2 className="text-4xl font-bold tracking-tight max-w-2xl mx-auto">Ready to track what matters?</h2>
          <p className="mt-3 text-muted-foreground">First user becomes admin. Invite your team in seconds.</p>
          <Link to="/auth/signup">
            <Button size="lg" className="mt-8 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 px-10">
              Create your workspace
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Trackr. Built for teams that ship.
      </footer>
    </div>
  );
}
