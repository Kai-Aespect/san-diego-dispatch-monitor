import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function SubscribeSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0c14]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">You're subscribed!</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Dispatch Pro. All premium features are now unlocked.
        </p>
        <button
          onClick={() => setLocation("/")}
          data-testid="button-go-home"
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
