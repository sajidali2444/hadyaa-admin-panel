import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, UserRound, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = Route.useNavigate();
  const { login, isAuthenticated, isHydrated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    void navigate({ to: "/dashboard/projects", replace: true });
  }, [isHydrated, isAuthenticated, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      void navigate({ to: "/dashboard/projects", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-stone-50 to-emerald-100 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-2xl border bg-background shadow-lg">
        <div className="hidden w-1/2 bg-gradient-to-b from-emerald-800 to-emerald-600 p-10 text-emerald-50 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Hadyaa</p>
            <h1 className="mt-4 text-4xl font-bold">Admin & NPO Workspace</h1>
            <p className="mt-4 text-sm text-emerald-100/95">
              Manage projects, users, approvals, and profile settings in one dashboard connected to your backend.
            </p>
          </div>
          <div className="space-y-3 text-sm text-emerald-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>JWT-secured access</span>
            </div>
            <div className="flex items-center gap-2">
              <UserRound className="size-4" />
              <span>Role-based workflows</span>
            </div>
          </div>
        </div>

        <div className="w-full p-6 sm:p-10 lg:w-1/2">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Use your Hadyaa backend credentials to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@hadyaa.org"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="********"
                      autoComplete="current-password"
                      required
                    />
                    <Lock className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorMessage}
                  </div>
                ) : null}

                <Button className="w-full" type="submit" disabled={isSubmitting || !isHydrated}>
                  {isSubmitting ? "Signing in..." : "Login"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
