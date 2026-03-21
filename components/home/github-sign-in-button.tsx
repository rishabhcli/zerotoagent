"use client";

import { useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { githubOAuthScopes } from "@/lib/github-auth";

type GitHubSignInButtonProps = {
  enabled: boolean;
};

export function GitHubSignInButton({ enabled }: GitHubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
        newUserCallbackURL: "/dashboard",
        scopes: [...githubOAuthScopes],
      });
      if (result?.error) setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-foreground backdrop-blur-lg transition hover:bg-white/[0.1] disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Github className="size-3.5" />
      )}
      {isLoading ? "Redirecting..." : "Sign in"}
    </button>
  );
}
