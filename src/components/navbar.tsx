"use client";

import Link from "next/link";
import { ModeToggle } from "./mode-toggle";

export function Navbar() {
  return (
    <nav className="border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">croxync</Link>
          <div className="flex items-center gap-4">
            <ModeToggle />
            
          </div>
        </div>
      </div>
    </nav>
  );
}
