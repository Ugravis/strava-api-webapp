"use client";

import { Button } from "@kilotrace/ui/components/ui/button";
import { Checkbox } from "@kilotrace/ui/components/ui/checkbox";
import { Input } from "@kilotrace/ui/components/ui/input";
import { Label } from "@kilotrace/ui/components/ui/label";
import { useActionState } from "react";
import { type LoginState, signInWithPassword } from "./actions";

interface LoginFormProps {
  labels: { email: string; password: string; rememberMe: string; submit: string };
}

/** Email and password, posted to a Server Action: the credentials never reach the browser's API. */
export function LoginForm({ labels }: LoginFormProps) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInWithPassword, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox name="rememberMe" />
        {labels.rememberMe}
      </Label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
