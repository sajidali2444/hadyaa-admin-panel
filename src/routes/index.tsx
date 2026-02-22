import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const navigate = Route.useNavigate();
  const { isHydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void navigate({
      to: isAuthenticated ? "/dashboard/projects" : "/login",
      replace: true,
    });
  }, [isHydrated, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}
