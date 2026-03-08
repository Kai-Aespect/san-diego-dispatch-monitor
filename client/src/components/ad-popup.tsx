import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { X } from "lucide-react";

const POPUP_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 20 * 1000;

export function AdPopup() {
  const { isSubscribed, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const pushed = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPopup = () => {
    setVisible(true);
    pushed.current = false;
  };

  useEffect(() => {
    if (isLoading || isSubscribed) return;

    timerRef.current = setTimeout(() => {
      showPopup();
      const interval = setInterval(showPopup, POPUP_INTERVAL_MS);
      return () => clearInterval(interval);
    }, INITIAL_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, isSubscribed]);

  useEffect(() => {
    if (!visible || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {}
  }, [visible]);

  if (!visible || isLoading || isSubscribed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="ad-popup-overlay"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-4 w-[340px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
        data-testid="ad-popup-container"
      >
        <button
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setVisible(false)}
          data-testid="button-close-ad"
          aria-label="Close ad"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-muted-foreground mb-2 text-center uppercase tracking-widest">Advertisement</p>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-5934307670633330"
          data-ad-slot="4134073591"
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Go ad-free with{" "}
          <a href="/subscribe" className="underline text-primary hover:opacity-80">Dispatch Pro</a>
        </p>
      </div>
    </div>
  );
}
