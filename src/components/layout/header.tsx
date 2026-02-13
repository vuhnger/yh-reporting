"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

function getInitials(name?: string | null) {
  if (!name) return "NA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Header() {
  const { data } = useSession();
  const initials = getInitials(data?.user?.name);

  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-white text-primary">
            <span className="font-bold">YH</span>
          </div>
          <span>Dr. Dropin Rapportering</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="hover:underline hover:text-white/80 transition-colors">
            Ny rapport
          </Link>
          <Link href="#" className="hover:underline hover:text-white/80 transition-colors">
            Lagrede rapporter
          </Link>
          <div className="flex items-center gap-2 ml-4 opacity-80">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs">{initials}</span>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
