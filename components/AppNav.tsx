"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "./AuthButton";
import { AccentLogo } from "./AccentLogo";

export function AppNav() {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `text-[14px] font-sans font-medium transition-colors ${
      pathname === href
        ? "text-[#111]"
        : "text-[#999] hover:text-[#111]"
    }`;

  return (
    <nav className="border-b border-[#E8E8E8] bg-white">
      <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Accent home"
          className="inline-flex items-center hover:opacity-80 transition-opacity"
        >
          <AccentLogo />
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/write" className={linkClass("/write")}>
            Write
          </Link>
          <Link href="/shelf" className={linkClass("/shelf")}>
            Shelf
          </Link>
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
