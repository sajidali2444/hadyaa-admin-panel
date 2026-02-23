import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = Route.useNavigate();
  const { login, isAuthenticated, isHydrated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#d1fae5,transparent_35%),radial-gradient(circle_at_85%_15%,#bae6fd,transparent_30%),radial-gradient(circle_at_50%_90%,#bbf7d0,transparent_35%),linear-gradient(140deg,#f8fafc_0%,#f5f5f4_50%,#ecfdf5_100%)] p-4">
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl animate-pulse [animation-delay:1200ms]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.1)_1px,transparent_1px)] [background-size:44px_44px]" />

      <Card className="relative w-full max-w-xl overflow-hidden border border-white/60 bg-white/80 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-emerald-500 to-sky-500" />

        <CardHeader className="px-10 pt-10 text-center">
          <CardTitle className="text-4xl font-extrabold tracking-[0.08em] text-slate-800">Hadyaa</CardTitle>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="group relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="h-14 rounded-xl border-slate-200/80 bg-white/90 pl-12 pr-4 text-base shadow-sm transition-all duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-200/60"
                required
              />
            </div>

            <div className="group relative">
              <Lock className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="h-14 rounded-xl border-slate-200/80 bg-white/90 px-12 text-base shadow-sm transition-all duration-200 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-200/60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 rounded-sm"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button
              className="h-14 w-full rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-sky-500 text-base font-semibold text-white shadow-md transition-all duration-200 hover:brightness-105 hover:shadow-lg active:scale-[0.99]"
              type="submit"
              disabled={isSubmitting || !isHydrated}
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
