import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-soft">
        <WifiOff className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-4 text-lg font-semibold">Offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved screens and draft workflows remain available.
        </p>
      </div>
    </main>
  );
}
