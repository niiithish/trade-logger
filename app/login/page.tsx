"use client";

import { Loader2Icon, LockIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

import { loginAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const configError = searchParams.get("error") === "config";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    configError
      ? "SITE_PASSWORD is not set on this deployment. Add it in Vercel env."
      : null
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("password", password);
      formData.set("next", next);
      const result = await loginAction(formData);
      // redirect() throws; only failures return
      if (result && !result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      // Next redirect throws; treat as success path if no result
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm ring-1 ring-border">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Logo className="size-8" />
          <div>
            <CardTitle className="text-base">Trade Logger</CardTitle>
            <CardDescription>Private journal</CardDescription>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Enter the site password to continue.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              autoComplete="current-password"
              autoFocus
              className="h-11"
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Access denied</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button className="w-full" disabled={pending} type="submit">
            {pending ? (
              <>
                <Loader2Icon
                  className="animate-spin"
                  data-icon="inline-start"
                />
                Checking…
              </>
            ) : (
              <>
                <LockIcon data-icon="inline-start" />
                Unlock
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">Loading…</p>}
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
