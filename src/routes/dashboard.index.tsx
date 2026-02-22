import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndexPage,
});

function DashboardIndexPage() {
  const navigate = Route.useNavigate();

  useEffect(() => {
    void navigate({ to: "/dashboard/projects", replace: true });
  }, [navigate]);

  return (
    <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
      Redirecting to projects...
    </div>
  );
}
