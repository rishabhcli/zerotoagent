"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { LogOut } from "lucide-react";

export function UserMenu({
  name,
  email,
  image,
  role,
}: {
  name: string;
  email: string;
  image?: string | null;
  role: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm backdrop-blur-lg transition hover:bg-white/[0.1]"
      >
        {image ? (
          <img
            src={image}
            alt={name}
            className="size-6 rounded-full"
          />
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {name[0]?.toUpperCase()}
          </div>
        )}
        <span className="hidden font-medium sm:block">{name}</span>
        <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary sm:block">
          {role}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 liquid-glass !rounded-[20px] p-4">
            <div className="mb-3 space-y-1">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <p className="text-xs capitalize text-primary">{role}</p>
            </div>
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
              className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
