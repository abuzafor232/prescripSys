"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LogIn, Printer, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, loginWithPassword } from "@/lib/api";
import { useSessionHydrated, useSessionStore } from "@/stores/session-store";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useSessionHydrated();
  const accessToken = useSessionStore((state) => state.accessToken);
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("demo@rx.test");
  const [password, setPassword] = useState("Password123!");

  const login = useMutation({
    mutationFn: () => loginWithPassword(email, password),
    onSuccess: (session) => {
      setSession(session);
      router.replace("/select-chamber");
    }
  });

  useEffect(() => {
    if (hydrated && accessToken) router.replace("/select-chamber");
  }, [accessToken, hydrated, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">PrescriptionOS BD</CardTitle>
                <p className="text-xs text-muted-foreground">Doctor sign in</p>
              </div>
            </div>
            <Badge>Demo tenant</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {login.isError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {getApiErrorMessage(login.error)}
              </div>
            ) : null}

            <Button className="w-full" disabled={!hydrated || login.isPending} type="submit">
              {login.isPending ? (
                <ShieldCheck className="h-4 w-4 animate-pulse" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
