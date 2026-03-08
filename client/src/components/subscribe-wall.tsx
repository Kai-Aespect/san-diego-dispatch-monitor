import { useState } from "react";
import { Zap, Check, ExternalLink, Radio } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const PLANS = [
  {
    label: "Weekly",
    price: "$1.49",
    fee: "+$0.34 processing fee",
    total: "$1.83/wk",
    period: "per week",
    priceId: "price_1T8ZjHPyfpGf4shhpcGz6s1H",
    highlight: false,
  },
  {
    label: "Monthly",
    price: "$4.99",
    fee: "+$0.44 processing fee",
    total: "$5.43/mo",
    period: "per month",
    priceId: "price_1T8ZjHPyfpGf4shhGTmaXsz8",
    highlight: true,
    badge: "Most Popular",
  },
  {
    label: "Yearly",
    price: "$49",
    fee: "+$1.72 processing fee",
    total: "$50.72/yr",
    period: "per year",
    priceId: "price_1T8ZjHPyfpGf4shhVfcW4oxT",
    highlight: false,
    badge: "Best Value",
  },
];

const FEATURES = [
  "Personal Notes tab",
  "Call & unit note editing",
  "Units roster panel",
  "Full stats & analytics",
  "Faster 30-second refresh",
  "Locked info board cards",
  "Listen Live audio stream",
];

interface SubscribeWallProps {
  feature?: string;
  compact?: boolean;
}

export function SubscribeWall({ feature, compact }: SubscribeWallProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", { priceId });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Failed to start checkout");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
        <div className="flex items-center gap-1.5 text-primary">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Pro Feature</span>
        </div>
        {feature && <p className="text-xs text-muted-foreground">{feature} requires a Dispatch Pro subscription.</p>}
        <div className="flex gap-2 flex-wrap justify-center">
          {PLANS.map(plan => (
            <button
              key={plan.priceId}
              onClick={() => handleSubscribe(plan.priceId)}
              disabled={loading === plan.priceId}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold hover:bg-primary/20 transition-all disabled:opacity-50"
            >
              {loading === plan.priceId ? "..." : `${plan.price}/${plan.label.toLowerCase()}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Dispatch Pro</h2>
        {feature && (
          <p className="text-sm text-muted-foreground mt-1">{feature} is a Pro feature.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/8 bg-accent/20 p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">What's included</p>
        {FEATURES.map(f => (
          <div key={f} className="flex items-center gap-2 text-xs text-foreground/80">
            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        {PLANS.map(plan => (
          <div
            key={plan.priceId}
            className={`relative rounded-xl border p-3 ${plan.highlight ? "border-primary/40 bg-primary/8" : "border-white/10 bg-accent/20"}`}
          >
            {plan.badge && (
              <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {plan.badge}
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{plan.label}</p>
                <p className="text-[10px] text-muted-foreground">{plan.period}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xl font-bold text-foreground">{plan.price}</span>
                  <p className="text-[9px] text-muted-foreground/60 leading-tight">{plan.fee}</p>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading !== null}
                  data-testid={`button-subscribe-${plan.label.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {loading === plan.priceId ? "..." : (
                    <>Subscribe <ExternalLink className="w-3 h-3" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Cancel anytime. Billed via Stripe. Secure checkout.
      </p>
    </div>
  );
}
