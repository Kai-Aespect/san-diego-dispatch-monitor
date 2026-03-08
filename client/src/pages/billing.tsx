import { useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";

export default function Billing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/stripe/portal", {});
        if (res.ok) {
          const { url } = await res.json();
          if (url) { window.location.href = url; return; }
        }
        setLocation("/");
      } catch {
        setLocation("/");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c14]">
      <div className="text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting to billing portal...</p>
      </div>
    </div>
  );
}
