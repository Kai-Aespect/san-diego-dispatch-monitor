import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { Radio } from "lucide-react";

export default function Login() {
  const { login, loginPending, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { settings } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && user) setLocation("/");
  }, [user, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${settings.theme === "dark" ? "bg-[#0a0c14]" : "bg-[#f0f4f8]"}`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Radio className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SD Dispatch</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-white/8 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              required
              data-testid="input-email"
              className="w-full h-10 px-3 rounded-xl bg-background/60 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              required
              data-testid="input-password"
              className="w-full h-10 px-3 rounded-xl bg-background/60 border border-white/10 text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loginPending}
            data-testid="button-login"
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loginPending ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-xs text-muted-foreground pt-1">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
