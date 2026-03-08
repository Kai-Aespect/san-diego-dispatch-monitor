import { useLocation } from "wouter";
import { XCircle } from "lucide-react";

export default function SubscribeCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0c14]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Subscription cancelled</h1>
        <p className="text-sm text-muted-foreground">
          No charges were made. You can subscribe anytime to unlock premium features.
        </p>
        <button
          onClick={() => setLocation("/")}
          data-testid="button-go-back"
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
