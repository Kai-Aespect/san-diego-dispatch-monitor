import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

interface AdBannerProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

export function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  const { isSubscribed, isLoading } = useAuth();
  const pushed = useRef(false);

  useEffect(() => {
    if (isSubscribed || isLoading || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {}
  }, [isSubscribed, isLoading]);

  if (isLoading || isSubscribed) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`} data-testid="ad-banner">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-5934307670633330"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
