import { useLocation } from "wouter";
import { SubscribeWall } from "@/components/subscribe-wall";

export default function Subscribe() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl">
        <button
          onClick={() => setLocation("/")}
          className="mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Dashboard
        </button>
        <SubscribeWall compact={false} />
      </div>
    </div>
  );
}
