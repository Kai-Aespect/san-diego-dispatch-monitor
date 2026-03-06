import { useState, useEffect, useCallback } from "react";
import { Lock, Key, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTH_KEY_STORAGE = "sd_dispatch_auth_key";
const VALID_KEYS = ["1041", "4004", "dispatch911"]; // Example keys, can be moved to env/DB later

export function useAuthKey() {
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(AUTH_KEY_STORAGE) === "true";
  });

  const authorize = useCallback((key: string) => {
    if (VALID_KEYS.includes(key)) {
      sessionStorage.setItem(AUTH_KEY_STORAGE, "true");
      setIsAuthorized(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY_STORAGE);
    setIsAuthorized(false);
  }, []);

  return { isAuthorized, authorize, logout };
}

interface AuthPromptProps {
  title?: string;
  description?: string;
  onAuthorized?: () => void;
  className?: string;
}

export function AuthPrompt({ 
  title = "Restricted Access", 
  description = "Enter an authorized key to view protected notes and information.",
  onAuthorized,
  className
}: AuthPromptProps) {
  const { authorize } = useAuthKey();
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (authorize(key)) {
      onAuthorized?.();
    } else {
      setError(true);
      setKey("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center space-y-4 bg-accent/5 rounded-2xl border border-white/5", className)}>
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
        <Lock className="w-8 h-8 text-amber-500" />
      </div>
      
      <div className="space-y-1">
        <h3 className="font-bold text-lg text-foreground flex items-center justify-center gap-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
          {description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[240px] space-y-3">
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Enter Auth Key..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={cn(
              "pl-9 h-11 bg-black/40 border-white/10 text-center tracking-[0.2em] font-mono",
              error && "border-destructive ring-1 ring-destructive"
            )}
            autoFocus
          />
        </div>
        
        <Button 
          type="submit"
          className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          Unlock Access
        </Button>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-destructive text-xs font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Invalid Authorization Key
          </div>
        )}
      </form>
    </div>
  );
}
