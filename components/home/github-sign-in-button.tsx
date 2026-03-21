"use client";

import { useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { githubOAuthScopes } from "@/lib/github-auth";

type GitHubSignInButtonProps = {
  enabled: boolean;
};

export function GitHubSignInButton({ enabled }: GitHubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (isLoading || !enabled) return;

    setIsLoading(true);
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/dashboard",
        scopes: [...githubOAuthScopes],
      });

      if (result?.error) {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleSignIn}
      disabled={!enabled || isLoading}
      className="min-w-[8.75rem] justify-center"
      title={enabled ? "Sign in with GitHub" : "GitHub auth is not configured"}
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Github className="size-3.5" />
      )}
      {isLoading ? "Redirecting..." : enabled ? "Sign in" : "Auth offline"}
    </Button>
  );
}
