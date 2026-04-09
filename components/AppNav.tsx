"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function AccentLogo() {
  return (
    <span className="inline-flex items-start">
      <span
        className="font-serif font-bold tracking-tight text-[#1B3A2D]"
        style={{ fontSize: 22, lineHeight: 1 }}
      >
        accent
      </span>
      <span
        className="bg-[#F5C842] rounded-full shrink-0"
        style={{ width: 7, height: 7, marginLeft: 2, marginTop: 6 }}
      />
    </span>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const linkClass = (href: string) =>
    `text-[14px] font-sans font-medium transition-colors ${
      pathname === href
        ? "text-[#1B3A2D]"
        : "text-[#1B3A2D]/60 hover:text-[#1B3A2D]"
    }`;

  return (
    <nav className="border-b border-[#1B3A2D]/10 bg-[#FDFAF3]">
      <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" aria-label="Accent home">
          <AccentLogo />
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/write" className={linkClass("/write")}>
            Write
          </Link>
          <Link href="/shelf" className={linkClass("/shelf")}>
            Shelf
          </Link>
        </div>
      </div>
    </nav>
  );
}
