import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <div className="relative h-8 w-8 rounded-lg bg-gradient-primary shadow-glow flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary-foreground">
          <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-xl font-bold tracking-tight">Trackr</span>
    </Link>
  );
}
